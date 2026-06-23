const $ = (id) => document.getElementById(id);

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Completion state, keyed by content hash so ticks persist across days. */
let DONE = {};

/** Stable djb2 hash of content → short hex. Same text ⇒ same key ⇒ stays ticked. */
function hashKey(prefix, text) {
  const s = String(text || "");
  let h = 5381;
  for (let i = 0; i < s.length; i += 1) {
    h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  }
  return `${prefix}:${h.toString(16)}`;
}

async function loadTaskState() {
  try {
    const res = await fetch("/data/task-state.json", { cache: "no-store" });
    if (res.ok) {
      const body = await res.json();
      DONE = body.done || {};
    }
  } catch {
    DONE = {};
  }
}

async function toggleTask(key, label, done) {
  if (done) DONE[key] = { doneAt: new Date().toISOString(), label };
  else delete DONE[key];
  try {
    await fetch("/api/task", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ key, label, done }),
    });
  } catch {
    /* keep optimistic local state; will reconcile on next load */
  }
}

/**
 * Add a "done" checkbox to an action element. When checked, the item dims and
 * is marked complete in the local store so it won't nag again tomorrow (until
 * its content changes, which yields a new key).
 */
function attachCheck(el, key, label) {
  const isDone = Boolean(DONE[key]);
  el.classList.toggle("task-done", isDone);

  const row = document.createElement("label");
  row.className = "task-check";
  const box = document.createElement("input");
  box.type = "checkbox";
  box.checked = isDone;
  const txt = document.createElement("span");
  txt.textContent = isDone ? "Done" : "Mark done";

  box.addEventListener("change", () => {
    const done = box.checked;
    el.classList.toggle("task-done", done);
    txt.textContent = done ? "Done" : "Mark done";
    toggleTask(key, label, done);
  });

  row.appendChild(box);
  row.appendChild(txt);
  el.appendChild(row);
}

function renderMarkdownish(md) {
  return esc(md || "_No briefing yet._").replace(
    /^## (.+)$/gm,
    '<strong style="color:var(--platinum)">$1</strong>',
  );
}

function renderList(el, items, emptyText) {
  el.innerHTML = "";
  if (!items?.length) {
    el.innerHTML = `<li class="muted">${esc(emptyText)}</li>`;
    return;
  }
  for (const item of items) {
    const li = document.createElement("li");
    if (typeof item === "string") {
      li.textContent = item;
    } else {
      const title = item.title || item.network || item.text || "—";
      const meta = [item.status, item.anomalyType].filter(Boolean).join(" · ");
      li.innerHTML = `<div>${esc(title)}</div>${meta ? `<div class="muted">${esc(meta)}</div>` : ""}`;
    }
    el.appendChild(li);
  }
}

function renderSeeds(el, seeds) {
  el.innerHTML = "";
  if (!seeds?.length) {
    el.innerHTML = '<li class="muted">No thread seeds.</li>';
    return;
  }
  for (const s of seeds) {
    const li = document.createElement("li");
    const key = hashKey("seed", `${s.networkId || s.target}:${s.suggestedPost || s.observation || ""}`);
    const meta = [s.observation, s.whyItMatters].filter(Boolean).join(" · ");
    li.innerHTML =
      `<div>${esc(s.target || "—")}</div>` +
      (meta ? `<div class="muted">${esc(meta)}</div>` : "") +
      (s.suggestedPost ? `<div class="seed-post">${esc(s.suggestedPost)}</div>` : "");
    if (s.suggestedPost) li.appendChild(copyButton(s.suggestedPost));
    attachCheck(li, key, s.target || "Thread seed");
    el.appendChild(li);
  }
}

function renderReadingFeed(container, feed) {
  container.innerHTML = "";
  const sections = feed?.sections || [];
  if (!sections.length) {
    container.innerHTML = '<p class="muted">No reading items.</p>';
    return;
  }
  for (const section of sections) {
    const block = document.createElement("div");
    block.className = "feed-section";
    block.innerHTML = `<h3>${esc(section.title || section.id)}</h3>`;
    for (const item of section.items || []) {
      const row = document.createElement("div");
      row.className = "feed-item";
      const link = item.url
        ? `<a href="${esc(item.url)}" target="_blank" rel="noopener">${esc(item.title)}</a>`
        : esc(item.title);
      row.innerHTML = `
        <div class="title">${link}</div>
        <div class="summary">${esc(item.summary || "")}</div>
        <div class="source">${esc(item.source || "")}</div>`;
      block.appendChild(row);
    }
    container.appendChild(block);
  }
}

