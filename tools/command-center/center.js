const $ = (id) => document.getElementById(id);

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
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

function postCard({ heading, meta, link, quote, body }) {
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
  if (link) {
    const a = document.createElement("a");
    a.className = "react-link";
    a.href = link;
    a.target = "_blank";
    a.rel = "noopener";
    a.textContent = "→ open on X";
    card.appendChild(a);
  }
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
    const card = postCard({ heading: label, meta: sub, body: text });
    el.appendChild(card);
  };
  if (kit.bio) add("Bio (set once)", kit.bio);
  if (kit.pinnedPost) add("Pinned post (refresh when numbers move)", kit.pinnedPost);
  if (kit.thread?.length) {
    const h = document.createElement("div");
    h.className = "react-head";
    h.style.marginTop = "6px";
    h.textContent = `Data thread — post 1 today (lead: ${kit.leadNetwork || "—"})`;
    el.appendChild(h);
    kit.thread.forEach((t, i) => add(`${i + 1}/${kit.thread.length}`, t));
  }
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
      "Click a link to open the post on X, hit reply, paste. Replying with one sharp insight is the fastest way to gain the right followers.";
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
        }),
      );
    }
  } else {
    tweetsEl.innerHTML = `<p class="muted">${esc(react.liveTweets?.note || "No reply-worthy tweets in this window.")}</p>`;
  }

  if (news.length) {
    for (const r of news) {
      newsEl.appendChild(
        postCard({
          heading: r.headline,
          meta: `${r.source || ""}${r.published ? ` · ${r.published}` : ""}${r.angle ? ` · ${r.angle}` : ""}`,
          link: r.url,
          body: r.tweet,
        }),
      );
    }
  } else {
    newsEl.innerHTML = `<p class="muted">${esc(react.note || "No fresh news takes in this window.")}</p>`;
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

function applyPayload(data) {
  $("headline").textContent = data.today
    ? `${data.weekday || "Today"} · ${data.today}`
    : "Today";
  $("meta-updated").textContent = data.updatedAt
    ? `Updated ${new Date(data.updatedAt).toLocaleString()}`
    : "";

  $("brief-body").innerHTML = renderMarkdownish(data.dailyBrief?.markdown);

  renderList(
    $("live-threads"),
    data.replyBrief?.liveThreads?.threads,
    "No live threads.",
  );
  renderList(
    $("thread-seeds"),
    data.replyBrief?.threadSeeds?.seeds,
    "No thread seeds.",
  );

  renderReactFeed(data.reactFeed);
  renderGrowthKit(data.replyBrief?.growthKit);
  renderReadingFeed($("reading-feed"), data.readingFeed);
  renderPublication($("publication"), data.publication);
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
    applyPayload(await loadData());
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
    let data = await loadData();
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
