// Accessible tab switching with hash-based deep links
const tabs = Array.from(document.querySelectorAll('.tab'));
const sections = Array.from(document.querySelectorAll('.tab-content'));

const tabIndicator = document.querySelector('.tab-indicator');
const tabStatus = document.getElementById('tab-status');
const sidebarNav = document.querySelector('.sidebar nav');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function moveIndicatorToTab(tab) {
  if (!tabIndicator || !tab || !sidebarNav) return;
  const rect = tab.getBoundingClientRect();
  const parentRect = sidebarNav.getBoundingClientRect();
  const offset = rect.left - parentRect.left;
  tabIndicator.style.width = rect.width + 'px';
  tabIndicator.style.transform = `translateX(${offset}px)`;
}

function announceTab(tab) {
  if (!tabStatus || !tab) return;
  tabStatus.textContent = `${tab.textContent} section selected`;
}

function activateTab(tab, moveFocus = false) {
  const target = tab.getAttribute('data-tab');

  tabs.forEach(b => {
    const isActive = b === tab;
    b.classList.toggle('active', isActive);
    b.setAttribute('aria-selected', isActive ? 'true' : 'false');
    b.tabIndex = isActive ? 0 : -1;
  });

  sections.forEach(s => {
    const isActive = s.id === target;
    s.classList.toggle('active', isActive);
    s.setAttribute('aria-hidden', isActive ? 'false' : 'true');

    // Trigger entrance animation for cards in the newly active section.
    if (isActive) {
      s.classList.add('animate');
      // remove after animation completes so it can replay on next open
      setTimeout(() => s.classList.remove('animate'), 900);
    } else {
      s.classList.remove('animate');
    }
  });

  // Update URL hash without scrolling
  history.replaceState(null, '', '#' + target);

  // Move indicator (animated unless user prefers reduced motion)
  if (reduceMotion) {
    moveIndicatorToTab(tab);
  } else {
    // animate using rAF to keep it smooth
    requestAnimationFrame(() => moveIndicatorToTab(tab));
  }

  announceTab(tab);

  if (moveFocus) tab.focus();
}

tabs.forEach((button, i) => {
  button.addEventListener('click', () => activateTab(button, true));

  button.addEventListener('keydown', (e) => {
    const key = e.key;
    let newIndex;
    if (key === 'ArrowRight') {
      newIndex = (i + 1) % tabs.length;
      tabs[newIndex].focus();
      e.preventDefault();
    } else if (key === 'ArrowLeft') {
      newIndex = (i - 1 + tabs.length) % tabs.length;
      tabs[newIndex].focus();
      e.preventDefault();
    } else if (key === 'Home') {
      tabs[0].focus();
      e.preventDefault();
    } else if (key === 'End') {
      tabs[tabs.length - 1].focus();
      e.preventDefault();
    } else if (key === 'Enter' || key === ' ') {
      activateTab(button, true);
      e.preventDefault();
    }
  });
});

function activateFromHash() {
  const hash = location.hash.replace('#','');
  if (!hash) return;
  const targetTab = tabs.find(t => t.getAttribute('data-tab') === hash);
  if (targetTab) activateTab(targetTab);
}

activateFromHash();
window.addEventListener('hashchange', activateFromHash);

// Cursor glow — optimize with requestAnimationFrame
const glow = document.getElementById('cursor-glow');
let pointer = { x: 0, y: 0 };
let pending = false;

document.addEventListener('mousemove', e => {
  pointer.x = e.clientX;
  pointer.y = e.clientY;
  if (!pending) {
    pending = true;
    requestAnimationFrame(() => {
      glow.style.left = pointer.x + 'px';
      glow.style.top = pointer.y + 'px';
      pending = false;
    });
  }
});

// Make sure indicator is placed initially
const initialTab = tabs.find(t => t.classList.contains('active')) || tabs[0];
if (initialTab) moveIndicatorToTab(initialTab);

// Dossier tiles -> open panel overlay with corresponding section content
const tiles = Array.from(document.querySelectorAll('.tile'));
const panelOverlay = document.querySelector('.panel-overlay');
const panel = document.querySelector('.panel');
const panelContent = document.querySelector('.panel-content');
const panelClose = document.querySelector('.panel-close');
let lastFocusedTile = null;

