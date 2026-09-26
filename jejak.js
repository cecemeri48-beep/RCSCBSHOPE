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

  // Mechanical clock tick. Browsers may block audible autoplay until the first tap.
  const soundButton = document.querySelector('#timerSoundToggle');
  let audioContext = null;
  let soundEnabled = localStorage.getItem('rcs-timer-sound') !== 'off';
  let soundReady = false;
  const updateSoundButton = () => {
    if (!soundButton) return;
    soundButton.setAttribute('aria-pressed', String(soundEnabled && soundReady));
    soundButton.classList.toggle('is-on', soundEnabled && soundReady);
    soundButton.innerHTML = soundEnabled && soundReady
      ? '<span aria-hidden="true">🔊</span> Suara detik aktif'
      : '<span aria-hidden="true">🔊</span> Nyalakan suara detik';
    soundButton.setAttribute('aria-label', soundEnabled && soundReady ? 'Matikan suara detik timer' : 'Aktifkan suara detik timer');
  };
  const ensureAudio = async () => {
    if (!soundEnabled) return false;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return false;
    audioContext ||= new AudioCtx();
    if (audioContext.state === 'suspended') await audioContext.resume();
    soundReady = audioContext.state === 'running';
    updateSoundButton();
    return soundReady;
  };
  const playClockTick = () => {
    if (!soundEnabled || !soundReady || !audioContext || document.hidden) return;
    const now = audioContext.currentTime;
    const master = audioContext.createGain();
    const compressor = audioContext.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.knee.value = 10;
    compressor.ratio.value = 8;
    compressor.attack.value = 0.002;
    compressor.release.value = 0.08;
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.42, now + 0.003);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 0.065);
    master.connect(compressor).connect(audioContext.destination);
    [1180, 2260].forEach((frequency, index) => {
      const oscillator = audioContext.createOscillator();
      const toneGain = audioContext.createGain();
      oscillator.type = index ? 'square' : 'triangle';
      oscillator.frequency.setValueAtTime(frequency, now);
      toneGain.gain.value = index ? 0.22 : 0.78;
      oscillator.connect(toneGain).connect(master);
      oscillator.start(now);
      oscillator.stop(now + 0.07);
    });
  };
  soundButton?.addEventListener('click', async event => {
    event.stopPropagation();
    if (soundEnabled && soundReady) {
      soundEnabled = false;
      soundReady = false;
      localStorage.setItem('rcs-timer-sound', 'off');
      await audioContext?.suspend();
      updateSoundButton();
      return;
    }
    soundEnabled = true;
    localStorage.setItem('rcs-timer-sound', 'on');
    if (await ensureAudio()) playClockTick();
  });
  const unlockSound = async event => {
    if (event?.target?.closest?.('#timerSoundToggle')) return;
    if (!soundEnabled || soundReady) return;
    if (await ensureAudio()) playClockTick();
  };
  window.addEventListener('pointerdown', unlockSound, { once: true, passive: true });
  window.addEventListener('keydown', unlockSound, { once: true });
  window.addEventListener('load', () => ensureAudio().catch(() => updateSoundButton()));
  updateSoundButton();

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
  window.setInterval(() => { tick(); playClockTick(); }, 1000);

  const status = document.querySelector('.app-status');
  const setConnectionStatus = () => {
    if (!status) return;
    status.classList.toggle('is-offline', !navigator.onLine);
    status.innerHTML = `<i></i> ${navigator.onLine ? 'TERHUBUNG' : 'MODE OFFLINE'}`;
  };
  window.addEventListener('online', setConnectionStatus);
  window.addEventListener('offline', setConnectionStatus);
  setConnectionStatus();

  const shareButton = document.querySelector('#shareJejakButton');
  const installButton = document.querySelector('#installAppButton');
  const shareData = {
    title: 'Jejak RCS.CBS HOPE — Menuju 100 Tahun',
    text: 'Jejak Yang Akan Selalu Nampak. Teman pencinta alam dan semesta.',
    url: new URL('jejak.html?v=3', document.baseURI).href
  };
  shareButton?.addEventListener('click', async () => {
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }
      await navigator.clipboard.writeText(shareData.url);
      shareButton.innerHTML = 'Link tersalin <b>✓</b>';
      window.setTimeout(() => { shareButton.innerHTML = 'Bagikan jejak <b>↗</b>'; }, 2200);
    } catch {}
  });

  let installPrompt;
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    installPrompt = event;
    if (installButton) installButton.hidden = false;
  });
  installButton?.addEventListener('click', async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    await installPrompt.userChoice;
    installPrompt = null;
    installButton.hidden = true;
  });
  window.addEventListener('appinstalled', () => {
    if (installButton) installButton.hidden = true;
  });

  const quote = document.querySelector('#journeyQuote');
  const nextQuote = document.querySelector('#nextQuote');
  const quotes = [
    '“Sejarah adalah jejak yang menuntun langkah hari ini.”',
    '“Pelan-pelan, setiap proses sedang membentuk cerita besar.”',
    '“Cita-cita tumbuh dari keberanian untuk terus berjalan.”',
    '“Satu jejak hari ini, seribu cerita untuk masa depan.”'
  ];
  let quoteIndex = 0;
  const rotateQuote = () => {
    if (!quote) return;
    quote.classList.add('is-changing');
    window.setTimeout(() => {
      quoteIndex = (quoteIndex + 1) % quotes.length;
      quote.textContent = quotes[quoteIndex];
      quote.classList.remove('is-changing');
    }, 180);
  };
  nextQuote?.addEventListener('click', rotateQuote);
  window.setInterval(rotateQuote, 7000);

  if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('jejak-sw.js?v=14').catch(() => {}));
})();
