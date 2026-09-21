const cfg = window.RCS_CONFIG || {};
const hasSupabase = Boolean(cfg.supabaseUrl && cfg.supabaseAnonKey && window.supabase?.createClient);
const sb = hasSupabase ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey) : null;
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const demoKey = 'rcs-cbs-hope-demo-members';
const demoMembers = () => JSON.parse(localStorage.getItem(demoKey) || '[]');
const saveDemo = (items) => localStorage.setItem(demoKey, JSON.stringify(items));
const safe = (v='') => String(v).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const initials = (name='') => name.split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase() || 'RC';
const siteUrl = () => cfg.siteUrl || window.location.origin;
const verifyUrl = (token) => `${siteUrl()}/#verify=${token}`;
let activeMember = null;

function alertBox(el, message, kind='success') { el.textContent = message; el.className = `form-alert ${kind}`; }
function clearAlert(el) { el.textContent=''; el.className='form-alert'; }
function toast(message) { const el=$('#toast'); el.textContent=message; el.classList.add('show'); setTimeout(()=>el.classList.remove('show'),2800); }
function isConfigured() { return hasSupabase; }
function demoRegistration(n) { return `${String(n).padStart(3,'0')}/RCSCBS/HOPE/2026`; }

async function uploadPhoto(file) {
  if (!file) return { path:null, url:null };
  if (file.size > 5 * 1024 * 1024) throw new Error('Ukuran foto maksimal 5 MB.');
  if (!isConfigured()) return { path: `demo/${file.name}`, url: URL.createObjectURL(file) };
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await sb.storage.from('member-photos').upload(path, file, { upsert:false, contentType:file.type });
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

function photoUrlForMember(member) {
  if (isConfigured() && member.photo_path) return sb.storage.from('member-photos').getPublicUrl(member.photo_path).data.publicUrl;
  return member.photo_url || '';
}
function cardPhotoMarkup(member) {
  const photoSrc=photoUrlForMember(member);
  const fallback = `<div class="id-card-photo placeholder" style="display:${photoSrc ? 'none' : 'grid'}">${safe(initials(member.name))}</div>`;
  if (!photoSrc) return `<div class="photo-shell">${fallback}</div>`;
  return `<div class="photo-shell"><img class="id-card-photo" src="${safe(photoSrc)}" alt="Foto ${safe(member.name)}" onerror="this.style.display='none';this.nextElementSibling.style.display='grid'" />${fallback}</div>`;
}

function renderResult(member, target=$('#verificationResult')) {
  if (!member) { target.innerHTML='<div class="empty"><span>×</span><strong>Data tidak ditemukan</strong><small>Periksa nomor registrasi atau hubungi pengurus.</small></div>'; return; }
  const logo = $('.brand img')?.src || '';
  target.innerHTML = `<div class="verification-card-wrap"><div class="verification-card-visual"><div class="id-card-face verification-id-card" id="verifiedFront"><div class="membership-watermark">MEMBERS ONLY</div><div class="id-card-top"><img class="id-card-logo" src="${safe(logo)}" alt="Logo RCS.CBS HOPE" /><span class="id-card-badge">${safe(member.status || 'ANGGOTA')}</span></div><div class="id-card-main">${cardPhotoMarkup(member)}<div><span class="id-card-label">Nama anggota</span><div class="id-card-name">${safe(member.name).toUpperCase()}</div><div class="id-card-reg">${safe(member.registration_number || 'Nomor belum diterbitkan')}</div><div class="id-card-blood">GOL. DARAH <b>${safe(member.blood_type)}</b></div><div class="id-card-tagline">PENCINTA ALAM · COMMUNITY MEMBER</div></div></div><div class="id-card-qr"><canvas id="resultQr"></canvas></div><div class="id-card-bottom"><span>RCS.CBS HOPE · 2026</span><span>MEMBER ID</span></div></div><div class="id-card-back verification-card-back hidden" id="verifiedBack"><div class="back-copy"><span class="back-kicker">REICHAS CHELEBES</span><strong>Bangga menjadi bagian Keluarga Pencinta Alam.</strong><p>Saling mengenal, saling menjaga. Kartu ini adalah identitas anggota untuk kegiatan organisasi pencinta alam.</p></div><div class="back-detail"><span>Pemilik legacy: ${safe(member.parent_name)}</span><span>Angkatan: ${safe(member.cohort_year)}</span></div></div></div><div class="verification-card-info"><div><span>Pemilik legacy</span><strong>${safe(member.parent_name)}</strong></div><div><span>Golongan darah</span><strong>${safe(member.blood_type)}</strong></div><div><span>Angkatan</span><strong>${safe(member.cohort_year)}</strong></div></div><div class="verification-actions"><button class="btn btn-dark" id="printMemberCard" type="button">Download Kartu PDF <b>↓</b></button><button class="btn btn-outline" id="toggleCardSide" type="button">Lihat sisi belakang <b>↔</b></button></div></div>`;
  renderQRCode($('#resultQr'), verifyUrl(member.public_token || member.id));
  $('#printMemberCard')?.addEventListener('click', () => openPrintCard(member));
  $('#toggleCardSide')?.addEventListener('click', (event) => {
    const front=$('#verifiedFront'); const back=$('#verifiedBack'); const showingBack=!back.classList.contains('hidden');
    front.classList.toggle('hidden', !showingBack); back.classList.toggle('hidden', showingBack);
    event.currentTarget.innerHTML=showingBack ? 'Lihat sisi belakang <b>↔</b>' : 'Lihat sisi depan <b>↔</b>';
  });
}
function openCardPreview(member) {
  if (!member) { toast('Data anggota tidak ditemukan.'); return; }
  const modal=$('#cardModal'); const body=$('#cardModalBody'); const logo=$('.brand img')?.src || ''; const compass=$('#compassCardVisual')?.src || '';
  body.innerHTML=`<div class="id-card-preview"><div class="id-card-face"><div class="membership-watermark">MEMBERS ONLY</div><div class="id-card-top"><img class="id-card-logo" src="${safe(logo)}" alt="Logo RCS.CBS HOPE" /><span class="id-card-badge">${safe(member.status || 'ANGGOTA')}</span></div><div class="id-card-main">${cardPhotoMarkup(member)}<div><span class="id-card-label">Nama anggota</span><div class="id-card-name">${safe(member.name).toUpperCase()}</div><div class="id-card-reg">${safe(member.registration_number || 'Nomor belum diterbitkan')}</div><div class="id-card-blood">GOL. DARAH <b>${safe(member.blood_type)}</b></div><div class="id-card-tagline">PENCINTA ALAM · COMMUNITY MEMBER</div></div></div><div class="id-card-qr"><canvas id="modalQr"></canvas></div><div class="id-card-bottom"><span>RCS.CBS HOPE · 2026</span><span>MEMBER ID</span></div></div><div class="id-card-back"><img class="back-compass-img" src="${safe(compass)}" alt="Kompas mata angin" /><div class="back-copy"><span class="back-kicker">REICHAS CHELEBES</span><strong>Bangga menjadi bagian Keluarga Pencinta Alam.</strong><p>Saling mengenal, saling menjaga. Kartu ini adalah identitas anggota untuk kegiatan organisasi pencinta alam.</p></div><div class="back-detail"><span>Pemilik legacy: ${safe(member.parent_name)}</span><span>Angkatan: ${safe(member.cohort_year)}</span></div></div></div><div class="modal-actions"><button class="btn btn-dark" id="modalPrintCard" type="button">Download Kartu PDF <b>↓</b></button></div>`;
  renderQRCode($('#modalQr'), verifyUrl(member.public_token || member.id)); $('#modalPrintCard')?.addEventListener('click',()=>openPrintCard(member)); modal.classList.remove('hidden'); document.body.classList.add('modal-open');
}
function closeCardPreview(){ $('#cardModal')?.classList.add('hidden'); document.body.classList.remove('modal-open'); }
$('#closeCardModal')?.addEventListener('click',closeCardPreview); $('[data-close-card]')?.addEventListener('click',closeCardPreview); document.addEventListener('keydown',event=>{if(event.key==='Escape') closeCardPreview();});
function xmlEscape(value='') { return String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[ch])); }
function makeQrDataUrl(value) {
  if (typeof window.QRCode !== 'function') return '';
  const holder=document.createElement('div'); holder.style.cssText='position:fixed;left:-9999px;top:-9999px;width:240px;height:240px'; document.body.appendChild(holder);
  try { new window.QRCode(holder,{text:value,width:240,height:240,correctLevel:window.QRCode.CorrectLevel?.M || 0}); const image=holder.querySelector('img'); const canvas=holder.querySelector('canvas'); return image?.src || canvas?.toDataURL?.() || ''; } catch (_) { return ''; } finally { setTimeout(()=>holder.remove(),0); }
}
async function imageToDataUrl(url) {
  if (!url || url.startsWith('data:')) return url || '';
  try { const response=await fetch(url, {mode:'cors'}); if (!response.ok) return ''; const blob=await response.blob(); return await new Promise(resolve=>{const reader=new FileReader(); reader.onload=()=>resolve(reader.result); reader.onerror=()=>resolve(''); reader.readAsDataURL(blob);}); } catch (_) { return ''; }
}
async function openPrintCard(member) {
  const w=window.open('','_blank','width=1100,height=800'); if(!w){toast('Izinkan pop-up untuk mencetak kartu.');return;}
  w.document.write('<p style="font-family:Arial;padding:24px">Menyiapkan kartu…</p>');
  const logo = $('.brand img')?.src || '';
  const compass = $('#compassCardVisual')?.src || '';
  const photo = photoUrlForMember(member);
  const photoData = await imageToDataUrl(photo);
  const qr = verifyUrl(member.public_token || member.id);
  const qrSrc = makeQrDataUrl(qr);
  const name=xmlEscape(member.name).toUpperCase(); const reg=xmlEscape(member.registration_number || 'Nomor belum diterbitkan'); const blood=xmlEscape(member.blood_type || '-'); const parent=xmlEscape(member.parent_name || '-'); const cohort=xmlEscape(member.cohort_year || '-'); const status=xmlEscape(member.status || 'ANGGOTA'); const statusWidth=Math.max(112,Math.min(220,34+String(member.status || 'ANGGOTA').length*8)); const statusX=860-55-statusWidth; const photoHref=xmlEscape(photoData || photo); const logoHref=xmlEscape(logo); const compassHref=xmlEscape(compass); const qrHref=xmlEscape(qrSrc);
  const frontSvg=`<svg xmlns="http://www.w3.org/2000/svg" width="860" height="540" viewBox="0 0 860 540"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#112129"/><stop offset=".62" stop-color="#1b3740"/><stop offset="1" stop-color="#496b70"/></linearGradient></defs><rect width="860" height="540" rx="38" fill="url(#bg)"/><rect x="11" y="11" width="838" height="518" rx="30" fill="none" stroke="#c8a675" stroke-opacity=".38" stroke-width="2"/><circle cx="760" cy="410" r="210" fill="none" stroke="#ffffff" stroke-opacity=".12" stroke-width="2"/><circle cx="760" cy="410" r="165" fill="none" stroke="#ffffff" stroke-opacity=".08" stroke-width="20"/><rect x="275" y="452" width="265" height="42" rx="21" fill="#ffffff" fill-opacity=".07" stroke="#ffffff" stroke-opacity=".26"/><text x="407" y="479" fill="#ffffff" fill-opacity=".78" font-family="Arial" font-weight="700" font-size="18" letter-spacing="3" text-anchor="middle">MEMBERS ONLY</text><image href="${logoHref}" x="60" y="48" width="90" height="90" preserveAspectRatio="xMidYMid slice"/><rect x="${statusX}" y="52" width="${statusWidth}" height="42" rx="21" fill="none" stroke="#ffffff" stroke-opacity=".65"/><text x="${statusX + statusWidth/2}" y="78" fill="#ffffff" font-family="Arial" font-size="15" text-anchor="middle">${status}</text><rect x="60" y="225" width="150" height="180" rx="18" fill="#efe3d8"/><text x="135" y="330" fill="#8d594d" font-family="Arial" font-weight="700" font-size="54" text-anchor="middle">${xmlEscape(initials(member.name))}</text>${(photoData || photo) ? `<image href="${photoHref}" x="60" y="225" width="150" height="180" preserveAspectRatio="xMidYMid slice"/>` : ''}<text x="245" y="250" fill="#ffffff" fill-opacity=".65" font-family="Arial" font-size="14" letter-spacing="3">NAMA ANGGOTA</text><text x="245" y="293" fill="#ffffff" font-family="Arial" font-weight="700" font-size="34">${name}</text><text x="245" y="325" fill="#ffffff" fill-opacity=".75" font-family="Arial" font-size="16">${reg}</text><rect x="245" y="345" width="130" height="32" rx="16" fill="none" stroke="#f0a995" stroke-opacity=".75"/><text x="310" y="367" fill="#f0c4b4" font-family="Arial" font-size="13" text-anchor="middle">GOL. DARAH  ${blood}</text><line x1="245" y1="400" x2="505" y2="400" stroke="#e8c892" stroke-opacity=".45"/><text x="245" y="422" fill="#e8c892" fill-opacity=".9" font-family="Arial" font-weight="700" font-size="12" letter-spacing="2">PENCINTA ALAM · COMMUNITY MEMBER</text><rect x="690" y="245" width="126" height="126" rx="10" fill="#ffffff"/>${qrSrc ? `<image href="${qrHref}" x="697" y="252" width="112" height="112" preserveAspectRatio="xMidYMid meet"/>` : ''}<text x="753" y="405" fill="#e8c892" fill-opacity=".95" font-family="Arial" font-size="11" letter-spacing="2" text-anchor="middle">RCS.CBS HOPE · 2026</text><text x="753" y="430" fill="#ffffff" fill-opacity=".78" font-family="Arial" font-size="10" letter-spacing="2" text-anchor="middle">MEMBER ID</text></svg>`;
  const backSvg=`<svg xmlns="http://www.w3.org/2000/svg" width="860" height="540" viewBox="0 0 860 540"><defs><linearGradient id="back" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f7f8f6"/><stop offset="1" stop-color="#ead9cc"/></linearGradient></defs><rect width="860" height="540" rx="38" fill="url(#back)" stroke="#ead8cb" stroke-width="3"/><text x="68" y="76" fill="#7a8782" font-family="Arial" font-weight="700" font-size="16" letter-spacing="4">REICHAS CHELEBES</text><image href="${compassHref}" x="565" y="72" width="245" height="245" preserveAspectRatio="xMidYMid slice" opacity=".94"/><text x="68" y="130" fill="#b83c35" font-family="Arial" font-weight="700" font-size="32">Bangga menjadi bagian</text><text x="68" y="172" fill="#b83c35" font-family="Arial" font-weight="700" font-size="32">Keluarga Pencinta Alam.</text><text x="68" y="235" fill="#667478" font-family="Arial" font-size="18">Saling mengenal, saling menjaga.</text><text x="68" y="270" fill="#667478" font-family="Arial" font-size="17">Kartu ini adalah identitas anggota untuk kegiatan</text><text x="68" y="300" fill="#667478" font-family="Arial" font-size="17">organisasi pencinta alam.</text><text x="68" y="430" fill="#899695" font-family="Arial" font-size="15">Pemilik legacy: ${parent}</text><text x="68" y="462" fill="#899695" font-family="Arial" font-size="15">Angkatan: ${cohort}  ·  ${reg}</text><text x="650" y="472" fill="#b83c35" fill-opacity=".24" font-family="Arial" font-weight="700" font-size="22" letter-spacing="4" text-anchor="middle">RCS.CBS HOPE</text></svg>`;
  w.document.write(`<!doctype html><html><head><title>Kartu ${xmlEscape(member.name)}</title><style>@page{size:auto;margin:12mm}*{box-sizing:border-box;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}body{margin:0;background:#fff;font-family:Arial,sans-serif;color:#142228}.print-sheet{display:flex;gap:8mm;align-items:flex-start;flex-wrap:wrap}.print-card{width:86mm;height:54mm;display:block;flex:0 0 86mm}.print-card img{display:block;width:86mm;height:54mm}.caption{font:10pt Arial;color:#69747a;margin-top:8mm}@media print{.caption{display:none}}</style></head><body><div class="print-sheet"><div class="print-card"><img src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(frontSvg)}" alt="Kartu depan" /></div><div class="print-card"><img src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(backSvg)}" alt="Kartu belakang" /></div></div><div class="caption">Kartu sudah dibuat sebagai gambar siap cetak. Pilih “Save as PDF” atau cetak pada skala 100%.</div><script>setTimeout(function(){window.print()},450)<\/script></body></html>`);
  w.document.close();
}
$('#registrationForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget; const alert = $('#registrationAlert'); clearAlert(alert);
  const data = new FormData(form); const file = data.get('photo');
  const button = form.querySelector('button[type=submit]'); button.disabled = true; button.innerHTML='Menyimpan…';
  try {
    const photo = await uploadPhoto(file);
    const payload = { name:data.get('name').trim(), parent_name:data.get('parent_name').trim(), cohort_year:Number(data.get('cohort_year')), blood_type:data.get('blood_type'), parent_phone:data.get('parent_phone').trim(), photo_path:photo.path, photo_url:photo.url, consent:Boolean(data.get('consent')), status:'Menunggu Verifikasi' };
    let member;
    if (isConfigured()) { const { data: inserted, error } = await sb.from('members').insert(payload).select().single(); if (error) throw error; member=inserted; }
    else { const items=demoMembers(); member={...payload,id:crypto.randomUUID(),public_token:crypto.randomUUID(),registration_number:demoRegistration(items.length+1)}; items.push(member); saveDemo(items); }
    activeMember=member; form.reset(); alertBox(alert, `Data berhasil dikirim. Nomor sementara: ${member.registration_number || 'menunggu verifikasi pengurus'}.`, 'success'); toast('Data anak berhasil disimpan');
    setTimeout(()=>{ $('#cek').scrollIntoView({behavior:'smooth'}); renderResult(member); }, 450);
  } catch (error) { console.error(error); alertBox(alert, error.message || 'Data belum tersimpan. Coba lagi.', 'error'); }
  finally { button.disabled=false; button.innerHTML='Kirim data anak <span>→</span>'; }
});

