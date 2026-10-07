import { initBackground } from './bg.js';

// Swap these for the real destinations when they exist.
const LINKS = {
  ios: '#get',
  android: '#get',
  download: '#get',
  signup: '#get',
  submit: '#get',
};

// Drop the finished company reel at public/reel.mp4 and set this to '/reel.mp4'.
// It then plays behind the portal in the journey instead of the first photo.
const REEL_VIDEO = '';

const photo = (id, w, h, q = 70) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&h=${h}&q=${q}`;

const VIBES = [
  { id: 'all', label: 'Everything' },
  { id: 'music', label: 'Music' },
  { id: 'nightlife', label: 'Nightlife' },
  { id: 'art', label: 'Art' },
  { id: 'food', label: 'Food' },
  { id: 'sports', label: 'Sports' },
  { id: 'outdoors', label: 'Outdoors' },
];

const VIBE_PHOTO = {
  music: '1501386761578-eac5c94b800a',
  nightlife: '1578736641330-3155e606cd40',
  art: '1569783721854-33a99b4c0bae',
  food: '1535898331935-2d274aff0fbc',
  sports: '1713427508493-25e2c572deff',
  outdoors: '1664388854965-ac27572aa499',
};

// Full-bleed backdrops for the journey, in order: portal, discover, moments, connect, begin.
const TRIP_PHOTOS = [
  '1470229722913-7c0e2dbbafd3',
  '1695128861516-d9b48461c04c',
  '1669849113239-a908b18fd2b7',
  '1517457373958-b7bdd4587205',
  '1603924039092-e92d987c772b',
];

// Illustrative sample data only.
const EVENTS = [
  { vibe: 'music', name: 'Rooftop Vinyl Sessions', photo: '1517457373958-b7bdd4587205', when: 'Live now', meta: '0.4 mi · Rooftop on 9th', live: true },
  { vibe: 'food', name: 'Late Night Ramen Pop-Up', photo: '1535898331935-2d274aff0fbc', when: 'Live now', meta: '0.7 mi · Alley Kitchen', live: true },
  { vibe: 'art', name: 'Neon Gallery Crawl', photo: '1569783721854-33a99b4c0bae', when: 'Tonight · 9:30 PM', meta: '1.1 mi · Arts District' },
  { vibe: 'nightlife', name: 'Warehouse Silent Disco', photo: '1578736641330-3155e606cd40', when: 'Tonight · 11 PM', meta: '0.9 mi · Dock 14' },
  { vibe: 'sports', name: '3v3 Under the Lights', photo: '1713427508493-25e2c572deff', when: 'Tonight · 8 PM', meta: '1.6 mi · Riverside Courts' },
  { vibe: 'music', name: 'Open Mic: First Timers', photo: '1517230878791-4d28214057c2', when: 'Tomorrow · 7 PM', meta: '0.3 mi · The Back Room' },
  { vibe: 'outdoors', name: 'Sunrise Run Club', photo: '1664388854965-ac27572aa499', when: 'Tomorrow · 6 AM', meta: '2.0 mi · Lakefront Trail' },
  { vibe: 'art', name: 'Film Photo Walk', photo: '1688322185458-0e9d0564bfe8', when: 'Saturday · 4 PM', meta: '1.2 mi · Old Town' },
];

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
const clamp = (v) => Math.min(Math.max(v, 0), 1);
// eased 0→1 as p travels from a to b
const span = (p, a, b) => {
  const t = clamp((p - a) / (b - a));
  return t * t * (3 - 2 * t);
};

document.documentElement.classList.add('js');
const shader = initBackground($('#bg'));

$$('[data-link]').forEach((a) => {
  const href = LINKS[a.dataset.link];
  if (href) a.setAttribute('href', href);
});
$('#year').textContent = new Date().getFullYear();

/* ---------- The journey: one pinned stage, scrubbed by scroll ---------- */
const trip = $('#trip');
const stage = $('#trip-stage');
const tripBg = $('#trip-bg');
const ring = $('#trip-ring');
const phone = $('#trip-phone');
const phoneScreens = $$('img', phone);
const scenes = Object.fromEntries($$('.scene', stage).map((s) => [s.dataset.scene, s]));
const missedCards = $$('.missed__card', stage);
const interests = $$('#trip-interests span');
const kicker = $('#trip-kicker');
const stepOut = $('#trip-stepout');
const happening = $('#trip-happening');
const momentsWord = $('#trip-moments');
const momentsCopy = $('.scene__copy', scenes.moments);
const beginWord = $('#trip-begin');
const tripCta = $('#trip-cta');
const rail = $('#trip-rail');

const CHAPTERS = [
  { label: 'Missed', at: 0.02 },
  { label: 'Step out', at: 0.2 },
  { label: 'Discover', at: 0.47 },
  { label: 'Moments', at: 0.69 },
  { label: 'Connect', at: 0.86 },
  { label: 'Begin', at: 0.985 },
];
rail.innerHTML = CHAPTERS.map((c) => `<button type="button" aria-label="${c.label}"><i></i><span>${c.label}</span></button>`).join('');
const railButtons = $$('button', rail);
railButtons.forEach((btn, i) =>
  btn.addEventListener('click', () => {
    const top = trip.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: top + CHAPTERS[i].at * (trip.offsetHeight - window.innerHeight), behavior: reduced ? 'auto' : 'smooth' });
  })
);

if (REEL_VIDEO) {
  const video = document.createElement('video');
  Object.assign(video, { muted: true, loop: true, playsInline: true, preload: 'none' });
  video.dataset.src = REEL_VIDEO;
  tripBg.firstElementChild.replaceWith(video);
}
const bgLayers = [...tripBg.children];

// The journey's media stays out of the first paint: it starts downloading once the
// page itself has loaded, or sooner if someone scrolls straight to it.
let tripLoaded = false;
function loadTripMedia() {
  if (tripLoaded) return;
  tripLoaded = true;
  const small = window.innerWidth < 700;
  bgLayers.forEach((layer, i) => {
    layer.src = layer.dataset.src || photo(TRIP_PHOTOS[i], small ? 800 : 1600, small ? 1400 : 900, 60);
    if (layer.tagName === 'VIDEO') layer.play().catch(() => {});
  });
  phoneScreens.forEach((img) => (img.src = img.dataset.src));
}
if (document.readyState === 'complete') loadTripMedia();
else window.addEventListener('load', loadTripMedia);
window.addEventListener('scroll', loadTripMedia, { once: true, passive: true });

let ringBase = 0;
let activeChapter = -1;

function renderTrip(p) {
  // 1 · Missed: the cards fall away one by one
  const missedOut = span(p, 0.13, 0.18);
  scenes.missed.style.opacity = 1 - missedOut;
  scenes.missed.style.transform = `translate3d(0, ${-40 * missedOut}px, 0)`;
  missedCards.forEach((card, i) => {
    const t = span(p, 0.02 + i * 0.028, 0.1 + i * 0.028);
    const dir = i % 2 ? 1 : -1;
    card.style.opacity = 1 - t;
    card.style.transform = `translate3d(${dir * 60 * t}px, ${90 * t}px, 0) scale(${1 - 0.4 * t}) rotate(${dir * 14 * t}deg)`;
  });
  kicker.style.opacity = span(p, 0.07, 0.12);

  // 2 · Portal: a ring opens and the night floods through it
  const appear = span(p, 0.13, 0.19);
  const expand = clamp((p - 0.22) / 0.11);
  const ringScale = (0.55 + 0.45 * appear) * (1 + expand * expand * 16);
  ring.style.opacity = appear * (1 - span(p, 0.28, 0.33));
  ring.style.transform = `scale(${ringScale})`;
  tripBg.style.clipPath = expand >= 1 ? 'none' : `circle(${appear > 0 ? (ringBase / 2) * ringScale : 0}px at 50% 50%)`;
  stepOut.style.opacity = span(p, 0.15, 0.19) * (1 - span(p, 0.215, 0.245));
  const hapIn = span(p, 0.28, 0.32);
  const hapOut = span(p, 0.37, 0.41);
  happening.style.opacity = hapIn * (1 - hapOut);
  happening.style.transform = `translate3d(0, ${(1 - hapIn) * 40 - hapOut * 40}px, 0)`;

  // 3 · Discover: the phone rises with the live map
  const discIn = span(p, 0.4, 0.44);
  const discOut = span(p, 0.55, 0.59);
  scenes.discover.style.opacity = discIn * (1 - discOut);
  scenes.discover.style.transform = `translate3d(0, ${(1 - discIn) * 50 - discOut * 50}px, 0)`;
  const phoneIn = span(p, 0.37, 0.45);
  const phoneOut = span(p, 0.77, 0.83);
  phone.style.transform = `translate3d(0, ${(1 - phoneIn + phoneOut) * 130}%, 0) rotate(${(1 - phoneIn) * 10 - phoneOut * 8}deg)`;
  phoneScreens[1].style.opacity = span(p, 0.59, 0.63);

  // 4 · Moments: the word lands, then steps back behind the copy
  const momIn = span(p, 0.58, 0.62);
  const momOut = span(p, 0.75, 0.79);
  scenes.moments.style.opacity = momIn * (1 - momOut);
  momentsWord.style.transform = `scale(${1 + (1 - span(p, 0.58, 0.65)) * 1.4})`;
  momentsWord.style.opacity = 1 - 0.86 * span(p, 0.64, 0.68);
  momentsCopy.style.opacity = span(p, 0.64, 0.68);

  // 5 · Connect: interests pop in
  const conIn = span(p, 0.8, 0.84);
  const conOut = span(p, 0.895, 0.925);
  scenes.connect.style.opacity = conIn * (1 - conOut);
  scenes.connect.style.transform = `translate3d(0, ${(1 - conIn) * 40}px, 0) scale(${1 + conOut * 0.15})`;
  interests.forEach((chip, i) => {
    const t = span(p, 0.825 + i * 0.007, 0.85 + i * 0.007);
    chip.style.opacity = t;
    chip.style.transform = `translate3d(0, ${(1 - t) * 20}px, 0) scale(${0.6 + 0.4 * t})`;
  });

  // 6 · Begin
  const beginIn = span(p, 0.92, 0.96);
  scenes.begin.style.opacity = beginIn;
  beginWord.style.transform = `scale(${1 + (1 - beginIn) * 0.8})`;
  const ctaIn = span(p, 0.955, 0.985);
  tripCta.style.opacity = ctaIn;
  tripCta.style.pointerEvents = ctaIn > 0.5 ? 'auto' : 'none';

  bgLayers[1].style.opacity = span(p, 0.38, 0.44);
  bgLayers[2].style.opacity = span(p, 0.57, 0.63);
  bgLayers[3].style.opacity = span(p, 0.78, 0.84);
  bgLayers[4].style.opacity = span(p, 0.9, 0.95);

  let chapter = 0;
  CHAPTERS.forEach((c, i) => {
    if (p >= c.at - 0.06) chapter = i;
  });
  if (chapter !== activeChapter) {
    activeChapter = chapter;
    railButtons.forEach((b, i) => b.classList.toggle('is-active', i === chapter));
  }

  // Photos fully cover the shader for most of the journey, so let the GPU rest.
  shader?.setPaused(p > 0.34 && p < 0.999);
}

// Dev-only handle for jumping the journey to an exact point from the console.
let tripTarget = 0;
let tripNow = 0;
if (import.meta.env.DEV) window.__tripJump = (p) => renderTrip((tripNow = tripTarget = p));
let tripRunning = false;

function tripTick() {
  const delta = tripTarget - tripNow;
  tripNow = reduced || Math.abs(delta) < 0.0004 ? tripTarget : tripNow + delta * 0.14;
  renderTrip(tripNow);
  if (tripNow !== tripTarget) requestAnimationFrame(tripTick);
  else tripRunning = false;
}

function readTrip() {
  const rect = trip.getBoundingClientRect();
  tripTarget = clamp(-rect.top / (rect.height - window.innerHeight));
  if (tripRunning) return;
  tripRunning = true;
  requestAnimationFrame(tripTick);
}

/* ---------- Scroll-driven bits (one rAF-throttled handler) ---------- */
const nav = $('#nav');
const bar = $('#progress-bar');
const manifesto = $('#manifesto');
const hot = new Set(['being', 'there,', 'together.']);
manifesto.innerHTML = manifesto.textContent
  .trim()
  .split(/\s+/)
  .map((w) => `<span class="w${hot.has(w) ? ' hot' : ''}">${w}</span>`)
  .join(' ');
const words = $$('.w', manifesto);
let litCount = -1;

function onScroll() {
  const y = window.scrollY;
  const vh = window.innerHeight;
  const max = document.documentElement.scrollHeight - vh;
  bar.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
  nav.classList.toggle('is-stuck', y > 40);
  readTrip();

  const r = manifesto.getBoundingClientRect();
  if (r.bottom > 0 && r.top < vh) {
    const progress = (vh * 0.85 - r.top) / (r.height + vh * 0.35);
    const count = Math.round(clamp(progress) * words.length);
    if (count !== litCount) {
      litCount = count;
      words.forEach((w, i) => w.classList.toggle('on', i < count));
    }
  }
}

function onResize() {
  ringBase = Math.min(window.innerWidth, window.innerHeight) * 0.46;
  onScroll();
}

let ticking = false;
window.addEventListener(
  'scroll',
  () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      onScroll();
    });
  },
  { passive: true }
);
window.addEventListener('resize', onResize);
onResize();

/* ---------- Reveal on enter ---------- */
const revealer = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('in');
      revealer.unobserve(entry.target);
    }
  },
  { rootMargin: '0px 0px -12% 0px' }
);
$$('.reveal').forEach((el) => revealer.observe(el));

/* ---------- Pointer: hero parallax + card tilt ---------- */
if (finePointer && !reduced) {
  const cards = $$('.float-card');
  const hero = $('#hero');
  let px = 0;
  let py = 0;
  let queued = false;
  hero.addEventListener(
    'pointermove',
    (e) => {
      px = e.clientX / window.innerWidth - 0.5;
      py = e.clientY / window.innerHeight - 0.5;
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        for (const card of cards) {
          const d = Number(card.dataset.depth);
          card.style.transform = `translate3d(${px * d}px, ${py * d}px, 0)`;
        }
      });
    },
    { passive: true }
  );

  document.addEventListener(
    'pointermove',
    (e) => {
      const el = e.target.closest?.('.tilt');
      if (!el) return;
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      el.style.setProperty('--ry', `${x * 12}deg`);
      el.style.setProperty('--rx', `${-y * 12}deg`);
    },
    { passive: true }
  );
  document.addEventListener(
    'pointerout',
    (e) => {
      const el = e.target.closest?.('.tilt');
      if (!el || el.contains(e.relatedTarget)) return;
      el.style.setProperty('--ry', '0deg');
      el.style.setProperty('--rx', '0deg');
    },
    { passive: true }
  );
}

/* ---------- Tonight: vibe filter ---------- */
const chips = $('#chips');
const eventsEl = $('#events');
const escapeHtml = (s) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

function eventCard(ev, i) {
  return `<article class="event-card tilt" data-vibe="${ev.vibe}" style="--i:${i}">
    <div class="event-card__cover">
      <img src="${photo(ev.photo, 560, 360)}" alt="" loading="lazy" decoding="async" />
      <span>${ev.vibe.toUpperCase()}</span>
    </div>
    <div class="event-card__body">
      <span class="live${ev.live ? '' : ' live--soon'}">${ev.live ? '<i></i>' : ''}${ev.when}</span>
      <h3>${ev.name}</h3>
      <p>${ev.meta}</p>
    </div>
  </article>`;
}

function renderEvents(vibe) {
  const list = vibe === 'all' ? EVENTS : EVENTS.filter((ev) => ev.vibe === vibe);
  eventsEl.innerHTML = list.map(eventCard).join('');
}

chips.innerHTML = VIBES.map(
  (v, i) => `<button type="button" class="chip${i ? '' : ' is-on'}" data-vibe="${v.id}" aria-pressed="${!i}">${v.label}</button>`
).join('');
chips.addEventListener('click', (e) => {
  const chip = e.target.closest('.chip');
  if (!chip) return;
  $$('.chip', chips).forEach((c) => {
    c.classList.toggle('is-on', c === chip);
    c.setAttribute('aria-pressed', c === chip);
  });
  renderEvents(chip.dataset.vibe);
});
renderEvents('all');

/* ---------- Host: live event builder ---------- */
const builder = $('#builder');
const preview = $('#preview');
const previewImg = $('#preview-img');
const vibeSeg = $('#builder-vibe');
const whenSeg = $('#builder-when');

vibeSeg.innerHTML = VIBES.slice(1)
  .map((v, i) => `<button type="button" class="${i ? '' : 'is-on'}" data-value="${v.id}">${v.label}</button>`)
  .join('');

function pick(seg, onPick) {
  seg.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    $$('button', seg).forEach((b) => b.classList.toggle('is-on', b === btn));
    onPick(btn.dataset.value);
  });
}
previewImg.loading = 'lazy';
previewImg.src = photo(VIBE_PHOTO.music, 560, 360);
pick(whenSeg, (value) => ($('#preview-when').textContent = value));
pick(vibeSeg, (value) => {
  preview.dataset.vibe = value;
  previewImg.src = photo(VIBE_PHOTO[value], 560, 360);
  $('#preview-word').textContent = value.toUpperCase();
});

builder.addEventListener('input', () => {
  const { name, where } = builder.elements;
  $('#preview-name').innerHTML = escapeHtml(name.value.trim() || name.placeholder);
  $('#preview-where').innerHTML = escapeHtml(where.value.trim() || where.placeholder);
});
builder.addEventListener('submit', (e) => e.preventDefault());

/* ---------- Share ---------- */
const toast = $('#toast');
let toastTimer;
function showToast(message) {
  toast.textContent = message;
  toast.classList.add('is-on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('is-on'), 2400);
}

$('#share').addEventListener('click', async () => {
  const data = {
    title: 'Evolve',
    text: "Find what's happening tonight. It's about being there, together.",
    url: location.origin + location.pathname,
  };
  try {
    if (navigator.share) {
      await navigator.share(data);
    } else {
      await navigator.clipboard.writeText(data.url);
      showToast('Link copied. Send it to your people.');
    }
  } catch (err) {
    if (err.name !== 'AbortError') showToast('Could not share. Copy the address bar instead.');
  }
});
