/* Translate presentation text while leaving result data and chart geometry intact. */
(() => {
  'use strict';
  const dictionary = window.OR_LICENSE_ZH || {};
  const key = 'or-license-language';
  const root = document.documentElement;
  const normalize = value => value.replace(/\s+/g, ' ').trim();
  const textOriginals = new WeakMap();
  const attributeOriginals = new WeakMap();
  const imageOriginals = new WeakMap();
  // Keep data-* values in their original language so dynamic chart readouts
  // always enter the translation layer as English, even after repeated toggles.
  const attrs = ['title', 'aria-label', 'placeholder', 'alt'];
  let language = 'en';
  try { if (localStorage.getItem(key) === 'zh-CN') language = 'zh-CN'; } catch (_) {}

  // Lower-case pieces of the chart aria-labels, which join several values with ';'.
  const phrases = {
    'expert rating': '专家评分',
    'share of questions': '提问占比',
    'fixed a real problem': '解决了实际问题',
    ' of all mistakes': '（占全部错误）',
    'plans that break a rule': '不可行率'
  };
  const fragments = Object.entries({...dictionary, ...phrases})
    .filter(([en, zh]) => en !== zh && en.length > 3)
    .sort((a, b) => b[0].length - a[0].length);
  // Counters and labels that scripts and templates fill with numbers.
  const patterns = [
    [/^(\d+) of (\d+) tasks$/, m => `显示 ${m[1]} / ${m[2]} 个任务`],
    [/^(\d+) tasks?$/, m => `${m[1]} 个任务`],
    [/^([\d.]+%) \(printed\)$/, m => `${m[1]}（原图标注）`],
    [/^Turn (\d+) of (\d+) · (.+)$/, m => `第 ${m[1]} / ${m[2]} 轮 · ${translate(m[3])}`],
    [/^(.+) · Turn (\d+) of (\d+)$/, m => `${translate(m[1])} · 第 ${m[2]} / ${m[3]} 轮`],
    [/^All (\d+) turns · Example dialogue$/, m => `全部 ${m[1]} 轮 · 示例对话`],
    [/^(?:TASK|CASE) (\d+)$/, m => `任务 ${m[1]}`]
  ];
  function translate(value) {
    const normalized = normalize(value);
    const keepSpacing = text => value.replace(/\S[\s\S]*\S|\S/, () => text);
    if (Object.prototype.hasOwnProperty.call(dictionary, normalized)) return keepSpacing(dictionary[normalized]);
    for (const [pattern, format] of patterns) {
      const match = normalized.match(pattern);
      if (match) return keepSpacing(format(match));
    }
    // Only use fragments for composite chart labels, never for prose or model names.
    if (normalized.includes(';')) {
      let result = value;
      for (const [en, zh] of fragments) result = result.split(en).join(zh);
      return result;
    }
    return value;
  }
  function translatedState(current, previous) {
    // Dynamic UI can replace an existing text node or attribute with a fresh English value.
    if (!previous || (current !== previous.en && current !== previous.zh)) {
      return {en: current, zh: translate(current)};
    }
    return previous;
  }
  function ignored(element) {
    return element.closest('script, style, code, pre, .header-controls, [translate="no"]');
  }
  function renderText() {
    const walker = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (!node.parentElement || ignored(node.parentElement) || !node.textContent.trim()) continue;
      const state = translatedState(node.textContent, textOriginals.get(node));
      textOriginals.set(node, state);
      const desired = language === 'zh-CN' ? state.zh : state.en;
      if (node.textContent !== desired) node.textContent = desired;
    }
    document.querySelectorAll(attrs.map(attr => `[${attr}]`).join(',')).forEach(element => {
      if (ignored(element)) return;
      let originals = attributeOriginals.get(element);
      if (!originals) { originals = {}; attributeOriginals.set(element, originals); }
      for (const attr of attrs) {
        if (!element.hasAttribute(attr)) continue;
        const state = translatedState(element.getAttribute(attr), originals[attr]);
        originals[attr] = state;
        const desired = language === 'zh-CN' ? state.zh : state.en;
        if (element.getAttribute(attr) !== desired) element.setAttribute(attr, desired);
      }
    });
  }
  // Schematics have a separately authored Chinese file; a linked full-size view follows the image.
  function renderImages() {
    document.querySelectorAll('img[data-src-zh]').forEach(img => {
      const anchor = img.closest('a[data-zoom]');
      let original = imageOriginals.get(img);
      if (!original || (img.getAttribute('src') !== original.src && img.getAttribute('src') !== img.dataset.srcZh)) {
        original = {src: img.getAttribute('src'), href: anchor?.getAttribute('href')};
        imageOriginals.set(img, original);
      }
      const src = language === 'zh-CN' ? img.dataset.srcZh : original.src;
      if (img.getAttribute('src') !== src) img.setAttribute('src', src);
      if (anchor) {
        const href = language === 'zh-CN' ? img.dataset.srcZh : original.href;
        if (anchor.getAttribute('href') !== href) anchor.setAttribute('href', href);
      }
    });
  }
  const observer = new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; render(); });
  });
  let queued = false;
  function observe() {
    observer.observe(document.documentElement, {
      childList: true, subtree: true, characterData: true,
      attributes: true, attributeFilter: [...attrs, 'src']
    });
  }
  function render() {
    observer.disconnect();
    renderText();
    renderImages();
    observe();
  }
  function apply() {
    root.lang = language;
    const button = document.querySelector('.language-toggle');
    if (button) {
      button.textContent = language === 'zh-CN' ? 'EN' : '中文';
      button.setAttribute('aria-label', language === 'zh-CN' ? 'Switch to English' : '切换到中文版');
      button.setAttribute('title', language === 'zh-CN' ? 'Switch to English' : '切换到中文版');
      button.setAttribute('lang', language === 'zh-CN' ? 'en' : 'zh-CN');
    }
    render();
    document.dispatchEvent(new Event('or:languagechange'));
  }
  document.querySelector('.language-toggle')?.addEventListener('click', () => {
    language = language === 'zh-CN' ? 'en' : 'zh-CN';
    try { localStorage.setItem(key, language); } catch (_) {}
    apply();
  });
  window.addEventListener('storage', event => {
    if (event.key !== key && event.key !== null) return;
    language = event.newValue === 'zh-CN' ? 'zh-CN' : 'en';
    apply();
  });
  // For text generated inside translate="no" widgets, which the walker never revisits.
  window.ORLicenseI18n = {
    language: () => language,
    t: value => (language === 'zh-CN' ? translate(value) : value)
  };
  apply();
})();