function copyButton(text) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "copy-btn";
  btn.textContent = "Copy";
  btn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(text);
      btn.textContent = "Copied ✓";
      setTimeout(() => (btn.textContent = "Copy"), 1500);
    } catch {
      btn.textContent = "Copy failed";
    }
  });
  return btn;
}

function postCard({ heading, meta, link, linkLabel, composeUrl, quote, body, taskKey, taskLabel, articleUrl }) {
  const card = document.createElement("div");
  card.className = "react-card";

  if (heading) {
    const h = document.createElement("div");
    h.className = "react-head";
    h.textContent = heading;
    card.appendChild(h);
  }
  if (meta) {
    const m = document.createElement("div");
    m.className = "react-meta";
    m.textContent = meta;
    card.appendChild(m);
  }
  const links = document.createElement("div");
  links.className = "react-links";
  if (link) {
    const a = document.createElement("a");
    a.className = "react-link";
    a.href = link;
    a.target = "_blank";
    a.rel = "noopener";
    a.textContent = linkLabel || "→ open on X";
    links.appendChild(a);
  }
  if (articleUrl && articleUrl !== link) {
    const a = document.createElement("a");
    a.className = "react-link react-link-secondary";
    a.href = articleUrl;
    a.target = "_blank";
    a.rel = "noopener";
    a.textContent = "→ read article";
    links.appendChild(a);
  }
  if (composeUrl) {
    const a = document.createElement("a");
    a.className = "react-link react-link-compose";
    a.href = composeUrl;
    a.target = "_blank";
    a.rel = "noopener";
    a.textContent = "→ post to X";
    links.appendChild(a);
  }
  if (links.childElementCount) card.appendChild(links);
  if (quote) {
    const q = document.createElement("blockquote");
    q.className = "react-quote";
    q.textContent = quote;
    card.appendChild(q);
  }
  if (body) {
    const wrap = document.createElement("div");
    wrap.className = "react-post";
    const p = document.createElement("p");
    p.className = "react-text";
    p.textContent = body;
    wrap.appendChild(p);
    wrap.appendChild(copyButton(body));
    card.appendChild(wrap);
  }
  if (taskKey) attachCheck(card, taskKey, taskLabel || heading || "");
  return card;
}

function renderGrowthKit(kit) {
  const el = $("growth-kit");
  el.innerHTML = "";
  if (!kit) {
    el.innerHTML = '<p class="muted">No growth kit yet.</p>';
    return;
  }
  const add = (label, text, sub) => {
    const card = postCard({
      heading: label,
      meta: sub,
      body: text,
      taskKey: text ? hashKey("growth", text) : null,
      taskLabel: label,
    });
    el.appendChild(card);
  };
  if (kit.bio) add("Bio (set once)", kit.bio);
  if (kit.pinnedPost) add("Pinned post (refresh when numbers move)", kit.pinnedPost);
  // No multi-tweet thread: at low follower counts one strong tweet beats a
  // 5-tweet thread nobody reads past tweet 1. The single Daily Posts above are
  // the post-one-and-move-on content.
}

