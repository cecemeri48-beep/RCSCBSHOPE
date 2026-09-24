const cfg = window.RCS_CONFIG || {};
const hasSupabase = Boolean(cfg.supabaseUrl && cfg.supabaseAnonKey && window.supabase?.createClient);
const sb = hasSupabase ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey) : null;
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const demoKey = 'rcs-cbs-hope-demo-members';
const demoMembers = () => { try { const value=JSON.parse(localStorage.getItem(demoKey) || '[]'); return Array.isArray(value) ? value : []; } catch (_) { return []; } };
const saveDemo = (items) => localStorage.setItem(demoKey, JSON.stringify(items));
const safe = (v='') => String(v).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const initials = (name='') => name.split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase() || 'RC';
const siteUrl = () => cfg.siteUrl || window.location.origin;
const verifyUrl = (token) => `${siteUrl()}/#verify=${token}`;
const localDemoAllowed = window.location.protocol === 'file:' || ['localhost','127.0.0.1'].includes(window.location.hostname);
let activeMember = null; let adminMembers = [];
const COMPETENCY_TRACKS = Object.freeze([
  { code:'rimba', label:'JEJAK RIMBA', icon:'🌿', color:'green', intro:'Belajar mengenal alam dan menjaganya.', steps:['Kenal alam sekitar','Jaga diri dan teman','Jelajah kecil bersama pendamping'] },
  { code:'vertikal', label:'JEJAK VERTIKAL', icon:'🧗', color:'orange', intro:'Berani mencoba, tetap aman, dan saling menjaga.', steps:['Kenal alat dan simpul','Latihan aman bersama','Tantangan vertikal ringan'] },
  { code:'speleo', label:'JEJAK SPELEO', icon:'🔦', color:'purple', intro:'Mengenal dunia gua dengan rasa ingin tahu.', steps:['Kenal gua dan batuan','Etika serta keselamatan','Eksplorasi bersama pendamping'] },
  { code:'maritim', label:'JEJAK MARITIM', icon:'🌊', color:'blue', intro:'Bersahabat dengan air, pantai, dan laut.', steps:['Kenal air dan cuaca','Keselamatan di air','Aksi jaga pesisir'] },
  { code:'kultura', label:'JEJAK KULTURA', icon:'🪶', color:'red', intro:'Merawat cerita, budaya, dan keluarga.', steps:['Kenal cerita keluarga','Belajar dari kakak dan orang tua','Bagikan satu cerita baik'] },
  { code:'mastermind', label:'JEJAK MASTERMIND', icon:'🧩', color:'gold', intro:'Mengasah logika, kreativitas, dan kerja tim.', steps:['Pecahkan tantangan kecil','Buat ide bersama tim','Pimpin satu aksi positif'] }
]);
function journeyEvents(member={}) {
  const events=Array.isArray(member.journey) ? member.journey : [];
  if(events.length) return events;
  if(member.status==='Aktif') return [{event_type:'membership_activated', title:'Lulus Menjadi Anggota RCS.CBS HOPE', description:'Kartu aktif dan peta kompetensi terbuka.', occurred_at:member.activated_at || member.updated_at || member.created_at || null}];
  return [];
}
function journeyDate(value) {
  if(!value) return 'Tercatat saat kartu aktif';
  const date=new Date(value); if(Number.isNaN(date.getTime())) return 'Tercatat saat kartu aktif';
  return new Intl.DateTimeFormat('id-ID',{day:'numeric',month:'short',year:'numeric'}).format(date);
}
function journeyMapMarkup(member={}) {
  const active=member.status==='Aktif';
  const passed=new Set(memberCompetencyCodes(member));
  const rootEvent=journeyEvents(member).find(event=>event.event_type==='membership_activated');
  const rootDone=active && Boolean(rootEvent);
  const tracks=COMPETENCY_TRACKS.map(track=>{
    const complete=passed.has(track.code);
    const unlocked=active;
    const state=complete?'LULUS':unlocked?'TERBUKA':'TERKUNCI';
    const steps=track.steps.map((step,index)=>`<li class="${complete?'done':''}"><span>${complete?'✓':index+1}</span>${safe(step)}</li>`).join('');
    return `<article class="journey-track journey-${track.color} ${complete?'is-complete':''} ${unlocked?'is-open':'is-locked'}"><div class="journey-track-head"><span class="journey-track-icon" aria-hidden="true">${track.icon}</span><div><span class="journey-track-state">${state}</span><h4>${safe(track.label)}</h4></div></div><p>${safe(track.intro)}</p><ol>${steps}</ol><div class="journey-track-foot"><span>${complete?'Kompetensi tercapai':'Pilih sesuai minat'}</span><b>${complete?'★':'→'}</b></div></article>`;
  }).join('');
  return `<section class="journey-map" aria-label="Peta jejak anggota"><div class="journey-map-head"><div><span class="journey-kicker">PASPOR JEJAK ANGGOTA</span><h3>Peta perjalanan ${safe(member.name || 'anggota')}</h3><p>Langkahnya ringan, bertahap, dan selalu bersama pendamping. Pilih jejak yang paling disukai.</p></div><span class="journey-count">${passed.size}/6<br><small>kompetensi</small></span></div><div class="journey-root ${rootDone?'is-complete':'is-locked'}"><span class="journey-root-icon">${rootDone?'✓':'○'}</span><div><span class="journey-track-state">${rootDone?'TERCATAT':'MENUNGGU AKTIF'}</span><strong>Lulus Menjadi Anggota RCS.CBS HOPE</strong><small>${rootDone ? journeyDate(rootEvent?.occurred_at) : 'Peta terbuka setelah kartu aktif'}</small></div></div><div class="journey-connector" aria-hidden="true"></div><div class="journey-section-label"><span>LANJUTAN PETA JENJANG KOMPETENSI</span><small>6 Jejak sesuai minat</small></div><div class="journey-tracks">${tracks}</div><p class="journey-note">Setiap jejak bisa dimulai dari kegiatan kecil. Bintang dan sertifikat diberikan setelah pengurus memverifikasi tahap kelulusan.</p></section>`;
}
function memberCompetencyCodes(member={}) {
  const allowed=new Set(COMPETENCY_TRACKS.map(item=>item.code));
  return [...new Set((Array.isArray(member.competencies) ? member.competencies : []).map(String).filter(code=>allowed.has(code)))];
}
function competencyBadgesMarkup(member) {
  const passed=new Set(memberCompetencyCodes(member));
  const badge=item=>`<span class="competency-badge${passed.has(item.code)?' passed':''}">${passed.has(item.code)?'<b aria-hidden="true">★</b> ':''}${safe(item.label)}</span>`;
  return `<div class="id-card-competencies" aria-label="Lencana kompetensi"><div>${COMPETENCY_TRACKS.slice(0,3).map(badge).join('')}</div><div>${COMPETENCY_TRACKS.slice(3,6).map(badge).join('')}</div></div>`;
}

