'use strict';

// Test hooks: ?title=<Wikisource page>  ?art=<index into data/artworks.json>  ?sites=0
const params = new URLSearchParams(location.search);
const $ = (sel) => document.querySelector(sel);

const store = {
  async get(key, fallback) {
    const r = await chrome.storage.local.get(key);
    return r[key] ?? fallback;
  },
  set: (key, value) => chrome.storage.local.set({ [key]: value }),
};

// ---------- text in two languages ----------
const I18N = {
  zh: {
    title: '新标签页',
    date: (d) => `${d.getMonth() + 1}月${d.getDate()}日 星期${'日一二三四五六'[d.getDay()]}`,
    settings: '设置', close: '关闭', language: '语言 · Language', auto: '跟随浏览器', script: '诗文', city: '城市',
    cityPlaceholder: '上海、Boston……回车确认', unit: '温度', apps: 'Google 应用', fill: '画外填充', blur: '模糊', tile: '重复', show: '显示', hide: '隐藏',
    paintings: '画作', artTotal: (n, all) => `显示 ${n} 幅，共 ${all} 幅`,
    continents: { americas: '美洲', europe: '欧洲', asia: '亚洲' },
    countries: { US: '美国', FR: '法国', IT: '意大利', NL: '荷兰', GB: '英国', FL: '佛兰德', ES: '西班牙', DE: '德国',
      AT: '奥地利', JP: '日本', CN: '中国', IN: '印度', KR: '朝鲜半岛', OTHER: '其他' },
    weatherLabel: '天气，点一下打开设置', noCity: '点这里填城市，显示天气',
    weatherFailed: (msg) => `天气取不到：${msg}，刷新页面再试`,
    wTimeout: '天气服务 10 秒没有响应', wOffline: '连不上天气服务（没联网？）', wHttp: (s) => `天气服务返回 HTTP ${s}`,
    looking: '正在查找……', notFound: (name) => `找不到「${name}」，换个写法试试`, tryLater: (msg) => `${msg}，稍后再试`,
    museums: { aic: '芝加哥艺术博物馆', cma: '克利夫兰艺术博物馆', nga: '华盛顿国家美术馆' },
    artNext: '换一张画', artFallback: '新的一张没有加载出来（没联网，或博物馆的图片服务器出错），先显示看过的这一幅',
    artFailed: (m) => `图片没有加载出来：没联网，或${m}的图片服务器出错，看过的画也不在浏览器缓存里`,
    sitesEmpty: 'Chrome 还没有统计出常访问的网站，多用几天就会出现在这里。',
    verseNext: '换一篇', fetching: '正在从维基文库取一篇……', verseFailed: (msg) => `取不到古诗文：${msg}。刷新页面会再取一次。`,
    verseLast: (msg) => `${msg}，先显示上一篇`, unreadable: (title) => `「${title}」是目录页、空页或章回小说`,
    tenFailed: '连续 10 篇都是目录页、空页、章回小说或打不开的页面',
    wsTimeout: '维基文库 10 秒没有响应', wsOffline: '连不上维基文库（没联网，或者维基文库暂时不可用）',
    ws429: '维基文库暂时限制了访问频率（HTTP 429），一般几分钟后恢复', wsHttp: (s) => `维基文库返回 HTTP ${s}`,
    wsError: (info) => `维基文库报错：${info}`,
    favAdd: (art) => (art ? '收藏这幅画' : '收藏这一篇'), favRemove: (art) => (art ? '取消收藏这幅画' : '取消收藏这一篇'),
    favFailed: (why) => `没有存成：${why}。再点一次星号重试。`,
    anonymous: '佚名', untitled: '未命名',
    line: (label, value) => `${label}：${value}`, source: '原文', image: '图片', savedOn: (d) => `收藏于 ${d}`,
    dlTimeout: '下载两分钟还没完成，网络可能太慢', dlNoSpace: '磁盘空间不够', dlFile: (c) => `文件写不进「下载」文件夹（${c}）`,
    dlNetwork: (c) => `下载时网络出错，可能是没联网（${c}）`, dlServer: (c) => `博物馆的图片服务器出错（${c}）`,
    dlCanceled: '下载被取消了', dlOther: (c) => `Chrome 中断了下载（${c || '没有给出原因'}）`,
  },
  en: {
    title: 'New Tab',
    date: (d) => d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
    settings: 'Settings', close: 'Close', language: 'Language · 语言', auto: 'Browser', script: 'Chinese text', city: 'City',
    cityPlaceholder: 'Shanghai, Boston… then Return', unit: 'Temperature', apps: 'Google apps', fill: 'Around the painting', blur: 'Blur', tile: 'Repeat', show: 'Show', hide: 'Hide',
    paintings: 'Paintings', artTotal: (n, all) => `${n} of ${all} paintings shown`,
    continents: { americas: 'Americas', europe: 'Europe', asia: 'Asia' },
    countries: { US: 'United States', FR: 'France', IT: 'Italy', NL: 'Netherlands', GB: 'Britain', FL: 'Flanders',
      ES: 'Spain', DE: 'Germany', AT: 'Austria', JP: 'Japan', CN: 'China', IN: 'India', KR: 'Korea', OTHER: 'Other' },
    weatherLabel: 'Weather; click to open the settings', noCity: 'Click here to set a city for the weather',
    weatherFailed: (msg) => `No weather: ${msg}. Reload to try again.`,
    wTimeout: 'The weather service did not answer in 10 seconds', wOffline: 'Cannot reach the weather service (offline?)',
    wHttp: (s) => `The weather service returned HTTP ${s}`,
    looking: 'Looking up…', notFound: (name) => `No place called “${name}”; try another spelling`,
    tryLater: (msg) => `${msg}. Try again later.`,
    museums: { aic: 'Art Institute of Chicago', cma: 'Cleveland Museum of Art', nga: 'National Gallery of Art' },
    artNext: 'Another painting', artFallback: 'The new painting did not load (offline, or the museum server failed); showing one seen before',
    artFailed: (m) => `The painting did not load: offline, or the ${m} image server failed, and no earlier one is in the browser cache`,
    sitesEmpty: 'Chrome has no most visited sites yet; they appear after a few days of browsing.',
    verseNext: 'Another text', fetching: 'Fetching a text from Wikisource…',
    verseFailed: (msg) => `No text: ${msg}. Reload to try again.`, verseLast: (msg) => `${msg}; showing the previous text`,
    unreadable: (title) => `“${title}” is a contents page, an empty page or a chapter novel`,
    tenFailed: '10 pages in a row were contents pages, empty, chapter novels or failed to open',
    wsTimeout: 'Wikisource did not answer in 10 seconds', wsOffline: 'Cannot reach Wikisource (offline, or Wikisource is down)',
    ws429: 'Wikisource is rate-limiting requests (HTTP 429); this usually clears in a few minutes',
    wsHttp: (s) => `Wikisource returned HTTP ${s}`, wsError: (info) => `Wikisource error: ${info}`,
    favAdd: (art) => (art ? 'Save this painting' : 'Save this text'),
    favRemove: (art) => (art ? 'Remove this painting from favourites' : 'Remove this text from favourites'),
    favFailed: (why) => `Not saved: ${why}. Click the star to try again.`,
    anonymous: 'Anonymous', untitled: 'Untitled',
    line: (label, value) => `${label}: ${value}`, source: 'Source', image: 'Image', savedOn: (d) => `Saved on ${d}`,
    dlTimeout: 'the download did not finish in two minutes', dlNoSpace: 'the disk is full',
    dlFile: (c) => `the file could not be written to Downloads (${c})`, dlNetwork: (c) => `the network failed, maybe offline (${c})`,
    dlServer: (c) => `the museum image server failed (${c})`, dlCanceled: 'the download was cancelled',
    dlOther: (c) => `Chrome stopped the download (${c || 'no reason given'})`,
  },
};
let lang = 'zh';
const t = (key, ...args) => {
  const v = I18N[lang][key];
  return typeof v === 'function' ? v(...args) : v;
};
// Text written after load (notes, errors) is kept as a function so a language switch can draw it again.
const liveTexts = new Map();
function setText(el, fn) {
  if (fn) liveTexts.set(el, fn);
  else liveTexts.delete(el);
  el.textContent = fn ? fn() : '';
  requestAnimationFrame(applyTones);
}
function refreshTexts() {
  for (const [el, fn] of liveTexts) {
    if (el.isConnected) el.textContent = fn();
    else liveTexts.delete(el);
  }
}
const tError = (key, ...args) => Object.assign(new Error(t(key, ...args)), { text: () => t(key, ...args) });
const errorText = (e) => (e.text ? e.text() : e.message);

