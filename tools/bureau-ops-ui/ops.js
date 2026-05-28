(function () {
  "use strict";

  const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  let pack = null;
  let viewYear = 0;
  let viewMonth = 0;
  let selectedDate = null;
  let chatMessages = [];

  const el = {
    loading: document.getElementById("ops-loading"),
    calTitle: document.getElementById("cal-title"),
    calGrid: document.getElementById("cal-grid"),
    schedule: document.getElementById("schedule-list"),
    dayTitle: document.getElementById("day-title"),
    dayMeta: document.getElementById("day-meta"),
    dayTasks: document.getElementById("day-tasks"),
    dayWait: document.getElementById("day-wait"),
    dayBody: document.getElementById("day-body"),
    chatLog: document.getElementById("chat-log"),
    chatInput: document.getElementById("chat-input"),
    chatSend: document.getElementById("chat-send"),
    chatError: document.getElementById("chat-error"),
    prevMonth: document.getElementById("cal-prev"),
    nextMonth: document.getElementById("cal-next"),
    todayBtn: document.getElementById("cal-today"),
  };

  function isoToday() {
    return new Date().toISOString().slice(0, 10);
  }

  function parseIso(d) {
    const [y, m, day] = d.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, day));
  }

  function formatIso(date) {
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, "0");
    const d = String(date.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function monthLabel(y, m) {
    return new Date(Date.UTC(y, m, 1)).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderMarkdown(md) {
    if (!md) return "<p class=\"loading\">No briefing saved for this day yet.</p>";
    const lines = md.split("\n");
    let html = "";
    let inList = false;
    for (const raw of lines) {
      const line = raw.trimEnd();
      if (line.startsWith("## ")) {
        if (inList) {
          html += "</ul>";
          inList = false;
        }
        html += `<h2>${escapeHtml(line.slice(3))}</h2>`;
      } else if (line.startsWith("- ")) {
        if (!inList) {
          html += "<ul>";
          inList = true;
        }
        let item = escapeHtml(line.slice(2));
        item = item.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
        item = item.replace(/`([^`]+)`/g, "<code>$1</code>");
        html += `<li>${item}</li>`;
      } else if (line === "---") {
        if (inList) {
          html += "</ul>";
          inList = false;
        }
      } else if (line.startsWith("> ")) {
        if (inList) {
          html += "</ul>";
          inList = false;
        }
        html += `<p><em>${escapeHtml(line.slice(2))}</em></p>`;
      } else if (line.length && !line.startsWith("|")) {
        if (inList) {
          html += "</ul>";
          inList = false;
        }
        let p = escapeHtml(line);
        p = p.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
        html += `<p>${p}</p>`;
      }
    }
    if (inList) html += "</ul>";
    return html;
  }

  function renderSchedule() {
    if (!pack?.schedule) return;
    el.schedule.innerHTML = pack.schedule
      .map((s) => {
        const days =
          s.daysOfWeek.length === 7
            ? "Every day"
            : "Mondays";
        const t = `${String(s.utcHour).padStart(2, "0")}:${String(s.utcMinute).padStart(2, "0")} UTC`;
        return `<li><strong>${escapeHtml(s.label)}</strong>${days} · ${t}<br>${escapeHtml(s.note)}</li>`;
      })
      .join("");
  }

  function dayDots(day) {
    if (!day) return "";
    const dots = [];
    if (day.hasBrief) dots.push('<span class="dot brief" title="Brief"></span>');
    if (day.hasNews) dots.push('<span class="dot news" title="News"></span>');
    if (day.hasScan) dots.push('<span class="dot scan" title="Scan"></span>');
    return `<span class="cal-dots">${dots.join("")}</span>`;
  }

  function renderCalendar() {
    el.calTitle.textContent = monthLabel(viewYear, viewMonth);
    el.calGrid.innerHTML = DOW.map((d) => `<div class="cal-dow">${d}</div>`).join("");

    const first = new Date(Date.UTC(viewYear, viewMonth, 1));
    const startPad = first.getUTCDay();
    const daysInMonth = new Date(Date.UTC(viewYear, viewMonth + 1, 0)).getUTCDate();
    const today = pack.today || isoToday();

    const totalCells = Math.ceil((startPad + daysInMonth) / 7) * 7;
    for (let i = 0; i < totalCells; i++) {
      const dayNum = i - startPad + 1;
      let cellDate;
      let outside = false;
      if (dayNum < 1) {
        const prev = new Date(Date.UTC(viewYear, viewMonth, 0));
        cellDate = new Date(
          Date.UTC(viewYear, viewMonth - 1, prev.getUTCDate() + dayNum),
        );
        outside = true;
      } else if (dayNum > daysInMonth) {
        cellDate = new Date(Date.UTC(viewYear, viewMonth + 1, dayNum - daysInMonth));
        outside = true;
      } else {
        cellDate = new Date(Date.UTC(viewYear, viewMonth, dayNum));
      }
      const iso = formatIso(cellDate);
      const day = pack.days?.[iso];
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "cal-cell";
      if (outside) btn.classList.add("outside");
      if (iso === today) btn.classList.add("today");
      if (iso === selectedDate) btn.classList.add("selected");
      btn.dataset.date = iso;
      btn.innerHTML = `${cellDate.getUTCDate()}${dayDots(day)}`;
      btn.addEventListener("click", () => selectDay(iso));
      el.calGrid.appendChild(btn);
    }
  }

  function selectDay(iso) {
    selectedDate = iso;
    renderCalendar();
    const isToday = iso === (pack.today || isoToday());
    const day = pack.days?.[iso];
    const td = isToday ? pack.todayData : null;

    el.dayTitle.textContent = isToday
      ? `Today — ${iso}`
      : iso;

    const flags = [];
    if (day?.hasBrief || isToday) flags.push("brief");
    if (day?.hasNews) flags.push("news");
    if (day?.hasScan) flags.push("weekly scan");
    el.dayMeta.textContent = flags.length
      ? flags.join(" · ")
      : "No automated artifacts this day";

    const tasks = isToday && td?.doToday?.length ? td.doToday : [];
    if (tasks.length) {
      el.dayTasks.innerHTML = `<h3 style="font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:var(--steel);margin-bottom:8px">Do today</h3><ul class="task-list">${tasks
        .map((t) => `<li>${escapeHtml(t)}</li>`)
        .join("")}</ul>`;
      el.dayTasks.hidden = false;
    } else if (day?.taskCount) {
      el.dayTasks.innerHTML = `<p class="loading">${day.taskCount} tasks in archived brief — open markdown in repo.</p>`;
      el.dayTasks.hidden = false;
    } else {
      el.dayTasks.innerHTML = "";
      el.dayTasks.hidden = true;
    }

    const waits = isToday && td?.doNot?.length ? td.doNot : [];
    if (waits.length) {
      el.dayWait.innerHTML = `<h3>Do not do</h3><ul>${waits
        .map(
          (w) =>
            `<li><strong>${escapeHtml(w.who)}</strong> — ${escapeHtml(w.rule)}</li>`,
        )
        .join("")}</ul>`;
      el.dayWait.hidden = false;
    } else {
      el.dayWait.hidden = true;
    }

    let md = "";
    if (isToday && td?.markdown) md = td.markdown;
    else if (day?.briefMarkdown) md = day.briefMarkdown;
    else if (day?.newsMarkdown) md = day.newsMarkdown;
    el.dayBody.innerHTML = `<div class="md-body">${renderMarkdown(md)}</div>`;
  }

  function renderChat() {
    if (!chatMessages.length) {
      el.chatLog.innerHTML =
        '<p class="loading">Ask what to do today, who not to ping, or how automation fits together.</p>';
      return;
    }
    el.chatLog.innerHTML = chatMessages
      .map(
        (m) =>
          `<div class="msg ${m.role}"><div class="role">${m.role}</div>${escapeHtml(m.content).replace(/\n/g, "<br>")}</div>`,
      )
      .join("");
    el.chatLog.scrollTop = el.chatLog.scrollHeight;
  }

  async function sendChat() {
    el.chatError.textContent = "";
    const text = el.chatInput.value.trim();
    if (!text) return;

    chatMessages.push({ role: "user", content: text });
    el.chatInput.value = "";
    renderChat();
    el.chatSend.disabled = true;

    try {
      const res = await fetch("/api/ops-chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: chatMessages }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      chatMessages.push({ role: "assistant", content: data.reply });
      renderChat();
    } catch (e) {
      el.chatError.textContent = e.message || String(e);
      chatMessages.pop();
      renderChat();
    } finally {
      el.chatSend.disabled = false;
    }
  }

  function bindNav() {
    el.prevMonth.addEventListener("click", () => {
      viewMonth -= 1;
      if (viewMonth < 0) {
        viewMonth = 11;
        viewYear -= 1;
      }
      renderCalendar();
    });
    el.nextMonth.addEventListener("click", () => {
      viewMonth += 1;
      if (viewMonth > 11) {
        viewMonth = 0;
        viewYear += 1;
      }
      renderCalendar();
    });
    el.todayBtn.addEventListener("click", () => {
      const t = pack.today || isoToday();
      const d = parseIso(t);
      viewYear = d.getUTCFullYear();
      viewMonth = d.getUTCMonth();
      selectDay(t);
    });
    el.chatSend.addEventListener("click", sendChat);
    el.chatInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendChat();
      }
    });
  }

  async function init() {
    try {
      const res = await fetch("/data/bureau-ops.json", { cache: "no-store" });
      if (!res.ok) throw new Error(`Could not load calendar data (${res.status})`);
      pack = await res.json();
      el.loading.hidden = true;

      const t = pack.today || isoToday();
      const d = parseIso(t);
      viewYear = d.getUTCFullYear();
      viewMonth = d.getUTCMonth();
      selectedDate = t;

      renderSchedule();
      renderCalendar();
      selectDay(t);
      renderChat();
      bindNav();
    } catch (e) {
      el.loading.textContent = `Failed to load: ${e.message}. Run: npm run bureau:brief && npm run bureau:ops`;
    }
  }

  init();
})();