function alertBox(el, message, kind='success') { el.textContent = message; el.className = `form-alert ${kind}`; }
function clearAlert(el) { el.textContent=''; el.className='form-alert'; }
function toast(message) { const el=$('#toast'); el.textContent=message; el.classList.add('show'); setTimeout(()=>el.classList.remove('show'),2800); }
function isConfigured() { return hasSupabase; }
function demoRegistration(n) { return `${String(n).padStart(3,'0')}/RCSCBS/HOPE/2026`; }
function normalizePhone(value='') { return String(value).trim().replace(/[\s-]/g,''); }
function displayCohortName(value='') { const clean=String(value || '').trim().replace(/\s+/g,' '); const suffix=clean.replace(/^(?:ANGKATAN|GENERASI|SERIES)\s*[:\-]?\s*/i,'').trim().toUpperCase(); return suffix || '-'; }
function validPhone(value='') { return /^(?:08|62|\+62)\d{8,14}$/.test(normalizePhone(value)); }
function shareMemberCard(member) {
  const url=member?.public_token ? verifyUrl(member.public_token) : siteUrl();
  const text=`Kartu anggota RCS.CBS HOPE — ${String(member?.name || 'Anggota').toUpperCase()}`;
  if (navigator.share) navigator.share({title:'Kartu Anggota RCS.CBS HOPE',text,url}).catch(()=>{});
  else { const waUrl='https:'+String.fromCharCode(47,47)+'wa.me/?text='+encodeURIComponent(text+'\n'+url); window.open(waUrl,'_blank','noopener,noreferrer'); }
}
function uuid() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  if (window.crypto?.getRandomValues) {
    const bytes = new Uint8Array(16); window.crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 15) | 64; bytes[8] = (bytes[8] & 63) | 128;
    const hex=[...bytes].map(x=>x.toString(16).padStart(2,'0')).join('');
    return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
  }
  throw new Error('Browser tidak mendukung pembuatan identitas aman. Perbarui Chrome lalu coba lagi.');
}
function requireBackend() {
  if (!isConfigured() && !localDemoAllowed) throw new Error('Koneksi server belum siap di perangkat ini. Muat ulang halaman dan pastikan JavaScript tidak diblokir.');
}

function withTimeout(promise, ms, message) { return Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms))]); }
async function optimizePhoto(file) {
  if (!file || file.size <= 1.5 * 1024 * 1024) return file;
  try {
    let source;
    if (window.createImageBitmap) source=await createImageBitmap(file);
    else {
      const dataUrl=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error('Foto tidak dapat dibaca.'));reader.readAsDataURL(file);});
      source=await new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('Format foto tidak didukung browser ini.'));image.src=dataUrl;});
    }
    const sourceWidth=source.width || source.naturalWidth; const sourceHeight=source.height || source.naturalHeight; const max=1600; const scale=Math.min(1,max/Math.max(sourceWidth,sourceHeight)); const canvas=document.createElement('canvas'); canvas.width=Math.max(1,Math.round(sourceWidth*scale)); canvas.height=Math.max(1,Math.round(sourceHeight*scale)); canvas.getContext('2d').drawImage(source,0,0,canvas.width,canvas.height); source.close?.();
    const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Foto tidak dapat diproses.')),'image/jpeg',.82));
    return new File([blob], `${(file.name||'foto').replace(/\.[^.]+$/,'')}.jpg`, {type:'image/jpeg'});
  } catch (_) { return file; }
}
async function uploadPhoto(file) {
  if (!file) return { path:null, url:null };
  const allowedTypes=new Set(['image/jpeg','image/png','image/webp']);
  if (!allowedTypes.has(String(file.type || '').toLowerCase())) throw new Error('Format foto harus JPG, PNG, atau WebP.');
  const prepared=await optimizePhoto(file);
  if (prepared.size > 5 * 1024 * 1024) throw new Error('Ukuran foto maksimal 5 MB. Pilih foto yang lebih kecil.');
  if (!isConfigured()) {
    if (!localDemoAllowed) throw new Error('Koneksi server belum siap. Muat ulang halaman lalu coba lagi.');
    return { path: `demo/${prepared.name}`, url: URL.createObjectURL(prepared) };
  }
  const ext = (prepared.name.split('.').pop() || 'jpg').toLowerCase(); const path = `${uuid()}.${ext}`;
  const { error } = await withTimeout(sb.storage.from('member-photos').upload(path, prepared, { upsert:false, contentType:prepared.type || 'image/jpeg' }), 30000, 'Upload foto terlalu lama. Periksa koneksi internet lalu coba lagi.');
  if (error) throw error;
  const { data } = sb.storage.from('member-photos').getPublicUrl(path);
  return { path, url:data.publicUrl };
}

function renderQRCode(canvas, value) {
  if (!canvas) return;
  const holder = canvas.parentElement || canvas;
  holder.replaceChildren();
  if (window.QRCode?.toCanvas) {
    window.QRCode.toCanvas(canvas, value, { width: 78, margin: 1, color:{dark:'#17212b',light:'#ffffff'} }, () => {});
  } else if (typeof window.QRCode === 'function') {
    new window.QRCode(holder, { text:value, width:78, height:78, correctLevel:window.QRCode.CorrectLevel?.M || 0 });
  } else {
    holder.textContent='QR'; holder.className='qr-fallback';
  }
}

function safeImageUrl(value='') {
  const raw=String(value || '').trim();
  if (!raw) return '';
  if (/^data:image\/(?:png|jpe?g|webp);base64,/i.test(raw) || raw.startsWith('blob:')) return raw;
  try { const parsed=new URL(raw, window.location.href); return ['http:','https:'].includes(parsed.protocol) ? parsed.href : ''; } catch (_) { return ''; }
}
function photoUrlsForMember(member) {
  const urls=[];
  if (member?.photo_url) urls.push(safeImageUrl(member.photo_url));
  if (isConfigured() && member?.photo_path) urls.push(safeImageUrl(sb.storage.from('member-photos').getPublicUrl(member.photo_path).data.publicUrl));
  return [...new Set(urls.filter(Boolean))];
}

function photoUrlForMember(member) { return photoUrlsForMember(member)[0] || ''; }
function cardPhotoMarkup(member) {
  const urls=photoUrlsForMember(member); const photoSrc=urls[0] || ''; const fallbackSrc=urls[1] || '';
  const fallback = `<div class="id-card-photo placeholder" style="display:${photoSrc ? 'none' : 'grid'}">${safe(initials(member.name))}</div>`;
  if (!photoSrc) return `<div class="photo-shell">${fallback}</div>`;
  return `<div class="photo-shell"><img class="id-card-photo js-card-photo" src="${safe(photoSrc)}" data-fallback-src="${safe(fallbackSrc)}" alt="Foto ${safe(member.name)}" loading="lazy" referrerpolicy="no-referrer" />${fallback}</div>`;
}
function bindCardPhotoFallbacks(root=document) {
  $$('.js-card-photo',root).forEach(image=>image.addEventListener('error',()=>{
    const fallback=safeImageUrl(image.dataset.fallbackSrc);
    if (fallback && image.dataset.retried!=='1') { image.dataset.retried='1'; image.src=fallback; return; }
    image.style.display='none';
    image.nextElementSibling?.style.setProperty('display','grid');
  }));
}


