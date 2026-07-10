"""
GitHub Repository Explorer — API Gateway
-----------------------------------------
FastAPI service that proxies GitHub's Search API, keeping the Personal
Access Token server-side, enforcing a per-client rate limit, and caching
frequent queries in-memory (TTL + LRU) to conserve GitHub's rate budget.

Run:
    export GITHUB_PAT=ghp_xxx...
    uvicorn main:app --reload --port 8000
"""

from __future__ import annotations

import os
import time
import hashlib
import asyncio
from collections import OrderedDict
from typing import Optional

import httpx
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# --------------------------------------------------------------------------
# Configuration
# --------------------------------------------------------------------------

from dotenv import load_dotenv
load_dotenv()

GITHUB_PAT = os.environ.get("GITHUB_PAT")
if not GITHUB_PAT:
    # Fail loudly at startup rather than silently hitting unauthenticated
    # (60 req/hr) rate limits in production.
    print("[WARN] GITHUB_PAT is not set — GitHub API calls will be rate-limited to 60/hr.")

GITHUB_SEARCH_URL = "https://api.github.com/search/repositories"
CACHE_TTL_SECONDS = 120          # how long a cached response is considered fresh
CACHE_MAX_ENTRIES = 256          # LRU cap
CLIENT_RATE_LIMIT = 30           # requests
CLIENT_RATE_WINDOW = 60          # seconds, per client IP

ALLOWED_LANGUAGES = {
    # Systems & Performance
    "c", "c++", "rust", "go", "assembly", "zig",
    # Web & Scripting
    "javascript", "typescript", "python", "ruby", "php",
    "elixir", "lua", "perl", "shell", "bash", "powershell",
    # Data & ML
    "r", "julia", "jupyter notebook", "matlab", "sas",
    # Mobile
    "swift", "kotlin", "dart", "objective-c",
    # JVM / Enterprise
    "java", "scala", "groovy", "clojure",
    # .NET
    "c#", "f#", "visual basic",
    # Other
    "solidity", "haskell", "erlang", "ocaml",
    "html", "css", "sql",
}
ALLOWED_TOPICS = {
    # ── AI & Machine Learning ─────────────────────────────────────────────
    "machine-learning", "deep-learning", "generative-ai", "llm", "nlp",
    "computer-vision", "reinforcement-learning", "time-series", "diffusion-model",
    "multimodal", "pytorch", "tensorflow", "huggingface", "langchain", "openai",
    "rag", "fine-tuning", "scikit-learn", "keras",
    # ── Web Development ───────────────────────────────────────────────────
    "react", "nextjs", "vue", "angular", "svelte", "nodejs", "django",
    "fastapi", "flask", "spring-boot", "graphql", "rest-api", "fullstack",
    "frontend", "backend", "websocket",
    # ── Data Science & Eng ────────────────────────────────────────────────
    "data-science", "data-engineering", "apache-spark", "kafka", "airflow",
    "etl", "data-pipeline", "analytics", "recommendation-system",
    # ── Cloud & DevOps ────────────────────────────────────────────────────
    "docker", "kubernetes", "github-actions", "terraform", "aws", "gcp",
    "azure", "serverless", "microservices", "ci-cd", "devops", "nginx",
    # ── Databases & Storage ───────────────────────────────────────────────
    "postgresql", "mongodb", "redis", "mysql", "elasticsearch", "sqlite",
    "cassandra", "database", "vector-database",
    # ── Mobile & Gaming ───────────────────────────────────────────────────
    "android", "ios", "flutter", "react-native", "swiftui",
    "game-development", "unity", "godot", "pygame", "opengl", "vulkan",
    # ── Systems & Networking ──────────────────────────────────────────────
    "operating-system", "compiler", "embedded", "networking",
    "distributed-systems", "firmware", "real-time",
    # ── Security ──────────────────────────────────────────────────────────
    "security", "cybersecurity", "cryptography", "penetration-testing",
    "authentication", "zero-trust", "jwt",
    # ── Web3 & Crypto ─────────────────────────────────────────────────────
    "web3", "blockchain", "ethereum", "solidity", "defi", "solana",
    "smart-contracts", "nft", "polkadot",
    # ── Dev Tools & Theory ────────────────────────────────────────────────
    "cli", "automation", "testing", "web-scraping", "open-source",
    "developer-tools", "algorithm", "data-structures", "system-design",
    "api", "documentation",
}

# --------------------------------------------------------------------------
# In-memory TTL + LRU cache
# --------------------------------------------------------------------------