// ---------- settings ----------
const SETTINGS_DEFAULT = { lang: 'auto', script: 'hant', unit: 'c', apps: 'on', fill: 'blur', hidden: [] };
let settings = { ...SETTINGS_DEFAULT };
let variant = 'zh-hant'; // Wikisource converts between traditional and simplified script
const verseRules = () => `${variant}/no-chapter-novels/variants-in-brackets`;
// Countries are the codes ("c") written by tools/build_artworks.py.
const COUNTRY_GROUPS = [['americas', ['US']], ['europe', ['FR', 'IT', 'NL', 'GB', 'FL', 'ES', 'DE', 'AT']],
  ['asia', ['JP', 'CN', 'IN', 'KR']], ['', ['OTHER']]];
const countryOf = (a) => a.c || 'OTHER';
const allowed = (a) => !settings.hidden.includes(countryOf(a));

function applySettings() {
  lang = settings.lang === 'auto' ? (navigator.language.startsWith('zh') ? 'zh' : 'en') : settings.lang;
  document.documentElement.lang = lang;
  document.title = t('title');
  for (const el of document.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n);
  for (const el of document.querySelectorAll('[data-i18n-label]')) el.setAttribute('aria-label', t(el.dataset.i18nLabel));
  for (const el of document.querySelectorAll('[data-i18n-placeholder]')) el.placeholder = t(el.dataset.i18nPlaceholder);
  variant = settings.script === 'hans' ? 'zh-hans' : 'zh-hant';
  document.documentElement.dataset.script = settings.script;
  $('#verse').lang = settings.script === 'hans' ? 'zh-Hans' : 'zh-Hant';
  $('#apps-btn').hidden = settings.apps === 'off';
  document.documentElement.dataset.fill = settings.fill;
  renderApps();
  for (const seg of document.querySelectorAll('#settings .seg')) {
    for (const b of seg.children) b.setAttribute('aria-pressed', String(settings[seg.dataset.key] === b.dataset.v));
  }
  if (!$('#settings').hidden) showCountries();
}

// The chips are built once per language; later changes only update the checks, so keyboard focus stays put.
let chipsLang = null;
function showCountries() {
  if (chipsLang !== lang) {
    chipsLang = lang;
    const counts = {};
    for (const a of artworks) counts[countryOf(a)] = (counts[countryOf(a)] || 0) + 1;
    $('#country-groups').replaceChildren(...COUNTRY_GROUPS.map(([continent, codes]) => {
      const row = document.createElement('div');
      row.className = 'country-group';
      const chips = codes.map((code) => {
        const chip = document.createElement('label');
        chip.className = 'chip';
        chip.append(Object.assign(document.createElement('input'), { type: 'checkbox', value: code }), t('countries')[code],
          Object.assign(document.createElement('span'), { className: 'n', textContent: counts[code] || 0 }));
        return chip;
      });
      row.append(Object.assign(document.createElement('span'), { className: 'continent', textContent: continent && t('continents')[continent] }),
        Object.assign(document.createElement('div'), { className: 'chips' }));
      row.lastChild.append(...chips);
      return row;
    }));
  }
  for (const box of document.querySelectorAll('#country-groups input')) box.checked = !settings.hidden.includes(box.value);
  $('#art-total').textContent = t('artTotal', artworks.filter(allowed).length, artworks.length);
}

async function changeSetting(key, value) {
  if (settings[key] === value) return;
  const old = settings;
  settings = { ...settings, [key]: value };
  await store.set('settings', settings);
  settingsChanged(old);
  if (key === 'script') {
    // The text on screen is fetched again in the new script; prefetched ones are dropped and fetched anew.
    await store.set('verseQueue', []);
    await store.set('verseRules', verseRules());
    const p = currentPiece && await fetchPiece(currentPiece.title).catch(() => null);
    if (p) {
      renderVerse(p);
      if (!params.get('title')) store.set('verseLast', p);
    } else if (!currentPiece) {
      showNextVerse();
    }
    refillQueue();
  }
}

// Applies settings changed in this tab or in another open one.
function settingsChanged(old) {
  applySettings();
  if (old.lang !== settings.lang) {
    refreshTexts();
    tickClock(true);
    loadWeather();
    if (currentArt) renderCaption();
    showSites();
    for (const btn of [$('#verse-fav'), $('#art-fav')]) labelFav(btn);
    store.get('weatherCity', null).then((city) => { if (city) $('#city-input').value = cityName(city).name; });
  }
  if (old.unit !== settings.unit) loadWeather();
  requestAnimationFrame(applyTones);
}

// ---------- Google apps ----------
// [url, Chinese name, English name]. Icons come from Chrome's favicon cache, which matches by page and falls back to the
// site, so Maps has its own host rather than www.google.com/maps; a product never opened in this Chrome shows a globe.
const APPS = [
  ['https://www.google.com/', '搜索', 'Search'], ['https://mail.google.com/', 'Gmail', 'Gmail'],
  ['https://drive.google.com/', '云端硬盘', 'Drive'], ['https://docs.google.com/document/', '文档', 'Docs'],
  ['https://docs.google.com/spreadsheets/', '表格', 'Sheets'], ['https://docs.google.com/presentation/', '幻灯片', 'Slides'],
  ['https://calendar.google.com/', '日历', 'Calendar'], ['https://meet.google.com/', 'Meet', 'Meet'],
  ['https://photos.google.com/', '相册', 'Photos'], ['https://maps.google.com/', '地图', 'Maps'],
  ['https://www.youtube.com/', 'YouTube', 'YouTube'], ['https://translate.google.com/', '翻译', 'Translate'],
];

function renderApps() {
  const grid = Object.assign(document.createElement('div'), { className: 'grid' });
  for (const [url, zh, en] of APPS) {
    const a = Object.assign(document.createElement('a'), { href: url, target: '_blank', rel: 'noopener' });
    a.append(faviconImg(url), Object.assign(document.createElement('span'), { textContent: lang === 'zh' ? zh : en }));
    grid.append(a);
  }
  $('#apps').replaceChildren(grid);
}

// The apps panel and the settings card take turns: opening one closes the other.
function openApps(open) {
  $('#apps').hidden = !open;
  $('#apps-btn').setAttribute('aria-expanded', String(open));
  if (open) openSettings(false);
  alignCards();
  requestAnimationFrame(applyTones);
}

async function openSettings(open, focusCity = false) {
  if (open) openApps(false);
  $('#settings').hidden = !open;
  $('#settings-btn').setAttribute('aria-expanded', String(open));
  if (!open) return;
  alignCards();
  showCountries();
  const city = await store.get('weatherCity', null);
  $('#city-input').value = city ? cityName(city).name : '';
  setText($('#city-msg'), null);
  requestAnimationFrame(applyTones);
  if (focusCity) $('#city-input').focus();
}

