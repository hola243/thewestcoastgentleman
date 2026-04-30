/* ============================================
   THE WEST COAST GENTLEMAN — Main JS
   ============================================ */

const SVG_SUN  = `<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="4.22" y1="4.22" x2="6.34" y2="6.34"/><line x1="17.66" y1="17.66" x2="19.78" y2="19.78"/><line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/><line x1="4.22" y1="19.78" x2="6.34" y2="17.66"/><line x1="17.66" y1="6.34" x2="19.78" y2="4.22"/></svg>`;
const SVG_MOON = `<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;

/* ── Theme ── */
const html        = document.documentElement;
const themeToggle = document.getElementById('themeToggle');
const STORAGE_KEY = 'wcg-theme';

function getTheme() {
  return localStorage.getItem(STORAGE_KEY) ||
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
}

function applyTheme(theme) {
  html.setAttribute('data-theme', theme);
  localStorage.setItem(STORAGE_KEY, theme);
  if (themeToggle) {
    themeToggle.innerHTML = theme === 'dark' ? SVG_SUN : SVG_MOON;
    themeToggle.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
  }
}

applyTheme(getTheme());

themeToggle?.addEventListener('click', () => {
  applyTheme(html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
});

/* ── Mobile menu ── */
const hamburger  = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobileMenu');

function closeMenu() {
  hamburger?.classList.remove('open');
  mobileMenu?.classList.remove('open');
  document.body.style.overflow = '';
}

hamburger?.addEventListener('click', () => {
  const open = hamburger.classList.toggle('open');
  mobileMenu?.classList.toggle('open', open);
  document.body.style.overflow = open ? 'hidden' : '';
});
mobileMenu?.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));

/* ── Scroll reveal ── */
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    const el = entry.target;
    /* stagger siblings */
    const siblings = [...(el.parentElement?.querySelectorAll('[data-reveal]') || [])];
    const i = siblings.indexOf(el);
    el.style.transitionDelay = `${i * 0.07}s`;
    el.classList.add('revealed');
    observer.unobserve(el);
  });
}, { threshold: 0.1, rootMargin: '0px 0px -32px 0px' });

document.querySelectorAll('[data-reveal]').forEach(el => observer.observe(el));

/* ── Scroll-to-top ── */
const scrollTopBtn = document.getElementById('scrollTop');
window.addEventListener('scroll', () => {
  scrollTopBtn?.classList.toggle('visible', window.scrollY > 480);
}, { passive: true });
scrollTopBtn?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

/* ── Nav shadow on scroll ── */
const nav = document.querySelector('.nav');
window.addEventListener('scroll', () => {
  if (!nav) return;
  nav.style.boxShadow = window.scrollY > 8 ? '0 1px 24px rgba(0,0,0,0.07)' : 'none';
}, { passive: true });

/* ── Smooth anchor scroll ── */
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const target = document.querySelector(a.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - 80, behavior: 'smooth' });
  });
});
