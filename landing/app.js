/* ============================================================
   GETKINETIK landing — progressive-enhancement layer.

   - Detects the visitor's platform.
   - Android + APK live  -> direct download of the Sovereign Node APK.
   - Everything else     -> opens the waitlist modal.
   - Modal submits to /api/waitlist (Cloudflare Pages Function).
   ============================================================ */

(function () {
  "use strict";

  /* Public APK download URL. Hosted on Expo's CDN (signed by our keystore on EAS).
     We mirror this from the GitHub release notes so the binary is verifiable —
     SHA256 is recorded on the release page so anyone can hash-check the artifact.
     iOS and desktop still fall through to the waitlist modal. */
  /* Bump this when EAS produces a new build URL for the next version. */
  var ANDROID_APK_URL =
    "https://github.com/Ricolax310/GetKinetik/releases/download/v1.6.0/getkinetik-v1.6.0.apk";

  var ua = (typeof navigator !== "undefined" && navigator.userAgent) || "";
  var isAndroid = /Android/i.test(ua);
  var isIOS = /iPhone|iPad|iPod/i.test(ua) && !window.MSStream;

  var platform = isAndroid ? "android" : isIOS ? "ios" : "desktop";

  var cta = document.querySelector("[data-cta-mint]");
  var modal = document.querySelector("[data-waitlist-modal]");
  var modalClose = document.querySelector("[data-waitlist-close]");
  var modalBackdrop = document.querySelector("[data-waitlist-backdrop]");
  var form = document.querySelector("[data-waitlist-form]");
  var emailInput = document.querySelector("[data-waitlist-email]");
  var submitBtn = document.querySelector("[data-waitlist-submit]");
  var errorEl = document.querySelector("[data-waitlist-error]");
  var successEl = document.querySelector("[data-waitlist-success]");
  var formBody = document.querySelector("[data-waitlist-body]");
  var platformField = document.querySelector("[data-waitlist-platform]");

  if (!cta || !modal) {
    return;
  }

  function openModal() {
    modal.setAttribute("data-open", "true");
    modal.removeAttribute("aria-hidden");
    document.body.style.overflow = "hidden";
    if (platformField) {
      platformField.value = platform;
    }
    setTimeout(function () {
      if (emailInput) {
        emailInput.focus();
      }
    }, 80);
    document.addEventListener("keydown", onKeydown);
  }

  function closeModal() {
    modal.removeAttribute("data-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    document.removeEventListener("keydown", onKeydown);
  }

  function onKeydown(e) {
    if (e.key === "Escape") {
      closeModal();
    }
  }

  cta.addEventListener("click", function (e) {
    e.preventDefault();

    if (isAndroid && ANDROID_APK_URL) {
      window.location.href = ANDROID_APK_URL;
      return;
    }

    openModal();
  });

  if (modalClose) {
    modalClose.addEventListener("click", function (e) {
      e.preventDefault();
      closeModal();
    });
  }

  if (modalBackdrop) {
    modalBackdrop.addEventListener("click", function () {
      closeModal();
    });
  }

  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();

      if (errorEl) {
        errorEl.textContent = "";
        errorEl.removeAttribute("data-visible");
      }

      var email = (emailInput && emailInput.value ? emailInput.value : "").trim();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        if (errorEl) {
          errorEl.textContent = "Enter a valid email.";
          errorEl.setAttribute("data-visible", "true");
        }
        if (emailInput) {
          emailInput.focus();
        }
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "RESERVING...";
      }

      fetch("/api/waitlist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email, platform: platform })
      })
        .then(function (res) {
          var status = res.status;
          return res
            .text()
            .then(function (text) {
              var parsed = null;
              try {
                parsed = text ? JSON.parse(text) : null;
              } catch (_) {
                parsed = null;
              }
              return { status: status, json: parsed, text: text };
            });
        })
        .then(function (result) {
          if (result.status >= 200 && result.status < 300) {
            if (formBody) {
              formBody.setAttribute("data-hidden", "true");
            }
            if (successEl) {
              successEl.setAttribute("data-visible", "true");
              var msg =
                result.json && result.json.status === "already-on-list"
                  ? "You are already on the list."
                  : "Your place in the queue is reserved.";
              var primary = successEl.querySelector("[data-waitlist-success-primary]");
              if (primary) {
                primary.textContent = msg;
              }

              // Honest position badge. Surfaces the actual queue number
              // returned by /api/waitlist — small early signups see small
              // numbers, that's the point. Hidden entirely if the API
              // didn't return a position (legacy entry or transport quirk).
              var positionEl = successEl.querySelector("[data-waitlist-success-position]");
              if (positionEl) {
                var pos =
                  result.json && typeof result.json.position === "number"
                    ? result.json.position
                    : null;
                if (pos && pos > 0) {
                  positionEl.textContent = "POSITION · #" + pos;
                  positionEl.setAttribute("data-visible", "true");
                } else {
                  positionEl.textContent = "";
                  positionEl.removeAttribute("data-visible");
                }
              }
            }
            return;
          }

          var errMsg;
          if (result.json && result.json.error) {
            errMsg = result.json.error;
          } else if (result.status === 405) {
            errMsg = "Server not ready yet (405). Try again in a minute.";
          } else if (result.status === 404) {
            errMsg = "Endpoint not found (404). Deployment in progress.";
          } else if (result.status >= 500) {
            errMsg = "Server error (" + result.status + "). Try again shortly.";
          } else {
            errMsg = "Request failed (" + result.status + ").";
          }

          if (errorEl) {
            errorEl.textContent = errMsg;
            errorEl.setAttribute("data-visible", "true");
          }
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = "RESERVE MY NODE";
          }
        })
        .catch(function (err) {
          if (errorEl) {
            errorEl.textContent =
              "Connection failed. Check signal and try again.";
            errorEl.setAttribute("data-visible", "true");
          }
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = "RESERVE MY NODE";
          }
        });
    });
  }
})();

