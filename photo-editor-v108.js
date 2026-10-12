/* RCS.CBS HOPE v108 — local photo crop, drag and two-finger pinch.
 * No third-party library or network request. Only the final crop is uploaded.
 */
(() => {
  'use strict';
  const controllers=new WeakMap();
  const W=300,H=360,MAX_ZOOM=4;
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  function bind({input,container,onError=()=>{},onReady=()=>{},existingPreview=null}) {
    if(!input || !container || controllers.has(input))return;
    const key=container.id;
    container.classList.add('photo-adjuster','wide','hidden');
    container.innerHTML=`<div class="photo-adjuster-head"><strong>Atur foto anggota</strong><span class="photo-zoom-badge" aria-live="polite">100%</span></div>
      <p class="photo-adjuster-hint" id="${key}-hint">Cubit dengan 2 jari untuk zoom. Geser foto agar wajah pas di bingkai.</p>
      <div class="photo-crop-stage"><canvas class="photo-crop-canvas" width="600" height="720" tabindex="0" role="img" aria-label="Bingkai foto anggota. Gunakan penggeser zoom dan tombol panah untuk mengatur foto." aria-describedby="${key}-hint"></canvas><span class="photo-crop-guide" aria-hidden="true"></span></div>
      <div class="photo-zoom-controls"><button type="button" class="photo-zoom-out" aria-label="Perkecil foto">−</button><label class="photo-slider-label" for="${key}-zoom">Zoom foto<input class="photo-zoom-slider" id="${key}-zoom" type="range" min="100" max="400" step="1" value="100" /></label><button type="button" class="photo-zoom-in" aria-label="Perbesar foto">+</button></div>
      <div class="photo-adjuster-actions"><button type="button" class="photo-reset">Reset posisi</button><button type="button" class="photo-replace">Ganti foto</button></div>
      <p class="photo-adjuster-meta"></p><p class="photo-adjuster-note">Hasil dalam bingkai ini yang akan diunggah saat disimpan.</p>`;
    const canvas=container.querySelector('canvas'),ctx=canvas.getContext('2d');
    const slider=container.querySelector('input[type=range]'),badge=container.querySelector('.photo-zoom-badge'),meta=container.querySelector('.photo-adjuster-meta');
    let image=null,sourceFile=null,ready=Promise.resolve(),generation=0,zoom=1,x=0,y=0,gesture=null;
    const pointers=new Map();
    function disable(value){container.querySelectorAll('button,input').forEach(el=>el.disabled=value);}
    function baseScale(){return image?Math.max(W/image.naturalWidth,H/image.naturalHeight):1;}
    function bound(){
      if(!image)return;
      const scale=baseScale()*zoom;
      const maxX=Math.max(0,(image.naturalWidth*scale-W)/2),maxY=Math.max(0,(image.naturalHeight*scale-H)/2);
      x=clamp(x,-maxX,maxX); y=clamp(y,-maxY,maxY);
    }
    function draw(){
      bound();ctx.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);ctx.clearRect(0,0,W,H);
      if(image){const scale=baseScale()*zoom;const width=image.naturalWidth*scale,height=image.naturalHeight*scale;ctx.drawImage(image,(W-width)/2+x,(H-height)/2+y,width,height);}
      slider.value=String(Math.round(zoom*100));slider.setAttribute('aria-valuetext',`${Math.round(zoom*100)} persen`);badge.textContent=`${Math.round(zoom*100)}%`;
    }
    function zoomTo(next){const before=zoom;zoom=clamp(next,1,MAX_ZOOM);x*=zoom/before;y*=zoom/before;draw();rebase();}
    function point(event){const r=canvas.getBoundingClientRect();return {x:(event.clientX-r.left)*W/r.width,y:(event.clientY-r.top)*H/r.height};}
    function rebase(){gesture={points:[...pointers.values()].map(p=>({...p})),zoom,x,y};}
    function releasePointers(){for(const id of pointers.keys())if(canvas.hasPointerCapture(id))canvas.releasePointerCapture(id);pointers.clear();gesture=null;canvas.classList.remove('is-dragging');}
    function reset(){
      generation++;releasePointers();image=null;sourceFile=null;zoom=1;x=0;y=0;ready=Promise.resolve();
      container.classList.add('hidden');container.removeAttribute('aria-busy');disable(true);ctx.clearRect(0,0,canvas.width,canvas.height);
    }
    async function load(file){
      reset();if(!file || !file.size)return;
      if(!['image/jpeg','image/png','image/webp'].includes(file.type.toLowerCase()))throw new Error('Format foto harus JPG, PNG, atau WebP.');
      if(file.size>5*1024*1024)throw new Error('Foto maksimal 5 MB. Pilih foto yang lebih kecil.');
      const version=generation;sourceFile=file;container.classList.remove('hidden');container.setAttribute('aria-busy','true');
      if(existingPreview)existingPreview.classList.add('hidden');
      meta.textContent='Membuka foto…';
      const url=URL.createObjectURL(file),decoded=new Image();
      try {
        decoded.src=url;
        await new Promise((resolve,reject)=>{decoded.onload=resolve;decoded.onerror=()=>reject(new Error('Foto tidak dapat dibuka. Pilih foto JPG, PNG, atau WebP yang valid.'));});
        if(version!==generation)return;
        if(!decoded.naturalWidth || !decoded.naturalHeight)throw new Error('Ukuran foto tidak valid.');
        image=decoded;disable(false);container.removeAttribute('aria-busy');
        meta.textContent=`${file.name} · ${(file.size/1024/1024).toFixed(2)} MB`;draw();onReady();
      } finally {URL.revokeObjectURL(url);}
    }
    input.addEventListener('change',()=>{
      const file=input.files?.[0];
      const version=generation+1;
      ready=load(file).catch(error=>{
        if(generation!==version)return;
        reset();input.value='';onError(error.message || 'Foto tidak dapat diproses.');
      });
    });
    input.form?.addEventListener('reset',reset);
    canvas.addEventListener('pointerdown',event=>{
      if(!image || pointers.size>=2 || (event.pointerType==='mouse' && event.button!==0))return;
      event.preventDefault();canvas.focus({preventScroll:true});pointers.set(event.pointerId,point(event));canvas.setPointerCapture(event.pointerId);rebase();canvas.classList.add('is-dragging');
    });
    canvas.addEventListener('pointermove',event=>{
      if(!image || !pointers.has(event.pointerId))return;
      event.preventDefault();pointers.set(event.pointerId,point(event));const current=[...pointers.values()];
      if(current.length===1 && gesture.points.length===1){x=gesture.x+current[0].x-gesture.points[0].x;y=gesture.y+current[0].y-gesture.points[0].y;}
      else if(current.length===2 && gesture.points.length===2){
        const [a,b]=current,[u,v]=gesture.points;
        const distance=Math.hypot(a.x-b.x,a.y-b.y),initial=Math.hypot(u.x-v.x,u.y-v.y);
        if(initial>1){
          zoom=clamp(gesture.zoom*distance/initial,1,MAX_ZOOM);const ratio=zoom/gesture.zoom;
          const before={x:(u.x+v.x)/2,y:(u.y+v.y)/2},after={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
          x=after.x-(before.x-(W/2+gesture.x))*ratio-W/2;
          y=after.y-(before.y-(H/2+gesture.y))*ratio-H/2;
        }
      }
      draw();
    });
    function endPointer(event){if(!pointers.has(event.pointerId))return;pointers.delete(event.pointerId);rebase();if(!pointers.size)canvas.classList.remove('is-dragging');}
    for(const name of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(name,endPointer);
    canvas.addEventListener('wheel',event=>{if(!image)return;event.preventDefault();zoomTo(zoom*Math.exp(-event.deltaY*.0015));},{passive:false});
    canvas.addEventListener('keydown',event=>{
      if(!image)return;
      const step=event.shiftKey?30:10;
      if(event.key==='ArrowLeft')x-=step;else if(event.key==='ArrowRight')x+=step;else if(event.key==='ArrowUp')y-=step;else if(event.key==='ArrowDown')y+=step;
      else if(['+','='].includes(event.key)){event.preventDefault();zoomTo(zoom+.1);return;}
      else if(event.key==='-'){event.preventDefault();zoomTo(zoom-.1);return;}
      else return;
      event.preventDefault();draw();rebase();
    });
    slider.addEventListener('input',()=>zoomTo(Number(slider.value)/100));
    container.querySelector('.photo-zoom-in').addEventListener('click',()=>zoomTo(zoom+.1));
    container.querySelector('.photo-zoom-out').addEventListener('click',()=>zoomTo(zoom-.1));
    container.querySelector('.photo-reset').addEventListener('click',()=>{releasePointers();zoom=1;x=0;y=0;draw();});
    container.querySelector('.photo-replace').addEventListener('click',()=>input.click());
    disable(true);
    controllers.set(input,{reset,async file(){
      const selected=input.files?.[0];if(!selected)return null;
      await ready;
      if(sourceFile!==selected || !image || input.files?.[0]!==selected)throw new Error('Foto sedang berubah atau belum siap. Pilih ulang foto sebelum mengirim.');
      const version=generation;bound();const scale=baseScale()*zoom;
      const width=image.naturalWidth*scale,height=image.naturalHeight*scale;
      const crop=document.createElement('canvas');crop.width=1200;crop.height=1440;
      const cropCtx=crop.getContext('2d');cropCtx.fillStyle='#fff';cropCtx.fillRect(0,0,crop.width,crop.height);
      cropCtx.drawImage(image,((width-W)/2-x)/scale,((height-H)/2-y)/scale,W/scale,H/scale,0,0,crop.width,crop.height);
      const blob=await new Promise((resolve,reject)=>crop.toBlob(value=>value?resolve(value):reject(new Error('Foto gagal diproses. Coba foto lain.')),'image/jpeg',.9));
      if(version!==generation || input.files?.[0]!==selected)throw new Error('Foto telah berubah. Periksa bingkai lalu kirim ulang.');
      return new File([blob],`${selected.name.replace(/\.[^.]+$/,'') || 'foto'}-kartu.jpg`,{type:'image/jpeg'});
    }});
  }
  window.RCSPhotoEditor={bind,reset(input){controllers.get(input)?.reset();},async prepare(input){return controllers.has(input)?controllers.get(input).file():input?.files?.[0] || null;}};
})();
