(() => {
  'use strict';
  const form = document.querySelector('#registrationForm');
  const progress = document.querySelector('.mobile-form-steps');
  if (!form) return;

  form.setAttribute('aria-label', 'Formulir pendaftaran anggota keluarga');
  const grid = form.querySelector('.form-grid');
  const headings = grid ? [...grid.querySelectorAll('.form-section-heading')] : [];
  if (!grid || headings.length < 3) return;

  // Improve native accessibility without changing the visual labels.
  [...form.querySelectorAll('label.field')].forEach((label, index) => {
    const control = label.querySelector('input,select,textarea');
    if (!control) return;
    if (!control.id) control.id = `registration-field-${index + 1}`;
    label.htmlFor = control.id;
  });
  const verifyInput = document.querySelector('#verifyInput');
  if (verifyInput) {
    verifyInput.setAttribute('aria-label', 'Kode verifikasi kartu anggota');
    verifyInput.setAttribute('autocomplete', 'off');
    verifyInput.setAttribute('spellcheck', 'false');
    verifyInput.setAttribute('inputmode', 'text');
  }

  const panels = headings.map((_, index) => {
    const panel = document.createElement('section');
    panel.className = 'wizard-panel';
    panel.dataset.step = String(index);
    panel.setAttribute('aria-label', `Langkah ${index + 1} dari 3`);
    return panel;
  });
  let stepIndex = -1;
  [...grid.children].forEach((node) => {
    if (node.classList.contains('form-section-heading')) stepIndex += 1;
    if (panels[stepIndex]) panels[stepIndex].appendChild(node);
  });
  grid.classList.add('wizard-shell');
  panels.forEach(panel => grid.appendChild(panel));

  const consent = form.querySelector(':scope > .consent');
  const formEnd = form.querySelector(':scope > .form-end');
  if (consent) panels[2].appendChild(consent);
  if (formEnd) panels[2].appendChild(formEnd);

  const actions = document.createElement('div');
  actions.className = 'wizard-actions';
  actions.innerHTML = '<button class="btn btn-outline wizard-back" type="button">← Kembali</button><span class="wizard-helper">Data hanya dikirim setelah langkah terakhir.</span><button class="btn btn-dark wizard-next" type="button">Lanjutkan <b>→</b></button>';
  grid.insertAdjacentElement('afterend', actions);
  const back = actions.querySelector('.wizard-back');
  const next = actions.querySelector('.wizard-next');
  const submit = form.querySelector('button[type="submit"]');
  const progressSteps = progress ? [...progress.querySelectorAll('span')] : [];
  let current = 0;

  function controlsFor(step) {
    return [...panels[step].querySelectorAll('input,select,textarea')];
  }
  function validateStep(step) {
    const controls = controlsFor(step);
    for (const control of controls) {
      if (!control.checkValidity()) {
        control.reportValidity();
        control.focus({preventScroll:true});
        control.scrollIntoView({behavior:'smooth', block:'center'});
        return false;
      }
    }
    return true;
  }
  function showStep(index, shouldFocus = false) {
    current = Math.max(0, Math.min(index, panels.length - 1));
    panels.forEach((panel, i) => {
      const active = i === current;
      panel.classList.toggle('is-active', active);
      panel.hidden = !active;
      panel.setAttribute('aria-hidden', String(!active));
    });
    progressSteps.forEach((item, i) => {
      item.classList.toggle('is-current', i === current);
      item.classList.toggle('is-complete', i < current);
      if (i === current) item.setAttribute('aria-current', 'step');
      else item.removeAttribute('aria-current');
    });
    back.hidden = current === 0;
    next.hidden = current === panels.length - 1;
    if (formEnd) formEnd.hidden = current !== panels.length - 1;
    if (shouldFocus) {
      const heading = panels[current].querySelector('.form-section-heading');
      heading?.setAttribute('tabindex','-1');
      heading?.focus({preventScroll:true});
      progress?.scrollIntoView({behavior:'smooth', block:'center'});
    }
  }

  back.addEventListener('click', () => showStep(current - 1, true));
  next.addEventListener('click', () => {
    if (validateStep(current)) showStep(current + 1, true);
  });
  form.addEventListener('invalid', (event) => {
    const invalidStep = panels.findIndex(panel => panel.contains(event.target));
    if (invalidStep >= 0 && invalidStep !== current) showStep(invalidStep);
  }, true);
  form.addEventListener('reset', () => {
    window.setTimeout(() => showStep(0), 0);
  });
  showStep(0);

  // Keep mobile navigation context-aware.
  const navLinks = [...document.querySelectorAll('.mobile-bottom-nav a')];
  const sectionLinks = navLinks.filter(link => link.getAttribute('href')?.startsWith('#'));
  const observed = sectionLinks.map(link => document.querySelector(link.getAttribute('href'))).filter(Boolean);
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      const visible = entries.filter(entry => entry.isIntersecting).sort((a,b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      navLinks.forEach(link => link.classList.toggle('is-active', link.getAttribute('href') === `#${visible.target.id}`));
    }, {rootMargin:'-25% 0px -60% 0px', threshold:[0,.15,.35]});
    observed.forEach(section => observer.observe(section));
  }

  // Make long-running submit state understandable to assistive technology.
  submit?.addEventListener('click', () => form.setAttribute('aria-busy', 'true'));
  const registrationAlert = document.querySelector('#registrationAlert');
  if (registrationAlert && 'MutationObserver' in window) {
    new MutationObserver(() => {
      if (registrationAlert.textContent.trim()) form.setAttribute('aria-busy', 'false');
    }).observe(registrationAlert, {childList:true, subtree:true, characterData:true});
  }
})();