// ---------- clock ----------
function tickClock(force = false) {
  const d = new Date();
  const time = `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
  if (force || $('#time').textContent !== time) {
    $('#time').textContent = time;
    $('#date').textContent = t('date', d);
  }
}

// ---------- weather (Open-Meteo: free, no key, cross-origin allowed) ----------
const WEATHER_TTL = 30 * 60 * 1000;
const svg = (body) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
const CLOUD = 'M7.5 18.5h9.5a3.8 3.8 0 0 0 .5-7.57A5.5 5.5 0 0 0 6.9 12a3.3 3.3 0 0 0 .6 6.5z';
const CLOUD_UP = `<path d="${CLOUD}" transform="translate(0 -3)"/>`;
const WEATHER_ICONS = {
  sun: svg('<circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"/>'),
  moon: svg('<path d="M19.5 14.6A7.8 7.8 0 1 1 9.4 4.5a6.2 6.2 0 0 0 10.1 10.1z"/>'),
  partly: svg(`<circle cx="8.5" cy="8.5" r="3"/><path d="M8.5 2.8v1.2M2.8 8.5H4M4.5 4.5l.8.8M12.5 4.5l-.8.8"/><path d="${CLOUD}" transform="translate(1.5 1)"/>`),
  cloud: svg(`<path d="${CLOUD}"/>`),
  fog: svg('<path d="M4 8.5h16M6 12.5h12M4 16.5h16"/>'),
  rain: svg(`${CLOUD_UP}<path d="M9 18.5l-1 2.5M13 18.5l-1 2.5M17 18.5l-1 2.5"/>`),
  snow: svg(`${CLOUD_UP}<path d="M9 19.5h.01M13 21h.01M17 19.5h.01" stroke-width="2.4"/>`),
  thunder: svg(`${CLOUD_UP}<path d="M13 15.5l-2.5 3.5h3l-2 3.5"/>`),
};
// WMO weather codes: [Chinese, English, icon]
const WMO = {
  0: ['晴', 'Clear', 'sun'], 1: ['少云', 'Mainly clear', 'partly'], 2: ['多云', 'Partly cloudy', 'partly'], 3: ['阴', 'Overcast', 'cloud'],
  45: ['雾', 'Fog', 'fog'], 48: ['雾凇', 'Rime fog', 'fog'],
  51: ['小毛毛雨', 'Light drizzle', 'rain'], 53: ['毛毛雨', 'Drizzle', 'rain'], 55: ['大毛毛雨', 'Heavy drizzle', 'rain'],
  56: ['冻毛毛雨', 'Freezing drizzle', 'rain'], 57: ['冻毛毛雨', 'Freezing drizzle', 'rain'],
  61: ['小雨', 'Light rain', 'rain'], 63: ['中雨', 'Rain', 'rain'], 65: ['大雨', 'Heavy rain', 'rain'],
  66: ['冻雨', 'Freezing rain', 'rain'], 67: ['冻雨', 'Freezing rain', 'rain'],
  71: ['小雪', 'Light snow', 'snow'], 73: ['中雪', 'Snow', 'snow'], 75: ['大雪', 'Heavy snow', 'snow'], 77: ['雪粒', 'Snow grains', 'snow'],
  80: ['阵雨', 'Showers', 'rain'], 81: ['阵雨', 'Showers', 'rain'], 82: ['强阵雨', 'Heavy showers', 'rain'],
  85: ['阵雪', 'Snow showers', 'snow'], 86: ['强阵雪', 'Heavy snow showers', 'snow'],
  95: ['雷阵雨', 'Thunderstorm', 'thunder'], 96: ['雷阵雨伴冰雹', 'Thunderstorm with hail', 'thunder'],
  99: ['雷阵雨伴冰雹', 'Thunderstorm with hail', 'thunder'],
};

async function fetchJson(url) {
  let r;
  try {
    r = await fetch(url, { signal: AbortSignal.timeout(10000) });
  } catch (e) {
    throw tError(e.name === 'TimeoutError' ? 'wTimeout' : 'wOffline');
  }
  if (!r.ok) throw tError('wHttp', r.status);
  return r.json();
}

const GEO = 'https://geocoding-api.open-meteo.com/v1';
const geoUrl = (path, query) => `${GEO}/${path}?${new URLSearchParams({ format: 'json', ...query })}`;

// A city is stored with its names in both languages, looked up by place id. Cities saved by older versions have one
// name ({ name, province, lat, lon }) from a Chinese search; the nearest search result gives their id.
async function completeCity(city) {
  let { id } = city;
  if (!id) {
    const near = (r) => Math.abs(r.latitude - city.lat) + Math.abs(r.longitude - city.lon);
    const results = (await fetchJson(geoUrl('search', { name: city.name, count: 10, language: 'zh' }))).results || [];
    id = results.sort((a, b) => near(a) - near(b))[0]?.id;
    if (!id) return city;
  }
  const names = {};
  for (const l of ['zh', 'en']) {
    const p = await fetchJson(geoUrl('get', { id, language: l }));
    names[l] = { name: p.name, province: p.admin1 || '' };
  }
  const full = { id, lat: city.lat, lon: city.lon, names };
  await store.set('weatherCity', full);
  return full;
}

const cityName = (city) => city.names?.[lang] || { name: city.name, province: city.province || '' };

async function loadWeather(force = false) {
  let city = await store.get('weatherCity', null);
  if (!city) {
    showWeatherText(t('noCity'));
    return;
  }
  if (!city.names) city = await completeCity(city).catch(() => city);
  const key = `${city.lat},${city.lon},${settings.unit}`;
  const cached = await store.get('weatherCache', null);
  const usable = cached?.key === key;
  if (usable) renderWeather(cached.data, city);
  if (usable && !force && Date.now() - cached.at < WEATHER_TTL) return;
  try {
    const u = new URL('https://api.open-meteo.com/v1/forecast');
    for (const [k, v] of Object.entries({
      latitude: city.lat, longitude: city.lon, timezone: 'auto', forecast_days: 1,
      current: 'temperature_2m,weather_code,is_day', daily: 'temperature_2m_max,temperature_2m_min',
      temperature_unit: settings.unit === 'f' ? 'fahrenheit' : 'celsius',
    })) u.searchParams.set(k, v);
    const d = await fetchJson(u);
    const data = {
      temp: d.current.temperature_2m, code: d.current.weather_code, day: d.current.is_day === 1,
      hi: d.daily.temperature_2m_max[0], lo: d.daily.temperature_2m_min[0],
    };
    await store.set('weatherCache', { key, at: Date.now(), data });
    renderWeather(data, city);
  } catch (e) {
    console.warn('Weather failed:', e);
    if (!usable) showWeatherText(t('weatherFailed', e.message)); // otherwise the cached weather stays as it is
  }
}

function renderWeather(w, city) {
  const [zh, en, icon] = WMO[w.code] || ['', '', 'cloud'];
  $('#weather-icon').innerHTML = WEATHER_ICONS[icon === 'sun' && !w.day ? 'moon' : icon];
  $('#weather-temp').textContent = `${Math.round(w.temp)}°`;
  $('#weather-text').textContent = lang === 'zh' ? zh : en;
  $('#weather-range').textContent = `${Math.round(w.lo)}° / ${Math.round(w.hi)}°`;
  $('#weather-city').textContent = placeName(city);
  requestAnimationFrame(applyTones);
}

// The province tells apart places with the same name; it is left out where it repeats the city (上海, 上海市).
function placeName(city) {
  const { name, province } = cityName(city);
  return province && !province.startsWith(name) ? `${name}${lang === 'zh' ? '，' : ', '}${province}` : name;
}

function showWeatherText(msg) {
  for (const id of ['weather-icon', 'weather-temp', 'weather-range', 'weather-city']) $(`#${id}`).textContent = '';
  $('#weather-text').textContent = msg;
  requestAnimationFrame(applyTones);
}

async function submitCity(e) {
  e.preventDefault();
  const name = $('#city-input').value.trim();
  if (!name) return;
  const msg = $('#city-msg');
  setText(msg, () => t('looking'));
  try {
    const hit = (await fetchJson(geoUrl('search', { name, count: 1, language: lang }))).results?.[0];
    if (!hit) {
      setText(msg, () => t('notFound', name));
      return;
    }
    const city = await completeCity({ id: hit.id, lat: hit.latitude, lon: hit.longitude });
    setText(msg, null);
    $('#city-input').value = cityName(city).name;
    $('#city-input').blur();
    loadWeather(true);
  } catch (err) {
    setText(msg, () => t('tryLater', errorText(err)));
  }
}

// ---------- wallpaper ----------
let artworks = [];
let currentArt = null; // the painting the caption names
let artShown = false; // until it has loaded (or if it never does) the background is dark, so text stays light
// When a painting cannot be downloaded, paintings shown before are tried from the HTTP cache: first those that did
// load ("loaded"), then the rest of "recent". Misses fail at once when offline.
const FALLBACK_TRIES = 8;
const museumName = (a) => t('museums')[a.s];

