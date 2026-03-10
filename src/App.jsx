import { useState } from "react";
import { TRANSCRIPT_MARCH, TRANSCRIPT_SEPTEMBER } from "./transcripts";
import { scoreContradictions } from "./scorer";

// ─── Colour tokens by contradiction type ─────────────────────────────────────

const TYPE_STYLES = {
  direct: {
    border: "#ef4444",
    chipBg: "#fee2e2",
    chipColor: "#991b1b",
    label: "DIRECT",
  },
  inferential: {
    border: "#f59e0b",
    chipBg: "#fef3c7",
    chipColor: "#92400e",
    label: "INFERENTIAL",
  },
  false_positive: {
    border: "#9ca3af",
    chipBg: "#f3f4f6",
    chipColor: "#374151",
    label: "FALSE POSITIVE",
  },
};

const CONF_COLORS = {
  HIGH: "#16a34a",
  MEDIUM: "#d97706",
  LOW: "#9ca3af",
  "VERY LOW": "#6b7280",
};

// ─── Signal pill labels ───────────────────────────────────────────────────────

const SIGNAL_META = [
  { key: "exclusivity", icon: "⚡", label: "Absolute Language" },
  { key: "temporalConflict", icon: "🕐", label: "Temporal Conflict" },
  { key: "locationConflict", icon: "📍", label: "Location Conflict" },
  { key: "entityConflict", icon: "👤", label: "Entity Conflict" },
  { key: "ambiguity", icon: "〰️", label: "Hedged Language" },
  { key: "approximation", icon: "≈", label: "Approximation" },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function Chip({ bg, color, children, style }) {
  return (
    <span
      style={{
        background: bg,
        color,
        padding: "2px 10px",
        borderRadius: 4,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.05em",
        ...style,
      }}
    >
      {children}
    </span>
  );
}

function SignalPills({ signals }) {
  const active = SIGNAL_META.filter(({ key }) => signals[key]);
  if (active.length === 0) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
      {active.map(({ key, icon, label }) => (
        <span
          key={key}
          style={{
            background: "#f1f5f9",
            color: "#475569",
            border: "1px solid #cbd5e1",
            borderRadius: 12,
            padding: "2px 8px",
            fontSize: 11,
          }}
        >
          {icon} {label}
        </span>
      ))}
    </div>
  );
}

