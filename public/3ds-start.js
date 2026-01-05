(function () {
  function run() {
    var statusEl = document.getElementById("status");
    var challengeContainer = document.getElementById("challenge-container");

    function setStatus(message) {
      if (statusEl) {
        statusEl.textContent = message;
      }
    }

    function fail(message) {
      setStatus(message || "Unable to continue the 3DS flow.");
    }

    function normalizeBase64(input) {
      var normalized = String(input || "").replace(/-/g, "+").replace(/_/g, "/");
      var padding = normalized.length % 4;
      if (padding) {
        normalized += new Array(5 - padding).join("=");
      }
      return normalized;
    }

    function decodePayload(raw) {
      var normalized = normalizeBase64(raw);
      var decoded = atob(normalized);
      return JSON.parse(decoded);
    }

    function appendInputs(form, data, fallbackName) {
      if (Array.isArray(data)) {
        data.forEach(function (entry) {
          if (!entry) {
            return;
          }
          var name = entry.name || entry.key;
          if (!name) {
            return;
          }
          var input = document.createElement("input");
          input.type = "hidden";
          input.name = name;
          input.value = entry.value != null ? String(entry.value) : "";
          form.appendChild(input);
        });
        return;
      }

      if (data && typeof data === "object") {
        Object.keys(data).forEach(function (key) {
          var input = document.createElement("input");
          input.type = "hidden";
          input.name = key;
          input.value = String(data[key]);
          form.appendChild(input);
        });
        return;
      }

      if (data != null) {
        var input = document.createElement("input");
        input.type = "hidden";
        input.name = fallbackName;
        input.value = String(data);
        form.appendChild(input);
      }
    }

    function createPostForm(target, url, data, fallbackName) {
      var form = document.createElement("form");
      form.method = "POST";
      form.action = url;
      form.target = target;
      form.style.display = "none";
      appendInputs(form, data, fallbackName);
      return form;
    }

    function resolveMethod(payload) {
      if (payload.method && payload.method.url) {
        return {
          url: payload.method.url,
          data: payload.method.data,
        };
      }

      var preconditions =
        payload.redirect && Array.isArray(payload.redirect.preconditions)
          ? payload.redirect.preconditions
          : [];
      if (preconditions.length > 0 && preconditions[0].url) {
        return {
          url: preconditions[0].url,
          data: preconditions[0].parameters || [],
        };
      }

      return null;
    }

    function resolveChallenge(payload) {
      return {
        url: payload.redirect && payload.redirect.url,
        parameters:
          payload.redirect && payload.redirect.parameters
            ? payload.redirect.parameters
            : {},
      };
    }

    function hasParameters(params) {
      if (!params) {
        return false;
      }
      if (Array.isArray(params)) {
        return params.length > 0;
      }
      if (typeof params === "object") {
        return Object.keys(params).length > 0;
      }
      return true;
    }

    function startMonitoring(frame, completionParam, completionId) {
      var start = Date.now();
      var timer = null;
      function checkSameOriginLocation() {
        try {
          var location = frame.contentWindow.location;
          if (!location || !location.href) {
            return;
          }
          if (location.origin === window.location.origin) {
            if (location.pathname === "/complete") {
              window.location.href =
                location.href ||
                "/complete?" +
                  completionParam +
                  "=" +
                  encodeURIComponent(completionId || "");
              return true;
            }
            if (location.pathname === "/cancel") {
              window.location.href = location.href || "/cancel";
              return true;
            }
          }
        } catch (error) {
          return false;
        }
        return false;
      }

      frame.addEventListener("load", function () {
        if (checkSameOriginLocation() && timer) {
          clearInterval(timer);
        }
      });

      timer = setInterval(function () {
        if (Date.now() - start > 300000) {
          clearInterval(timer);
          fail("This verification is taking too long. Please try again.");
          return;
        }
        if (checkSameOriginLocation()) {
          clearInterval(timer);
        }
      }, 500);
    }

    try {
      var params = new URLSearchParams(window.location.search);
      var payloadParam = params.get("p");
      var mode = params.get("mode");
      var useIframe = mode === "iframe";
      if (!payloadParam) {
        fail("Missing 3DS payload.");
        return;
      }

      var payload = decodePayload(payloadParam);
      var method = resolveMethod(payload);
      var challenge = resolveChallenge(payload);
      var fallbackId = payload.orderId || payload.threeDSecureId;
      var fallbackParam = payload.orderId ? "oid" : "tid";

      if (!payload || !payload.threeDSecureId || !method || !challenge.url) {
        fail("Invalid 3DS payload.");
        return;
      }

      var methodFrame = document.createElement("iframe");
      methodFrame.name = "threeDSMethodFrame";
      methodFrame.title = "3DS Method";
      methodFrame.setAttribute("aria-hidden", "true");
      methodFrame.style.cssText = "display:none;width:0;height:0;border:0;";
      document.body.appendChild(methodFrame);

      var methodForm = createPostForm(
        methodFrame.name,
        method.url,
        method.data,
        "threeDSMethodData"
      );
      document.body.appendChild(methodForm);
      methodForm.submit();

      setStatus("Running 3DS checks...");

      var challengeStarted = false;
      function startChallenge() {
        if (challengeStarted) {
          return;
        }
        challengeStarted = true;
        var needsPost = hasParameters(challenge.parameters);

        if (useIframe) {
          setStatus("Loading your bank verification...");

          var challengeFrame = document.createElement("iframe");
          challengeFrame.name = "threeDSChallengeFrame";
          challengeFrame.title = "3DS Challenge";
          challengeFrame.style.cssText =
            "width:100%;height:100vh;border:0;display:block;background:#fff;";
          challengeFrame.allow = "payment *; fullscreen *";
          challengeContainer.appendChild(challengeFrame);

          if (needsPost) {
            var challengeForm = createPostForm(
              challengeFrame.name,
              challenge.url,
              challenge.parameters || {},
              "creq"
            );
            document.body.appendChild(challengeForm);
            challengeForm.submit();
          } else {
            challengeFrame.src = challenge.url;
          }

          startMonitoring(challengeFrame, fallbackParam, fallbackId);
        } else {
          setStatus("Redirecting to your bank verification...");
          if (needsPost) {
            var redirectForm = createPostForm(
              "_top",
              challenge.url,
              challenge.parameters || {},
              "creq"
            );
            document.body.appendChild(redirectForm);
            redirectForm.submit();
          } else {
            window.location.href = challenge.url;
          }
        }
      }

      methodFrame.addEventListener("load", startChallenge);
      setTimeout(startChallenge, 800);
    } catch (error) {
      fail("Unable to start 3DS verification.");
    }
  }

  if (document.readyState === "complete") {
    run();
  } else {
    window.addEventListener("load", run);
  }
})();
