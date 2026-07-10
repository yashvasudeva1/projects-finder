"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import RepositoryCard, { Repository } from "@/components/RepositoryCard";
import ParticleSphere from "@/components/ParticleSphere";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

// ── Languages — grouped by ecosystem ────────────────────────────────────────
const LANGUAGE_GROUPS = [
  {
    category: "Systems",
    items: [
      { label: "C",          value: "c"          },
      { label: "C++",        value: "c++"        },
      { label: "Rust",       value: "rust"       },
      { label: "Go",         value: "go"         },
      { label: "Zig",        value: "zig"        },
    ],
  },
  {
    category: "Web / Scripting",
    items: [
      { label: "Python",     value: "python"     },
      { label: "JavaScript", value: "javascript" },
      { label: "TypeScript", value: "typescript" },
      { label: "Ruby",       value: "ruby"       },
      { label: "PHP",        value: "php"        },
      { label: "Elixir",     value: "elixir"     },
      { label: "Shell",      value: "shell"      },
      { label: "Lua",        value: "lua"        },
    ],
  },
  {
    category: "Data / ML",
    items: [
      { label: "Jupyter",    value: "jupyter notebook" },
      { label: "R",          value: "r"          },
      { label: "Julia",      value: "julia"      },
    ],
  },
  {
    category: "Mobile",
    items: [
      { label: "Swift",      value: "swift"      },
      { label: "Kotlin",     value: "kotlin"     },
      { label: "Dart",       value: "dart"       },
    ],
  },
  {
    category: "JVM / .NET",
    items: [
      { label: "Java",       value: "java"       },
      { label: "Scala",      value: "scala"      },
      { label: "C#",         value: "c#"         },
    ],
  },
  {
    category: "Other",
    items: [
      { label: "Haskell",    value: "haskell"    },
      { label: "Solidity",   value: "solidity"   },
      { label: "Erlang",     value: "erlang"     },
      { label: "SQL",        value: "sql"        },
    ],
  },
] as const;

