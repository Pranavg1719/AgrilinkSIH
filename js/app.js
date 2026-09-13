/* ============================================================
   AGRILINK — App shell / router
   Role switcher · device frame · tab bar · live health pill
   ============================================================ */
(function (g) {
  'use strict';
  const AG = g.AG, U = AG.ui, S = AG.store, I18N = AG.I18N;
  const { icon, el, esc } = U;

  const ROLES = [
    { id: 'farmer', label: 'Farmer', short: 'Farmer', icon: 'sprout', wide: false, persona: 'Vijay Pawar · Saswad' },
    { id: 'vendor', label: 'Inventory Vendor', short: 'Vendor', icon: 'store', wide: false, persona: 'GreenMandi Traders · Pune' },
    { id: 'partner', label: 'Delivery Partner', short: 'Delivery', icon: 'truck', wide: false, persona: 'Imran Shaikh · Tempo' },
    { id: 'customer', label: 'Customer', short: 'Customer', icon: 'cart', wide: false, persona: 'Aarti Deshpande · Kothrud' },
    { id: 'gov', label: 'Government Control', short: 'Government', icon: 'gov', wide: true, persona: 'Dept. of Agriculture · Maharashtra' },
    { id: 'center', label: 'AI / Algorithm Center', short: 'Algorithms', icon: 'ai', wide: true, persona: 'Simulated engines' }
  ];

  const DEFAULT_TAB = { farmer: 'home', vendor: 'home', partner: 'home', customer: 'home', gov: 'overview', center: 'a1' };
  let nav = {};
  let sideNote = '';
  let frozen = false;
  let lastScroll = 0;

  /* ---------------- helpers ---------------- */
  function wait(ms) { return new Promise(r => setTimeout(r, AG.app.speed(ms))); }
  function speed(ms) { return Math.round(ms * (S.state.settings.demoMode ? 0.4 : 1) * (S.state.settings.animationSpeed || 1)); }

  function applyLang() {
    const code = S.state.lang || 'en';
    const m = I18N.meta(code);
    document.body.setAttribute('dir', m.dir);
    document.documentElement.setAttribute('dir', m.dir);
    document.documentElement.setAttribute('lang', code);
    document.body.classList.toggle('rtl', m.dir === 'rtl');
  }
  function t(key, vars) { return I18N.t(S.state.lang || 'en', key, vars); }

  function badge(role) {
    const st = S.state;
    if (role === 'farmer') return S.unreadCount('farmer', st.currentFarmer);
    if (role === 'vendor') return S.unreadCount('vendor', st.currentVendor);
    if (role === 'partner') {
      const open = st.routes.filter(r => r.status === 'open').length;
      return S.unreadCount('partner', st.currentPartner) + (open ? 0 : 0) || 0;
    }
    if (role === 'customer') return st.cart.length;
    if (role === 'gov') return st.alerts.filter(a => a.status === 'open').length;
    return 0;
  }

  /* ---------------- top bar ---------------- */
  function renderRoleSwitch() {
    const root = el('#roleSwitch'); if (!root) return;
    root.innerHTML = ROLES.map(r => {
      const b = badge(r.id);
      return '<button class="rchip" role="tab" data-role="' + r.id + '" aria-selected="' + (S.state.role === r.id) + '">' +
        icon(r.icon, 18) + '<span>' + esc(r.short) + '</span>' +
        (b ? '<span class="badge">' + (b > 99 ? '99+' : b) + '</span>' : '') + '</button>';
    }).join('');
    root.onclick = e => {
      const b = e.target.closest('[data-role]'); if (!b) return;
      go(b.dataset.role);
    };
  }

  function renderHealth() {
    const pill = el('#healthPill'), txt = el('#healthTxt');
    if (!pill || !txt) return;
    const h = AG.algo.pipelineHealth(S.state);
    pill.className = 'healthpill ' + (h.status === 'OPERATIONAL' ? '' : h.status === 'DEGRADED' ? 'warn' : 'bad');
    txt.textContent = h.status === 'OPERATIONAL' ? 'ALL SYSTEMS OPERATIONAL' : h.headline;
    pill.title = 'Algorithm 4 — pipeline health: ' + h.score + '% · ' + h.checks.filter(c => c.level !== 'ok').length + ' check(s) need attention';
  }

  /* ---------------- stage ---------------- */
  function deviceHTML(appHTML, tabsHTML) {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0'), mm = String(now.getMinutes()).padStart(2, '0');
    return '<div class="device"><div class="device-screen">' +
      '<div class="notch"></div>' +
      '<div class="statusbar"><span>' + hh + ':' + mm + '</span><span>AGRILINK · mock GPS · 4G ▮▮▮ ▰</span></div>' +
      '<div class="screen" id="screen">' + appHTML + '</div>' +
      '<nav class="tabbar" id="tabbar" role="tablist">' + tabsHTML + '</nav>' +
      '</div></div>' +
      (sideNote ? '<aside class="side-note">' + sideNote + '</aside>' : '');
  }

  function renderStage() {
    const stage = el('#stage'); if (!stage) return;
    const role = S.state.role;
    if (!S.state.welcomed) { renderWelcome(stage); return; }
    const app = AG.apps[role];
    if (!app) { renderWelcome(stage); return; }

    const cur = nav[role] || { tab: DEFAULT_TAB[role], params: {} };
    sideNote = app.sideNote ? app.sideNote(cur) : defaultSideNote(role);

    if (app.wide) {
      stage.className = 'stage-wide';
      stage.innerHTML = '<div class="wide" id="wideRoot"></div>' + (sideNote ? '<aside class="side-note">' + sideNote + '</aside>' : '');
      const view = app.render(cur.tab, cur.params);
      const wr = el('#wideRoot');
      if (!wr) return;
      U.render(wr, view);
    } else {
      stage.className = 'stage-device';
      const view = app.render(cur.tab, cur.params);
      const tabs = (app.tabs || []).map(tb =>
        '<button class="tab ' + (tb.fab ? 'center-fab' : '') + '" role="tab" data-tab="' + tb.id + '" aria-selected="' + (cur.tab === tb.id) + '">' +
        (tb.fab ? '<span class="fab">' + icon(tb.icon, 26) + '</span>' : icon(tb.icon, 23)) +
        '<span>' + esc(tb.label) + '</span>' +
        (tb.badge ? '<span class="nb">' + tb.badge() + '</span>' : '') +
        '</button>').join('');
      /* Build the frame first, then inject the screen. An unbalanced tag inside a
         screen can then never swallow the tab bar (parser closes it at #screen). */
      stage.innerHTML = deviceHTML('', tabs);
      const sc = el('#screen');
      if (!sc) return;
      U.render(sc, view);
      sc.scrollTop = (nav[role] && nav[role].keepScroll) ? lastScroll : 0;
      const tb = el('#tabbar');
      if (tb) tb.onclick = e => {
        const b = e.target.closest('[data-tab]'); if (!b) return;
        go(role, b.dataset.tab, {});
      };
    }
    renderRoleSwitch();
    renderHealth();
  }

  function defaultSideNote(role) {
    const notes = {
      farmer: ['Farmer app', 'Large icons, minimal text, 13 Indian languages. The whole selling journey: photo → AI analysis → radius → vendor matching → bidding → pickup → payment.'],
      vendor: ['Inventory Vendor app', 'Opportunities are scored by Algorithm 2 on 8 factors. Every batch is split 30% free / 70% reserved — the UI hard-blocks over-allocation.'],
      partner: ['Delivery Partner app', 'Orders in the same slot are grouped into one optimised route. Watch the km saved versus individual trips.'],
      customer: ['Customer app', 'Only the 70% reserved stock is visible here, with full traceability back to the farmer and the tracking ID.']
    };
    const n = notes[role];
    if (!n) return '';
    return '<div class="card dark"><div class="card-h"><div class="card-ic" style="background:rgba(255,255,255,.16);color:#CFEFD8">' + icon('info', 20) + '</div>' +
      '<div><div class="card-t" style="color:#fff">' + esc(n[0]) + '</div><div class="card-s" style="color:#B6D6BC;margin-top:5px;line-height:1.5">' + esc(n[1]) + '</div></div></div>' +
      '<div style="margin-top:12px">' + U.btn('Open Government view', null, { tone: 'soft', icon: 'gov', size: 'sm', cls: 'block', data: 'data-goto="gov"' }) + '</div>' +
      '<p class="muted" style="font-size:12px;margin-top:10px;color:#B6D6BC">Prototype — all data, AI results, GPS, payments and notifications are simulated locally in your browser.</p></div>';
  }

  /* ---------------- welcome / role select ---------------- */
  function renderWelcome(stage) {
    stage.className = 'stage-wide';
    const cards = ROLES.map(r =>
      '<button class="bigact" data-pick="' + r.id + '" style="min-height:132px">' +
      '<span class="bigact-ic">' + icon(r.icon, 28) + '</span>' +
      '<span class="bigact-t">' + esc(r.label) + '</span>' +
      '<span class="bigact-s">' + esc(r.persona) + '</span></button>').join('');
    stage.innerHTML =
      '<div style="width:100%;max-width:1000px;margin:0 auto;padding:10px 4px 30px">' +
      '<div class="card dark" style="padding:22px;margin-bottom:16px">' +
      '<div class="row" style="gap:14px;flex-wrap:wrap">' +
      '<div class="card-ic" style="width:58px;height:58px;border-radius:18px;background:rgba(255,255,255,.16);color:#CFEFD8">' + icon('leaf', 30) + '</div>' +
      '<div class="grow"><h2 style="color:#fff;font-size:26px">AGRILINK</h2>' +
      '<p style="color:#B6D6BC;font-size:14.5px;margin-top:4px;font-weight:600">One transparent chain from the farm gate to the kitchen — with government monitoring on top.</p></div></div>' +
      '<div class="pipe" style="margin-top:18px">' +
      ['FARMER|sprout|Harvest + AI grading', 'VENDOR|store|Buy · 30/70 stock rule', 'DELIVERY|truck|Optimised slot routes', 'CUSTOMER|cart|Fresh · traceable']
        .map((s, i, a) => {
          const p = s.split('|');
          return '<div class="pipe-node" style="background:rgba(255,255,255,.10);border-color:rgba(255,255,255,.18)">' +
            '<div class="ic" style="background:rgba(255,255,255,.14);border-color:rgba(255,255,255,.2);color:#CFEFD8">' + icon(p[1], 20) + '</div>' +
            '<b style="color:#fff">' + esc(p[0]) + '</b><div class="n" style="color:#B6D6BC">' + esc(p[2]) + '</div></div>' +
            (i < a.length - 1 ? '<div class="pipe-arrow" style="color:#7FA98C">' + icon('right', 20) + '</div>' : '');
        }).join('') + '</div>' +
      '<div style="margin-top:14px" class="row wrap">' +
      '<span class="pill" style="background:rgba(255,255,255,.14);color:#DCEBDF">GOVERNMENT CONTROL SYSTEM oversees every stage</span>' +
      '<span class="pill" style="background:rgba(255,255,255,.14);color:#DCEBDF">4 AI algorithms</span>' +
      '</div></div>' +
      '<div class="sec-h" style="padding:0 2px 10px"><h3 style="font-size:19px">Select your interface</h3></div>' +
      '<div class="grid-actions" style="padding:0;grid-template-columns:repeat(auto-fit,minmax(210px,1fr))">' + cards + '</div>' +
      '</div>';
    stage.onclick = e => {
      const p = e.target.closest('[data-pick]');
      if (p) { S.state.welcomed = true; go(p.dataset.pick); return; }
      const gt = e.target.closest('[data-goto]'); if (gt) go(gt.dataset.goto);
    };
    renderRoleSwitch(); renderHealth();
  }

  /* ---------------- navigation ---------------- */
  function go(role, tab, params, opts) {
    const st = S.state;
    if (role && role !== st.role) { st.role = role; }
    st.welcomed = true;
    const app = AG.apps[role || st.role];
    nav[role || st.role] = { tab: tab || (nav[role || st.role] && nav[role || st.role].tab) || DEFAULT_TAB[role || st.role], params: params || {}, keepScroll: !!(opts && opts.keepScroll) };
    S.save();
    renderStage();
    const sc = el('#screen'); if (sc && !(opts && opts.keepScroll)) sc.scrollTop = 0;
  }
  function currentNav() { const r = S.state.role; return nav[r] || { tab: DEFAULT_TAB[r], params: {} }; }

  let rafId = null;
  function refresh(force) {
    if (frozen && !force) return;
    if (!force) {
      const ae = document.activeElement;
      const sc = el('#screen');
      if (ae && sc && sc.contains(ae) && /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName) && !ae.dataset.forceRefresh) return;
    }
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(() => {
      rafId = null;
      const sc = el('#screen'); if (sc) lastScroll = sc.scrollTop;
      renderStage();
    });
  }

  /* ---------------- init ---------------- */
  let booted = false;
  /* Mobile browser chrome (URL bar, gesture bar) makes 100vh wrong; we size the app
     shell from the *visible* viewport (dvh) minus the measured topbar height. */
  function measureChrome() {
    try {
      const tb = document.querySelector('.topbar');
      if (tb && tb.offsetHeight) document.documentElement.style.setProperty('--tbh', tb.offsetHeight + 'px');
    } catch (e) { }
  }
  function applyDeepLink() {
    let qs;
    try { qs = new URLSearchParams(g.location.search || ''); } catch (e) { return; }
    if (qs.get('reset') === '1') { S.hardReset(); }
    const role = qs.get('role');
    if (role && AG.apps[role]) { S.state.role = role; S.state.welcomed = true; }
    const tab = qs.get('tab');
    if (role && tab && AG.apps[role]) nav[role] = { tab: tab, params: {} };
  }
  function init() {
    if (booted) return; booted = true;
    S.init();
    applyDeepLink();
    AG.app.t = t;
    applyLang();
    ROLES.forEach(r => { nav[r.id] = { tab: DEFAULT_TAB[r.id], params: {} }; });
    if (S.state.navHistory) { try { Object.assign(nav, S.state.navHistory); } catch (e) { } }
    document.addEventListener('click', e => {
      const gt = e.target.closest('[data-goto]'); if (gt) go(gt.dataset.goto);
    });

    S.subscribe(evt => {
      if (evt === 'lang') { applyLang(); refresh(true); return; }
      if (evt === 'role') { renderStage(); return; }
      refresh(false);
    });

    renderStage();
    measureChrome(); setTimeout(measureChrome, 400);
    g.addEventListener('resize', measureChrome);
    g.addEventListener('orientationchange', () => setTimeout(measureChrome, 250));
    setInterval(renderHealth, 20000);
    if (typeof speechSynthesis !== 'undefined') { try { speechSynthesis.onvoiceschanged = () => { }; speechSynthesis.getVoices(); } catch (e) { } }
  }

  AG.app = {
    ROLES, init, go, refresh, wait, speed, t, applyLang,
    get booted() { return booted; },
    freeze: v => { frozen = v; },
    setSideNote: h => { sideNote = h; },
    nav: () => nav,
    currentNav,
    setNav(role, tab, params) { nav[role] = { tab, params: params || {} }; }
  };
})(typeof window !== 'undefined' ? window : globalThis);