class TTLLRUCache:
    """A minimal thread-safe-enough (single event loop) TTL + LRU cache.

    Swap this class for a Redis-backed implementation in multi-instance
    deployments — the public interface (get/set) is deliberately tiny so
    that swap is a drop-in.
    """

    def __init__(self, max_entries: int, ttl_seconds: int):
        self.max_entries = max_entries
        self.ttl_seconds = ttl_seconds
        self._store: "OrderedDict[str, tuple[float, dict]]" = OrderedDict()
        self._lock = asyncio.Lock()

    async def get(self, key: str) -> Optional[dict]:
        async with self._lock:
            entry = self._store.get(key)
            if entry is None:
                return None
            timestamp, value = entry
            if time.time() - timestamp > self.ttl_seconds:
                del self._store[key]
                return None
            # mark as recently used
            self._store.move_to_end(key)
            return value

    async def set(self, key: str, value: dict) -> None:
        async with self._lock:
            self._store[key] = (time.time(), value)
            self._store.move_to_end(key)
            while len(self._store) > self.max_entries:
                self._store.popitem(last=False)

    def stats(self) -> dict:
        return {"entries": len(self._store), "max_entries": self.max_entries, "ttl_seconds": self.ttl_seconds}


cache = TTLLRUCache(max_entries=CACHE_MAX_ENTRIES, ttl_seconds=CACHE_TTL_SECONDS)

# --------------------------------------------------------------------------
# Simple sliding-window rate limiter (per client IP)
# --------------------------------------------------------------------------


class RateLimiter:
    def __init__(self, limit: int, window_seconds: int):
        self.limit = limit
        self.window_seconds = window_seconds
        self._hits: dict[str, list[float]] = {}
        self._lock = asyncio.Lock()

    async def check(self, client_id: str) -> bool:
        now = time.time()
        async with self._lock:
            hits = self._hits.setdefault(client_id, [])
            cutoff = now - self.window_seconds
            while hits and hits[0] < cutoff:
                hits.pop(0)
            if len(hits) >= self.limit:
                return False
            hits.append(now)
            return True


rate_limiter = RateLimiter(CLIENT_RATE_LIMIT, CLIENT_RATE_WINDOW)

# --------------------------------------------------------------------------
# FastAPI app
# --------------------------------------------------------------------------

app = FastAPI(title="GitHub Repository Explorer API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("CORS_ORIGINS", "http://localhost:3000").split(","),
    allow_methods=["GET"],
    allow_headers=["*"],
)


class RepoItem(BaseModel):
    id: int
    name: str
    full_name: str
    html_url: str
    description: Optional[str]
    language: Optional[str]
    stargazers_count: int
    forks_count: int
    topics: list[str] = []
    owner_login: str
    owner_avatar: str


class RepositoriesResponse(BaseModel):
    total_count: int
    incomplete_results: bool
    page: int
    items: list[RepoItem]
    cached: bool
    github_rate_limit_remaining: Optional[int] = None


# Allowed characters in a GitHub username: alphanumeric + hyphens, 1–39 chars.
_GITHUB_USER_RE = __import__("re").compile(r"^[a-zA-Z0-9][a-zA-Z0-9\-]{0,37}[a-zA-Z0-9]?$")


def build_query_string(
    languages: list[str],
    topics: list[str],
    min_stars: int,
    user: str = "",
) -> str:
    """Constructs GitHub's `q=` search qualifier string.

    Multiple languages are OR'd within their own parenthesized group.
    Multiple topics are OR'd within their own parenthesized group, and
    each topic includes a keyword fallback (e.g., topic:fastapi OR "fastapi")
    so repositories that lack explicit GitHub topic tags but contain the terms
    in their name, description, or README are still successfully matched.

    The optional `user` qualifier restricts results to repositories owned
    by a specific GitHub account (user or organisation).

    NOTE: `stars:>=0` is intentionally NOT added as a default clause—GitHub
    rejects that qualifier as "too broad" for unauthenticated Search API
    calls. A stars filter is only injected when the caller explicitly sets
    min_stars > 0.
    """
    clauses: list[str] = []

    # Scope to a specific GitHub user / org if requested.
    user = user.strip()
    if user:
        if not _GITHUB_USER_RE.match(user):
            raise __import__("fastapi").HTTPException(
                status_code=422,
                detail="Invalid GitHub username. Only alphanumeric characters and hyphens are allowed.",
            )
        clauses.append(f"user:{user}")

    # Stars filter — only meaningful when min_stars > 0.
    if min_stars > 0:
        clauses.append(f"stars:>={min_stars}")

    # Languages - OR them together if multiple are selected.
    if languages:
        lang_clauses = []
        for lang in languages:
            clean = lang.strip().lower()
            if clean in ALLOWED_LANGUAGES:
                lang_clauses.append(f"language:{clean}")
        if lang_clauses:
            if len(lang_clauses) == 1:
                clauses.append(lang_clauses[0])
            else:
                clauses.append("(" + " OR ".join(lang_clauses) + ")")

    # Topics - OR them together if multiple are selected, and include keyword search fallback.
    if topics:
        topic_clauses = []
        for topic in topics:
            clean = topic.strip().lower()
            if clean in ALLOWED_TOPICS:
                # Match topic tag OR keyword in quotes (searching name, description, and readme)
                terms = [f"topic:{clean}", f'"{clean}" in:name,description,readme']
                if "-" in clean:
                    # e.g. for "machine-learning", also match "machine learning"
                    space_clean = clean.replace("-", " ")
                    terms.append(f'"{space_clean}" in:name,description,readme')
                topic_clauses.append("(" + " OR ".join(terms) + ")")
        
        if topic_clauses:
            if len(topic_clauses) == 1:
                clauses.append(topic_clauses[0])
            else:
                clauses.append("(" + " OR ".join(topic_clauses) + ")")

    # When no constraints at all, fall back to a high-quality global default
    # so the grid is never empty on first load.
    return " ".join(clauses) if clauses else "stars:>=500"