// ── Topics — organised by vertical ───────────────────────────────────────────
const TOPIC_GROUPS = [
  {
    category: "AI & Machine Learning",
    items: [
      { label: "Machine Learning",       value: "machine-learning"       },
      { label: "Deep Learning",          value: "deep-learning"          },
      { label: "Generative AI",          value: "generative-ai"          },
      { label: "LLM",                    value: "llm"                    },
      { label: "NLP",                    value: "nlp"                    },
      { label: "Computer Vision",        value: "computer-vision"        },
      { label: "Reinforcement Learning", value: "reinforcement-learning" },
      { label: "Time Series",            value: "time-series"            },
      { label: "Diffusion Models",       value: "diffusion-model"        },
      { label: "Multimodal",             value: "multimodal"             },
      { label: "PyTorch",                value: "pytorch"                },
      { label: "TensorFlow",             value: "tensorflow"             },
      { label: "Hugging Face",           value: "huggingface"            },
      { label: "LangChain",              value: "langchain"              },
      { label: "OpenAI",                 value: "openai"                 },
      { label: "RAG",                    value: "rag"                    },
      { label: "Fine-tuning",            value: "fine-tuning"            },
      { label: "Scikit-learn",           value: "scikit-learn"           },
      { label: "Keras",                  value: "keras"                  },
    ],
  },
  {
    category: "Web Development",
    items: [
      { label: "React",       value: "react"      },
      { label: "Next.js",     value: "nextjs"     },
      { label: "Vue",         value: "vue"        },
      { label: "Angular",     value: "angular"    },
      { label: "Svelte",      value: "svelte"     },
      { label: "Node.js",     value: "nodejs"     },
      { label: "Django",      value: "django"     },
      { label: "FastAPI",     value: "fastapi"    },
      { label: "Flask",       value: "flask"      },
      { label: "Spring Boot", value: "spring-boot"},
      { label: "GraphQL",     value: "graphql"    },
      { label: "REST API",    value: "rest-api"   },
      { label: "Fullstack",   value: "fullstack"  },
      { label: "Frontend",    value: "frontend"   },
      { label: "Backend",     value: "backend"    },
      { label: "WebSockets",  value: "websocket"  },
    ],
  },
  {
    category: "Data Science & Eng",
    items: [
      { label: "Data Science",    value: "data-science"          },
      { label: "Data Eng",        value: "data-engineering"      },
      { label: "Spark",           value: "apache-spark"          },
      { label: "Kafka",           value: "kafka"                 },
      { label: "Airflow",         value: "airflow"               },
      { label: "ETL",             value: "etl"                   },
      { label: "Data Pipeline",   value: "data-pipeline"         },
      { label: "Analytics",       value: "analytics"             },
      { label: "Recommendation",  value: "recommendation-system" },
    ],
  },
  {
    category: "Cloud & DevOps",
    items: [
      { label: "Docker",         value: "docker"         },
      { label: "Kubernetes",     value: "kubernetes"     },
      { label: "GitHub Actions", value: "github-actions" },
      { label: "Terraform",      value: "terraform"      },
      { label: "AWS",            value: "aws"            },
      { label: "GCP",            value: "gcp"            },
      { label: "Azure",          value: "azure"          },
      { label: "Serverless",     value: "serverless"     },
      { label: "Microservices",  value: "microservices"  },
      { label: "CI/CD",          value: "ci-cd"          },
      { label: "DevOps",         value: "devops"         },
      { label: "Nginx",          value: "nginx"          },
    ],
  },
  {
    category: "Databases & Storage",
    items: [
      { label: "PostgreSQL",    value: "postgresql"    },
      { label: "MongoDB",       value: "mongodb"       },
      { label: "Redis",         value: "redis"         },
      { label: "MySQL",         value: "mysql"         },
      { label: "Elasticsearch", value: "elasticsearch" },
      { label: "SQLite",        value: "sqlite"        },
      { label: "Cassandra",     value: "cassandra"     },
      { label: "Database",      value: "database"      },
      { label: "Vector DB",     value: "vector-database"},
    ],
  },
  {
    category: "Mobile & Gaming",
    items: [
      { label: "Android",      value: "android"          },
      { label: "iOS",          value: "ios"              },
      { label: "Flutter",      value: "flutter"          },
      { label: "React Native", value: "react-native"     },
      { label: "SwiftUI",      value: "swiftui"          },
      { label: "Game Dev",     value: "game-development" },
      { label: "Unity",        value: "unity"            },
      { label: "Godot",        value: "godot"            },
      { label: "Pygame",       value: "pygame"           },
      { label: "OpenGL",       value: "opengl"           },
      { label: "Vulkan",       value: "vulkan"           },
    ],
  },
  {
    category: "Systems & Networking",
    items: [
      { label: "OS",                value: "operating-system"    },
      { label: "Compiler",          value: "compiler"            },
      { label: "Embedded",          value: "embedded"            },
      { label: "Networking",        value: "networking"          },
      { label: "Distributed Sys",   value: "distributed-systems" },
      { label: "Firmware",          value: "firmware"            },
      { label: "Real-time",         value: "real-time"           },
    ],
  },
  {
    category: "Security",
    items: [
      { label: "Security",     value: "security"          },
      { label: "Cybersecurity",value: "cybersecurity"     },
      { label: "Cryptography", value: "cryptography"      },
      { label: "Pen Testing",  value: "penetration-testing"},
      { label: "Auth / OAuth", value: "authentication"    },
      { label: "Zero Trust",   value: "zero-trust"        },
      { label: "JWT",          value: "jwt"               },
    ],
  },
  {
    category: "Web3 & Crypto",
    items: [
      { label: "Web3",            value: "web3"            },
      { label: "Blockchain",      value: "blockchain"      },
      { label: "Ethereum",        value: "ethereum"        },
      { label: "Solidity",        value: "solidity"        },
      { label: "DeFi",            value: "defi"            },
      { label: "Solana",          value: "solana"          },
      { label: "Smart Contracts", value: "smart-contracts" },
      { label: "NFT",             value: "nft"             },
      { label: "Polkadot",        value: "polkadot"        },
    ],
  },
  {
    category: "Dev Tools & Theory",
    items: [
      { label: "CLI",               value: "cli"             },
      { label: "Automation",        value: "automation"      },
      { label: "Testing",           value: "testing"         },
      { label: "Web Scraping",      value: "web-scraping"    },
      { label: "Open Source",       value: "open-source"     },
      { label: "Dev Tools",         value: "developer-tools" },
      { label: "Algorithms",        value: "algorithm"       },
      { label: "Data Structures",   value: "data-structures" },
      { label: "System Design",     value: "system-design"   },
      { label: "API",               value: "api"             },
      { label: "Documentation",     value: "documentation"   },
    ],
  },
] as const;