function renderResult(member, target=$('#verificationResult')) {
  if (!member) { target.innerHTML='<div class="empty"><span>×</span><strong>Data tidak ditemukan</strong><small>Periksa nomor registrasi atau hubungi pengurus.</small></div>'; return; }
  const logo = $('.brand img')?.src || '';
  target.innerHTML = `<div class="verification-card-wrap"><div class="verification-card-visual"><div class="id-card-face verification-id-card" id="verifiedFront"><div class="membership-watermark">MEMBERS ONLY</div><div class="id-card-top"><img class="id-card-logo" src="${safe(logo)}" alt="Logo RCS.CBS HOPE" /><span class="id-card-badge status-${statusClass(member.status)}">${safe(member.status || 'ANGGOTA')}</span></div>${competencyBadgesMarkup(member)}<div class="id-card-main">${cardPhotoMarkup(member)}<div><span class="id-card-label">Nama anggota</span><div class="id-card-name">${safe(member.name).toUpperCase()}</div><div class="id-card-reg">${safe(member.registration_number || 'Nomor belum diterbitkan')}</div><div class="id-card-blood">GOL. DARAH <b>(${safe(member.blood_type)})</b></div><div class="id-card-tagline">PENCINTA ALAM · COMMUNITY MEMBER</div></div></div><div class="id-card-qr">${member.status === 'Aktif' && (member.public_token || member.id) ? '<canvas id="resultQr"></canvas>' : '<span class="qr-pending">MENUNGGU<br>VERIFIKASI</span>'}</div><div class="id-card-bottom"><span>RCS.CBS HOPE</span><span>BERLAKU SEUMUR HIDUP</span><span>SELAMA KARTU AKTIF</span><span>MEMBER ID</span></div></div><div class="id-card-back verification-card-back hidden" id="verifiedBack"><img class="back-compass-img" src="./reichas-virtual-stamp.png" alt="Stempel Reichas Chelebes" /><img class="back-house-img" src="legacy-house-forest-gray.jpg" alt="Siluet rumah RCS.CBS" /><div class="back-copy"><span class="back-kicker">REICHAS CHELEBES</span><strong>Bangga menjadi bagian Keluarga RCS.CBS.</strong><p>Di mana pun langkah membawa kita, Keluarga Reichas Chelebes tetap terhubung. Kartu ini adalah identitas anggota—jembatan komunikasi, koordinasi, dan kepedulian saat dibutuhkan.</p></div><div class="back-detail"><div class="back-detail-block"><span>PEMILIK LEGACY</span><strong>${safe(member.parent_name).toUpperCase()}</strong></div><div class="back-detail-block"><span>NAMA ANGKATAN</span><strong>${safe(displayCohortName(member.cohort_name))}</strong></div><div class="back-detail-block back-card-number"><strong>${safe(member.registration_number || 'Nomor belum diterbitkan')}</strong></div></div></div></div><div class="verification-card-info"><div><span>Pemilik legacy</span><strong>${safe(member.parent_name).toUpperCase()}</strong></div><div><span>Golongan darah</span><strong>${safe(member.blood_type)}</strong></div><div><span>Nama angkatan</span><strong>${safe(displayCohortName(member.cohort_name))}</strong></div></div><div class="verification-actions"><button class="btn btn-dark" id="printMemberCard" type="button">Download Kartu PDF <b>↓</b></button><button class="btn btn-dark" id="downloadMemberPng" type="button">Simpan Kartu PNG <b>↓</b></button><button class="btn btn-outline zoom-member-card" id="zoomMemberCard" type="button">Perbesar kartu <b>⤢</b></button><button class="btn btn-outline" id="toggleCardSide" type="button">Lihat sisi belakang <b>↔</b></button><button class="btn btn-outline" id="shareMemberCard" type="button">Bagikan kartu <b>↗</b></button></div></div>${journeyMapMarkup(member)}`;
  bindCardPhotoFallbacks(target);
  if(member.status === 'Aktif' && (member.public_token || member.id)) renderQRCode($('#resultQr'), verifyUrl(member.public_token || member.id));
  $('#printMemberCard')?.addEventListener('click', () => openPrintCard(member)); $('#downloadMemberPng')?.addEventListener('click', () => openPrintCard(member,'png')); $('#zoomMemberCard')?.addEventListener('click', () => openCardPreview(member));
  $('#shareMemberCard')?.addEventListener('click', () => shareMemberCard(member));
  $('#toggleCardSide')?.addEventListener('click', (event) => {
    const front=$('#verifiedFront'); const back=$('#verifiedBack'); const showingBack=!back.classList.contains('hidden');
    front.classList.toggle('hidden', !showingBack); back.classList.toggle('hidden', showingBack);
    event.currentTarget.innerHTML=showingBack ? 'Lihat sisi belakang <b>↔</b>' : 'Lihat sisi depan <b>↔</b>';
  });
}
function openCardPreview(member) {
  if (!member) { toast('Data anggota tidak ditemukan.'); return; }
  const modal=$('#cardModal'); const body=$('#cardModalBody'); const logo=$('.brand img')?.src || ''; const compass='./reichas-virtual-stamp.png'; const house='legacy-house-forest-gray.jpg';
  body.innerHTML=`<div class="id-card-preview"><div class="id-card-face"><div class="membership-watermark">MEMBERS ONLY</div><div class="id-card-top"><img class="id-card-logo" src="${safe(logo)}" alt="Logo RCS.CBS HOPE" /><span class="id-card-badge status-${statusClass(member.status)}">${safe(member.status || 'ANGGOTA')}</span></div>${competencyBadgesMarkup(member)}<div class="id-card-main">${cardPhotoMarkup(member)}<div><span class="id-card-label">Nama anggota</span><div class="id-card-name">${safe(member.name).toUpperCase()}</div><div class="id-card-reg">${safe(member.registration_number || 'Nomor belum diterbitkan')}</div><div class="id-card-blood">GOL. DARAH <b>(${safe(member.blood_type)})</b></div><div class="id-card-tagline">PENCINTA ALAM · COMMUNITY MEMBER</div></div></div><div class="id-card-qr">${member.status === 'Aktif' && (member.public_token || member.id) ? '<canvas id="modalQr"></canvas>' : '<span class="qr-pending">MENUNGGU<br>VERIFIKASI</span>'}</div><div class="id-card-bottom"><span>RCS.CBS HOPE</span><span>BERLAKU SEUMUR HIDUP</span><span>SELAMA KARTU AKTIF</span><span>MEMBER ID</span></div></div><div class="id-card-back"><img class="back-compass-img" src="${safe(compass)}" alt="Stempel Reichas Chelebes" /><img class="back-house-img" src="${safe(house)}" alt="Siluet rumah RCS.CBS" /><div class="back-copy"><span class="back-kicker">REICHAS CHELEBES</span><strong>Bangga menjadi bagian Keluarga RCS.CBS.</strong><p>Di mana pun langkah membawa kita, Keluarga Reichas Chelebes tetap terhubung. Kartu ini adalah identitas anggota—jembatan komunikasi, koordinasi, dan kepedulian saat dibutuhkan.</p></div><div class="back-detail"><div class="back-detail-block"><span>PEMILIK LEGACY</span><strong>${safe(member.parent_name).toUpperCase()}</strong></div><div class="back-detail-block"><span>NAMA ANGKATAN</span><strong>${safe(displayCohortName(member.cohort_name))}</strong></div><div class="back-detail-block back-card-number"><strong>${safe(member.registration_number || 'Nomor belum diterbitkan')}</strong></div></div></div></div><div class="modal-actions"><button class="btn btn-dark" id="modalPrintCard" type="button">Download Kartu PDF <b>↓</b></button><button class="btn btn-dark" id="modalDownloadPng" type="button">Simpan Kartu PNG <b>↓</b></button><button class="btn btn-outline" id="modalShareCard" type="button">Bagikan kartu <b>↗</b></button></div>`;
  bindCardPhotoFallbacks(body); if(member.status === 'Aktif' && (member.public_token || member.id)) renderQRCode($('#modalQr'), verifyUrl(member.public_token || member.id)); $('#modalShareCard')?.addEventListener('click',()=>shareMemberCard(member)); $('#modalPrintCard')?.addEventListener('click',()=>openPrintCard(member)); $('#modalDownloadPng')?.addEventListener('click',()=>openPrintCard(member,'png')); modal.classList.remove('hidden'); document.body.classList.add('modal-open');
}
function closeCardPreview(){ $('#cardModal')?.classList.add('hidden'); document.body.classList.remove('modal-open'); }
$('#closeCardModal')?.addEventListener('click',closeCardPreview); $('[data-close-card]')?.addEventListener('click',closeCardPreview); document.addEventListener('keydown',event=>{if(event.key==='Escape') closeCardPreview();});
function xmlEscape(value='') { return String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[ch])); }
function competencySvgMarkup(member) {
  const passed=new Set(memberCompetencyCodes(member));
  const positions=[[180,67],[315,67],[465,67],[180,87],[315,87],[465,87]];
  return COMPETENCY_TRACKS.map((item,index)=>{
    const done=passed.has(item.code); const [x,y]=positions[index];
    return `<text x="${x}" y="${y}" fill="${done?'#e8c892':'#ffffff'}" fill-opacity="${done?'.98':'.48'}" font-family="Arial" font-weight="700" font-size="9" letter-spacing=".7">${done?'★ ':''}${xmlEscape(item.label)}</text>`;
  }).join('');
}
function makeQrDataUrl(value) {
  if (typeof window.QRCode !== 'function') return '';
  const holder=document.createElement('div'); holder.style.cssText='position:fixed;left:-9999px;top:-9999px;width:240px;height:240px'; document.body.appendChild(holder);
  try { new window.QRCode(holder,{text:value,width:240,height:240,correctLevel:window.QRCode.CorrectLevel?.M || 0}); const image=holder.querySelector('img'); const canvas=holder.querySelector('canvas'); return image?.src || canvas?.toDataURL?.() || ''; } catch (_) { return ''; } finally { setTimeout(()=>holder.remove(),0); }
}
async function imageToDataUrl(url) {
  if (!url || url.startsWith('data:')) return url || '';
  try { const response=await fetch(url, {mode:'cors'}); if (!response.ok) return ''; const blob=await response.blob(); return await new Promise(resolve=>{const reader=new FileReader(); reader.onload=()=>resolve(reader.result); reader.onerror=()=>resolve(''); reader.readAsDataURL(blob);}); } catch (_) { return ''; }
}
async function openPrintCard(member, mode='pdf') {
  const w=window.open('','_blank','width=1100,height=800'); if(!w){toast('Izinkan pop-up untuk mencetak kartu.');return;}
  w.document.write('<p style="font-family:Arial;padding:24px">Menyiapkan kartu…</p>');
  const logo = $('.brand img')?.src || '';
  const compass = './reichas-virtual-stamp.png';
  const compassData = await imageToDataUrl(compass);
  const house = 'legacy-house-forest-gray.jpg';
  const houseData = await imageToDataUrl(house);
  const photo = photoUrlForMember(member);
  const photoData = await imageToDataUrl(photo);
  const qr = (member.status === 'Aktif' && (member.public_token || member.id)) ? verifyUrl(member.public_token || member.id) : '';
  const qrSrc = qr ? makeQrDataUrl(qr) : '';
  const competencySvg = competencySvgMarkup(member);
  const name=xmlEscape(member.name).toUpperCase(); const nameLength=String(member.name||'').trim().length; const nameFontSize=nameLength>28?24:nameLength>23?27:nameLength>18?30:34; const nameFit=nameLength>18?'textLength="405" lengthAdjust="spacingAndGlyphs"':''; const reg=xmlEscape(member.registration_number || 'Nomor belum diterbitkan'); const blood=xmlEscape(member.blood_type || '-'); const parent=xmlEscape(member.parent_name || '-'); const cohort=xmlEscape(displayCohortName(member.cohort_name)); const status=xmlEscape(member.status || 'ANGGOTA'); const statusWidth=Math.max(112,Math.min(220,34+String(member.status || 'ANGGOTA').length*8)); const statusX=860-55-statusWidth; const photoHref=xmlEscape(photoData || photo); const logoHref=xmlEscape(logo); const compassHref=xmlEscape(compassData || compass); const houseHref=xmlEscape(houseData || house); const qrHref=xmlEscape(qrSrc);
  const frontSvg=`<svg xmlns="http://www.w3.org/2000/svg" width="860" height="540" viewBox="0 0 860 540"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#112129"/><stop offset=".62" stop-color="#1b3740"/><stop offset="1" stop-color="#496b70"/></linearGradient></defs><rect width="860" height="540" rx="38" fill="url(#bg)"/><rect x="11" y="11" width="838" height="518" rx="30" fill="none" stroke="#c8a675" stroke-opacity=".38" stroke-width="2"/><circle cx="760" cy="410" r="210" fill="none" stroke="#ffffff" stroke-opacity=".12" stroke-width="2"/><circle cx="760" cy="410" r="165" fill="none" stroke="#ffffff" stroke-opacity=".08" stroke-width="20"/><rect x="275" y="452" width="265" height="42" rx="21" fill="#ffffff" fill-opacity=".07" stroke="#ffffff" stroke-opacity=".26"/><text x="407" y="479" fill="#ffffff" fill-opacity=".78" font-family="Arial" font-weight="700" font-size="18" letter-spacing="3" text-anchor="middle">MEMBERS ONLY</text><image href="${logoHref}" x="60" y="48" width="90" height="90" preserveAspectRatio="xMidYMid slice"/><rect x="${statusX}" y="52" width="${statusWidth}" height="42" rx="21" fill="none" stroke="#ffffff" stroke-opacity=".65"/><text x="${statusX + statusWidth/2}" y="78" fill="#ffffff" font-family="Arial" font-size="15" text-anchor="middle">${status}</text>${competencySvg}<rect x="60" y="225" width="150" height="180" rx="18" fill="#efe3d8"/><text x="135" y="330" fill="#8d594d" font-family="Arial" font-weight="700" font-size="54" text-anchor="middle">${xmlEscape(initials(member.name))}</text>${(photoData || photo) ? `<image href="${photoHref}" x="60" y="225" width="150" height="180" preserveAspectRatio="xMidYMid slice"/>` : ''}<text x="245" y="250" fill="#ffffff" fill-opacity=".65" font-family="Arial" font-size="14" letter-spacing="3">NAMA ANGGOTA</text><text x="245" y="293" fill="#ffffff" font-family="Arial" font-weight="700" font-size="${nameFontSize}" ${nameFit}>${name}</text><text x="245" y="325" fill="#ffffff" fill-opacity=".75" font-family="Arial" font-size="16">${reg}</text><rect x="245" y="345" width="190" height="32" rx="16" fill="none" stroke="#f0a995" stroke-opacity=".75"/><text x="340" y="367" fill="#f0c4b4" font-family="Arial" font-size="13" text-anchor="middle">GOL. DARAH  (${blood})</text><line x1="245" y1="400" x2="505" y2="400" stroke="#e8c892" stroke-opacity=".45"/><text x="245" y="422" fill="#e8c892" fill-opacity=".9" font-family="Arial" font-weight="700" font-size="12" letter-spacing="2">PENCINTA ALAM · COMMUNITY MEMBER</text>${qrSrc ? `<image href="${qrHref}" x="690" y="245" width="126" height="126" preserveAspectRatio="xMidYMid meet"/>` : ''}<text x="753" y="405" fill="#e8c892" fill-opacity=".95" font-family="Arial" font-size="11" letter-spacing="2" text-anchor="middle">RCS.CBS HOPE</text><text x="753" y="425" fill="#ffffff" fill-opacity=".78" font-family="Arial" font-size="8" letter-spacing="1.2" text-anchor="middle">BERLAKU SEUMUR HIDUP</text><text x="753" y="443" fill="#ffffff" fill-opacity=".78" font-family="Arial" font-size="8" letter-spacing="1.2" text-anchor="middle">SELAMA KARTU AKTIF</text><text x="753" y="466" fill="#ffffff" fill-opacity=".78" font-family="Arial" font-size="9" letter-spacing="2" text-anchor="middle">MEMBER ID</text></svg>`;
  const backSvg=`<svg xmlns="http://www.w3.org/2000/svg" width="860" height="540" viewBox="0 0 860 540"><defs><linearGradient id="back" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f7f8f6"/><stop offset="1" stop-color="#ead9cc"/></linearGradient></defs><rect width="860" height="540" rx="38" fill="url(#back)" stroke="#ead8cb" stroke-width="3"/><text x="68" y="76" fill="#7a8782" font-family="Arial" font-weight="700" font-size="16" letter-spacing="4">REICHAS CHELEBES</text><image href="${houseHref}" x="430" y="0" width="430" height="540" preserveAspectRatio="xMidYMid slice" opacity=".34"/><image href="${compassHref}" x="500" y="38" width="320" height="320" preserveAspectRatio="xMidYMid meet" opacity=".20"/><text x="68" y="130" fill="#b83c35" font-family="Arial" font-weight="700" font-size="32">Bangga menjadi bagian</text><text x="68" y="172" fill="#b83c35" font-family="Arial" font-weight="700" font-size="32">Keluarga RCS.CBS.</text><text x="68" y="235" fill="#667478" font-family="Arial" font-size="18">Di mana pun langkah membawa kita,</text><text x="68" y="268" fill="#667478" font-family="Arial" font-size="18">Keluarga Reichas Chelebes tetap terhubung.</text><text x="68" y="310" fill="#667478" font-family="Arial" font-size="17">Kartu ini adalah identitas anggota—jembatan</text><text x="68" y="340" fill="#667478" font-family="Arial" font-size="17">komunikasi, koordinasi, dan kepedulian.</text><text x="68" y="370" fill="#899695" font-family="Arial" font-size="12" font-weight="700" letter-spacing="2">PEMILIK LEGACY</text><text x="68" y="398" fill="#5f6e6e" font-family="Arial" font-size="18" font-weight="700">${parent}</text><text x="68" y="434" fill="#899695" font-family="Arial" font-size="12" font-weight="700" letter-spacing="2">NAMA ANGKATAN</text><text x="68" y="462" fill="#5f6e6e" font-family="Arial" font-size="18" font-weight="700">${cohort}</text><text x="68" y="498" fill="#5f6e6e" font-family="Arial" font-size="12" font-weight="700" letter-spacing=".2">${reg}</text><text x="650" y="472" fill="#b83c35" fill-opacity=".24" font-family="Arial" font-weight="700" font-size="22" letter-spacing="4" text-anchor="middle">RCS.CBS HOPE</text></svg>`;
  if (mode==='png') {
    const loadSvgImage=src=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=reject;image.src=`data:image/svg+xml;charset=utf-8,${encodeURIComponent(src)}`;});
    try { const [frontImage,backImage]=await Promise.all([loadSvgImage(frontSvg),loadSvgImage(backSvg)]); const scale=2,pad=54,header=44,gap=36,cardW=860,cardH=540; const canvas=document.createElement('canvas'); canvas.width=(cardW+pad*2)*scale; canvas.height=(header+pad+cardH*2+gap+pad)*scale; const ctx=canvas.getContext('2d'); ctx.fillStyle='#f3f6f4'; ctx.fillRect(0,0,canvas.width,canvas.height); ctx.fillStyle='#142228'; ctx.font='700 22px Arial'; ctx.fillText('RCS.CBS HOPE  ·  DIGITAL MEMBER CARD',pad*scale,30*scale); ctx.fillStyle='#bd4037'; ctx.fillRect(pad*scale,36*scale,120*scale,3*scale); ctx.shadowColor='rgba(20,34,40,.18)'; ctx.shadowBlur=18*scale; ctx.shadowOffsetY=7*scale; ctx.drawImage(frontImage,pad*scale,(header+pad)*scale,cardW*scale,cardH*scale); ctx.drawImage(backImage,pad*scale,(header+pad+cardH+gap)*scale,cardW*scale,cardH*scale); ctx.shadowColor='transparent'; canvas.toBlob(blob=>{if(!blob){toast('Kartu PNG gagal dibuat');w.close();return;}const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=`kartu-${String(member.name||'anggota').toLowerCase().replace(/[^a-z0-9]+/g,'-')}.png`;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>{URL.revokeObjectURL(url);w.close();},500);},'image/png'); } catch (_) { w.close(); toast('Kartu PNG gagal dibuat. Coba PDF.'); }
    return;
  }
  w.document.write(`<!doctype html><html><head><title>Kartu ${xmlEscape(member.name)}</title><style>@page{size:auto;margin:12mm}*{box-sizing:border-box;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}body{margin:0;background:#fff;font-family:Arial,sans-serif;color:#142228}.print-sheet{display:flex;gap:8mm;align-items:flex-start;flex-wrap:wrap}.print-card{width:86mm;height:54mm;display:block;flex:0 0 86mm}.print-card img{display:block;width:86mm;height:54mm}.caption{font:10pt Arial;color:#69747a;margin-top:8mm}@media print{.caption{display:none}}</style></head><body><div class="print-sheet"><div class="print-card"><img src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(frontSvg)}" alt="Kartu depan" /></div><div class="print-card"><img src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(backSvg)}" alt="Kartu belakang" /></div></div><div class="caption">Kartu sudah dibuat sebagai gambar siap cetak. Pilih “Save as PDF” atau cetak pada skala 100%.</div><script>setTimeout(function(){window.print()},450)<\/script></body></html>`);
  w.document.close();
}
$('#registrationForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget; const alert = $('#registrationAlert'); const successPanel=$('#registrationSuccess'); clearAlert(alert); successPanel?.classList.add('hidden');
  const data = new FormData(form); const file = data.get('photo');
  if (!validPhone(data.get('parent_phone'))) { alertBox(alert, 'Nomor WhatsApp tidak valid. Gunakan format 08xxxxxxxxxx atau 628xxxxxxxxxx.', 'error'); return; }
  const button = form.querySelector('button[type=submit]'); button.disabled = true; button.innerHTML='Mengunggah foto…';
  try {
    requireBackend();
    const photo = await uploadPhoto(file);
    button.innerHTML='Menyimpan data…';
    const payload = { name:data.get('name').trim().toUpperCase(), parent_name:data.get('parent_name').trim().toUpperCase(), cohort_name:data.get('cohort_name').trim().toUpperCase(), cohort_year:null, blood_type:data.get('blood_type'), parent_phone:normalizePhone(data.get('parent_phone')), parent_address:data.get('parent_address').trim().toUpperCase(), photo_path:photo.path, photo_url:photo.url, consent:Boolean(data.get('consent')), status:'Menunggu Verifikasi' };
    let member;
    if (isConfigured()) {
      /*
       * Do not chain .select() here. Public visitors are allowed to INSERT
       * registrations, but they are intentionally not allowed to SELECT the
       * private members table. INSERT ... RETURNING therefore gets rejected
       * by RLS even though the INSERT policy itself is correct.
       */
      const { error } = await withTimeout(
        sb.from('members').insert(payload),
        30000,
        'Penyimpanan terlalu lama. Periksa koneksi Supabase lalu coba lagi.'
      );
      if (error) throw error;
      member={...payload, registration_number:null, public_token:null};
    }
    else { const items=demoMembers(); member={...payload,id:uuid(),public_token:uuid(),registration_number:null}; items.push(member); saveDemo(items); }
    activeMember=member; form.reset();
    alertBox(alert, 'Data berhasil dikirim. Silakan bergabung ke grup WhatsApp dan hubungi admin agar data diperiksa dan disetujui.', 'success');
    toast('Data anggota berhasil disimpan');
    setTimeout(()=>{
      successPanel?.classList.remove('hidden');
      $('#cek').scrollIntoView({behavior:'smooth'});
      renderResult(member);
    }, 450);
  } catch (error) { console.error(error); successPanel?.classList.add('hidden'); alertBox(alert, error.message || 'Data belum tersimpan. Coba lagi.', 'error'); }
  finally { button.disabled=false; button.innerHTML='Kirim data anggota <span>→</span>'; }
});

