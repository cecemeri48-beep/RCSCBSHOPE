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
  canvas.replaceChildren();
  if (window.QRCode?.toCanvas) {
    window.QRCode.toCanvas(canvas, value, { width: 78, margin: 1, color:{dark:'#17212b',light:'#ffffff'} }, () => {});
  } else {
    canvas.textContent='QR'; canvas.className='qr-fallback';
  }
}

function renderResult(member, target=$('#verificationResult')) {
  if (!member) { target.innerHTML='<div class="empty-state"><span>×</span><h3>Data tidak ditemukan</h3><p>Periksa nomor registrasi atau hubungi pengurus.</p></div>'; return; }
  const photo = member.photo_url ? `<img class="result-photo" src="${safe(member.photo_url)}" alt="Foto ${safe(member.name)}" />` : `<div class="result-photo result-photo-placeholder">${safe(initials(member.name))}</div>`;
  target.innerHTML = `<div class="result-card"><div>${photo}</div><div><div class="result-kicker">Anggota aktif</div><h3>${safe(member.name)}</h3><div class="result-id">${safe(member.registration_number || 'Menunggu nomor registrasi')}</div><div class="result-meta"><div><span>Orang tua</span><strong>${safe(member.parent_name)}</strong></div><div><span>Gol. darah</span><strong>${safe(member.blood_type)}</strong></div><div><span>Angkatan</span><strong>${safe(member.cohort_year)}</strong></div><div><span>Status</span><strong>${safe(member.status || 'Aktif')}</strong></div></div></div><div class="qr-box"><canvas id="resultQr"></canvas></div><div class="print-actions"><button class="button button-primary" id="printMemberCard">Cetak / PDF <span>↗</span></button></div></div>`;
  renderQRCode($('#resultQr'), verifyUrl(member.public_token || member.id));
  $('#printMemberCard')?.addEventListener('click', () => openPrintCard(member));
}

