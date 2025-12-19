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


