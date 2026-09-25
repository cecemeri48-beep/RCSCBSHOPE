(() => {
  const target = Date.UTC(2094, 6, 23, 16, 0, 0); // 24 Juli 2094, 00.00 WITA
  const root = document.querySelector('#appCountdown');
  if (!root) return;
  const fields = {
    days: document.querySelector('#appDays'),
    hours: document.querySelector('#appHours'),
    minutes: document.querySelector('#appMinutes'),
    seconds: document.querySelector('#appSeconds')
  };
  const formatDays = value => new Intl.NumberFormat('id-ID').format(value);
  const tick = () => {
    const remaining = Math.max(0, target - Date.now());
    const total = Math.floor(remaining / 1000);
    fields.days.textContent = formatDays(Math.floor(total / 86400));
    fields.hours.textContent = String(Math.floor((total % 86400) / 3600)).padStart(2, '0');
    fields.minutes.textContent = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
    fields.seconds.textContent = String(total % 60).padStart(2, '0');
    if (remaining === 0) {
      root.classList.add('is-complete');
      root.setAttribute('aria-label', 'RCS.CBS HOPE telah mencapai 100 tahun');
    }
  };
  tick();
  window.setInterval(tick, 1000);
  if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('jejak-sw.js?v=3').catch(() => {}));
})();