async function showNextArt() {
  if (!artworks.length) artworks = await (await fetch('data/artworks.json')).json();
  const state = await store.get('art', { next: null, recent: [], loaded: [] });
  const forced = params.get('art');
  let idx;
  if (forced != null) idx = Number(forced) % artworks.length;
  else if (artworks[state.next] && allowed(artworks[state.next])) idx = state.next;
  else idx = pickArt(state.recent);

  const fallbacks = [...new Set([...(state.loaded || []), ...state.recent])]
    .filter((i) => i !== idx && artworks[i] && allowed(artworks[i])).slice(0, FALLBACK_TRIES);
  const img = $('#art');
  let trying = idx;
  artShown = false;
  img.classList.remove('shown');
  $('#art-fill').classList.remove('shown');
  setArtNote(null);
  showCaption(artworks[idx]);
  img.onload = () => {
    if (trying !== idx) {
      showCaption(artworks[trying]);
      setArtNote(() => t('artFallback'));
    }
    artShown = true;
    document.documentElement.style.setProperty('--art-url', `url("${img.currentSrc}")`); // background of both cards
    fitArt();
    img.classList.add('shown');
    $('#art-fill').classList.add('shown');
    applyTones();
    rememberLoaded(trying);
    new Image().src = artworks[state.next].i; // preload the next tab's painting into the HTTP cache
  };
  img.onerror = () => {
    trying = fallbacks.shift();
    if (trying != null) {
      img.src = artworks[trying].i;
      return;
    }
    setArtNote(() => t('artFailed', museumName(artworks[idx])));
    document.documentElement.style.removeProperty('--art-url');
    requestAnimationFrame(applyTones);
  };
  img.src = artworks[idx].i;
  requestAnimationFrame(applyTones);

  state.recent = [idx, ...state.recent.filter((i) => i !== idx)].slice(0, 300);
  state.next = pickArt(state.recent);
  await store.set('art', state);
}

async function rememberLoaded(idx) {
  const state = await store.get('art', { next: null, recent: [], loaded: [] });
  state.loaded = [idx, ...(state.loaded || []).filter((i) => i !== idx)].slice(0, FALLBACK_TRIES);
  await store.set('art', state);
}

function pickArt(recent) {
  let pool = artworks.flatMap((a, i) => (allowed(a) ? [i] : []));
  if (!pool.length) pool = artworks.map((_, i) => i);
  const avoid = new Set(recent);
  const any = () => pool[Math.floor(Math.random() * pool.length)];
  for (let k = 0; k < 50; k++) {
    const i = any();
    if (!avoid.has(i)) return i;
  }
  return any();
}

function showCaption(a) {
  currentArt = a;
  renderCaption();
  showFav($('#art-fav'), 'art', a.u);
}

function renderCaption() {
  const a = currentArt;
  $('#caption-title').textContent = a.t;
  $('#caption').href = a.u;
  const by = [a.a, a.d].filter(Boolean).join(', ');
  $('#caption-by').textContent = `${by ? ` — ${by}` : ''} · ${museumName(a)}`;
  requestAnimationFrame(showFullTitles);
}

function setArtNote(fn) {
  setText($('#art-note'), fn);
  requestAnimationFrame(showFullTitles);
}

// ---------- most visited sites ----------
const EXCLUDED_HOSTS = new Set(['mail.google.com']); // Gmail is in the Google apps panel
const MAX_SITES = 15;
const NAME_WIDTH = 15; // in Latin letters; a CJK character counts as two

async function showSites() {
  let list = params.get('sites') === '0' ? [] : await chrome.topSites.get();
  list = list.filter((s) => !EXCLUDED_HOSTS.has(new URL(s.url).hostname)).slice(0, MAX_SITES);
  const nav = $('#sites');
  if (!list.length) {
    nav.replaceChildren(Object.assign(document.createElement('p'), { className: 'empty', textContent: t('sitesEmpty') }));
    return;
  }
  nav.replaceChildren(...list.map(siteTile));
  fitSites();
  requestAnimationFrame(applyTones);
}

// One row to the right edge; whole items that do not fit are hidden, never cut.
function fitSites() {
  const nav = $('#sites');
  const items = [...nav.querySelectorAll('a')];
  for (const a of items) a.hidden = false;
  const right = nav.getBoundingClientRect().right;
  for (const a of items) a.hidden = a.getBoundingClientRect().right > right + 0.5;
}

function shortName(title, host) {
  const name = (title || host).replace(/^\(\d+\)\s*/, '').trim() || host; // drop unread counts like "(1) "
  const widthOf = (ch) => (/[⺀-￯]/.test(ch) ? 2 : 1);
  if ([...name].reduce((n, ch) => n + widthOf(ch), 0) <= NAME_WIDTH) return name;
  let width = 0;
  let out = '';
  for (const ch of name) {
    if (width + widthOf(ch) > NAME_WIDTH - 1) break;
    width += widthOf(ch);
    out += ch;
  }
  return `${out.trimEnd()}…`;
}

function siteTile(s) {
  const host = new URL(s.url).hostname.replace(/^www\./, '');
  const a = Object.assign(document.createElement('a'), { href: s.url, target: '_blank', rel: 'noopener' });
  a.title = s.title ? `${s.title}\n${host}` : host;
  const icon = Object.assign(document.createElement('span'), { className: 'icon' });
  icon.append(faviconImg(s.url));
  a.append(icon, Object.assign(document.createElement('span'), { className: 'name', textContent: shortName(s.title, host) }));
  return a;
}

// A page's favicon from Chrome's cache, drawn as a one-colour silhouette by CSS (--site-icon-filter).
function faviconImg(pageUrl) {
  const u = new URL(chrome.runtime.getURL('/_favicon/'));
  u.searchParams.set('pageUrl', pageUrl);
  u.searchParams.set('size', '64');
  const img = Object.assign(document.createElement('img'), { alt: '' });
  img.addEventListener('load', () => {
    const shape = iconShape(img);
    if (shape) img.src = shape;
  }, { once: true });
  img.src = u.href;
  return img;
}

// Icons are shown as one-colour silhouettes (a CSS filter keeps only their alpha). A favicon that is a mark on a solid
// square or disc would become a plain block, so for those the shape is taken from where the colour differs from the
// most common one. Returns a data URL, or null to keep the favicon as it is.
function iconShape(img) {
  const n = Math.min(64, img.naturalWidth || 32);
  const canvas = Object.assign(document.createElement('canvas'), { width: n, height: n });
  const g = canvas.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0, n, n);
  const data = g.getImageData(0, 0, n, n);
  const px = data.data;
  let [x0, y0, x1, y1, opaque] = [n, n, -1, -1, 0];
  const counts = new Map();
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] < 200) continue;
    const x = (i / 4) % n;
    const y = Math.floor(i / 4 / n);
    [x0, y0, x1, y1] = [Math.min(x0, x), Math.min(y0, y), Math.max(x1, x), Math.max(y1, y)];
    opaque++;
    const key = ((px[i] >> 4) << 8) | ((px[i + 1] >> 4) << 4) | (px[i + 2] >> 4);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  const box = (x1 - x0 + 1) * (y1 - y0 + 1);
  if (!opaque || opaque < box * 0.75) return null; // already a shape on a transparent background (a disc is 0.79)
  const [key] = [...counts].reduce((best, c) => (c[1] > best[1] ? c : best));
  const bg = [(key >> 8) * 16 + 8, ((key >> 4) & 15) * 16 + 8, (key & 15) * 16 + 8];
  const alpha = new Float32Array(n * n); // per pixel: how much it belongs to the mark
  const dist = (p, q) => Math.hypot(px[p * 4] - q[0], px[p * 4 + 1] - q[1], px[p * 4 + 2] - q[2]) / 441;
  for (let p = 0; p < n * n; p++) alpha[p] = px[p * 4 + 3] * Math.min(1, Math.max(0, (dist(p, bg) - 0.12) / 0.2));
  // Coloured parts that reach the outline belong to a many-coloured logo (Meet's lens, Calendar's frame) rather than
  // to a mark printed on it, so they are dropped together with what joins them in about the same colour.
  const neighbours = (p) => {
    const x = p % n;
    return [x > 0 && p - 1, x < n - 1 && p + 1, p >= n && p - n, p < n * (n - 1) && p + n].filter((q) => q !== false);
  };
  const colour = (p) => [px[p * 4], px[p * 4 + 1], px[p * 4 + 2]];
  const stack = [];
  for (let p = 0; p < n * n; p++) {
    const nb = neighbours(p);
    if (alpha[p] > 128 && (nb.length < 4 || nb.some((q) => px[q * 4 + 3] < 200))) stack.push(p);
  }
  for (const p of stack) alpha[p] = 0;
  while (stack.length) {
    const p = stack.pop();
    for (const q of neighbours(p)) {
      if (alpha[q] > 128 && dist(q, colour(p)) < 0.15) {
        alpha[q] = 0;
        stack.push(q);
      }
    }
  }
  let [mx0, my0, mx1, my1, mark] = [n, n, -1, -1, 0];
  for (let p = 0; p < n * n; p++) {
    px[p * 4] = px[p * 4 + 1] = px[p * 4 + 2] = 255;
    px[p * 4 + 3] = alpha[p];
    if (alpha[p] > 128) {
      const x = p % n;
      const y = Math.floor(p / n);
      [mx0, my0, mx1, my1] = [Math.min(mx0, x), Math.min(my0, y), Math.max(mx1, x), Math.max(my1, y)];
      mark++;
    }
  }
  if (mark < box * 0.04 || mark > opaque * 0.7) return null; // no clear mark: a photo, a gradient, a flat block
  g.putImageData(data, 0, 0);
  // The mark is scaled up to fill the icon box, as a transparent favicon does.
  const [w, h] = [mx1 - mx0 + 1, my1 - my0 + 1];
  const k = (n * 0.9) / Math.max(w, h);
  const out = Object.assign(document.createElement('canvas'), { width: n, height: n });
  out.getContext('2d').drawImage(canvas, mx0, my0, w, h, (n - w * k) / 2, (n - h * k) / 2, w * k, h * k);
  return out.toDataURL();
}

