/* ============================================================
   AGRILINK — FARMER APP  (simple, clean, reference-style UI)
   Splash → Login → Verification → Home → Add sheet → Camera
   → Media saved → AI analysis → radius → 3 vendors → bids.
   Low-literacy friendly: big icons, short text, one action/screen.
   ============================================================ */
(function (g) {
  'use strict';
  const AG = g.AG, U = AG.ui, S = AG.store, I18N = AG.I18N;
  const { icon, esc, money, money1, kg, km, pill } = U;
  const { cropArt, CROPS, CROP_BY_KEY, MAX_VENDORS_PER_CROP } = AG.catalog;
  const { roadKm, round, timeAgo, fmtDate, clamp } = AG.util;

  const tt = (k, v) => I18N.t(S.state.lang || 'en', k, v);
  const ttsTag = () => I18N.meta(S.state.lang || 'en').tts;
  function say(text) { if (S.state.settings.voice) U.Voice.speak(text, ttsTag()); }
  function farmer() { return S.farmer() || S.state.farmers[0]; }
  function myCrops() { return S.state.crops.filter(c => c.farmerId === farmer().id); }
  const el0 = s => document.querySelector(s);

  /* wizard / screen state */
  const L = {
    cropKey: null, seed: 1, qty: 900, radius: 30, analysis: null, cropId: null,
    preview: null, previewCrop: null, mode: 'photo', recSec: 0, recTimer: null,
    captured: false, draft: '', listening: false, video: false
  };
  let onboardMode = false;
  let backStack = [], lastTab = null;
  function goBack() { const p = backStack.pop(); if (p) AG.app.go('farmer', p.tab, p.params); else AG.app.go('farmer', 'home'); }

  /* ============================================================
     ONBOARDING — splash / login / verification
     ============================================================ */
  function leafMark(size) {
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M20 4c0 9-5.5 14-12 14H5c0-8 5-13 12-13 1.5 0 3 0 3-.0z" fill="currentColor" fill-opacity=".16"/><path d="M5 20c2-5 5-8 9-10"/></svg>';
  }
  function fieldIllus() {
    return '<svg class="illus" viewBox="0 0 360 120" preserveAspectRatio="none" aria-hidden="true">' +
      '<rect width="360" height="120" fill="#E8F4E4"/>' +
      '<circle cx="300" cy="34" r="16" fill="#FFE9A8"/>' +
      '<path d="M0 78 Q90 58 180 74 T360 70 V120 H0 Z" fill="#BFE3B4"/>' +
      '<path d="M0 92 Q120 74 240 90 T360 88 V120 H0 Z" fill="#8FCC85"/>' +
      '<g stroke="#5BAF57" stroke-width="3" stroke-linecap="round">' +
      [30, 70, 110, 150, 190, 230, 270, 310, 345].map(x => '<path d="M' + x + ' 108 q3 -12 0 -18 M' + x + ' 104 q-6 -4 -8 -9 M' + x + ' 104 q6 -4 8 -9"/>').join('') +
      '</g>' +
      '<g fill="#6B4F2E"><rect x="52" y="86" width="26" height="12" rx="3"/><circle cx="58" cy="100" r="5"/><circle cx="72" cy="100" r="7"/></g>' +
      '<g fill="#C0563B"><path d="M296 96 h22 l-3 -12 h-16 z"/><rect x="300" y="78" width="14" height="8" fill="#8A3B28"/></g>' +
      '</svg>';
  }

  function screenSplash() {
    return {
      html: '<div class="sp2">' +
        '<div class="sp2-top">' + leafMark(84) +
        '<h1>Agri<span>link</span></h1>' +
        '<div class="sp2-tag">' + esc(tt('splash.tag')) + '</div></div>' +
        '<div class="sp2-mid">' + fieldIllus() + '</div>' +
        '<div class="sp2-bot">' +
        '<div class="sp2-sub">' + esc(tt('splash.sub')) + '</div>' +
        '<button class="btn2 big" data-act="splashGo">' + esc(tt('splash.go')) + '</button>' +
        '<div class="sp2-lang"><button class="lnk" data-act="go" data-tab="language">' + icon('globe', 15) + esc(tt('choose.language')) + '</button></div>' +
        '</div></div>',
      handlers: base({
        splashGo: () => { S.state.onboard.splash = true; S.save(); say(tt('login.welcome')); AG.app.refresh(true); }
      })
    };
  }

  function screenLogin() {
    return {
      html: '<div class="lg2">' +
        '<div class="lg2-logo">' + leafMark(40) + '<b>Agri<span>link</span></b></div>' +
        '<div class="lg2-tag">' + esc(tt('splash.tag')) + '</div>' +
        '<h2>' + esc(tt('login.welcome')) + '</h2>' +
        '<p class="sub2">' + esc(tt('login.sub')) + '</p>' +
        '<label class="fld2">' + icon('phone', 19) +
        '<input id="lgMobile" type="tel" inputmode="numeric" placeholder="' + esc(tt('login.mobile.ph')) + '" value="+91 98765 43210">' +
        '<span class="fld2-l">' + esc(tt('login.mobile')) + '</span></label>' +
        '<label class="fld2">' + icon('lock', 19) +
        '<input id="lgPass" type="password" placeholder="' + esc(tt('login.pass.ph')) + '" value="demo1234">' +
        '<button class="eye" data-act="eye" type="button">' + icon('eye', 18) + '</button>' +
        '<span class="fld2-l">' + esc(tt('login.pass')) + '</span></label>' +
        '<button class="btn2 big" data-act="login">' + esc(tt('login.btn')) + '</button>' +
        '<div class="lnkrow"><button class="lnk" data-act="forgot">' + esc(tt('login.forgot')) + '</button></div>' +
        '<div class="or2"><span>' + esc(tt('login.or')) + '</span></div>' +
        '<button class="btn2 outline big" data-act="otp">' + icon('shield', 19) + esc(tt('login.otp')) + '</button>' +
        '<div class="lg2-foot">' + esc(tt('login.new')) + ' <button class="lnk b" data-act="register">' + esc(tt('login.register')) + '</button></div>' +
        '</div>',
      handlers: base({
        eye: () => { const i = el0('#lgPass'); if (i) i.type = i.type === 'password' ? 'text' : 'password'; },
        login: () => { S.state.onboard.loggedIn = true; S.save(); U.toast(tt('login.welcome') + ' ✓', 'good'); say(tt('verify.title')); AG.app.refresh(true); },
        otp: () => { U.toast('OTP sent to +91 98765 43210 · auto-verified', 'good'); S.state.onboard.loggedIn = true; S.save(); setTimeout(() => AG.app.refresh(true), AG.app.speed(700)); },
        forgot: () => U.toast('Reset link sent to your mobile', 'good'),
        register: () => U.toast('Register at your nearest AGRILINK kendra', 'good')
      })
    };
  }

  function screenVerify() {
    const rows = [
      { ic: 'phone', t: tt('verify.mobile'), s: '+91 98765 43210' },
      { ic: 'doc', t: tt('verify.id'), s: tt('verify.id.sub') },
      { ic: 'pin', t: tt('verify.loc'), s: tt('verify.loc.sub') + ' · ' + farmer().village }
    ];
    return {
      html: '<div class="vf2">' +
        '<div class="vf2-head"><button class="iconbtn" data-act="back2">' + icon('left', 22) + '</button></div>' +
        '<h2>' + esc(tt('verify.title')) + '</h2>' +
        '<p class="sub2">' + esc(tt('verify.sub')) + '</p>' +
        '<div class="vf2-card">' + rows.map((r, i) =>
          '<div class="vf2-row" style="animation-delay:' + (0.25 + i * 0.35) + 's">' +
          '<span class="vf2-ic">' + icon(r.ic, 20) + '</span>' +
          '<span class="grow"><span class="vf2-t">' + esc(r.t) + '</span><span class="vf2-s">' + esc(r.s) + '</span></span>' +
          '<span class="vf2-ok">' + icon('check', 15) + '</span></div>').join('') + '</div>' +
        '<button class="btn2 big" data-act="verifyGo">' + esc(tt('verify.cont')) + '</button>' +
        '<div class="vf2-illus">' + fieldIllus() + '</div>' +
        '</div>',
      handlers: base({
        back2: () => { S.state.onboard.loggedIn = false; S.save(); AG.app.refresh(true); },
        verifyGo: () => { S.state.onboard.verified = true; S.save(); U.toast('Verified ✓', 'good'); say(tt('home.morning') + ' ' + farmer().name); AG.app.go('farmer', 'home'); }
      })
    };
  }

  /* ============================================================
     HOME
     ============================================================ */
  function greet() {
    const h = new Date().getHours();
    return h < 12 ? tt('home.morning') : h < 17 ? tt('home.afternoon') : tt('home.evening');
  }
  function homeCounts() {
    const cs = myCrops();
    return {
      bids: cs.reduce((s, c) => s + c.bids.filter(b => b.status === 'open').length, 0),
      vendors: cs.reduce((s, c) => s + (c.notifiedVendors || []).length, 0),
      orders: S.state.orders.filter(o => cs.some(c => c.batchId && o.batchId === c.batchId)).length +
        cs.filter(c => c.status === 'awarded' || c.status === 'pickup_scheduled').length
    };
  }
  function screenHome() {
    const f = farmer(), w = AG.algo.weatherMock(S.state), n = homeCounts();
    const unread = S.unreadCount('farmer', f.id);
    const open = myCrops().find(c => c.bids.some(b => b.status === 'open'));
    return {
      html: '<div class="f2-head">' +
        '<div class="f2-greet">' +
        '<div class="f2-av">' + esc(f.name.split(' ').map(x => x[0]).slice(0, 2).join('')) + '</div>' +
        '<div class="grow"><div class="f2-hi">' + esc(greet()) + '</div><div class="f2-name">' + esc(f.name) + '</div></div>' +
        '<button class="f2-bell" data-act="go" data-tab="notifications">' + icon('bell', 21) + (unread ? '<span class="nb">' + unread + '</span>' : '') + '</button>' +
        '</div></div>' +
        '<div class="f2-body">' +
        '<div class="w2card">' +
        '<div class="w2-ic">' + icon(w.rain > 40 ? 'cloud' : 'sun', 26) + '</div>' +
        '<div class="grow"><div class="w2-t">' + w.temp + '°C</div><div class="w2-s">' + esc(w.condition) + '</div></div>' +
        '<div class="w2-r"><div class="w2-t" style="font-size:13px">' + esc(f.village) + ', Maharashtra</div><div class="w2-s">' + esc(tt('today')) + '</div></div>' +
        '</div>' +
        '<div class="bn2"><div class="grow"><div class="bn2-t">' + esc(tt('banner.t')) + '</div>' +
        '<div class="bn2-s">' + esc(tt('banner.s')) + ' ' + icon('leaf', 14) + '</div></div>' +
        '<div class="bn2-art">' + cropArt((open && open.cropKey) || 'wheat', 64) + '</div></div>' +

        '<div class="sec2-t">' + esc(tt('quickActions')) + '</div>' +
        '<div class="qa2">' +
        qa('plus', tt('qa.add'), 'startAdd', 'g') + qa('sprout', tt('qa.crops'), 'go', 'g', 'data-tab="crops"') +
        qa('trend', tt('qa.market'), 'go', 'a', 'data-tab="market"') + qa('cloud', tt('qa.weather'), 'weather', 'b') +
        '</div>' +

        '<div class="sec2-t">' + esc(tt('today')) + '</div>' +
        '<div class="l2card">' +
        row2('coin', tt('row.bids'), n.bids ? n.bids + ' ' + tt('new') : tt('noneYet'), 'go', 'bids', n.bids) +
        row2('store', tt('row.vendors'), n.vendors + ' ' + tt('connected'), 'go', 'vendors', 0) +
        row2('cart', tt('row.orders'), tt('viewAll'), 'go', 'orders', 0) +
        row2('ai', tt('row.assist'), tt('askAnything'), 'go', 'assistant', 0) +
        row2('lightbulb', tt('row.tips'), w.advisory.slice(0, 34) + '…', 'go', 'tips', 0) +
        '</div>' +

        (open ? '<div class="tipcard ai"><div class="th">' + icon('ai', 15) + 'ALGORITHM 1 + 2 · ' + esc(tt('aiTip')) + '</div>' +
          '<p>' + esc(tt('bidOnCrop', { crop: open.cropName, n: open.bids.filter(b => b.status === 'open').length })) + '</p>' +
          '<div style="margin-top:9px"><button class="btn2 sm" data-act="go" data-tab="crop" data-id="' + open.id + '">' + esc(tt('viewAll')) + ' ' + icon('right', 15) + '</button></div></div>' : '') +
        '<div style="height:16px"></div></div>',
      handlers: base({
        weather: () => U.modal({
          title: tt('qa.weather'), icon: 'cloud',
          body: '<div class="meta"><div><div class="k">' + esc(tt('today')) + '</div><div class="v">' + w.temp + '°C · ' + esc(w.condition) + '</div></div>' +
            '<div><div class="k">Rain</div><div class="v">' + w.rain + '%</div></div>' +
            '<div><div class="k">Humidity</div><div class="v">' + w.humidity + '%</div></div>' +
            '<div><div class="k">Wind</div><div class="v">' + w.wind + ' km/h</div></div></div>' +
            '<p class="big muted" style="margin-top:12px">' + esc(w.advisory) + '</p>',
          actions: [{ label: 'OK', tone: 'primary' }]
        })
      })
    };
  }
  function qa(ic, label, act, tone, data) {
    return '<button class="qa2-t ' + tone + '" data-act="' + act + '" ' + (data || '') + '>' +
      '<span class="qa2-ic">' + icon(ic, 24) + '</span><span class="qa2-l">' + esc(label) + '</span></button>';
  }
  function row2(ic, t, s, act, tab, badge) {
    return '<button class="l2-row" data-act="' + act + '" data-tab="' + tab + '">' +
      '<span class="l2-ic">' + icon(ic, 20) + '</span>' +
      '<span class="grow"><span class="l2-t">' + esc(t) + '</span><span class="l2-s">' + esc(s) + '</span></span>' +
      (badge ? '<span class="l2-b">' + badge + '</span>' : '') + icon('right', 18) + '</button>';
  }

  /* ============================================================
     MARKET
     ============================================================ */
  function screenMarket() {
    const rows = AG.algo.marketSnapshot(S.state);
    const w = AG.algo.weatherMock(S.state);
    return {
      html: shead(tt('market.title'), tt('market.sub')) +
        '<div class="f2-body" style="padding-top:10px">' +
        '<div class="w2card"><div class="w2-ic">' + icon(w.rain > 40 ? 'cloud' : 'sun', 26) + '</div>' +
        '<div class="grow"><div class="w2-t">' + w.temp + '°C</div><div class="w2-s">' + esc(w.condition) + '</div></div>' +
        '<div class="w2-r"><div class="w2-s" style="text-align:end">' + esc(w.advisory.slice(0, 40)) + '…</div></div></div>' +
        '<div class="l2card" style="padding:4px 0">' + rows.map(r =>
          '<div class="m2-row"><div class="grow"><div class="l2-t">' + esc(r.name) + '</div>' +
          '<div class="l2-s">' + esc(r.mandi) + ' · ' + r.arrivalsKg + ' kg ' + tt('arrivals') + '</div></div>' +
          '<div style="text-align:end"><div class="m2-p">' + money1(r.price) + '<span>/kg</span></div>' +
          '<div class="m2-c ' + (r.change >= 0 ? 'up' : 'dn') + '">' + (r.change >= 0 ? '▲' : '▼') + ' ' + Math.abs(r.change) + '%</div></div>' +
          '<div class="m2-d">' + U.progress(r.demand, r.demand > 75 ? '' : 'amber', r.demand + '% ' + tt('marketDemand')) + '</div></div>').join('') +
        '</div>' +
        '<div style="height:16px"></div></div>',
      handlers: base({})
    };
  }

  /* ============================================================
     ADD NEW — bottom sheet → camera → saved
     ============================================================ */
  function screenSheet() {
    /* native-feel bottom sheet: the home screen stays visible behind the dim */
    const behind = screenHome();
    return {
      html: behind.html + '<div class="sh2wrap"><div class="sh2dim" data-act="sheetCancel"></div>' +
        '<div class="sh2">' +
        '<div class="sh2-grip"></div>' +
        '<div class="sh2-t">' + esc(tt('sheet.title')) + '</div>' +
        shRow('camera', tt('sheet.photo'), tt('sheet.photo.sub'), 'openCamera') +
        shRow('video', tt('sheet.video'), tt('sheet.video.sub'), 'openVideo') +
        shRow('image', tt('sheet.gallery'), tt('sheet.gallery.sub'), 'gallery') +
        '<button class="sh2-cancel" data-act="sheetCancel">' + esc(tt('sheet.cancel')) + '</button>' +
        '</div></div>',
      handlers: base({
        openCamera: () => { L.mode = 'photo'; L.captured = false; AG.app.go('farmer', 'add_camera'); },
        openVideo: () => { L.mode = 'video'; L.recSec = 0; L.video = false; AG.app.go('farmer', 'add_camera'); },
        gallery: () => {
          L.cropKey = CROPS[Math.floor(Math.random() * CROPS.length)].key;
          L.seed = Math.floor(Math.random() * 99999) + 1; L.mode = 'photo';
          U.toast(tt('sheet.gallery') + ' ✓', 'good'); AG.app.go('farmer', 'add_saved');
        },
        sheetCancel: () => AG.app.go('farmer', 'home')
      }, behind.handlers),
      after: behind.after
    };
  }
  function shRow(ic, t, s, act) {
    return '<button class="sh2-row" data-act="' + act + '"><span class="sh2-ic">' + icon(ic, 22) + '</span>' +
      '<span class="grow"><span class="sh2-t">' + esc(t) + '</span><span class="sh2-s">' + esc(s) + '</span></span>' +
      icon('right', 18) + '</button>';
  }

  function pickCropKey() {
    if (!L.cropKey) {
      const pool = CROPS.slice(0, 10).map(c => c.key);
      L.cropKey = pool[Math.floor(Math.random() * pool.length)];
    }
    return L.cropKey;
  }
  function screenCamera() {
    const key = pickCropKey();
    const video = L.mode === 'video';
    return {
      html: '<div class="cm2 ' + (video ? 'video' : '') + '">' +
        '<div class="cm2-top">' +
        '<button class="cm2-x" data-act="camClose">' + icon('x', 22) + '</button>' +
        (video && L.video ? '<div class="cm2-rec"><span class="rdot"></span>' + fmtRec(L.recSec) + '</div>' : '<span></span>') +
        '<button class="cm2-x" data-act="flash">' + icon('sun', 20) + '</button></div>' +
        '<div class="cm2-view">' +
        (L.captured || L.video ? '<div class="cm2-photo">' + cropArt(key, 340) + '</div>' : '<div class="cm2-photo dim">' + cropArt(key, 340) + '</div>') +
        (!L.captured && !video ? '<div class="cm2-frame"></div>' : '') +
        (L.captured ? '<div class="cm2-done"><span class="cm2-ok">' + icon('check', 30) + '</span><div class="cm2-done-t">' + esc(tt('cam.captured')) + '</div></div>' : '') +
        (video && L.video ? '<div class="cm2-recbar"><i style="width:' + Math.min(100, L.recSec / 30 * 100) + '%"></i></div>' : '') +
        '</div>' +
        '<div class="cm2-modes"><button class="cm2-m' + (!video ? ' on' : '') + '" data-act="modeP">' + esc(tt('cam.photo')) + '</button>' +
        '<button class="cm2-m' + (video ? ' on' : '') + '" data-act="modeV">' + esc(tt('cam.video')) + '</button></div>' +
        '<div class="cm2-ctl">' +
        '<button class="cm2-s" data-act="gallery">' + icon('image', 22) + '</button>' +
        (video
          ? (L.video
            ? '<button class="cm2-shut rec" data-act="recStop"><span class="sq"></span></button>'
            : '<button class="cm2-shut rec" data-act="recStart"></button>')
          : '<button class="cm2-shut" data-act="shoot"></button>') +
        (video && L.video
          ? '<button class="cm2-s" data-act="recPause">' + icon('pause', 20) + '</button>'
          : '<button class="cm2-s" data-act="flip">' + icon('refresh', 22) + '</button>') +
        '</div>' +
        '<div class="cm2-hint">' + esc(video ? tt('cam.hintV') : tt('fitSquare')) + '</div>' +
        '</div>',
      handlers: base({
        camClose: () => AG.app.go('farmer', 'home'),
        flash: () => U.toast('Flash toggled', 'good', 1200),
        flip: () => U.toast('Camera flipped', 'good', 1200),
        modeP: () => { stopRec(); L.mode = 'photo'; L.captured = false; AG.app.refresh(true); },
        modeV: () => { stopRec(); L.mode = 'video'; AG.app.refresh(true); },
        shoot: () => {
          L.captured = true; AG.app.refresh(true); say(tt('cam.captured'));
          setTimeout(() => { AG.app.go('farmer', 'add_saved'); }, AG.app.speed(1100));
        },
        recStart: () => {
          L.video = true; L.recSec = 0; AG.app.refresh(true);
          L.recTimer = setInterval(() => {
            L.recSec++;
            const t = el0('#recT'); if (t) t.textContent = fmtRec(L.recSec);
            if (L.recSec >= 30) stopRec(true);
          }, 1000);
        },
        recPause: () => { stopRec(); U.toast(tt('cam.pause'), 'warn', 1200); },
        recStop: () => { stopRec(true); },
        gallery: () => { L.cropKey = CROPS[Math.floor(Math.random() * CROPS.length)].key; L.mode = 'photo'; AG.app.go('farmer', 'add_saved'); }
      }),
      after: () => { /* timer text target */ }
    };
  }
  function fmtRec(s) { return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); }
  function stopRec(done) {
    if (L.recTimer) { clearInterval(L.recTimer); L.recTimer = null; }
    if (done && L.video) { L.video = false; AG.app.go('farmer', 'add_saved'); }
    else if (L.video) { /* paused */ }
  }

  function screenSaved() {
    const key = L.cropKey || 'tomato';
    return {
      html: '<div class="sv2">' +
        '<div class="sv2-head"><button class="iconbtn" data-act="backHome">' + icon('left', 22) + '</button></div>' +
        '<div class="sv2-photo">' + cropArt(key, 300) + '</div>' +
        '<div class="sv2-ok">' + icon('check', 26) + '</div>' +
        '<h2>' + esc(tt('saved.title')) + '</h2>' +
        '<p class="sub2">' + esc(tt('saved.sub')) + '</p>' +
        '<button class="btn2 big" data-act="goAnalyse">' + icon('ai', 20) + esc(tt('saved.analyse')) + '</button>' +
        '<button class="btn2 outline big" data-act="startAdd">' + esc(tt('saved.another')) + '</button>' +
        '<div class="lnkrow"><button class="lnk" data-act="backHome">' + esc(tt('saved.home')) + '</button></div>' +
        '</div>',
      handlers: base({
        backHome: () => AG.app.go('farmer', 'home'),
        goAnalyse: () => AG.app.go('farmer', 'add_analyzing')
      })
    };
  }

  /* ============================================================
     AI ANALYSIS → RESULT → RADIUS → MATCHING
     ============================================================ */
  const AN = [
    ['cropType', a => a.detectedCrop + ' · ' + a.confidence + '%'], ['quality', a => a.grade + ' · ' + a.qualityScore + '/100'],
    ['freshness', a => a.freshness + '%'], ['ripeness', a => a.ripeness + '%'],
    ['damage', a => a.damage + '%'], ['disease', a => a.disease + '%'],
    ['size', a => a.size], ['quantity', a => kg(a.quantity)],
    ['moisture', a => a.moisture + '%'], ['location', a => a.location.village],
    ['harvestCondition', a => a.harvestCondition], ['shelfLife', a => a.shelfLife + ' ' + tt('days')],
    ['spoilageRisk', a => String(a.spoilageRisk).toUpperCase()], ['transportNeeds', a => a.transport[0]],
    ['transportCost', a => money(a.transportCost)], ['marketDemand', a => a.demand + '%'],
    ['suggestedPrice', a => money1(a.suggestedPrice) + '/kg'], ['minBid', a => money1(a.minBid) + ' – ' + money1(a.maxBid)]
  ];
  function screenAnalyzing() {
    const f = farmer();
    if (!L.analysis || L.analysis.cropKey !== L.cropKey) {
      L.analysis = AG.algo.analyzeCrop({
        cropKey: L.cropKey || 'onion', qtyKg: L.qty, seed: L.seed || 4242,
        lat: f.lat, lng: f.lng, village: f.village, radiusKm: L.radius
      });
    }
    return {
      html: '<div class="an2">' +
        '<div class="an2-head"><div class="spin2"></div><div><h2>' + esc(tt('analyzing')) + '</h2>' +
        '<div class="sub2">' + icon('ai', 14) + ' AGRILINK Vision-Agri · ' + esc(tt('analysis.note')) + '</div></div></div>' +
        '<div class="an2-list">' + AN.map((s, i) =>
          '<div class="an2-row" style="animation-delay:' + (0.25 + i * 0.2) + 's">' + icon('check', 15) +
          '<span class="grow">' + esc(tt(s[0])) + '</span><b>' + esc(s[1](L.analysis)) + '</b></div>').join('') + '</div>' +
        '<div class="hint2">' + icon('info', 14) + ' ' + esc(tt('analysis.editable')) + '</div></div>',
      handlers: base({}),
      after: () => {
        say(tt('analyzing'));
        setTimeout(() => {
          if (AG.app.currentNav().tab === 'add_analyzing') AG.app.go('farmer', 'add_result');
        }, AG.app.speed(AN.length * 200 + 1400));
      }
    };
  }

  function screenResult() {
    const a = L.analysis; if (!a) return screenSaved();
    return {
      html: shead(tt('analysisDone'), a.detectedCrop, true) +
        '<div class="f2-body" style="padding-top:10px">' +
        '<div class="r2card">' +
        '<div class="r2-photo">' + cropArt(a.cropKey, 84) + '</div>' +
        '<div class="grow"><div class="r2-t">' + esc(a.detectedCrop) + '</div>' +
        '<div class="r2-s">' + esc(a.location.village) + ' · ' + esc(a.harvestCondition) + '</div>' +
        '<div class="r2-pills">' + pill('Grade ' + a.grade, a.grade === 'A' ? 'green' : a.grade === 'B' ? 'amber' : 'red', 'star') +
        pill('AI ' + a.confidence + '%', 'blue', 'ai') + pill(a.qualityScore + '/100', 'green') + '</div></div></div>' +

        '<div class="sec2-t">' + esc(tt('quantity')) + '</div>' +
        '<div class="l2card"><div class="q2row">' +
        '<button class="q2b" data-act="qty" data-d="-50">−</button>' +
        '<div class="q2v" id="qtyVal">' + L.qty + ' <span>kg</span></div>' +
        '<button class="q2b" data-act="qty" data-d="50">+</button></div>' +
        '<div class="chips2">' + [200, 500, 900, 1500, 3000].map(q =>
          '<button class="chip2" data-act="qtySet" data-q="' + q + '" aria-pressed="' + (L.qty === q) + '">' + q + '</button>').join('') + '</div></div>' +

        '<div class="sec2-t">' + esc(tt('cropType')) + ' · ' + esc(tt('edit')) + '</div>' +
        '<div class="chips2 scroll">' + CROPS.slice(0, 10).map(c =>
          '<button class="chip2" data-act="cropSet" data-k="' + c.key + '" aria-pressed="' + (a.cropKey === c.key) + '">' + esc(c.name) + '</button>').join('') + '</div>' +
        '<div class="hint2">' + icon('ai', 14) + ' ' + esc(tt('analysis.also')) + ' ' + a.alternatives.slice(1).map(x => x.crop + ' ' + x.pct + '%').join(', ') + '</div>' +

        '<div class="priceband"><div class="pb-t">' + icon('coin', 16) + ' ' + esc(tt('suggestedPrice')) + ' ' + money1(a.suggestedPrice) + '/kg</div>' +
        '<div class="pb-s">' + esc(tt('minBid')) + ' ' + money1(a.minBid) + ' · ' + esc(tt('maxBid')) + ' ' + money1(a.maxBid) + '</div></div>' +

        '<button class="btn2 big" data-act="confirmResult">' + esc(tt('confirmContinue')) + ' ' + icon('right', 18) + '</button>' +
        '<div style="height:16px"></div></div>',
      handlers: base({
        qty: (n, e, d) => { L.qty = clamp(L.qty + Number(d.d), 50, 20000); rerun(); const v = el0('#qtyVal'); if (v) v.innerHTML = L.qty + ' <span>kg</span>'; },
        qtySet: (n, e, d) => { L.qty = Number(d.q); rerun(); AG.app.refresh(true); },
        cropSet: (n, e, d) => { L.cropKey = d.k; L.seed = Math.floor(Math.random() * 99999) + 1; rerun(); AG.app.refresh(true); },
        confirmResult: () => {
          const f = farmer(), a2 = L.analysis;
          const crop = S.createCrop({
            farmerId: f.id, cropKey: a2.cropKey, cropName: a2.detectedCrop,
            category: (CROP_BY_KEY[a2.cropKey] || {}).cat || 'Vegetable',
            qtyKg: L.qty, radiusKm: L.radius, analysis: a2, photoSeed: L.seed, retailPrice: a2.retailPrice
          });
          L.cropId = crop.id;
          U.toast(tt('analysisDone') + ' · ' + crop.trackingId, 'good');
          AG.app.go('farmer', 'add_radius', { id: crop.id });
        }
      })
    };
  }
  function rerun() {
    const f = farmer();
    L.analysis = AG.algo.analyzeCrop({ cropKey: L.cropKey, qtyKg: L.qty, seed: L.seed || 4242, lat: f.lat, lng: f.lng, village: f.village, radiusKm: L.radius });
  }

  const RADII = [5, 10, 20, 30, 50];
  function screenRadius() {
    const p = AG.app.currentNav().params;
    const crop = S.crop(p.id || L.cropId); if (!crop) return screenHome();
    L.cropId = crop.id;
    const f = farmer();
    const all = S.state.vendors.map(v => ({ v, d: roadKm(f, v) }));
    const inside = all.filter(x => x.d <= L.radius).length;
    return {
      html: shead(tt('sellingRadius'), crop.cropName + ' · ' + kg(crop.qtyKg), true) +
        '<div class="f2-body" style="padding-top:10px">' +
        '<div class="r2card col"><div class="grow">' +
        '<div class="rd2-v">' + L.radius + ' <span>km</span></div>' +
        '<div class="r2-s">' + esc(tt('radiusHelp')) + '</div></div>' +
        '<div class="rd2-n"><b>' + inside + '</b><span>' + esc(tt('vendorsInside')) + '</span></div></div>' +
        '<input class="slider" id="radSlider" type="range" min="0" max="' + (RADII.length - 1) + '" step="1" value="' + RADII.indexOf(L.radius) + '" style="--p:' + (RADII.indexOf(L.radius) / (RADII.length - 1) * 100) + '%" data-act="radSlide@input">' +
        '<div class="chips2">' + RADII.map(r => '<button class="chip2" data-act="radSet" data-r="' + r + '" aria-pressed="' + (L.radius === r) + '" style="flex:1">' + r + '</button>').join('') + '</div>' +
        '<div class="map2">' + U.mapSVG({
          width: 380, height: 230, center: { lat: f.lat, lng: f.lng }, radiusKm: L.radius,
          points: [{ lat: f.lat, lng: f.lng, color: '#14713C', label: f.village, pulse: true }]
            .concat(all.map(x => ({ lat: x.v.lat, lng: x.v.lng, color: x.d <= L.radius ? '#D98A16' : '#9AA79E', label: x.d <= L.radius ? x.v.name.split(' ')[0] : '' }))),
          legend: [{ color: '#14713C', label: tt('yourFarm') }, { color: '#D98A16', label: tt('vendorsInside') }, { color: '#9AA79E', label: tt('outside') }]
        }) + '</div>' +
        '<div class="hint2">' + icon('ai', 14) + ' ' + esc(tt('radius.ai')) + '</div>' +
        '<button class="btn2 big" data-act="findVendors">' + icon('search', 20) + esc(tt('findVendors')) + '</button>' +
        '<div style="height:16px"></div></div>',
      handlers: base({
        radSlide: n => { L.radius = RADII[Number(n.value)]; AG.app.freeze(true); AG.app.refresh(true); AG.app.freeze(false); },
        radSet: (n, e, d) => { L.radius = Number(d.r); AG.app.refresh(true); },
        findVendors: () => { S.postCrop(L.cropId, L.radius); AG.app.go('farmer', 'add_matching', { id: L.cropId }); }
      })
    };
  }

  function screenMatching() {
    const p = AG.app.currentNav().params;
    const crop = S.crop(p.id || L.cropId); if (!crop) return screenHome();
    if (!L.preview || L.previewCrop !== crop.id) {
      L.preview = AG.algo.matchVendorsForCrop(crop, S.state).slice(0, MAX_VENDORS_PER_CROP);
      L.previewCrop = crop.id;
    }
    return {
      html: shead(tt('findVendors'), crop.cropName + ' · ' + crop.radiusKm + ' km', true) +
        '<div class="f2-body" style="padding-top:10px" id="matchBody">' +
        '<div class="r2card col center"><div class="spin2 big"></div>' +
        '<div class="r2-t" style="margin-top:12px">' + esc(tt('searching')) + '</div>' +
        '<div class="r2-s">' + icon('ai', 13) + ' Algorithm 2 · ' + S.state.vendors.length + ' ' + esc(tt('vendorsScanned')) + '</div></div></div>',
      handlers: base({}),
      after: () => {
        setTimeout(() => {
          const body = el0('#matchBody'); if (!body) return;
          body.innerHTML =
            '<div class="ok2card">' + icon('store', 22) + '<div class="grow"><div class="r2-t">' + esc(tt('vendorsFound', { n: L.preview.length })) + '</div>' +
            '<div class="r2-s">' + esc(tt('maxThree')) + '</div></div></div>' +
            L.preview.map((m, i) => matchCard(m, i)).join('') +
            '<div class="hint2 lock">' + icon('shield', 15) + ' ' + esc(tt('algo3verify', { n: L.preview.length })) + '</div>' +
            '<button class="btn2 big" data-act="sendVendors">' + icon('bell', 20) + esc(tt('sendToVendors')) + '</button>';
          U.bind(body, base({
            sendVendors: () => {
              const matches = S.matchVendors(crop.id);
              U.toast(tt('notified') + ' · ' + matches.length, 'good');
              say(tt('vendorsFound', { n: matches.length }));
              setTimeout(() => AG.app.go('farmer', 'crop', { id: crop.id }), AG.app.speed(600));
            }
          }));
        }, AG.app.speed(1500));
      }
    };
  }
  function matchCard(m, i) {
    const v = m.vendor;
    return '<div class="l2card pad"><div class="r2card row0">' +
      '<div class="v2-av">' + esc(v.name.split(' ').map(w => w[0]).slice(0, 2).join('')) + '</div>' +
      '<div class="grow"><div class="l2-t">' + esc(v.name) + '</div>' +
      '<div class="l2-s">' + esc(v.area) + ' · ' + km(m.distanceKm) + ' · ' + v.rating + '★</div></div>' +
      '<span class="sc2">' + m.score + '</span></div>' +
      '<div class="l2-s" style="margin-top:7px">' + esc(m.why) + '</div></div>';
  }

  /* ============================================================
     MY CROPS / CROP DETAIL / BIDS / VENDORS / ORDERS
     ============================================================ */
  function screenCrops() {
    const cs = myCrops();
    return {
      html: shead(tt('myCrops'), cs.length + ' ' + tt('lots')) +
        '<div class="f2-body" style="padding-top:10px">' +
        (cs.length ? cs.map(c => {
          const st = U.CROP_STATUS[c.status] || { label: c.status, tone: 'grey' };
          return '<button class="l2card pad row0" data-act="go" data-tab="crop" data-id="' + c.id + '">' +
            '<div class="c2-art">' + cropArt(c.cropKey, 46) + '</div>' +
            '<div class="grow"><div class="l2-t">' + esc(c.cropName) + ' · ' + kg(c.qtyKg) + '</div>' +
            '<div class="l2-s mono2">' + esc(c.trackingId) + '</div>' +
            '<div style="margin-top:5px">' + pill(st.label, st.tone) + (c.bids.length ? pill(c.bids.length + ' ' + tt('bids'), 'amber', 'coin') : '') + '</div></div>' +
            icon('right', 18) + '</button>';
        }).join('')
          : '<div class="empty2">' + icon('sprout', 40) + '<p>' + esc(tt('noCrops')) + '</p>' +
          '<button class="btn2 big" data-act="startAdd">' + icon('plus', 20) + esc(tt('addCrop')) + '</button></div>') +
        '<div style="height:16px"></div></div>',
      handlers: base({})
    };
  }

  function screenCrop() {
    const p = AG.app.currentNav().params;
    const c = S.crop(p.id || L.cropId); if (!c) return screenCrops();
    L.cropId = c.id;
    const a = c.analysis, band = AG.algo.bidBand(c);
    const openBids = c.bids.filter(b => b.status === 'open').sort((x, y) => y.price - x.price);
    const best = openBids[0];
    const v = c.vendorId ? S.vendor(c.vendorId) : null;
    const b = c.batchId ? S.batch(c.batchId) : null;
    return {
      html: shead(c.cropName, c.trackingId, true) +
        '<div class="f2-body" style="padding-top:10px">' +
        '<div class="r2card">' +
        '<div class="r2-photo">' + cropArt(c.cropKey, 64) + '</div>' +
        '<div class="grow"><div class="r2-t">' + kg(c.qtyKg) + ' · Grade ' + a.grade + '</div>' +
        '<div class="r2-s">' + esc((U.CROP_STATUS[c.status] || {}).label || c.status) + ' · ' + timeAgo(c.createdAt) + '</div>' +
        '<div class="r2-pills">' + pill(a.qualityScore + '/100', 'green', 'star') + pill(a.shelfLife + 'd', 'blue', 'clock') + pill(a.spoilageRisk, a.spoilageRisk === 'low' ? 'green' : 'amber', 'trend') + '</div></div></div>' +

        '<div class="priceband"><div class="pb-t">' + icon('coin', 16) + ' ' + esc(tt('suggestedPrice')) + ' ' + money1(band.suggested) + '/kg</div>' +
        '<div class="pb-s">' + esc(tt('minBid')) + ' ' + money1(band.min) + ' · ' + esc(tt('maxBid')) + ' ' + money1(band.max) + '</div></div>' +

        (openBids.length ? '<div class="sec2-t">' + esc(tt('activeBids')) + ' · ' + openBids.length + '</div>' +
          openBids.map(bd => bidCard(c, bd, bd.id === (best && best.id))).join('') : '') +

        (c.status === 'awarded' || c.status === 'pickup_scheduled' ? '<div class="ok2card">' + icon('check', 22) +
          '<div class="grow"><div class="r2-t">' + esc(tt('wonBy', { vendor: v.name })) + '</div>' +
          '<div class="r2-s">' + money1(c.bids.find(x => x.id === c.winnerBidId).price) + '/kg · ' + km(roadKm(farmer(), v)) + ' · ' + esc(tt('pickupIn', { h: c.pickupEtaHrs })) + '</div></div></div>' +
          '<div class="btnrow2">' +
          (c.status === 'awarded' ? '<button class="btn2" data-act="schedulePickup">' + icon('clock', 18) + esc(tt('schedulePickup')) + '</button>' : '') +
          '<button class="btn2 outline" data-act="doPickup">' + icon('hand', 18) + esc(tt('simulateHandover')) + '</button></div>' : '') +

        (b ? '<div class="l2card pad"><div class="l2-t">' + esc(tt('inInventory')) + ' · ' + esc(S.vendor(b.vendorId).name) + '</div>' +
          '<div class="l2-s">' + esc(b.id) + '</div>' +
          '<div style="margin-top:9px">' + U.stockSplit(b.freeKg, b.reservedKg) + '</div>' +
          '<div class="btnrow2" style="margin-top:11px"><button class="btn2 sm outline" data-act="traceGov">' + icon('gov', 16) + esc(tt('govTrace')) + '</button></div></div>' : '') +

        (c.redirected && c.redirected.length ? '<div class="hint2">' + icon('route', 14) + ' ' + esc(tt('redirectNote', { n: c.redirected.length })) + '</div>' : '') +
        '<div style="height:16px"></div></div>',
      handlers: base({
        schedulePickup: () => { S.schedulePickup(c.id, Date.now() + 3 * 3600000); U.toast(tt('pickupScheduled'), 'good'); AG.app.refresh(true); },
        doPickup: () => {
          const r = S.completePickup(c.id);
          if (r.ok) U.toast(tt('handoverDone') + ' → ' + r.batch.id, 'good', 3400);
          AG.app.refresh(true);
        },
        accept: (n, e, d) => {
          const bid = c.bids.find(x => x.id === d.bid);
          U.confirmBox(tt('selectWinner') + '?', bid ? S.vendor(bid.vendorId).name + ' · ' + money1(bid.price) + '/kg · ' + kg(c.qtyKg) + ' = ' + money(bid.price * c.qtyKg) + '. ' + tt('redirectExpl') : '', () => {
            const res = S.acceptBid(c.id, d.bid);
            U.toast(tt('accepted') + ' · ' + res.redirects.length + ' ' + tt('redirected'), 'good');
            AG.app.refresh(true);
          }, tt('accepted'));
        },
        reject: (n, e, d) => { S.rejectBid(c.id, d.bid); U.toast(tt('rejected'), 'warn'); AG.app.refresh(true); },
        traceGov: () => { S.state.role = 'gov'; S.state.welcomed = true; S.save(); AG.app.go('gov', 'trace'); setTimeout(() => { const i = el0('#traceInput'); if (i) i.value = c.trackingId; }, 300); }
      })
    };
  }
  function bidCard(c, b, best) {
    const v = S.vendor(b.vendorId), f = farmer(), d = roadKm(f, v);
    return '<div class="bidcard' + (best ? ' best' : '') + '"><div class="bid-top">' +
      '<div class="v2-av">' + esc(v.name.split(' ').map(w => w[0]).slice(0, 2).join('')) + '</div>' +
      '<div class="grow"><div class="l2-t">' + esc(v.name) + '</div><div class="l2-s">' + esc(v.area) + ' · ' + v.rating + '★</div></div>' +
      '<div class="bid-price">' + money1(b.price) + '<span>/kg</span></div></div>' +
      '<div class="bid-meta"><span>' + icon('pin', 13) + km(d) + '</span><span>' + icon('clock', 13) + round(d / 26 + 0.6, 1) + 'h</span>' +
      (best ? '<span class="aipill">' + icon('ai', 12) + esc(tt('aiSuggests')) + '</span>' : '') + '</div>' +
      '<div class="btnrow2"><button class="btn2 sm" data-act="accept" data-bid="' + b.id + '">' + icon('check', 16) + esc(tt('accept')) + '</button>' +
      '<button class="btn2 sm outline" data-act="reject" data-bid="' + b.id + '">' + icon('x', 16) + esc(tt('reject')) + '</button></div></div>';
  }

  function screenBids() {
    const rows = myCrops().flatMap(c => c.bids.filter(b => b.status === 'open').map(b => ({ c, b })));
    return {
      html: shead(tt('activeBids'), rows.length + ' ' + tt('open')) +
        '<div class="f2-body" style="padding-top:10px">' +
        (rows.length ? rows.map(({ c, b }) =>
          '<button class="l2card pad row0" data-act="go" data-tab="crop" data-id="' + c.id + '">' +
          '<div class="v2-av">' + esc(S.vendor(b.vendorId).name.split(' ').map(w => w[0]).slice(0, 2).join('')) + '</div>' +
          '<div class="grow"><div class="l2-t">' + esc(S.vendor(b.vendorId).name) + '</div>' +
          '<div class="l2-s">' + esc(c.cropName) + ' · ' + timeAgo(b.createdAt) + '</div></div>' +
          '<div class="bid-price">' + money1(b.price) + '<span>/kg</span></div></button>').join('')
          : '<div class="empty2">' + icon('coin', 40) + '<p>' + esc(tt('noBids')) + '</p></div>') +
        '<div style="height:16px"></div></div>',
      handlers: base({})
    };
  }

  function screenVendors() {
    const cs = myCrops().filter(c => (c.notifiedVendors || []).length);
    return {
      html: shead(tt('interestedVendors'), cs.length + ' ' + tt('lots')) +
        '<div class="f2-body" style="padding-top:10px">' +
        (cs.length ? cs.map(c => {
          const ms = (c.matches && c.matches.length ? c.matches : (c.notifiedVendors || []).map(id => {
            const v = S.vendor(id); return v ? { vendor: v, distanceKm: roadKm(farmer(), v), score: 0, why: '' } : null;
          }).filter(Boolean)).slice(0, 3);
          return '<div class="sec2-t">' + esc(c.cropName) + ' · ' + esc(c.trackingId) + '</div>' +
          ms.map(m => {
            const bid = c.bids.find(x => x.vendorId === m.vendor.id);
            const tone = c.winnerBidId && bid && bid.id === c.winnerBidId ? 'green' : bid ? 'amber' : c.redirected && c.redirected.includes(m.vendor.id) ? 'violet' : 'grey';
            const label = c.winnerBidId && bid && bid.id === c.winnerBidId ? tt('won') : bid ? tt('bidPlaced') : c.redirected && c.redirected.includes(m.vendor.id) ? tt('redirected') : tt('invited');
            return '<div class="l2card pad row0"><div class="v2-av">' + esc(m.vendor.name.split(' ').map(w => w[0]).slice(0, 2).join('')) + '</div>' +
              '<div class="grow"><div class="l2-t">' + esc(m.vendor.name) + '</div>' +
              '<div class="l2-s">' + esc(m.vendor.area) + ' · ' + km(m.distanceKm) + ' · ' + m.vendor.rating + '★</div></div>' +
              pill(label, tone) + '</div>';
          }).join('');
        }).join('')
          : '<div class="empty2">' + icon('store', 40) + '<p>' + esc(tt('noVendors')) + '</p></div>') +
        '<div style="height:16px"></div></div>',
      handlers: base({})
    };
  }

  function screenOrders() {
    const cs = myCrops();
    const sales = cs.filter(c => c.batchId || c.winnerBidId);
    const f = farmer();
    return {
      html: shead(tt('ordersSales'), money(f.earned || 0)) +
        '<div class="f2-body" style="padding-top:10px">' +
        '<div class="ok2card">' + icon('coin', 22) + '<div class="grow"><div class="r2-t">' + money(f.earned || 0) + '</div>' +
        '<div class="r2-s">' + esc(tt('totalEarned')) + ' · UPI</div></div></div>' +
        (sales.length ? sales.map(c => {
          const win = c.bids.find(x => x.id === c.winnerBidId);
          const b = c.batchId ? S.batch(c.batchId) : null;
          return '<button class="l2card pad row0" data-act="go" data-tab="crop" data-id="' + c.id + '">' +
            '<div class="c2-art">' + cropArt(c.cropKey, 40) + '</div>' +
            '<div class="grow"><div class="l2-t">' + esc(c.cropName) + ' · ' + kg(c.qtyKg) + '</div>' +
            '<div class="l2-s">' + esc(win ? S.vendor(win.vendorId).name : '—') + (b ? ' · ' + esc(b.id) : '') + '</div></div>' +
            '<div class="bid-price">' + money(win ? win.price * c.qtyKg : 0) + '</div></button>';
        }).join('') : '<div class="empty2">' + icon('cart', 40) + '<p>' + esc(tt('noSales')) + '</p></div>') +
        '<div style="height:16px"></div></div>',
      handlers: base({})
    };
  }

  /* ============================================================
     NOTIFICATIONS / TIPS / ASSISTANT / PROFILE / LANGUAGE
     ============================================================ */
  function screenNotifications() {
    const f = farmer();
    const list = S.notifsFor('farmer', f.id).sort((a, b) => b.ts - a.ts);
    S.markRead('farmer', f.id);
    return {
      html: shead(tt('notifications'), list.length + '', true) +
        '<div class="f2-body" style="padding-top:10px">' +
        (list.length ? '<div class="l2card" style="padding:4px 0">' + list.map(n =>
          '<div class="n2-row' + (n.read ? '' : ' unread') + '"><span class="n2-ic ' + (n.type || '') + '">' +
          icon(n.type === 'bid' ? 'coin' : n.type === 'payment' ? 'bank' : n.type === 'won' ? 'check' : 'bell', 18) + '</span>' +
          '<span class="grow"><span class="l2-t">' + esc(n.title) + '</span><span class="l2-s">' + esc(n.body) + '</span>' +
          '<span class="n2-ts">' + timeAgo(n.ts) + '</span></span></div>').join('') + '</div>'
          : '<div class="empty2">' + icon('bell', 40) + '<p>' + esc(tt('noNotif')) + '</p></div>') +
        '<div style="height:16px"></div></div>',
      handlers: base({})
    };
  }

  function screenTips() {
    const w = AG.algo.weatherMock(S.state);
    const tips = [
      { ic: 'cloud', t: tt('tip.weather'), b: w.advisory },
      { ic: 'clock', t: tt('tip.harvest'), b: tt('tip.harvest.b') },
      { ic: 'box', t: tt('tip.pack'), b: tt('tip.pack.b') },
      { ic: 'coin', t: tt('tip.price'), b: tt('tip.price.b') }
    ];
    return {
      html: shead(tt('tips'), tt('tips.sub'), true) +
        '<div class="f2-body" style="padding-top:10px">' +
        tips.map(x => '<div class="l2card pad"><div class="row0"><span class="l2-ic">' + icon(x.ic, 20) + '</span>' +
          '<div class="grow"><div class="l2-t">' + esc(x.t) + '</div></div></div>' +
          '<div class="l2-s" style="margin-top:7px;line-height:1.55">' + esc(x.b) + '</div></div>').join('') +
        '<div style="height:16px"></div></div>',
      handlers: base({})
    };
  }

  function screenAssistant() {
    const qs = I18N.assistQuestions(S.state.lang || 'en');
    return {
      html: shead(tt('aiAssistant'), tt('assistant.sub'), true) +
        '<div class="f2-body" style="padding-top:10px;display:flex;flex-direction:column">' +
        '<div class="chat2" id="chatBox">' + (L.chat || [{ me: false, txt: tt('assistant.hello', { name: farmer().name.split(' ')[0] }) }]).map(m =>
          '<div class="msg2 ' + (m.me ? 'me' : '') + '"><div class="b2">' + esc(m.txt) + '</div>' +
          (!m.me ? '<button class="spk2" data-act="speakMsg" data-txt="' + esc(m.txt) + '">' + icon('volume', 14) + '</button>' : '') + '</div>').join('') + '</div>' +
        '<div class="chips2 scroll" style="margin:10px 0">' + qs.map((q, i) =>
          '<button class="chip2" data-act="quick" data-i="' + i + '">' + esc(q) + '</button>').join('') + '</div>' +
        '<div class="in2row">' +
        '<button class="in2-mic' + (L.listening ? ' on' : '') + '" data-act="mic">' + icon('mic', 20) + '</button>' +
        '<input class="in2" id="chatInput" placeholder="' + esc(tt('askAnything')) + '">' +
        '<button class="in2-send" data-act="sendText">' + icon('right', 20) + '</button></div>' +
        '<div style="height:12px"></div></div>',
      handlers: base({
        quick: (n, e, d) => askAI(qs[+d.i]),
        speakMsg: (n, e, d) => say(d.txt),
        sendText: () => { const i = el0('#chatInput'); const v = (i ? i.value : L.draft).trim(); if (!v) return; L.draft = ''; askAI(v); },
        mic: () => {
          L.listening = !L.listening; AG.app.refresh(true);
          if (L.listening) {
            U.toast(tt('listening'), 'good', 2200);
            setTimeout(() => { if (L.listening) { L.listening = false; askAI(tt('assistant.demoQ')); } }, AG.app.speed(2200));
          }
        }
      }),
      after: () => { const c = el0('#chatBox'); if (c) c.scrollTop = c.scrollHeight; }
    };
  }
  function askAI(q) {
    L.chat = L.chat || [];
    L.chat.push({ me: true, txt: q });
    const intent = I18N.detectIntent(S.state.lang || 'en', q);
    L.chat.push({ me: false, txt: reply(intent, q) });
    say(L.chat[L.chat.length - 1].txt);
    AG.app.refresh(true);
  }
  function reply(intent) {
    const lang = S.state.lang || 'en';
    const cs = myCrops();
    const open = cs.find(c => c.bids.some(b => b.status === 'open'));
    const A = (k, v) => I18N.assistReply(lang, k, v);
    if (intent === 'bids' && open) {
      const best = open.bids.filter(b => b.status === 'open').sort((a, b) => b.price - a.price)[0];
      return A('bids', { crop: open.cropName, n: open.bids.filter(b => b.status === 'open').length, price: money1(best.price), vendor: S.vendor(best.vendorId).name });
    }
    if (intent === 'price' || intent === 'market') {
      const c = open || cs[0];
      const snap = AG.algo.marketSnapshot(S.state).find(s => s.key === (c ? c.cropKey : 'onion')) || AG.algo.marketSnapshot(S.state)[0];
      return A('market', { crop: snap.name, demand: snap.demand + '%', need: kg(c ? c.analysis.needKg : 800) });
    }
    if (intent === 'add') return A('add', {});
    if (intent === 'quality' && cs[0]) return A('quality', { crop: cs[0].cropName, grade: cs[0].analysis.grade, score: cs[0].analysis.qualityScore });
    if (intent === 'sell' && cs[0]) return A('sell', { crop: cs[0].cropName, price: money1(cs[0].analysis.suggestedPrice) });
    return A('help', {});
  }

  function screenProfile() {
    const f = farmer();
    return {
      html: shead(tt('profileSettings'), f.village, true) +
        '<div class="f2-body" style="padding-top:10px">' +
        '<div class="r2card"><div class="f2-av big">' + esc(f.name.split(' ').map(x => x[0]).slice(0, 2).join('')) + '</div>' +
        '<div class="grow"><div class="r2-t">' + esc(f.name) + '</div><div class="r2-s">' + esc(f.village) + ' · ' + f.acres + ' ' + tt('acre') + '</div>' +
        '<div class="r2-pills">' + pill(tt('verified'), 'green', 'shield') + pill(f.rating + '★', 'amber', 'star') + '</div></div></div>' +
        '<div class="l2card" style="margin-top:12px;padding:4px 0">' +
        prow('globe', tt('choose.language'), I18N.meta(S.state.lang).native, 'go', 'language') +
        prow('volume', tt('voiceAssistant'), S.state.settings.voice ? tt('on') : tt('off'), 'toggleVoice', '') +
        prow('shield', tt('verify.title'), tt('verified'), 'reverify', '') +
        prow('refresh', tt('resetApp'), '', 'reset', '') +
        prow('logout', tt('switchInterface'), '', 'welcome', '') +
        '</div>' +
        '<div class="sec2-t">' + tt('switchFarmer') + '</div>' +
        '<div class="chips2 scroll">' + S.state.farmers.map(x =>
          '<button class="chip2" data-act="setFarmer" data-id="' + x.id + '" aria-pressed="' + (x.id === f.id) + '">' + esc(x.name.split(' ')[0]) + '</button>').join('') + '</div>' +
        '<div style="height:16px"></div></div>',
      handlers: base({
        toggleVoice: () => { S.setSetting('voice', !S.state.settings.voice); AG.app.refresh(true); if (S.state.settings.voice) say(tt('voiceOn')); },
        reverify: () => { S.state.onboard.verified = true; S.save(); U.toast(tt('verified') + ' ✓', 'good'); },
        setFarmer: (n, e, d) => { S.setCurrentFarmer(d.id); U.toast(farmer().name, 'good'); AG.app.go('farmer', 'home'); },
        reset: () => U.confirmBox(tt('resetApp') + '?', tt('resetApp.q'), () => {
          S.hardReset();
          Object.assign(L, { cropKey: null, seed: 1, qty: 900, radius: 30, analysis: null, cropId: null, preview: null, previewCrop: null, chat: null, captured: false, video: false });
          backStack = []; lastTab = null;
          AG.app.refresh(true);
        }, tt('resetApp')),
        welcome: () => { S.state.welcomed = false; S.save(); AG.app.refresh(true); }
      })
    };
  }
  function prow(ic, t, v, act, tab) {
    return '<button class="l2-row" data-act="' + act + '" ' + (tab ? 'data-tab="' + tab + '"' : '') + '>' +
      '<span class="l2-ic">' + icon(ic, 20) + '</span>' +
      '<span class="grow"><span class="l2-t">' + esc(t) + '</span></span>' +
      (v ? '<span class="l2-v">' + esc(v) + '</span>' : '') + icon('right', 18) + '</button>';
  }

  function screenLanguage() {
    return {
      html: '<div class="langwrap"><div class="lm">' + icon('globe', 38) + '</div>' +
        '<h1>' + esc(tt('choose.language')) + '</h1>' +
        '<p class="lsub">' + esc(tt('choose.language.sub')) + ' · AGRILINK</p>' +
        '<div class="langgrid">' + I18N.LANGS.map(l =>
          '<button class="langbtn" data-act="pickLang" data-code="' + l.code + '" aria-pressed="' + ((S.state.lang || '') === l.code) + '">' +
          '<span class="native">' + esc(l.native) + '</span><span class="en">' + esc(l.name) + '</span></button>').join('') + '</div>' +
        '<div style="margin-top:18px;text-align:center"><p style="font-size:13px;opacity:.9;font-weight:600">Prototype · mock data · simulated AI</p></div></div>',
      handlers: {
        pickLang: (n, e, d) => {
          S.setLang(d.code);
          S.state.onboard = S.state.onboard || {};
          U.toast(I18N.t(d.code, 'choose.language'), 'good');
          say(I18N.t(d.code, 'choose.language'));
          AG.app.refresh(true);
        }
      }
    };
  }

  /* ============================================================
     shared chrome
     ============================================================ */
  function shead(title, sub, back) {
    return '<div class="sh2head">' + (back ? '<button class="iconbtn" data-act="back">' + icon('left', 22) + '</button>' : '<span style="width:38px"></span>') +
      '<div class="grow"><h2>' + esc(title) + '</h2>' + (sub ? '<div class="sh2-sub mono2">' + esc(sub) + '</div>' : '') + '</div>' +
      '<span style="width:38px"></span></div>';
  }
  function base(extra, extra2) {
    return Object.assign({
      go: (n, e, d) => AG.app.go('farmer', d.tab, d.id ? { id: d.id } : {}),
      back: () => goBack(),
      startAdd: () => AG.app.go('farmer', 'add')
    }, extra || {}, extra2 || {});
  }

  /* ============================================================
     module
     ============================================================ */
  AG.apps = AG.apps || {};
  AG.apps.farmer = {
    id: 'farmer', wide: false,
    get tabs() {
      if (onboardMode) return [];
      return [
        { id: 'home', label: ttSafe('home'), icon: 'home' },
        { id: 'crops', label: ttSafe('myCrops'), icon: 'sprout' },
        { id: 'add', label: ttSafe('addCrop'), icon: 'plus', fab: true },
        { id: 'market', label: ttSafe('market.title'), icon: 'trend' },
        { id: 'profile', label: ttSafe('profileSettings'), icon: 'user' }
      ];
    },
    render(tab, params) {
      onboardMode = false;
      S.state.onboard = S.state.onboard || { splash: false, loggedIn: false, verified: false };
      if (!S.state.lang) { onboardMode = true; return screenLanguage(); }
      const ob = S.state.onboard;
      if (!ob.splash) { onboardMode = true; return screenSplash(); }
      if (!ob.loggedIn) { onboardMode = true; return screenLogin(); }
      if (!ob.verified) { onboardMode = true; return screenVerify(); }
      if (tab !== lastTab) { backStack.push({ tab: lastTab, params: {} }); if (backStack.length > 10) backStack.shift(); lastTab = tab; }
      switch (tab) {
        case 'home': return screenHome();
        case 'crops': return screenCrops();
        case 'add': return screenSheet();
        case 'add_camera': return screenCamera();
        case 'add_saved': return screenSaved();
        case 'add_analyzing': return screenAnalyzing();
        case 'add_result': return screenResult();
        case 'add_radius': return screenRadius();
        case 'add_matching': return screenMatching();
        case 'market': return screenMarket();
        case 'crop': return screenCrop();
        case 'bids': return screenBids();
        case 'vendors': return screenVendors();
        case 'orders': return screenOrders();
        case 'notifications': return screenNotifications();
        case 'tips': return screenTips();
        case 'assistant': return screenAssistant();
        case 'profile': return screenProfile();
        case 'language': return screenLanguage();
        default: return screenHome();
      }
    },
    sideNote() { return ''; },
    _L: L, _startWizard: () => AG.app.go('farmer', 'add'), _shoot: () => { }, _askAI: askAI,
    pushBack(t, p) { backStack.push({ tab: t, params: p }); if (backStack.length > 8) backStack.shift(); },
    resetBack() { backStack = []; }
  };
  function ttSafe(k) { return I18N.t((S.state && S.state.lang) || 'en', k); }
})(typeof window !== 'undefined' ? window : globalThis);
