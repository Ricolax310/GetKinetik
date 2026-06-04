// Background jobs for local command-center agent.
// Jobs refresh local intelligence and generate the morning brief daily.

function msUntilNextLocalHour(hour = 7, minute = 0) {
  const now = new Date();
  const next = new Date(now);
  next.setHours(hour, minute, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  return next.getTime() - now.getTime();
}

function toDateStringLocal(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function startAgentJobs({
  store,
  buildCommandCenter,
  logger = console,
  morningHour = Number(process.env.COMMAND_CENTER_MORNING_HOUR || 7),
  socialRefreshMinutes = Number(
    process.env.COMMAND_CENTER_SOCIAL_REFRESH_MINUTES || 60,
  ),
}) {
  let lock = false;
  const timers = [];

  async function run(kind, opts = {}) {
    if (lock) return;
    lock = true;
    try {
      store?.logRun(kind, "start", null);
      await buildCommandCenter(opts);
      store?.logRun(kind, "ok", null);
    } catch (e) {
      const note = String(e?.message || e).slice(0, 240);
      store?.logRun(kind, "error", note);
      logger.error(`[command-center:${kind}] ${note}`);
    } finally {
      lock = false;
    }
  }

  async function ensureDailyMorningBrief() {
    const today = toDateStringLocal();
    const latest = store?.latestMorningBrief();
    if (!latest || latest.briefDate !== today) {
      await run("morning-brief", {
        fetchRss: process.env.COMMAND_CENTER_FETCH_RSS_AUTO === "1",
        refreshGh: false,
      });
    }
  }

  // Immediate boot check.
  ensureDailyMorningBrief();

  // Daily morning run.
  const firstDelay = msUntilNextLocalHour(morningHour, 0);
  const dailyTimer = setTimeout(() => {
    run("morning-brief", {
      fetchRss: process.env.COMMAND_CENTER_FETCH_RSS_AUTO === "1",
      refreshGh: false,
    });
    const repeat = setInterval(() => {
      run("morning-brief", {
        fetchRss: process.env.COMMAND_CENTER_FETCH_RSS_AUTO === "1",
        refreshGh: false,
      });
    }, 24 * 60 * 60 * 1000);
    timers.push(repeat);
  }, firstDelay);
  timers.push(dailyTimer);

  // Social intel/background cache refresh.
  const socialTimer = setInterval(() => {
    run("social-refresh", {
      fetchRss: process.env.COMMAND_CENTER_FETCH_RSS_AUTO !== "0",
      refreshGh: false,
    });
  }, Math.max(10, socialRefreshMinutes) * 60 * 1000);
  timers.push(socialTimer);

  return () => {
    for (const t of timers) clearTimeout(t);
  };
}
