/* Progressive enhancement for every page. Content and charts are server-rendered; this adds motion and interaction. */
(() => {
  'use strict';
  const root = document.documentElement;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const t = value => (window.ORLicenseI18n ? window.ORLicenseI18n.t(value) : value);
  const $ = (sel, scope = document) => scope.querySelector(sel);
  const $$ = (sel, scope = document) => [...scope.querySelectorAll(sel)];
  const readJSON = id => {
    const node = document.getElementById(id);
    try { return node ? JSON.parse(node.textContent) : null; } catch (_) { return null; }
  };
  const store = {
    get(key) { try { return localStorage.getItem(key); } catch (_) { return null; } },
    set(key, value) { try { localStorage.setItem(key, value); } catch (_) {} }
  };

  /* ---------- Reveal on scroll ---------- */
  function initReveal() {
    const items = $$('.reveal');
    if (!items.length || reduced.matches || !('IntersectionObserver' in window)) return;
    const height = window.innerHeight;
    for (const el of items) {
      const box = el.getBoundingClientRect();
      if (box.top < height && box.bottom > 0) el.classList.add('is-in');
    }
    root.classList.add('reveal-on');
    const io = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      }
    }, {rootMargin: '0px 0px -6% 0px'});
    items.filter(el => !el.classList.contains('is-in')).forEach(el => io.observe(el));
  }

  /* ---------- Hero illustration ---------- */
  function initHero() {
    const art = $('[data-hero-art]');
    if (!art) return;
    const svg = $('svg', art);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => art.classList.toggle('is-offscreen', !entry.isIntersecting)).observe(art);
    }
    if (!finePointer.matches || reduced.matches) return;
    let frame = 0;
    art.addEventListener('pointermove', event => {
      const box = art.getBoundingClientRect();
      const x = (event.clientX - box.left) / box.width - 0.5;
      const y = (event.clientY - box.top) / box.height - 0.5;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        svg.style.setProperty('--px', (x * -14).toFixed(2));
        svg.style.setProperty('--py', (y * -10).toFixed(2));
      });
    });
    art.addEventListener('pointerleave', () => {
      svg.style.setProperty('--px', '0');
      svg.style.setProperty('--py', '0');
    });
  }

  /* ---------- Marquees ---------- */
  function initMarquees() {
    for (const button of $$('[data-marquee-toggle]')) {
      const scope = button.closest('section') || document.body;
      const label = $('span', button);
      button.addEventListener('click', () => {
        const paused = scope.classList.toggle('marquees-paused');
        button.setAttribute('aria-pressed', String(paused));
        label.textContent = paused ? 'Resume motion' : 'Pause motion';
      });
    }
  }

  /* ---------- Copy buttons ---------- */
  function initCopy() {
    for (const button of $$('[data-copy]')) {
      const label = $('[data-copy-label]', button);
      button.addEventListener('click', async () => {
        const target = $(button.dataset.copy);
        if (!target) return;
        const text = target.textContent.trim();
        let ok = false;
        try { await navigator.clipboard.writeText(text); ok = true; } catch (_) {
          const range = document.createRange();
          range.selectNodeContents(target);
          const selection = window.getSelection();
          selection.removeAllRanges();
          selection.addRange(range);
          try { ok = document.execCommand('copy'); } catch (__) {}
          selection.removeAllRanges();
        }
        if (!ok) return;
        button.classList.add('copied');
        if (label) label.textContent = 'Copied';
        setTimeout(() => {
          button.classList.remove('copied');
          if (label) label.textContent = 'Copy';
        }, 1800);
      });
    }
  }

  /* ---------- Shared chart tooltip ---------- */
  const tip = (() => {
    let node = null;
    let owner = null;
    function ensure() {
      if (node) return node;
      // Every chart mark carries the same values in its aria-label, so the tooltip stays visual only.
      node = document.createElement('div');
      node.className = 'chart-tip';
      node.setAttribute('aria-hidden', 'true');
      node.setAttribute('translate', 'no');
      document.body.appendChild(node);
      return node;
    }
    function render(content) {
      const el = ensure();
      el.textContent = '';
      if (content.title) {
        const b = document.createElement('b');
        b.textContent = content.title;
        el.appendChild(b);
      }
      if (content.label) {
        const p = document.createElement('div');
        if (content.color) {
          const sw = document.createElement('span');
          sw.className = 'sw';
          sw.style.setProperty('--c', content.color);
          p.appendChild(sw);
        }
        p.appendChild(document.createTextNode(t(content.label)));
        el.appendChild(p);
      }
      for (const [label, value, color] of content.rows || []) {
        const row = document.createElement('div');
        row.className = 'row';
        const a = document.createElement('span');
        if (color) {
          const sw = document.createElement('span');
          sw.className = 'sw';
          sw.style.setProperty('--c', color);
          a.appendChild(sw);
        }
        a.appendChild(document.createTextNode(t(label)));
        const b = document.createElement('span');
        b.textContent = t(value);
        row.append(a, b);
        el.appendChild(row);
      }
      if (content.note) {
        const n = document.createElement('div');
        n.className = 'muted';
        n.style.marginTop = '3px';
        n.textContent = t(content.note);
        el.appendChild(n);
      }
    }
    function place(x, y) {
      const el = ensure();
      const pad = 12;
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      let left = x + 14;
      let top = y + 16;
      if (left + w + pad > window.innerWidth) left = x - w - 14;
      if (top + h + pad > window.innerHeight) top = y - h - 14;
      el.style.left = `${Math.max(pad, left)}px`;
      el.style.top = `${Math.max(pad, top)}px`;
    }
    return {
      show(content, x, y, from) {
        owner = from || null;
        render(content);
        place(x, y);
        node.classList.add('show');
      },
      showAt(content, element) {
        const box = element.getBoundingClientRect();
        this.show(content, box.left + box.width / 2, box.top + box.height / 2, element);
      },
      move(x, y) { if (node) place(x, y); },
      hide(from) {
        if (!node || (from && owner && from !== owner)) return;
        node.classList.remove('show');
        owner = null;
      },
      owner: () => owner
    };
  })();

  // Tooltip content is declared in data-tip-* attributes: "Label=Value|Label=Value" rows.
  function tipFrom(el) {
    const color = getComputedStyle(el).getPropertyValue('--c').trim() || undefined;
    const rows = (el.dataset.tipRows || '').split('|').filter(Boolean).map(pair => {
      const i = pair.indexOf('=');
      return [pair.slice(0, i), pair.slice(i + 1)];
    });
    const content = {title: el.dataset.tipTitle, rows, note: el.dataset.tipNote};
    if (el.dataset.tipValue) rows.unshift([el.dataset.tipLabel || '', el.dataset.tipValue, color]);
    else if (el.dataset.tipLabel) Object.assign(content, {label: el.dataset.tipLabel, color});
    return content;
  }

  function bindTips(scope) {
    for (const el of $$('[data-tip-title]', scope)) {
      el.addEventListener('pointerenter', event => { if (event.pointerType !== 'touch') tip.show(tipFrom(el), event.clientX, event.clientY, el); });
      el.addEventListener('pointermove', event => { if (event.pointerType !== 'touch' && tip.owner() === el) tip.move(event.clientX, event.clientY); });
      el.addEventListener('pointerleave', event => { if (event.pointerType !== 'touch') tip.hide(el); });
      el.addEventListener('focus', () => tip.showAt(tipFrom(el), el));
      el.addEventListener('blur', () => tip.hide(el));
      el.addEventListener('click', event => {
        if (event.pointerType === 'mouse') return;
        if (tip.owner() === el) tip.hide(el); else tip.showAt(tipFrom(el), el);
      });
    }
  }
  document.addEventListener('pointerdown', event => {
    if (!event.target.closest('[data-tip-title], .chart')) tip.hide();
  });
  window.addEventListener('scroll', () => tip.hide(), {passive: true});
  document.addEventListener('or:languagechange', () => tip.hide());

  /* Arrow-key navigation inside a grid of focusable cells (one tab stop per chart). */
  function rovingGrid(container, rowSelector, cellSelector) {
    const rows = $$(rowSelector, container).map(row => $$(cellSelector, row)).filter(cells => cells.length);
    const all = rows.flat();
    if (!all.length) return;
    all.forEach((cell, i) => cell.setAttribute('tabindex', i === 0 ? '0' : '-1'));
    container.addEventListener('keydown', event => {
      const cell = event.target.closest(cellSelector);
      if (!cell) return;
      const r = rows.findIndex(cells => cells.includes(cell));
      const c = rows[r].indexOf(cell);
      let next = null;
      if (event.key === 'ArrowRight') next = rows[r][Math.min(c + 1, rows[r].length - 1)];
      else if (event.key === 'ArrowLeft') next = rows[r][Math.max(c - 1, 0)];
      else if (event.key === 'ArrowDown') { const row = rows[Math.min(r + 1, rows.length - 1)]; next = row[Math.min(c, row.length - 1)]; }
      else if (event.key === 'ArrowUp') { const row = rows[Math.max(r - 1, 0)]; next = row[Math.min(c, row.length - 1)]; }
      else if (event.key === 'Home') next = rows[r][0];
      else if (event.key === 'End') next = rows[r][rows[r].length - 1];
      else if (event.key === 'Escape') { tip.hide(); return; }
      if (!next) return;
      event.preventDefault();
      cell.setAttribute('tabindex', '-1');
      next.setAttribute('tabindex', '0');
      next.focus();
    });
  }

  /* FLIP: animate list items from their previous positions after a reorder. */
  function flip(list, reorder) {
    const items = [...list.children];
    const before = new Map(items.map(el => [el, el.getBoundingClientRect()]));
    reorder();
    if (reduced.matches || !items[0]?.animate) return;
    for (const el of items) {
      const a = before.get(el);
      const b = el.getBoundingClientRect();
      const dx = a.left - b.left;
      const dy = a.top - b.top;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue;
      el.animate([{transform: `translate(${dx}px, ${dy}px)`}, {transform: 'translate(0, 0)'}],
        {duration: 650, easing: 'cubic-bezier(.2,.8,.2,1)'});
    }
  }

  /* ---------- Leaderboard chart ---------- */
  function initLeaderboards() {
    const data = readJSON('lb-data');
    if (!data) return;
    const byKey = new Map(data.models.map(m => [m.key, m]));
    const titles = {
      daq: 'Overall score (DAQ)',
      feas: 'Feasibility (plans that pass every check)',
      alpha: 'Stricter score (DAQα)'
    };
    for (const card of $$('[data-lb]')) {
      const lb = $('.lb', card);
      const list = $('.lb-bars', card);
      const title = $('[data-lb-title]', card);
      const refLabel = $('.lb-ref-label', card);
      const errors = $('[data-errors]', card);
      const alphaBox = $('[data-alpha-control]', card);
      const alphaInput = $('[data-alpha]', card);
      const alphaOut = $('[data-alpha-out]', card);
      const prefKey = 'or-license-lb-layout';
      const state = {
        metric: 'daq',
        layout: store.get(prefKey) || (window.matchMedia('(max-width: 720px)').matches ? 'rows' : 'columns'),
        alpha: alphaInput ? Number(alphaInput.value) : 0
      };
      const value = m => state.metric === 'daq' ? [m.daq, m.daqSd]
        : state.metric === 'feas' ? [m.feas, m.feasSd]
          : [m.alpha[state.alpha] * 100, 0];
      const label = m => state.metric === 'alpha' ? m.alpha[state.alpha].toFixed(3) : `${value(m)[0].toFixed(2)}%`;
      function render(animate) {
        const items = $$('.lb-item', list);
        for (const item of items) {
          const m = byKey.get(item.dataset.key);
          const [v, e] = value(m);
          item.style.setProperty('--v', v.toFixed(3));
          item.style.setProperty('--e', e.toFixed(3));
          $('.lb-value', item).textContent = label(m);
        }
        const sorted = items.slice().sort((a, b) => value(byKey.get(b.dataset.key))[0] - value(byKey.get(a.dataset.key))[0]);
        const reorder = () => sorted.forEach(item => list.appendChild(item));
        if (animate) flip(list, reorder); else reorder();
        title.textContent = titles[state.metric];
        refLabel.textContent = state.metric === 'alpha' ? 'Experts = 1' : 'Experts · 100%';
        if (alphaBox) alphaBox.hidden = state.metric !== 'alpha';
        if (alphaOut) alphaOut.textContent = `α = ${data.alphas[state.alpha].toFixed(1)}`;
        if (errors) {
          errors.disabled = state.metric === 'alpha';
          lb.classList.toggle('show-err', errors.checked && state.metric !== 'alpha');
        }
      }
      function setLayout(layout) {
        state.layout = layout;
        lb.dataset.layout = layout;
        for (const b of $$('button[data-layout]', card)) b.setAttribute('aria-pressed', String(b.dataset.layout === layout));
      }
      for (const b of $$('button[data-metric]', card)) {
        b.addEventListener('click', () => {
          state.metric = b.dataset.metric;
          for (const other of $$('button[data-metric]', card)) other.setAttribute('aria-pressed', String(other === b));
          render(true);
        });
      }
      for (const b of $$('button[data-layout]', card)) {
        b.addEventListener('click', () => {
          setLayout(b.dataset.layout);
          store.set(prefKey, b.dataset.layout);
        });
      }
      errors?.addEventListener('change', () => render(false));
      let pending = 0;
      alphaInput?.addEventListener('input', () => {
        state.alpha = Number(alphaInput.value);
        cancelAnimationFrame(pending);
        pending = requestAnimationFrame(() => render(true));
      });
      setLayout(state.layout);
      render(false);
    }
  }

  /* ---------- Sortable results table ---------- */
  function initSortableTables() {
    for (const table of $$('table[data-sortable]')) {
      const body = table.tBodies[0];
      for (const button of $$('[data-sort]', table)) {
        button.addEventListener('click', () => {
          const key = button.dataset.sort;
          const th = button.closest('th');
          const desc = th.getAttribute('aria-sort') !== 'descending';
          for (const other of $$('th[aria-sort]', table)) other.setAttribute('aria-sort', 'none');
          th.setAttribute('aria-sort', desc ? 'descending' : 'ascending');
          const rows = [...body.rows].sort((a, b) => (Number(b.dataset[key]) - Number(a.dataset[key])) * (desc ? 1 : -1));
          flip(body, () => rows.forEach((row, i) => {
            row.cells[0].textContent = String(i + 1);
            body.appendChild(row);
          }));
        });
      }
    }
  }

  /* ---------- Task library ---------- */
  function initTasks() {
    const scope = $('[data-tasks]');
    if (!scope) return;
    const data = readJSON('tasks-data');
    const cards = $$('.task-card', scope);
    const list = $('#task-list');
    const count = $('#task-count');
    const empty = $('#task-empty');
    const search = $('#task-search');
    const clearButtons = $$('[data-clear]');
    const state = {industry: '', type: '', class: '', caps: new Set(), q: ''};
    const index = new Map();
    function buildIndex() {
      for (const card of cards) index.set(card, `${card.dataset.search} ${card.textContent.toLowerCase().replace(/\s+/g, ' ')}`);
    }
    // Values a hand-edited or stale link names that no filter button offers are dropped.
    const offered = filter => new Set($$(`[data-filter="${filter}"]`, scope).map(b => b.dataset.value));
    function readURL() {
      const params = new URLSearchParams(location.search);
      const pick = filter => (offered(filter).has(params.get(filter)) ? params.get(filter) : '');
      state.industry = pick('industry');
      state.type = pick('type');
      state.class = pick('class');
      const caps = offered('cap');
      state.caps = new Set((params.get('k') || '').split(',').filter(tag => caps.has(tag)));
      state.q = params.get('q') || '';
      search.value = state.q;
    }
    function writeURL() {
      const params = new URLSearchParams();
      if (state.industry) params.set('industry', state.industry);
      if (state.type) params.set('type', state.type);
      if (state.class) params.set('class', state.class);
      if (state.caps.size) params.set('k', [...state.caps].sort().join(','));
      if (state.q) params.set('q', state.q);
      const query = params.toString();
      history.replaceState(null, '', `${location.pathname}${query ? `?${query}` : ''}${location.hash}`);
    }
    function apply() {
      const terms = state.q.toLowerCase().split(/\s+/).filter(Boolean);
      let shown = 0;
      for (const card of cards) {
        const tags = card.dataset.tags.split(' ');
        const text = index.get(card) || '';
        const ok = (!state.industry || card.dataset.industry === state.industry)
          && (!state.type || card.dataset.type === state.type)
          && (!state.class || card.dataset.class === state.class)
          && [...state.caps].every(tag => tags.includes(tag))
          && terms.every(term => text.includes(term));
        card.hidden = !ok;
        if (ok) shown += 1;
      }
      count.textContent = `${shown} of ${cards.length} tasks`;
      empty.hidden = shown > 0;
      const active = state.industry || state.type || state.class || state.caps.size || state.q;
      clearButtons.forEach(b => { if (!b.closest('#task-empty')) b.hidden = !active; });
      for (const b of $$('[data-filter]', scope)) {
        const f = b.dataset.filter;
        const pressed = f === 'cap' ? state.caps.has(b.dataset.value) : state[f] === b.dataset.value;
        b.setAttribute('aria-pressed', String(pressed));
      }
    }
    for (const b of $$('[data-filter]', scope)) {
      b.addEventListener('click', () => {
        const f = b.dataset.filter;
        if (f === 'cap') {
          if (state.caps.has(b.dataset.value)) state.caps.delete(b.dataset.value); else state.caps.add(b.dataset.value);
        } else {
          state[f] = state[f] === b.dataset.value ? '' : b.dataset.value;
        }
        apply();
        writeURL();
      });
    }
    search.addEventListener('input', () => {
      state.q = search.value.trim();
      apply();
      writeURL();
    });
    for (const b of clearButtons) {
      b.addEventListener('click', () => {
        Object.assign(state, {industry: '', type: '', class: '', caps: new Set(), q: ''});
        search.value = '';
        apply();
        writeURL();
        search.focus();
      });
    }
    document.addEventListener('keydown', event => {
      if (event.key !== '/' || event.target.closest('input, textarea, select, [contenteditable]') || $('#task-dialog')?.open) return;
      event.preventDefault();
      search.focus();
    });

    const viewKey = 'or-license-task-view';
    function setView(view) {
      scope.classList.toggle('tasks-view-cards', view === 'cards');
      for (const b of $$('[data-view]', scope)) b.setAttribute('aria-pressed', String(b.dataset.view === view));
    }
    for (const b of $$('[data-view]', scope)) {
      b.addEventListener('click', () => { setView(b.dataset.view); store.set(viewKey, b.dataset.view); });
    }
    setView(store.get(viewKey) === 'cards' ? 'cards' : 'list');

    const dialog = $('#task-dialog');
    if (dialog && data && typeof dialog.showModal === 'function') {
      const byId = new Map(data.tasks.map(task => [String(task.id), task]));
      let current = null;
      let opener = null;
      const field = name => $(`[data-dlg="${name}"]`, dialog);
      function fill(task) {
        current = task;
        field('num').textContent = `TASK ${task.num}`;
        for (const key of ['title', 'summary', 'industry', 'problem_class', 'type_label', 'direction', 'objective', 'desc']) field(key).textContent = task[key];
        field('solvers').textContent = task.solvers;
        $$('[data-dlg-solver-row]', dialog).forEach(el => { el.hidden = !task.solvers; });
        const caps = $('[data-dlg-caps]', dialog);
        caps.textContent = '';
        for (const tag of task.tags) {
          const chip = document.createElement('span');
          chip.className = 'chip';
          chip.style.margin = '0 6px 6px 0';
          chip.textContent = data.caps[tag];
          chip.title = data.capNotes[tag];
          caps.appendChild(chip);
        }
        const checked = $('[data-dlg-checked]', dialog);
        checked.textContent = '';
        for (const item of task.checked) {
          const li = document.createElement('li');
          li.textContent = item;
          checked.appendChild(li);
        }
        const img = $('[data-dlg-img]', dialog);
        img.dataset.srcZh = task.img_zh;
        img.alt = task.alt;
        img.src = task.img;
        $('[data-dlg-zoom]', dialog).href = task.img;
        $('[data-dlg-repo]', dialog).href = task.url;
        const visible = cards.filter(card => !card.hidden);
        const i = visible.findIndex(card => card.dataset.id === String(task.id));
        $$('[data-dlg-step]', dialog).forEach(b => {
          const step = Number(b.dataset.dlgStep);
          b.disabled = i < 0 || !visible[i + step];
        });
        history.replaceState(null, '', `${location.pathname}${location.search}#task-${task.id}`);
      }
      function open(id, from) {
        const task = byId.get(String(id));
        if (!task) return;
        opener = from || null;
        fill(task);
        if (!dialog.open) dialog.showModal();
        $('.dlg-body', dialog).scrollTop = 0;
      }
      scope.addEventListener('click', event => {
        const trigger = event.target.closest('[data-open]');
        if (!trigger || event.metaKey || event.ctrlKey || event.shiftKey) return;
        event.preventDefault();
        open(trigger.dataset.open, trigger);
      });
      $('[data-dlg-close]', dialog).addEventListener('click', () => dialog.close());
      dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
      dialog.addEventListener('close', () => {
        history.replaceState(null, '', `${location.pathname}${location.search}`);
        const card = current && document.getElementById(`task-${current.id}`);
        const focusTarget = opener && document.contains(opener) ? opener : card && $('.task-title a', card);
        focusTarget?.focus({preventScroll: false});
      });
      for (const b of $$('[data-dlg-step]', dialog)) {
        b.addEventListener('click', () => {
          const visible = cards.filter(card => !card.hidden);
          const i = visible.findIndex(card => card.dataset.id === String(current.id));
          const next = visible[i + Number(b.dataset.dlgStep)];
          if (next) { opener = $('.task-title a', next); fill(byId.get(next.dataset.id)); $('.dlg-body', dialog).scrollTop = 0; }
        });
      }
      dialog.addEventListener('keydown', event => {
        if (event.target.closest('input, textarea')) return;
        if (event.key === 'ArrowRight') $('[data-dlg-step="1"]', dialog).click();
        if (event.key === 'ArrowLeft') $('[data-dlg-step="-1"]', dialog).click();
      });
      const match = location.hash.match(/^#task-(\d+)$/);
      if (match && byId.has(match[1])) {
        const card = document.getElementById(`task-${match[1]}`);
        card?.scrollIntoView({block: 'center'});
        open(match[1], card && $('.task-title a', card));
      }
    }

    readURL();
    buildIndex();
    apply();
    document.addEventListener('or:languagechange', () => { buildIndex(); apply(); });
  }

  /* ---------- ORSim demo player ---------- */
  function initDemo() {
    const player = $('#demo-player');
    if (!player) return;
    const turns = $$('.demo-turn', player);
    const controls = $('#demo-controls');
    const stepper = $('#demo-stepper');
    const counter = $('#demo-counter');
    const prev = $('#demo-prev');
    const next = $('#demo-next');
    const toggle = $('#demo-toggle');
    const steps = $$('button[data-turn]', stepper);
    let index = 0;
    let all = false;
    player.classList.add('enhanced');
    controls.hidden = false;
    stepper.hidden = false;
    function render(focus) {
      turns.forEach((turn, i) => { turn.hidden = !all && i !== index; });
      player.classList.toggle('show-all', all);
      steps.forEach((b, i) => {
        if (!all && i === index) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
        b.classList.toggle('is-past', !all && i < index);
      });
      counter.textContent = all ? `All ${turns.length} turns · Example dialogue` : `Turn ${index + 1} of ${turns.length} · ${turns[index].dataset.phase}`;
      prev.disabled = all || index === 0;
      next.disabled = all || index === turns.length - 1;
      toggle.setAttribute('aria-pressed', String(all));
      toggle.textContent = all ? 'Step through' : 'Show all turns';
      if (focus) $('h3', turns[index]).focus?.();
    }
    turns.forEach(turn => $('h3', turn).setAttribute('tabindex', '-1'));
    prev.addEventListener('click', () => { if (index > 0) { index -= 1; render(); } });
    next.addEventListener('click', () => { if (index < turns.length - 1) { index += 1; render(); } });
    toggle.addEventListener('click', () => { all = !all; render(); });
    steps.forEach((b, i) => b.addEventListener('click', () => { all = false; index = i; render(); }));
    player.addEventListener('keydown', event => {
      if (all || event.target.closest('input, textarea')) return;
      if (event.key === 'ArrowRight' && index < turns.length - 1) { index += 1; render(); event.preventDefault(); }
      if (event.key === 'ArrowLeft' && index > 0) { index -= 1; render(); event.preventDefault(); }
    });
    const match = location.hash.match(/^#demo-turn-(\d+)$/);
    if (match) index = Math.min(Math.max(Number(match[1]) - 1, 0), turns.length - 1);
    render();
  }

  /* ---------- Tabs (ORSim workflow) ---------- */
  function initTabs() {
    for (const box of $$('[data-workflow]')) {
      const tabs = $$('[role="tab"]', box);
      const panels = tabs.map(tab => document.getElementById(tab.getAttribute('aria-controls')));
      function select(i, focus) {
        tabs.forEach((tab, j) => {
          tab.setAttribute('aria-selected', String(i === j));
          tab.setAttribute('tabindex', i === j ? '0' : '-1');
          panels[j].hidden = i !== j;
        });
        if (focus) tabs[i].focus();
      }
      tabs.forEach((tab, i) => {
        tab.addEventListener('click', () => select(i));
        tab.addEventListener('keydown', event => {
          const keys = {ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1};
          if (event.key in keys) { event.preventDefault(); select((i + keys[event.key] + tabs.length) % tabs.length, true); }
          if (event.key === 'Home') { event.preventDefault(); select(0, true); }
          if (event.key === 'End') { event.preventDefault(); select(tabs.length - 1, true); }
        });
      });
      select(0);
    }
  }

  /* ---------- Analysis page ---------- */
  function initToc() {
    const links = $$('.toc a');
    if (!links.length || !('IntersectionObserver' in window)) return;
    const sections = links.map(a => document.getElementById(a.hash.slice(1))).filter(Boolean);
    const visible = new Set();
    const io = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) visible.add(entry.target); else visible.delete(entry.target);
      }
      const current = sections.find(s => visible.has(s)) || null;
      if (!current) return;
      for (const a of links) {
        const on = a.hash === `#${current.id}`;
        if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
        if (on && window.matchMedia('(max-width: 1020px)').matches) {
          const bar = a.closest('ol');
          bar.scrollTo({left: a.offsetLeft - 24, behavior: reduced.matches ? 'auto' : 'smooth'});
        }
      }
    }, {rootMargin: '-35% 0px -55% 0px'});
    sections.forEach(s => io.observe(s));
  }

  function initLegendFocus() {
    for (const figure of $$('.figure-card')) {
      const legend = $('.legend', figure);
      const chart = $('.stack-chart', figure);
      if (!legend || !chart) continue;
      const buttons = $$('button[data-cat]', legend);
      let active = null;
      buttons.forEach(b => b.addEventListener('click', () => {
        active = active === b.dataset.cat ? null : b.dataset.cat;
        buttons.forEach(o => o.setAttribute('aria-pressed', String(o.dataset.cat === active)));
        chart.classList.toggle('cat-focus', active !== null);
        $$('.seg', chart).forEach(seg => seg.classList.toggle('is-cat', seg.dataset.cat === active));
      }));
    }
  }

  function initLineChart() {
    const box = $('[data-line-chart]');
    const data = readJSON('line-data');
    if (!box || !data) return;
    const figure = box.closest('.figure-card');
    const svg = $('svg', box);
    const hit = $('.hit', svg);
    const layer = $('.hover-layer', svg);
    const cross = $('.crosshair', layer);
    const ns = 'http://www.w3.org/2000/svg';
    const {ml, pw, mt, ph, y0, y1} = data.geo;
    const xs = data.alphas.map((a, i) => ml + (i / (data.alphas.length - 1)) * pw);
    const y = v => mt + ((y1 - v) / (y1 - y0)) * ph;
    const dots = new Map();
    for (const s of data.series) {
      const c = document.createElementNS(ns, 'circle');
      c.setAttribute('r', '4');
      c.setAttribute('class', 'hover-dot');
      c.style.fill = `var(--m-${s.key})`;
      layer.appendChild(c);
      dots.set(s.key, c);
    }
    let focusKey = null;
    function highlight(key) {
      box.classList.toggle('has-focus', !!key);
      $$('.series', svg).forEach(g => g.classList.toggle('is-focus', g.dataset.series === key));
    }
    function setFocus(key) {
      focusKey = key;
      highlight(key);
      $$('.legend button[data-series]', figure).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.series === key)));
    }
    $$('.legend button[data-series]', figure).forEach(b => {
      b.addEventListener('click', () => setFocus(focusKey === b.dataset.series ? null : b.dataset.series));
      b.addEventListener('pointerenter', () => { if (!focusKey) highlight(b.dataset.series); });
      b.addEventListener('pointerleave', () => highlight(focusKey));
    });
    function showAt(i, clientX, clientY) {
      layer.removeAttribute('hidden');
      cross.setAttribute('x1', xs[i]);
      cross.setAttribute('x2', xs[i]);
      for (const s of data.series) {
        const c = dots.get(s.key);
        c.setAttribute('cx', xs[i]);
        c.setAttribute('cy', y(s.values[i]));
        c.style.opacity = focusKey && focusKey !== s.key ? '.15' : '1';
      }
      const rows = data.series.slice().sort((a, b) => b.values[i] - a.values[i])
        .map(s => [s.name, s.values[i].toFixed(3), getComputedStyle(root).getPropertyValue(`--m-${s.key}`).trim()]);
      tip.show({title: `α = ${data.alphas[i].toFixed(1)}`, rows}, clientX, clientY, hit);
    }
    function indexFor(clientX) {
      const box2 = svg.getBoundingClientRect();
      const scale = data.geo.W / box2.width;
      const x = (clientX - box2.left) * scale;
      return Math.max(0, Math.min(xs.length - 1, Math.round(((x - ml) / pw) * (xs.length - 1))));
    }
    hit.addEventListener('pointermove', event => showAt(indexFor(event.clientX), event.clientX, event.clientY));
    hit.addEventListener('pointerdown', event => showAt(indexFor(event.clientX), event.clientX, event.clientY));
    hit.addEventListener('pointerleave', () => { layer.setAttribute('hidden', ''); tip.hide(hit); });
    svg.setAttribute('tabindex', '0');
    let keyIndex = 10;
    svg.addEventListener('keydown', event => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      keyIndex = Math.max(0, Math.min(xs.length - 1, keyIndex + (event.key === 'ArrowRight' ? 1 : -1)));
      const b = svg.getBoundingClientRect();
      const scale = b.width / data.geo.W;
      showAt(keyIndex, b.left + xs[keyIndex] * scale, b.top + mt * scale + 20);
    });
    svg.addEventListener('blur', () => { layer.setAttribute('hidden', ''); tip.hide(hit); });
  }

  function initAnalysis() {
    for (const chart of $$('.stack-chart')) rovingGrid(chart, '.stack-row', '.seg');
    for (const chart of $$('[data-bubbles]')) {
      const cells = $$('.bubble-cell', chart);
      const perRow = $$('.col-head', chart).length;
      cells.forEach((cell, i) => cell.setAttribute('tabindex', i === 0 ? '0' : '-1'));
      chart.addEventListener('keydown', event => {
        const cell = event.target.closest('.bubble-cell');
        if (!cell) return;
        const i = cells.indexOf(cell);
        const moves = {ArrowRight: 1, ArrowLeft: -1, ArrowDown: perRow, ArrowUp: -perRow};
        if (!(event.key in moves)) { if (event.key === 'Escape') tip.hide(); return; }
        const j = i + moves[event.key];
        if (j < 0 || j >= cells.length) return;
        event.preventDefault();
        cell.setAttribute('tabindex', '-1');
        cells[j].setAttribute('tabindex', '0');
        cells[j].focus();
      });
    }
    bindTips(document);
    initLegendFocus();
    initLineChart();
    initToc();
  }

  function init() {
    initReveal();
    initHero();
    initMarquees();
    initCopy();
    initLeaderboards();
    initSortableTables();
    initTasks();
    initDemo();
    initTabs();
    initAnalysis();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
