"use client";

import Image from "next/image";
import { motion } from "framer-motion";

export interface Repository {
  id:               number;
  name:             string;
  full_name:        string;
  html_url:         string;
  description:      string | null;
  language:         string | null;
  stargazers_count: number;
  forks_count:      number;
  topics:           string[];
  owner_login:      string;
  owner_avatar:     string;
}

/** Formats large counts with K/M suffixes, e.g. 1234 → "1.2K". */
function formatCount(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (value >= 1_000)     return `${(value / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(value);
}

/** Language colour dot — matches Yash's primary ML stack palette. */
const LANG_COLOR: Record<string, string> = {
  Python:            "#c8ff57",   // accent lime
  "Jupyter Notebook":"#57d4ff",   // sky
  TypeScript:        "#57d4ff",
  JavaScript:        "#ffd057",
  Rust:              "#ff9f57",
  Go:                "#57ffb2",
  R:                 "#8080ff",
  Java:              "#ff6080",
  "C++":             "#ff57c8",
  Shell:             "#a0a0a0",
};

const DEFAULT_COLOR = "#606060";

export default function RepositoryCard({ repo }: { repo: Repository }) {
  const langColor = (repo.language && LANG_COLOR[repo.language]) || DEFAULT_COLOR;

  return (
    <motion.a
      href={repo.html_url}
      target="_blank"
      rel="noopener noreferrer"
      className="repo-card"
      whileHover={{ y: -3 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
    >
      {/* ── Owner row ──────────────────────────────────────────────── */}
      <div
        style={{
          display:        "flex",
          alignItems:     "center",
          gap:            "0.5rem",
          marginBottom:   "0.75rem",
        }}
      >
        <div
          style={{
            width:        "20px",
            height:       "20px",
            borderRadius: "50%",
            overflow:     "hidden",
            border:       "1px solid var(--border-2)",
            flexShrink:   0,
          }}
        >
          <Image
            src={repo.owner_avatar}
            alt={repo.owner_login}
            width={20}
            height={20}
            style={{ objectFit: "cover", display: "block" }}
            unoptimized
          />
        </div>
        <span
          className="mono"
          style={{
            fontSize:     "0.63rem",
            color:        "var(--text-3)",
            letterSpacing:"0.04em",
            overflow:     "hidden",
            textOverflow: "ellipsis",
            whiteSpace:   "nowrap",
          }}
        >
          {repo.owner_login}
        </span>
      </div>

      {/* ── Repo name & description ─────────────────────────────────── */}
      <div style={{ flex: 1 }}>
        <h3
          className="mono"
          style={{
            fontSize:     "0.88rem",
            fontWeight:   700,
            color:        "var(--text-1)",
            letterSpacing:"-0.01em",
            marginBottom: "0.4rem",
            overflow:     "hidden",
            textOverflow: "ellipsis",
            whiteSpace:   "nowrap",
          }}
        >
          {repo.name}
        </h3>
        <p
          style={{
            fontSize:   "0.78rem",
            color:      "var(--text-2)",
            lineHeight: 1.55,
            display:    "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
            overflow:   "hidden",
            margin:     0,
          }}
        >
          {repo.description || "No description provided."}
        </p>
      </div>

      {/* ── Topics ──────────────────────────────────────────────────── */}
      {repo.topics.length > 0 && (
        <div
          style={{
            display:    "flex",
            flexWrap:   "wrap",
            gap:        "4px",
            marginTop:  "0.75rem",
          }}
        >
          {repo.topics.slice(0, 4).map((topic) => (
            <span key={topic} className="chip">
              {topic}
            </span>
          ))}
          {repo.topics.length > 4 && (
            <span className="chip" style={{ color: "var(--text-3)" }}>
              +{repo.topics.length - 4}
            </span>
          )}
        </div>
      )}

      {/* ── Footer: language + stars/forks ──────────────────────────── */}
      <div
        style={{
          display:       "flex",
          alignItems:    "center",
          justifyContent:"space-between",
          marginTop:     "0.85rem",
          paddingTop:    "0.75rem",
          borderTop:     "1px solid var(--border)",
        }}
      >
        {/* Language */}
        <span
          className="mono"
          style={{
            display:      "flex",
            alignItems:   "center",
            gap:          "5px",
            fontSize:     "0.65rem",
            fontWeight:   600,
            color:        langColor,
            letterSpacing:"0.03em",
          }}
        >
          <span
            style={{
              display:        "inline-block",
              width:          "7px",
              height:         "7px",
              borderRadius:   "50%",
              backgroundColor:langColor,
              flexShrink:     0,
            }}
          />
          {repo.language || "Unknown"}
        </span>

        {/* Stars + Forks */}
        <div
          className="mono"
          style={{
            display:    "flex",
            gap:        "0.75rem",
            fontSize:   "0.65rem",
            color:      "var(--text-3)",
          }}
        >
          <span title={`${repo.stargazers_count} stars`}>
            ★ {formatCount(repo.stargazers_count)}
          </span>
          <span title={`${repo.forks_count} forks`}>
            ⑂ {formatCount(repo.forks_count)}
          </span>
        </div>
      </div>
    </motion.a>
  );
}
