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

  /* ── Lounge search box (free text, no suggestions) ───────────────── */
  function initLoungeSearch(form) {
    var input = form.querySelector("input[name=q]");
    var msg = input.getAttribute("data-required-msg");
    input.addEventListener("invalid", function () { input.setCustomValidity(msg); });
    input.addEventListener("input", function () { input.setCustomValidity(""); });
    form.addEventListener("submit", function () { input.value = input.value.replace(/\s+/g, " ").trim(); });
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
    document.querySelectorAll("[data-lounge-search]").forEach(initLoungeSearch);
    document.querySelectorAll("[data-copy]").forEach(initCopy);
    document.querySelectorAll("[data-order-code]").forEach(initOrder);
    initFloatAvoider();
  });
})();