$('#successViewCard')?.addEventListener('click',()=>$('#cek')?.scrollIntoView({behavior:'smooth'}));

const photoInput=$('#registrationForm input[name="photo"]');
const photoPreview=$('#photoPreview');
const photoPreviewImage=$('#photoPreviewImage');
const photoPreviewName=$('#photoPreviewName');
const photoPreviewMeta=$('#photoPreviewMeta');
const clearPhoto=$('#clearPhoto');
function resetPhotoPreview(){ if(photoInput) photoInput.value=''; photoPreview?.classList.add('hidden'); if(photoPreviewImage) photoPreviewImage.removeAttribute('src'); }
photoInput?.addEventListener('change',()=>{
  const file=photoInput.files?.[0]; if(!file){resetPhotoPreview();return;}
  if(file.size>5*1024*1024){ alertBox($('#registrationAlert'),'Foto maksimal 5 MB. Pilih foto yang lebih kecil.','error'); resetPhotoPreview(); return; }
  if(photoPreviewImage) photoPreviewImage.src=URL.createObjectURL(file);
  if(photoPreviewName) photoPreviewName.textContent=file.name;
  if(photoPreviewMeta) photoPreviewMeta.textContent=`${(file.size/1024/1024).toFixed(2)} MB · siap dikirim`;
  photoPreview?.classList.remove('hidden'); clearAlert($('#registrationAlert'));
});
clearPhoto?.addEventListener('click',resetPhotoPreview);