function openPrintCard(member) {
  const logo = $('.brand img')?.src || '';
  const photo = member.photo_url ? `<img class="print-photo" src="${safe(member.photo_url)}" alt="" />` : `<div class="print-photo print-placeholder">${safe(initials(member.name))}</div>`;
  const qr = verifyUrl(member.public_token || member.id);
  const w = window.open('', '_blank', 'noopener,noreferrer,width=900,height=720');
  if (!w) { toast('Izinkan pop-up untuk mencetak kartu.'); return; }
  w.document.write(`<!doctype html><html><head><title>Kartu ${safe(member.name)}</title><style>@page{size:auto;margin:12mm}*{box-sizing:border-box}body{margin:0;background:#fff;font-family:Arial,sans-serif;color:#142228}.sheet{display:flex;gap:8mm;flex-wrap:wrap}.card{width:86mm;height:54mm;border-radius:4mm;padding:6mm;position:relative;overflow:hidden}.front{background:linear-gradient(135deg,#112129 0%,#1b3740 62%,#496b70 100%);color:#fff}.front:after{content:"";position:absolute;width:55mm;height:55mm;right:-18mm;bottom:-26mm;border:1px solid rgba(255,255,255,.2);border-radius:50%;box-shadow:0 0 0 7mm rgba(255,255,255,.04),0 0 0 14mm rgba(255,255,255,.03)}.top{position:relative;z-index:1;display:flex;justify-content:space-between;align-items:center}.logo{width:11mm;height:11mm;border-radius:50%;object-fit:cover;border:1px solid rgba(255,255,255,.8)}.tag{font-size:6pt;border:1px solid rgba(255,255,255,.55);padding:2mm;border-radius:999px;letter-spacing:.1em}.body{position:relative;z-index:1;display:flex;gap:4mm;align-items:center;margin-top:7mm}.print-photo{width:17mm;height:20mm;border-radius:2mm;object-fit:cover;background:#efe4da;border:1px solid rgba(255,255,255,.85)}.print-placeholder{display:grid;place-items:center;color:#8a4d42;font-weight:bold;font-size:14pt}.label{font-size:6pt;color:rgba(255,255,255,.62);text-transform:uppercase;letter-spacing:1pt}.name{font-size:14pt;font-weight:bold;margin:1mm 0}.id{font-size:6.5pt;color:rgba(255,255,255,.72)}.bottom{position:absolute;z-index:1;left:6mm;right:6mm;bottom:5mm;display:flex;justify-content:space-between;font-size:6pt;letter-spacing:1pt;color:rgba(255,255,255,.72)}.qr{width:16mm;height:16mm;background:white;position:absolute;right:6mm;bottom:13mm;padding:1mm;border-radius:1mm;z-index:2}.qr img{width:100%;height:100%}.back{background:linear-gradient(135deg,#eee1d6,#f7f8f6);border:1px solid #ead8cb}.back strong{display:block;color:#b83c35;font-size:11pt;margin:7mm 0 2mm}.back p{font-size:7pt;line-height:1.55;color:#6b7777;max-width:58mm}.back .watermark{position:absolute;right:6mm;bottom:5mm;color:rgba(189,64,55,.18);font-size:14pt;font-weight:bold;transform:rotate(-10deg)}.caption{font:10pt Arial;color:#69747a;margin-top:8mm}</style></head><body><div class="sheet"><div class="card front"><div class="top"><img class="logo" src="${safe(logo)}" alt="" /><span class="tag">${safe(member.status || 'ANGGOTA')}</span></div><div class="body">${photo}<div><div class="label">Nama anggota</div><div class="name">${safe(member.name).toUpperCase()}</div><div class="id">${safe(member.registration_number || 'Nomor belum diterbitkan')}</div><div class="id">${safe(member.parent_name)} · ${safe(member.blood_type)}</div></div></div><div class="qr"><img id="qr" alt="QR" /></div><div class="bottom"><span>RCS.CBS HOPE · 2026</span><span>MEMBER ID</span></div></div><div class="card back"><strong>Bangga menjadi bagian dari keluarga Reichas.</strong><p>Saling mengenal, saling menjaga. Kartu ini adalah identitas anggota dan digunakan untuk kegiatan Organisasi Reichas Chelebes.</p><div class="watermark">RCS.CBS HOPE</div></div></div><div class="caption">Cetak dengan skala 100% pada ukuran seperti KTP. Pilih “Save as PDF” untuk mengunduh.</div><script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.4/build/qrcode.min.js"><\/script><script>QRCode.toDataURL(${JSON.stringify(qr)},{width:160,margin:1},function(e,u){document.getElementById('qr').src=u;setTimeout(function(){window.print()},350)})<\/script></body></html>`);
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

async function loadMembers() {
  let items=[]; if (isConfigured()) { const { data, error }=await sb.from('members').select('*').order('created_at',{ascending:false}); if(error) throw error; items=data||[]; } else items=demoMembers();
  $('#totalCount').textContent=items.length; $('#pendingCount').textContent=items.filter(x=>x.status==='Menunggu Verifikasi').length; $('#activeCount').textContent=items.filter(x=>x.status==='Aktif').length;
  const tbody=$('#membersTable'); if(!items.length){tbody.innerHTML='<tr><td colspan="5" class="table-empty">Belum ada data.</td></tr>';return;} tbody.innerHTML=items.map(m=>`<tr><td>${safe(m.registration_number||'—')}</td><td><b>${safe(m.name)}</b></td><td>${safe(m.parent_name)}</td><td><select class="status-select" data-id="${safe(m.id)}"><option ${m.status==='Menunggu Verifikasi'?'selected':''}>Menunggu Verifikasi</option><option ${m.status==='Perlu Perbaikan'?'selected':''}>Perlu Perbaikan</option><option ${m.status==='Aktif'?'selected':''}>Aktif</option><option ${m.status==='Nonaktif'?'selected':''}>Nonaktif</option></select></td><td><button class="button button-ghost small view-member" data-id="${safe(m.id)}">Lihat</button></td></tr>`).join('');
  $$('.status-select',tbody).forEach(el=>el.addEventListener('change',()=>updateStatus(el.dataset.id,el.value)));
  $$('.view-member',tbody).forEach(el=>el.addEventListener('click',()=>{const m=items.find(x=>x.id===el.dataset.id);openCardPreview(m);}));
}
async function updateStatus(id,status){try{if(isConfigured()){const {error}=await sb.from('members').update({status}).eq('id',id);if(error)throw error;}else{const items=demoMembers().map(m=>m.id===id?{...m,status}:m);saveDemo(items)}toast('Status diperbarui');loadMembers();}catch(e){toast(e.message||'Status gagal diperbarui')}}
$('#adminLoginForm').addEventListener('submit',async e=>{e.preventDefault();const alert=$('#adminAlert');clearAlert(alert);try{if(!isConfigured()){alertBox(alert,'Mode demo aktif: dashboard contoh dibuka. Isi config.js untuk login Supabase.','success');$('#adminLoginView').classList.add('hidden');$('#adminDashboardView').classList.remove('hidden');loadMembers();return;}const {error}=await sb.auth.signInWithPassword({email:$('#adminEmail').value,password:$('#adminPassword').value});if(error)throw error;$('#adminLoginView').classList.add('hidden');$('#adminDashboardView').classList.remove('hidden');await loadMembers();}catch(e){alertBox(alert,e.message||'Login gagal.','error')}});
$('#refreshMembers').addEventListener('click',()=>loadMembers());$('#adminSignOut').addEventListener('click',async()=>{if(isConfigured())await sb.auth.signOut();$('#adminDashboardView').classList.add('hidden');$('#adminLoginView').classList.remove('hidden');toast('Anda telah keluar');});

function routeFromHash(){const hash=window.location.hash;if(hash.startsWith('#verify=')){const token=decodeURIComponent(hash.slice(8));$('#verifyInput').value=token;$('#cek').scrollIntoView({behavior:'smooth'});findMember(token).then(renderResult).catch(()=>renderResult(null));}}
routeFromHash(); window.addEventListener('hashchange',routeFromHash);
// In demo mode the form works locally; production setup is documented in README.md.
