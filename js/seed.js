/* ============================================================
   AGRILINK — Mock data, geo, crop catalog & seeded history
   Everything is simulated. No network, no backend.
   Region: Pune district, Maharashtra, India.
   ============================================================ */
(function (g) {
  'use strict';

  /* ---------------- utilities ---------------- */
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const round = (v, d) => { const p = Math.pow(10, d || 0); return Math.round(v * p) / p; };
  const pick = (rng, arr) => arr[Math.floor(rng() * arr.length) % arr.length];
  const ri = (rng, a, b) => Math.floor(rng() * (b - a + 1)) + a;
  function haversine(a, b) {
    const R = 6371, dLat = (b.lat - a.lat) * Math.PI / 180, dLon = (b.lng - a.lng) * Math.PI / 180;
    const la1 = a.lat * Math.PI / 180, la2 = b.lat * Math.PI / 180;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  }
  /* road distance is a bit longer than crow-flight */
  const roadKm = (a, b) => round(haversine(a, b) * 1.28, 1);

  function fmtMoney(v) { return '₹' + Math.round(v).toLocaleString('en-IN'); }
  function fmtKg(v) { return (Math.round(v * 10) / 10) + ' kg'; }
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function fmtDate(ts) { const d = new Date(ts); return d.getDate() + ' ' + MONTHS[d.getMonth()] + ', ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }
  function fmtDay(ts) { const d = new Date(ts); return d.getDate() + ' ' + MONTHS[d.getMonth()]; }
  function timeAgo(ts) {
    const s = Math.max(1, Math.floor((Date.now() - ts) / 1000));
    if (s < 60) return s + 's ago';
    const m = Math.floor(s / 60); if (m < 60) return m + 'm ago';
    const h = Math.floor(m / 60); if (h < 24) return h + 'h ago';
    return Math.floor(h / 24) + 'd ago';
  }
  const DAY = 86400000;

  /* ---------------- geography (mock GPS around Pune) ---------------- */
  const VILLAGES = [
    { name: 'Baramati',      lat: 18.1512, lng: 74.5785, taluka: 'Baramati' },
    { name: 'Indapur',       lat: 18.1120, lng: 74.9560, taluka: 'Indapur' },
    { name: 'Daund',         lat: 18.4620, lng: 74.5780, taluka: 'Daund' },
    { name: 'Shirur',        lat: 18.8300, lng: 74.3700, taluka: 'Shirur' },
    { name: 'Junnar',        lat: 19.2000, lng: 73.8700, taluka: 'Junnar' },
    { name: 'Manchar',       lat: 19.0000, lng: 73.9400, taluka: 'Ambegaon' },
    { name: 'Narayangaon',   lat: 19.1600, lng: 74.1900, taluka: 'Junnar' },
    { name: 'Talegaon',      lat: 18.7300, lng: 73.6800, taluka: 'Maval' },
    { name: 'Rajgurunagar',  lat: 18.8700, lng: 73.9000, taluka: 'Khed' },
    { name: 'Saswad',        lat: 18.3400, lng: 74.0300, taluka: 'Purandar' },
    { name: 'Bhor',          lat: 18.2200, lng: 73.8400, taluka: 'Bhor' },
    { name: 'Yavat',         lat: 18.2000, lng: 74.2400, taluka: 'Daund' }
  ];
  const CITY_AREAS = [
    { name: 'Market Yard (Gultekdi)', lat: 18.4950, lng: 73.8680 },
    { name: 'Hadapsar',               lat: 18.5050, lng: 73.9180 },
    { name: 'Kothrud',                lat: 18.5070, lng: 73.8080 },
    { name: 'Wakad',                  lat: 18.5970, lng: 73.7620 },
    { name: 'Viman Nagar',            lat: 18.5670, lng: 73.9140 },
    { name: 'Camp / MG Road',         lat: 18.5300, lng: 73.8800 },
    { name: 'Aundh',                  lat: 18.5590, lng: 73.8070 },
    { name: 'Baner',                  lat: 18.5620, lng: 73.7800 },
    { name: 'Kharadi',                lat: 18.5500, lng: 73.9440 },
    { name: 'Katraj',                 lat: 18.4500, lng: 73.8600 },
    { name: 'Pimpri',                 lat: 18.6280, lng: 73.7990 },
    { name: 'Chinchwad',              lat: 18.6300, lng: 73.8000 },
    { name: 'Warje',                  lat: 18.4700, lng: 73.7900 },
    { name: 'Dhankawadi',             lat: 18.4500, lng: 73.8500 }
  ];

  /* ---------------- crop catalog ---------------- */
  const CROPS = [
    { key: 'onion',      name: 'Onion',       cat: 'Vegetable', farmMin: 14, farmMax: 26, retail: 1.75, shelf: 21, moisture: [10, 16], demand: 88, spoil: 'low',    transport: ['Jute bags', 'Ventilated truck'] },
    { key: 'tomato',     name: 'Tomato',      cat: 'Vegetable', farmMin: 16, farmMax: 34, retail: 1.55, shelf: 6,  moisture: [88, 94], demand: 92, spoil: 'high',   transport: ['Plastic crates', 'Shaded truck'] },
    { key: 'potato',     name: 'Potato',      cat: 'Vegetable', farmMin: 12, farmMax: 22, retail: 1.70, shelf: 45, moisture: [74, 80], demand: 85, spoil: 'low',    transport: ['Gunny bags', 'Any truck'] },
    { key: 'cauliflower',name: 'Cauliflower', cat: 'Vegetable', farmMin: 22, farmMax: 40, retail: 1.60, shelf: 5,  moisture: [89, 93], demand: 70, spoil: 'high',   transport: ['Crates', 'Cool van'] },
    { key: 'okra',       name: 'Okra (Bhindi)', cat: 'Vegetable', farmMin: 30, farmMax: 55, retail: 1.55, shelf: 4, moisture: [85, 91], demand: 64, spoil: 'high',  transport: ['Crates', 'Cool van'] },
    { key: 'chili',      name: 'Green Chilli', cat: 'Vegetable', farmMin: 45, farmMax: 85, retail: 1.60, shelf: 8,  moisture: [80, 86], demand: 72, spoil: 'medium', transport: ['Crates', 'Shaded truck'] },
    { key: 'brinjal',    name: 'Brinjal',     cat: 'Vegetable', farmMin: 20, farmMax: 38, retail: 1.60, shelf: 6,  moisture: [88, 92], demand: 60, spoil: 'medium', transport: ['Crates', 'Shaded truck'] },
    { key: 'carrot',     name: 'Carrot',      cat: 'Vegetable', farmMin: 26, farmMax: 44, retail: 1.55, shelf: 12, moisture: [85, 90], demand: 66, spoil: 'medium', transport: ['Crates', 'Cool van'] },
    { key: 'grape',      name: 'Grapes',      cat: 'Fruit',     farmMin: 55, farmMax: 95, retail: 1.65, shelf: 9,  moisture: [78, 84], demand: 78, spoil: 'medium', transport: ['Punnet boxes', 'Reefer van'] },
    { key: 'banana',     name: 'Banana',      cat: 'Fruit',     farmMin: 24, farmMax: 42, retail: 1.50, shelf: 7,  moisture: [70, 78], demand: 82, spoil: 'medium', transport: ['Crates', 'Shaded truck'] },
    { key: 'pomegranate',name: 'Pomegranate', cat: 'Fruit',     farmMin: 90, farmMax: 150, retail: 1.55, shelf: 14, moisture: [78, 84], demand: 74, spoil: 'medium', transport: ['Punnet boxes', 'Cool van'] },
    { key: 'wheat',      name: 'Wheat',       cat: 'Grain',     farmMin: 22, farmMax: 28, retail: 1.40, shelf: 180, moisture: [10, 13], demand: 80, spoil: 'low',   transport: ['Gunny bags', 'Any truck'] },
    { key: 'paddy',      name: 'Paddy (Rice)', cat: 'Grain',    farmMin: 20, farmMax: 27, retail: 1.40, shelf: 180, moisture: [12, 16], demand: 78, spoil: 'low',   transport: ['Gunny bags', 'Any truck'] },
    { key: 'soybean',    name: 'Soybean',     cat: 'Oilseed',   farmMin: 40, farmMax: 52, retail: 1.30, shelf: 240, moisture: [9, 12],  demand: 62, spoil: 'low',   transport: ['Gunny bags', 'Any truck'] },
    { key: 'sugarcane',  name: 'Sugarcane',   cat: 'Cash crop', farmMin: 2.6, farmMax: 3.8, retail: 1.60, shelf: 5, moisture: [68, 74], demand: 70, spoil: 'medium', transport: ['Bundles', 'Tractor trailer'] },
    { key: 'cotton',     name: 'Cotton',      cat: 'Cash crop', farmMin: 62, farmMax: 78, retail: 1.25, shelf: 300, moisture: [7, 10],  demand: 58, spoil: 'low',   transport: ['Bales', 'Any truck'] }
  ];
  const CROP_BY_KEY = {}; CROPS.forEach(c => CROP_BY_KEY[c.key] = c);

  /* ---------------- inline SVG crop illustrations ---------------- */
  const ART = {
onion:`<ellipse cx="60" cy="72" rx="30" ry="34" fill="#B0713C"/><ellipse cx="60" cy="72" rx="30" ry="34" fill="url(#og)" opacity=".5"/><path d="M60 40c-4-12-10-18-16-22M60 40c0-13 3-20 6-25M60 40c5-10 11-16 17-19" stroke="#4C9A2A" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M44 62c4 14 4 24 2 34M76 62c-4 14-4 24-2 34" stroke="#8A5528" stroke-width="2" fill="none" opacity=".7"/>`,
tomato:`<circle cx="60" cy="70" r="32" fill="#E23B2E"/><ellipse cx="48" cy="58" rx="10" ry="7" fill="#fff" opacity=".22"/><path d="M60 40l-16-8 10 14-14 2 16 6-4 12 6-10 8 9-2-12 14-4-14-3 8-11z" fill="#3E8E2F"/>`,
potato:`<ellipse cx="56" cy="70" rx="34" ry="26" fill="#B98A50" transform="rotate(-12 56 70)"/><ellipse cx="44" cy="62" rx="4" ry="3" fill="#8B6234"/><ellipse cx="64" cy="76" rx="4" ry="3" fill="#8B6234"/><ellipse cx="72" cy="60" rx="3" ry="2" fill="#8B6234"/><ellipse cx="46" cy="60" rx="10" ry="6" fill="#fff" opacity=".15"/>`,
cauliflower:`<path d="M28 84c-6 12 2 22 16 22h32c14 0 22-10 16-22" fill="#4C9A2A"/><circle cx="46" cy="62" r="18" fill="#F6F3E4"/><circle cx="72" cy="60" r="19" fill="#FBF8EC"/><circle cx="58" cy="48" r="17" fill="#FFFDF4"/><circle cx="60" cy="72" r="16" fill="#F2EEDC"/><circle cx="52" cy="56" r="5" fill="#EDE7CE"/><circle cx="70" cy="70" r="5" fill="#EDE7CE"/>`,
okra:`<path d="M40 34c6 22 4 44-4 66" stroke="#4C9A2A" stroke-width="12" stroke-linecap="round" fill="none"/><path d="M66 30c6 24 4 46-4 68" stroke="#5FB335" stroke-width="12" stroke-linecap="round" fill="none"/><path d="M92 40c4 20 2 40-6 58" stroke="#3F8A24" stroke-width="11" stroke-linecap="round" fill="none"/><path d="M36 32l8-10 8 10zM62 28l8-10 8 10z" fill="#2F6B1B"/>`,
chili:`<path d="M46 40c22 4 34 26 30 46-3 15-14 22-22 18 10-10 12-28 0-42-6-7-8-16-8-22z" fill="#D62B20"/><path d="M46 40c-6-6-14-8-22-6" stroke="#3E8E2F" stroke-width="7" fill="none" stroke-linecap="round"/><ellipse cx="56" cy="56" rx="5" ry="9" fill="#fff" opacity=".2" transform="rotate(-20 56 56)"/>`,
brinjal:`<path d="M56 44c20 4 30 22 26 42-4 18-22 28-36 20-14-8-16-30-4-46 4-8 8-14 14-16z" fill="#6A3D8F"/><ellipse cx="48" cy="66" rx="7" ry="12" fill="#fff" opacity=".16" transform="rotate(-15 48 66)"/><path d="M58 44l-12-10 14 2-6-12 10 10 6-12 2 14 12-4-10 10z" fill="#3E8E2F"/>`,
carrot:`<path d="M60 40l22 6-30 56-22-56z" fill="#F07A1E"/><path d="M52 56h16M48 70h24M56 84h8" stroke="#C85F10" stroke-width="3" fill="none"/><path d="M60 40c-8-10-18-14-28-14 10 6 16 12 20 18M60 40c2-12 8-20 18-26-6 10-10 18-10 26M60 40c8-8 18-12 28-10-10 4-18 10-22 16" fill="#4C9A2A"/>`,
grape:`<circle cx="46" cy="52" r="11" fill="#7B3F9D"/><circle cx="68" cy="52" r="11" fill="#8A49AC"/><circle cx="57" cy="68" r="11" fill="#7B3F9D"/><circle cx="38" cy="70" r="10" fill="#6C3590"/><circle cx="76" cy="70" r="10" fill="#8A49AC"/><circle cx="57" cy="90" r="10" fill="#6C3590"/><circle cx="47" cy="86" r="9" fill="#7B3F9D"/><circle cx="67" cy="86" r="9" fill="#8A49AC"/><path d="M57 40V26" stroke="#6B4A2A" stroke-width="4"/><path d="M57 28c10-8 22-8 30-2-10 8-22 8-30 2z" fill="#4C9A2A"/>`,
banana:`<path d="M40 34c-14 14-18 38-8 56 6 12 18 16 26 10-10-6-16-18-14-32 2-14 8-24 14-30z" fill="#F4C430"/><path d="M66 30c-14 14-18 38-8 56 6 12 18 16 26 10-10-6-16-18-14-32 2-14 8-24 14-30z" fill="#E5B021"/><path d="M52 40c-10 14-12 34-4 50" stroke="#C99A17" stroke-width="3" fill="none"/><rect x="38" y="24" width="36" height="10" rx="5" fill="#6B4A2A"/>`,
pomegranate:`<circle cx="60" cy="70" r="32" fill="#C42B32"/><path d="M60 38l-6-12h12z" fill="#8E5A2A"/><circle cx="52" cy="64" r="5" fill="#fff" opacity=".2"/><path d="M74 56c6 10 6 22 0 30" stroke="#8E1E24" stroke-width="3" fill="none" opacity=".6"/>`,
wheat:`<path d="M60 112V34" stroke="#C9A227" stroke-width="4"/><g fill="#E3C34A" stroke="#B98F1D" stroke-width="1.5"><ellipse cx="48" cy="42" rx="9" ry="5" transform="rotate(-30 48 42)"/><ellipse cx="72" cy="42" rx="9" ry="5" transform="rotate(30 72 42)"/><ellipse cx="46" cy="58" rx="9" ry="5" transform="rotate(-30 46 58)"/><ellipse cx="74" cy="58" rx="9" ry="5" transform="rotate(30 74 58)"/><ellipse cx="46" cy="74" rx="9" ry="5" transform="rotate(-30 46 74)"/><ellipse cx="74" cy="74" rx="9" ry="5" transform="rotate(30 74 74)"/><ellipse cx="60" cy="26" rx="7" ry="12"/></g><path d="M60 26l-8-18M60 26l8-18" stroke="#C9A227" stroke-width="2"/>`,
paddy:`<path d="M60 112c0-30 0-50-6-72" stroke="#9CB44A" stroke-width="4" fill="none"/><g fill="#E8CE6A" stroke="#C4A93F" stroke-width="1.4"><ellipse cx="50" cy="34" rx="7" ry="4" transform="rotate(-40 50 34)"/><ellipse cx="42" cy="48" rx="7" ry="4" transform="rotate(-40 42 48)"/><ellipse cx="36" cy="62" rx="7" ry="4" transform="rotate(-40 36 62)"/><ellipse cx="62" cy="36" rx="7" ry="4" transform="rotate(35 62 36)"/><ellipse cx="70" cy="50" rx="7" ry="4" transform="rotate(35 70 50)"/><ellipse cx="76" cy="64" rx="7" ry="4" transform="rotate(35 76 64)"/></g><path d="M74 112c2-26 8-42 18-56" stroke="#9CB44A" stroke-width="3" fill="none"/>`,
soybean:`<path d="M60 112V40" stroke="#7C9A3E" stroke-width="3"/><path d="M40 52c14-4 26 2 30 12-12 8-26 4-30-12zM80 68c-14-4-26 2-30 12 12 8 26 4 30-12z" fill="#A8C256"/><g fill="#D9C07A" stroke="#B39A55" stroke-width="1.5"><ellipse cx="44" cy="86" rx="12" ry="6" transform="rotate(-20 44 86)"/><ellipse cx="76" cy="90" rx="12" ry="6" transform="rotate(20 76 90)"/></g>`,
sugarcane:`<g stroke="#8FA93E" stroke-width="12" stroke-linecap="butt"><path d="M34 112V30"/><path d="M60 112V22"/><path d="M86 112V34"/></g><g stroke="#6E8A2C" stroke-width="2"><path d="M28 46h12M28 66h12M28 86h12M54 40h12M54 60h12M54 80h12M80 50h12M80 70h12M80 90h12"/></g><path d="M34 30c-10-8-14-16-14-24 10 6 16 14 18 22M60 22c-8-10-8-18-6-26 8 8 12 16 12 24M86 34c8-8 14-14 20-18-4 10-10 16-16 20" fill="#5E9E3A"/>`,
cotton:`<path d="M60 112V56" stroke="#7C6A46" stroke-width="4"/><circle cx="46" cy="44" r="14" fill="#FBFBF7"/><circle cx="74" cy="44" r="14" fill="#F4F4EE"/><circle cx="60" cy="30" r="15" fill="#FFFFFF"/><circle cx="60" cy="52" r="12" fill="#F7F7F1"/><path d="M40 56l-6 8M80 56l6 8" stroke="#7C6A46" stroke-width="3"/>`
  };
  function cropArt(key, size) {
    const s = size || 120;
    return `<svg viewBox="0 0 120 120" width="${s}" height="${s}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">` +
      `<defs><radialGradient id="og" cx=".35" cy=".3"><stop offset="0" stop-color="#fff" stop-opacity=".5"/><stop offset="1" stop-color="#000" stop-opacity=".18"/></radialGradient></defs>` +
      `<rect width="120" height="120" rx="16" fill="#F3F8EE"/>` + (ART[key] || ART.onion) + `</svg>`;
  }
  function cropEmojiLike(key) {
    return { onion: '🧅', tomato: '🍅', potato: '🥔', cauliflower: '🥦', okra: '🫛', chili: '🌶️', brinjal: '🍆', carrot: '🥕', grape: '🍇', banana: '🍌', pomegranate: '🍎', wheat: '🌾', paddy: '🌾', soybean: '🫘', sugarcane: '🎋', cotton: '☁️' }[key] || '🌾';
  }

  /* ---------------- actors ---------------- */
  const FARMER_SEED = [
    { name: 'Suresh Patil',    village: 'Baramati',     acres: 4.2, phone: '+91 98••• 41•20' },
    { name: 'Ramesh Jadhav',   village: 'Indapur',      acres: 6.8, phone: '+91 97••• 22•11' },
    { name: 'Kavita Bhosale',  village: 'Narayangaon',  acres: 3.1, phone: '+91 99••• 63•08' },
    { name: 'Anil Kadam',      village: 'Junnar',       acres: 5.5, phone: '+91 98••• 77•45' },
    { name: 'Dattatraya Shinde', village: 'Daund',      acres: 8.0, phone: '+91 96••• 15•90' },
    { name: 'Vijay Pawar',     village: 'Saswad',       acres: 2.4, phone: '+91 90••• 48•33' },
    { name: 'Ganesh Thorat',   village: 'Shirur',       acres: 7.3, phone: '+91 91••• 30•76' },
    { name: 'Sunita More',     village: 'Manchar',      acres: 1.9, phone: '+91 95••• 52•14' },
    { name: 'Mahadev Gaikwad', village: 'Yavat',        acres: 6.0, phone: '+91 94••• 09•62' },
    { name: 'Prakash Chavan',  village: 'Rajgurunagar', acres: 3.7, phone: '+91 93••• 71•28' },
    { name: 'Sandip Bhilare',  village: 'Bhor',         acres: 2.8, phone: '+91 98••• 66•03' },
    { name: 'Rekha Jadhav',    village: 'Talegaon',     acres: 4.9, phone: '+91 97••• 24•87' }
  ];
  const VENDOR_SEED = [
    { name: 'GreenMandi Traders',        area: 'Market Yard (Gultekdi)', capacity: 5000, rating: 4.6, licence: 'MH/APMC/2019/1147', speciality: ['onion', 'potato', 'tomato'] },
    { name: 'Sai Krishi Supply Co.',     area: 'Hadapsar',               capacity: 3500, rating: 4.3, licence: 'MH/APMC/2021/2286', speciality: ['tomato', 'okra', 'brinjal'] },
    { name: 'Shivneri Agro Depot',       area: 'Junnar',                 capacity: 6000, rating: 4.7, licence: 'MH/APMC/2017/0874', speciality: ['grape', 'onion', 'pomegranate'] },
    { name: 'Konkan Fresh Wholesale',    area: 'Kothrud',                capacity: 2800, rating: 4.1, licence: 'MH/APMC/2020/1663', speciality: ['cauliflower', 'carrot', 'okra'] },
    { name: 'Baramati Trade Centre',     area: 'Baramati',               capacity: 8000, rating: 4.5, licence: 'MH/APMC/2016/0412', speciality: ['sugarcane', 'onion', 'soybean'] },
    { name: 'Pimpri Sabzi Hub',          area: 'Pimpri',                 capacity: 4200, rating: 4.2, licence: 'MH/APMC/2022/3091', speciality: ['potato', 'brinjal', 'chili'] },
    { name: 'Daund Agri Mandi Pvt.',     area: 'Daund',                  capacity: 5200, rating: 3.6, licence: 'MH/APMC/2023/4402', speciality: ['paddy', 'wheat', 'cotton'], flagged: true }
  ];
  const PARTNER_SEED = [
    { name: 'Raju Kamble',    area: 'Market Yard (Gultekdi)', vehicle: 'Two-wheeler box', capKg: 45,  rating: 4.5, perKm: 9,  perDrop: 22, speed: 26 },
    { name: 'Imran Shaikh',   area: 'Hadapsar',               vehicle: 'Tata Ace (tempo)', capKg: 700, rating: 4.7, perKm: 16, perDrop: 34, speed: 32 },
    { name: 'Ganesh Wagh',    area: 'Kothrud',                vehicle: 'E-rickshaw',       capKg: 220, rating: 4.4, perKm: 11, perDrop: 28, speed: 20 },
    { name: 'Sandeep Jadhav', area: 'Pimpri',                 vehicle: 'Bolero Pickup',    capKg: 900, rating: 4.6, perKm: 17, perDrop: 36, speed: 34 },
    { name: 'Pooja More',     area: 'Viman Nagar',            vehicle: 'EV Cargo Van',     capKg: 350, rating: 4.8, perKm: 8,  perDrop: 30, speed: 28 }
  ];
  const CUSTOMER_SEED = [
    { name: 'Aarti Deshpande', area: 'Kothrud',     family: 4 },
    { name: 'Mohit Agarwal',   area: 'Viman Nagar', family: 3 },
    { name: 'Farida Bagwan',   area: 'Camp / MG Road', family: 5 },
    { name: 'Rohit Salunkhe',  area: 'Katraj',      family: 2 },
    { name: 'Meena Joshi',     area: 'Aundh',       family: 4 },
    { name: 'Kapil Nair',      area: 'Kharadi',     family: 3 },
    { name: 'Shabana Shaikh',  area: 'Dhankawadi',  family: 6 },
    { name: 'Vivek Rathod',    area: 'Wakad',       family: 3 },
    { name: 'Sneha Kulkarni',  area: 'Baner',       family: 4 },
    { name: 'Imran Qureshi',   area: 'Chinchwad',   family: 5 }
  ];

  const DELIVERY_SLOTS = [
    { id: 'S1', label: '9 AM – 11 AM',  start: 9,  end: 11, capacity: 26 },
    { id: 'S2', label: '11 AM – 1 PM',  start: 11, end: 13, capacity: 30 },
    { id: 'S3', label: '1 PM – 3 PM',   start: 13, end: 15, capacity: 34 },
    { id: 'S4', label: '3 PM – 5 PM',   start: 15, end: 17, capacity: 30 },
    { id: 'S5', label: '5 PM – 7 PM',   start: 17, end: 19, capacity: 24 }
  ];

  /* unified place lookup: villages (farms) + city areas (markets/customers) */
  const ALL_PLACES = VILLAGES.concat(CITY_AREAS);
  function findPlace(name) {
    return ALL_PLACES.find(p => p.name === name)
      || ALL_PLACES.find(p => p.name.toLowerCase().indexOf(String(name).toLowerCase()) === 0)
      || CITY_AREAS[0];
  }

  const RESERVE_RATIO = 0.70;   /* 70% reserved for AGRILINK customers */
  const FREE_RATIO = 0.30;      /* 30% free / private allocation      */
  const MAX_VENDORS_PER_CROP = 3;

  g.AG = g.AG || {};
  g.AG.util = { mulberry32, clamp, round, pick, ri, haversine, roadKm, fmtMoney, fmtKg, fmtDate, fmtDay, timeAgo, DAY };
  g.AG.geo = { VILLAGES, CITY_AREAS, ALL_PLACES, findPlace };
  g.AG.catalog = { CROPS, CROP_BY_KEY, cropArt, cropEmojiLike, DELIVERY_SLOTS, RESERVE_RATIO, FREE_RATIO, MAX_VENDORS_PER_CROP };
  g.AG.people = { FARMER_SEED, VENDOR_SEED, PARTNER_SEED, CUSTOMER_SEED };

  /* ============================================================
     Seed a week of believable history so the government dashboard
     is not empty at first launch.
     ============================================================ */
  function buildSeed() {
    const rng = mulberry32(20260913);
    const now = Date.now();
    const st = {
      version: 6, createdAt: now, lang: null, role: 'farmer',
      currentFarmer: 'F-6', currentVendor: 'V-1', currentPartner: 'P-2', currentCustomer: 'C-1',
      seq: { crop: 100, track: 100, batch: 100, order: 100, route: 100, bid: 100, notif: 100, alert: 100, audit: 100, txn: 100 },
      farmers: [], vendors: [], partners: [], customers: [],
      crops: [], bids: [], batches: [], orders: [], routes: [], payments: [],
      notifications: [], alerts: [], audit: [], events: [], cart: [],
      settings: { voice: true, demoMode: false, animationSpeed: 1 },
      counters: { wastageKg: 0, spoilKg: 0 },
      needsRouteBuild: true
    };

    /* --- people --- */
    st.farmers = FARMER_SEED.map((f, i) => {
      const v = findPlace(f.village);
      return {
        id: 'F-' + (i + 1), name: f.name, village: f.village, taluka: v.taluka, acres: f.acres,
        phone: f.phone, lat: v.lat + (rng() - .5) * .05, lng: v.lng + (rng() - .5) * .05,
        rating: round(3.9 + rng() * 1.0, 1), verified: true, aadhaarMask: 'XXXX-XXXX-' + ri(rng, 1000, 9999),
        since: ri(rng, 2019, 2024), cropsSold: 0, earned: 0, lang: i === 0 ? 'mr' : 'en'
      };
    });
    st.vendors = VENDOR_SEED.map((v, i) => {
      const a = findPlace(v.area);
      return {
        id: 'V-' + (i + 1), name: v.name, area: v.area, lat: a.lat + (rng() - .5) * .02, lng: a.lng + (rng() - .5) * .02,
        capacityKg: v.capacity, usedKg: 0, rating: v.rating, licence: v.licence, speciality: v.speciality,
        verified: true, gst: '27AA' + ri(rng, 1000, 9999) + 'A1Z' + ri(rng, 1, 9), flagged: !!v.flagged,
        bidsWon: 0, freeSoldKg: 0, reservedSoldKg: 0, violations: 0
      };
    });
    st.partners = PARTNER_SEED.map((p, i) => {
      const a = findPlace(p.area);
      return {
        id: 'P-' + (i + 1), name: p.name, area: p.area, lat: a.lat, lng: a.lng, vehicle: p.vehicle,
        capKg: p.capKg, rating: p.rating, perKm: p.perKm, perDrop: p.perDrop, speedKmph: p.speed,
        verified: true, dl: 'MH12 ' + ri(rng, 201800000, 202399999), todayEarnings: 0, todayDeliveries: 0,
        totalEarnings: ri(rng, 8000, 42000), status: 'idle', activeRoute: null
      };
    });
    st.customers = CUSTOMER_SEED.map((c, i) => {
      const a = findPlace(c.area);
      return {
        id: 'C-' + (i + 1), name: c.name, area: c.area, lat: a.lat + (rng() - .5) * .03, lng: a.lng + (rng() - .5) * .03,
        family: c.family, phone: '+91 9' + ri(rng, 100000000, 999999999), verified: true, orders: 0, saved: 0
      };
    });

    const nextTrack = () => 'CROP-IND-' + String(++st.seq.track).padStart(6, '0');
    const trackIds = [];

    /* --- crops + batches + orders history --- */
    const HIST = [
      { crop: 'onion', farmer: 'F-1', vendor: 'V-1', qty: 820, daysAgo: 12, soldOut: true },
      { crop: 'tomato', farmer: 'F-2', vendor: 'V-2', qty: 460, daysAgo: 9, soldOut: true },
      { crop: 'grape', farmer: 'F-3', vendor: 'V-3', qty: 300, daysAgo: 8, soldOut: true },
      { crop: 'potato', farmer: 'F-4', vendor: 'V-6', qty: 1200, daysAgo: 15, soldOut: true },
      { crop: 'cauliflower', farmer: 'F-7', vendor: 'V-4', qty: 240, daysAgo: 6, soldOut: true },
      { crop: 'onion', farmer: 'F-5', vendor: 'V-5', qty: 2100, daysAgo: 5, soldOut: false },
      { crop: 'okra', farmer: 'F-8', vendor: 'V-2', qty: 180, daysAgo: 1, soldOut: false },
      { crop: 'banana', farmer: 'F-9', vendor: 'V-1', qty: 520, daysAgo: 4, soldOut: false },
      { crop: 'chili', farmer: 'F-10', vendor: 'V-6', qty: 210, daysAgo: 2, soldOut: false },
      { crop: 'paddy', farmer: 'F-5', vendor: 'V-7', qty: 3400, daysAgo: 7, soldOut: false, anomaly: true },
      { crop: 'carrot', farmer: 'F-6', vendor: 'V-4', qty: 260, daysAgo: 26, soldOut: true, spoiled: true },
      { crop: 'brinjal', farmer: 'F-11', vendor: 'V-2', qty: 200, daysAgo: 1, soldOut: false }
    ];

    HIST.forEach((h, idx) => {
      const def = CROP_BY_KEY[h.crop];
      const farmer = st.farmers.find(f => f.id === h.farmer);
      const vendor = st.vendors.find(v => v.id === h.vendor);
      const created = now - h.daysAgo * DAY - ri(rng, 0, 8) * 3600000;
      const tid = nextTrack(); trackIds.push(tid);
      const qualityScore = round(clamp(62 + rng() * 34, 55, 97), 0);
      const grade = qualityScore >= 85 ? 'A' : qualityScore >= 72 ? 'B' : 'C';
      const farmPrice = round(def.farmMin + rng() * (def.farmMax - def.farmMin), 1);
      const dist = roadKm(farmer, vendor);
      const analysis = {
        qualityScore, grade, freshness: round(clamp(qualityScore + rng() * 6 - 3, 40, 99), 0),
        ripeness: round(55 + rng() * 40, 0), damage: round(rng() * 7, 1), disease: round(rng() * 4, 1),
        size: pick(rng, ['Small', 'Medium', 'Large', 'Uniform']), moisture: round(def.moisture[0] + rng() * (def.moisture[1] - def.moisture[0]), 1),
        shelfLife: Math.max(2, Math.round(def.shelf * (0.8 + rng() * 0.35))), spoilageRisk: def.spoil,
        transport: def.transport, transportCost: Math.round(h.qty * (0.85 + dist * 0.035)),
        demand: clamp(Math.round(def.demand + (rng() * 18 - 9)), 20, 99),
        suggestedPrice: farmPrice, minBid: round(farmPrice * 0.86, 1), maxBid: round(farmPrice * 1.24, 1),
        harvestCondition: pick(rng, ['Dry & clean', 'Slightly damp', 'Field fresh', 'Sun-dried']),
        confidence: round(88 + rng() * 10, 1)
      };
      const crop = {
        id: 'CR-' + (++st.seq.crop), trackingId: tid, farmerId: farmer.id, vendorId: null,
        cropKey: h.crop, cropName: def.name, category: def.cat, qtyKg: h.qty,
        radiusKm: pick(rng, [10, 20, 30, 50]), analysis,
        status: 'sold_out', photoSeed: ri(rng, 1, 99999),
        createdAt: created, postedAt: created + 60000, matchedAt: created + 900000, awardedAt: null,
        pickedAt: null, notifiedVendors: [], bids: [], winnerBidId: null, batchId: null,
        retailPrice: Math.round(analysis.suggestedPrice * def.retail), pickupEtaHrs: round(dist / 26, 1)
      };
      const losers = st.vendors.filter(v => v.id !== vendor.id).sort(() => rng() - .5).slice(0, 2);
      crop.notifiedVendors = [vendor.id].concat(losers.map(l => l.id));
      crop.bids = [
        { id: 'BID-' + (++st.seq.bid), cropId: crop.id, vendorId: vendor.id, price: round(farmPrice * (1 + rng() * .12), 1), qtyKg: h.qty, createdAt: created + 3600000 * ri(rng, 2, 6), status: 'won', message: 'Same-day pickup, own tempo.' },
        { id: 'BID-' + (++st.seq.bid), cropId: crop.id, vendorId: losers[0].id, price: round(farmPrice * (0.92 + rng() * .1), 1), qtyKg: h.qty, createdAt: created + 3600000 * ri(rng, 2, 7), status: 'lost', message: '' },
        { id: 'BID-' + (++st.seq.bid), cropId: crop.id, vendorId: losers[1] ? losers[1].id : losers[0].id, price: round(farmPrice * (0.88 + rng() * .1), 1), qtyKg: h.qty, createdAt: created + 3600000 * ri(rng, 2, 8), status: 'lost', message: '' }
      ];
      crop.winnerBidId = crop.bids[0].id;
      crop.awardedAt = created + DAY * 0.4;
      crop.pickedAt = created + DAY * 0.55;
      crop.status = h.soldOut ? 'sold_out' : 'selling';
      vendor.bidsWon++;
      farmer.cropsSold++;
      farmer.earned += Math.round(crop.bids[0].price * h.qty);
      st.crops.push(crop);
      st.bids.push(...crop.bids);

      /* batch with 30/70 split */
      const receivedAt = crop.pickedAt;
      const total = h.qty;
      const wastage = h.spoiled ? Math.round(total * 0.22) : Math.round(total * (0.005 + rng() * 0.015));
      /* targets — actual reserved consumption is accumulated from the generated orders */
      let targetReserved, soldFree;
      if (h.soldOut) {
        targetReserved = Math.floor(total * RESERVE_RATIO) - wastage;
        soldFree = Math.floor(total * FREE_RATIO);
      } else {
        targetReserved = Math.floor(total * RESERVE_RATIO * (0.22 + rng() * 0.30));
        soldFree = Math.floor(total * FREE_RATIO * (0.25 + rng() * 0.45));
      }
      if (h.anomaly) { soldFree = Math.floor(total * 0.52); targetReserved = Math.floor(total * 0.1); }  /* over-allocation anomaly */
      const free = Math.floor(total * FREE_RATIO), reserved = total - free;
      const batch = {
        id: 'BATCH-' + (++st.seq.batch), cropId: crop.id, trackingId: tid, vendorId: vendor.id, farmerId: farmer.id,
        cropKey: h.crop, cropName: def.name, qtyKg: total, qualityScore: qualityScore, grade,
        receivedAt, shelfLifeDays: analysis.shelfLife, spoilageRisk: analysis.spoilageRisk,
        freeKg: free, reservedKg: reserved, freeUsedKg: soldFree, reservedSoldKg: 0, reservedAllocatedKg: 0,
        wastageKg: wastage, pricePerKgFarm: crop.bids[0].price, retailPrice: crop.retailPrice,
        status: (soldFree + targetReserved + wastage) >= total - 1 ? 'empty' : 'active',
        movements: [
          { ts: receivedAt, stage: 'farm→vendor', qtyKg: total, actor: farmer.name, note: 'Weighed at farm gate' },
          { ts: receivedAt + 7200000, stage: 'vendor-inventory', qtyKg: total, actor: vendor.name, note: 'Graded & stored. 30% free / 70% reserved' }
        ]
      };
      crop.batchId = batch.id;
      if (h.anomaly) {
        batch.retailPrice = Math.round(batch.pricePerKgFarm * 2.6);   /* abnormal spread → Algorithm 3 */
        batch.frozen = true; batch.status = 'under_review';
        batch.reviewNote = 'Frozen by government monitoring pending enquiry (allocation violation + price anomaly).';
        crop.retailPrice = batch.retailPrice;
      }
      if (soldFree > 0) batch.movements.push({ ts: receivedAt + DAY, stage: 'free-sale', qtyKg: soldFree, actor: vendor.name, note: 'Open-market / private sale (30% allocation)' });
      st.batches.push(batch);
      st.events.push({ ts: receivedAt, stage: 'harvest', qtyKg: total, trackingId: tid });
      st.events.push({ ts: receivedAt + 3600000, stage: 'vendor', qtyKg: total, trackingId: tid });
      st.events.push({ ts: receivedAt + 7200000, stage: 'inventory', qtyKg: total, trackingId: tid });

      /* --- customer orders against reserved stock --- */
      const orderCount = h.soldOut ? ri(rng, 4, 7) : ri(rng, 3, 5);
      const perOrder = Math.max(2, Math.floor(targetReserved / Math.max(1, orderCount)));
      for (let o = 0; o < orderCount; o++) {
        const cust = pick(rng, st.customers);
        const qty = Math.max(1, Math.min(perOrder + ri(rng, -2, 3), targetReserved - o * perOrder));
        if (qty <= 0) continue;
        const slot = pick(rng, DELIVERY_SLOTS);
        const partner = pick(rng, st.partners);
        const placedAt = receivedAt + DAY * (0.3 + o * 0.25);
        const oid = 'ORD-' + (++st.seq.order);
        const delivered = true;   /* history is fully closed out; today's live orders are added below */
        st.orders.push({
          id: oid, customerId: cust.id, vendorId: vendor.id, batchId: batch.id, trackingId: tid,
          cropKey: h.crop, cropName: def.name, qtyKg: qty, pricePerKg: crop.retailPrice,
          total: Math.round(qty * crop.retailPrice), slot: slot.id, slotLabel: slot.label,
          status: delivered ? 'delivered' : 'placed', payment: delivered ? 'paid' : 'pending',
          method: pick(rng, ['UPI', 'UPI', 'Cash on delivery']),
          placedAt, deliveredAt: delivered ? placedAt + DAY * 0.4 : null, routeId: null, partnerId: partner.id,
          events: [
            { ts: placedAt, status: 'placed', note: 'Order placed by customer' },
            { ts: placedAt + 600000, status: 'confirmed', note: 'Vendor confirmed from reserved stock' }
          ]
        });
        cust.orders++;
        batch.reservedSoldKg = Math.min(reserved, batch.reservedSoldKg + qty);
        if (batch.reservedSoldKg + (batch.reservedAllocatedKg || 0) >= reserved && (batch.freeKg - batch.freeUsedKg) <= 0) batch.status = 'empty';
        if (delivered) {
          st.payments.push({ id: 'TXN-' + (++st.seq.txn), orderId: oid, amount: Math.round(qty * crop.retailPrice), method: 'UPI', status: 'settled', ts: placedAt + DAY * 0.42, vendorId: vendor.id, farmerShare: Math.round(qty * crop.bids[0].price) });
          st.events.push({ ts: placedAt + DAY * 0.4, stage: 'customer', qtyKg: qty, trackingId: tid });
        }
      }
    });

    /* --- live "in-flight" state so dashboards look active --- */
    /* A crop currently open for bidding */
    (function openBidding() {
      const def = CROP_BY_KEY['tomato'];
      const farmer = st.farmers[1], vendor = st.vendors[0];
      const created = now - 5 * 3600000;
      const tid = nextTrack(); trackIds.push(tid);
      const analysis = {
        qualityScore: 88, grade: 'A', freshness: 95, ripeness: 78, damage: 2.1, disease: 0.4, size: 'Uniform',
        moisture: 91, shelfLife: 6, spoilageRisk: 'high', transport: def.transport, transportCost: 1450,
        demand: 94, suggestedPrice: 28, minBid: 24, maxBid: 34.5, harvestCondition: 'Field fresh', confidence: 96.2
      };
      const crop = {
        id: 'CR-' + (++st.seq.crop), trackingId: tid, farmerId: farmer.id, vendorId: null,
        cropKey: 'tomato', cropName: def.name, category: def.cat, qtyKg: 640, radiusKm: 30, analysis,
        status: 'bidding', photoSeed: 4242, createdAt: created, postedAt: created, matchedAt: created + 60000,
        awardedAt: null, pickedAt: null, notifiedVendors: ['V-1', 'V-2', 'V-6'],
        bids: [{ id: 'BID-' + (++st.seq.bid), cropId: null, vendorId: 'V-2', price: 27.5, qtyKg: 640, createdAt: created + 7200000, status: 'open', message: 'Crates ready, pickup in 4 hrs.' }],
        winnerBidId: null, batchId: null, retailPrice: 44, pickupEtaHrs: 3.2
      };
      crop.bids[0].cropId = crop.id;
      st.crops.push(crop); st.bids.push(crop.bids[0]);
      st.notifications.push({ id: 'N-' + (++st.seq.notif), role: 'vendor', roleId: 'V-2', type: 'bid', title: 'Bid submitted', body: 'You bid ₹27.5/kg for 640 kg Tomato (Ramesh Jadhav).', ts: created + 7200000, read: true });
      st.notifications.push({ id: 'N-' + (++st.seq.notif), role: 'farmer', roleId: 'F-2', type: 'bid', title: 'नवीन बोली आली', body: 'Sai Krishi Supply Co. ने ₹27.5/kg बोली लगाई (टमाटर, 640 kg).', ts: created + 7200000, read: false });
    })();

    /* --- fresh orders placed today (slot 1 PM – 3 PM) so every app is live at launch --- */
    (function freshOrders() {
      const picks = [
        { cust: 'C-1', batchKey: 'onion', qty: 6 },
        { cust: 'C-3', batchKey: 'banana', qty: 4 },
        { cust: 'C-5', batchKey: 'chili', qty: 2.5 },
        { cust: 'C-2', batchKey: 'okra', qty: 3 }
      ];
      picks.forEach((pk, i) => {
        const avail = x => !x.frozen && (x.reservedKg - x.reservedSoldKg - (x.reservedAllocatedKg || 0)) >= pk.qty;
        const b = st.batches.find(x => avail(x) && x.cropKey === pk.batchKey) || st.batches.find(x => avail(x));
        if (!b) return;
        const cust = st.customers.find(c => c.id === pk.cust);
        const slot = DELIVERY_SLOTS[2];
        const oid = 'ORD-' + (++st.seq.order);
        const placedAt = now - (2 + i) * 1500000;
        b.reservedAllocatedKg = round((b.reservedAllocatedKg || 0) + pk.qty, 1);
        st.orders.unshift({
          id: oid, customerId: cust.id, vendorId: b.vendorId, batchId: b.id, trackingId: b.trackingId,
          cropKey: b.cropKey, cropName: b.cropName, qtyKg: pk.qty, pricePerKg: b.retailPrice,
          total: Math.round(pk.qty * b.retailPrice), slot: slot.id, slotLabel: slot.label, status: 'ready',
          payment: 'pending', method: i % 2 ? 'Cash on delivery' : 'UPI', placedAt, deliveredAt: null,
          routeId: null, partnerId: null, address: cust.area,
          events: [
            { ts: placedAt, status: 'placed', note: 'Order placed by ' + cust.name + ' · slot ' + slot.label },
            { ts: placedAt + 420000, status: 'confirmed', note: 'Vendor confirmed from 70% reserved stock' },
            { ts: placedAt + 900000, status: 'ready', note: 'Packed and ready for delivery partner' }
          ]
        });
        cust.orders++;
        st.events.push({ ts: placedAt, stage: 'reserved_allocated', qtyKg: pk.qty, trackingId: b.trackingId });
      });
    })();

    /* --- notifications sprinkles --- */
    st.notifications.push(
      { id: 'N-' + (++st.seq.notif), role: 'farmer', roleId: 'F-1', type: 'tip', title: 'बाजार सूचना', body: 'बारामती मंडईत कांद्याचा भाव ₹22/kg वर स्थिर आहे.', ts: now - 3 * 3600000, read: false },
      { id: 'N-' + (++st.seq.notif), role: 'farmer', roleId: 'F-1', type: 'payment', title: 'पैसे आले', body: '₹18,860 GreenMandi Traders कडून मिळाले (कांदा 820 kg).', ts: now - 2 * DAY, read: true },
      { id: 'N-' + (++st.seq.notif), role: 'vendor', roleId: 'V-1', type: 'opportunity', title: 'New crop opportunity', body: '640 kg Grade-A Tomato from Indapur, 46 km away. Bidding open.', ts: now - 5 * 3600000, read: false },
      { id: 'N-' + (++st.seq.notif), role: 'vendor', roleId: 'V-1', type: 'stock', title: 'Reserved stock reminder', body: '70% of every batch stays reserved for AGRILINK customers.', ts: now - 9 * 3600000, read: true },
      { id: 'N-' + (++st.seq.notif), role: 'partner', roleId: 'P-2', type: 'route', title: 'Route completed', body: '6 deliveries done in 1 PM – 3 PM slot. Earnings ₹842.', ts: now - 20 * 3600000, read: true },
      { id: 'N-' + (++st.seq.notif), role: 'customer', roleId: 'C-1', type: 'order', title: 'Order delivered', body: 'Your order of Onions was delivered. Thank you!', ts: now - 1.4 * DAY, read: true }
    );

    /* --- alerts (black-market / compliance monitoring) --- */
    st.alerts.push({
      id: 'AL-' + (++st.seq.alert), type: 'allocation_violation', severity: 'high', status: 'open',
      title: 'Potential stock allocation violation detected',
      message: 'Daund Agri Mandi Pvt. moved 52% of batch stock through open-market sale. Free allocation limit is 30%. 70% must remain reserved for AGRILINK customers.',
      entityId: 'BATCH-' + st.batches.filter(b => b.cropKey === 'paddy')[0], ts: now - 6 * DAY,
      vendorId: 'V-7', farmerId: 'F-5', trackingId: trackIds[9] || null,
      trail: [
        { ts: now - 7 * DAY, who: 'Mahadev Gaikwad (Farmer)', what: '3400 kg Paddy harvested & posted', where: 'Daund' },
        { ts: now - 6.8 * DAY, who: 'Daund Agri Mandi Pvt.', what: 'Won bid at ₹23.4/kg', where: 'Daund' },
        { ts: now - 6.5 * DAY, who: 'Daund Agri Mandi Pvt.', what: 'Batch received — free 1020 kg / reserved 2380 kg', where: 'Godown 3' },
        { ts: now - 6 * DAY, who: 'Daund Agri Mandi Pvt.', what: 'Open-market sale of 1768 kg (52%) — exceeds 30% cap', where: 'Unregistered buyer' },
        { ts: now - 6 * DAY, who: 'AGRILINK Algorithm 3', what: 'Anomaly flagged: allocation violation + abnormal price spread', where: 'Compliance engine' }
      ],
      metrics: { allowed: '1020 kg', moved: '1768 kg', excess: '748 kg', rule: '30% free / 70% reserved' }
    });
    st.alerts.push({
      id: 'AL-' + (++st.seq.alert), type: 'price_anomaly', severity: 'medium', status: 'open',
      title: 'Abnormal retail price detected',
      message: 'Paddy retail price at Daund Agri Mandi Pvt. is 2.6× the farm gate price — above the 1.8× corridor used for kala-bajari screening.',
      entityId: 'V-7', ts: now - 5.4 * DAY, vendorId: 'V-7', farmerId: 'F-5', trackingId: trackIds[9] || null,
      trail: [
        { ts: now - 6.8 * DAY, who: 'Farmer F-5', what: 'Farm gate price ₹23.4/kg', where: 'Daund' },
        { ts: now - 6.5 * DAY, who: 'V-7', what: 'Retail listed at ₹61/kg', where: 'Daund shop' },
        { ts: now - 5.4 * DAY, who: 'AGRILINK Algorithm 3', what: 'Price ratio 2.61 > 1.8 threshold → flagged', where: 'Compliance engine' }
      ], metrics: { farmPrice: '₹23.4', retailPrice: '₹61', ratio: '2.61×', threshold: '1.8×' }
    });
    st.alerts.push({
      id: 'AL-' + (++st.seq.alert), type: 'wastage', severity: 'low', status: 'resolved',
      title: 'Spoilage wastage above tolerance',
      message: '22% of a carrot batch was written off as wastage at Konkan Fresh Wholesale. Cold-chain gap during transit suspected.',
      entityId: 'V-4', ts: now - 24 * DAY, vendorId: 'V-4', farmerId: 'F-6', trackingId: null,
      trail: [
        { ts: now - 26 * DAY, who: 'Vijay Pawar (Farmer)', what: '260 kg Carrot, Grade B', where: 'Saswad' },
        { ts: now - 25 * DAY, who: 'Konkan Fresh Wholesale', what: 'Received without cool-van transport', where: 'Kothrud' },
        { ts: now - 24 * DAY, who: 'AGRILINK Algorithm 4', what: 'Wastage 57 kg > 8% tolerance → low severity alert', where: 'Pipeline monitor' }
      ], metrics: { wastage: '57 kg', tolerance: '8%', actual: '22%' }
    });

    /* --- audit trail --- */
    const auditSrc = [
      ['F-1', 'farmer', 'crop.created', 'Onion 820 kg posted'],
      ['V-1', 'vendor', 'bid.won', 'Bid ₹22.8/kg accepted by farmer'],
      ['V-1', 'vendor', 'inventory.received', 'Batch BATCH-101 received, 30/70 split applied'],
      ['C-1', 'customer', 'order.placed', 'Order ORD-101 placed, slot 1 PM – 3 PM'],
      ['P-2', 'partner', 'route.assigned', 'Route RT-101 accepted, 6 stops'],
      ['P-2', 'partner', 'order.delivered', '4 deliveries completed'],
      ['SYSTEM', 'gov', 'algo3.check', 'Compliance scan: 2 anomalies flagged'],
      ['SYSTEM', 'gov', 'algo4.check', 'Pipeline health: 96% operational'],
      ['V-7', 'vendor', 'inventory.over_allocate', 'BLOCKED in live flow / flagged in history']
    ];
    auditSrc.forEach((a, i) => {
      st.audit.push({ id: 'AUD-' + (++st.seq.audit), ts: now - (i + 1) * 3600000 * 7, actorId: a[0], role: a[1], action: a[2], detail: a[3], ip: '10.0.' + ri(rng, 1, 250) + '.' + ri(rng, 2, 250) });
    });

    /* --- a couple of live partner routes from earlier today --- */
    const p = st.partners[1];
    st.routes.push({
      id: 'RT-' + (++st.seq.route), partnerId: p.id, slot: 'S1', slotLabel: '9 AM – 11 AM', status: 'completed',
      vendorId: 'V-1', vendorName: 'GreenMandi Traders', stops: 5, distanceKm: 34.6, etaMin: 96, earnings: 742,
      createdAt: now - 10 * 3600000, acceptedAt: now - 9.6 * 3600000, completedAt: now - 7.4 * 3600000, orderIds: []
    });
    p.todayEarnings = 742; p.todayDeliveries = 5;

    st.counters.wastageKg = st.batches.reduce((s, b) => s + b.wastageKg, 0);
    st.trackIds = trackIds;
    return st;
  }

  g.AG.seed = { buildSeed };
})(typeof window !== 'undefined' ? window : globalThis);
