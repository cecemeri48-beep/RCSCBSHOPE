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

  const renderControls = () => {
    controls.innerHTML = groups.map((group, index) => `<button type="button" class="album-filter${index === 0 ? ' is-active' : ''}" data-group="${encodeURIComponent(group)}">${group}</button>`).join('');
  };

  const renderGallery = () => {
    visiblePhotos = activeGroup === 'Semua foto' ? photos : photos.filter(photo => photo.group === activeGroup);
    if (!visiblePhotos.length) {
      gallery.innerHTML = '<p class="album-loading">Belum ada foto di kategori ini.</p>';
      return;
    }
    gallery.innerHTML = visiblePhotos.map((photo, index) => `
      <article class="album-card">
        <button class="album-photo" type="button" data-index="${index}" aria-label="Perbesar ${escapeHtml(cleanName(photo.name))}">
          <img src="${photo.thumb}" alt="${escapeHtml(cleanName(photo.name))}" loading="lazy" decoding="async" />
          <span>${escapeHtml(cleanName(photo.name))}</span>
        </button>
        <a class="album-whatsapp" href="${whatsappUrl(photo)}" target="_blank" rel="noopener noreferrer" aria-label="Bagikan ${escapeHtml(cleanName(photo.name))} ke WhatsApp">Bagikan WA <b>↗</b></a>
      </article>
    `).join('');
    gallery.querySelectorAll('img').forEach(photoImage => {
      photoImage.addEventListener('error', () => photoImage.closest('.album-photo')?.remove(), { once: true });
    });
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
  image.addEventListener('click', () => image.classList.toggle('is-zoomed'));
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
