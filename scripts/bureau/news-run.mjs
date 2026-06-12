// Daily news scan → LLM drafts → optional X auto-post (human review by default).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  REPO_ROOT,
  DAILY_DIR,
  loadRegistry,
  loadEnvQuiet,
  redactSecrets,
} from "./lib.mjs";
import { writeOperatorBrief } from "./operator-brief.mjs";
import { writeOpsPack } from "./ops-pack.mjs";
import { writeDepinChatContext } from "./build-depin-chat-context.mjs";
import {
  loadAllFeedItems,
  scoreItem,
  matchNetwork,
} from "./news-rss.mjs";
import { generateNewsCopy, pickBestCandidate } from "./news-llm.mjs";
import { postTweet, loadXCredentials } from "./social-x.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SOURCES_PATH = path.join(__dirname, "news-sources.json");
const STATE_PATH = path.join(REPO_ROOT, "scripts/data/bureau-news-state.json");

function loadSources() {
  return JSON.parse(fs.readFileSync(SOURCES_PATH, "utf8"));
}

function loadState() {
  if (!fs.existsSync(STATE_PATH)) return { postedUrls: [], runs: [] };
  try {
    return JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
  } catch {
    return { postedUrls: [], runs: [] };
  }
}

function saveState(state) {
  state.postedUrls = (state.postedUrls || []).slice(0, 200);
  state.runs = (state.runs || []).slice(0, 60);
  fs.mkdirSync(path.dirname(STATE_PATH), { recursive: true });
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2), "utf8");
}

function formatDailyMarkdown({ date, items, chosen, llm, posted }) {
  const lines = [
    `# Bureau news — ${date}`,
    "",
    "> **Review before posting.** Auto-post only runs when `BUREAU_AUTO_POST=true` and X API keys are set.",
    "",
    "## Top pick",
    "",
  ];
  if (!chosen) {
    lines.push("_No articles scored high enough today._");
  } else {
    lines.push(`**${chosen.item.title}**`);
    lines.push(`- URL: ${chosen.item.link}`);
    lines.push(`- Score: ${chosen.score}`);
    lines.push(`- Networks: ${chosen.networkIds.join(", ") || "—"}`);
    if (llm) {
      lines.push(`- LLM action: ${llm.action} (confidence ${llm.confidence})`);
      lines.push("");
        if (llm.action === "skip") {
        lines.push(`Skip reason: ${llm.skipReason}`);
        if (llm.rickReply?.trim()) {
          lines.push("");
          lines.push("### @Kinetik_Rick reply (paste on the X thread — no links)");
          lines.push("");
          lines.push("```");
          lines.push(llm.rickReply.trim());
          lines.push("```");
        }
      } else {
        lines.push(`Model: ${llm._model || "—"}`);
        lines.push("");
        lines.push("### LinkedIn comment (paste on article/post)");
        lines.push("");
        lines.push("```");
        lines.push(llm.linkedinComment || "");
        lines.push("```");
        lines.push("");
        if (llm.tweet) {
          lines.push("### Suggested tweet");
          lines.push("");
          lines.push("```");
          lines.push(llm.tweet);
          lines.push("```");
          lines.push("");
        }
        if (llm.rickReply?.trim()) {
          lines.push("### @Kinetik_Rick reply (paste on the X thread — no links)");
          lines.push("");
          lines.push("```");
          lines.push(llm.rickReply.trim());
          lines.push("```");
          lines.push("");
        }
        lines.push(`Internal: ${llm.notes || "—"}`);
      }
    }
    if (posted) {
      lines.push("");
      lines.push(`**Auto-posted to X:** https://x.com/i/web/status/${posted.id}`);
    }
  }
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("## All candidates today");
  lines.push("");
  lines.push("| Score | Title | Source |");
  lines.push("|------:|-------|--------|");
  for (const row of items.slice(0, 25)) {
    const title = row.item.title.replace(/\|/g, "\\|").slice(0, 80);
    lines.push(`| ${row.score} | [${title}](${row.item.link}) | ${row.item.source} |`);
  }
  lines.push("");
  return lines.join("\n");
}

/**
 * @param {{ post?: boolean, maxLlm?: number, minConfidence?: number, model?: string }} opts
 */