function renderReactFeed(react) {
  const hint = $("react-hint");
  const tweetsEl = $("react-tweets");
  const newsEl = $("react-news");
  tweetsEl.innerHTML = "";
  newsEl.innerHTML = "";

  if (!react) {
    hint.textContent =
      "No reactive feed yet — click “Pull live (news + tweets)” to fetch the current DePIN conversation.";
    return;
  }

  const tweets = react.liveTweets?.reacts || [];
  const news = react.reacts || [];

  if (!tweets.length && !news.length) {
    hint.textContent =
      react.note ||
      "Nothing live yet — click “Pull live (news + tweets)”. This pulls fresh tweets + news and drafts replies (takes a couple minutes).";
  } else {
    hint.textContent =
      "Live posts: open on X → reply → paste. News: we search X for the story first; reply on that thread, or use Post to X to publish your take with the article link.";
  }

  if (tweets.length) {
    for (const t of tweets) {
      tweetsEl.appendChild(
        postCard({
          heading: `@${t.author || "?"}`,
          meta: `${t.engagement ?? 0} engagements${t.followers ? ` · ${t.followers.toLocaleString()} followers` : ""}${t.angle ? ` · ${t.angle}` : ""}`,
          link: t.url,
          quote: t.text,
          body: t.reply,
          taskKey: t.url ? hashKey("reply", t.url) : hashKey("reply", t.text),
          taskLabel: `Reply to @${t.author || "?"}`,
        }),
      );
      if (t.quoteDraft) {
        tweetsEl.appendChild(
          postCard({
            heading: `@${t.author || "?"} · quote-tweet`,
            meta: "Quote-tweet this with your take (growth lane)",
            link: t.url,
            body: t.quoteDraft,
            taskKey: t.url ? hashKey("quote", t.url) : hashKey("quote", t.text),
            taskLabel: `Quote @${t.author || "?"}`,
          }),
        );
      }
    }
  } else {
    tweetsEl.innerHTML = `<p class="muted">${esc(react.liveTweets?.note || "No reply-worthy tweets in this window.")}</p>`;
  }

  if (news.length) {
    for (const r of news) {
      const onX = r.xThread?.url;
      const isReply = r.mode === "x-reply" && onX;
      newsEl.appendChild(
        postCard({
          heading: r.headline,
          meta: `${r.source || ""}${r.published ? ` · ${r.published}` : ""}${r.angle ? ` · ${r.angle}` : ""}${isReply ? ` · @${r.xThread.author} on X` : r.mode === "x-compose" ? " · post your take" : ""}`,
          link: isReply ? onX : null,
          linkLabel: "→ reply on X",
          articleUrl: r.url,
          composeUrl: r.composeUrl || null,
          quote: isReply ? r.xThread.text : null,
          body: r.reply || r.tweet,
          taskKey: hashKey("news", onX || r.url || r.headline),
          taskLabel: r.headline,
        }),
      );
    }
  } else {
    newsEl.innerHTML = `<p class="muted">${esc(react.note || "No fresh news takes in this window.")}</p>`;
  }
}

function renderDailyPosts(el, daily) {
  el.innerHTML = "";
  const posts = daily?.posts || [];
  if (!posts.length) {
    el.innerHTML = `<p class="muted">${esc(daily?.note || "No posts available.")}</p>`;
    return;
  }
  for (const p of posts) {
    el.appendChild(
      postCard({
        heading: p.goal,
        meta: p.audience ? `Audience: ${p.audience}` : "",
        body: p.text,
        taskKey: hashKey("post", p.text),
        taskLabel: p.goal || "Daily post",
      }),
    );
  }
}

function renderPublication(container, pub) {
  container.innerHTML = "";
  if (!pub) {
    container.innerHTML = '<p class="muted">No reports linked.</p>';
    return;
  }
  const rows = [
    ["Daily signal brief", pub.latest?.daily || pub.daily?.path],
    ["Weekly report", pub.latest?.weekly || pub.weekly?.path],
    ["Monthly state", pub.latest?.monthly || pub.monthly?.path],
  ];
  for (const [label, p] of rows) {
    if (!p) continue;
    const row = document.createElement("div");
    row.className = "feed-item";
    row.innerHTML = `<div class="title">${esc(label)}</div><div class="source">${esc(p)}</div>`;
    container.appendChild(row);
  }
}

function renderFunding(el, funding) {
  if (!el) return;
  el.innerHTML = "";
  const groups = funding?.groups || [];
  if (!groups.length) {
    el.innerHTML = '<p class="muted">No funding list yet.</p>';
    return;
  }
  if (funding.note) {
    const note = document.createElement("p");
    note.className = "react-hint muted";
    note.textContent = funding.note;
    el.appendChild(note);
  }
  if (funding.live?.length) {
    const h = document.createElement("h3");
    h.className = "sub";
    h.textContent = "Live — recent announcements (open now)";
    el.appendChild(h);
    for (const it of funding.live) {
      const card = document.createElement("div");
      card.className = "feed-item";
      const meta = [it.type, it.date, it.source].filter(Boolean).join(" · ");
      const linkHtml = it.url
        ? `<div class="source"><a href="${esc(it.url)}" target="_blank" rel="noopener noreferrer">open →</a></div>`
        : "";
      card.innerHTML =
        `<div class="title">${esc(it.title)}</div>` +
        `<div class="muted">${esc(meta)}</div>` +
        linkHtml;
      el.appendChild(card);
    }
  }
  for (const g of groups) {
    const h = document.createElement("h3");
    h.className = "sub";
    h.textContent = g.label;
    el.appendChild(h);
    for (const it of g.items || []) {
      const card = document.createElement("div");
      card.className = "feed-item";
      const tags = [it.type, it.dilutive ? "dilutive" : "non-dilutive", it.cadence]
        .filter(Boolean)
        .join(" · ");
      const linkHtml = it.url
        ? `<div class="source"><a href="${esc(it.url)}" target="_blank" rel="noopener noreferrer">${esc(it.url)}</a></div>`
        : "";
      card.innerHTML =
        `<div class="title">${esc(it.name)}</div>` +
        `<div class="muted">${esc(tags)}</div>` +
        (it.fit ? `<div>${esc(it.fit)}</div>` : "") +
        linkHtml;
      el.appendChild(card);
    }
  }
}

