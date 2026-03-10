/**
 * scorer.js
 *
 * Deterministic contradiction classification and confidence scoring.
 * The LLM is only responsible for extracting candidate pairs.
 * All typing, scoring, and explanation is produced here.
 */

// ─── Signal vocabulary ────────────────────────────────────────────────────────

const ABSOLUTE_TERMS = [
  "never", "always", "alone", "no one", "nobody", "nothing",
  "all evening", "all night", "all day", "never heard", "never been",
  "don't know where", "not once", "had no idea", "never met",
  "i'd never", "i have never",
];

const HEDGE_TERMS = [
  "maybe", "might", "i think", "i believe", "i guess", "i don't remember",
  "i'm not sure", "not sure", "around", "roughly", "approximately",
  "sort of", "kind of", "something like", "i suppose", "possibly",
  "could have", "may have", "not exactly", "i don't recall",
];

// Matches time expressions: "7pm", "10:30", "midnight", "noon", "around 7"
const TIME_RE = /\b(\d{1,2}(?::\d{2})?\s*(?:am|pm)|midnight|noon|morning|evening|night|late|early)\b/i;

// Matches location-adjacent terms
const LOCATION_RE = /\b(street|avenue|warehouse|building|home|house|area|town|neighborhood|place|address|location|nearby|block|district|there|somewhere)\b/i;

// Matches approximate numeric expressions: "around 7", "maybe 10", "roughly 30"
const APPROX_NUM_RE = /\b(around|about|maybe|roughly|approximately)\s+\d+/i;

// ─── Signal detection ─────────────────────────────────────────────────────────

/**
 * Returns a set of boolean signals detected across both excerpts.
 * @param {string} e1 - March excerpt
 * @param {string} e2 - September excerpt
 */
function detectSignals(e1, e2) {
  const lo1 = e1.toLowerCase();
  const lo2 = e2.toLowerCase();
  const both = lo1 + " " + lo2;

  const exclusivity =
    ABSOLUTE_TERMS.some((t) => lo1.includes(t)) ||
    ABSOLUTE_TERMS.some((t) => lo2.includes(t));

  const ambiguity =
    HEDGE_TERMS.some((t) => lo1.includes(t)) ||
    HEDGE_TERMS.some((t) => lo2.includes(t));

  // Approximation only fires when BOTH sides use imprecise numeric language —
  // hedging only a peripheral detail (e.g., *when* someone left, not *whether*
  // they left) should not degrade the score as heavily.
  const approximation = APPROX_NUM_RE.test(e1) && APPROX_NUM_RE.test(e2);

  const temporalConflict = TIME_RE.test(e1) && TIME_RE.test(e2);

  const locationConflict = LOCATION_RE.test(e1) && LOCATION_RE.test(e2);

  // Named entity heuristic: capitalised word(s) in both excerpts
  const ENTITY_RE = /\b[A-Z][a-z]{1,}\b/;
  const entityConflict = ENTITY_RE.test(e1) && ENTITY_RE.test(e2);

  return {
    exclusivity,
    ambiguity,
    approximation,
    temporalConflict,
    locationConflict,
    entityConflict,
  };
}

// ─── Score computation ────────────────────────────────────────────────────────

function computeScore(signals) {
  const BASE = 50;
  let running = BASE;
  const adjustments = []; // structured for the breakdown popover
  const factors = [];     // prose strings for the explanation sentence

  if (signals.exclusivity) {
    running += 28;
    adjustments.push({ label: "Absolute / exclusive language", value: +28 });
    factors.push("contains absolute or exclusive language");
  }
  if (signals.temporalConflict) {
    running += 10;
    adjustments.push({ label: "Temporal conflict", value: +10 });
    factors.push("conflicting time references");
  }
  if (signals.locationConflict) {
    running += 10;
    adjustments.push({ label: "Location conflict", value: +10 });
    factors.push("conflicting location references");
  }
  if (signals.entityConflict) {
    running += 10;
    adjustments.push({ label: "Named entity / person conflict", value: +10 });
    factors.push("named entity or person conflict");
  }
  if (signals.ambiguity) {
    // Smaller penalty when exclusivity already anchors the contradiction
    const penalty = signals.exclusivity ? -8 : -12;
    running += penalty;
    adjustments.push({ label: "Hedged / uncertain language", value: penalty });
    factors.push("hedged or uncertain language present");
  }
  if (signals.approximation && !signals.exclusivity) {
    // Only penalise approximation when there is no clear absolute claim;
    // avoids punishing "home all evening" + "around 7:30" unfairly.
    running -= 10;
    adjustments.push({ label: "Approximate values (both sides)", value: -10 });
    factors.push("approximate values may allow interpretive wiggle room");
  }

  const final = Math.max(5, Math.min(95, running));
  return {
    score: final,
    factors,
    score_breakdown: { base: BASE, adjustments, final },
  };
}

// ─── Classification ───────────────────────────────────────────────────────────

function classifyType(score, signals) {
  if (score >= 68 && signals.exclusivity) return "direct";
  if (score >= 38) return "inferential";
  return "false_positive";
}

function confidenceLabel(score) {
  if (score >= 75) return "HIGH";
  if (score >= 50) return "MEDIUM";
  if (score >= 30) return "LOW";
  return "VERY LOW";
}

function buildExplanation(type, factors) {
  if (factors.length === 0) return "No strong conflict signals detected.";
  const joined = factors.join("; ");
  const prefix =
    type === "direct"
      ? "Classified as a direct contradiction because it"
      : type === "inferential"
      ? "Classified as inferential because both statements are plausible alone, but it"
      : "Likely a false positive — flagged because it";
  return `${prefix} ${joined}.`;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Classifies and scores a single LLM-extracted candidate pair.
 *
 * @param {{ march_excerpt: string, september_excerpt: string, topic: string }} candidate
 * @returns Enriched result object with type, score, label, explanation, signals
 */
export function scoreCandidate(candidate) {
  const { march_excerpt, september_excerpt, topic } = candidate;
  const signals = detectSignals(march_excerpt, september_excerpt);
  const { score, factors, score_breakdown } = computeScore(signals);
  const contradiction_type = classifyType(score, signals);
  const confidence_label = confidenceLabel(score);
  const explanation = buildExplanation(contradiction_type, factors);

  return {
    march_excerpt,
    september_excerpt,
    topic: topic ?? "general",
    contradiction_type,
    confidence_score: score,
    confidence_label,
    explanation,
    signals,
    score_breakdown,
  };
}

/**
 * Scores an array of LLM-extracted candidates.
 * @param {Array} candidates
 */
export function scoreContradictions(candidates) {
  return candidates.map(scoreCandidate);
}
