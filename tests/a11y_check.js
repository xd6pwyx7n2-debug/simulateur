/* Contrôles d'accessibilité exécutés par tests/run.py (alt, libellés, noms, titres, id, contraste). */
()=>{
 const out=[];const add=(k,e,m)=>out.push([k,(e.tagName||'')+(e.id?'#'+e.id:'')+'.'+String(e.className||'').slice(0,25),m||'']);
 const vis=e=>{const r=e.getBoundingClientRect();const s=getComputedStyle(e);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none'};
 document.querySelectorAll('img').forEach(i=>{if(!i.hasAttribute('alt'))add('img-sans-alt',i,i.src.slice(-40))});
 document.querySelectorAll('input:not([type=hidden]):not([type=submit]):not([type=button]),select,textarea').forEach(i=>{if(!vis(i))return;const l=i.labels&&i.labels.length||i.getAttribute('aria-label')||i.getAttribute('aria-labelledby')||i.title;if(!l)add('champ-sans-libelle',i,i.type)});
 document.querySelectorAll('button,[role=button]').forEach(b=>{if(!vis(b))return;if(!(b.textContent.trim()||b.getAttribute('aria-label')||b.title))add('bouton-sans-nom',b)});
 document.querySelectorAll('a[href]').forEach(a=>{if(!vis(a))return;if(!(a.textContent.trim()||a.getAttribute('aria-label')||a.querySelector('img[alt]:not([alt=""])')))add('lien-sans-nom',a,a.getAttribute('href'))});
 const hs=[...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].filter(vis);let prev=0;hs.forEach(h=>{const n=+h.tagName[1];if(prev&&n>prev+1)add('titre-saute',h,'h'+prev+'>h'+n);prev=n});
 if(document.querySelectorAll('h1').length!==1)add('h1-nombre',document.body,document.querySelectorAll('h1').length);
 const ids={};document.querySelectorAll('[id]').forEach(e=>{ids[e.id]=(ids[e.id]||0)+1});Object.keys(ids).filter(k=>ids[k]>1).forEach(k=>add('id-doublon',document.body,k));
 if(!document.documentElement.lang)add('lang-absent',document.documentElement);
 // cibles tactiles (liens/boutons visibles < 40px de haut ou < 24 de large, hors liens dans un paragraphe)
 document.querySelectorAll('a[href],button,summary,input[type=checkbox],select').forEach(e=>{if(!vis(e))return;const r=e.getBoundingClientRect();if(e.closest('p,li,small,td,.sd-see-grid')&&e.tagName==='A')return;if(r.height<32||r.width<32)add('cible-petite',e,Math.round(r.width)+'x'+Math.round(r.height))});
 // contraste approximatif
 const parse=c=>{const m=c.match(/rgba?\(([^)]+)\)/);if(!m)return null;const p=m[1].split(',').map(Number);return {r:p[0],g:p[1],b:p[2],a:p[3]===undefined?1:p[3]}};
 const lum=c=>{const f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};return .2126*f(c.r)+.7152*f(c.g)+.0722*f(c.b)};
 const bgOf=e=>{let x=e;while(x){const c=parse(getComputedStyle(x).backgroundColor);if(c&&c.a>.9)return c;if(getComputedStyle(x).backgroundImage!=='none')return null;x=x.parentElement}return {r:255,g:255,b:255,a:1}};
 const seen=new Set();
 document.querySelectorAll('p,li,span,a,h1,h2,h3,h4,strong,td,th,label,small,button,summary').forEach(e=>{
  if(!vis(e)||!e.childNodes.length)return;const t=[...e.childNodes].filter(n=>n.nodeType===3&&n.textContent.trim()).length;if(!t)return;
  const fg=parse(getComputedStyle(e).color),bg=bgOf(e);if(!fg||!bg)return;
  const a=lum(fg),b=lum(bg),cr=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);const fs=parseFloat(getComputedStyle(e).fontSize),bold=+getComputedStyle(e).fontWeight>=700;
  const need=(fs>=24||(fs>=18.66&&bold))?3:4.5;
  if(cr<need){const k=e.tagName+String(e.className).slice(0,20)+cr.toFixed(1);if(seen.has(k))return;seen.add(k);add('contraste',e,cr.toFixed(2)+' (min '+need+') '+e.textContent.trim().slice(0,30))}});
 return out}