def cache_key(q: str, page: int, per_page: int) -> str:
    raw = f"{q}|{page}|{per_page}"
    return hashlib.sha256(raw.encode()).hexdigest()


@app.get("/api/repositories", response_model=RepositoriesResponse)
async def get_repositories(
    request: Request,
    languages: list[str] = Query(default=[]),
    topics: list[str] = Query(default=[]),
    user: str = Query(default="", description="Optional GitHub username or org to scope the search"),
    page: int = Query(default=1, ge=1, le=34),  # GitHub search caps at 1000 results (34 pages * 30)
    per_page: int = Query(default=30, ge=1, le=100),
    min_stars: int = Query(default=0, ge=0),
):
    client_id = request.client.host if request.client else "unknown"
    if not await rate_limiter.check(client_id):
        raise HTTPException(status_code=429, detail="Rate limit exceeded. Try again shortly.")

    q = build_query_string(languages, topics, min_stars, user)
    # build_query_string already guarantees a non-empty string via its
    # internal fallback, but keep this as a defensive guard.
    if not q.strip():
        q = "stars:>=500"

    key = cache_key(q, page, per_page)
    cached_payload = await cache.get(key)
    if cached_payload is not None:
        return RepositoriesResponse(**cached_payload, cached=True)

    headers = {
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    if GITHUB_PAT:
        headers["Authorization"] = f"Bearer {GITHUB_PAT}"

    params = {"q": q, "sort": "stars", "order": "desc", "page": page, "per_page": per_page}

    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            resp = await client.get(GITHUB_SEARCH_URL, headers=headers, params=params)
        except httpx.RequestError as exc:
            raise HTTPException(status_code=502, detail=f"Upstream GitHub request failed: {exc}") from exc

    remaining = resp.headers.get("x-ratelimit-remaining")
    reset = resp.headers.get("x-ratelimit-reset")

    if resp.status_code == 403:
        # GitHub returns 403 for two distinct situations:
        # 1. Primary rate limit exhausted (x-ratelimit-remaining == "0")
        # 2. Secondary / abuse-detection rate limit (remaining may be non-zero)
        # Both are surfaced as 429 to the client with an actionable message.
        if remaining == "0":
            raise HTTPException(
                status_code=429,
                detail=(
                    f"GitHub Search API primary rate limit exhausted (resets at epoch {reset}). "
                    "Set GITHUB_PAT in your .env file to raise the limit from 10 to 30 req/min."
                ),
            )
        # Secondary rate limit or other forbidden response
        raise HTTPException(
            status_code=429,
            detail=(
                "GitHub Search API secondary rate limit triggered. "
                "Wait ~60 s and try again. Set GITHUB_PAT in .env to reduce the chance of hitting this."
            ),
        )
    if resp.status_code == 422:
        raise HTTPException(
            status_code=422,
            detail=f"GitHub rejected the search query: {resp.json().get('message', resp.text[:200])}",
        )
    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail=f"GitHub API error: {resp.text[:300]}")

    data = resp.json()

    items = [
        RepoItem(
            id=item["id"],
            name=item["name"],
            full_name=item["full_name"],
            html_url=item["html_url"],
            description=item.get("description"),
            language=item.get("language"),
            stargazers_count=item.get("stargazers_count", 0),
            forks_count=item.get("forks_count", 0),
            topics=item.get("topics", []),
            owner_login=item["owner"]["login"],
            owner_avatar=item["owner"]["avatar_url"],
        )
        for item in data.get("items", [])
    ]

    payload = {
        "total_count": data.get("total_count", 0),
        "incomplete_results": data.get("incomplete_results", False),
        "page": page,
        "items": [i.model_dump() for i in items],
        "github_rate_limit_remaining": int(remaining) if remaining is not None else None,
    }

    await cache.set(key, payload)

    return RepositoriesResponse(**payload, cached=False)


@app.get("/api/health")
async def health():
    return {"status": "ok", "cache": cache.stats()}
