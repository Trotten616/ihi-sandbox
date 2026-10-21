/* Shared mobile helpers (v16 contract). Owned by the PWA-shell track; other tracks may CALL these but not edit this file.
   Breakpoint: phone layout at max-width 760px, plus touch phones in landscape (see PHONE_MQ). <body> gets class "is-phone" when in phone layout.
   Also defines window.IHIPages (page registry) — see MOBILE-shell.md. */
(function () {
  /* Phone = narrow (≤760px) OR a touch phone held sideways (landscape: short + coarse pointer, no hover). */
  var PHONE_MQ = '(max-width: 760px), (hover: none) and (pointer: coarse) and (max-height: 500px)';
  var MQ = window.matchMedia ? window.matchMedia(PHONE_MQ) : null;
  function isPhone() { return !!(MQ && MQ.matches); }
  function sync() {
    if (!document.body) return;
    var was = document.body.classList.contains('is-phone'), now = isPhone();
    document.body.classList.toggle('is-phone', now);
    if (was !== now) { try { document.dispatchEvent(new CustomEvent('ihi:layout', { detail: { phone: now } })); } catch (e) { /* old browser */ } }
  }
  if (MQ && MQ.addEventListener) MQ.addEventListener('change', sync);
  else if (MQ && MQ.addListener) MQ.addListener(sync);
  document.addEventListener('DOMContentLoaded', sync);
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]; }); }
  function digits(n) { return String(n || '').replace(/[^0-9+]/g, ''); }
  /* —— Phone safety (v16 sample build) ——
     Only fictional 555-0100…555-0199 numbers are ever handed to the dialer (tel:). No sms: links at all.
     Any other number runs the same gates, then shows the toast "Sample data, no real call or text placed." */
  var QUIET = { start: 9, end: 21, tz: 'America/New_York' }; /* 9 AM–9 PM recipient local time */
  function isFictional(n) { var d = String(n || '').replace(/[^0-9]/g, ''); if (d.length === 11 && d[0] === '1') d = d.slice(1); return /^(\d{3})?55501\d\d$/.test(d); }
  function maskPhone(n) { var d = String(n || '').replace(/[^0-9]/g, ''); return d ? '•••-' + d.slice(-4) : ''; }
  function localHour(tz, now) {
    var d = now ? new Date(now) : new Date();
    try { var parts = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: false, timeZone: tz || QUIET.tz }).formatToParts(d);
      var h = +parts.find(function (p) { return p.type === 'hour'; }).value % 24, m = +parts.find(function (p) { return p.type === 'minute'; }).value; return h + m / 60;
    } catch (e) { return d.getHours() + d.getMinutes() / 60; }
  }
  function fmtLocal(tz, now) { try { return (now ? new Date(now) : new Date()).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: tz || QUIET.tz }); } catch (e) { return ''; } }
  /* Why calling / texting is blocked right now, or '' when allowed. opts: {dnc, noText, noCall, tz, now, quietStart, quietEnd} */
  function contactGate(kind, opts) {
    opts = opts || {};
    if (opts.dnc) return 'On the Do Not Call list (internal flag)';
    if (kind === 'text' && opts.noText) return opts.noTextReason || 'Do not text: no text consent';
    if (kind === 'call' && opts.noCall) return opts.noCallReason || 'Do not call';
    var start = opts.quietStart != null ? opts.quietStart : QUIET.start, end = opts.quietEnd != null ? opts.quietEnd : QUIET.end;
    var h = localHour(opts.tz, opts.now);
    if (h < start || h >= end) return 'Outside ' + hourLabel(start) + '–' + hourLabel(end) + ' for the customer (' + fmtLocal(opts.tz, opts.now) + ' there)';
    return '';
  }
  function hourLabel(h) { var hh = h % 12 || 12; return hh + (h < 12 ? ' AM' : ' PM'); }
  /* Phone numbers are READ-ONLY on the phone app unless CALLS_ENABLED is turned on (Thomas, v16 scope trim).
     CALLS_ENABLED false (default): plain text number, no buttons, no tel: link.
     CALLS_ENABLED true: number + one Call button behind the gates; tel: only for fictional 555-01xx numbers.
     There are NO text (sms:) buttons anywhere. opts: {mask, dnc, noCall, tz, now, quietStart, quietEnd, compact} */
  function phoneActions(number, opts) {
    opts = opts || {}; var d = digits(number); if (!d) return esc(number || '');
    var shown = opts.mask ? maskPhone(number) : number;
    if (!M.CALLS_ENABLED) return '<span class="m-phone m-phone-ro">' + esc(shown) + '</span>';
    var fict = isFictional(d), why = contactGate('call', opts);
    var numHtml = fict && !why ? '<a class="m-phone-num" href="tel:' + d + '">' + esc(shown) + '</a>' : '<span class="m-phone-num">' + esc(shown) + '</span>';
    if (opts.compact) return '<span class="m-phone">' + numHtml + '</span>';
    var aria = 'Call ' + (opts.mask ? 'customer' : number), btn;
    if (why) btn = '<button type="button" class="m-btn m-call" disabled aria-disabled="true" title="' + esc(why) + '" aria-label="' + esc(aria + ' — unavailable: ' + why) + '">Call</button><span class="m-gate-why">' + esc(why) + '</span>';
    else if (fict) btn = '<a class="m-btn m-call" href="tel:' + d + '" aria-label="' + esc(aria) + '">Call</a>';
    else btn = '<button type="button" class="m-btn m-call" data-m-sample-contact="call" aria-label="' + esc(aria) + '">Call</button>';
    return '<span class="m-phone">' + numHtml + ' ' + btn + '</span>';
  }
  /* small toast (bottom, above the tab bar) */
  var toastTimer = null;
  function toast(msg, ms) {
    var el = document.getElementById('m-toast');
    if (!el) { el = document.createElement('div'); el.id = 'm-toast'; el.className = 'm-toast'; el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite'); document.body.appendChild(el); }
    el.textContent = msg; el.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { el.classList.remove('show'); }, ms || 3200);
  }
  document.addEventListener('click', function (e) {
    var t = e.target && e.target.closest ? e.target.closest('[data-m-sample-contact]') : null;
    if (t) { e.preventDefault(); toast('Sample data, no real call or text placed.'); return; }
    var mm = e.target && e.target.closest ? e.target.closest('[data-mm-detail]') : null;
    if (mm) { e.preventDefault(); toast(mm.getAttribute('data-mm-detail'), 4500); }
  });
  /* Returns a Google Maps URL for an address (opens the Maps app on Android). */
  function mapUrl(address) { return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(address || ''); }
  function mapLink(address, label) { return '<a class="m-map" href="' + mapUrl(address) + '" target="_blank" rel="noopener">' + esc(label || address) + '</a>'; }

  /* —— Design-token helpers (Architect visual system, v16) —— */
  var SOURCE_ORDER = ['Access', 'MarketSharp', 'Hatch', 'GoHighLevel'];
  var SOURCE_SHORT = { Access: 'ACCESS', MarketSharp: 'MS', Hatch: 'HATCH', GoHighLevel: 'GHL', GHL: 'GHL', MS: 'MS' };
  var SOURCE_CANON = { access: 'Access', ms: 'MarketSharp', marketsharp: 'MarketSharp', hatch: 'Hatch', ghl: 'GoHighLevel', gohighlevel: 'GoHighLevel' };
  function canonSource(s) { var k = String(s || '').toLowerCase().replace(/[^a-z]/g, ''); return SOURCE_CANON[k] || String(s || ''); }
  /* Source pills: ACCESS always first, then MS, HATCH, GHL. Text labels (never colour-only). opts.max → "+N" overflow pill. */
  function sourcePills(sources, opts) {
    opts = opts || {};
    var list = (Array.isArray(sources) ? sources : [sources]).filter(Boolean).map(canonSource);
    list = list.filter(function (s, i) { return list.indexOf(s) === i; });
    list.sort(function (a, b) { var ia = SOURCE_ORDER.indexOf(a), ib = SOURCE_ORDER.indexOf(b); return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib); });
    var max = opts.max || list.length, shown = list.slice(0, max), extra = list.length - shown.length;
    return '<span class="m-pills">' + shown.map(function (s) {
      return '<span class="m-pill m-pill-' + esc(s) + '" title="' + esc(s) + '">' + esc(SOURCE_SHORT[s] || s.toUpperCase()) + '</span>';
    }).join('') + (extra > 0 ? '<span class="m-pill m-pill-more" title="' + esc(list.slice(max).join(', ')) + '">+' + extra + '</span>' : '') + '</span>';
  }
  /* "Last synced 6:05 AM ET" line (sample data: pass the sample time). */
  function lastSynced(date, opts) {
    opts = opts || {}; var d = date ? new Date(date) : new Date();
    var t = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' });
    return '<p class="m-synced"><span aria-hidden="true">⟳</span> Last synced ' + esc(t) + ' ET' + (opts.sample === false ? '' : ' · sample') + '</p>';
  }
  /* Skeleton loading rows while async pages render. */
  function skeleton(rows) { var n = rows || 4, h = ''; for (var i = 0; i < n; i++) h += '<div class="m-skel m-skel-card" aria-hidden="true"><span class="m-skel-line w60"></span><span class="m-skel-line w90"></span><span class="m-skel-line w40"></span></div>'; return '<div class="m-skel-wrap" role="status" aria-label="Loading">' + h + '</div>'; }

  /* Freshness line: IHIMobile.freshness({access:'4:05 AM', ms:'4:10 AM', hatch:null, appointments:'4:00 AM'}, {now}).
     Stale chip when older than 2× the sync interval (Access 30 min, MS Activities 5 min, appointments 15 min).
     Offline → grey "Offline, showing data from h:mm AM". Values: 'h:mm AM' (today, ET), Date, ISO string, or null. */
  var FRESH = [
    { key: 'access', label: 'Access', every: 30 },
    { key: 'ms', label: 'MarketSharp', every: 5 },
    { key: 'appointments', label: 'Appointments', every: 15 },
    { key: 'hatch', label: 'Hatch', every: null, none: 'Hatch: open times TBD' }
  ];
  function etMinutes(d) { var p = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: false, timeZone: 'America/New_York' }).formatToParts(d); return (+p.find(function (x) { return x.type === 'hour'; }).value % 24) * 60 + (+p.find(function (x) { return x.type === 'minute'; }).value); }
  function parseClock(v) { /* → minutes since ET midnight */
    if (v == null || v === '') return null;
    if (v instanceof Date || /\d{4}-\d\d-\d\d/.test(String(v))) return etMinutes(new Date(v));
    var m = String(v).trim().match(/^(\d{1,2}):(\d\d)\s*([AaPp])/); if (!m) return null;
    var h = (+m[1] % 12) + (/[pP]/.test(m[3]) ? 12 : 0); return h * 60 + (+m[2]);
  }
  function clockLabel(v) { if (v instanceof Date || /\d{4}-\d\d-\d\d/.test(String(v))) return new Date(v).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' }); return String(v).replace(/\s*ET$/i, ''); }
  function freshness(src, opts) {
    src = src || {}; opts = opts || {};
    var nowMin = etMinutes(opts.now ? new Date(opts.now) : new Date()), latest = null, latestMin = -1;
    var parts = FRESH.filter(function (f) { return f.key in src; }).map(function (f) {
      var v = src[f.key];
      if (v == null || v === '') return '<span class="m-fresh-src">' + esc(f.none || (f.label + ' —')) + '</span>';
      var at = parseClock(v), age = at == null ? null : (nowMin - at + 1440) % 1440;
      if (at != null && at > latestMin) { latestMin = at; latest = clockLabel(v); }
      var stale = f.every && age != null && age > 2 * f.every;
      return '<span class="m-fresh-src">' + esc(f.label) + ' ' + esc(clockLabel(v)) + ' ET' + (stale ? ' <span class="m-chip-stale" title="Older than ' + (2 * f.every) + ' minutes">stale</span>' : '') + '</span>';
    });
    var off = (typeof navigator !== 'undefined' && navigator.onLine === false) || opts.offline;
    return (off ? '<p class="m-offline-line" role="status">Offline, showing data from ' + esc(latest || 'the last sync') + '</p>' : '') +
      '<p class="m-fresh">' + parts.join('<span aria-hidden="true"> · </span>') + '</p>';
  }
  /* Mismatch (Thomas's rule): Access value large first, MarketSharp small underneath; amber ≠ "Doesn't match MarketSharp".
     Tap the flag → toast with both numbers and the difference. Never merged or averaged. */
  function mismatch(accessVal, msVal, opts) {
    opts = opts || {};
    var differ = msVal != null && String(accessVal) !== String(msVal);
    var diff = (differ && !isNaN(+accessVal) && !isNaN(+msVal)) ? ' · difference ' + Math.abs(+accessVal - +msVal) : '';
    var detail = (opts.label ? opts.label + ': ' : '') + 'Access ' + accessVal + ' · MarketSharp ' + (msVal == null ? '—' : msVal) + diff;
    return '<span class="mm' + (differ ? ' mm-differs' : '') + '">' +
      '<span class="mm-access m-num"><span class="sr-only">Access </span>' + esc(accessVal) + '</span>' +
      (msVal == null ? '' : '<span class="mm-ms m-num">MS ' + esc(msVal) + '</span>') +
      (differ ? '<button type="button" class="mm-flag" data-mm-detail="' + esc(detail) + '"><span class="mm-flag-pill"><b aria-hidden="true">≠</b> Doesn’t match MarketSharp</span></button>' : '') +
      '</span>';
  }
  /* Red DNC badge: dncBadge('dnc'|'text'|'call'). Internal flags only (no federal DNC scrub confirmed). */
  function dncBadge(type) {
    var t = String(type || 'dnc').toLowerCase().replace(/[^a-z]/g, '');
    var label = (t === 'text' || t === 'donottext' || t === 'notext') ? 'Do not text' : (t === 'call' || t === 'donotcall') ? 'Do not call' : 'DNC';
    return '<span class="m-dnc" title="Internal do-not-contact flag (not a federal DNC scrub)">' + label + '</span>';
  }

  window.IHIMobile = window.IHIMobile || {};
  var M = window.IHIMobile;
  M.isPhone = isPhone; M.phoneActions = phoneActions; M.mapUrl = mapUrl; M.mapLink = mapLink; M.BREAKPOINT = 760; M.PHONE_MQ = PHONE_MQ;
  M.esc = esc; M.sourcePills = sourcePills; M.lastSynced = lastSynced; M.skeleton = skeleton;
  if (typeof M.CALLS_ENABLED !== 'boolean') M.CALLS_ENABLED = false; /* tap-to-call off in v16 */
  M.isFictional = isFictional; M.maskPhone = maskPhone; M.contactGate = contactGate; M.QUIET = QUIET; M.toast = toast;
  M.freshness = freshness; M.mismatch = mismatch; M.dncBadge = dncBadge;
  /* M.openSheet / M.closeSheet / M.setTabBadge are added by js/mobile-shell.js */

  /* —— Roles —— canonical keys: salesrep, manager, setter, confirmer, dataprocessor.
     Accepted aliases: "Sales rep", "rep", "Salesperson", "Manager", "Setter", "Marketer", "Confirmer", "Data processor", "dp". */
  function roleKey(r) {
    var k = String(r || '').toLowerCase().replace(/[^a-z]/g, '');
    if (k === 'marketer' || k === 'setters' || k === 'telemarketer') return 'setter';
    if (k === 'dp' || k === 'dataproc' || k === 'dataprocessors') return 'dataprocessor';
    if (k === 'managers' || k === 'owner') return 'manager';
    if (k === 'confirmers') return 'confirmer';
    if (k === 'rep' || k === 'reps' || k === 'salesreps' || k === 'salesperson' || k === 'salesrepresentative') return 'salesrep';
    return k;
  }
  var ROLE_LABELS = { salesrep: 'Sales rep', manager: 'Manager', setter: 'Setter', confirmer: 'Confirmer', dataprocessor: 'Data processor' };

  /* —— Page registry (v16 contract) ——
     Other tracks: (window.IHIPages = window.IHIPages || {_q: [], register: function (r, d) { this._q.push([r, d]); }})
       .register('confirm', { title, roles: ['confirmer','manager'], badge: function (user) { return n; }, render: function (el, ctx) {...} });
     Defaults below give the 4 phone tab routes a title + roles before their page ships ("coming in this build" card). */
  var DEFAULTS = {
    today:         { title: 'Today', icon: '⌂', roles: ['salesrep', 'manager'], tip: 'Your appointments and numbers for today.' },
    'my-leads':    { title: 'My Leads', icon: '☰', roles: ['salesrep', 'manager'], tip: 'Leads and appointments assigned to you.' },
    calendar:      { title: 'Calendar', icon: '▦', roles: ['salesrep', 'manager'], tip: 'Your appointments by day or week.' },
    'my-activity': { title: 'My Activity', icon: '✓', roles: ['salesrep', 'manager'], tip: 'Results on your appointments, today and this week.' }
  };
  var prev = window.IHIPages, pages = {};
  function normDef(route, d) {
    d = d || {}; var base = DEFAULTS[route] || {};
    var out = {}; var k;
    for (k in base) out[k] = base[k];
    for (k in d) out[k] = d[k];
    out.route = route; out.title = out.title || route;
    out.roles = (out.roles || []).map(roleKey);
    out.registered = true;
    return out;
  }
  var IHIPages = {
    _q: [],
    defaults: DEFAULTS,
    register: function (route, def) {
      if (!route) return;
      pages[route] = normDef(route, def);
      try { document.dispatchEvent(new CustomEvent('ihi:pages', { detail: { route: route } })); } catch (e) { /* ignore */ }
      return pages[route];
    },
    /* registered page, or null */
    get: function (route) { return pages[route] || null; },
    has: function (route) { return !!pages[route]; },
    /* registered OR default meta (title/roles/icon), or null */
    meta: function (route) {
      if (pages[route]) return pages[route];
      var d = DEFAULTS[route]; if (!d) return null;
      var out = { route: route, registered: false }; for (var k in d) out[k] = d[k];
      out.roles = (d.roles || []).map(roleKey); return out;
    },
    isRoute: function (route) { return !!(pages[route] || DEFAULTS[route]); },
    list: function () { return Object.keys(pages).map(function (r) { return pages[r]; }); },
    allowed: function (route, role) { var m = this.meta(route); if (!m) return false; return !m.roles.length || m.roles.indexOf(roleKey(role)) >= 0; },
    badgeFor: function (route, user) {
      var p = pages[route]; if (!p || typeof p.badge !== 'function') return null;
      try { var n = p.badge(user); return (n == null || n === '' || n === 0) ? null : n; } catch (e) { console.warn('[IHIPages] badge failed for ' + route, e); return null; }
    },
    roleKey: roleKey,
    roleLabel: function (k) { return ROLE_LABELS[roleKey(k)] || k; }
  };
  window.IHIPages = IHIPages;
  /* drain anything queued by page modules that loaded before this file */
  if (prev && prev._q && prev._q.length) prev._q.forEach(function (a) { IHIPages.register(a[0], a[1]); });
})();
