(function () {
  const GITHUB_BLOB =
    "https://github.com/Ricolax310/GetKinetik/blob/main/";
  const updatedEl = document.getElementById("bureau-live-updated");
  const grid = document.getElementById("bureau-live-grid");
  if (!updatedEl || !grid) return;
  fetch("data/bureau-audit-index.json")
    .then((r) => (r.ok ? r.json() : null))
    .then((data) => {
      if (!data?.networks?.length) {
        updatedEl.textContent =
          "Live stats unavailable — see full reports below.";
        return;
      }
      updatedEl.textContent =
        "Updated " +
        new Date(data.updatedAt).toLocaleString() +
        " · reproducible public endpoints only";
      grid.innerHTML = data.networks
        .filter((n) => n.stats || n.topFinding)
        .map((n) => {
          const when = n.generatedAt
            ? new Date(n.generatedAt).toLocaleDateString()
            : "—";
          const hook =
            n.topFinding ||
            (n.stats?.exactDupGroups != null
              ? n.stats.exactDupGroups + " exact dup groups"
              : n.stats?.overCapacityCells != null
                ? n.stats.overCapacityCells + " over-capacity cells"
                : n.stats?.top20ShareOfSupply != null
                  ? (n.stats.top20ShareOfSupply * 100).toFixed(1) +
                    "% top-20 HONEY"
                  : "see report");
          const reportHref = n.report
            ? GITHUB_BLOB + n.report.replace(/\\/g, "/")
            : "#";
          return (
            '<a href="' +
            reportHref +
            '" target="_blank" rel="noopener" style="text-decoration:none;color:inherit;display:block;padding:0.85rem 1rem;background:rgba(0,0,0,0.35);border:1px solid rgba(255,255,255,0.08);border-radius:8px;">' +
            '<div style="font-family:var(--font-mono);font-size:0.7rem;color:var(--sapphire);margin-bottom:0.35rem;">' +
            n.name +
            "</div>" +
            '<div style="font-size:0.8rem;color:#c8cdd9;line-height:1.45;">' +
            hook +
            "</div>" +
            '<div style="font-size:0.68rem;color:#6b7280;margin-top:0.4rem;">Scan ' +
            when +
            ' · full report on GitHub ↗</div></a>'
          );
        })
        .join("");
    })
    .catch(() => {
      updatedEl.textContent =
        "Live index unavailable offline — see markdown reports below.";
    });
})();
