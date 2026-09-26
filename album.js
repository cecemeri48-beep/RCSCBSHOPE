(() => {
  const photos = Array.isArray(window.RCS_ALBUM_PHOTOS) ? window.RCS_ALBUM_PHOTOS : [];
  const gallery = document.querySelector('#albumGallery');
  const controls = document.querySelector('#albumControls');
  const lightbox = document.querySelector('#albumLightbox');
  const image = document.querySelector('#lightboxImage');
  const caption = document.querySelector('#lightboxCaption');
  const close = document.querySelector('#lightboxClose');
  const previous = document.querySelector('#lightboxPrev');
  const next = document.querySelector('#lightboxNext');
  const loadMoreButton = document.querySelector('#loadMorePhotos');
  const slideshowToggle = document.querySelector('#slideshowToggle');
  const musicToggle = document.querySelector('#musicToggle');
  const musicTrack = document.querySelector('#musicTrack');
  const music = document.querySelector('#memoryMusic');
  const progress = document.querySelector('#lightboxProgress');
  if (!gallery || !controls || !lightbox) return;

  const cleanName = value => value.replace(/\s+(Image|Photo)$/i, '').trim();
  const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[character]));
  const groups = ['Semua foto', ...new Set(photos.map(photo => photo.group).filter(Boolean))];
  let activeGroup = groups[0];
  let visiblePhotos = photos;
  let activeIndex = 0;
  let touchStartX = 0;
  let touchStartY = 0;
  let renderedCount = 0;
  const batchSize = 12;
  const slideDuration = 5500;
  let slideshowTimer = null;
  let slideshowActive = false;
  let musicActive = false;

  const renderControls = () => {
    controls.innerHTML = groups.map((group, index) => `<button type="button" class="album-filter${index === 0 ? ' is-active' : ''}" data-group="${encodeURIComponent(group)}">${group}</button>`).join('');
  };

  const photoMarkup = (photo, index) => `
      <article class="album-card">
        <button class="album-photo" type="button" data-index="${index}" aria-label="Perbesar ${escapeHtml(cleanName(photo.name))}">
          <img src="${photo.thumb}" alt="${escapeHtml(cleanName(photo.name))}" loading="${index < batchSize ? 'eager' : 'lazy'}" decoding="async" />
          <span>${escapeHtml(cleanName(photo.name))}</span>
        </button>
        <button class="album-whatsapp" type="button" data-share-index="${index}" aria-label="Kirim foto ${escapeHtml(cleanName(photo.name))} ke WhatsApp">Kirim foto WA <b>↗</b></button>
      </article>
    `;

  const bindImageFallbacks = () => {
    gallery.querySelectorAll('img').forEach(photoImage => {
      photoImage.addEventListener('error', () => photoImage.closest('.album-card')?.remove(), { once: true });
    });
  };

  const renderMore = () => {
    const nextPhotos = visiblePhotos.slice(renderedCount, renderedCount + batchSize);
    gallery.insertAdjacentHTML('beforeend', nextPhotos.map((photo, index) => photoMarkup(photo, renderedCount + index)).join(''));
    renderedCount += nextPhotos.length;
    bindImageFallbacks();
    if (loadMoreButton) {
      loadMoreButton.hidden = renderedCount >= visiblePhotos.length;
      loadMoreButton.innerHTML = `Muat ${Math.min(batchSize, visiblePhotos.length - renderedCount)} foto berikutnya <b>↓</b>`;
    }
  };

  const renderGallery = () => {
    visiblePhotos = activeGroup === 'Semua foto' ? photos : photos.filter(photo => photo.group === activeGroup);
    renderedCount = 0;
    gallery.innerHTML = '';
    if (!visiblePhotos.length) {
      gallery.innerHTML = '<p class="album-loading">Belum ada foto di kategori ini.</p>';
      if (loadMoreButton) loadMoreButton.hidden = true;
      return;
    }
    renderMore();
  };

  const updateLightbox = () => {
    const photo = visiblePhotos[activeIndex];
    if (!photo) return;
    image.classList.remove('is-zoomed');
    image.src = photo.full || photo.thumb;
    image.alt = cleanName(photo.name);
    caption.textContent = `${cleanName(photo.name)}${photo.group ? ` · ${photo.group}` : ''}`;
  };

  const updateSlideshowButton = () => {
    if (!slideshowToggle) return;
    slideshowToggle.textContent = slideshowActive ? '❚❚ Jeda slideshow' : '▶ Putar slideshow';
    slideshowToggle.setAttribute('aria-pressed', String(slideshowActive));
  };

  const restartProgress = () => {
    if (!progress) return;
    progress.classList.remove('is-running');
    void progress.offsetWidth;
    if (slideshowActive) progress.classList.add('is-running');
  };

  const scheduleNextSlide = () => {
    window.clearTimeout(slideshowTimer);
    restartProgress();
    if (!slideshowActive) return;
    slideshowTimer = window.setTimeout(() => {
      activeIndex = (activeIndex + 1) % visiblePhotos.length;
      updateLightbox();
      scheduleNextSlide();
    }, slideDuration);
  };

  const startSlideshow = () => {
    slideshowActive = true;
    updateSlideshowButton();
    scheduleNextSlide();
  };

  const stopSlideshow = () => {
    slideshowActive = false;
    window.clearTimeout(slideshowTimer);
    progress?.classList.remove('is-running');
    updateSlideshowButton();
  };

  const selectedTrackLabel = () => musicTrack?.selectedOptions?.[0]?.textContent || 'Musik';
  const startMusic = async () => {
    if (!music || !musicToggle || !musicTrack) return;
    const source = musicTrack.value;
    if (!music.src.endsWith(source)) music.src = source;
    try {
      music.volume = 0.72;
      await music.play();
      musicActive = true;
      musicToggle.textContent = `♫ ${selectedTrackLabel()} · aktif`;
      musicToggle.classList.add('is-on');
      musicToggle.setAttribute('aria-pressed', 'true');
    } catch (_) {
      musicActive = false;
      musicToggle.textContent = '♫ File musik belum ada';
      musicToggle.classList.remove('is-on');
      musicToggle.setAttribute('aria-pressed', 'false');
    }
  };

  const stopMusic = () => {
    if (!music || !musicToggle) return;
    music.pause();
    musicActive = false;
    musicToggle.textContent = '♫ Putar musik';
    musicToggle.classList.remove('is-on');
    musicToggle.setAttribute('aria-pressed', 'false');
  };

  const openLightbox = index => {
    activeIndex = index;
    updateLightbox();
    lightbox.hidden = false;
    document.body.classList.add('is-lightbox-open');
    startSlideshow();
    startMusic();
    close.focus();
  };

  const closeLightbox = () => {
    lightbox.hidden = true;
    document.body.classList.remove('is-lightbox-open');
    image.classList.remove('is-zoomed');
    stopSlideshow();
    stopMusic();
    if (music) music.currentTime = 0;
  };

  const moveLightbox = direction => {
    activeIndex = (activeIndex + direction + visiblePhotos.length) % visiblePhotos.length;
    updateLightbox();
    if (slideshowActive) scheduleNextSlide();
  };

  const sharePhoto = async (photo, button) => {
    if (!photo) return;
    const title = `Kenangan RCS.CBS HOPE — ${cleanName(photo.name)}`;
    const defaultLabel = 'Kirim foto WA <b>↗</b>';
    if (button) {
      button.disabled = true;
      button.innerHTML = 'Menyiapkan foto…';
    }
    try {
      const source = photo.id
        ? `https://lh3.googleusercontent.com/d/${photo.id}=w1600`
        : (photo.full || photo.thumb);
      const response = await fetch(source, { mode: 'cors', cache: 'no-store' });
      if (!response.ok) throw new Error('Foto tidak dapat diunduh');
      const blob = await response.blob();
      const file = new File([blob], `${cleanName(photo.name)}.jpg`, { type: blob.type || 'image/jpeg' });
      const canShareFile = navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }));
      if (canShareFile) {
        await navigator.share({ files: [file], title, text: 'Kenangan RCS.CBS HOPE' });
        return;
      }
    } catch (error) {
      if (error?.name === 'AbortError') return;
    } finally {
      if (button) {
        button.disabled = false;
        button.innerHTML = defaultLabel;
      }
    }
    window.open(photo.full || photo.thumb, '_blank', 'noopener,noreferrer');
  };

  renderControls();
  renderGallery();
  controls.addEventListener('click', event => {
    const button = event.target.closest('[data-group]');
    if (!button) return;
    activeGroup = decodeURIComponent(button.dataset.group);
    controls.querySelectorAll('.album-filter').forEach(item => item.classList.toggle('is-active', item === button));
    renderGallery();
  });
  gallery.addEventListener('click', event => {
    const share = event.target.closest('[data-share-index]');
    if (share) {
      event.preventDefault();
      event.stopPropagation();
      sharePhoto(visiblePhotos[Number(share.dataset.shareIndex)], share);
      return;
    }
    const photo = event.target.closest('.album-photo');
    if (photo) openLightbox(Number(photo.dataset.index));
  });
  loadMoreButton?.addEventListener('click', renderMore);
  image.addEventListener('click', () => image.classList.toggle('is-zoomed'));
  lightbox.addEventListener('touchstart', event => {
    const touch = event.changedTouches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
  }, { passive: true });
  lightbox.addEventListener('touchend', event => {
    const touch = event.changedTouches[0];
    const distanceX = touch.clientX - touchStartX;
    const distanceY = touch.clientY - touchStartY;
    if (Math.abs(distanceX) < 55 || Math.abs(distanceX) < Math.abs(distanceY)) return;
    moveLightbox(distanceX > 0 ? -1 : 1);
  }, { passive: true });
  close.addEventListener('click', closeLightbox);
  previous.addEventListener('click', () => moveLightbox(-1));
  next.addEventListener('click', () => moveLightbox(1));
  slideshowToggle?.addEventListener('click', () => slideshowActive ? stopSlideshow() : startSlideshow());
  musicToggle?.addEventListener('click', () => musicActive ? stopMusic() : startMusic());
  musicTrack?.addEventListener('change', () => { if (!lightbox.hidden) startMusic(); });
  music?.addEventListener('ended', () => {
    if (!musicTrack || !lightbox || lightbox.hidden) return;
    musicTrack.selectedIndex = (musicTrack.selectedIndex + 1) % musicTrack.options.length;
    startMusic();
  });
  lightbox.addEventListener('click', event => { if (event.target === lightbox) closeLightbox(); });
  document.addEventListener('keydown', event => {
    if (lightbox.hidden) return;
    if (event.key === 'Escape') closeLightbox();
    if (event.key === 'ArrowLeft') moveLightbox(-1);
    if (event.key === 'ArrowRight') moveLightbox(1);
    if (event.key === ' ' && event.target === document.body) { event.preventDefault(); slideshowActive ? stopSlideshow() : startSlideshow(); }
  });
})();
