(() => {
  const photos = Array.isArray(window.RCS_ALBUM_PHOTOS) ? window.RCS_ALBUM_PHOTOS : [];
  const gallery = document.querySelector('#albumGallery');
  const controls = document.querySelector('#albumControls');
  const lightbox = document.querySelector('#albumLightbox');
  const image = document.querySelector('#lightboxImage');
  const caption = document.querySelector('#lightboxCaption');
  const original = document.querySelector('#lightboxOriginal');
  const close = document.querySelector('#lightboxClose');
  const previous = document.querySelector('#lightboxPrev');
  const next = document.querySelector('#lightboxNext');
  const loadMoreButton = document.querySelector('#loadMorePhotos');
  if (!gallery || !controls || !lightbox) return;

  const cleanName = value => value.replace(/\s+(Image|Photo)$/i, '').trim();
  const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[character]));
  const whatsappUrl = photo => {
    const originalUrl = photo.drive || photo.full || photo.thumb;
    const message = `Kenangan RCS.CBS HOPE — ${cleanName(photo.name)}\n${originalUrl}`;
    return `https://wa.me/?text=${encodeURIComponent(message)}`;
  };
  const groups = ['Semua foto', ...new Set(photos.map(photo => photo.group).filter(Boolean))];
  let activeGroup = groups[0];
  let visiblePhotos = photos;
  let activeIndex = 0;
  let touchStartX = 0;
  let touchStartY = 0;
  let renderedCount = 0;
  const batchSize = 12;

  const renderControls = () => {
    controls.innerHTML = groups.map((group, index) => `<button type="button" class="album-filter${index === 0 ? ' is-active' : ''}" data-group="${encodeURIComponent(group)}">${group}</button>`).join('');
  };

  const photoMarkup = (photo, index) => `
      <article class="album-card">
        <button class="album-photo" type="button" data-index="${index}" aria-label="Perbesar ${escapeHtml(cleanName(photo.name))}">
          <img src="${photo.thumb}" alt="${escapeHtml(cleanName(photo.name))}" loading="${index < batchSize ? 'eager' : 'lazy'}" decoding="async" />
          <span>${escapeHtml(cleanName(photo.name))}</span>
        </button>
        <a class="album-whatsapp" href="${whatsappUrl(photo)}" target="_blank" rel="noopener noreferrer" aria-label="Bagikan ${escapeHtml(cleanName(photo.name))} ke WhatsApp">Bagikan WA <b>↗</b></a>
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
    original.href = photo.drive || photo.full || photo.thumb;
  };

  const openLightbox = index => {
    activeIndex = index;
    updateLightbox();
    lightbox.hidden = false;
    document.body.classList.add('is-lightbox-open');
    close.focus();
  };

  const closeLightbox = () => {
    lightbox.hidden = true;
    document.body.classList.remove('is-lightbox-open');
    image.classList.remove('is-zoomed');
  };

  const moveLightbox = direction => {
    activeIndex = (activeIndex + direction + visiblePhotos.length) % visiblePhotos.length;
    updateLightbox();
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
  lightbox.addEventListener('click', event => { if (event.target === lightbox) closeLightbox(); });
  document.addEventListener('keydown', event => {
    if (lightbox.hidden) return;
    if (event.key === 'Escape') closeLightbox();
    if (event.key === 'ArrowLeft') moveLightbox(-1);
    if (event.key === 'ArrowRight') moveLightbox(1);
  });
})();