// initialize tile aria labels (for screen readers)
tiles.forEach(t => {
  const headEl = t.querySelector('.tile-head');
  const label = headEl ? headEl.textContent.trim() : t.textContent.trim();
  t.setAttribute('aria-label', label);
});

// Landing-card sheen and micro-interaction (respect reduced motion)
const landingCard = document.querySelector('.landing-card');
if (landingCard && !reduceMotion) {
  // animate sheen once after load
  setTimeout(() => landingCard.classList.add('shine-animate'), 700);
  landingCard.addEventListener('mouseenter', () => landingCard.classList.add('shine-on'));
  landingCard.addEventListener('mouseleave', () => landingCard.classList.remove('shine-on'));
  // small parallax on mousemove over landing card
  landingCard.addEventListener('mousemove', (e) => {
    const rect = landingCard.getBoundingClientRect();
    const dx = (e.clientX - (rect.left + rect.width / 2)) / rect.width;
    const dy = (e.clientY - (rect.top + rect.height / 2)) / rect.height;
    landingCard.style.transform = `translate(${dx * 6}px, ${dy * 4}px)`;
  });
  landingCard.addEventListener('mouseleave', () => { landingCard.style.transform = ''; });
}

let _trapListener = null;

function openPanel(targetId, opener) {
  const sec = document.getElementById(targetId);
  if (!sec || !panelOverlay || !panelContent) return;

  // clone content to panel
  panelContent.innerHTML = '';
  const cloned = sec.cloneNode(true);
  // Remove tab-specific classes/attributes so content is visible inside the dialog
  cloned.classList.remove('tab-content', 'active');
  cloned.removeAttribute('aria-hidden');
  // avoid duplicate ids inside dialog
  cloned.removeAttribute('id');

  // ensure headings are accessible inside dialog
  const heading = cloned.querySelector('h2');
  if (heading) heading.id = 'panel-title';

  const inner = document.createElement('div');
  inner.className = 'panel-inner';
  inner.appendChild(cloned);
  panelContent.appendChild(inner);

  panelOverlay.hidden = false;
  panelOverlay.setAttribute('open', '');
  panelOverlay.removeAttribute('aria-hidden');
  panel.classList.add('open');
  panel.classList.add('animate');
  // allow panel-inner animation to run, then remove class so it can replay later
  setTimeout(() => panel.classList.remove('animate'), 900);

  // prevent background scroll
  document.body.classList.add('no-scroll');

  // set aria-expanded on opener
  if (opener) opener.setAttribute('aria-expanded', 'true');

  // announce via live region
  const panelStatus = document.getElementById('panel-status');
  if (panelStatus && heading) panelStatus.textContent = heading.textContent + ' panel opened';

  // focus management
  lastFocusedTile = opener || document.activeElement;
  panelClose.focus();

  // setup focus trap inside panel
  _trapListener = function(e) {
    if (e.key !== 'Tab') return;
    const focusable = panel.querySelectorAll('a, button, input, textarea, select, [tabindex]:not([tabindex="-1"])');
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };
  document.addEventListener('keydown', _trapListener);
}

function closePanel() {
  if (!panelOverlay || !panel) return;
  panel.classList.remove('open');
  panel.classList.remove('animate');
  panelOverlay.hidden = true;
  panelOverlay.setAttribute('aria-hidden', 'true');
  panelContent.innerHTML = '';

  // restore background scroll
  document.body.classList.remove('no-scroll');

  // remove trap listener
  if (_trapListener) {
    document.removeEventListener('keydown', _trapListener);
    _trapListener = null;
  }

  // clear aria-expanded on tiles
  tiles.forEach(t => t.removeAttribute('aria-expanded'));

  // announce closed
  const panelStatus = document.getElementById('panel-status');
  if (panelStatus) panelStatus.textContent = 'Panel closed';

  if (lastFocusedTile) lastFocusedTile.focus();
}

tiles.forEach(t => {
  t.addEventListener('click', () => openPanel(t.getAttribute('data-target'), t));
  t.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openPanel(t.getAttribute('data-target'), t);
    }
  });
});

if (panelClose) panelClose.addEventListener('click', closePanel);

