/* K.R.&G.M. Cleaning — site script (calculator + forms). Prices match the former Shopify calculator. */
(() => {
  'use strict';

  // ---- Pricing (USD). Edit these values to change the calculator. ----
  const PRICING = {
    currency: 'USD',
    bedrooms: { min: 1, max: 6, default: 2 },
    bathrooms: { min: 1, max: 6, default: 1 },
    sizeMax: 100000,
    services: [
      { id: 'standard', title: 'Standard cleaning', base: 50, bedroom: 20, bathroom: 20 },
      { id: 'move', title: 'Move-in / move-out', base: 50, bedroom: 25, bathroom: 25 },
      { id: 'deep', title: 'Deep cleaning', base: 100, bedroom: 30, bathroom: 30 },
    ],
    // Size fee: first tier whose upTo >= size; upTo: null = anything larger
    sizeTiers: [
      { upTo: 1000, price: 5 },
      { upTo: 1400, price: 10 },
      { upTo: 2000, price: 20 },
      { upTo: null, price: 35 },
    ],
    extras: [
      { id: 'oven', group: 'extras', title: 'Inside oven', price: 30 },
      { id: 'fridge', group: 'extras', title: 'Inside refrigerator', price: 30 },
      { id: 'dishwasher', group: 'extras', title: 'Dishwasher deep clean', price: 20 },
      { id: 'pet', group: 'extras', title: 'Pet hair removal', price: 30 },
      { id: 'windows', group: 'extras', title: 'Window cleaning', price: 5, quantity: { label: 'Number of windows', unit: 'per window', default: 1, max: 1000 } },
      { id: 'heavy', group: 'conditions', title: 'Heavy dirt', price: 50 },
      { id: 'clutter', group: 'conditions', title: 'Extreme clutter', price: 75 },
      { id: 'sameday', group: 'conditions', title: 'Same-day service', price: 40 },
      { id: 'weekend', group: 'conditions', title: 'Weekend service', price: 30 },
      { id: 'recurring', group: 'conditions', title: 'Recurring customer', price: -20 },
    ],
  };

  const $ = (s, r = document) => r.querySelector(s);
  const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: PRICING.currency, minimumFractionDigits: 0, maximumFractionDigits: 2 });
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // ---- Mobile menu ----
  const toggle = $('.menu-toggle'), nav = $('#nav');
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    });
    nav.addEventListener('click', (e) => { if (e.target.closest('a')) { nav.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); } });
  }
  const year = $('#year'); if (year) year.textContent = new Date().getFullYear();

  // ---- Calculator ----
  const calc = $('#calc');
  let lastEstimate = null, lastSummary = '';
  if (calc) {
    const radios = (group, values, def) => values.map((v) => `<label class="choice"><input type="radio" name="${group}" value="${esc(v.value)}"${v.value === def ? ' checked' : ''}><span>${esc(v.label)}</span></label>`).join('');
    const range = (r) => Array.from({ length: r.max - r.min + 1 }, (_, i) => ({ value: String(r.min + i), label: String(r.min + i) }));
    $('[data-group=service]', calc).innerHTML = radios('service', PRICING.services.map((s) => ({ value: s.id, label: s.title })), PRICING.services[0].id);
    $('[data-group=bedrooms]', calc).innerHTML = radios('bedrooms', range(PRICING.bedrooms), String(PRICING.bedrooms.default));
    $('[data-group=bathrooms]', calc).innerHTML = radios('bathrooms', range(PRICING.bathrooms), String(PRICING.bathrooms.default));
    for (const group of ['extras', 'conditions']) {
      $(`[data-group=${group}]`, calc).innerHTML = PRICING.extras.filter((x) => x.group === group).map((x) => {
        const price = (x.price >= 0 ? '+' : '−') + fmt.format(Math.abs(x.price)) + (x.quantity ? ' ' + x.quantity.unit : '');
        const qty = x.quantity ? `<label class="qty" hidden><span>${esc(x.quantity.label)}</span><input type="number" data-qty="${x.id}" min="1" max="${x.quantity.max}" step="1" value="${x.quantity.default}" inputmode="numeric" disabled></label>` : '';
        return `<div class="extra-wrap"><label class="extra"><input type="checkbox" data-extra="${x.id}"><span>${esc(x.title)}</span><b>${price}</b></label>${qty}</div>`;
      }).join('');
    }

    const totalEl = $('#calc-total'), errEl = $('#calc-error'), cta = $('#calc-cta');
    const update = () => {
      const service = PRICING.services.find((s) => s.id === calc.service.value);
      const bedrooms = Number(calc.bedrooms.value), bathrooms = Number(calc.bathrooms.value);
      const size = Number($('#calc-size').value);
      let valid = Boolean(service) && Number.isInteger(size) && size >= 1 && size <= PRICING.sizeMax;
      let extrasTotal = 0; const picked = [];
      for (const x of PRICING.extras) {
        const box = $(`[data-extra=${x.id}]`, calc), q = $(`[data-qty=${x.id}]`, calc);
        let n = 1;
        if (q) {
          q.disabled = !box.checked; q.closest('label').hidden = !box.checked;
          n = Number(q.value);
          if (box.checked) valid = valid && Number.isInteger(n) && n >= 1 && n <= x.quantity.max;
        }
        if (box.checked) { extrasTotal += x.price * n; picked.push(x.title + (q ? ' × ' + n : '')); }
      }
      const tier = PRICING.sizeTiers.find((t) => t.upTo === null || size <= t.upTo);
      if (!valid) { totalEl.textContent = '—'; errEl.hidden = false; cta.disabled = true; lastEstimate = null; return; }
      const total = service.base + bedrooms * service.bedroom + bathrooms * service.bathroom + (tier ? tier.price : 0) + extrasTotal;
      totalEl.textContent = fmt.format(total); errEl.hidden = true; cta.disabled = false;
      lastEstimate = { service: service.title, bedrooms, bathrooms, size, extras: picked, total, currency: PRICING.currency };
      lastSummary = ['Residential cleaning estimate', 'Cleaning: ' + service.title, 'Bedrooms: ' + bedrooms, 'Bathrooms: ' + bathrooms, 'Home size (sq ft): ' + size,
        'Selected extras: ' + (picked.join(', ') || 'None'), 'Estimate: ' + fmt.format(total) + ' ' + PRICING.currency].join('\n');
    };
    calc.addEventListener('input', update); calc.addEventListener('change', update);
    calc.addEventListener('submit', (e) => e.preventDefault());
    let inserted = '';
    cta.addEventListener('click', () => {
      update(); if (!lastEstimate) return;
      const field = $('#contact-message'); const cur = field.value.trim();
      field.value = inserted && cur.includes(inserted) ? cur.replace(inserted, lastSummary) : (cur ? cur + '\n\n' + lastSummary : lastSummary);
      inserted = lastSummary;
      field.closest('form').dataset.estimate = JSON.stringify(lastEstimate);
      field.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
      field.focus({ preventScroll: true });
    });
    update();
  }

  // ---- Forms -> /api/submit ----
  const send = async (form, payload) => {
    const status = form.parentElement.querySelector('.form-status') || form.querySelector('.form-status');
    const btn = form.querySelector('button[type=submit]');
    status.className = 'form-status'; status.textContent = 'Sending…'; btn.disabled = true;
    try {
      const r = await fetch('/api/submit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
      status.classList.add('ok'); status.textContent = payload.kind === 'newsletter' ? 'Thanks for subscribing!' : 'Thank you! We received your message and will get back to you soon.';
      form.reset(); delete form.dataset.estimate;
    } catch (err) {
      status.classList.add('err'); status.textContent = err.message;
    } finally { btn.disabled = false; }
  };
  const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);

  const cf = $('#contact-form');
  if (cf) cf.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = new FormData(cf); const email = String(f.get('email') || '').trim();
    const status = cf.querySelector('.form-status');
    if (!emailOk(email)) { status.className = 'form-status err'; status.textContent = 'Please enter a valid email address.'; cf.email.focus(); return; }
    send(cf, { kind: 'contact', name: f.get('name'), email, phone: f.get('phone'), message: f.get('message'), website: f.get('website'),
      estimate: cf.dataset.estimate ? JSON.parse(cf.dataset.estimate) : null });
  });

  const nf = $('#newsletter-form');
  if (nf) nf.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = new FormData(nf); const email = String(f.get('email') || '').trim();
    if (!emailOk(email)) { const s = nf.parentElement.querySelector('.form-status'); s.className = 'form-status err'; s.textContent = 'Please enter a valid email address.'; return; }
    send(nf, { kind: 'newsletter', email, website: f.get('website') });
  });
})();