// ── Min-stars presets ─────────────────────────────────────────────────────
const STAR_PRESETS = [
  { label: "Any",  value: 0     },
  { label: "100+", value: 100   },
  { label: "500+", value: 500   },
  { label: "1K+",  value: 1000  },
  { label: "5K+",  value: 5000  },
  { label: "10K+", value: 10000 },
] as const;

type FetchState = "idle" | "loading" | "error" | "done";

// Deduplicates a repos array by id — prevents duplicate React key warnings
// that occur when GitHub API returns the same repo across multiple pages.
function dedupeById(repos: Repository[]): Repository[] {
  const seen = new Set<number>();
  return repos.filter((r) => {
    if (seen.has(r.id)) return false;
    seen.add(r.id);
    return true;
  });
}

export default function RepositoryExplorerPage() {
  const [activeLanguages, setActiveLanguages] = useState<string[]>([]);
  const [activeTopics,    setActiveTopics   ] = useState<string[]>([]);
  const [minStars,        setMinStars       ] = useState(0);
  const [username,        setUsername       ] = useState("");
  const [avatarUrl,       setAvatarUrl      ] = useState<string | null>(null);
  const [repos,           setRepos          ] = useState<Repository[]>([]);
  const [page,            setPage           ] = useState(1);
  const [totalCount,      setTotalCount     ] = useState(0);
  const [status,          setStatus         ] = useState<FetchState>("idle");
  const [errorMsg,        setErrorMsg       ] = useState<string>("");
  const [activeCategoryIdx, setActiveCategoryIdx] = useState(0);
  const sentinelRef   = useRef<HTMLDivElement>(null);
  const avatarTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);



  // ── Toggle helper ─────────────────────────────────────────────────────
  const toggle = (list: string[], value: string, set: (v: string[]) => void) => {
    set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  };

  // ── Live avatar preview — resolves after user stops typing for 600 ms ──
  const handleUsernameChange = (val: string) => {
    setUsername(val);
    setAvatarUrl(null);
    if (avatarTimerRef.current) clearTimeout(avatarTimerRef.current);
    const trimmed = val.trim();
    if (!trimmed) return;
    avatarTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`https://api.github.com/users/${encodeURIComponent(trimmed)}`);
        if (res.ok) {
          const data = await res.json();
          setAvatarUrl(data.avatar_url ?? null);
        } else {
          setAvatarUrl(null);
        }
      } catch {
        setAvatarUrl(null);
      }
    }, 600);
  };

  // ── Core fetch ────────────────────────────────────────────────────────
  const fetchRepos = useCallback(
    async (targetPage: number, replace: boolean) => {
      setStatus("loading");
      const params = new URLSearchParams();
      activeLanguages.forEach((l) => params.append("languages", l.toLowerCase()));
      activeTopics   .forEach((t) => params.append("topics", t));
      params.set("page",      String(targetPage));
      params.set("per_page",  "24");
      params.set("min_stars", String(minStars));
      if (username.trim()) params.set("user", username.trim());

      try {
        const res = await fetch(`${API_BASE}/api/repositories?${params.toString()}`);
        if (!res.ok) {
          // Pull the human-readable detail out of the FastAPI JSON error body
          let detail = `HTTP ${res.status}`;
          try {
            const body = await res.json();
            detail = body?.detail ?? detail;
          } catch { /* body was not JSON */ }
          setErrorMsg(detail);
          setStatus("error");
          return;
        }
        const data = await res.json();
        setTotalCount(data.total_count);
        setRepos((prev) => {
          const next = replace ? data.items : [...prev, ...data.items];
          return dedupeById(next);
        });
        setStatus(data.items.length === 0 ? "done" : "idle");
      } catch (err) {
        console.error(err);
        setErrorMsg("Could not reach the API gateway — is uvicorn running on port 8000?");
        setStatus("error");
      }

    },
    [activeLanguages, activeTopics, minStars, username]
  );

  // ── Initial load only — filters do NOT trigger auto-refetch ───────────
  // Users must click "Search" to apply filter changes. This dramatically
  // reduces unnecessary API calls while the user is still picking options.
  useEffect(() => {
    fetchRepos(1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Manual search trigger ──────────────────────────────────────────────
  const handleSearch = useCallback(() => {
    setPage(1);
    fetchRepos(1, true);
  }, [fetchRepos]);

  // ── Infinite scroll via IntersectionObserver ───────────────────────────
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && status === "idle" && repos.length < totalCount) {
          const next = page + 1;
          setPage(next);
          fetchRepos(next, false);
        }
      },
      { rootMargin: "400px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [page, status, repos.length, totalCount, fetchRepos]);

  const activeFilterCount =
    activeLanguages.length + activeTopics.length + (minStars > 0 ? 1 : 0) + (username.trim() ? 1 : 0);
  const isLoading = status === "loading";

  return (
    <>
      {/* ── Interactive particle sphere (fixed, behind all content) ── */}
      <ParticleSphere />

      {/* ── Page content (sits above the sphere) ── */}
      <div
        className="min-h-screen"
        style={{ position: "relative", zIndex: 1, color: "var(--text-1)" }}
      >
        {/* Shimmer accent bar */}
        <div className="accent-bar" />

        {/* ── Header ──────────────────────────────────────────────────── */}
        <header
          style={{
            borderBottom:         "1px solid var(--border)",
            background:           "rgba(13,13,13,0.8)",
            backdropFilter:       "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            position:             "sticky",
            top:                  0,
            zIndex:               30,
          }}
        >
          <div
            style={{
              maxWidth:       "1400px",
              margin:         "0 auto",
              padding:        "0 1.5rem",
              height:         "60px",
              display:        "flex",
              alignItems:     "center",
              justifyContent: "space-between",
              gap:            "1rem",
            }}
          >
            {/* Brand */}
            <h1
              className="mono"
              style={{
                fontSize:      "1.05rem",
                fontWeight:    800,
                color:         "var(--text-1)",
                letterSpacing: "-0.03em",
                margin:        0,
              }}
            >
              Let&apos;s Build
              <span style={{ color: "var(--accent)", marginLeft: "2px" }}>.</span>
            </h1>

            {/* Stats — show username scope badge when active */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              {username.trim() && (
                <span
                  className="chip"
                  style={{ display: "flex", alignItems: "center", gap: "5px", borderColor: "var(--accent-2)", color: "var(--accent-2)" }}
                >
                  {avatarUrl && (
                    <Image
                      src={avatarUrl}
                      alt={username}
                      width={14}
                      height={14}
                      unoptimized
                      style={{ borderRadius: "50%", display: "block" }}
                    />
                  )}
                  @{username.trim()}
                </span>
              )}
              {activeFilterCount > 0 && (
                <span
                  className="chip"
                  style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
                >
                  {activeFilterCount} filter{activeFilterCount > 1 ? "s" : ""}
                </span>
              )}
              <span className="mono" style={{ fontSize: "0.72rem", color: "var(--text-3)" }}>
                {totalCount > 0 ? (
                  <>
                    <span style={{ color: "var(--accent)", fontWeight: 600 }}>
                      {totalCount.toLocaleString()}
                    </span>{" "}
                    repos
                  </>
                ) : (
                  "—"
                )}
              </span>
            </div>
          </div>
        </header>

        {/* ── Filter panel ────────────────────────────────────────────── */}
        <section
          style={{
            borderBottom: "1px solid var(--border)",
            background:   "rgba(20,20,20,0.75)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
          }}
        >
          <div
            style={{
              maxWidth:      "1400px",
              margin:        "0 auto",
              padding:       "1.25rem 1.5rem",
              display:       "flex",
              flexDirection: "column",
              gap:           "1rem",
            }}
          >
            {/* 00 — GitHub user / org search */}
            <div>
              <p className="section-label" style={{ marginBottom: "0.6rem" }}>
                00 / github user or org
              </p>
              <div style={{ maxWidth: "360px" }}>
                <div className="search-input-wrap">
                  {/* Search icon */}
                  <svg
                    className="search-icon"
                    width="14" height="14" viewBox="0 0 24 24"
                    fill="none" stroke="currentColor" strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>

                  {/* If we resolved an avatar, show it inside the input */}
                  {avatarUrl && (
                    <div
                      style={{
                        position:     "absolute",
                        right:        "2.1rem",
                        display:      "flex",
                        alignItems:   "center",
                        pointerEvents:"none",
                      }}
                    >
                      <Image
                        src={avatarUrl}
                        alt={username}
                        width={18}
                        height={18}
                        unoptimized
                        style={{ borderRadius: "50%", border: "1px solid var(--accent-2)" }}
                      />
                    </div>
                  )}

                  <input
                    type="text"
                    className="search-input"
                    placeholder="e.g. yashvasudeva1, torvalds, microsoft…"
                    value={username}
                    onChange={(e) => handleUsernameChange(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
                    autoComplete="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    style={avatarUrl ? { paddingRight: "3.8rem" } : {}}
                  />

                  {/* Clear button */}
                  {username && (
                    <button
                      className="search-clear"
                      aria-label="Clear username"
                      onClick={() => { setUsername(""); setAvatarUrl(null); }}
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Validation hint */}
                {username.trim() && !/^[a-zA-Z0-9][a-zA-Z0-9\-]{0,37}[a-zA-Z0-9]?$/.test(username.trim()) && (
                  <p
                    className="mono"
                    style={{ fontSize: "0.62rem", color: "#ff8080", marginTop: "0.4rem", letterSpacing: "0.03em" }}
                  >
                    ✗ Invalid username — only letters, numbers, and hyphens allowed.
                  </p>
                )}
              </div>
            </div>

            {/* 01 — Languages ─────────────────────────────────────── */}
            <div style={{ paddingBottom: "1.5rem", borderBottom: "1px solid var(--border)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1rem" }}>
                <p className="section-label" style={{ margin: 0 }}>01 / language</p>
                <span className="lang-note">select multiple</span>
                {activeLanguages.length > 0 && (
                  <button className="clear-btn" onClick={() => setActiveLanguages([])}>✕ clear</button>
                )}
              </div>

              {/* Grouped layout for languages */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "1.25rem", rowGap: "1.25rem" }}>
                {LANGUAGE_GROUPS.map((group) => (
                  <div key={group.category} style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    <span style={{ 
                      fontFamily: "var(--mono)", fontSize: "0.58rem", letterSpacing: "0.1em", 
                      textTransform: "uppercase", color: "var(--text-3)", opacity: 0.7 
                    }}>
                      {group.category}
                    </span>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
                      {group.items.map((lang) => (
                        <button
                          key={lang.value}
                          className={`filter-btn${activeLanguages.includes(lang.value) ? " active" : ""}`}
                          onClick={() => toggle(activeLanguages, lang.value, setActiveLanguages)}
                        >
                          {lang.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 02 — Topics ──────────────────────────────────────────── */}
            <div style={{ paddingBottom: "1.5rem", borderBottom: "1px solid var(--border)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1rem" }}>
                <p className="section-label" style={{ margin: 0 }}>02 / topic</p>
                {activeTopics.length > 0 && (
                  <button className="clear-btn" onClick={() => setActiveTopics([])}>
                    ✕ clear {activeTopics.length}
                  </button>
                )}
              </div>

              {/* Category tab strip — inline styled for robust rendering */}
              <div style={{
                display: "flex",
                gap: "0.4rem",
                overflowX: "auto",
                paddingBottom: "0.8rem",
                marginBottom: "0.8rem",
                borderBottom: "1px solid var(--border)",
                scrollbarWidth: "none",
                msOverflowStyle: "none"
              }}>
                {TOPIC_GROUPS.map((group, idx) => {
                  const count = group.items.filter((t) => activeTopics.includes(t.value)).length;
                  const active = activeCategoryIdx === idx;
                  return (
                    <button
                      key={group.category}
                      onClick={() => setActiveCategoryIdx(idx)}
                      style={{
                        flexShrink: 0,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "5px 14px",
                        borderRadius: "99px",
                        border: `1px solid ${active ? "rgba(87, 212, 255, 0.45)" : "var(--border-2)"}`,
                        background: active ? "rgba(87, 212, 255, 0.07)" : "transparent",
                        color: active ? "var(--accent-2)" : "var(--text-3)",
                        fontFamily: "var(--mono)",
                        fontSize: "0.6rem",
                        letterSpacing: "0.05em",
                        textTransform: "uppercase",
                        cursor: "pointer",
                        transition: "all 150ms",
                      }}
                      onMouseOver={(e) => {
                        if (!active) {
                          e.currentTarget.style.color = "var(--text-2)";
                          e.currentTarget.style.borderColor = "var(--border-3)";
                        }
                      }}
                      onMouseOut={(e) => {
                        if (!active) {
                          e.currentTarget.style.color = "var(--text-3)";
                          e.currentTarget.style.borderColor = "var(--border-2)";
                        }
                      }}
                    >
                      {group.category}
                      {count > 0 && (
                        <span style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          minWidth: "16px",
                          height: "16px",
                          padding: "0 4px",
                          borderRadius: "99px",
                          background: "var(--accent-2)",
                          color: "#0d0d0d",
                          fontSize: "0.55rem",
                          fontWeight: 700,
                          lineHeight: 1
                        }}>
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Items for the active category only */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                {TOPIC_GROUPS[activeCategoryIdx].items.map((topic) => {
                  const on = activeTopics.includes(topic.value);
                  return (
                    <button
                      key={topic.value}
                      className={`filter-btn${on ? " active" : ""}`}
                      style={on ? { background: "var(--accent-2)", borderColor: "var(--accent-2)", color: "#0d0d0d" } : {}}
                      onClick={() => toggle(activeTopics, topic.value, setActiveTopics)}
                    >
                      {topic.label}
                    </button>
                  );
                })}
              </div>

              {/* Selected topics summary across all categories */}
              {activeTopics.length > 0 && (
                <div style={{ marginTop: "0.7rem", display: "flex", flexWrap: "wrap", gap: "0.3rem", alignItems: "center" }}>
                  <span className="lang-note" style={{ marginRight: "0.2rem" }}>selected:</span>
                  {activeTopics.map((v) => {
                    let label = v;
                    for (const g of TOPIC_GROUPS) {
                      const item = g.items.find((t) => t.value === v);
                      if (item) {
                        label = item.label;
                        break;
                      }
                    }
                    return (
                      <span
                        key={v}
                        className="chip"
                        style={{ borderColor: "var(--accent-2)", color: "var(--accent-2)", cursor: "pointer", gap: "5px" }}
                        onClick={() => toggle(activeTopics, v, setActiveTopics)}
                        title="click to remove"
                      >
                        {label} ✕
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 03 — Min stars ───────────────────────────────────────── */}
            <div>
              <p className="section-label" style={{ marginBottom: "0.65rem" }}>03 / min stars</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
                {STAR_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    className={`filter-btn${minStars === preset.value ? " active" : ""}`}
                    style={
                      minStars === preset.value
                        ? { background: "var(--accent-3)", borderColor: "var(--accent-3)", color: "#0d0d0d" }
                        : {}
                    }
                    onClick={() => setMinStars(preset.value)}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>


            {/* ── Search button ──────────────────────────────────────── */}
            <div
              style={{
                paddingTop:  "0.5rem",
                borderTop:   "1px solid var(--border)",
                display:     "flex",
                alignItems:  "center",
                justifyContent: "space-between",
                gap:         "1rem",
                flexWrap:    "wrap",
              }}
            >
              {/* Hint text */}
              <p
                className="mono"
                style={{
                  fontSize:     "0.62rem",
                  color:        "var(--text-3)",
                  letterSpacing:"0.06em",
                  margin:       0,
                }}
              >
                {activeFilterCount === 0
                  ? "select filters above, then search"
                  : `${activeFilterCount} filter${activeFilterCount > 1 ? "s" : ""} selected — ready to search`}
              </p>

              {/* The button */}
              <motion.button
                onClick={handleSearch}
                disabled={isLoading}
                whileHover={isLoading ? {} : { scale: 1.03 }}
                whileTap={isLoading   ? {} : { scale: 0.97 }}
                transition={{ duration: 0.12 }}
                style={{
                  display:       "flex",
                  alignItems:    "center",
                  gap:           "0.6rem",
                  padding:       "0.65rem 1.6rem",
                  borderRadius:  "var(--radius)",
                  border:        "none",
                  background:    isLoading ? "rgba(200,255,87,0.25)" : "var(--accent)",
                  color:         isLoading ? "var(--accent)"         : "#0d0d0d",
                  fontFamily:    "var(--mono)",
                  fontSize:      "0.78rem",
                  fontWeight:    700,
                  letterSpacing: "0.06em",
                  cursor:        isLoading ? "not-allowed" : "pointer",
                  transition:    "background 200ms, color 200ms",
                  boxShadow:     isLoading ? "none" : "0 0 24px rgba(200,255,87,0.2)",
                  minWidth:      "180px",
                  justifyContent:"center",
                }}
              >
                {isLoading ? (
                  <>
                    <span style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                      <span className="dot" style={{ width: "4px", height: "4px", background: "var(--accent)" }} />
                      <span className="dot" style={{ width: "4px", height: "4px", background: "var(--accent)", animationDelay: "0.2s" }} />
                      <span className="dot" style={{ width: "4px", height: "4px", background: "var(--accent)", animationDelay: "0.4s" }} />
                    </span>
                    Searching…
                  </>
                ) : (
                  <>
                    Search Repos
                    <motion.span
                      animate={{ x: [0, 3, 0] }}
                      transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
                    >
                      →
                    </motion.span>
                  </>
                )}
              </motion.button>
            </div>
          </div>
        </section>

        {/* ── Repo grid ───────────────────────────────────────────────── */}
        <main style={{ maxWidth: "1400px", margin: "0 auto", padding: "2rem 1.5rem 4rem" }}>

          {/* Error state */}
          {status === "error" && (
            <div
              style={{
                border:        "1px solid rgba(255,100,100,0.3)",
                borderRadius:  "var(--radius)",
                background:    "rgba(255,80,80,0.05)",
                padding:       "1rem 1.25rem",
                marginBottom:  "1.5rem",
                display:       "flex",
                flexDirection: "column",
                gap:           "0.6rem",
              }}
            >
              {/* Main error message */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem" }}>
                <span style={{ color: "#ff8080", flexShrink: 0, fontFamily: "var(--mono)", fontSize: "0.8rem" }}>
                  ✗
                </span>
                <span
                  className="mono"
                  style={{ color: "#ff8080", fontSize: "0.75rem", letterSpacing: "0.03em", lineHeight: 1.5 }}
                >
                  {errorMsg || "Request failed — check the API gateway."}
                </span>
              </div>

              {/* Rate-limit guidance — shown when the error mentions PAT or rate limit */}
              {(errorMsg.toLowerCase().includes("rate limit") || errorMsg.includes("GITHUB_PAT")) && (
                <div
                  style={{
                    borderTop:     "1px solid rgba(255,100,100,0.2)",
                    paddingTop:    "0.6rem",
                    display:       "flex",
                    flexDirection: "column",
                    gap:           "0.3rem",
                  }}
                >
                  <p className="mono" style={{ fontSize: "0.65rem", color: "var(--text-3)", margin: 0, letterSpacing: "0.03em" }}>
                    Fix: add your GitHub PAT to{" "}
                    <code style={{ background: "rgba(255,255,255,0.07)", padding: "1px 5px", borderRadius: "3px" }}>
                      Projects Finder/.env
                    </code>
                  </p>
                  <p className="mono" style={{ fontSize: "0.65rem", color: "var(--text-3)", margin: 0, letterSpacing: "0.03em" }}>
                    <code style={{ background: "rgba(255,255,255,0.07)", padding: "1px 5px", borderRadius: "3px" }}>
                      GITHUB_PAT=ghp_xxxxxxxxxxxx
                    </code>
                    {" "}— generate one at{" "}
                    <a
                      href="https://github.com/settings/tokens"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "var(--accent-2)", textDecoration: "underline" }}
                    >
                      github.com/settings/tokens
                    </a>
                    {" "}(no scopes needed for public repos)
                  </p>
                </div>
              )}

              {/* Retry button */}
              <button
                onClick={handleSearch}
                style={{
                  alignSelf:     "flex-start",
                  marginTop:     "0.1rem",
                  padding:       "4px 12px",
                  border:        "1px solid rgba(255,100,100,0.35)",
                  borderRadius:  "var(--radius)",
                  background:    "transparent",
                  color:         "#ff8080",
                  fontFamily:    "var(--mono)",
                  fontSize:      "0.65rem",
                  letterSpacing: "0.06em",
                  cursor:        "pointer",
                  transition:    "background 150ms",
                }}
                onMouseOver={(e) => (e.currentTarget.style.background = "rgba(255,80,80,0.1)")}
                onMouseOut={(e)  => (e.currentTarget.style.background = "transparent")}
              >
                retry →
              </button>
            </div>
          )}

          {/* Cards */}
          <div
            style={{
              display:             "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap:                 "1rem",
            }}
          >
            <AnimatePresence initial={false}>
              {repos.map((repo, i) => (
                <motion.div
                  key={repo.id}
                  layout
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.22, delay: (i % 24) * 0.018 }}
                >
                  <RepositoryCard repo={repo} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Empty / ready-to-search state */}
          {repos.length === 0 && (status === "idle" || status === "done") && (
            <div
              style={{
                border:       "1px dashed var(--border-2)",
                borderRadius: "var(--radius)",
                padding:      "5rem 2rem",
                textAlign:    "center",
                color:        "var(--text-3)",
                fontFamily:   "var(--mono)",
                fontSize:     "0.72rem",
                letterSpacing:"0.08em",
                textTransform:"uppercase",
              }}
            >
              {status === "done"
                ? "No repositories matched — adjust the filters and search again."
                : "Select your filters above and click Search Repos."}
            </div>
          )}

          {/* Infinite scroll sentinel */}
          <div ref={sentinelRef} style={{ height: "40px", width: "100%" }} />

          {/* Loading dots (for infinite scroll) */}
          {status === "loading" && repos.length > 0 && (
            <div style={{ display: "flex", justifyContent: "center", gap: "6px", padding: "1.5rem" }}>
              <span className="dot" />
              <span className="dot" />
              <span className="dot" />
            </div>
          )}

          {/* End of results */}
          {status === "done" && repos.length > 0 && (
            <p
              className="mono"
              style={{
                textAlign:    "center",
                fontSize:     "0.68rem",
                color:        "var(--text-3)",
                letterSpacing:"0.1em",
                textTransform:"uppercase",
                padding:      "1rem 0",
              }}
            >
              — end of results —
            </p>
          )}
        </main>
      </div>
    </>
  );
}
