/* ============================================================
   GETKINETIK Bureau — public status page client.
   Probes every public endpoint from the browser and renders a
   live dashboard. Refreshes every REFRESH_MS milliseconds.
   ============================================================ */

(function () {
  // Endpoint manifest — each entry probes a real public endpoint and
  // declares which HTTP statuses are healthy. Latency is wall-clock
  // from this browser, not server-measured.
  var ENDPOINTS = [
    {
      label: "GET /api/health",
      url: "/api/health",
      method: "GET",
      okStatuses: [200],
      parseHealth: true,
    },
    {
      label: "GET /api/verify-device (discovery)",
      url: "/api/verify-device",
      method: "GET",
      okStatuses: [200],
    },
    {
      label: "GET /api/score/KINETIK-NODE-DEADBEEF",
      url: "/api/score/KINETIK-NODE-DEADBEEF",
      method: "GET",
      okStatuses: [404], // intentional: should miss
    },
    {
      label: "GET /api/attest (discovery)",
      url: "/api/attest",
      method: "GET",
      okStatuses: [200, 405], // GET discovery 200; older deploys 405
    },
    {
      label: "GET /api/bureau/stats",
      url: "/api/bureau/stats",
      method: "GET",
      okStatuses: [200],
    },
  ];

  var REFRESH_MS = 15000;

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === "dataset") {
          Object.keys(attrs.dataset).forEach(function (d) {
            node.dataset[d] = attrs.dataset[d];
          });
        } else if (k === "className") {
          node.className = attrs[k];
        } else {
          node.setAttribute(k, attrs[k]);
        }
      });
    }
    (children || []).forEach(function (c) {
      if (typeof c === "string") node.appendChild(document.createTextNode(c));
      else if (c) node.appendChild(c);
    });
    return node;
  }

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
    if (diff < 0) return "—";
    if (diff < 60000) return "< 1m ago";
    if (diff < 3600000) return Math.floor(diff / 60000) + "m ago";
    if (diff < 86400000) return Math.floor(diff / 3600000) + "h ago";
    return Math.floor(diff / 86400000) + "d ago";
  }

  function probe(endpoint) {
    var started = performance.now();
    return fetch(endpoint.url, {
      method: endpoint.method,
      cache: "no-store",
      credentials: "omit",
    })
      .then(function (res) {
        var ms = Math.round(performance.now() - started);
        var ok = endpoint.okStatuses.indexOf(res.status) >= 0;
        if (endpoint.parseHealth) {
          return res
            .json()
            .then(function (data) {
              return {
                ok: ok && data && data.ok === true,
                status: res.status,
                ms: ms,
                degraded: ok && data && data.ok === false,
                payload: data,
              };
            })
            .catch(function () {
              return { ok: ok, status: res.status, ms: ms };
            });
        }
        return { ok: ok, status: res.status, ms: ms };
      })
      .catch(function () {
        return { ok: false, status: 0, ms: Math.round(performance.now() - started) };
      });
  }

  function renderRows(results) {
    var host = document.getElementById("endpoints");
    host.innerHTML = "";
    results.forEach(function (r, i) {
      var endpoint = ENDPOINTS[i];
      var state = r.ok ? "ok" : r.degraded ? "degraded" : "down";
      var row = el("div", { className: "row", dataset: { state: state } }, [
        el("span", { className: "dot" }),
        el("span", { className: "path" }, [endpoint.label]),
        el("span", { className: "latency" }, [r.ms + " ms"]),
        el("span", { className: "meta" }, [String(r.status)]),
      ]);
      host.appendChild(row);
    });
  }

  function renderOverall(results) {
    var allOk = results.every(function (r) { return r.ok; });
    var anyDown = results.some(function (r) { return !r.ok && !r.degraded; });
    var state = allOk ? "ok" : anyDown ? "down" : "degraded";

    var overall = document.getElementById("overall");
    overall.dataset.state = state;

    var title = document.getElementById("overall-title");
    var sub = document.getElementById("overall-sub");

    if (state === "ok") {
      title.textContent = "All systems operational.";
      sub.textContent = "Every public bureau endpoint responded as expected.";
    } else if (state === "degraded") {
      title.textContent = "Degraded performance.";
      sub.textContent = "At least one endpoint is reachable but reporting degraded health.";
    } else {
      title.textContent = "Service disruption.";
      sub.textContent = "At least one endpoint failed to respond from your browser.";
    }
  }

  function renderTelemetry(statsResult) {
    var payload = statsResult && statsResult.payload;
    if (!payload || !payload.ok) return;
    var s = payload.stats || {};
    function set(a, v) {
      var n = document.querySelector('[data-stat="' + a + '"]');
      if (n) n.textContent = v;
    }
    set("total", fmtN(s.total));
    set("valid", fmtN(s.valid));
    set("tampered", fmtN(s.tampered));
    set("last", fmtAgo(s.lastVerifyAt));
  }

  function probeStatsInline() {
    return fetch("/api/bureau/stats", { cache: "no-store" })
      .then(function (r) { return r.json(); })
      .then(function (payload) { return { payload: payload }; })
      .catch(function () { return null; });
  }

  function refresh() {
    Promise.all(ENDPOINTS.map(probe))
      .then(function (results) {
        renderRows(results);
        renderOverall(results);
        return probeStatsInline();
      })
      .then(function (s) {
        if (s) renderTelemetry(s);
      });
  }

  refresh();
  setInterval(refresh, REFRESH_MS);
})();
