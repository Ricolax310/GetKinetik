(function () {
  "use strict";

  const meta = document.getElementById("context-meta");
  const log = document.getElementById("chat-log");
  const input = document.getElementById("chat-input");
  const send = document.getElementById("chat-send");
  const err = document.getElementById("chat-error");
  const messages = [];

  const starters = [
    "What does a neutral DePIN bureau do?",
    "How do you check registry hygiene without accusing fraud?",
    "What's in the news for DePIN trust this week?",
    "Why can't networks grade themselves?",
  ];

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\n/g, "<br>");
  }

  function render() {
    if (!messages.length) {
      log.innerHTML =
        '<p class="msg assistant"><span class="who">Bureau</span><p>Ask about DePIN trust, public sample reads, signed device evidence, or why a second opinion matters. Not financial advice.</p></p>';
      return;
    }
    log.innerHTML = messages
      .map(
        (m) =>
          `<div class="msg ${m.role}"><span class="who">${m.role === "user" ? "You" : "Bureau"}</span><p>${escapeHtml(m.content)}</p></div>`,
      )
      .join("");
    log.scrollTop = log.scrollHeight;
  }

  async function submit(text) {
    const t = text.trim();
    if (!t) return;
    err.textContent = "";
    messages.push({ role: "user", content: t });
    input.value = "";
    render();
    send.disabled = true;

    try {
      const res = await fetch("/api/bureau/depin-chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      messages.push({ role: "assistant", content: data.reply });
      render();
    } catch (e) {
      err.textContent = e.message || "Something went wrong.";
      messages.pop();
      render();
    } finally {
      send.disabled = false;
      input.focus();
    }
  }

  document.getElementById("starters").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-q]");
    if (btn) submit(btn.getAttribute("data-q"));
  });

  send.addEventListener("click", () => submit(input.value));
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit(input.value);
    }
  });

  const starterEl = document.getElementById("starters");
  starterEl.innerHTML = starters
    .map((q) => `<button type="button" data-q="${q.replace(/"/g, "&quot;")}">${q}</button>`)
    .join("");

  async function loadMeta() {
    if (!meta) return;
    try {
      const res = await fetch("/data/depin-chat-context.json", { cache: "no-store" });
      if (!res.ok) return;
      const pack = await res.json();
      const when = pack.generatedAt
        ? new Date(pack.generatedAt).toLocaleString(undefined, {
            dateStyle: "medium",
            timeStyle: "short",
          })
        : pack.updatedAt;
      const n =
        (pack.news?.liveHeadlines?.length || 0) + (pack.news?.headlines?.length || 0);
      meta.textContent = `Knowledge refreshed ${when} · ${pack.networks?.length || 0} network reads · ${n} news headlines in context`;
    } catch {
      meta.textContent = "";
    }
  }

  loadMeta();
  render();
})();
