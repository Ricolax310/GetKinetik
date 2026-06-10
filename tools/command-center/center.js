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

async function refreshBrief() {
  const btn = $("btn-refresh");
  const status = $("load-status");
  const errBox = $("load-error");
  errBox.hidden = true;
  status.hidden = false;
  status.textContent = "Rebuilding brief…";
  btn.disabled = true;
  try {
    const res = await fetch("/api/refresh", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ fetchRss: false }),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || "Refresh failed");
    status.textContent = `Rebuilt ${body.today || ""}`.trim();
    status.hidden = true;
    applyPayload(await loadData());
  } catch (e) {
    errBox.hidden = false;
    errBox.textContent = e.message;
    status.hidden = true;
  } finally {
    btn.disabled = false;
  }
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
boot();