function isUuid(value) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value); }
function normalizeVerificationInput(value='') {
  let raw=String(value || '').trim();
  try { raw=decodeURIComponent(raw); } catch (_) {}
  try {
    const url=new URL(raw);
    if(url.hash.startsWith('#verify=')) return decodeURIComponent(url.hash.slice(8)).trim();
    if(url.searchParams.get('registration')) return url.searchParams.get('registration').trim();
  } catch (_) {}
  if(raw.startsWith('#verify=')) return raw.slice(8).trim();
  return raw;
}
function trailingVerificationCode(value='') { const raw=normalizeVerificationInput(value); const parts=raw.split(/[·•|]/).map(part=>part.trim()).filter(Boolean); return (parts.at(-1) || raw).replace(/[^a-z0-9]/gi,'').toUpperCase(); }
async function findMember(value) {
  const key=normalizeVerificationInput(value); if (!key) return null;
  const registrationKey=key.toUpperCase(); const trailingCode=trailingVerificationCode(key);
  if (isConfigured()) {
    const lookup=isUuid(key) ? key : (registrationKey || trailingCode);
    const {data,error}=await sb.rpc('verify_member',{p_key:lookup});
    if (error) {
      if (error.code === 'PGRST202' || /verify_member/i.test(error.message || '')) {
        throw new Error('Layanan verifikasi belum diperbarui. Jalankan supabase/hotfix-v100-journey-map.sql di Supabase SQL Editor.');
      }
      throw error;
    }
    return Array.isArray(data) ? (data[0] || null) : (data || null);
  }
  const normalizedKey=key.replace(/\s+/g,'').toLowerCase();
  return demoMembers().find(m=>String(m.registration_number||'').replace(/\s+/g,'').toLowerCase()===normalizedKey || trailingVerificationCode(m.registration_number)===trailingCode || m.public_token===key) || null;
}
$('#verifyForm').addEventListener('submit', async (event)=>{event.preventDefault();const alert=$('#verifyAlert');clearAlert(alert);try{const member=await findMember($('#verifyInput').value);if(!member) {renderResult(null);alertBox(alert,'Data tidak ditemukan atau kartu belum aktif. Pastikan kode benar dan sudah disetujui pengurus.','error');} else {renderResult(member);alertBox(alert,'Data anggota ditemukan.','success');}}catch(e){alertBox(alert,e.message||'Verifikasi gagal.','error')}});

