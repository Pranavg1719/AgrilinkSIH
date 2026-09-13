/* ============================================================
   AGRILINK — UI toolkit (DOM helpers, icons, mock map, charts)
   No external libraries, no network, no fonts to download.
   ============================================================ */
(function (g) {
  'use strict';
  const AG = g.AG;
  const { round, clamp } = AG.util;

  /* ---------------- icons (inline SVG, stroke based) ---------------- */
  const P = {
    home: 'M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
    plus: 'M12 5v14M5 12h14',
    camera: 'M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z M12 17a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z',
    video: 'M3 7.5A2.5 2.5 0 0 1 5.5 5h7A2.5 2.5 0 0 1 15 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-7A2.5 2.5 0 0 1 3 16.5v-9z M15 11l5.2-2.9a.6.6 0 0 1 .8.5v6.8a.6.6 0 0 1-.8.5L15 13v-2z',
    leaf: 'M20 4c0 9-5.5 14-12 14H5c0-8 5-13 12-13 1.5 0 3 0 3-.0z M5 20c2-5 5-8 9-10',
    sprout: 'M12 20v-8 M12 12C12 8 9 5 5 5c0 4 3 7 7 7z M12 12c0-4 3-7 7-7 0 4-3 7-7 7z',
    store: 'M4 9h16v11H4z M4 9l1.5-4h13L20 9 M9 20v-6h6v6 M2 9h20',
    truck: 'M3 7h10v9H3z M13 10h4l3 3v3h-7z M7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z M17 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
    user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M4 21c0-4 3.6-6 8-6s8 2 8 6',
    users: 'M9 12a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z M2 20c0-3.4 3-5.2 7-5.2s7 1.8 7 5.2 M17 6.5a3.2 3.2 0 0 1 0 6.4 M18 20c0-2.6-.8-4.2-2-5.2 3 .4 5 1.9 5 4.4',
    bell: 'M12 3a6 6 0 0 0-6 6v4l-2 3h16l-2-3V9a6 6 0 0 0-6-6z M10 19a2 2 0 0 0 4 0',
    chart: 'M4 20V10 M10 20V4 M16 20v-7 M22 20H2',
    shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z M9 12l2 2 4-4',
    route: 'M6 19a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M18 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M15 8H9a3 3 0 0 0 0 6h6a3 3 0 0 1 0 6H9',
    box: 'M3 8l9-4 9 4-9 4z M3 8v8l9 4 9-4V8 M12 12v8',
    coin: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M14.5 9.2c-.6-.7-1.6-1.1-2.7-1.1-1.5 0-2.5.8-2.5 1.9 0 2.6 5.4 1.4 5.4 4 0 1.2-1.1 2-2.7 2-1.3 0-2.4-.5-3-1.3 M12 6.5v11',
    mic: 'M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3z M5 11a7 7 0 0 0 14 0 M12 18v3',
    search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z M20 20l-4-4',
    cart: 'M3 4h2l2.4 11h9.7L20 7H6 M9 20a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z M17 20a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z',
    check: 'M4 12.5l5 5L20 6.5',
    x: 'M6 6l12 12M18 6L6 18',
    right: 'M9 5l7 7-7 7',
    left: 'M15 5l-7 7 7 7',
    down: 'M5 9l7 7 7-7',
    up: 'M5 15l7-7 7 7',
    settings: 'M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2v.2a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 7 19.4a1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 2.6 14H2.4a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4 7a1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 9 2.6V2.4a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9v.1a1.7 1.7 0 0 0 1.6 1h.2a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.6 1z',
    globe: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M3 12h18 M12 3c2.5 2.6 3.8 5.7 3.8 9S14.5 18.4 12 21c-2.5-2.6-3.8-5.7-3.8-9S9.5 5.6 12 3z',
    map: 'M9 4L3 6v14l6-2 6 2 6-2V4l-6 2z M9 4v14 M15 6v14',
    pin: 'M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11z M12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
    clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M12 7v5l3.5 2',
    star: 'M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9L3.5 9.7l5.9-.8z',
    alert: 'M12 3l9.5 17H2.5z M12 9v5 M12 17h.01',
    refresh: 'M20 12a8 8 0 1 1-2.3-5.6 M20 4v5h-5',
    play: 'M7 4l13 8-13 8z',
    pause: 'M8 5h3v14H8z M14 5h3v14h-3z',
    stop: 'M6 6h12v12H6z',
    eye: 'M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6-10-6-10-6z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
    ai: 'M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6z M18.5 15l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z M5 14l.6 1.6L7.2 16l-1.6.6L5 18.2l-.6-1.6L2.8 16l1.6-.4z',
    gov: 'M3 21h18 M4 21V10 M20 21V10 M8 21V10 M12 21V10 M16 21V10 M2 10l10-6 10 6z',
    scale: 'M12 4v16 M6 20h12 M4 9h16 M4 9l-2.5 6a3 3 0 0 0 5 0z M20 9l-2.5 6a3 3 0 0 0 5 0z M12 5l-8 4 8-4 8 4z',
    drop: 'M12 3s6 6.5 6 10.5A6 6 0 0 1 6 13.5C6 9.5 12 3 12 3z',
    sun: 'M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10z M12 1v3M12 20v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M1 12h3M20 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1',
    cloud: 'M7 18a4 4 0 0 1 0-8 5.5 5.5 0 0 1 10.5 1.5A3.5 3.5 0 0 1 17 18z',
    package: 'M3 7l9-4 9 4v10l-9 4-9-4z M3 7l9 4 9-4 M12 11v10',
    phone: 'M7 2h10v20H7z M11 18h2',
    edit: 'M4 20h4L20 8l-4-4L4 16z M14 6l4 4',
    filter: 'M3 5h18l-7 8v6l-4 2v-8z',
    list: 'M4 6h16M4 12h16M4 18h16',
    calendar: 'M4 6h16v15H4z M4 10h16 M8 3v5M16 3v5',
    rupee: 'M7 4h10M7 9h10M16 4c0 4-3 5-6 5H7l8 11',
    weight: 'M6 8h12l2 13H4z M9 8a3 3 0 1 1 6 0',
    scan: 'M4 8V5a1 1 0 0 1 1-1h3 M16 4h3a1 1 0 0 1 1 1v3 M20 16v3a1 1 0 0 1-1 1h-3 M8 20H5a1 1 0 0 1-1-1v-3 M4 12h16',
    hand: 'M8 12V6a1.6 1.6 0 0 1 3.2 0v5 M11.2 11V4.8a1.6 1.6 0 0 1 3.2 0V11 M14.4 11V6.4a1.6 1.6 0 0 1 3.2 0V15a6 6 0 0 1-6 6h-.6a6 6 0 0 1-4.6-2.2L4 15.4a1.7 1.7 0 0 1 2.5-2.3L8 14.6',
    lock: 'M6 11h12v9H6z M9 11V8a3 3 0 0 1 6 0v3',
    flag: 'M5 21V4 M5 5h11l-2 3.5L16 12H5',
    book: 'M4 5a2 2 0 0 1 2-2h12v18H6a2 2 0 0 1-2-2z M8 3v18',
    volume: 'M4 10v4h3l4 4V6L7 10z M15 9a4 4 0 0 1 0 6 M18 6a8 8 0 0 1 0 12',
    trash: 'M4 7h16 M9 7V4h6v3 M6 7l1 14h10l1-14',
    info: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M12 11v6 M12 7.5h.01',
    lightbulb: 'M9 18h6 M10 21h4 M12 3a6 6 0 0 0-3.5 10.9V16h7v-2.1A6 6 0 0 0 12 3z',
    trend: 'M3 17l6-6 4 4 7-7 M20 8h-4 M20 8v4',
    doc: 'M6 3h8l4 4v14H6z M14 3v4h4 M9 12h6M9 16h6',
    grid: 'M4 4h7v7H4z M13 4h7v7h-7z M4 13h7v7H4z M13 13h7v7h-7z',
    logout: 'M14 4h5v16h-5 M10 8l-4 4 4 4 M6 12h9',
    heart: 'M12 20s-7-4.4-7-9.4A3.9 3.9 0 0 1 12 8a3.9 3.9 0 0 1 7 2.6c0 5-7 9.4-7 9.4z',
    bank: 'M3 10l9-5 9 5 M5 10v9h14v-9 M9 19v-6h6v6',
    copy: 'M9 9h11v11H9z M5 15H4V4h11v1',
    image: 'M4 5h16v14H4z M4 16l5-4 4 3 3-2 4 3 M9.5 9.5h.01',
    ruler: 'M3.5 14.5L14.5 3.5l6 6L9.5 20.5z M7 11l2 2 M10 8l2 2 M13 5l2 2',
    slot: 'M4 6h16v13H4z M4 10h16 M8 3v4 M16 3v4 M9 14h6'
  };
  function icon(name, size, cls) {
    const d = P[name] || P.info;
    const s = size || 22;
    return '<svg class="ic ' + (cls || '') + '" width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + d + '"/></svg>';
  }

  /* ---------------- tiny helpers ---------------- */
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = n => '₹' + Math.round(n || 0).toLocaleString('en-IN');
  const money1 = n => '₹' + (Math.round((n || 0) * 10) / 10);
  const kg = n => (Math.round((n || 0) * 10) / 10) + ' kg';
  const km = n => (Math.round((n || 0) * 10) / 10) + ' km';
  const pct = n => Math.round(n || 0) + '%';
  const el = (sel, root) => (root || document).querySelector(sel);
  const els = (sel, root) => Array.prototype.slice.call((root || document).querySelectorAll(sel));

  function pill(text, tone, ic) {
    return '<span class="pill ' + (tone || '') + '">' + (ic ? icon(ic, 13) : '') + '<span>' + esc(text) + '</span></span>';
  }
  function progress(v, tone, label) {
    return '<div class="prog"><div class="prog-bar ' + (tone || '') + '" style="width:' + clamp(v, 0, 100) + '%"></div></div>' +
      (label ? '<div class="prog-label">' + esc(label) + '</div>' : '');
  }
  function stat(o) {
    return '<div class="stat ' + (o.tone || '') + '">' +
      '<div class="stat-ic">' + icon(o.icon || 'chart', 20) + '</div>' +
      '<div class="stat-body"><div class="stat-v">' + esc(o.value) + '</div><div class="stat-l">' + esc(o.label) + '</div>' +
      (o.sub ? '<div class="stat-s">' + esc(o.sub) + '</div>' : '') + '</div></div>';
  }
  function section(title, right, body, cls) {
    return '<section class="sec ' + (cls || '') + '"><div class="sec-h"><h3>' + esc(title) + '</h3>' + (right || '') + '</div>' + body + '</section>';
  }
  function empty(msg, ic) {
    return '<div class="empty">' + icon(ic || 'box', 34) + '<p>' + esc(msg) + '</p></div>';
  }
  function btn(label, act, opts) {
    const o = opts || {};
    return '<button class="btn ' + (o.tone || 'primary') + ' ' + (o.size || '') + ' ' + (o.cls || '') + '"' +
      (act ? ' data-act="' + act + '"' : '') + (o.data ? ' ' + o.data : '') + (o.disabled ? ' disabled' : '') + '>' +
      (o.icon ? icon(o.icon, o.size === 'lg' ? 26 : 20) : '') + '<span>' + esc(label) + '</span></button>';
  }
  function bigAction(o) {
    return '<button class="bigact ' + (o.tone || '') + '" data-act="' + o.act + '" ' + (o.data || '') + '>' +
      '<span class="bigact-ic">' + icon(o.icon, o.iconSize || 30) + '</span>' +
      '<span class="bigact-t">' + esc(o.title) + '</span>' +
      (o.sub ? '<span class="bigact-s">' + esc(o.sub) + '</span>' : '') + '</button>';
  }

  /** The 30 / 70 rule made visually obvious */
  function stockSplit(freeKg, reservedKg, opts) {
    const o = opts || {};
    const total = freeKg + reservedKg || 1;
    const fp = Math.round(freeKg / total * 100), rp = 100 - fp;
    return '<div class="split">' +
      '<div class="split-bar">' +
      '<div class="split-free" style="width:' + fp + '%"><span>' + fp + '%</span></div>' +
      '<div class="split-res" style="width:' + rp + '%"><span>' + rp + '%</span></div>' +
      '</div>' +
      '<div class="split-legend">' +
      '<span class="lg free"><i></i>' + (o.freeLabel || 'Free / private') + ' · <b>' + kg(freeKg) + '</b></span>' +
      '<span class="lg res"><i></i>' + (o.resLabel || 'Reserved for AGRILINK customers') + ' · <b>' + kg(reservedKg) + '</b></span>' +
      '</div></div>';
  }

  function donut(segs, size, centerTop, centerSub) {
    const s = size || 120, r = s / 2 - 10, c = 2 * Math.PI * r;
    const total = segs.reduce((a, b) => a + b.value, 0) || 1;
    let off = 0;
    const arcs = segs.map(sg => {
      const len = sg.value / total * c;
      const d = '<circle cx="' + s / 2 + '" cy="' + s / 2 + '" r="' + r + '" fill="none" stroke="' + sg.color + '" stroke-width="' + (sg.width || 14) + '" stroke-dasharray="' + len + ' ' + (c - len) + '" stroke-dashoffset="' + (-off) + '" stroke-linecap="butt" transform="rotate(-90 ' + s / 2 + ' ' + s / 2 + ')"/>';
      off += len; return d;
    }).join('');
    return '<svg class="donut" width="' + s + '" height="' + s + '" viewBox="0 0 ' + s + ' ' + s + '">' +
      '<circle cx="' + s / 2 + '" cy="' + s / 2 + '" r="' + r + '" fill="none" stroke="#EDF2E9" stroke-width="14"/>' + arcs +
      (centerTop ? '<text x="50%" y="47%" text-anchor="middle" class="donut-v">' + esc(centerTop) + '</text>' : '') +
      (centerSub ? '<text x="50%" y="62%" text-anchor="middle" class="donut-l">' + esc(centerSub) + '</text>' : '') + '</svg>';
  }

  function bars(items, opts) {
    const o = opts || {};
    const max = Math.max.apply(null, items.map(i => i.value).concat([1]));
    const w = o.width || 320, h = o.height || 110, bw = Math.max(8, Math.min(38, (w - 20) / items.length - 8));
    let x = 12;
    const body = items.map(i => {
      const bh = Math.max(3, i.value / max * (h - 34));
      const r = '<g><rect x="' + x + '" y="' + (h - 20 - bh) + '" width="' + bw + '" height="' + bh + '" rx="4" fill="' + (i.color || '#2E9E5B') + '"/>' +
        '<text x="' + (x + bw / 2) + '" y="' + (h - 24 - bh) + '" text-anchor="middle" class="bar-v">' + (o.fmt ? o.fmt(i.value) : i.value) + '</text>' +
        '<text x="' + (x + bw / 2) + '" y="' + (h - 6) + '" text-anchor="middle" class="bar-l">' + esc(i.label) + '</text></g>';
      x += bw + 8; return r;
    }).join('');
    return '<svg class="bars" width="100%" viewBox="0 0 ' + Math.max(w, x) + ' ' + h + '" preserveAspectRatio="xMidYMid meet">' + body + '</svg>';
  }

  function sparkline(values, opts) {
    const o = opts || {};
    const w = o.width || 140, h = o.height || 34;
    const max = Math.max.apply(null, values.concat([1])), min = Math.min.apply(null, values.concat([0]));
    const pts = values.map((v, i) => [(i / Math.max(1, values.length - 1)) * (w - 4) + 2, h - 3 - ((v - min) / Math.max(0.001, max - min)) * (h - 8)]);
    const d = pts.map((p, i) => (i ? 'L' : 'M') + round(p[0], 1) + ' ' + round(p[1], 1)).join(' ');
    return '<svg class="spark" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '">' +
      '<path d="' + d + ' L' + (w - 2) + ' ' + h + ' L2 ' + h + ' Z" fill="' + (o.fill || 'rgba(46,158,91,.14)') + '"/>' +
      '<path d="' + d + '" fill="none" stroke="' + (o.stroke || '#2E9E5B') + '" stroke-width="2" stroke-linecap="round"/></svg>';
  }

  function gauge(value, label, tone) {
    const v = clamp(value, 0, 100);
    return '<div class="gauge ' + (tone || '') + '"><svg viewBox="0 0 100 56" class="gauge-svg">' +
      '<path d="M8 50a42 42 0 0 1 84 0" fill="none" stroke="#E7EDE3" stroke-width="10" stroke-linecap="round"/>' +
      '<path d="M8 50a42 42 0 0 1 84 0" fill="none" stroke="currentColor" stroke-width="10" stroke-linecap="round" stroke-dasharray="' + (v / 100 * 132) + ' 132"/>' +
      '</svg><div class="gauge-v">' + Math.round(v) + '<small>%</small></div><div class="gauge-l">' + esc(label) + '</div></div>';
  }

  /* ---------------- mock map ---------------- */
  const KM_LAT = 110.574, KM_LNG_AT = lat => 111.320 * Math.cos(lat * Math.PI / 180);
  function mapSVG(o) {
    const opt = Object.assign({ width: 360, height: 220, points: [], routes: [], padding: 0.32 }, o);
    const pts = opt.points.filter(p => p && isFinite(p.lat) && isFinite(p.lng));
    const routePts = (opt.routes || []).reduce((a, r) => a.concat(r.points || []), []);
    const all = pts.concat(routePts);
    if (opt.center) all.push(opt.center);
    if (!all.length) return '<div class="map map-empty">No location data</div>';

    let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
    all.forEach(p => { minLat = Math.min(minLat, p.lat); maxLat = Math.max(maxLat, p.lat); minLng = Math.min(minLng, p.lng); maxLng = Math.max(maxLng, p.lng); });
    if (opt.radiusKm) { const dLat = opt.radiusKm / KM_LAT; minLat -= dLat; maxLat += dLat; const dLng = opt.radiusKm / KM_LNG_AT((minLat + maxLat) / 2); minLng -= dLng; maxLng += dLng; }
    const cLat = (opt.center ? opt.center.lat : (minLat + maxLat) / 2);
    const cLng = (opt.center ? opt.center.lng : (minLng + maxLng) / 2);
    const W = opt.width, H = opt.height;
    const spanLngKm = Math.max(2, (maxLng - minLng) * KM_LNG_AT(cLat));
    const spanLatKm = Math.max(2, (maxLat - minLat) * KM_LAT);
    const pxPerKm = Math.min(W / spanLngKm, H / spanLatKm) * (1 - opt.padding);
    const X = lng => W / 2 + (lng - cLng) * KM_LNG_AT(cLat) * pxPerKm;
    const Y = lat => H / 2 - (lat - cLat) * KM_LAT * pxPerKm;

    let s = '<svg class="map" viewBox="0 0 ' + W + ' ' + H + '" width="100%" height="' + H + '" preserveAspectRatio="xMidYMid slice" role="img">';
    s += '<defs><pattern id="fld" width="26" height="26" patternUnits="userSpaceOnUse"><rect width="26" height="26" fill="#F2F8EC"/><path d="M0 13h26M13 0v26" stroke="#E4EFD9" stroke-width="1"/></pattern>' +
      '<linearGradient id="riv" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#BFE3F5"/><stop offset="1" stop-color="#9FD3EE"/></linearGradient></defs>';
    s += '<rect width="' + W + '" height="' + H + '" fill="url(#fld)"/>';
    /* mock river + highway for an "Indian district map" feel */
    s += '<path d="M-10 ' + (H * .72) + ' C ' + (W * .25) + ' ' + (H * .58) + ', ' + (W * .5) + ' ' + (H * .88) + ', ' + (W + 10) + ' ' + (H * .6) + '" stroke="url(#riv)" stroke-width="7" fill="none" opacity=".85"/>';
    s += '<path d="M-10 ' + (H * .22) + ' L ' + (W + 10) + ' ' + (H * .34) + '" stroke="#FFF3D6" stroke-width="8" fill="none"/><path d="M-10 ' + (H * .22) + ' L ' + (W + 10) + ' ' + (H * .34) + '" stroke="#F0C86A" stroke-width="1.6" stroke-dasharray="9 7" fill="none"/>';
    s += '<path d="M' + (W * .18) + ' -10 L ' + (W * .42) + ' ' + (H + 10) + '" stroke="#FFF3D6" stroke-width="7" fill="none"/><path d="M' + (W * .18) + ' -10 L ' + (W * .42) + ' ' + (H + 10) + '" stroke="#F0C86A" stroke-width="1.4" stroke-dasharray="9 7" fill="none"/>';

    if (opt.radiusKm) {
      const r = opt.radiusKm * pxPerKm;
      s += '<circle cx="' + X(cLng) + '" cy="' + Y(cLat) + '" r="' + r + '" fill="rgba(46,158,91,.10)" stroke="#2E9E5B" stroke-width="2" stroke-dasharray="7 6"/>';
      s += '<text x="' + (X(cLng) + r * .71) + '" y="' + (Y(cLat) - r * .71) + '" class="map-lbl r">' + opt.radiusKm + ' km</text>';
    }
    /* routes */
    (opt.routes || []).forEach(r => {
      const rp = (r.points || []).filter(Boolean);
      if (rp.length < 2) return;
      const d = rp.map((p, i) => (i ? 'L' : 'M') + round(X(p.lng), 1) + ' ' + round(Y(p.lat), 1)).join(' ');
      s += '<path d="' + d + '" fill="none" stroke="' + (r.color || '#0E7C86') + '" stroke-width="' + (r.width || 6) + '" stroke-opacity=".25" stroke-linecap="round" stroke-linejoin="round"/>';
      s += '<path class="route-line" d="' + d + '" fill="none" stroke="' + (r.color || '#0E7C86') + '" stroke-width="' + (r.width ? r.width - 3 : 3) + '" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="10 8"/>';
    });
    /* points */
    pts.forEach(p => {
      const x = round(X(p.lng), 1), y = round(Y(p.lat), 1);
      const col = p.color || '#2E9E5B';
      if (p.kind === 'route-num') {
        s += '<g><circle cx="' + x + '" cy="' + y + '" r="11" fill="#fff" stroke="' + col + '" stroke-width="3"/><text x="' + x + '" y="' + (y + 4.5) + '" text-anchor="middle" class="map-num" fill="' + col + '">' + esc(p.label) + '</text></g>';
      } else if (p.pulse) {
        s += '<g><circle class="pulse" cx="' + x + '" cy="' + y + '" r="10" fill="' + col + '" opacity=".25"/><circle cx="' + x + '" cy="' + y + '" r="7" fill="' + col + '" stroke="#fff" stroke-width="2.5"/></g>';
      } else {
        s += '<g><path d="M' + x + ' ' + (y + 13) + 'c0 0 9-8.5 9-14a9 9 0 1 0-18 0c0 5.5 9 14 9 14z" fill="' + col + '" stroke="#fff" stroke-width="2"/><circle cx="' + x + '" cy="' + (y - 1) + '" r="3.4" fill="#fff"/></g>';
      }
      if (p.label) s += '<text x="' + x + '" y="' + (y + 26) + '" text-anchor="middle" class="map-lbl">' + esc(p.label) + '</text>';
    });
    s += '</svg>';
    if (opt.legend && opt.legend.length) {
      s += '<div class="map-legend">' + opt.legend.map(l => '<span><i style="background:' + l.color + '"></i>' + esc(l.label) + '</span>').join('') + '</div>';
    }
    return '<div class="map-wrap">' + s + '</div>';
  }

  /* ---------------- toasts / modal ---------------- */
  function toast(msg, tone, ms) {
    const root = document.getElementById('toasts'); if (!root) return;
    const t = document.createElement('div');
    t.className = 'toast ' + (tone || '');
    t.innerHTML = icon(tone === 'bad' ? 'alert' : tone === 'warn' ? 'alert' : 'check', 18) + '<span>' + esc(msg) + '</span>';
    root.appendChild(t);
    setTimeout(() => { t.classList.add('in'); }, 10);
    setTimeout(() => { t.classList.remove('in'); setTimeout(() => t.remove(), 320); }, ms || 2800);
  }

  let modalOpen = null;
  function modal(o) {
    closeModal();
    const root = document.getElementById('modalRoot'); if (!root) return;
    const wrap = document.createElement('div');
    wrap.className = 'modal-wrap' + (o.sheet ? ' sheet' : '');
    wrap.innerHTML = '<div class="modal-bg" data-close="1"></div><div class="modal ' + (o.tone || '') + ' ' + (o.wide ? 'wide' : '') + '" role="dialog" aria-modal="true">' +
      (o.title ? '<div class="modal-h">' + (o.icon ? icon(o.icon, 22) : '') + '<h3>' + esc(o.title) + '</h3>' + (o.close !== false ? '<button class="icbtn" data-close="1" aria-label="Close">' + icon('x', 20) + '</button>' : '') + '</div>' : '') +
      '<div class="modal-b">' + (o.body || '') + '</div>' +
      (o.actions ? '<div class="modal-f">' + o.actions.map((a, i) => btn(a.label, null, { tone: a.tone, icon: a.icon, size: a.size, data: 'data-mi="' + i + '"' })).join('') + '</div>' : '') +
      '</div>';
    root.appendChild(wrap);
    modalOpen = wrap;
    requestAnimationFrame(() => wrap.classList.add('in'));
    wrap.addEventListener('click', e => {
      const c = e.target.closest('[data-close]'); if (c) { closeModal(); if (o.onClose) o.onClose(); return; }
      const b = e.target.closest('[data-mi]');
      if (b && o.actions) { const a = o.actions[+b.dataset.mi]; if (a.keepOpen !== true) closeModal(); if (a.onClick) a.onClick(); }
    });
    return wrap;
  }
  function closeModal() { if (modalOpen) { modalOpen.remove(); modalOpen = null; } }
  function confirmBox(title, msg, onYes, yesLabel) {
    modal({
      title, icon: 'info', body: '<p class="muted big">' + esc(msg) + '</p>',
      actions: [{ label: AG.I18N.t(AG.store.state.lang || 'en', 'cancel'), tone: 'ghost', onClick: null }, { label: yesLabel || 'Yes', tone: 'primary', onClick: onYes }]
    });
  }

  /* ---------------- voice (browser built-in, degrades gracefully) ---------------- */
  const Voice = {
    supported() { return typeof speechSynthesis !== 'undefined'; },
    pickVoice(tag) {
      if (!Voice.supported()) return null;
      const vs = speechSynthesis.getVoices() || [];
      if (!vs.length) return null;
      const exact = vs.find(v => v.lang && v.lang.toLowerCase() === tag.toLowerCase());
      const base = tag.split('-')[0];
      return exact || vs.find(v => v.lang && v.lang.toLowerCase().startsWith(base)) || vs.find(v => /en-IN/i.test(v.lang)) || vs[0];
    },
    speak(text, tag) {
      if (!Voice.supported() || !AG.store.state.settings.voice) return false;
      try {
        speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(String(text).slice(0, 600));
        u.lang = tag || 'en-IN';
        const v = Voice.pickVoice(u.lang); if (v) u.voice = v;
        u.rate = 0.95; u.pitch = 1;
        speechSynthesis.speak(u);
        return true;
      } catch (e) { return false; }
    },
    stop() { try { if (Voice.supported()) speechSynthesis.cancel(); } catch (e) { } },
    recSupported() {
      const SR = g.SpeechRecognition || g.webkitSpeechRecognition;
      let ok = false; try { ok = !!new SR(); } catch (e) { ok = false; }
      return ok;
    },
    listen(tag, onResult, onEnd) {
      const SR = g.SpeechRecognition || g.webkitSpeechRecognition;
      if (!SR) { onEnd && onEnd('unsupported'); return null; }
      try {
        const r = new SR();
        r.lang = tag || 'en-IN'; r.interimResults = false; r.maxAlternatives = 1; r.continuous = false;
        r.onresult = e => { const t = e.results[0][0].transcript; onResult && onResult(t); };
        r.onerror = e => onEnd && onEnd('error:' + e.error);
        r.onend = () => onEnd && onEnd('done');
        r.start(); return r;
      } catch (e) { onEnd && onEnd('error'); return null; }
    }
  };

  /* ---------------- render + bind ---------------- */
  function render(container, view) {
    if (!container) return;
    container.innerHTML = view.html || '';
    if (view.handlers) bind(container, view.handlers);
    if (view.after) view.after(container);
    return container;
  }
  function bind(root, handlers) {
    els('[data-act]', root).forEach(node => {
      const spec = node.getAttribute('data-act') || '';
      const parts = spec.split('@');
      const name = parts[0], evt = parts[1];
      const fn = handlers[spec] || handlers[name];
      if (typeof fn !== 'function') return;
      node.addEventListener(evt || 'click', e => {
        if (node.dataset.stop !== undefined) e.stopPropagation();
        fn(node, e, node.dataset);
      });
    });
  }

  /* status meta used across all five apps */
  const CROP_STATUS = {
    draft: { label: 'Draft', tone: 'grey', step: 0 },
    posted: { label: 'Posted', tone: 'blue', step: 1 },
    matched: { label: 'Vendors notified', tone: 'blue', step: 2 },
    bidding: { label: 'Bidding open', tone: 'amber', step: 3 },
    awarded: { label: 'Bid won', tone: 'green', step: 4 },
    pickup_scheduled: { label: 'Pickup scheduled', tone: 'green', step: 5 },
    in_inventory: { label: 'In vendor inventory', tone: 'green', step: 6 },
    selling: { label: 'Selling', tone: 'green', step: 7 },
    sold_out: { label: 'Sold out', tone: 'grey', step: 8 },
    cancelled: { label: 'Cancelled', tone: 'red', step: -1 }
  };
  const ORDER_STATUS = {
    placed: { label: 'Placed', tone: 'blue', step: 1 },
    confirmed: { label: 'Confirmed', tone: 'blue', step: 2 },
    ready: { label: 'Packed / Ready', tone: 'cyan', step: 3 },
    assigned: { label: 'Partner assigned', tone: 'cyan', step: 4 },
    picked_up: { label: 'Picked up', tone: 'amber', step: 5 },
    out_for_delivery: { label: 'Out for delivery', tone: 'amber', step: 6 },
    delivered: { label: 'Delivered', tone: 'green', step: 7 },
    completed: { label: 'Completed', tone: 'green', step: 8 },
    cancelled: { label: 'Cancelled', tone: 'red', step: 0 }
  };
  const ROUTE_STATUS = {
    open: { label: 'Available job', tone: 'blue' },
    assigned: { label: 'Assigned', tone: 'cyan' },
    to_vendor: { label: 'Going to vendor', tone: 'amber' },
    picked_up: { label: 'Picked up', tone: 'amber' },
    delivering: { label: 'Out for delivery', tone: 'violet' },
    completed: { label: 'Completed', tone: 'green' }
  };

  function stepper(steps, currentIdx, tone) {
    return '<div class="stepper">' + steps.map((s, i) =>
      '<div class="stp ' + (i < currentIdx ? 'done' : i === currentIdx ? 'now' : '') + '">' +
      '<span class="stp-dot">' + (i < currentIdx ? icon('check', 12) : i + 1) + '</span>' +
      '<span class="stp-l">' + esc(s) + '</span></div>' +
      (i < steps.length - 1 ? '<span class="stp-line ' + (i < currentIdx ? 'done' : '') + '"></span>' : '')).join('') + '</div>';
  }

  AG.ui = {
    icon, esc, money, money1, kg, km, pct, el, els,
    pill, progress, stat, section, empty, btn, bigAction, stockSplit, donut, bars, sparkline, gauge,
    mapSVG, toast, modal, closeModal, confirmBox, Voice, render, bind, stepper,
    CROP_STATUS, ORDER_STATUS, ROUTE_STATUS
  };
})(typeof window !== 'undefined' ? window : globalThis);