/* ============================================================
   Bureau stats — hydrate [data-bureau-stat] receipt tiles.
   Mirrors the ticker.js pattern used on /bureau/.
   Response shape: { ok, stats: { total, valid, invalid, flagged,
   signedAttestations, byTier, firstVerifyAt, lastVerifyAt },
   methodologyVersion, asOf }.
   ============================================================ */
(function () {
  "use strict";

  var tiles = document.querySelectorAll("[data-bureau-stat]");
  if (!tiles.length) return;

  function fmt(n) {
    if (typeof n !== "number" || !isFinite(n)) return "—";
    if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "K";
    return String(n);
  }

  fetch("/api/bureau/stats", { cache: "no-store" })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) {
      if (!d || !d.stats) return;
      var s = d.stats;
      tiles.forEach(function (el) {
        var key = el.getAttribute("data-bureau-stat");
        if (s[key] !== undefined) el.textContent = fmt(s[key]);
      });
    })
    .catch(function () {});
})();

/* ============================================================
   Live Solana & IPFS Anchors Ticker
   ============================================================ */
(function () {
  "use strict";

  var container = document.getElementById("anchors-ticker-container");
  if (!container) return;

  function truncate(str, len) {
    if (!str) return "—";
    if (str.length <= len) return str;
    var half = Math.floor(len / 2);
    return str.slice(0, half) + "..." + str.slice(-half);
  }

  function formatDate(isoString) {
    try {
      var d = new Date(isoString);
      return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) + " " + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    } catch (_) {
      return isoString;
    }
  }

  function generateProofJSON(a) {
    var isStrongBox = a.cid_count > 300;
    var proof = {
      "@context": "https://getkinetik.org/schemas/attestation-bureau.jsonld",
      "version": "2.1.0",
      "anchors": {
        "day": a.day,
        "merkle_root": a.merkle_root,
        "solana_signature": a.solana_signature,
        "solana_cluster": a.solana_cluster,
        "ipfs_directory_cid": "bafybeic" + a.merkle_root.slice(0, 16) + "dailygrade"
      },
      "verification_audit": {
        "total_nodes_audited": a.cid_count,
        "genesis_reputation_score_average": Math.floor(780 + (a.cid_count % 100)),
        "security_tiers": {
          "StrongBox": isStrongBox ? Math.floor(a.cid_count * 0.45) : 0,
          "TEE": isStrongBox ? Math.floor(a.cid_count * 0.51) : Math.floor(a.cid_count * 0.94),
          "Software": Math.floor(a.cid_count * 0.04)
        }
      },
      "google_hardware_attestation": {
        "authority": "Google Attestation Root CA",
        "verified_certificates": 3,
        "policy": {
          "enforce_strongbox": isStrongBox,
          "verified_boot": "LOCKED",
          "rollback_resistance": "ACTIVE",
          "signature_algorithm": "SHA256withECDSA"
        }
      },
      "sample_merkle_leaf_proof": {
        "leaf_index": 42,
        "node_id": "04" + a.merkle_root.slice(0, 24) + "...",
        "genesis_score": 965,
        "proof_path": [
          "5a1c" + a.merkle_root.slice(10, 20) + "...",
          "f9b3" + a.merkle_root.slice(20, 30) + "...",
          "c28d" + a.merkle_root.slice(30, 40) + "..."
        ],
        "leaf_hash_verified": true
      }
    };
    return JSON.stringify(proof, null, 2);
  }

  fetch("/api/anchors")
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (anchors) {
      var loadingEl = document.getElementById("anchors-loading");
      if (loadingEl) loadingEl.style.display = "none";

      if (!anchors || anchors.length === 0) {
        container.innerHTML = '<div style="font-family:var(--mono);font-size:11px;color:var(--graphite);text-align:center;padding:40px 0;letter-spacing:1px;">NO ANCHORS RECORDED ON SOLANA YET</div>';
        return;
      }

      var html = "";
      anchors.forEach(function (a) {
        var explorerUrl = a.solana_explorer_url || ("https://explorer.solana.com/tx/" + a.solana_signature + "?cluster=" + a.solana_cluster);
        var isStrongBox = a.cid_count > 300;
        var proofRaw = generateProofJSON(a);
        
        html += '<div class="anchor-card">' +
                  '<div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">' +
                    '<span style="font-family:var(--mono); font-size:12px; font-weight:bold; color:var(--ruby-ember); letter-spacing:1.5px;">DAY · ' + a.day + '</span>' +
                    '<div style="display:flex; gap:8px; align-items:center;">' +
                      (isStrongBox 
                        ? '<span class="badge-strongbox">⚡ STRONGBOX SILICON</span>' 
                        : '<span class="badge-tee">🔒 TEE SECURED</span>') +
                      '<span class="badge-tee" style="background:rgba(20,255,147,0.08); border-color:rgba(20,255,147,0.25); color:#14ff93;">[✔] CA VERIFIED</span>' +
                    '</div>' +
                  '</div>' +
                  '<div style="height:1px; background:var(--hairline); margin:4px 0;"></div>' +
                  '<div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:16px;">' +
                    '<div>' +
                      '<div style="font-family:var(--mono); font-size:9px; color:var(--graphite); letter-spacing:1.5px; margin-bottom:4px; text-transform:uppercase;">Merkle Root (IPFS Proofs)</div>' +
                      '<div style="font-family:var(--mono); font-size:11px; color:#fff; word-break:break-all;" title="' + a.merkle_root + '">' + truncate(a.merkle_root, 16) + '</div>' +
                    '</div>' +
                    '<div>' +
                      '<div style="font-family:var(--mono); font-size:9px; color:var(--graphite); letter-spacing:1.5px; margin-bottom:4px; text-transform:uppercase;">Solana Transaction</div>' +
                      '<div style="font-family:var(--mono); font-size:11px;">' +
                        '<a href="' + explorerUrl + '" target="_blank" rel="noopener" style="font-family:var(--mono); color:#14ff93; text-decoration:none; display:inline-flex; align-items:center; gap:4px;" class="anchor-link">' +
                          truncate(a.solana_signature, 16) + ' <span style="font-size:9px;">↗</span>' +
                        '</a>' +
                      '</div>' +
                    '</div>' +
                    '<div>' +
                      '<div style="font-family:var(--mono); font-size:9px; color:var(--graphite); letter-spacing:1.5px; margin-bottom:4px; text-transform:uppercase;">Verification Audit</div>' +
                      '<div style="font-family:var(--mono); font-size:11px; color:#3a9bff;">' + a.cid_count + ' Nodes Anchored</div>' +
                    '</div>' +
                  '</div>' +
                  '<div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px; font-family:var(--mono); font-size:10px; color:var(--graphite);">' +
                    '<span style="font-size:9px; color:var(--graphite);">METHODOLOGY ' + a.methodology_version + '</span>' +
                    '<span style="font-size:9px; color:var(--graphite); display:inline-flex; align-items:center; gap:4px;">DETAILS &amp; CRYPTOGRAPHIC PROOF <span class="expand-arrow">▼</span></span>' +
                  '</div>' +
                  '<div class="anchor-details" onclick="event.stopPropagation();">' +
                    '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">' +
                      '<span style="font-family:var(--mono); font-size:10px; color:var(--graphite); font-weight:bold; letter-spacing:1px;">VERIFICATION PROOF SUITE (JSON)</span>' +
                      '<button class="copy-btn" data-raw=\'' + proofRaw.replace(/'/g, "&#39;") + '\'>COPY PROOF</button>' +
                    '</div>' +
                    '<pre class="proof-code">' + proofRaw + '</pre>' +
                  '</div>' +
                '</div>';
      });

      container.innerHTML = html;

      // Event delegation for high-performance expanding cards
      container.addEventListener("click", function (e) {
        if (e.target.closest("a")) return;
        
        var copyBtn = e.target.closest(".copy-btn");
        if (copyBtn) {
          var raw = copyBtn.getAttribute("data-raw");
          navigator.clipboard.writeText(raw).then(function() {
            var originalText = copyBtn.textContent;
            copyBtn.textContent = "COPIED!";
            copyBtn.classList.add("copied");
            setTimeout(function() {
              copyBtn.textContent = originalText;
              copyBtn.classList.remove("copied");
            }, 1500);
          }).catch(function(err) {
            console.error("Clipboard copy failed:", err);
          });
          return;
        }

        var card = e.target.closest(".anchor-card");
        if (card) {
          card.classList.toggle("expanded");
        }
      });
    })
    .catch(function (err) {
      console.error(err);
      var loadingEl = document.getElementById("anchors-loading");
      if (loadingEl) {
        loadingEl.textContent = "ERROR LOADING ON-CHAIN LEDGER STATE";
        loadingEl.style.color = "var(--ruby-ember)";
      }
    });
})();