// close on ESC
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closePanel();
});

// close when clicking outside panel
if (panelOverlay) {
  panelOverlay.addEventListener('click', (e) => {
    if (e.target === panelOverlay) closePanel();
  });
}

// Copy email to clipboard handler
const copyButton = document.querySelector('.copy-email');
const copyStatus = document.getElementById('copy-status');
if (copyButton) {
  copyButton.addEventListener('click', async () => {
    const email = copyButton.getAttribute('data-email');
    try {
      await navigator.clipboard.writeText(email);
      if (copyStatus) copyStatus.textContent = 'Email copied to clipboard.';
      // small visual feedback
      copyButton.textContent = '✅';
      setTimeout(() => { copyButton.textContent = '📋'; if (copyStatus) copyStatus.textContent = '' }, 1400);
    } catch (err) {
      if (copyStatus) copyStatus.textContent = 'Unable to copy email.';
    }
  });
}

// Contrast audit utility — computes contrast ratios and logs low-contrast elements
(function runContrastAudit() {
  function parseColor(css) {
    if (!css) return null;
    css = css.trim();
    const m = css.match(/rgba?\(([^)]+)\)/i);
    if (m) {
      const parts = m[1].split(',').map(p => parseFloat(p.trim()));
      return { r: parts[0], g: parts[1], b: parts[2], a: parts[3] === undefined ? 1 : parts[3] };
    }
    if (css[0] === '#') {
      let hex = css.slice(1);
      if (hex.length === 3) hex = hex.split('').map(h => h+h).join('');
      return { r: parseInt(hex.slice(0,2),16), g: parseInt(hex.slice(2,4),16), b: parseInt(hex.slice(4,6),16), a: 1 };
    }
    return null;
  }

  function srgbToLinear(u) {
    const s = u / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  }
  function luminance(rgb) {
    return 0.2126 * srgbToLinear(rgb.r) + 0.7152 * srgbToLinear(rgb.g) + 0.0722 * srgbToLinear(rgb.b);
  }
  function contrastRatio(rgb1, rgb2) {
    const L1 = luminance(rgb1);
    const L2 = luminance(rgb2);
    return (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
  }

  function getBackgroundColor(elem) {
    let el = elem;
    while (el && el !== document.documentElement) {
      const bg = getComputedStyle(el).backgroundColor;
      const parsed = parseColor(bg);
      if (parsed && parsed.a !== 0) return parsed;
      el = el.parentElement;
    }
    // fallback to white
    return { r: 255, g: 255, b: 255, a: 1 };
  }

  function run() {
    const failures = [];
    const elems = Array.from(document.querySelectorAll('body *'));
    elems.forEach(el => {
      const cs = getComputedStyle(el);
      if (!cs || cs.visibility === 'hidden' || cs.display === 'none') return;
      const text = (el.textContent || '').trim();
      if (!text) return;
      const fg = parseColor(cs.color) || { r: 0, g: 0, b: 0, a: 1 };
      const bg = getBackgroundColor(el);
      if (!fg || !bg) return;
      const ratio = contrastRatio(fg, bg);
      const fontSize = parseFloat(cs.fontSize) || 16;
      const weight = parseInt(cs.fontWeight) || 400;
      const isLarge = (fontSize >= 18.66) || (fontSize >= 14 && weight >= 700);
      const threshold = isLarge ? 3 : 4.5;
      if (ratio < threshold) {
        failures.push({ el, ratio: Math.round(ratio*100)/100, threshold });
        el.setAttribute('data-contrast-fail', Math.round(ratio*100)/100);
      }
    });

    if (failures.length) {
      console.group('Contrast Audit — Low-contrast elements found (' + failures.length + ')');
      failures.slice(0,30).forEach(f => {
        console.warn(`Ratio ${f.ratio} < ${f.threshold}:`, f.el, f.el.textContent.trim().slice(0,80));
      });
      console.log('Tip: add `body.show-contrast-debug` to the page to highlight issues visually.');
      console.groupEnd();
    } else {
      console.log('Contrast Audit — All checked text meets WCAG thresholds.');
    }
  }

  if ('requestIdleCallback' in window) requestIdleCallback(run, { timeout: 2000 }); else setTimeout(run, 600);
})();