async function findMember(value) {
  const key=value.trim(); if (!key) return null;
  if (isConfigured()) { const { data, error } = await sb.from('member_verification').select('*').or(`registration_number.eq.${key},public_token.eq.${key}`).maybeSingle(); if (error) throw error; return data; }
  return demoMembers().find(m=>m.registration_number?.toLowerCase()===key.toLowerCase() || m.public_token===key) || null;
}
$('#verifyForm').addEventListener('submit', async (event)=>{event.preventDefault();const alert=$('#verifyAlert');clearAlert(alert);try{const member=await findMember($('#verifyInput').value);if(!member) {renderResult(null);alertBox(alert,'Data tidak ditemukan. Periksa kembali nomor registrasi.','error');} else {renderResult(member);alertBox(alert,'Data anggota ditemukan.','success');}}catch(e){alertBox(alert,e.message||'Verifikasi gagal.','error')}});

let scanStream=null; let scanTimer=null;
function normalizeScanValue(raw) { try { const url=new URL(raw); if (url.hash.startsWith('#verify=')) return decodeURIComponent(url.hash.slice(8)); if (url.searchParams.get('registration')) return url.searchParams.get('registration'); } catch (_) {} return raw; }
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

async function loadMembers() {
  let items=[]; if (isConfigured()) { const { data, error }=await sb.from('members').select('*').order('created_at',{ascending:false}); if(error) throw error; items=data||[]; } else items=demoMembers();
  $('#totalCount').textContent=items.length; $('#pendingCount').textContent=items.filter(x=>x.status==='Menunggu Verifikasi').length; $('#activeCount').textContent=items.filter(x=>x.status==='Aktif').length;
  const tbody=$('#membersTable'); if(!items.length){tbody.innerHTML='<tr><td colspan="5" class="table-empty">Belum ada data.</td></tr>';return;} tbody.innerHTML=items.map(m=>`<tr><td>${safe(m.registration_number||'—')}</td><td><b>${safe(m.name)}</b></td><td>${safe(m.parent_name)}</td><td><select class="status-select" data-id="${safe(m.id)}"><option ${m.status==='Menunggu Verifikasi'?'selected':''}>Menunggu Verifikasi</option><option ${m.status==='Perlu Perbaikan'?'selected':''}>Perlu Perbaikan</option><option ${m.status==='Aktif'?'selected':''}>Aktif</option><option ${m.status==='Nonaktif'?'selected':''}>Nonaktif</option></select></td><td><div class="table-actions"><button class="btn btn-outline small view-member" data-id="${safe(m.id)}" type="button">Lihat</button><button class="btn btn-danger small delete-member" data-id="${safe(m.id)}" type="button">Hapus</button></div></td></tr>`).join('');
  $$('.status-select',tbody).forEach(el=>el.addEventListener('change',()=>updateStatus(el.dataset.id,el.value)));
  $$('.view-member',tbody).forEach(el=>el.addEventListener('click',()=>{const m=items.find(x=>x.id===el.dataset.id);openCardPreview(m);}));
  $$('.delete-member',tbody).forEach(el=>el.addEventListener('click',()=>deleteMember(el.dataset.id)));
}
async function deleteMember(id) {
  if (!window.confirm('Hapus data anggota ini? Tindakan ini tidak dapat dibatalkan.')) return;
  try {
    if (isConfigured()) { const { error } = await sb.from('members').delete().eq('id', id); if (error) throw error; }
    else { saveDemo(demoMembers().filter(member => member.id !== id)); }
    toast('Data anggota dihapus'); await loadMembers();
  } catch (error) { toast(error.message || 'Data gagal dihapus'); }
}
async function updateStatus(id,status){try{if(isConfigured()){const {error}=await sb.from('members').update({status}).eq('id',id);if(error)throw error;}else{const items=demoMembers().map(m=>m.id===id?{...m,status}:m);saveDemo(items)}toast('Status diperbarui');loadMembers();}catch(e){toast(e.message||'Status gagal diperbarui')}}
$('#adminLoginForm').addEventListener('submit',async e=>{e.preventDefault();const alert=$('#adminAlert');clearAlert(alert);try{if(!isConfigured()){alertBox(alert,'Mode demo aktif: dashboard contoh dibuka. Isi config.js untuk login Supabase.','success');$('#adminLoginView').classList.add('hidden');$('#adminDashboardView').classList.remove('hidden');loadMembers();return;}const {error}=await sb.auth.signInWithPassword({email:$('#adminEmail').value,password:$('#adminPassword').value});if(error)throw error;$('#adminLoginView').classList.add('hidden');$('#adminDashboardView').classList.remove('hidden');await loadMembers();}catch(e){alertBox(alert,e.message||'Login gagal.','error')}});
$('#refreshMembers').addEventListener('click',()=>loadMembers());$('#adminSignOut').addEventListener('click',async()=>{if(isConfigured())await sb.auth.signOut();$('#adminDashboardView').classList.add('hidden');$('#adminLoginView').classList.remove('hidden');toast('Anda telah keluar');});

let adminTaps=0; let adminTapTimer=null;
$('#adminTrigger')?.addEventListener('click',(event)=>{event.preventDefault();adminTaps++;clearTimeout(adminTapTimer);adminTapTimer=setTimeout(()=>{adminTaps=0;},1800);if(adminTaps>=5){adminTaps=0;const panel=$('#pengurus');panel.classList.toggle('hidden');if(!panel.classList.contains('hidden')){panel.scrollIntoView({behavior:'smooth'});toast('Area pengurus dibuka');}else{toast('Area pengurus ditutup');}}});
function routeFromHash(){const hash=window.location.hash;if(hash.startsWith('#verify=')){const token=decodeURIComponent(hash.slice(8));$('#verifyInput').value=token;$('#cek').scrollIntoView({behavior:'smooth'});findMember(token).then(renderResult).catch(()=>renderResult(null));}}
routeFromHash(); window.addEventListener('hashchange',routeFromHash);
// In demo mode the form works locally; production setup is documented in README.md.