// ---------- classical text from Wikisource ----------
const WS = 'https://zh.wikisource.org';
// Most zh.wikisource pages are court judgments; pre-modern works carry a dynasty category, judgments don't.
const DYNASTIES = '先秦|周朝|春秋|戰國|秦朝|漢朝|西漢|東漢|三國|晉朝|南北朝|隋朝|唐朝|五代十國|宋朝|北宋|南宋|遼朝|金朝|元朝|明朝|清朝';
const MAX_WORDS = 20000;
const QUEUE_SIZE = 3; // texts fetched ahead

// Network errors, timeouts and HTTP 5xx are retried once after a second; HTTP 429 is not. API errors about the page
// itself are marked `page`, so the caller moves on to another title.
async function wsApi(query) {
  const u = new URL(`${WS}/w/api.php`);
  for (const [k, v] of Object.entries({ format: 'json', formatversion: '2', origin: '*', ...query })) u.searchParams.set(k, v);
  for (let attempt = 1; ; attempt++) {
    try {
      return await wsRequest(u);
    } catch (e) {
      if (!e.transient || attempt >= 2) throw e;
      await new Promise((ok) => setTimeout(ok, 1000));
    }
  }
}

const wsError = (kind, key, ...args) => Object.assign(tError(key, ...args), kind);

async function wsRequest(u) {
  let r;
  try {
    r = await fetch(u, {
      // Wikimedia asks API clients to name themselves and give a contact.
      headers: { 'Api-User-Agent': `ArtVerse/${chrome.runtime.getManifest().version} (https://github.com/zhenweiding-dev/art-verse)` },
      signal: AbortSignal.timeout(10000),
    });
  } catch (e) {
    throw wsError({ transient: true }, e.name === 'TimeoutError' ? 'wsTimeout' : 'wsOffline');
  }
  if (r.status === 429) throw wsError({}, 'ws429');
  if (!r.ok) throw wsError({ transient: r.status >= 500 }, 'wsHttp', r.status);
  const d = await r.json();
  if (d.error) throw wsError({ page: true }, 'wsError', d.error.info || d.error.code);
  return d;
}

async function randomTitles() {
  const d = await wsApi({
    action: 'query', list: 'search', srsearch: `incategory:${DYNASTIES}`,
    srnamespace: '0', srlimit: '20', srsort: 'random', srprop: 'wordcount',
  });
  return d.query.search.filter((r) => r.wordcount >= 10 && r.wordcount <= MAX_WORDS).map((r) => r.title);
}

async function fetchPiece(title) {
  const d = await wsApi({ action: 'parse', page: title, prop: 'text', redirects: '1', variant, disableeditsection: '1', disablelimitreport: '1' });
  return parsePiece(d.parse.title, d.parse.text);
}

// Removed before anything is read: scripts and template CSS, and what that CSS hides on Wikisource (licence metadata,
// mobile-only text). Alternative readings ("一作「…」"), which Wikisource shows on hover, are handled in parsePiece.
const HIDDEN = 'style, link, script, .licensetpl, .ifmobile > .mobile';
const DROP = [
  '#headerContainer', '.ws-header', 'table:has(.mbox-text)', '.mbox-text', '.licenseContainer', '.hatnote',
  'div:has(> span a[href="/wiki/File:Disambig.svg"])', // "更多資料：…" above the header
  '.noprint', '.mw-editsection', 'sup.reference', '.references', '.mw-references-wrap',
  '.navbox', '.ws-noexport', '#plainSister', '.metadata', '#toc', '.toc', 'img', 'figure', '.mw-empty-elt',
].join(',');
const KEEP_TAGS = new Set(['P', 'BR', 'DIV', 'DL', 'DD', 'DT', 'H2', 'H3', 'H4', 'H5', 'B', 'STRONG', 'I', 'EM',
  'BLOCKQUOTE', 'UL', 'OL', 'LI', 'TABLE', 'TBODY', 'TR', 'TD', 'TH', 'SMALL', 'SUP', 'SUB', 'RUBY', 'RT', 'RP']);
// Chapters of vernacular novels (left out) have "◀上一回 … 下一回▶" or "第…回" near the top; classical tales use 卷.
const CHAPTER_NOVEL = /[上下]一回|第[一二三四五六七八九十百千零〇两\d]+回/;

