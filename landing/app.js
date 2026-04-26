/* ============================================================
   GETKINETIK landing — progressive-enhancement layer.

   - Detects the visitor's platform.
   - Android + APK live  -> direct download of the Sovereign Node APK.
   - Everything else     -> opens the waitlist modal.
   - Modal submits to /api/waitlist (Cloudflare Pages Function).
   ============================================================ */

(function () {
  "use strict";

  /* Public APK download URL hosted on GitHub Releases.
     This is a permanent, CDN-backed URL we control: anyone hitting
     it gets the signed Sovereign Node APK directly, no account or
     extra clicks required. SHA256 is recorded in the release notes
     so the binary can be verified against the source.
     iOS and desktop still fall through to the waitlist modal. */
  var ANDROID_APK_URL =
    "https://github.com/Ricolax310/GetKinetik/releases/download/v1.2.0/getkinetik-v1.2.0.apk";

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
