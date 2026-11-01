/* Attestation d'hébergement : tout se passe dans le navigateur, rien n'est envoyé. */
(function(){"use strict";
var $=function(s,r){return(r||document).querySelector(s);},$$=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s));};
var KEY="sd-hebergement-v1";
function E(t){return String(t==null?"":t).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}
function dfr(s){if(!s)return"";var m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(s);return m?m[3]+"/"+m[2]+"/"+m[1]:s;}
function readImg(file,max,cb){var r=new FileReader();r.onload=function(){var im=new Image();im.onload=function(){var k=Math.min(1,max/Math.max(im.width,im.height)),w=Math.max(1,Math.round(im.width*k)),h=Math.max(1,Math.round(im.height*k)),c=document.createElement("canvas");c.width=w;c.height=h;var x=c.getContext("2d");var png=/png|webp|gif|svg/.test(file.type);if(!png){x.fillStyle="#fff";x.fillRect(0,0,w,h);}x.drawImage(im,0,0,w,h);cb(c.toDataURL(png?"image/png":"image/jpeg",.88));};im.onerror=function(){say("Image illisible");};im.src=r.result;};r.readAsDataURL(file);}
function dataBytes(u){var b=atob(u.split(",")[1]),a=new Uint8Array(b.length);for(var i=0;i<b.length;i++)a[i]=b.charCodeAt(i);return a;}
function imgSize(u){return new Promise(function(ok){var i=new Image();i.onload=function(){ok([i.width,i.height]);};i.onerror=function(){ok([1,1]);};i.src=u;});}
function saveBlob(b,n){var a=document.createElement("a");a.href=URL.createObjectURL(b);a.download=n;document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(a.href);},2000);}
var CT=(function(){var t=[],c,n,k;for(n=0;n<256;n++){c=n;for(k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0;}return t;})();
function crc(u){var c=0xFFFFFFFF;for(var i=0;i<u.length;i++)c=CT[(c^u[i])&255]^(c>>>8);return(c^0xFFFFFFFF)>>>0;}
function zip(files){var enc=new TextEncoder(),parts=[],cd=[],off=0;function u16(v){return[v&255,(v>>8)&255];}function u32(v){return[v&255,(v>>8)&255,(v>>16)&255,(v>>>24)&255];}
 files.forEach(function(f){var nm=enc.encode(f[0]),d=typeof f[1]==="string"?enc.encode(f[1]):f[1],c=crc(d);var h=[].concat(u32(0x04034b50),u16(20),u16(0x0800),u16(0),u16(0),u16(0x21),u32(c),u32(d.length),u32(d.length),u16(nm.length),u16(0));parts.push(new Uint8Array(h),nm,d);
  cd.push(new Uint8Array([].concat(u32(0x02014b50),u16(20),u16(20),u16(0x0800),u16(0),u16(0),u16(0x21),u32(c),u32(d.length),u32(d.length),u16(nm.length),u16(0),u16(0),u16(0),u16(0),u32(0),u32(off))),nm);off+=h.length+nm.length+d.length;});
 var cs=0;cd.forEach(function(x){cs+=x.length;});parts=parts.concat(cd);parts.push(new Uint8Array([].concat(u32(0x06054b50),u16(0),u16(0),u16(files.length),u16(files.length),u32(cs),u32(off),u16(0))));
 return new Blob(parts,{type:"application/vnd.openxmlformats-officedocument.wordprocessingml.document"});}
function ext(u){return/^data:image\/png/.test(u)?"png":"jpeg";}
function num(v){v=parseFloat(String(v).replace(",","."));return isFinite(v)?v:0;}
function eur(n){return n.toLocaleString("fr-FR",{minimumFractionDigits:2,maximumFractionDigits:2}).replace(/[  ]/g," ")+" €";}
var THEMES=[["#1f2a6b","#e8590c","#eef0fb"],["#0f6b63","#2fb8a8","#eaf7f5"],["#3b3b45","#b8860b","#f4f2ee"]],VAR=0,IMG={sign:""};
function collect(){var d={};$$("#ht-form [data-f]").forEach(function(e){d[e.dataset.f]=e.value;});d.sign=IMG.sign;return d;}
function naiss(n,l){return n||l?"né(e)"+(n?" le "+dfr(n):"")+(l?" à "+l:""):"";}
function hebergeant(d){return(d.hnom||"…")+(naiss(d.hnaiss,d.hlieun)?", "+naiss(d.hnaiss,d.hlieun):"")+(d.hadr?", demeurant "+d.hadr:"");}
function hebergee(d){return(d.pnom||"…")+(naiss(d.pnaiss,d.plieun)?", "+naiss(d.pnaiss,d.plieun):"");}
function phrase(d){return"Je soussigné(e) "+hebergeant(d)+", certifie sur l'honneur héberger à mon domicile, "+(d.depuis?"depuis le "+dfr(d.depuis):"de manière stable")+", "+hebergee(d)+", qui y réside de manière stable.";}
var PIECES="Pièces jointes par l'hébergeant : copie de sa pièce d'identité et justificatif de domicile de moins d'un an à son nom.";
var AVERT="Je suis informé(e) qu'une attestation faisant état de faits inexacts est punie par la loi (article 441-7 du code pénal).";
function sheet(d){
  var h='<div class="dv-top"><div class="dv-p"><strong>Attestation sur l\'honneur</strong><span>Hébergement à titre gratuit</span></div><div class="dv-c"><p class="dv-h">ATTESTATION D\'HÉBERGEMENT</p>'+(d.date?'<p>Établie le '+E(dfr(d.date))+'</p>':"")+'</div></div>';
  h+='<div class="dv-cl"><strong>Hébergeant</strong>'+[d.hnom,naiss(d.hnaiss,d.hlieun),d.hadr?"Adresse : "+d.hadr:""].filter(Boolean).map(function(x){return"<span>"+E(x)+"</span>";}).join("")+'</div>';
  h+='<div class="dv-cl"><strong>Personne hébergée</strong>'+[d.pnom,naiss(d.pnaiss,d.plieun)].filter(Boolean).map(function(x){return"<span>"+E(x)+"</span>";}).join("")+'</div>';
  h+='<div class="dv-m"><p>'+E(phrase(d))+'</p><p>'+E(AVERT)+'</p><p>'+E(PIECES)+'</p></div>';
  h+='<div class="dv-sig"><div><p>L\'hébergeant'+(d.lieu?" - fait à "+E(d.lieu):"")+(d.date?", le "+E(dfr(d.date)):"")+'</p>'+(d.sign?'<img class="dv-sign" src="'+d.sign+'" alt="Signature de l\'hébergeant">':"")+'<p class="dv-sg">Signature</p></div></div>';
  return h;
}
function plain(d){var L=["ATTESTATION D'HÉBERGEMENT",""];L.push(phrase(d));L.push("");L.push(AVERT);L.push(PIECES);L.push("");L.push("Fait"+(d.lieu?" à "+d.lieu:"")+(d.date?", le "+dfr(d.date):"")+".");L.push("Signature de l'hébergeant :");return L.join("\n");}
function draw(){var d=collect(),s=$("#dv-sheet"),t=THEMES[VAR%3];s.className="ht dvh-"+["band","bar","center"][VAR%3];s.style.cssText="--dp:"+t[0]+";--da:"+t[1]+";--ds:"+t[2]+";--df:Inter,Arial,sans-serif;--dr:6px";s.innerHTML=sheet(d);var lb=$("#ht-style-lab");if(lb)lb.textContent="Style "+(VAR%3+1)+" sur 3";save(d);}
function save(d){var on=$("#ht-mem");if(on&&on.checked){try{localStorage.setItem(KEY,JSON.stringify(d));}catch(e){}}}
function load(){try{return JSON.parse(localStorage.getItem(KEY)||"null");}catch(e){return null;}}
function setImgs(){var s=$("#ht-sign-prev");s.innerHTML=IMG.sign?'<img src="'+IMG.sign+'" alt="Signature chargée">':"";$("#ht-sign-del").hidden=!IMG.sign;}
function fill(d){IMG.sign=d.sign||"";setImgs();$$("#ht-form [data-f]").forEach(function(e){if(d[e.dataset.f]!=null)e.value=d[e.dataset.f];});}
function ymd(dt){return dt.getFullYear()+"-"+("0"+(dt.getMonth()+1)).slice(-2)+"-"+("0"+dt.getDate()).slice(-2);}
function defaults(){$('[data-f="date"]').value=ymd(new Date());}
function example(){fill({hnom:"M. Jean Dupont",hnaiss:"1975-04-12",hlieun:"Lyon",hadr:"12 rue des Lilas, 69000 Lyon",pnom:"Mme Camille Martin",pnaiss:"1999-09-03",plieun:"Villeurbanne",depuis:"2026-06-01",lieu:"Lyon",sign:""});defaults();draw();}
function mkDocx(d,sz){sz=sz||{};var C=THEMES[VAR%3][0].slice(1),x=function(t){return String(t).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");};
  var p=function(t,o){o=o||{};return'<w:p><w:pPr><w:spacing w:before="'+(o.b||0)+'" w:after="'+(o.a||80)+'"/><w:jc w:val="'+(o.j||"left")+'"/></w:pPr><w:r><w:rPr>'+(o.bold?'<w:b/>':"")+(o.c?'<w:color w:val="'+o.c+'"/>':"")+'<w:sz w:val="'+(o.sz||23)+'"/></w:rPr><w:t xml:space="preserve">'+x(t)+'</w:t></w:r></w:p>';};
  var pic=function(rid,id,s){var k=Math.min(150/s[0],60/s[1],1),cx=Math.round(s[0]*k*9525),cy=Math.round(s[1]*k*9525);return'<w:p><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="'+cx+'" cy="'+cy+'"/><wp:docPr id="'+id+'" name="image'+id+'"/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="'+id+'" name="image'+id+'"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="'+rid+'"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="'+cx+'" cy="'+cy+'"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>';};
  var B=p("ATTESTATION D'HÉBERGEMENT",{bold:1,sz:40,c:C,a:200});
  B+=p("Hébergeant",{bold:1,c:C,a:10});B+=p(d.hnom||"",{bold:1,a:10});if(naiss(d.hnaiss,d.hlieun))B+=p(naiss(d.hnaiss,d.hlieun),{a:10});if(d.hadr)B+=p("Adresse : "+d.hadr,{a:10});
  B+=p("Personne hébergée",{bold:1,c:C,b:200,a:10});B+=p(d.pnom||"",{bold:1,a:10});if(naiss(d.pnaiss,d.plieun))B+=p(naiss(d.pnaiss,d.plieun),{a:10});
  B+=p(phrase(d),{b:300});B+=p(AVERT,{sz:21});B+=p(PIECES,{sz:21});
  B+=p("Fait"+(d.lieu?" à "+d.lieu:"")+(d.date?", le "+dfr(d.date):"")+".",{b:300});B+=p("L'hébergeant",{b:100,a:20});if(d.sign&&sz.sign)B+=pic("rIdSign",1,sz.sign);
  var NS='xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"',HD='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
  var doc=HD+'<w:document '+NS+'><w:body>'+B+'<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1200" w:right="1300" w:bottom="1200" w:left="1300" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>';
  var sty=HD+'<w:styles '+NS+'><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/><w:sz w:val="23"/><w:lang w:val="fr-FR"/></w:rPr></w:rPrDefault></w:docDefaults></w:styles>';
  var ct=HD+'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Default Extension="jpeg" ContentType="image/jpeg"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>';
  var rels=HD+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>';
  var dr=HD+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'+(d.sign&&sz.sign?'<Relationship Id="rIdSign" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/sign.'+ext(d.sign)+'"/>':"")+'</Relationships>';
  var fl=[["[Content_Types].xml",ct],["_rels/.rels",rels],["word/document.xml",doc],["word/styles.xml",sty],["word/_rels/document.xml.rels",dr]];if(d.sign&&sz.sign)fl.push(["word/media/sign."+ext(d.sign),dataBytes(d.sign)]);return zip(fl);}
function say(t){var l=$("#ht-live");if(l){l.textContent="";setTimeout(function(){l.textContent=t;},40);}}
function fname(d){return"attestation-hebergement";}
function init(){
  var f=$("#ht-form");if(!f)return;defaults();
  var saved=load();if(saved){fill(saved);defaults();var m=$("#ht-mem");if(m){m.checked=true;$("#ht-memclear").hidden=false;}}
  f.addEventListener("input",draw);f.addEventListener("change",draw);
  $("#ht-style").addEventListener("click",function(){VAR++;draw();say("Style changé");});
  $("#ht-example").addEventListener("click",function(){example();say("Exemple chargé");});
  $("#ht-clear").addEventListener("click",function(){f.reset();IMG.sign="";setImgs();defaults();draw();say("Formulaire vidé");});
  $("#ht-mem").addEventListener("change",function(){if(this.checked){$("#ht-memclear").hidden=false;save(collect());}else{try{localStorage.removeItem(KEY);}catch(e){}$("#ht-memclear").hidden=true;}});
  $("#ht-memclear").addEventListener("click",function(){try{localStorage.removeItem(KEY);}catch(e){}$("#ht-mem").checked=false;this.hidden=true;say("Données effacées");});
  $("#ht-pdf").addEventListener("click",function(){var d=collect(),t=document.title;document.title=fname(d);draw();window.print();setTimeout(function(){document.title=t;},800);});
  $("#ht-docx").addEventListener("click",function(){var d=collect();Promise.all([d.sign?imgSize(d.sign):null]).then(function(s){saveBlob(mkDocx(d,{sign:s[0]}),fname(d)+".docx");say("Fichier Word téléchargé");});});
  $("#ht-copy").addEventListener("click",function(){var t=plain(collect());if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(t).then(function(){say("Texte copié");},function(){say("Copie impossible");});}else say("Copie impossible");});
  $("#ht-sign-in").addEventListener("change",function(){var fl=this.files[0];if(!fl)return;readImg(fl,500,function(u){IMG.sign=u;setImgs();draw();say("Signature ajoutée");});this.value="";});
  $("#ht-sign-del").addEventListener("click",function(){IMG.sign="";setImgs();draw();});
  setImgs();draw();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