// Returns null for pages that are not a readable text (contents, disambiguation, stubs) and for novel chapters.
function parsePiece(title, html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const root = doc.querySelector('.mw-parser-output') || doc.body;
  root.querySelectorAll(HIDDEN).forEach((n) => n.remove());

  const slash = title.indexOf('/'); // "鋒劍春秋/38" -> book + chapter
  let heading = slash > 0 ? [title.slice(0, slash), title.slice(slash + 1).replace(/\//g, ' ')] : [title];
  let author = '';
  let dynasty = '';
  // Single works use #headerContainer (width in style); book chapters use table.ws-header (width attribute).
  const hdr = root.querySelector('#headerContainer, table.ws-header');
  hdr?.querySelectorAll('.variant-tooltip').forEach((n) => n.remove()); // the title keeps only the main reading
  const center = hdr && [...hdr.querySelectorAll('td')].find((td) =>
    /width:\s*50%/.test(td.getAttribute('style') || '') || td.getAttribute('width') === '50%');
  if (center) {
    for (const br of center.querySelectorAll('br')) br.replaceWith('\n');
    const lines = center.textContent.split('\n').map((s) => s.trim()).filter(Boolean);
    const ai = lines.findIndex((l) => /^(作者|譯者|译者|撰者|編者|编者)：/.test(l));
    const titleLines = ai >= 0 ? lines.slice(0, ai) : lines;
    if (titleLines.length) heading = titleLines;
    if (ai >= 0) {
      const parts = lines[ai].replace(/^[^：]+：/, '').split(/[\s　]+/).filter(Boolean);
      author = parts[0] || '';
      dynasty = parts.slice(1).join(' ');
    }
  }

  // In the text an alternative reading follows the word in brackets: 對（一作「向」）長亭晚.
  root.querySelectorAll('.variant-tooltip').forEach((n) => n.replaceWith(`（${n.textContent.trim()}）`));
  if (CHAPTER_NOVEL.test(root.textContent.slice(0, 300))) return null;
  root.querySelectorAll(DROP).forEach((n) => n.remove());
  const text = root.textContent.replace(/\s+/g, '');
  const linkText = [...root.querySelectorAll('a')].reduce((n, a) => n + a.textContent.replace(/\s+/g, '').length, 0);
  if (text.length < 8 || linkText / text.length > 0.5) return null;

  const out = document.createElement('div');
  sanitizeInto(root, out);
  return { title, heading, author, dynasty, html: out.innerHTML, url: `${WS}/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}` };
}

// Copies text and whitelisted tags only, without attributes; links are unwrapped.
function sanitizeInto(src, dst) {
  for (const child of src.childNodes) {
    if (child.nodeType === Node.TEXT_NODE) {
      dst.append(child.textContent);
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      if (KEEP_TAGS.has(child.tagName)) {
        const n = document.createElement(child.tagName);
        if (child.classList.contains('poem')) n.className = 'poem';
        sanitizeInto(child, n);
        dst.append(n);
      } else if (child.tagName === 'CENTER') {
        const n = Object.assign(document.createElement('div'), { className: 'center' });
        sanitizeInto(child, n);
        dst.append(n);
      } else {
        sanitizeInto(child, dst);
      }
    }
  }
}

async function nextPiece() {
  let titles = await store.get('verseTitles', []);
  for (let attempt = 0; attempt < 10; attempt++) {
    if (!titles.length) titles = await randomTitles();
    const title = titles.shift();
    await store.set('verseTitles', titles);
    if (!title) continue;
    let p;
    try {
      p = await fetchPiece(title);
    } catch (e) {
      if (!e.page) throw e; // offline or rate-limited: other titles would fail the same way
      continue;
    }
    if (p) return p;
  }
  throw tError('tenFailed');
}

let refilling = false;
async function refillQueue() {
  if (refilling) return;
  refilling = true;
  try {
    while ((await store.get('verseQueue', [])).length < QUEUE_SIZE) {
      const rules = verseRules();
      const p = await nextPiece();
      if (rules !== verseRules() || rules !== await store.get('verseRules', null)) break; // script changed meanwhile
      const fresh = await store.get('verseQueue', []); // another tab may have taken one meanwhile
      fresh.push(p);
      await store.set('verseQueue', fresh);
    }
  } catch (e) {
    console.warn('Prefetching texts failed:', e);
  } finally {
    refilling = false;
  }
}

async function showNextVerse() {
  const forced = params.get('title');
  try {
    if (forced) {
      const p = await fetchPiece(forced);
      if (!p) throw tError('unreadable', forced);
      renderVerse(p);
      return;
    }
    const q = await store.get('verseQueue', []);
    let p = q.shift();
    await store.set('verseQueue', q);
    if (!p) {
      renderMessage(() => t('fetching'));
      p = await nextPiece();
    }
    renderVerse(p);
    store.set('verseLast', p);
  } catch (e) {
    const last = await store.get('verseLast', null);
    if (last && !forced) renderVerse(last, () => t('verseLast', errorText(e)));
    else renderMessage(() => t('verseFailed', errorText(e)));
  }
  refillQueue();
}

let currentPiece = null;

function renderVerse(p, note = null) {
  currentPiece = p;
  $('#verse').classList.remove('is-message');
  $('#verse-link').textContent = p.heading.join(' ');
  $('#verse-link').href = p.url;
  $('#verse-meta').textContent = [p.dynasty, p.author].filter(Boolean).join(' · ');
  setText($('#verse-note'), note);
  $('#verse-text').innerHTML = p.html; // from sanitizeInto: whitelisted tags, no attributes
  $('#verse-body').scrollTo(0, 0);
  $('.verse-actions').hidden = false;
  showFav($('#verse-fav'), 'poems', p.url);
  requestAnimationFrame(layoutVerse);
}

function renderMessage(fn) {
  currentPiece = null;
  $('#verse').classList.add('is-message');
  $('#verse-link').textContent = '';
  $('#verse-link').removeAttribute('href');
  $('#verse-meta').textContent = '';
  setText($('#verse-note'), null);
  const p = Object.assign(document.createElement('p'), { className: 'message' });
  setText(p, fn);
  $('#verse-text').replaceChildren(p);
  $('.verse-actions').hidden = true;
  requestAnimationFrame(layoutVerse);
}

// ---------- text tone from the painting ----------
// Each painting has a brightness grid ("l": GRID_W x GRID_H hex digits, luma / 16) and aspect ratio ("r") from
// tools/build_artworks.py. A block gets dark text when the part of the painting behind it is light.
const GRID_W = 12;
const GRID_H = 8;
const VEIL = 0.9; // --veil in newtab.css
const DARK_TEXT_ABOVE = 135; // mean luma after the veil; a title on a bright sky at 142 must turn dark
// Pieces of the settings card that each follow the painting behind them; rows often straddle sky and hills.
const CARD_PARTS = 'header h2, #settings-close, .row > .label, .seg button, #city-input, .hint, .art-countries > .label, .continent, .chip';

function blockRects() {
  const vis = (el) => el && !el.hidden && el.getBoundingClientRect().width > 0;
  const union = (els) => {
    const rs = els.filter(vis).map((el) => el.getBoundingClientRect());
    if (!rs.length) return null;
    return {
      left: Math.min(...rs.map((r) => r.left)), top: Math.min(...rs.map((r) => r.top)),
      right: Math.max(...rs.map((r) => r.right)), bottom: Math.max(...rs.map((r) => r.bottom)),
    };
  };
  // The text block counts only where text is visible: the header plus the body clipped to its scroller.
  const body = $('#verse-body').getBoundingClientRect();
  const text = $('#verse-text').getBoundingClientRect();
  const verse = union([$('#verse header')]);
  if (verse && text.height) {
    verse.left = Math.min(verse.left, text.left);
    verse.right = Math.max(verse.right, text.right);
    verse.bottom = Math.max(verse.bottom, Math.min(text.bottom, body.bottom));
  }
  const card = $('#settings');
  return [
    [$('#c-left .center'), union([$('#time'), $('#date'), $('#weather')])],
    [$('#verse'), verse],
    [$('#bottom'), union([...$('#sites').children, ...$('#caption-row').children])],
    [$('#corner'), union([$('#corner')])],
    ...(card.hidden ? [] : [...card.querySelectorAll(CARD_PARTS)].map((el) => [el, vis(el) ? el.getBoundingClientRect() : null])),
    ...($('#apps').hidden ? [] : [...$('#apps').querySelectorAll('a')].map((el) => [el, el.getBoundingClientRect()])),
  ];
}

// The painting keeps the size it has on the whole screen, shown whole and centred: resizing the window shows more or
// less of it instead of scaling it, and where it does not reach, the page colour (--page-bg) shows.
function artBox(ratio) {
  const [sw, sh] = [screen.width, screen.height];
  return ratio > sw / sh ? [sw, sw / ratio] : [sh * ratio, sh];
}

// The blurred surround: the painting covering the window, enlarged a little so the blur reaches past the edges.
function fillBox(ratio) {
  const [w, h] = ratio > innerWidth / innerHeight ? [innerHeight * ratio, innerHeight] : [innerWidth, innerWidth / ratio];
  return [w * FILL_SCALE, h * FILL_SCALE];
}
const FILL_SCALE = 1.4; // the enlarged painting reaches past #art-fill's 128px overhang, so no transparent edge is blurred in
const FILL_DIM = 0.75; // brightness() of #art-fill in newtab.css

function fitArt() {
  if (!currentArt) return;
  const root = document.documentElement.style;
  const [w, h] = artBox(currentArt.r);
  const [fw, fh] = fillBox(currentArt.r);
  root.setProperty('--art-w', `${w}px`);
  root.setProperty('--art-h', `${h}px`);
  root.setProperty('--fill-w', `${fw}px`);
  root.setProperty('--fill-h', `${fh}px`);
  alignCards();
}

// An open card repeats the page's surround in its ::before layer, which reaches CARD_OVERHANG past the card (inset in
// newtab.css); its background is placed so that it lines up with #art-fill.
const CARD_OVERHANG = 128;
function alignCards() {
  if (!currentArt) return;
  const [aw, ah] = artBox(currentArt.r);
  const [fw, fh] = fillBox(currentArt.r);
  for (const card of [$('#settings'), $('#apps')]) {
    if (card.hidden) continue;
    const r = card.getBoundingClientRect();
    const [x0, y0] = [r.left - CARD_OVERHANG, r.top - CARD_OVERHANG];
    card.style.setProperty('--fill-x', `${(innerWidth - fw) / 2 - x0}px`);
    card.style.setProperty('--fill-y', `${(innerHeight - fh) / 2 - y0}px`);
    card.style.setProperty('--tile-x', `${(innerWidth - aw) / 2 - x0}px`);
    card.style.setProperty('--tile-y', `${(innerHeight - ah) / 2 - y0}px`);
  }
}

const pageLuma = () => {
  const [r, g, b] = getComputedStyle(document.body).backgroundColor.match(/\d+/g).map(Number);
  return 0.299 * r + 0.587 * g + 0.114 * b;
};

// Mean luma under a viewport rectangle, on a 6 x 6 lattice: the painting where it is (centred, size from artBox); around
// it, the repeated painting or its blurred and dimmed enlargement (fillBox); the page colour when no painting is shown.
function lumaUnder(rect, grid, ratio) {
  if (!grid) return pageLuma() * VEIL;
  const cell = (u, v) => parseInt(grid[Math.floor(v * GRID_H) * GRID_W + Math.floor(u * GRID_W)], 16) * 16 + 8;
  const clamp = (t) => Math.min(0.999, Math.max(0, t));
  const wrap = (t) => t - Math.floor(t);
  const [iw, ih] = artBox(ratio);
  const [fw, fh] = fillBox(ratio);
  let sum = 0;
  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < 6; j++) {
      const x = rect.left + (rect.right - rect.left) * (i + 0.5) / 6 - innerWidth / 2;
      const y = rect.top + (rect.bottom - rect.top) * (j + 0.5) / 6 - innerHeight / 2;
      const [u, v] = [x / iw + 0.5, y / ih + 0.5];
      if (u >= 0 && u < 1 && v >= 0 && v < 1) sum += cell(u, v);
      else if (settings.fill === 'tile') sum += cell(wrap(u), wrap(v));
      else sum += cell(clamp(x / fw + 0.5), clamp(y / fh + 0.5)) * FILL_DIM;
    }
  }
  return (sum / 36) * VEIL;
}