let scanStream=null; let scanTimer=null;
function normalizeScanValue(raw) { return normalizeVerificationInput(raw); }
function stopScanner() { if (scanTimer) { clearInterval(scanTimer); scanTimer=null; } if (scanStream) { scanStream.getTracks().forEach(track=>track.stop()); scanStream=null; } const video=$('#scannerVideo'); if (video) video.srcObject=null; $('#scanPanel')?.classList.add('hidden'); }
async function startScanner() {
  const panel=$('#scanPanel'); const video=$('#scannerVideo'); const alert=$('#scanAlert'); panel.classList.remove('hidden'); clearAlert(alert);
  if (!('BarcodeDetector' in window)) { alertBox(alert,'Browser ini belum mendukung scan kamera otomatis. Masukkan nomor registrasi secara manual.','error'); return; }
  if (!navigator.mediaDevices?.getUserMedia) { alertBox(alert,'Izin kamera tidak tersedia. Pastikan website dibuka melalui HTTPS.','error'); return; }
  try {
    const wanted=['qr_code','code_128','code_39','ean_13','ean_8','upc_a','upc_e','codabar','itf']; let detector;
    try { detector=new BarcodeDetector({formats:wanted}); } catch (_) { detector=new BarcodeDetector(); }
    scanStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}},audio:false}); video.srcObject=scanStream; await video.play();
    scanTimer=setInterval(async()=>{ if (!scanStream || video.readyState<2) return; try { const codes=await detector.detect(video); if (codes?.length) { const value=normalizeScanValue(codes[0].rawValue || ''); if (!value) return; $('#verifyInput').value=value; stopScanner(); $('#verifyForm').requestSubmit(); } } catch (_) {} }, 250);
  } catch (error) { alertBox(alert,'Kamera tidak dapat dibuka. Izinkan akses kamera lalu coba lagi.','error'); }
}
$('#openScanner')?.addEventListener('click',startScanner); $('#closeScanner')?.addEventListener('click',stopScanner);