function applyPayload(data) {
  // Each panel renders independently. One panel throwing must NEVER blank the
  // whole dashboard (that exact failure — a render error wiping every panel — is
  // what this guards against). Errors are logged + surfaced, never swallowed.
  const safe = (label, fn) => {
    try {
      fn();
    } catch (e) {
      console.error(`[command-center] panel render failed: ${label}`, e);
      const box = $("load-error");
      if (box) {
        box.hidden = false;
        box.textContent = `A panel failed to render (${label}) — other panels still work. See console for details.`;
      }
    }
  };

  safe("header", () => {
    $("headline").textContent = data.today
      ? `${data.weekday || "Today"} · ${data.today}`
      : "Today";
    $("meta-updated").textContent = data.updatedAt
      ? `Updated ${new Date(data.updatedAt).toLocaleString()}`
      : "";
    $("brief-export").textContent = data.dailyBrief?.exportPath
      ? `Full markdown export: ${data.dailyBrief.exportPath}`
      : "";
  });

  safe("live-threads", () =>
    renderList($("live-threads"), data.replyBrief?.liveThreads?.threads, "No live threads."),
  );
  safe("thread-seeds", () => renderSeeds($("thread-seeds"), data.replyBrief?.threadSeeds?.seeds));
  safe("react-feed", () => renderReactFeed(data.reactFeed));
  safe("daily-posts", () => renderDailyPosts($("daily-posts"), data.replyBrief?.dailyPosts));
  safe("growth-kit", () => renderGrowthKit(data.replyBrief?.growthKit));
  safe("reading-feed", () => renderReadingFeed($("reading-feed"), data.readingFeed));
  safe("publication", () => renderPublication($("publication"), data.publication));
  safe("funding", () => renderFunding($("funding"), data.funding));
}

async function loadData() {
  const res = await fetch("/data/command-center.json", { cache: "no-store" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Load failed (${res.status})`);
  }
  return res.json();
}

async function rebuild({ fetchRss }) {
  const refreshBtn = $("btn-refresh");
  const liveBtn = $("btn-pull-live");
  const status = $("load-status");
  const errBox = $("load-error");
  errBox.hidden = true;
  status.hidden = false;
  refreshBtn.disabled = true;
  liveBtn.disabled = true;

  let ticker = null;
  if (fetchRss) {
    const started = Date.now();
    status.textContent = "Pulling live news + tweets and drafting takes… (~1–4 min)";
    ticker = setInterval(() => {
      const s = Math.round((Date.now() - started) / 1000);
      status.textContent = `Pulling live news + tweets and drafting takes… ${s}s (~1–4 min)`;
    }, 1000);
  } else {
    status.textContent = "Rebuilding brief…";
  }

  try {
    const res = await fetch("/api/refresh", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ fetchRss }),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || "Refresh failed");
    const [data] = await Promise.all([loadData(), loadTaskState()]);
    applyPayload(data);
    status.hidden = true;
  } catch (e) {
    errBox.hidden = false;
    errBox.textContent = e.message;
    status.hidden = true;
  } finally {
    if (ticker) clearInterval(ticker);
    refreshBtn.disabled = false;
    liveBtn.disabled = false;
  }
}

function refreshBrief() {
  return rebuild({ fetchRss: false });
}

function pullLive() {
  return rebuild({ fetchRss: true });
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

async function boot() {
  const errBox = $("load-error");
  const status = $("load-status");
  status.hidden = false;
  status.textContent = "Loading…";
  try {
    const [data] = await Promise.all([loadData(), loadTaskState()]);
    if (data.today !== todayKey()) {
      status.textContent = "Refreshing today's brief…";
      await refreshBrief();
      return;
    }
    status.hidden = true;
    applyPayload(data);
  } catch (e) {
    status.textContent = "Building brief…";
    try {
      await refreshBrief();
    } catch {
      errBox.hidden = false;
      errBox.textContent = `${e.message} — try Refresh brief.`;
      status.hidden = true;
    }
  }
}

$("btn-refresh").addEventListener("click", refreshBrief);
$("btn-pull-live").addEventListener("click", pullLive);
boot();