function applyTones() {
  const a = artShown ? currentArt : null;
  const grid = a?.l?.length === GRID_W * GRID_H ? a.l : null;
  for (const [el, rect] of blockRects()) {
    if (rect && lumaUnder(rect, grid, a?.r) > DARK_TEXT_ABOVE) el.dataset.tone = 'dark';
    else delete el.dataset.tone;
  }
}

function layoutVerse() {
  decorate($('#verse header .title-slot'));
  decorate($('#verse-text'));
  applyTones();
  showFullTitles();
}

// A title cut off with an ellipsis shows in full in the browser's tooltip.
function showFullTitles() {
  for (const el of [$('#verse-title'), $('#caption'), $('#art-note')]) {
    if (el.scrollWidth > el.clientWidth + 1) el.title = el.textContent.trim();
    else el.removeAttribute('title');
  }
}

// ---------- brush strokes ----------
// One stroke under each line of text, found from the text's line boxes.
function textLines(container) {
  const lines = [];
  const range = document.createRange();
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (!n.textContent.trim()) continue;
    range.selectNodeContents(n);
    for (const r of range.getClientRects()) {
      if (r.width < 1 || r.height < 1) continue;
      const c = (r.top + r.bottom) / 2;
      const line = lines.find((k) => Math.abs(k.c - c) < r.height * 0.6);
      if (line) {
        line.top = Math.min(line.top, r.top);
        line.bottom = Math.max(line.bottom, r.bottom);
        line.left = Math.min(line.left, r.left);
        line.right = Math.max(line.right, r.right);
      } else {
        lines.push({ c, top: r.top, bottom: r.bottom, left: r.left, right: r.right });
      }
    }
  }
  return lines.sort((a, b) => a.c - b.c);
}

function decorate(container) {
  container.querySelectorAll(':scope > .stroke').forEach((n) => n.remove());
  const base = container.getBoundingClientRect();
  const em = parseFloat(getComputedStyle(container).fontSize);
  const side = em * 0.45;
  const headPad = em * 0.7;
  const tailPad = em * 1.3;
  textLines(container).forEach((c, i) => {
    c.right = Math.min(c.right, base.right); // an ellipsized title reports its full width
    const w = c.right - c.left + headPad + tailPad;
    const h = c.bottom - c.top + side * 2;
    const el = Object.assign(document.createElement('div'), { className: 'stroke' });
    Object.assign(el.style, { left: `${c.left - headPad - base.left}px`, top: `${c.top - side - base.top}px`, width: `${w}px`, height: `${h}px` });
    const mask = `url("data:image/svg+xml,${encodeURIComponent(brushSvg(w, h, i + 1))}")`;
    el.style.webkitMaskImage = mask;
    el.style.maskImage = mask;
    container.append(el);
  });
}

// A dry brush stroke, left to right: a blunt head pressed in at a slant, a nearly even body with ragged edges, and a
// tail that breaks into bristle streaks. Built upright (h x w) and turned so the texture runs along the stroke.
function brushSvg(boxW, boxH, seed) {
  const [w, h] = [boxH, boxW];
  const r = w / 2;
  const steps = Math.max(12, Math.round(h / 8));
  const left = [];
  const right = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const y = h * (0.02 + 0.96 * t);
    const swell = 0.9 + 0.1 * Math.sin(Math.PI * Math.min(t * 2.5, 1));
    const half = r * 0.86 * swell * (1 - 0.32 * t ** 2.2);
    const bow = Math.sin(t * Math.PI * 1.1 + seed * 0.9) * r * 0.22;
    const belly = t < 0.14 ? r * 0.35 * Math.sin(Math.PI * (t / 0.14)) ** 0.7 : 0;
    left.push([r + bow - half - belly, y]);
    right.push([r + bow + half, y]);
  }
  const join = left.findIndex(([, y]) => y >= w * 0.7);
  const f = (n) => n.toFixed(1);
  const pts = (arr) => arr.map(([x, y]) => `${f(x)} ${f(y)}`).join(' L');
  const [rx0, ry0] = right[0];
  const [lx, ly] = left[join];
  const d = `M${f(rx0)} ${f(ry0)} L${pts(right.slice(1))} L${pts(left.slice(join).reverse())}`
    + ` C${f(lx - r * 0.1)} ${f(ly - w * 0.55)} ${f(rx0 - w * 0.7)} ${f(ry0 - w * 0.05)} ${f(rx0)} ${f(ry0)} Z`;
  const stops = '<stop offset="0" stop-opacity="1"/><stop offset="0.25" stop-opacity="1"/>'
    + '<stop offset="0.6" stop-opacity="0.5"/><stop offset="1" stop-opacity="0.15"/>';
  const rough = Math.min(6, Math.max(2, w * 0.14));
  const turn = ` transform="translate(0 ${f(w)}) rotate(-90)"`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${f(boxW)}" height="${f(boxH)}" viewBox="0 0 ${f(boxW)} ${f(boxH)}">`
    + `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">${stops.replace(/<stop /g, '<stop stop-color="#fff" ')}</linearGradient>`
    + '<filter id="f" x="-10%" y="-2%" width="120%" height="104%">'
    + `<feTurbulence type="fractalNoise" baseFrequency="0.25" numOctaves="2" seed="${seed}" result="grain"/>`
    + `<feDisplacementMap in="SourceGraphic" in2="grain" scale="${f(rough)}" xChannelSelector="R" yChannelSelector="G" result="shape"/>`
    + `<feTurbulence type="fractalNoise" baseFrequency="0.45 0.02" numOctaves="2" seed="${seed + 7}" result="n"/>`
    + '<feColorMatrix in="n" type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 2.4 0 0 0 -0.7" result="a"/>'
    + '<feComposite in="shape" in2="a" operator="arithmetic" k1="1.4" k2="1" k3="0" k4="-0.62" result="m"/>'
    + '<feComponentTransfer in="m"><feFuncA type="linear" slope="2.2" intercept="-0.1"/></feComponentTransfer>'
    + '</filter></defs>'
    + `<g${turn}><path d="${d}" fill="url(#g)" filter="url(#f)"/></g></svg>`;
}

// ---------- favourites ----------
// Saved as files under Downloads/New Tab Favorites/Texts|Paintings, in English whatever the interface language, so a
// language switch does not start a second folder. The stored list ({ poems, art }, newest first) keeps
// each page URL ("id") and download ids ("files") so un-starring deletes the files; an entry is added only once all
// its downloads have finished.
const favBusy = new Set(); // ids whose files are being saved or deleted
const shownId = (btn) => (btn.id === 'art-fav' ? currentArt?.u : currentPiece?.url);

async function showFav(btn, kind, id) {
  btn.disabled = favBusy.has(id);
  const fav = await store.get('favorites', { poems: [], art: [] });
  if (shownId(btn) === id) setFavButton(btn, fav[kind].some((x) => x.id === id));
}

function setFavButton(btn, on, error = null) {
  btn.classList.toggle('on', on);
  btn.setAttribute('aria-pressed', String(on));
  labelFav(btn);
  setText(btn.parentElement.querySelector('.fav-msg'), error);
}

