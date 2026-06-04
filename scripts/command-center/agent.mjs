// AI Operations Agent: summarize, prioritize, reduce overload.
// This agent does not perform outbound actions. Recommendations only.

const DEFAULT_MODEL = process.env.COMMAND_CENTER_AGENT_MODEL || "gpt-5";

export const AGENT_SAFETY_RULES = [
  "Never send messages automatically.",
  "Never post automatically.",
  "Never email automatically.",
  "Never commit code automatically.",
  "Human approval required for every outbound action.",
];

function stripFences(text) {
  return String(text || "")
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
}

function safeJsonParse(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    const m = String(raw).match(/\{[\s\S]*\}/);
    if (!m) return null;
    try {
      return JSON.parse(m[0]);
    } catch {
      return null;
    }
  }
}

function defaultExecutiveBrief(input) {
  const topPriorities = (input.todaysFocus || []).slice(0, 3).map((t) => t.title);
  const biggestRisk =
    input.risks?.find((r) => r.level === "warn")?.detail ||
    input.risks?.[0]?.detail ||
    "No critical risks detected. Keep focus on pilot conversations.";
  const biggestOpportunity =
    input.opportunityRadar?.[0]?.title ||
    input.topOpportunities?.[0]?.why ||
    "Warm pilot pipeline is active.";
  const recommendedNextAction = input.recommendedNextAction?.action || topPriorities[0] || "Review pilot pipeline and respond to warm threads.";
  const overview = input.everythingDigest?.overview;

  return {
    mode: "heuristic",
    summary:
      overview ||
      "Pilot-first operating brief generated from local data. Engineering remains secondary unless blocking outreach.",
    topPriorities,
    biggestRisk,
    biggestOpportunity,
    recommendedNextAction,
    now: topPriorities.slice(0, 1),
    next: topPriorities.slice(1, 3),
    later: [
      "Review lower-priority engineering signals only after outreach.",
      "Update CRM touch dates after each conversation.",
    ],
  };
}

function buildPrompt(input) {
  const mention = input.socialAgent?.mentionCounts || {};
  const mentionSummary = [
    `WeatherXM mentions: ${mention.weatherxm || 0}`,
    `GEODNET mentions: ${mention.geodnet || 0}`,
    `Hivemapper mentions: ${mention.hivemapper || 0}`,
    `DePIN mentions: ${mention.depin || 0}`,
  ].join("\n");

  return `You are GetKinetik's local AI Operations Agent.
Goal: reduce overload. Never make autonomous decisions.
Use neutral language (evidence not verdicts). Pilot acquisition outranks engineering work.

Return valid JSON only with keys:
{
  "summary": string,
  "topPriorities": [string, string, string],
  "biggestRisk": string,
  "biggestOpportunity": string,
  "recommendedNextAction": string,
  "now": [string],
  "next": [string, string],
  "later": [string, string]
}

Context:
- Today's mission: ${JSON.stringify(input.todaysFocus || [])}
- Recommended next action: ${JSON.stringify(input.recommendedNextAction || {})}
- Risks: ${JSON.stringify(input.risks || [])}
- Opportunity radar: ${JSON.stringify((input.opportunityRadar || []).slice(0, 5))}
- Pilot pipeline (top): ${JSON.stringify((input.pilotPipelineDetailed || []).slice(0, 6))}
- Project health: ${JSON.stringify(input.projectHealthAgent || {})}
- Social high-signal (top): ${JSON.stringify((input.socialAgent?.highSignalItems || []).slice(0, 6))}
- Mention summary:
${mentionSummary}

Rules:
- Max 3 priorities.
- Use explicit outreach/pilot actions where possible.
- Do not suggest posting/sending automatically.
- If outreach is overloaded by engineering, call it out briefly.`;
}

async function requestOpenAiBrief(prompt) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey?.trim()) return null;

  const payload = {
    model: DEFAULT_MODEL,
    messages: [
      {
        role: "system",
        content:
          "You are a concise operations summarizer. Return strict JSON only.",
      },
      { role: "user", content: prompt },
    ],
    max_completion_tokens: 1000,
    reasoning_effort: "minimal",
  };

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const raw = await res.text();
  if (!res.ok) {
    throw new Error(`OpenAI HTTP ${res.status}: ${raw.slice(0, 300)}`);
  }
  const data = JSON.parse(raw);
  const text = data.choices?.[0]?.message?.content || "";
  const json = safeJsonParse(stripFences(text));
  if (!json) throw new Error("Agent response was not valid JSON.");
  return { ...json, model: data.model || DEFAULT_MODEL, mode: "llm" };
}

function normalizeBrief(brief) {
  return {
    mode: brief.mode || "heuristic",
    model: brief.model || null,
    summary: String(brief.summary || ""),
    topPriorities: Array.isArray(brief.topPriorities)
      ? brief.topPriorities.slice(0, 3).map((x) => String(x))
      : [],
    biggestRisk: String(brief.biggestRisk || ""),
    biggestOpportunity: String(brief.biggestOpportunity || ""),
    recommendedNextAction: String(brief.recommendedNextAction || ""),
    now: Array.isArray(brief.now) ? brief.now.slice(0, 1).map(String) : [],
    next: Array.isArray(brief.next) ? brief.next.slice(0, 2).map(String) : [],
    later: Array.isArray(brief.later) ? brief.later.slice(0, 2).map(String) : [],
  };
}

export async function runOperationsAgent(input) {
  const fallback = defaultExecutiveBrief(input);
  if (process.env.COMMAND_CENTER_DISABLE_LLM === "1") {
    return normalizeBrief(fallback);
  }

  try {
    const prompt = buildPrompt(input);
    const llm = await requestOpenAiBrief(prompt);
    if (llm) return normalizeBrief(llm);
    return normalizeBrief(fallback);
  } catch {
    return normalizeBrief(fallback);
  }
}