export async function runBureauNews(opts = {}) {
  loadEnvQuiet();
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey?.trim()) {
    throw new Error("OPENAI_API_KEY required for bureau news (set in .env or GitHub secret)");
  }

  const model = opts.model || process.env.BUREAU_NEWS_MODEL || process.env.OPENAI_MODEL || "gpt-5";
  const baseUrl = process.env.OPENAI_BASE_URL;
  const minConfidence = Number(
    opts.minConfidence ?? process.env.BUREAU_NEWS_MIN_CONFIDENCE ?? 0.85,
  );
  const maxLlm = Number(opts.maxLlm ?? process.env.BUREAU_NEWS_MAX_LLM ?? 3);
  const autoPost =
    opts.post === true ||
    String(process.env.BUREAU_AUTO_POST || "").toLowerCase() === "true";

  const registry = loadRegistry();
  const sources = loadSources();
  const state = loadState();
  const postedSet = new Set(state.postedUrls || []);

  console.error("[news] fetching feeds…");
  const rawItems = await loadAllFeedItems(sources);
  const scored = rawItems
    .map((item) => {
      const score = scoreItem(item, sources);
      const networkIds = matchNetwork(item, registry);
      return { item, score, networkIds };
    })
    .filter((x) => x.score > 0 && !postedSet.has(x.item.link.split("?")[0]))
    .sort((a, b) => b.score - a.score);

  const date = new Date().toISOString().slice(0, 10);
  let chosen = pickBestCandidate(scored, 30);
  let llm = null;
  let posted = null;

  const toTry = chosen ? [chosen, ...scored.filter((x) => x !== chosen)] : scored;
  for (let i = 0; i < Math.min(maxLlm, toTry.length); i++) {
    const candidate = toTry[i];
    console.error(`[news] LLM ${i + 1}/${Math.min(maxLlm, toTry.length)}: ${candidate.item.title.slice(0, 60)}…`);
    try {
      llm = await generateNewsCopy({
        article: candidate.item,
        networkIds: candidate.networkIds,
        registry,
        model,
        apiKey,
        baseUrl,
      });
      if (llm.action === "comment" && llm.confidence >= minConfidence) {
        chosen = candidate;
        break;
      }
      if (llm.action === "own_post" && llm.confidence >= minConfidence) {
        chosen = candidate;
        break;
      }
      if (llm.action === "skip") {
        console.error(`[news] LLM skip: ${llm.skipReason}`);
      }
    } catch (e) {
      console.error(`[news] LLM error: ${redactSecrets(e.message)}`);
    }
  }

  if (autoPost && llm?.action !== "skip" && llm.confidence >= minConfidence) {
    const text =
      (llm.postTweet || llm.action === "own_post") && llm.tweet?.trim()
        ? llm.tweet.trim()
        : null;
    if (text) {
      if (!loadXCredentials()) {
        console.error("[news] BUREAU_AUTO_POST=true but X credentials missing — draft only");
      } else {
        try {
          posted = await postTweet(text);
          console.error(`[news] posted tweet ${posted.id}`);
          state.postedUrls.unshift(chosen.item.link.split("?")[0]);
        } catch (e) {
          console.error(`[news] X post failed: ${redactSecrets(e.message)}`);
        }
      }
    } else {
      console.error("[news] auto-post skipped — no standalone tweet (comment-only). Paste LinkedIn comment manually.");
    }
  } else if (autoPost) {
    console.error("[news] auto-post skipped — low confidence or LLM skip");
  }

  const md = formatDailyMarkdown({ date, items: scored, chosen, llm, posted });
  fs.mkdirSync(DAILY_DIR, { recursive: true });
  const dated = path.join(DAILY_DIR, `${date}-news.md`);
  const latest = path.join(DAILY_DIR, "latest-news.md");
  fs.writeFileSync(dated, md, "utf8");
  fs.writeFileSync(latest, md, "utf8");

  state.runs.unshift({
    at: new Date().toISOString(),
    chosen: chosen?.item.link,
    llmAction: llm?.action,
    confidence: llm?.confidence,
    postedId: posted?.id,
  });
  saveState(state);

  try {
    const registry = loadRegistry();
    let pipelineResults = null;
    const pipePath = path.join(REPO_ROOT, "scripts/data/bureau-pipeline.json");
    if (fs.existsSync(pipePath)) {
      pipelineResults = JSON.parse(fs.readFileSync(pipePath, "utf8")).networks;
    }
    writeOperatorBrief(registry, pipelineResults);
    writeOpsPack(registry, pipelineResults);
    const depinCtx = await writeDepinChatContext({ fetchNews: true });
    console.error(`[news] refreshed public chat context → ${depinCtx}`);
  } catch (e) {
    console.error(`[news] operator brief refresh failed: ${redactSecrets(e.message)}`);
  }

  console.error(`[news] wrote ${path.relative(REPO_ROOT, latest)}`);
  return { dated, latest, chosen, llm, posted, scoredCount: scored.length };
}