const labelFav = (btn) => btn.setAttribute('aria-label', t(btn.classList.contains('on') ? 'favRemove' : 'favAdd', btn.id === 'art-fav'));

function safeName(s) {
  return s.replace(/[\\/:*?"<>|\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().replace(/^\.+/, '').slice(0, 80) || t('untitled');
}

const today = () => new Date().toLocaleDateString('sv'); // local YYYY-MM-DD

function poemFiles(p) {
  const title = p.heading.join(' ');
  const by = [p.dynasty, p.author].filter(Boolean).join(' · ');
  const body = $('#verse-text').innerText.replace(/\n{3,}/g, '\n\n').trim();
  const md = `# ${title}\n\n${by ? `${by}\n\n` : ''}${body}\n\n${t('line', t('source'), p.url)}\n${t('savedOn', today())}\n`;
  return [{ name: `${safeName(`${p.author || t('anonymous')} - ${title}`)}.md`, text: md }];
}

function artFiles(a) {
  const base = safeName(`${(a.a || '').replace(/\s*\(.*$/, '') || t('anonymous')} - ${a.t}`);
  const md = `# ${a.t}\n\n${[a.a, a.d].filter(Boolean).join(', ')}\n\n${t('line', museumName(a), a.u)}\n${t('line', t('image'), a.i)}\n${t('savedOn', today())}\n`;
  return [{ name: `${base}.jpg`, url: a.i }, { name: `${base}.md`, text: md }];
}

// Downloads every file and waits for all; if one fails, all are cancelled and deleted again.
async function saveFiles(kind, files) {
  const ids = [];
  try {
    for (const f of files) {
      ids.push(await chrome.downloads.download({
        url: f.url || `data:text/markdown;charset=utf-8,${encodeURIComponent(f.text)}`,
        filename: `New Tab Favorites/${kind === 'art' ? 'Paintings' : 'Texts'}/${f.name}`,
        conflictAction: 'uniquify', saveAs: false,
      }));
    }
    await Promise.all(ids.map(downloadDone));
    return ids;
  } catch (e) {
    await removeFiles(ids);
    throw e;
  }
}

const DOWNLOAD_TIMEOUT = 2 * 60 * 1000;

function downloadDone(id) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (state, error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      chrome.downloads.onChanged.removeListener(onChange);
      if (state === 'complete') resolve();
      else reject(downloadError(error));
    };
    const onChange = (d) => {
      if (d.id === id && d.state && d.state.current !== 'in_progress') finish(d.state.current, d.error?.current);
    };
    const timer = setTimeout(() => finish('timeout', 'TIMEOUT'), DOWNLOAD_TIMEOUT);
    chrome.downloads.onChanged.addListener(onChange);
    chrome.downloads.search({ id }).then(([d]) => { // a small data: URL can finish before the listener is added
      if (d && d.state !== 'in_progress') finish(d.state, d.error);
    });
  });
}

// chrome.downloads.InterruptReason in words.
function downloadError(code = '') {
  if (code === 'TIMEOUT') return tError('dlTimeout');
  if (code === 'FILE_NO_SPACE') return tError('dlNoSpace');
  if (code.startsWith('FILE_')) return tError('dlFile', code);
  if (code.startsWith('NETWORK_')) return tError('dlNetwork', code);
  if (code.startsWith('SERVER_')) return tError('dlServer', code);
  if (code === 'USER_CANCELED') return tError('dlCanceled');
  return tError('dlOther', code);
}

async function removeFiles(ids) {
  for (const id of ids) {
    try { await chrome.downloads.cancel(id); } catch { /* finished or gone */ }
    try { await chrome.downloads.removeFile(id); } catch { /* unfinished, moved or deleted by hand */ }
    try { await chrome.downloads.erase({ id }); } catch { /* not in the list any more */ }
  }
}

// A click follows the button as shown (another tab may have changed the list) and is ignored while busy.
async function toggleFav(btn, kind, id, makeFiles) {
  if (favBusy.has(id)) return;
  favBusy.add(id);
  btn.disabled = true;
  // Results only reach the button while it still shows this item.
  const show = (...args) => { if (shownId(btn) === id) setFavButton(btn, ...args); };
  try {
    if (btn.classList.contains('on')) await unsaveFav(show, kind, id);
    else await saveFav(show, kind, id, makeFiles);
  } finally {
    favBusy.delete(id);
    if (shownId(btn) === id) btn.disabled = false;
  }
}

async function unsaveFav(show, kind, id) {
  const fav = await store.get('favorites', { poems: [], art: [] });
  const old = fav[kind].find((x) => x.id === id);
  fav[kind] = fav[kind].filter((x) => x.id !== id);
  await store.set('favorites', fav);
  show(false);
  if (old) await removeFiles(old.files || []);
}

// The star turns on at once and back off if the files cannot be saved.
async function saveFav(show, kind, id, makeFiles) {
  if ((await store.get('favorites', { poems: [], art: [] }))[kind].some((x) => x.id === id)) {
    show(true);
    return;
  }
  show(true);
  let files;
  try {
    files = await saveFiles(kind, makeFiles());
  } catch (e) {
    console.error('Saving the favourite failed:', e);
    show(false, () => t('favFailed', errorText(e)));
    return;
  }
  const latest = await store.get('favorites', { poems: [], art: [] });
  latest[kind] = [{ id, files }, ...latest[kind].filter((x) => x.id !== id)];
  await store.set('favorites', latest);
}

function syncFavButtons() {
  if (currentPiece && !favBusy.has(currentPiece.url)) showFav($('#verse-fav'), 'poems', currentPiece.url);
  if (currentArt && !favBusy.has(currentArt.u)) showFav($('#art-fav'), 'art', currentArt.u);
}

// ---------- wiring ----------
$('#verse-next').addEventListener('click', showNextVerse);
$('#art-next').addEventListener('click', showNextArt);
$('#verse-fav').addEventListener('click', () => {
  const p = currentPiece;
  if (p) toggleFav($('#verse-fav'), 'poems', p.url, () => poemFiles(p));
});
$('#art-fav').addEventListener('click', () => {
  const a = currentArt;
  if (a) toggleFav($('#art-fav'), 'art', a.u, () => artFiles(a));
});
$('#weather').addEventListener('click', () => openSettings(true, true));
$('#weather').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    openSettings(true, true);
  }
});
$('#settings-btn').addEventListener('click', () => openSettings($('#settings').hidden));
$('#apps-btn').addEventListener('click', () => openApps($('#apps').hidden));
$('#settings-close').addEventListener('click', () => openSettings(false));
$('#city-form').addEventListener('submit', submitCity);
$('#settings').addEventListener('click', (e) => {
  const b = e.target.closest('.seg button');
  if (b) changeSetting(b.parentElement.dataset.key, b.dataset.v);
});
$('#country-groups').addEventListener('change', (e) => {
  const hidden = [...document.querySelectorAll('#country-groups input:not(:checked)')].map((x) => x.value);
  if (!document.querySelector('#country-groups input:checked')) {
    e.target.checked = true; // at least one country stays
    return;
  }
  changeSetting('hidden', hidden);
});
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  openSettings(false);
  openApps(false);
});
document.addEventListener('click', (e) => {
  if (!$('#settings').hidden && !e.target.closest('#settings, #settings-btn, #weather')) openSettings(false);
  if (!$('#apps').hidden && !e.target.closest('#apps, #apps-btn')) openApps(false);
});
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  if (changes.favorites) syncFavButtons();
  const next = changes.settings?.newValue;
  if (next && JSON.stringify(next) !== JSON.stringify(settings)) {
    const old = settings;
    settings = { ...SETTINGS_DEFAULT, ...next };
    settingsChanged(old);
  }
});
window.addEventListener('resize', () => requestAnimationFrame(() => { fitArt(); layoutVerse(); fitSites(); })); // fitArt: another screen

(async () => {
  settings = { ...SETTINGS_DEFAULT, ...(await store.get('settings', {})) };
  applySettings();
  tickClock(true);
  setInterval(tickClock, 1000);
  loadWeather();
  showNextArt();
  showSites();
  // Prefetched texts follow the rules they were fetched under (script, skipped works); a new rule empties the queue.
  if ((await store.get('verseRules', null)) !== verseRules()) {
    await store.set('verseQueue', []);
    await store.set('verseRules', verseRules());
  }
  showNextVerse();
})();
