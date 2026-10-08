/* Apply the theme before the page paints; storage is optional. */
(() => {
  'use strict';
  const key = 'or-license-theme';
  const root = document.documentElement;
  const system = window.matchMedia('(prefers-color-scheme: dark)');
  let preference = null;
  try { preference = localStorage.getItem(key); } catch (_) {}
  if (!['light', 'dark'].includes(preference)) preference = null;
  function updateButton() {
    const button = document.querySelector('.theme-toggle');
    if (!button) return;
    const dark = root.dataset.theme === 'dark';
    const chinese = root.lang === 'zh-CN';
    const label = chinese
      ? (dark ? '切换浅色模式' : '切换深色模式')
      : (dark ? 'Switch to light mode' : 'Switch to dark mode');
    button.setAttribute('aria-label', label);
    button.setAttribute('title', label);
    button.setAttribute('aria-pressed', String(dark));
    button.querySelector('.theme-label').textContent = chinese
      ? (dark ? '浅色' : '深色') : (dark ? 'Light' : 'Dark');
  }
  function apply() {
    const theme = preference || (system.matches ? 'dark' : 'light');
    root.dataset.theme = theme;
    root.style.colorScheme = theme;
    updateButton();
  }
  apply();
  system.addEventListener('change', () => { if (!preference) apply(); });
  window.addEventListener('storage', event => {
    if (event.key !== key && event.key !== null) return;
    preference = ['light', 'dark'].includes(event.newValue) ? event.newValue : null;
    apply();
  });
  document.addEventListener('DOMContentLoaded', () => {
    updateButton();
    document.querySelector('.theme-toggle')?.addEventListener('click', () => {
      preference = root.dataset.theme === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem(key, preference); } catch (_) {}
      apply();
    });
  });
  document.addEventListener('or:languagechange', updateButton);
})();