function statusClass(status){return status==='Aktif'?'active':status==='Perlu Perbaikan'?'fix':status==='Nonaktif'?'inactive':'pending';}
function adminPhotoMarkup(member){const src=photoUrlForMember(member);return src?`<img class="member-thumb" src="${safe(src)}" alt="" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='grid' /><span class="member-thumb-fallback" style="display:none">${safe(initials(member.name))}</span>`:`<span class="member-thumb-fallback">${safe(initials(member.name))}</span>`;}
function renderAdminRows(){
  // Data ganda tetap diperbolehkan; penyaringan dilakukan manual oleh pengurus.
  const items=adminMembers; const search=($('#adminSearch')?.value||'').trim().toLowerCase(); const status=($('#adminStatusFilter')?.value||'');
  const filtered=items.filter(m=>{const hay=[m.registration_number,m.name,m.parent_name,m.cohort_name,m.parent_phone,m.parent_address].filter(Boolean).join(' ').toLowerCase();return (!search||hay.includes(search))&&(!status||m.status===status);});
  const tbody=$('#membersTable'); if(!filtered.length){tbody.innerHTML=`<tr><td colspan="9" class="table-empty">${items.length?'Tidak ada data yang cocok.':'Belum ada data.'}</td></tr>`;return;}
  const option=(m,value,label)=>`<option ${m.status===value?'selected':''}>${label}</option>`;
  tbody.innerHTML=filtered.map(m=>{const order=String(items.length-items.findIndex(x=>x.id===m.id)).padStart(3,'0');return `<tr><td><span class="entry-order">${order}</span><small class="entry-order-label">urutan masuk</small></td><td>${adminPhotoMarkup(m)}</td><td><div class="registration-edit"><input class="registration-input" data-id="${safe(m.id)}" value="${safe(m.registration_number||'')}" placeholder="001 (nomor urut)" /><button class="btn btn-outline small save-registration" data-id="${safe(m.id)}" type="button">Simpan</button><button class="btn btn-outline small generate-registration" data-id="${safe(m.id)}" type="button">Generate ID</button></div></td><td><b>${safe(m.name)}</b><small class="table-subtext">${safe(m.cohort_name||'Angkatan belum diisi')}</small></td><td>${safe(m.parent_name)}</td><td>${safe(m.parent_phone||'—')}</td><td title="${safe(m.parent_address||'—')}">${safe(m.parent_address||'—')}</td><td><div class="status-control"><span class="status-chip status-${statusClass(m.status)}">${safe(m.status||'—')}</span><select class="status-select" data-id="${safe(m.id)}">${option(m,'Menunggu Verifikasi','Menunggu Verifikasi')}${option(m,'Perlu Perbaikan','Perlu Perbaikan')}${option(m,'Aktif','Aktif')}${option(m,'Nonaktif','Nonaktif')}</select></div></td><td><div class="table-actions"><button class="btn btn-outline small edit-member" data-id="${safe(m.id)}" type="button">Edit</button><button class="btn btn-outline small view-member" data-id="${safe(m.id)}" type="button">Lihat</button><button class="btn btn-danger small delete-member" data-id="${safe(m.id)}" type="button">Hapus</button></div></td></tr>`;}).join('');
  $$('.registration-input',tbody).forEach(el=>el.addEventListener('input',()=>{el.value=el.value.toUpperCase();}));
  $$('.save-registration',tbody).forEach(el=>el.addEventListener('click',()=>{const input=tbody.querySelector(`.registration-input[data-id="${el.dataset.id}"]`);updateRegistrationNumber(el.dataset.id,input?.value||'');}));$$('.generate-registration',tbody).forEach(el=>el.addEventListener('click',()=>{const input=tbody.querySelector(`.registration-input[data-id="${el.dataset.id}"]`);const generated=generateMemberId(input?.value||'');if(!generated)return;if(input)input.value=generated;updateRegistrationNumber(el.dataset.id,generated);}));
  $$('.status-select',tbody).forEach(el=>el.addEventListener('change',()=>updateStatus(el.dataset.id,el.value)));
  $$('.view-member',tbody).forEach(el=>el.addEventListener('click',()=>{const m=adminMembers.find(x=>x.id===el.dataset.id);openCardPreview(m);}));
  $$('.edit-member',tbody).forEach(el=>el.addEventListener('click',()=>{const m=adminMembers.find(x=>x.id===el.dataset.id);openEditMember(m);}));
  $$('.delete-member',tbody).forEach(el=>el.addEventListener('click',()=>deleteMember(el.dataset.id)));
}
async function loadMembers() {
  let items=[]; if (isConfigured()) { const { data, error }=await sb.from('members').select('*').order('created_at',{ascending:false}); if(error) throw error; items=data||[]; } else items=demoMembers(); adminMembers=items;
  $('#totalCount').textContent=items.length; $('#pendingCount').textContent=items.filter(x=>x.status==='Menunggu Verifikasi').length; $('#activeCount').textContent=items.filter(x=>x.status==='Aktif').length; $('#unassignedCount').textContent=items.filter(x=>!x.registration_number).length;
  renderAdminRows();
}
let editingMemberId = null;
function closeEditMember(){const modal=$('#editMemberModal');if(!modal)return;modal.classList.add('hidden');modal.setAttribute('aria-hidden','true');document.body.classList.remove('modal-open');editingMemberId=null;}
function openEditMember(member){
  if(!member)return;
  const modal=$('#editMemberModal'); const form=$('#editMemberForm'); if(!modal||!form)return;
  editingMemberId=member.id; form.reset();
  $('#editMemberId').value=member.id;
  $('#editName').value=member.name||''; $('#editParentName').value=member.parent_name||''; $('#editCohortName').value=member.cohort_name||'';
  $('#editBloodType').value=member.blood_type||''; $('#editParentPhone').value=member.parent_phone||''; $('#editParentAddress').value=member.parent_address||'';
  const passed=new Set(memberCompetencyCodes(member)); $$('#editMemberForm input[name="edit_competency"]').forEach(input=>{input.checked=passed.has(input.value);});
  $('#editMemberTitle').textContent=`Edit data — ${member.name||'anggota'}`;
  const preview=$('#editPhotoPreview'); if(preview){const src=photoUrlForMember(member);preview.src=src||'';preview.classList.toggle('hidden',!src);}
  clearAlert($('#editMemberAlert')); modal.classList.remove('hidden'); modal.setAttribute('aria-hidden','false'); document.body.classList.add('modal-open'); setTimeout(()=>$('#editName')?.focus(),50);
}
async function saveMemberEdit(event){
  event.preventDefault(); const form=event.currentTarget; const alert=$('#editMemberAlert'); clearAlert(alert);
  const name=$('#editName').value.trim().toUpperCase(); const parent_name=$('#editParentName').value.trim().toUpperCase(); const cohort_name=$('#editCohortName').value.trim().toUpperCase(); const blood_type=$('#editBloodType').value; const parent_phone=normalizePhone($('#editParentPhone').value); const parent_address=$('#editParentAddress').value.trim().toUpperCase(); const file=form.elements.edit_photo?.files?.[0];
  const competencies=$$('input[name="edit_competency"]:checked',form).map(input=>input.value).filter(code=>COMPETENCY_TRACKS.some(item=>item.code===code));
  if(!name||!parent_name||!cohort_name||!blood_type||!parent_phone||!parent_address){alertBox(alert,'Lengkapi semua data wajib terlebih dahulu.','error');return;}
  if(!validPhone(parent_phone)){alertBox(alert,'Nomor WhatsApp tidak valid. Gunakan format 08xxxxxxxxxx atau 628xxxxxxxxxx.','error');return;}
  const button=form.querySelector('button[type=submit]'); button.disabled=true; button.textContent='Menyimpan…';
  try{
    const payload={name,parent_name,cohort_name,cohort_year:null,blood_type,parent_phone,parent_address,competencies};
    if(file){const photo=await uploadPhoto(file);payload.photo_path=photo.path;payload.photo_url=photo.url;}
    if(isConfigured()){
      const {error}=await withTimeout(sb.from('members').update(payload).eq('id',editingMemberId),30000,'Penyimpanan terlalu lama. Periksa koneksi Supabase lalu coba lagi.'); if(error)throw error;
    } else {saveDemo(demoMembers().map(m=>m.id===editingMemberId?{...m,...payload}:m));}
    closeEditMember(); toast('Data anggota berhasil diperbarui'); await loadMembers();
  }catch(error){alertBox(alert,error.message||'Data gagal diperbarui.','error');}
  finally{button.disabled=false;button.textContent='Simpan perubahan';}
}
$('#editMemberForm')?.addEventListener('submit',saveMemberEdit); $('#closeEditMember')?.addEventListener('click',closeEditMember); $('[data-close-edit]')?.addEventListener('click',closeEditMember); document.addEventListener('keydown',event=>{if(event.key==='Escape')closeEditMember();});
const editPhotoInput=$('#editMemberForm input[name="edit_photo"]'); editPhotoInput?.addEventListener('change',()=>{const file=editPhotoInput.files?.[0];const preview=$('#editPhotoPreview');if(!preview)return;if(file){preview.src=URL.createObjectURL(file);preview.classList.remove('hidden');}else preview.classList.add('hidden');});

