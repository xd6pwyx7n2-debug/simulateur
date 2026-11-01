/* Générateur de page de garde : tout se passe dans le navigateur, rien n'est envoyé. */
(function(){"use strict";
var $=function(s,r){return(r||document).querySelector(s);},$$=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s));};
var KEY="sd-garde-v1";
function E(t){return String(t==null?"":t).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}
function dfr(s){if(!s)return"";var m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(s);return m?m[3]+"/"+m[2]+"/"+m[1]:s;}
var LAY=["classic","band","side","frame"],LAYN=["Classique centré","Bandeau","Barre latérale","Cadre"];
var PAL=[["#1f2a6b","#e8590c","#eef0fb"],["#0f6b63","#2fb8a8","#eaf7f5"],["#3b3b45","#b8860b","#f4f2ee"]];
var VAR=0,IMG={ent:"",etab:""};
function readImg(file,max,cb){var r=new FileReader();r.onload=function(){var im=new Image();im.onload=function(){var k=Math.min(1,max/Math.max(im.width,im.height)),w=Math.max(1,Math.round(im.width*k)),h=Math.max(1,Math.round(im.height*k)),c=document.createElement("canvas");c.width=w;c.height=h;var x=c.getContext("2d");var png=/png|webp|gif|svg/.test(file.type);if(!png){x.fillStyle="#fff";x.fillRect(0,0,w,h);}x.drawImage(im,0,0,w,h);cb(c.toDataURL(png?"image/png":"image/jpeg",.88));};im.onerror=function(){say("Image illisible");};im.src=r.result;};r.readAsDataURL(file);}
function dataBytes(u){var b=atob(u.split(",")[1]),a=new Uint8Array(b.length);for(var i=0;i<b.length;i++)a[i]=b.charCodeAt(i);return a;}
function imgSize(u){return new Promise(function(ok){var i=new Image();i.onload=function(){ok([i.width,i.height]);};i.onerror=function(){ok([1,1]);};i.src=u;});}
function collect(){var d={};$$("#gp-form [data-f]").forEach(function(e){d[e.dataset.f]=e.type==="checkbox"?e.checked:e.value;});d.logoEnt=IMG.ent;d.logoEtab=IMG.etab;return d;}
function periode(d){var a=dfr(d.debut),b=dfr(d.fin);if(a&&b)return"Stage effectué du "+a+" au "+b;if(a)return"Stage commencé le "+a;if(b)return"Stage terminé le "+b;return"";}
function blocks(d){
  var s=[],e=[],t=[];
  if(d.nom)s.push(["Présenté par",[d.nom,d.formation,d.etab,d.annee?"Année "+d.annee:""]]);
  if(d.ent||d.entadr||d.service)e.push(["Entreprise d'accueil",[d.ent,d.service,d.entadr]]);
  if(d.tuteur)t.push(["Tuteur en entreprise",[d.tuteur]]);
  if(d.ref)t.push(["Enseignant référent",[d.ref]]);
  return s.concat(e,t).map(function(b){return[b[0],b[1].filter(Boolean)];}).filter(function(b){return b[1].length;});
}
function sheet(d){
  var B=blocks(d),per=periode(d);
  var lg=function(u,c,a){return u?'<img class="gp-logo '+c+'" src="'+u+'" alt="'+a+'">':'<span></span>';};
  var h='<div class="gp-in"><div class="gp-top">'+lg(d.logoEtab,"gp-l1","Logo de l'établissement")+lg(d.logoEnt,"gp-l2","Logo de l'entreprise")+'</div>';
  h+='<div class="gp-mid"><p class="gp-doc">'+E(d.doc||"Rapport de stage")+'</p>'+(d.titre?'<h2 class="gp-title">'+E(d.titre)+'</h2>':"")+(per?'<p class="gp-per">'+E(per)+(d.ent?" - "+E(d.ent):"")+'</p>':"")+'</div>';
  h+='<div class="gp-who">'+B.map(function(b){return'<div><strong>'+E(b[0])+'</strong>'+b[1].map(function(x,i){return'<span'+(i===0?' class="gp-n"':"")+'>'+E(x)+'</span>';}).join("")+'</div>';}).join("")+'</div>';
  var f=[];if(d.annee)f.push(d.annee);if(d.date)f.push("Remis le "+dfr(d.date));if(d.conf)f.push("Document confidentiel");
  h+='<div class="gp-foot">'+E(f.join("  -  "))+'</div></div>';
  return h;
}
function plain(d){var L=[(d.doc||"Rapport de stage").toUpperCase()];if(d.titre)L.push(d.titre);var p=periode(d);if(p)L.push(p+(d.ent?" - "+d.ent:""));L.push("");blocks(d).forEach(function(b){L.push(b[0]+" :");b[1].forEach(function(x){L.push(x);});L.push("");});var f=[];if(d.annee)f.push(d.annee);if(d.date)f.push("Remis le "+dfr(d.date));if(d.conf)f.push("Document confidentiel");if(f.length)L.push(f.join(" - "));return L.join("\n").replace(/\n+$/,"");}
function draw(){var d=collect(),s=$("#gp-sheet"),l=VAR%4,p=PAL[Math.floor(VAR/4)%3];s.className="gph-"+LAY[l];s.style.cssText="--gp:"+p[0]+";--ga:"+p[1]+";--gs:"+p[2]+";";s.innerHTML=sheet(d);var lb=$("#gp-style-lab");if(lb)lb.textContent="Style "+(VAR%12+1)+" sur 12 : "+LAYN[l];save(d);}
function save(d){var on=$("#gp-mem");if(on&&on.checked){try{localStorage.setItem(KEY,JSON.stringify(d));}catch(e){}}}
function load(){try{return JSON.parse(localStorage.getItem(KEY)||"null");}catch(e){return null;}}
function setImgs(){[["ent","#gp-ent-prev","#gp-ent-del","Logo de l'entreprise chargé"],["etab","#gp-etab-prev","#gp-etab-del","Logo de l'établissement chargé"]].forEach(function(a){var p=$(a[1]);p.innerHTML=IMG[a[0]]?'<img src="'+IMG[a[0]]+'" alt="'+a[3]+'">':"";$(a[2]).hidden=!IMG[a[0]];});}
function fill(d){IMG.ent=d.logoEnt||"";IMG.etab=d.logoEtab||"";setImgs();$$("#gp-form [data-f]").forEach(function(e){if(d[e.dataset.f]==null)return;if(e.type==="checkbox")e.checked=!!d[e.dataset.f];else e.value=d[e.dataset.f];});}
function example(){fill({doc:"Rapport de stage",titre:"Découverte du service logistique et optimisation du suivi des commandes",nom:"Camille Martin",formation:"BUT Gestion des entreprises et des administrations, 2e année",etab:"IUT exemple",annee:"2026-2027",debut:"2027-04-12",fin:"2027-06-18",ent:"Entreprise Exemple",service:"Service logistique",entadr:"12 rue des Lilas, 69000 Lyon",tuteur:"M. Jean Dupont",ref:"Mme Claire Bernard",date:"",conf:false,logoEnt:"",logoEtab:""});draw();}
function saveBlob(b,n){var a=document.createElement("a");a.href=URL.createObjectURL(b);a.download=n;document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(a.href);},2000);}
var CT=(function(){var t=[],c,n,k;for(n=0;n<256;n++){c=n;for(k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0;}return t;})();
function crc(u){var c=0xFFFFFFFF;for(var i=0;i<u.length;i++)c=CT[(c^u[i])&255]^(c>>>8);return(c^0xFFFFFFFF)>>>0;}
function zip(files){var enc=new TextEncoder(),parts=[],cd=[],off=0;function u16(v){return[v&255,(v>>8)&255];}function u32(v){return[v&255,(v>>8)&255,(v>>16)&255,(v>>>24)&255];}
 files.forEach(function(f){var nm=enc.encode(f[0]),d=typeof f[1]==="string"?enc.encode(f[1]):f[1],c=crc(d);var h=[].concat(u32(0x04034b50),u16(20),u16(0x0800),u16(0),u16(0),u16(0x21),u32(c),u32(d.length),u32(d.length),u16(nm.length),u16(0));parts.push(new Uint8Array(h),nm,d);
  cd.push(new Uint8Array([].concat(u32(0x02014b50),u16(20),u16(20),u16(0x0800),u16(0),u16(0),u16(0x21),u32(c),u32(d.length),u32(d.length),u16(nm.length),u16(0),u16(0),u16(0),u16(0),u32(0),u32(off))),nm);off+=h.length+nm.length+d.length;});
 var cs=0;cd.forEach(function(x){cs+=x.length;});parts=parts.concat(cd);parts.push(new Uint8Array([].concat(u32(0x06054b50),u16(0),u16(0),u16(files.length),u16(files.length),u32(cs),u32(off),u16(0))));
 return new Blob(parts,{type:"application/vnd.openxmlformats-officedocument.wordprocessingml.document"});}
function ext(u){return/^data:image\/png/.test(u)?"png":"jpeg";}
function mkDocx(d,sz){sz=sz||{};
  var x=function(t){return String(t).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");},C=PAL[Math.floor(VAR/4)%3][0].slice(1);
  var p=function(t,o){o=o||{};return'<w:p><w:pPr><w:spacing w:before="'+(o.b||0)+'" w:after="'+(o.a||80)+'"/><w:jc w:val="'+(o.j||"center")+'"/></w:pPr><w:r><w:rPr>'+(o.bold?'<w:b/>':"")+(o.c?'<w:color w:val="'+o.c+'"/>':"")+'<w:sz w:val="'+(o.sz||24)+'"/></w:rPr><w:t xml:space="preserve">'+x(t)+'</w:t></w:r></w:p>';};
  var fit=function(s,mw,mh){var k=Math.min(mw/s[0],mh/s[1],1);return[s[0]*k,s[1]*k];};
  var pic=function(rid,id,s,j){var f=fit(s,170,70),cx=Math.round(f[0]*9525),cy=Math.round(f[1]*9525);return'<w:p><w:pPr><w:spacing w:before="0" w:after="60"/><w:jc w:val="'+j+'"/></w:pPr><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="'+cx+'" cy="'+cy+'"/><wp:docPr id="'+id+'" name="image'+id+'"/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="'+id+'" name="image'+id+'"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="'+rid+'"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="'+cx+'" cy="'+cy+'"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>';};
  var B="";
  if(d.logoEtab&&sz.etab)B+=pic("rIdEtab",1,sz.etab,"left");
  if(d.logoEnt&&sz.ent)B+=pic("rIdEnt",2,sz.ent,"right");
  B+=p((d.doc||"Rapport de stage").toUpperCase(),{b:1800,bold:1,sz:48,c:C,a:200});
  if(d.titre)B+=p(d.titre,{bold:1,sz:34,a:200});
  var per=periode(d);if(per)B+=p(per+(d.ent?" - "+d.ent:""),{sz:24,a:600});
  blocks(d).forEach(function(b){B+=p(b[0],{b:300,bold:1,sz:22,c:C,a:20});b[1].forEach(function(t,i){B+=p(t,{bold:i===0,sz:24,a:10});});});
  var f=[];if(d.annee)f.push(d.annee);if(d.date)f.push("Remis le "+dfr(d.date));if(d.conf)f.push("Document confidentiel");
  if(f.length)B+=p(f.join("  -  "),{b:1200,sz:22});
  var NS='xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"',HD='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
  var doc=HD+'<w:document '+NS+'><w:body>'+B+'<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1200" w:right="1300" w:bottom="1200" w:left="1300" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>';
  var sty=HD+'<w:styles '+NS+'><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/><w:sz w:val="24"/><w:lang w:val="fr-FR"/></w:rPr></w:rPrDefault></w:docDefaults></w:styles>';
  var ct=HD+'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Default Extension="jpeg" ContentType="image/jpeg"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>';
  var rels=HD+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>';
  var dr=HD+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'+(d.logoEtab&&sz.etab?'<Relationship Id="rIdEtab" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/etab.'+ext(d.logoEtab)+'"/>':"")+(d.logoEnt&&sz.ent?'<Relationship Id="rIdEnt" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/ent.'+ext(d.logoEnt)+'"/>':"")+'</Relationships>';
  var fl=[["[Content_Types].xml",ct],["_rels/.rels",rels],["word/document.xml",doc],["word/styles.xml",sty],["word/_rels/document.xml.rels",dr]];
  if(d.logoEtab&&sz.etab)fl.push(["word/media/etab."+ext(d.logoEtab),dataBytes(d.logoEtab)]);if(d.logoEnt&&sz.ent)fl.push(["word/media/ent."+ext(d.logoEnt),dataBytes(d.logoEnt)]);
  return zip(fl);
}
function say(t){var l=$("#gp-live");if(l){l.textContent="";setTimeout(function(){l.textContent=t;},40);}}
function fname(d){return"page-de-garde-"+(d.nom||"rapport").toString().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");}
function init(){
  var f=$("#gp-form");if(!f)return;
  var saved=load();if(saved){fill(saved);var m=$("#gp-mem");if(m){m.checked=true;$("#gp-memclear").hidden=false;}}
  f.addEventListener("input",draw);f.addEventListener("change",draw);
  $("#gp-style").addEventListener("click",function(){VAR++;draw();say("Style de la page de garde changé");});
  $("#gp-example").addEventListener("click",function(){example();say("Exemple chargé");});
  $("#gp-clear").addEventListener("click",function(){f.reset();IMG.ent="";IMG.etab="";setImgs();draw();say("Formulaire vidé");});
  $("#gp-mem").addEventListener("change",function(){if(this.checked){$("#gp-memclear").hidden=false;save(collect());}else{try{localStorage.removeItem(KEY);}catch(e){}$("#gp-memclear").hidden=true;}});
  $("#gp-memclear").addEventListener("click",function(){try{localStorage.removeItem(KEY);}catch(e){}$("#gp-mem").checked=false;this.hidden=true;say("Données effacées");});
  $("#gp-pdf").addEventListener("click",function(){var d=collect(),t=document.title;document.title=fname(d);draw();window.print();setTimeout(function(){document.title=t;},800);});
  $("#gp-docx").addEventListener("click",function(){var d=collect();Promise.all([d.logoEnt?imgSize(d.logoEnt):null,d.logoEtab?imgSize(d.logoEtab):null]).then(function(s){saveBlob(mkDocx(d,{ent:s[0],etab:s[1]}),fname(d)+".docx");say("Fichier Word téléchargé");});});
  $("#gp-copy").addEventListener("click",function(){var t=plain(collect());if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(t).then(function(){say("Texte copié");},function(){say("Copie impossible");});}else say("Copie impossible");});
  [["ent","#gp-ent-in","#gp-ent-del","Logo de l'entreprise ajouté"],["etab","#gp-etab-in","#gp-etab-del","Logo de l'établissement ajouté"]].forEach(function(a){
    $(a[1]).addEventListener("change",function(){var fl=this.files[0];if(!fl)return;readImg(fl,600,function(u){IMG[a[0]]=u;setImgs();draw();say(a[3]);});this.value="";});
    $(a[2]).addEventListener("click",function(){IMG[a[0]]="";setImgs();draw();});});
  setImgs();draw();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
