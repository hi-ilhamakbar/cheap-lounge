/* Booking wizard: Lounge → Date → Contact → Passengers → Review. Server re-validates everything. */
(function () {
  "use strict";
  var root = document.getElementById("booking");
  if (!root) return;
  var I = window.I18N, LANG = window.LANG, CL = window.CL, esc = CL.esc, tk = CL.tk;
  var B = I.booking;
  var PRICE = { adult: 200000, child: 175000 }, MAXQ = 10, WINDOW = 90;
  var DRAFT = "clv-booking-draft-v2";
  var STEP_FIELDS = [["airportIata", "loungeId"], ["visitDate"], ["whatsapp", "email", "customerName"], ["adultQty", "childQty", "adultNames", "childNames"], ["acceptTerms"]];

  var initial = JSON.parse(root.getAttribute("data-initial") || "null");
  var S = {
    airport: initial ? initial.airport : null, lounge: initial ? initial.lounge : null,
    visitDate: "", customerName: "", whatsapp: "+62 ", email: "",
    adultQty: 1, childQty: 0, adultNames: [""], childNames: [], acceptTerms: false,
  };
  var step = 0, lounges = null, loungeState = "idle", submitting = false, idem = null;

  try {
    var d = JSON.parse(sessionStorage.getItem(DRAFT) || "null");
    if (d) {
      for (var k in S) if (k in d && k !== "acceptTerms") S[k] = d[k];
      if (initial) { S.airport = initial.airport; S.lounge = initial.lounge; }
    }
  } catch (e) {}
  function save() { try { sessionStorage.setItem(DRAFT, JSON.stringify(S)); } catch (e) {} }

  /* ── helpers ───────────────────────────────────────────── */
  var $ = function (sel, el) { return (el || root).querySelector(sel); };
  var $$ = function (sel, el) { return Array.prototype.slice.call((el || root).querySelectorAll(sel)); };
  function fmt(t, v) { return t.replace(/\{(\w+)\}/g, function (_, k) { return v[k] == null ? "" : v[k]; }); }
  function idr(n) { return LANG === "id" ? "Rp " + n.toLocaleString("id-ID") : "IDR " + n.toLocaleString("en-US"); }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function localISO(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function addDays(iso, n) { var p = iso.split("-"); var t = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2]) + n * 864e5); return t.toISOString().slice(0, 10); }
  function validISO(iso) { if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false; var p = iso.split("-"); var t = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])); return t.getUTCMonth() === +p[1] - 1 && t.getUTCDate() === +p[2]; }
  var today = localISO(new Date()), maxDate = addDays(today, WINDOW);
  function inWindow(iso) { return validISO(iso) && iso >= today && iso <= maxDate; }
  function visitLabel(iso) {
    var p = iso.split("-");
    return new Intl.DateTimeFormat(LANG === "id" ? "id-ID" : "en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])));
  }
  function normalizeWa(input) {
    var raw = String(input || "").trim();
    if (!raw) return null;
    var plus = raw[0] === "+" || raw.slice(0, 2) === "00";
    var d = raw.replace(/\D/g, "");
    if (raw.slice(0, 2) === "00") d = d.slice(2);
    if (!plus) {
      if (d.slice(0, 2) === "62") {} else if (d[0] === "0") d = "62" + d.slice(1); else if (d[0] === "8") d = "62" + d; else return null;
    }
    if (!/^[1-9]\d{7,14}$/.test(d)) return null;
    if (d.slice(0, 2) === "62" && !/^628\d{8,11}$/.test(d)) return null;
    return "+" + d;
  }
  var NAME_RE;
  try { NAME_RE = new RegExp("^[\\p{L}\\p{M}][\\p{L}\\p{M} .'\\-]*$", "u"); } catch (e) { NAME_RE = /^[^\d<>@#$%^&*()_+=[\]{}|\\/:;",?!~`]+$/; }
  function nameError(n) {
    n = String(n || "").replace(/\s+/g, " ").trim();
    if (n.length < 2) return "errors.nameRequired";
    if (n.length > 100) return "errors.nameTooLong";
    if (!NAME_RE.test(n)) return "errors.nameInvalid";
    return null;
  }
  function price() {
    var t = S.adultQty + S.childQty;
    if (t < 1) return null;
    return { a: S.adultQty, c: S.childQty, as: S.adultQty * PRICE.adult, cs: S.childQty * PRICE.child, total: S.adultQty * PRICE.adult + S.childQty * PRICE.child };
  }

  /* ── rendering ─────────────────────────────────────────── */
  function renderProgress() {
    $("[data-step-of]").textContent = fmt(B.stepOf, { n: step + 1, total: 5 });
    $$("[data-progress]").forEach(function (li) {
      var i = +li.getAttribute("data-progress");
      $("[data-bar]", li).className = "h-1.5 rounded-full transition-colors " + (i <= step ? "bg-navy-900" : "bg-navy-100");
      var l = $("[data-label]", li);
      l.className = "mt-2 hidden text-xs font-medium sm:block " + (i === step ? "text-navy-900" : i < step ? "text-navy-700" : "text-slate-400");
      if (i === step) l.setAttribute("aria-current", "step"); else l.removeAttribute("aria-current");
    });
    $$("[data-step]").forEach(function (s) { s.classList.toggle("hidden", +s.getAttribute("data-step") !== step); });
    $("[data-back]").classList.toggle("invisible", step === 0);
    $("[data-next]").classList.toggle("hidden", step === 4);
    $("[data-submit]").classList.toggle("hidden", step !== 4);
  }

  function renderAirport() {
    var el = $("[data-airport-display]");
    if (S.airport) {
      el.innerHTML = "<strong>" + esc(S.airport.name) + "</strong> (" + esc(S.airport.iata) + ") · " + esc([S.airport.city, S.airport.country].filter(Boolean).join(", "));
      el.classList.remove("hidden");
    } else el.classList.add("hidden");
  }

  function loungeMeta(l) {
    return '<span class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600"><span>' + esc(l.terminal ? I.lounge.terminal + " " + l.terminal : I.lounge.infoUnavailable) + "</span><span>" + esc(l.openingHours ? l.openingHours.split("\n")[0] : I.lounge.infoUnavailable) + "</span></span>";
  }
  function noticeHtml(text, tone) {
    var cls = tone === "error" ? "border-accent-600/25 bg-accent-50 text-accent-700" : tone === "warn" ? "border-amber-200 bg-amber-50 text-amber-900" : "border-navy-100 bg-navy-50 text-navy-800";
    return '<div role="' + (tone === "error" ? "alert" : "status") + '" class="flex items-start gap-3 rounded-2xl border px-4 py-3.5 text-sm ' + cls + '"><div>' + esc(text) + "</div></div>";
  }
  function renderLounges() {
    var area = $("[data-lounge-area]");
    var h = "";
    if (loungeState === "loading") h = '<p class="flex items-center gap-2 text-sm text-slate-500" role="status">' + CL.SPIN.replace("size-5", "size-4") + " " + esc(B.loadingLounges) + "</p>";
    else if (loungeState === "error") h = noticeHtml(I.lounge.error, "error");
    else if (loungeState === "unavailable") h = noticeHtml(I.lounge.unavailable, "warn");
    else if (lounges && !lounges.length) h = noticeHtml(I.lounge.none, "warn");
    else if (lounges) {
      h = '<div role="radiogroup" aria-label="' + esc(B.chooseLounge) + '" class="grid gap-3">' + lounges.map(function (l, i) {
        var sel = S.lounge && S.lounge.id === l.id;
        return '<button type="button" role="radio" aria-checked="' + sel + '" data-li="' + i + '" class="rounded-xl border-2 p-4 text-left transition ' + (sel ? "border-navy-900 bg-navy-50" : "border-navy-100 hover:border-navy-700/40") + '"><span class="block font-semibold">' + esc(l.name) + "</span>" + loungeMeta(l) + "</button>";
      }).join("") + "</div>";
    } else if (S.lounge) h = '<div class="rounded-xl border-2 border-navy-900 p-4"><p class="font-semibold">' + esc(S.lounge.name) + "</p>" + loungeMeta(S.lounge) + "</div>";
    else h = '<p class="text-sm text-slate-500">' + esc(B.noLounge) + "</p>";
    area.innerHTML = h;
    $$("[data-li]", area).forEach(function (b) {
      b.addEventListener("click", function () { S.lounge = lounges[+b.getAttribute("data-li")]; save(); renderLounges(); renderSide(); });
    });
  }

  function loadLounges(a) {
    S.airport = a;
    if (S.lounge && S.lounge.airportIata !== a.iata) S.lounge = null;
    save(); renderAirport(); renderSide();
    lounges = null; loungeState = "loading"; renderLounges();
    fetch(CL.BASE + "/api/lounges.php?iata=" + encodeURIComponent(a.iata))
      .then(function (r) { return r.json().then(function (d) { return { r: r, d: d }; }); })
      .then(function (x) {
        if (x.r.status === 503 || x.d.status === "not_configured") loungeState = "unavailable";
        else if (!x.r.ok || !x.d.ok) loungeState = "error";
        else { lounges = x.d.lounges; loungeState = "idle"; }
        renderLounges();
      })
      .catch(function () { loungeState = "error"; renderLounges(); });
  }

  function renderNames() {
    ["adult", "child"].forEach(function (kind) {
      var qty = S[kind + "Qty"], names = S[kind + "Names"];
      $('[data-qty="' + kind + '"] [data-val]').textContent = qty;
      $('[data-qty="' + kind + '"] [data-dec]').disabled = qty <= 0;
      $('[data-qty="' + kind + '"] [data-inc]').disabled = qty >= MAXQ;
      $('[data-names-wrap="' + kind + '"]').classList.toggle("hidden", qty === 0);
      var box = $('[data-names="' + kind + '"]');
      var tpl = kind === "adult" ? B.adultN : B.childN;
      // Only rebuild when the count changes (keeps focus/cursor while typing).
      if (box.children.length !== qty) {
        var h = "";
        for (var i = 0; i < qty; i++) {
          var id = kind + "-" + i;
          h += '<div><label for="' + id + '" class="field-label">' + esc(fmt(tpl, { n: i + 1 })) + ' *</label><input id="' + id + '" class="field-input" autocomplete="off" maxlength="100" data-name="' + kind + '" data-i="' + i + '" value="' + esc(names[i] || "") + '"><p class="field-error hidden" data-error="' + kind + "Names." + i + '"></p></div>';
        }
        box.innerHTML = h;
        $$("input", box).forEach(function (inp) {
          inp.addEventListener("input", function () { S[kind + "Names"][+inp.getAttribute("data-i")] = inp.value; save(); });
        });
      }
    });
  }
  function setQty(kind, q) {
    q = Math.max(0, Math.min(MAXQ, q));
    S[kind + "Qty"] = q;
    var names = S[kind + "Names"].slice(0, q);
    while (names.length < q) names.push("");
    S[kind + "Names"] = names;
    save(); renderNames(); renderSide();
  }

  function priceLines(dark) {
    var p = price();
    if (!p) return "";
    var muted = dark ? "text-navy-100" : "text-slate-600";
    var h = "";
    if (p.a) h += '<div class="flex justify-between gap-4"><dt class="' + muted + '">' + esc(B.adultLine + " " + p.a + " × " + idr(PRICE.adult)) + '</dt><dd class="font-medium tabular-nums">' + idr(p.as) + "</dd></div>";
    if (p.c) h += '<div class="flex justify-between gap-4"><dt class="' + muted + '">' + esc(B.childLine + " " + p.c + " × " + idr(PRICE.child)) + '</dt><dd class="font-medium tabular-nums">' + idr(p.cs) + "</dd></div>";
    h += '<div class="flex justify-between gap-4 border-t pt-3 ' + (dark ? "border-white/15" : "border-navy-100") + '"><dt class="font-semibold">' + esc(B.total) + '</dt><dd class="text-lg font-bold tabular-nums">' + idr(p.total) + "</dd></div>";
    return h;
  }
  function renderSide() {
    $("[data-side-lounge]").textContent = S.lounge ? S.lounge.name : "—";
    $("[data-side-airport]").textContent = S.airport ? S.airport.name + " (" + S.airport.iata + ")" : "—";
    var sd = $("[data-side-date]");
    sd.textContent = S.visitDate && validISO(S.visitDate) ? visitLabel(S.visitDate) : "";
    sd.classList.toggle("hidden", !sd.textContent);
    $('[data-price="light"]').innerHTML = priceLines(false);
  }

  function renderSummary() {
    var row = function (l, v) { return '<div class="grid grid-cols-[130px_1fr] gap-3 sm:grid-cols-[170px_1fr]"><dt class="text-slate-500">' + esc(l) + '</dt><dd class="break-words font-medium text-navy-900">' + esc(v) + "</dd></div>"; };
    var block = function (title, s, rows) {
      return '<div class="rounded-2xl border border-navy-100 p-4"><div class="mb-2 flex items-center justify-between"><h3 class="text-sm font-bold uppercase tracking-wide text-navy-700">' + esc(title) + '</h3><button type="button" data-goto="' + s + '" class="text-xs font-semibold text-accent-600 hover:underline">' + esc(B.edit) + '</button></div><dl class="space-y-1.5 text-sm">' + rows + "</dl></div>";
    };
    var pax = row(B.adults, String(S.adultQty)) + row(B.children, String(S.childQty));
    S.adultNames.forEach(function (n, i) { pax += row(fmt(B.adultN, { n: i + 1 }).split(" – ")[0], n.trim()); });
    S.childNames.forEach(function (n, i) { pax += row(fmt(B.childN, { n: i + 1 }).split(" – ")[0], n.trim()); });
    $("[data-summary]").innerHTML =
      block(B.steps[0], 0, row(B.airport, S.airport.name + " (" + S.airport.iata + ")") + row(B.lounge, S.lounge.name) + row(I.lounge.terminal, S.lounge.terminal || I.lounge.infoUnavailable)) +
      block(B.steps[1], 1, row(B.visitDate, visitLabel(S.visitDate))) +
      block(B.contact, 2, (S.customerName.trim() ? row(B.customerName.replace(/ \(.*\)$/, ""), S.customerName.trim()) : "") + row(B.whatsapp, normalizeWa(S.whatsapp) || S.whatsapp) + row(B.email, S.email.trim().toLowerCase())) +
      block(B.passengers, 3, pax);
    $$("[data-goto]").forEach(function (b) { b.addEventListener("click", function () { go(+b.getAttribute("data-goto")); }); });
    $('[data-price="dark"]').innerHTML = priceLines(true);
  }

  /* ── validation / errors ───────────────────────────────── */
  function showErrors(errs) {
    $$("[data-error]").forEach(function (p) {
      var k = p.getAttribute("data-error");
      p.textContent = errs[k] ? tk(errs[k]) : "";
      p.classList.toggle("hidden", !errs[k]);
    });
    $$("[data-field],[data-name]").forEach(function (inp) {
      var k = inp.getAttribute("data-field") || inp.getAttribute("data-name") + "Names." + inp.getAttribute("data-i");
      if (errs[k]) inp.setAttribute("aria-invalid", "true"); else inp.removeAttribute("aria-invalid");
    });
  }
  function formError(text) {
    var el = $("[data-form-error]");
    el.innerHTML = text ? noticeHtml(text, "error") : "";
    el.classList.toggle("hidden", !text);
  }
  function validate(s) {
    var e = {};
    if (s === 0) { if (!S.airport) e.airportIata = "errors.airportRequired"; if (!S.lounge) e.loungeId = "errors.loungeRequired"; }
    if (s === 1) { if (!S.visitDate) e.visitDate = "errors.dateRequired"; else if (!inWindow(S.visitDate)) e.visitDate = "errors.dateOutOfRange"; }
    if (s === 2) {
      if (!S.whatsapp.replace(/^\+62\s*$/, "").trim()) e.whatsapp = "errors.whatsappRequired";
      else if (!normalizeWa(S.whatsapp)) e.whatsapp = "errors.whatsappInvalid";
      var m = S.email.trim();
      if (!m) e.email = "errors.emailRequired"; else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(m) || m.length > 254) e.email = "errors.emailInvalid";
    }
    if (s === 3) {
      if (S.adultQty + S.childQty < 1) e.adultQty = "errors.passengerRequired";
      S.adultNames.forEach(function (n, i) { var x = nameError(n); if (x) e["adultNames." + i] = x; });
      S.childNames.forEach(function (n, i) { var x = nameError(n); if (x) e["childNames." + i] = x; });
    }
    if (s === 4 && !S.acceptTerms) e.acceptTerms = "errors.termsRequired";
    return e;
  }
  function go(s) {
    step = s; showErrors({}); formError("");
    if (s === 4) renderSummary();
    renderProgress();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* ── submit ────────────────────────────────────────────── */
  function newKey() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    var a = new Uint8Array(16); (window.crypto || window.msCrypto).getRandomValues(a);
    return Array.prototype.map.call(a, function (b) { return ("0" + b.toString(16)).slice(-2); }).join("").replace(/^(.{8})(.{4})(.{4})(.{4})/, "$1-$2-$3-$4-");
  }
  function submit() {
    for (var s = 0; s <= 4; s++) {
      var e = validate(s);
      if (Object.keys(e).length) { go(s); showErrors(e); formError(I.errors.fixFields); return; }
    }
    var payload = {
      language: LANG, customerName: S.customerName.trim() || undefined, email: S.email, whatsapp: S.whatsapp,
      airportIata: S.airport.iata, loungeId: S.lounge.id, visitDate: S.visitDate,
      adultQty: S.adultQty, childQty: S.childQty, adultNames: S.adultNames, childNames: S.childNames, acceptTerms: S.acceptTerms,
    };
    // Same payload re-submitted (double click, refresh, network retry) → same key → same order, one email.
    var pj = JSON.stringify(payload);
    if (!idem || idem.p !== pj) idem = { k: newKey(), p: pj };
    payload.idempotencyKey = idem.k;
    payload.tzOffsetMinutes = new Date().getTimezoneOffset();

    var btn = $("[data-submit]"), html = btn.innerHTML;
    submitting = true; btn.disabled = true;
    btn.innerHTML = CL.SPIN.replace("size-5", "size-4") + " " + esc(B.submitting);
    formError("");
    fetch(CL.BASE + "/api/order.php", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { return { r: r, d: d }; }); })
      .then(function (x) {
        if (x.r.ok && x.d.ok) {
          try { sessionStorage.removeItem(DRAFT); } catch (e) {}
          window.location.href = CL.BASE + "/order.php?code=" + encodeURIComponent(x.d.orderCode) + "&d=" + x.d.token;
          return;
        }
        var f = x.d.fields || {};
        formError(tk(x.d.error || "errors.server"));
        var first = -1;
        for (var i = 0; i < STEP_FIELDS.length && first < 0; i++) for (var k in f) if (STEP_FIELDS[i].indexOf(k.split(".")[0]) >= 0) { first = i; break; }
        if (f.loungeId) { S.lounge = null; save(); renderLounges(); renderSide(); }
        if (first >= 0) { step = first; renderProgress(); if (first === 4) renderSummary(); }
        showErrors(f);
        finish();
      })
      .catch(function () { formError(I.errors.network); finish(); });
    function finish() { submitting = false; btn.innerHTML = html; btn.disabled = !S.acceptTerms; }
  }

  /* ── wire up ───────────────────────────────────────────── */
  var dateInput = $("#visitDate");
  dateInput.min = today; dateInput.max = maxDate; dateInput.value = S.visitDate;
  function datePreview() { $("[data-date-preview]").textContent = inWindow(S.visitDate) ? visitLabel(S.visitDate) : ""; }
  dateInput.addEventListener("input", function () { S.visitDate = dateInput.value; save(); datePreview(); renderSide(); });
  ["whatsapp", "email", "customerName"].forEach(function (f) {
    var inp = $("#" + f);
    inp.value = S[f];
    inp.addEventListener("input", function () { S[f] = inp.value; save(); });
  });
  var terms = $('[data-field="acceptTerms"]');
  terms.addEventListener("change", function () { S.acceptTerms = terms.checked; $("[data-submit]").disabled = submitting || !terms.checked; });
  ["adult", "child"].forEach(function (kind) {
    $('[data-qty="' + kind + '"] [data-dec]').addEventListener("click", function () { setQty(kind, S[kind + "Qty"] - 1); });
    $('[data-qty="' + kind + '"] [data-inc]').addEventListener("click", function () { setQty(kind, S[kind + "Qty"] + 1); });
  });
  root.addEventListener("airport:select", function (e) { loadLounges(e.detail); });
  $("[data-next]").addEventListener("click", function () {
    var e = validate(step);
    showErrors(e);
    if (Object.keys(e).length) { formError(I.errors.fixFields); return; }
    go(Math.min(step + 1, 4));
  });
  $("[data-back]").addEventListener("click", function () { go(Math.max(step - 1, 0)); });
  $("[data-submit]").addEventListener("click", submit);

  renderAirport(); renderLounges(); renderNames(); datePreview(); renderSide(); renderProgress();
})();