async function deleteMember(id) {
  if (!window.confirm('Hapus data anggota ini? Tindakan ini tidak dapat dibatalkan.')) return;
  try {
    if (isConfigured()) { const { error } = await sb.from('members').delete().eq('id', id); if (error) throw error; }
    else { saveDemo(demoMembers().filter(member => member.id !== id)); }
    toast('Data anggota dihapus'); await loadMembers();
  } catch (error) { toast(error.message || 'Data gagal dihapus'); }
}
function romanNumber(value){const map=[[1000,'M'],[900,'CM'],[500,'D'],[400,'CD'],[100,'C'],[90,'XC'],[50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']];let n=value;return map.reduce((out,[unit,symbol])=>{while(n>=unit){out+=symbol;n-=unit;}return out;},'');}
function arabicIndic(value){return String(value).replace(/[0-9]/g,d=>'٠١٢٣٤٥٦٧٨٩'[Number(d)]);}
function generateMemberId(sequence){const clean=String(sequence||'').trim();if(!/^\d{1,4}$/.test(clean)){toast('Masukkan nomor urut admin terlebih dahulu, contoh 001');return null;}const ordinal=Number(clean);if(ordinal<1||ordinal>3999){toast('Nomor urut harus antara 001 sampai 3999');return null;}const bytes=new Uint8Array(5);if(window.crypto?.getRandomValues)window.crypto.getRandomValues(bytes);else for(let i=0;i<bytes.length;i++)bytes[i]=Math.floor(Math.random()*256);const secret=[...bytes].map(x=>x.toString(36).toUpperCase().padStart(2,'0')).join('').slice(0,6);const arabicMarker=arabicIndic('8675').split('').join('.');return `RCS.CBS · ${arabicMarker} · ${romanNumber(ordinal)} · ${secret}`;}
async function updateRegistrationNumber(id,value){const registration_number=String(value||'').trim().toUpperCase();if(!registration_number){toast('Isi nomor registrasi terlebih dahulu');return;}try{if(isConfigured()){const {error}=await sb.from('members').update({registration_number}).eq('id',id);if(error)throw error;}else{const items=demoMembers().map(m=>m.id===id?{...m,registration_number}:m);saveDemo(items)}toast('Nomor registrasi disimpan');await loadMembers();}catch(e){toast(e.message||'Nomor registrasi gagal disimpan')}}
async function updateStatus(id,status){try{if(isConfigured()){const {error}=await sb.from('members').update({status}).eq('id',id);if(error)throw error;}else{const items=demoMembers().map(m=>m.id===id?{...m,status}:m);saveDemo(items)}toast('Status diperbarui');loadMembers();}catch(e){toast(e.message||'Status gagal diperbarui')}}
$('#adminLoginForm').addEventListener('submit',async e=>{e.preventDefault();const alert=$('#adminAlert');clearAlert(alert);try{if(!isConfigured()){if(!localDemoAllowed)throw new Error('Koneksi server belum siap di perangkat ini. Muat ulang halaman lalu coba lagi.');alertBox(alert,'Mode demo aktif: dashboard contoh dibuka. Isi config.js untuk login Supabase.','success');$('#adminLoginView').classList.add('hidden');$('#adminDashboardView').classList.remove('hidden');loadMembers();return;}const {error}=await sb.auth.signInWithPassword({email:$('#adminEmail').value,password:$('#adminPassword').value});if(error)throw error;$('#adminLoginView').classList.add('hidden');$('#adminDashboardView').classList.remove('hidden');await loadMembers();}catch(e){alertBox(alert,e.message||'Login gagal.','error')}});
function csvCell(value){let text=String(value ?? '').replace(/[\r\n]+/g,' ');if(/^[=+\-@\t]/.test(text))text=`'${text}`;return `"${text.replace(/"/g,'""')}"`;}
function downloadMembersCsv(){const headers=['No. Registrasi','Nama Anggota','Nama Orang Tua','Nama Angkatan Orang Tua','Golongan Darah Anggota','WhatsApp Orang Tua','Alamat Orang Tua','Status','Kompetensi Lulus','Tanggal Input'];const rows=adminMembers.map(m=>[m.registration_number,m.name,m.parent_name,m.cohort_name,m.blood_type,m.parent_phone,m.parent_address,m.status,memberCompetencyCodes(m).map(code=>COMPETENCY_TRACKS.find(item=>item.code===code)?.label).filter(Boolean).join(' | '),m.created_at].map(csvCell).join(','));const csv='\ufeff'+[headers.map(csvCell).join(','),...rows].join('\r\n');const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='data-anggota-rcs-cbs-hope.csv';document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);toast('Data berhasil diunduh');}
$('#downloadMembers')?.addEventListener('click',downloadMembersCsv);$('#adminSearch')?.addEventListener('input',renderAdminRows);$('#adminStatusFilter')?.addEventListener('change',renderAdminRows);$('#clearAdminFilters')?.addEventListener('click',()=>{if($('#adminSearch'))$('#adminSearch').value='';if($('#adminStatusFilter'))$('#adminStatusFilter').value='';renderAdminRows();});$('#refreshMembers').addEventListener('click',()=>loadMembers());$('#adminSignOut').addEventListener('click',async()=>{if(isConfigured())await sb.auth.signOut();$('#adminDashboardView').classList.add('hidden');$('#adminLoginView').classList.remove('hidden');toast('Anda telah keluar');});

let adminTaps=0; let adminTapTimer=null;
$('#adminTrigger')?.addEventListener('click',(event)=>{event.preventDefault();adminTaps++;clearTimeout(adminTapTimer);adminTapTimer=setTimeout(()=>{adminTaps=0;},1800);if(adminTaps>=5){adminTaps=0;const panel=$('#pengurus');panel.classList.toggle('hidden');if(!panel.classList.contains('hidden')){panel.scrollIntoView({behavior:'smooth'});toast('Area pengurus dibuka');}else{toast('Area pengurus ditutup');}}});
function routeFromHash(){const hash=window.location.hash;if(hash.startsWith('#verify=')){let token='';try{token=decodeURIComponent(hash.slice(8));}catch(_){token=hash.slice(8);}$('#verifyInput').value=token;$('#cek').scrollIntoView({behavior:'smooth'});findMember(token).then(renderResult).catch(()=>renderResult(null));}}
routeFromHash(); window.addEventListener('hashchange',routeFromHash);
// In demo mode the form works locally; production setup is documented in README.md.