function ScoreBreakdown({ breakdown, contradictionType }) {
  const typeLabel = TYPE_STYLES[contradictionType]?.label ?? contradictionType;
  const typeColor = TYPE_STYLES[contradictionType]?.chipColor ?? "#374151";
  const typeBg = TYPE_STYLES[contradictionType]?.chipBg ?? "#f3f4f6";

  return (
    <div
      style={{
        marginTop: 12,
        background: "#f8fafc",
        border: "1px solid #e2e8f0",
        borderRadius: 6,
        padding: "12px 14px",
        fontSize: 12,
      }}
    >
      <p style={{ margin: "0 0 8px", fontWeight: 700, color: "#334155", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>
        Score breakdown
      </p>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <tbody>
          {/* Base */}
          <tr>
            <td style={{ color: "#64748b", paddingBottom: 5 }}>Base score</td>
            <td style={{ textAlign: "right", fontWeight: 600, paddingBottom: 5, color: "#334155" }}>
              {breakdown.base}
            </td>
          </tr>

          {/* Adjustments */}
          {breakdown.adjustments.map((adj, i) => (
            <tr key={i}>
              <td style={{ color: "#64748b", paddingBottom: 5 }}>{adj.label}</td>
              <td
                style={{
                  textAlign: "right",
                  fontWeight: 700,
                  paddingBottom: 5,
                  color: adj.value > 0 ? "#16a34a" : "#dc2626",
                }}
              >
                {adj.value > 0 ? `+${adj.value}` : adj.value}
              </td>
            </tr>
          ))}

          {/* Divider + final */}
          <tr>
            <td colSpan={2} style={{ borderTop: "1px solid #e2e8f0", paddingTop: 0 }} />
          </tr>
          <tr>
            <td style={{ paddingTop: 6, fontWeight: 700, color: "#1e293b" }}>Final score</td>
            <td style={{ textAlign: "right", paddingTop: 6, fontWeight: 700, color: "#1e293b" }}>
              {breakdown.final}
            </td>
          </tr>
          <tr>
            <td style={{ color: "#64748b", paddingTop: 4 }}>Classified as</td>
            <td style={{ textAlign: "right", paddingTop: 4 }}>
              <span style={{ background: typeBg, color: typeColor, padding: "1px 7px", borderRadius: 3, fontWeight: 700 }}>
                {typeLabel}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function ContradictionCard({ result }) {
  const [showBreakdown, setShowBreakdown] = useState(false);
  const ts = TYPE_STYLES[result.contradiction_type] ?? TYPE_STYLES.false_positive;
  const confColor = CONF_COLORS[result.confidence_label] ?? "#6b7280";

  return (
    <div
      style={{
        border: "1px solid #e2e8f0",
        borderLeft: `4px solid ${ts.border}`,
        borderRadius: 8,
        padding: "16px 20px",
        marginBottom: 14,
        background: "#fff",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
      }}
    >
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
        <Chip bg={ts.chipBg} color={ts.chipColor}>{ts.label}</Chip>

        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: confColor,
            background: confColor + "18",
            padding: "2px 10px",
            borderRadius: 4,
            letterSpacing: "0.04em",
          }}
        >
          {result.confidence_score} · {result.confidence_label}
        </span>

        {result.topic && (
          <Chip bg="#f1f5f9" color="#475569" style={{ fontWeight: 500, textTransform: "capitalize" }}>
            {result.topic}
          </Chip>
        )}

        {/* Breakdown toggle — pushed to the right */}
        <button
          onClick={() => setShowBreakdown((v) => !v)}
          style={{
            marginLeft: "auto",
            fontSize: 11,
            color: showBreakdown ? "#1e3a5f" : "#64748b",
            background: showBreakdown ? "#e0e7ff" : "none",
            border: "1px solid #cbd5e1",
            borderRadius: 4,
            padding: "2px 9px",
            cursor: "pointer",
            fontWeight: 500,
            transition: "background 0.1s, color 0.1s",
          }}
        >
          {showBreakdown ? "Hide score ▲" : "Why this score? ▼"}
        </button>
      </div>

      {/* Excerpts */}
      <div style={{ fontSize: 14, lineHeight: 1.6 }}>
        <div style={{ marginBottom: 6 }}>
          <span style={{ fontWeight: 600, color: "#1e3a5f" }}>March 2023: </span>
          <span style={{ color: "#1e293b" }}>"{result.march_excerpt}"</span>
        </div>
        <div>
          <span style={{ fontWeight: 600, color: "#7c3aed" }}>September 2023: </span>
          <span style={{ color: "#1e293b" }}>"{result.september_excerpt}"</span>
        </div>
      </div>

      {/* Explanation */}
      <p
        style={{
          marginTop: 10,
          marginBottom: 0,
          fontSize: 12,
          color: "#64748b",
          fontStyle: "italic",
          lineHeight: 1.5,
        }}
      >
        {result.explanation}
      </p>

      {/* Signal pills */}
      <SignalPills signals={result.signals} />

      {/* Score breakdown panel */}
      {showBreakdown && (
        <ScoreBreakdown
          breakdown={result.score_breakdown}
          contradictionType={result.contradiction_type}
        />
      )}
    </div>
  );
}

// ─── LLM extraction ───────────────────────────────────────────────────────────

async function extractCandidates(apiKey) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1200,
      messages: [
        {
          role: "user",
          content: `You are a legal assistant. Find candidate contradictions between these two depositions from the same witness.

Return ONLY a valid JSON array — no prose, no markdown fences. Each item must have exactly these keys:
- "march_excerpt": the relevant exact quote from Transcript 1
- "september_excerpt": the relevant exact quote from Transcript 2
- "topic": a single lowercase word describing the subject (e.g. "alibi", "timing", "location", "identity", "vehicle")

Do NOT classify type. Do NOT assign severity or confidence. Extract only.

Transcript 1 (March 2023):
${TRANSCRIPT_MARCH}

Transcript 2 (September 2023):
${TRANSCRIPT_SEPTEMBER}`,
        },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API error ${res.status}: ${body}`);
  }

  const data = await res.json();
  const raw = data.content[0].text.replace(/```json|```/g, "").trim();
  return JSON.parse(raw);
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function App() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  async function analyze() {
    const apiKey = import.meta.env.VITE_ANTHROPIC_KEY;
    if (!apiKey) {
      setError(
        "Missing API key. Copy .env.example to .env and set VITE_ANTHROPIC_KEY."
      );
      return;
    }

    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const candidates = await extractCandidates(apiKey);
      const scored = scoreContradictions(candidates);
      setResults(scored);
    } catch (e) {
      setError("Analysis failed: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  const typeCounts = results
    ? results.reduce((acc, r) => {
        acc[r.contradiction_type] = (acc[r.contradiction_type] ?? 0) + 1;
        return acc;
      }, {})
    : {};

  return (
    <div
      style={{
        padding: "32px 24px",
        maxWidth: 960,
        margin: "0 auto",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        color: "#1e293b",
      }}
    >
      {/* Title */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700 }}>
          ⚖️ Deposition Contradiction Detector
        </h1>
        <p style={{ margin: "6px 0 0", color: "#64748b", fontSize: 14 }}>
          Candidate pairs extracted by LLM · Classification &amp; confidence scored deterministically
        </p>
      </div>

      {/* Transcript panels */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
          marginBottom: 24,
        }}
      >
        {[
          { label: "Transcript — March 2023", text: TRANSCRIPT_MARCH, color: "#1e3a5f" },
          { label: "Transcript — September 2023", text: TRANSCRIPT_SEPTEMBER, color: "#7c3aed" },
        ].map(({ label, text, color }) => (
          <div key={label}>
            <h3 style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 700, color }}>
              {label}
            </h3>
            <pre
              style={{
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                padding: 12,
                fontSize: 11.5,
                lineHeight: 1.6,
                whiteSpace: "pre-wrap",
                borderRadius: 6,
                margin: 0,
                maxHeight: 340,
                overflowY: "auto",
                color: "#334155",
              }}
            >
              {text}
            </pre>
          </div>
        ))}
      </div>

      {/* Analyze button */}
      <button
        onClick={analyze}
        disabled={loading}
        style={{
          padding: "11px 32px",
          fontSize: 15,
          fontWeight: 600,
          background: loading ? "#94a3b8" : "#1a1a2e",
          color: "white",
          border: "none",
          borderRadius: 6,
          cursor: loading ? "not-allowed" : "pointer",
          transition: "background 0.15s",
        }}
      >
        {loading ? "Analyzing…" : "Find Contradictions"}
      </button>

      {/* Error */}
      {error && (
        <p
          style={{
            marginTop: 16,
            color: "#b91c1c",
            background: "#fef2f2",
            border: "1px solid #fca5a5",
            borderRadius: 6,
            padding: "10px 14px",
            fontSize: 13,
          }}
        >
          {error}
        </p>
      )}

      {/* Results */}
      {results && (
        <div style={{ marginTop: 28 }}>
          {/* Summary bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 16,
              flexWrap: "wrap",
            }}
          >
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
              {results.length} Candidate{results.length !== 1 ? "s" : ""} Found
            </h2>
            {Object.entries(typeCounts).map(([type, count]) => {
              const ts = TYPE_STYLES[type] ?? TYPE_STYLES.false_positive;
              return (
                <Chip key={type} bg={ts.chipBg} color={ts.chipColor}>
                  {count} {ts.label}
                </Chip>
              );
            })}
          </div>

          {results.map((r, i) => (
            <ContradictionCard key={i} result={r} />
          ))}
        </div>
      )}
    </div>
  );
}
