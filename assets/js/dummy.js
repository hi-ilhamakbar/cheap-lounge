/* Dummy Ticket & Dummy Hotel order forms. The server re-validates and re-prices everything. */
(function () {
  "use strict";
  var form = document.querySelector("[data-dummy]");
  if (!form) return;
  var KIND = form.getAttribute("data-dummy"); // "ticket" | "hotel"
  var I = window.I18N, LANG = window.LANG, CL = window.CL, esc = CL.esc, tk = CL.tk;
  var F = I.form, T = I.ticket, H = I.hotel;
  var WINDOW = 300, MAX_ROUTES = 5, MAX_STAYS = 5, PRICE = 100000;
  var DRAFT = "clv-" + KIND + "-draft-v2";

  /* ── dates ─────────────────────────────────────────────── */
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function localISO(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function addDays(iso, n) { var p = iso.split("-"); return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2]) + n * 864e5).toISOString().slice(0, 10); }
  function validISO(iso) { if (!/^\d{4}-\d{2}-\d{2}$/.test(iso || "")) return false; var p = iso.split("-"); var t = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])); return t.getUTCMonth() === +p[1] - 1 && t.getUTCDate() === +p[2]; }
  function nights(a, b) { if (!validISO(a) || !validISO(b)) return 0; return Math.round((Date.parse(b) - Date.parse(a)) / 864e5); }
  var today = localISO(new Date()), maxDate = addDays(today, WINDOW);
  function inWindow(iso, min) { return validISO(iso) && iso >= (min || today) && iso <= maxDate; }

  function idr(n) { return LANG === "id" ? "Rp " + n.toLocaleString("id-ID") : "IDR " + n.toLocaleString("en-US"); }
  function fmt(t, v) { return String(t).replace(/\{(\w+)\}/g, function (_, k) { return v[k] == null ? "" : v[k]; }); }
  function clean(v) { return String(v || "").replace(/\s+/g, " ").trim(); }
  var NAME_RE;
  try { NAME_RE = new RegExp("^[\\p{L}\\p{M}][\\p{L}\\p{M} .'\\-]*$", "u"); } catch (e) { NAME_RE = /^[^\d<>@#$%^&*()_+=[\]{}|\\/:;",?!~`]+$/; }
  function nameErr(n) { n = clean(n); if (n.length < 2) return "errors.nameRequired"; if (n.length > 100) return "errors.nameTooLong"; if (/[<>]/.test(n) || !NAME_RE.test(n)) return "errors.nameInvalid"; return null; }
  function normalizeWa(input) {
    var raw = String(input || "").trim(); if (!raw) return null;
    var plus = raw[0] === "+" || raw.slice(0, 2) === "00", d = raw.replace(/\D/g, "");
    if (raw.slice(0, 2) === "00") d = d.slice(2);
    if (!plus) { if (d.slice(0, 2) === "62") {} else if (d[0] === "0") d = "62" + d.slice(1); else if (d[0] === "8") d = "62" + d; else return null; }
    if (!/^[1-9]\d{7,14}$/.test(d)) return null;
    if (d.slice(0, 2) === "62" && !/^628\d{8,11}$/.test(d)) return null;
    return "+" + d;
  }

  /* ── state ─────────────────────────────────────────────── */
  var S = KIND === "ticket"
    ? { tripType: "oneway", routes: [{ from: "", to: "", date: "" }, { from: "", to: "", date: "" }], returnDate: "", airline: "", usageDate: "", adults: 1, children: 0, infants: 0, pp: { adult: [], child: [], infant: [] }, whatsapp: "+62 ", email: "", customerName: "" }
    : { rooms: 1, adults: 1, children: 0, infants: 0, stays: [{ city: "", hotel: "", checkIn: "", checkOut: "" }], pp: { adult: [], child: [], infant: [] }, whatsapp: "+62 ", email: "", customerName: "" };
  try { var dr = JSON.parse(sessionStorage.getItem(DRAFT) || "null"); if (dr) for (var k in S) if (k in dr) S[k] = dr[k]; } catch (e) {}
  function save() { try { sessionStorage.setItem(DRAFT, JSON.stringify(S)); } catch (e) {} }
  var acceptTerms = false, submitting = false, idem = null;

  var $ = function (sel, el) { return (el || form).querySelector(sel); };
  var $$ = function (sel, el) { return Array.prototype.slice.call((el || form).querySelectorAll(sel)); };

  /* ── people (passengers / guests) ──────────────────────── */
  /** [{type, j}] in server order: adults, then children, then infants. Data lives in S.pp[type][j]. */
  function peopleTypes() {
    var out = [], i;
    for (i = 0; i < S.adults; i++) out.push({ type: "adult", j: i });
    for (i = 0; i < S.children; i++) out.push({ type: "child", j: i });
    for (i = 0; i < S.infants; i++) out.push({ type: "infant", j: i });
    return out;
  }
  function person(x) { var arr = S.pp[x.type]; while (arr.length <= x.j) arr.push({}); return arr[x.j]; }
  var TYPE_LABEL = { adult: T.typeAdult, child: T.typeChild, infant: T.typeInfant };
  var TYPE_STYLE = { adult: "bg-navy-900 text-white", child: "bg-accent-600 text-white", infant: "bg-amber-500 text-white" };

  function renderPeople() {
    var list = peopleTypes();
    var box = $("[data-people]");
    var field = KIND === "ticket" ? "passengers" : "guests";
    var h = "";
    list.forEach(function (x, i) {
      var type = x.type, p = person(x);
      var head = '<div class="flex items-center justify-between gap-3"><span class="font-semibold">' + esc(fmt(KIND === "ticket" ? T.paxN : H.guestN, { n: i + 1 })) + '</span><span class="badge ' + TYPE_STYLE[type] + '">' + esc(TYPE_LABEL[type]) + "</span></div>";
      var fid = function (k) { return "p" + i + "-" + k; };
      var input = function (k, label, attrs) {
        return '<div><label for="' + fid(k) + '" class="field-label">' + esc(label) + ' *</label><input id="' + fid(k) + '" class="field-input" data-pt="' + type + '" data-pj="' + x.j + '" data-pk="' + k + '" value="' + esc(p[k] || "") + '" ' + attrs + '><p class="field-error hidden" data-error="' + field + "." + i + "." + k + '"></p></div>';
      };
      if (KIND === "ticket") {
        h += '<div class="rounded-2xl border border-navy-100 p-4 sm:p-5">' + head + '<div class="mt-4 grid gap-4 sm:grid-cols-2">' +
          '<div class="sm:col-span-2">' + input("name", F.fullName, 'type="text" maxlength="100" autocomplete="off"') + "</div>" +
          input("dob", F.dob, 'type="date" max="' + today + '" min="1900-01-01"') +
          input("passport", F.passportNo, 'type="text" maxlength="20" autocomplete="off" style="text-transform:uppercase"') +
          input("passportExpiry", F.passportExpiry, 'type="date" min="' + addDays(today, 1) + '"') +
          "</div></div>";
      } else {
        h += '<div class="grid items-start gap-3 rounded-2xl border border-navy-100 p-4 sm:grid-cols-[180px_1fr]">' + head.replace("justify-between", "justify-start") + input("name", F.fullName, 'type="text" maxlength="100" autocomplete="off"') + "</div>";
      }
    });
    var sig = list.map(function (x) { return x.type[0] + x.j; }).join(",");
    if (box.getAttribute("data-sig") !== sig) {
      box.innerHTML = h;
      box.setAttribute("data-sig", sig);
      $$("input[data-pt]", box).forEach(function (inp) {
        inp.addEventListener("input", function () { person({ type: inp.getAttribute("data-pt"), j: +inp.getAttribute("data-pj") })[inp.getAttribute("data-pk")] = inp.value; save(); });
      });
    }
  }

  /* ── ticket routes ─────────────────────────────────────── */
  function renderRoutes() {
    var box = $("[data-routes]");
    var n = S.tripType === "multicity" ? Math.max(2, Math.min(MAX_ROUTES, S.routes.length)) : 1;
    while (S.routes.length < n) S.routes.push({ from: "", to: "", date: "" });
    var h = "";
    for (var i = 0; i < n; i++) {
      var r = S.routes[i];
      var title = S.tripType === "multicity" ? fmt(T.route, { n: i + 1 }) : T.route.replace(" {n}", "");
      var removable = S.tripType === "multicity" && n > 2;
      var dateLabel = S.tripType === "roundtrip" ? T.depart : T.date;
      var minDate = i > 0 && validISO(S.routes[i - 1].date) ? S.routes[i - 1].date : today;
      h += '<div class="rounded-2xl border border-navy-100 p-4 sm:p-5"><div class="mb-3 flex items-center justify-between"><span class="text-sm font-bold uppercase tracking-wide text-navy-700">' + esc(title) + "</span>" +
        (removable ? '<button type="button" class="text-xs font-semibold text-accent-600 hover:underline" data-remove-route="' + i + '">' + esc(F.remove) + "</button>" : "") + "</div>" +
        '<div class="grid gap-4 sm:grid-cols-2">' +
        field("routes." + i + ".from", T.from, '<input id="r' + i + 'f" class="field-input" maxlength="80" placeholder="' + esc(T.fromPh) + '" data-r="' + i + '" data-rk="from" value="' + esc(r.from) + '">') +
        field("routes." + i + ".to", T.to, '<input id="r' + i + 't" class="field-input" maxlength="80" placeholder="' + esc(T.toPh) + '" data-r="' + i + '" data-rk="to" value="' + esc(r.to) + '">') +
        field("routes." + i + ".date", dateLabel, '<input id="r' + i + 'd" type="date" class="field-input" min="' + minDate + '" max="' + maxDate + '" data-r="' + i + '" data-rk="date" value="' + esc(r.date) + '">') +
        (S.tripType === "roundtrip" ? field("routes.1.date", T["return"], '<input id="r0ret" type="date" class="field-input" min="' + (validISO(r.date) ? r.date : today) + '" max="' + maxDate + '" data-return value="' + esc(S.returnDate) + '">') : "") +
        "</div></div>";
    }
    box.innerHTML = h;
    $$("input[data-r]", box).forEach(function (inp) {
      inp.addEventListener("input", function () {
        S.routes[+inp.getAttribute("data-r")][inp.getAttribute("data-rk")] = inp.value; save();
        if (inp.getAttribute("data-rk") === "date") { updateDateMins(); }
      });
    });
    var ret = $("[data-return]", box);
    if (ret) ret.addEventListener("input", function () { S.returnDate = ret.value; save(); });
    $$("[data-remove-route]", box).forEach(function (b) {
      b.addEventListener("click", function () { S.routes.splice(+b.getAttribute("data-remove-route"), 1); save(); renderRoutes(); renderPrice(); });
    });
    var add = $("[data-add-route]");
    add.classList.toggle("hidden", S.tripType !== "multicity" || n >= MAX_ROUTES);
    if (S.tripType === "multicity") S.routes.length = n;
  }
  function updateDateMins() {
    var n = S.tripType === "multicity" ? S.routes.length : 1;
    for (var i = 1; i < n; i++) { var el = $("#r" + i + "d"); if (el) el.min = validISO(S.routes[i - 1].date) ? S.routes[i - 1].date : today; }
    var ret = $("#r0ret"); if (ret) ret.min = validISO(S.routes[0].date) ? S.routes[0].date : today;
  }
  function field(errKey, label, control) {
    var id = (control.match(/id="([^"]+)"/) || [])[1];
    return '<div><label for="' + id + '" class="field-label">' + esc(label) + ' *</label>' + control + '<p class="field-error hidden" data-error="' + errKey + '"></p></div>';
  }
  function ticketRoutes() {
    if (S.tripType === "oneway") return [S.routes[0]];
    if (S.tripType === "roundtrip") return [S.routes[0], { from: S.routes[0].to, to: S.routes[0].from, date: S.returnDate }];
    return S.routes.slice(0, Math.min(MAX_ROUTES, S.routes.length));
  }

  /* ── hotel stays ───────────────────────────────────────── */
  function renderStays() {
    var box = $("[data-stays]");
    if (!S.stays.length) S.stays.push({ city: "", hotel: "", checkIn: "", checkOut: "" });
    var h = "";
    S.stays.forEach(function (s, i) {
      var nn = nights(s.checkIn, s.checkOut);
      h += '<div class="rounded-2xl border border-navy-100 p-4 sm:p-5"><div class="mb-3 flex items-center justify-between"><span class="text-sm font-bold uppercase tracking-wide text-navy-700">' + esc(fmt(H.stay, { n: i + 1 })) + "</span>" +
        (S.stays.length > 1 ? '<button type="button" class="text-xs font-semibold text-accent-600 hover:underline" data-remove-stay="' + i + '">' + esc(F.remove) + "</button>" : "") + "</div>" +
        '<div class="grid gap-4 sm:grid-cols-2">' +
        field("stays." + i + ".city", H.city, '<input id="s' + i + 'c" class="field-input" maxlength="80" placeholder="' + esc(H.cityPh) + '" data-s="' + i + '" data-sk="city" value="' + esc(s.city) + '">') +
        '<div><label for="s' + i + 'h" class="field-label">' + esc(H.hotelName) + ' <span class="font-normal text-slate-400">(' + esc(F.optional) + ')</span></label><input id="s' + i + 'h" class="field-input" maxlength="100" placeholder="' + esc(H.hotelPh) + '" data-s="' + i + '" data-sk="hotel" value="' + esc(s.hotel || "") + '"><p class="field-error hidden" data-error="stays.' + i + '.hotel"></p></div>' +
        field("stays." + i + ".checkIn", H.checkIn, '<input id="s' + i + 'i" type="date" class="field-input" min="' + today + '" max="' + maxDate + '" data-s="' + i + '" data-sk="checkIn" value="' + esc(s.checkIn) + '">') +
        field("stays." + i + ".checkOut", H.checkOut, '<input id="s' + i + 'o" type="date" class="field-input" min="' + (validISO(s.checkIn) ? addDays(s.checkIn, 1) : addDays(today, 1)) + '" max="' + maxDate + '" data-s="' + i + '" data-sk="checkOut" value="' + esc(s.checkOut) + '">') +
        '</div><p class="mt-2 text-xs font-medium text-navy-700" data-nights="' + i + '">' + (nn > 0 ? esc(fmt(H.nights, { n: nn })) : "") + "</p></div>";
    });
    box.innerHTML = h;
    $$("input[data-s]", box).forEach(function (inp) {
      inp.addEventListener("input", function () {
        var i = +inp.getAttribute("data-s"), k = inp.getAttribute("data-sk");
        S.stays[i][k] = inp.value; save();
        if (k === "checkIn") { var o = $("#s" + i + "o"); if (o) o.min = validISO(inp.value) ? addDays(inp.value, 1) : addDays(today, 1); }
        if (k === "checkIn" || k === "checkOut") { var nn = nights(S.stays[i].checkIn, S.stays[i].checkOut); $('[data-nights="' + i + '"]').textContent = nn > 0 ? fmt(H.nights, { n: nn }) : ""; }
      });
    });
    $$("[data-remove-stay]", box).forEach(function (b) {
      b.addEventListener("click", function () { S.stays.splice(+b.getAttribute("data-remove-stay"), 1); save(); renderStays(); renderPrice(); });
    });
    $("[data-add-stay]").classList.toggle("hidden", S.stays.length >= MAX_STAYS);
  }

  /* ── price ─────────────────────────────────────────────── */
  function priceInfo() {
    if (KIND === "ticket") {
      var legs = ticketRoutes().length, pax = S.adults + S.children + S.infants;
      var unit = PRICE * legs;
      return { total: unit * pax, lines: [[fmt(T.priceLine, { qty: pax, unit: idr(unit) }) + " (" + fmt(T.routesLine, { legs: legs }) + ")", idr(unit * pax)]] };
    }
    var g = S.adults + S.children, hotels = S.stays.length;
    var lines = [[fmt(H.priceLine, { qty: g, hotels: hotels, unit: idr(PRICE) }), idr(PRICE * g * hotels)]];
    if (S.infants) lines.push([fmt(H.infantLine, { qty: S.infants, hotels: hotels }), F.free]);
    return { total: PRICE * g * hotels, lines: lines };
  }
  function renderPrice() {
    var p = priceInfo();
    $("[data-total]").textContent = idr(p.total);
    $("[data-lines]").innerHTML = p.lines.map(function (l) { return '<div class="flex justify-between gap-3"><dt class="text-slate-600">' + esc(l[0]) + '</dt><dd class="shrink-0 font-medium tabular-nums">' + esc(l[1]) + "</dd></div>"; }).join("") +
      '<div class="flex justify-between gap-3 border-t border-navy-100 pt-2"><dt class="font-semibold">' + esc(F.total) + '</dt><dd class="font-bold tabular-nums">' + idr(p.total) + "</dd></div>";
  }

  /* ── validation ────────────────────────────────────────── */
  function validate() {
    var e = {};
    if (KIND === "ticket") {
      var routes = ticketRoutes(), prev = today;
      routes.forEach(function (r, i) {
        var from = clean(r.from), to = clean(r.to);
        if (from.length < 2) e["routes." + i + ".from"] = "errors.routeRequired";
        if (to.length < 2) e["routes." + i + ".to"] = "errors.routeRequired";
        if (S.tripType === "roundtrip" && i === 1) { if (e["routes.1.from"] || e["routes.1.to"]) { delete e["routes.1.from"]; delete e["routes.1.to"]; } }
        if (!inWindow(r.date)) e["routes." + i + ".date"] = "errors.dateRange300";
        else if (r.date < prev) e["routes." + i + ".date"] = "errors.dateOrder";
        else prev = r.date;
      });
      if (!inWindow(S.usageDate)) e.usageDate = "errors.dateRange300";
      if (S.adults < 1) e.adults = "errors.adultRequired";
      if (S.infants > S.adults) e.infants = "errors.infantsPerAdult";
      peopleTypes().forEach(function (x, i) {
        var p = person(x);
        var ne = nameErr(p.name); if (ne) e["passengers." + i + ".name"] = ne;
        if (!validISO(p.dob) || p.dob > today || p.dob < "1900-01-01") e["passengers." + i + ".dob"] = "errors.dobInvalid";
        if (!/^[A-Z0-9]{5,20}$/.test(String(p.passport || "").toUpperCase().replace(/[\s-]+/g, ""))) e["passengers." + i + ".passport"] = "errors.passportInvalid";
        if (!validISO(p.passportExpiry) || p.passportExpiry <= today) e["passengers." + i + ".passportExpiry"] = "errors.passportExpiryInvalid";
      });
    } else {
      if (S.adults < 1) e.adults = "errors.adultRequired";
      else if (S.adults < S.rooms) e.rooms = "errors.roomsTooMany";
      else if (S.adults + S.children > 2 * S.rooms || S.infants > S.rooms) e.rooms = "errors.roomCapacity";
      S.stays.forEach(function (s, i) {
        if (clean(s.city).length < 2) e["stays." + i + ".city"] = "errors.cityRequired";
        if (!inWindow(s.checkIn)) e["stays." + i + ".checkIn"] = "errors.dateRange300";
        else if (!inWindow(s.checkOut, addDays(s.checkIn, 1))) e["stays." + i + ".checkOut"] = "errors.checkoutOrder";
      });
      peopleTypes().forEach(function (x, i) { var ne = nameErr(person(x).name); if (ne) e["guests." + i + ".name"] = ne; });
    }
    if (!S.whatsapp.replace(/^\+62\s*$/, "").trim()) e.whatsapp = "errors.whatsappRequired";
    else if (!normalizeWa(S.whatsapp)) e.whatsapp = "errors.whatsappInvalid";
    var m = clean(S.email);
    if (!m) e.email = "errors.emailRequired"; else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(m)) e.email = "errors.emailInvalid";
    if (!acceptTerms) e.acceptTerms = "errors.termsRequired";
    return e;
  }
  function showErrors(errs) {
    $$("[data-error]").forEach(function (p) {
      var k = p.getAttribute("data-error");
      p.textContent = errs[k] ? tk(errs[k]) : "";
      p.classList.toggle("hidden", !errs[k]);
      var inp = p.parentNode && p.parentNode.querySelector("input,select");
      if (inp) { if (errs[k]) inp.setAttribute("aria-invalid", "true"); else inp.removeAttribute("aria-invalid"); }
    });
    var first = $("[data-error]:not(.hidden)");
    if (first) first.parentNode.scrollIntoView({ behavior: "smooth", block: "center" });
  }
  function formError(text) {
    var el = $("[data-form-error]");
    el.innerHTML = text ? '<div role="alert" class="rounded-xl border border-accent-600/25 bg-accent-50 px-3 py-2.5 text-sm text-accent-700">' + esc(text) + "</div>" : "";
    el.classList.toggle("hidden", !text);
  }

  /* ── submit ────────────────────────────────────────────── */
  function newKey() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    var a = new Uint8Array(16); crypto.getRandomValues(a);
    return Array.prototype.map.call(a, function (b) { return ("0" + b.toString(16)).slice(-2); }).join("").replace(/^(.{8})(.{4})(.{4})(.{4})/, "$1-$2-$3-$4-");
  }
  function payload() {
    var base = { type: KIND, language: LANG, email: S.email, whatsapp: S.whatsapp, customerName: clean(S.customerName) || undefined, adults: S.adults, children: S.children, infants: S.infants, acceptTerms: acceptTerms };
    if (KIND === "ticket") {
      base.tripType = S.tripType;
      base.routes = ticketRoutes().map(function (r) { return { from: clean(r.from), to: clean(r.to), date: r.date }; });
      base.airline = clean(S.airline) || undefined;
      base.usageDate = S.usageDate;
      base.passengers = peopleTypes().map(person).map(function (p) { return { name: clean(p.name), dob: p.dob || "", passport: String(p.passport || "").toUpperCase().replace(/[\s-]+/g, ""), passportExpiry: p.passportExpiry || "" }; });
    } else {
      base.rooms = S.rooms;
      base.stays = S.stays.map(function (s) { return { city: clean(s.city), hotel: clean(s.hotel) || undefined, checkIn: s.checkIn, checkOut: s.checkOut }; });
      base.guests = peopleTypes().map(person).map(function (p) { return { name: clean(p.name) }; });
    }
    return base;
  }
  form.addEventListener("submit", function (ev) {
    ev.preventDefault();
    if (submitting) return;
    var e = validate();
    showErrors(e);
    if (Object.keys(e).length) { formError(I.errors.fixFields); return; }
    formError("");
    var body = payload();
    var pj = JSON.stringify(body);
    if (!idem || idem.p !== pj) idem = { k: newKey(), p: pj };
    body.idempotencyKey = idem.k;
    body.tzOffsetMinutes = new Date().getTimezoneOffset();
    var btn = $("[data-submit]"), html = btn.innerHTML;
    submitting = true; btn.disabled = true;
    btn.innerHTML = CL.SPIN.replace("size-5", "size-4") + " " + esc(F.submitting);
    fetch(CL.BASE + "/api/order.php", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { return { r: r, d: d }; }); })
      .then(function (x) {
        if (x.r.ok && x.d.ok) {
          try { sessionStorage.removeItem(DRAFT); } catch (e) {}
          window.location.href = CL.BASE + "/order.php?code=" + encodeURIComponent(x.d.orderCode) + "&d=" + x.d.token;
          return;
        }
        formError(tk(x.d.error || "errors.server"));
        showErrors(x.d.fields || {});
        done();
      })
      .catch(function () { formError(I.errors.network); done(); });
    function done() { submitting = false; btn.disabled = false; btn.innerHTML = html; }
  });

  /* Clear a field's error message as soon as the customer edits it. */
  form.addEventListener("input", function (ev) {
    var wrap = ev.target.closest("div");
    var p = wrap && wrap.querySelector("[data-error]");
    if (p && !p.classList.contains("hidden")) { p.classList.add("hidden"); ev.target.removeAttribute("aria-invalid"); }
  });

  /* ── wire up ───────────────────────────────────────────── */
  ["whatsapp", "email", "customerName", "airline", "usageDate"].forEach(function (k) {
    var inp = $('[data-f="' + k + '"]');
    if (!inp) return;
    inp.value = S[k] == null ? "" : S[k];
    inp.addEventListener("input", function () { S[k] = inp.value; save(); });
  });
  var usage = $('[data-f="usageDate"]');
  if (usage) { usage.min = today; usage.max = maxDate; }
  $('[data-f="acceptTerms"]').addEventListener("change", function (e) { acceptTerms = e.target.checked; });
  $$("[data-count]").forEach(function (sel) {
    var k = sel.getAttribute("data-count");
    sel.value = String(S[k]);
    sel.addEventListener("change", function () { S[k] = +sel.value; save(); renderPeople(); renderPrice(); });
  });
  if (KIND === "ticket") {
    $$('[data-f="tripType"]').forEach(function (r) {
      r.checked = r.value === S.tripType;
      r.addEventListener("change", function () { if (r.checked) { S.tripType = r.value; save(); renderRoutes(); renderPrice(); } });
    });
    $("[data-add-route]").addEventListener("click", function () {
      if (S.routes.length < MAX_ROUTES) {
        var last = S.routes[S.routes.length - 1] || {};
        S.routes.push({ from: last.to || "", to: "", date: "" }); save(); renderRoutes(); renderPrice();
      }
    });
    renderRoutes();
  } else {
    $("[data-add-stay]").addEventListener("click", function () {
      if (S.stays.length < MAX_STAYS) {
        var last = S.stays[S.stays.length - 1] || {};
        S.stays.push({ city: "", hotel: "", checkIn: last.checkOut || "", checkOut: "" }); save(); renderStays(); renderPrice();
      }
    });
    renderStays();
  }
  renderPeople();
  renderPrice();
})();
