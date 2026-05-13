/* ============================================================
   GETKINETIK Bureau — live ticker on /bureau/.
   Pulls /api/bureau/stats every TICKER_REFRESH_MS and hydrates
   the four tiles + version + last-verification timestamp.
   Numbers stay '—' on failure; the dashboard should never lie.
   ============================================================ */

(function () {
  var TICKER_REFRESH_MS = 30000;

  function fmtN(n) {
    if (typeof n !== "number" || !isFinite(n) || n < 0) return "—";
    if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
    if (n >= 10000) return (n / 1000).toFixed(1) + "k";
    return n.toString();
  }

  function fmtAgo(iso) {
    if (!iso) return "—";
    var t;
    try { t = new Date(iso).getTime(); } catch (_) { return "—"; }
    if (!t) return "—";
    var diff = Date.now() - t;
    if (diff < 0 || !isFinite(diff)) return "—";
    if (diff < 60000) return "< 1m ago";
    if (diff < 3600000) return Math.floor(diff / 60000) + "m ago";
    if (diff < 86400000) return Math.floor(diff / 3600000) + "h ago";
    return Math.floor(diff / 86400000) + "d ago";
  }

  function set(attr, val) {
    var el = document.querySelector('[data-stat="' + attr + '"]');
    if (el) el.textContent = val;
  }

  function refresh() {
    fetch("/api/bureau/stats", { cache: "no-store" })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data || !data.ok) return;
        var s = data.stats || {};
        set("total", fmtN(s.total));
        set("valid", fmtN(s.valid));
        set("tampered", fmtN(s.flagged));
        var strong =
          (s.byTier && s.byTier.STRONG ? s.byTier.STRONG : 0) +
          (s.byTier && s.byTier.PREMIER ? s.byTier.PREMIER : 0);
        set("strong", fmtN(strong));
        set("version", data.methodologyVersion || "v1.1");
        set("last", fmtAgo(s.lastVerifyAt));
      })
      .catch(function () { /* keep '—' on failure */ });
  }

  refresh();
  setInterval(refresh, TICKER_REFRESH_MS);
})();
