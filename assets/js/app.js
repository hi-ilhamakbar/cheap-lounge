/* JASA TIKET MURAH — shared front-end behaviour (no build step, no dependencies). */
(function () {
  "use strict";
  var I = window.I18N || {};
  var BASE = window.BASE || "";

  function tk(key) {
    var cur = I;
    var parts = String(key || "").split(".");
    for (var i = 0; i < parts.length; i++) {
      if (cur && typeof cur === "object" && parts[i] in cur) cur = cur[parts[i]];
      else return (I.errors && I.errors.generic) || "Error";
    }
    return typeof cur === "string" ? cur : (I.errors && I.errors.generic) || "Error";
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  var SPIN = '<svg class="size-5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true"><path d="M12 3a9 9 0 1 0 9 9"/></svg>';
  window.CL = { tk: tk, esc: esc, BASE: BASE, SPIN: SPIN };

  /* ── Airport autocomplete ─────────────────────────────────────────── */
  function initSearch(root) {
    var form = root.querySelector("form");
    var input = root.querySelector("input");
    var panel = root.querySelector("[data-search-panel]");
    var list = panel.querySelector("ul");
    var msg = panel.querySelector("[data-search-msg]");
    var iconBox = root.querySelector("[data-search-icon]");
    var iconHtml = iconBox.innerHTML;
    var mode = root.getAttribute("data-mode");
    var results = [];
    var active = -1;
    var timer = null;
    var ctrl = null;

    function open(v) {
      panel.classList.toggle("hidden", !v);
      input.setAttribute("aria-expanded", v ? "true" : "false");
    }
    function message(text, isError) {
      msg.textContent = text || "";
      msg.className = "px-4 py-4 text-sm " + (isError ? "text-accent-600" : "text-slate-500") + (text ? "" : " hidden");
    }
    function render() {
      list.innerHTML = results
        .map(function (a, i) {
          return (
            '<li id="' + list.id + "-" + i + '" role="option" aria-selected="' + (i === active) + '" data-i="' + i + '" class="flex cursor-pointer items-center gap-3 px-4 py-3 transition ' + (i === active ? "bg-navy-50" : "") + '">' +
            '<span class="grid size-10 shrink-0 place-items-center rounded-xl bg-navy-900 text-xs font-bold tracking-wider text-white">' + esc(a.iata) + "</span>" +
            '<span class="min-w-0 flex-1"><span class="block truncate text-sm font-semibold text-navy-900">' + esc(a.name) + "</span>" +
            '<span class="mt-0.5 block truncate text-xs text-slate-500">' + esc([a.city, a.country].filter(Boolean).join(", ")) + "</span></span></li>"
          );
        })
        .join("");
      input.setAttribute("aria-activedescendant", active >= 0 ? list.id + "-" + active : "");
    }
    function choose(a) {
      input.value = a.name + " (" + a.iata + ")";
      open(false);
      if (mode === "select") root.dispatchEvent(new CustomEvent("airport:select", { bubbles: true, detail: a }));
      else window.location.href = BASE + "/airport.php?iata=" + encodeURIComponent(a.iata);
    }
    function search(q) {
      if (ctrl) ctrl.abort();
      ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
      iconBox.innerHTML = SPIN;
      message(I.search.loading);
      open(true);
      fetch(BASE + "/api/airports.php?q=" + encodeURIComponent(q), ctrl ? { signal: ctrl.signal } : {})
        .then(function (r) { return r.json().then(function (d) { if (!r.ok || !d.ok) throw new Error(); return d; }); })
        .then(function (d) {
          results = d.airports || [];
          active = results.length ? 0 : -1;
          render();
          message(results.length ? "" : I.search.noResults);
          open(true);
        })
        .catch(function (e) {
          if (e && e.name === "AbortError") return;
          results = [];
          render();
          message(I.search.failed, true);
          open(true);
        })
        .then(function () { iconBox.innerHTML = iconHtml; });
    }

    input.addEventListener("input", function () {
      clearTimeout(timer);
      var q = input.value.trim();
      if (q.length < 2) { results = []; render(); message(""); open(false); return; }
      timer = setTimeout(function () { search(q); }, 250);
    });
    input.addEventListener("keydown", function (e) {
      if (e.key === "ArrowDown") { e.preventDefault(); active = Math.min(active + 1, results.length - 1); render(); open(true); }
      else if (e.key === "ArrowUp") { e.preventDefault(); active = Math.max(active - 1, 0); render(); }
      else if (e.key === "Escape") open(false);
    });
    input.addEventListener("focus", function () { if (results.length) open(true); });
    list.addEventListener("mousedown", function (e) {
      var li = e.target.closest("li[data-i]");
      if (!li) return;
      e.preventDefault();
      choose(results[+li.getAttribute("data-i")]);
    });
    list.addEventListener("mousemove", function (e) {
      var li = e.target.closest("li[data-i]");
      if (li && +li.getAttribute("data-i") !== active) { active = +li.getAttribute("data-i"); render(); }
    });
    document.addEventListener("mousedown", function (e) { if (!root.contains(e.target)) open(false); });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var q = input.value.trim().toUpperCase();
      if (active >= 0 && results[active]) return choose(results[active]);
      for (var i = 0; i < results.length; i++) if (results[i].iata === q) return choose(results[i]);
      if (results.length === 1) return choose(results[0]);
      message(q.length < 2 ? I.search.minChars : I.search.selectFromList, true);
      open(true);
    });
  }

  /* ── Copy button ─────────────────────────────────────────────────── */
  function initCopy(btn) {
    var label = btn.querySelector("[data-copy-label]");
    var original = label.textContent;
    btn.addEventListener("click", function () {
      var v = btn.getAttribute("data-copy");
      var done = function () {
        label.textContent = I.order.copied;
        setTimeout(function () { label.textContent = original; }, 2000);
      };
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(v).then(done, fallback);
      else fallback();
      function fallback() {
        var ta = document.createElement("textarea");
        ta.value = v;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand("copy"); } catch (e) {}
        ta.remove();
        done();
      }
    });
  }

  /* ── Order page: proof upload + status ─────────────────────────────── */
  function initOrder(root) {
    var code = root.getAttribute("data-order-code");
    var token = root.getAttribute("data-order-token");
    var key = "clv-proof-sent-" + code;
    var form = root.querySelector("[data-proof-form]");
    var done = root.querySelector("[data-proof-done]");
    var err = root.querySelector("[data-proof-error]");
    var fileInput = form.querySelector('input[type="file"]');
    var fileName = form.querySelector("[data-file-name]");
    var btn = form.querySelector('button[type="submit"]');
    var btnHtml = btn.innerHTML;

    function setSent(sent) {
      var badge = root.querySelector("[data-status-badge]");
      if (badge) {
        var s = sent ? "PAYMENT_SUBMITTED" : "PENDING_PAYMENT";
        badge.textContent = I.status[s];
        badge.className = "badge ring-1 " + (sent ? "bg-sky-50 text-sky-800 ring-sky-200" : "bg-amber-50 text-amber-800 ring-amber-200");
      }
      root.querySelectorAll("[data-flow]").forEach(function (li) {
        var i = +li.getAttribute("data-flow");
        var n = sent ? 2 : 1;
        var dot = li.querySelector("span");
        dot.className = "grid size-6 place-items-center rounded-full text-xs " + (i < n ? "bg-navy-900 text-white" : i === n ? "bg-accent-600 text-white" : "bg-navy-100 text-slate-400");
        dot.innerHTML = i < n ? '<svg class="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m5 12 5 5L20 7"/></svg>' : String(i + 1);
        li.lastElementChild.className = i <= n ? "font-medium text-navy-900" : "text-slate-400";
      });
      form.classList.toggle("hidden", sent);
      done.classList.toggle("hidden", !sent);
    }
    try { setSent(localStorage.getItem(key) === "1"); } catch (e) { setSent(false); }

    root.querySelector("[data-send-another]").addEventListener("click", function () {
      form.classList.remove("hidden");
      done.classList.add("hidden");
    });
    fileInput.addEventListener("change", function () {
      fileName.textContent = fileInput.files[0] ? fileInput.files[0].name : I.order.proofFile;
    });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (btn.disabled) return;
      err.classList.add("hidden");
      var f = fileInput.files[0];
      var fail = function (m) { err.querySelector("[data-msg]").textContent = m; err.classList.remove("hidden"); };
      if (!f) return fail(I.errors.fileRequired);
      if (f.size > 5 * 1024 * 1024) return fail(I.errors.fileTooLarge);
      if (f.type && ["image/jpeg", "image/png", "image/webp", "application/pdf"].indexOf(f.type) < 0) return fail(I.errors.fileType);
      var fd = new FormData(form);
      fd.set("code", code);
      fd.set("d", token);
      btn.disabled = true;
      btn.innerHTML = SPIN.replace("size-5", "size-4") + " " + esc(I.order.submittingProof);
      fetch(BASE + "/api/proof.php", { method: "POST", body: fd })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { return { r: r, d: d }; }); })
        .then(function (x) {
          if (x.r.ok && x.d.ok) {
            try { localStorage.setItem(key, "1"); } catch (e) {}
            form.reset();
            fileName.textContent = I.order.proofFile;
            setSent(true);
          } else fail(tk(x.d.error || "errors.server"));
        })
        .catch(function () { fail(I.errors.network); })
        .then(function () { btn.disabled = false; btn.innerHTML = btnHtml; });
    });
  }

  /* ── Hide the floating WhatsApp button while the QR code is visible ── */
  function initFloatAvoider() {
    var btn = document.querySelector("[data-wa-float]");
    var targets = document.querySelectorAll("[data-no-overlay]");
    if (!btn || !targets.length || typeof IntersectionObserver === "undefined") return;
    btn.style.transition = "opacity .2s";
    var visible = new Set();
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { en.isIntersecting ? visible.add(en.target) : visible.delete(en.target); });
      var hide = visible.size > 0;
      btn.style.opacity = hide ? "0" : "1";
      btn.style.pointerEvents = hide ? "none" : "";
      btn.setAttribute("aria-hidden", hide ? "true" : "false");
      btn.tabIndex = hide ? -1 : 0;
    });
    targets.forEach(function (t) { io.observe(t); });
  }

  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll("[data-airport-search]").forEach(initSearch);
    document.querySelectorAll("[data-copy]").forEach(initCopy);
    document.querySelectorAll("[data-order-code]").forEach(initOrder);
    initFloatAvoider();
  });
})();
