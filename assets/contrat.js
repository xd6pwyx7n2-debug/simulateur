/* Contrat de travail à domicile : tout se passe dans le navigateur, rien n'est envoyé. */
(function(){"use strict";
var $=function(s,r){return(r||document).querySelector(s);},$$=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s));};
var KEY="sd-contrat-v1";
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
var THEMES=[["#1f2a6b","#e8590c","#eef0fb"],["#0f6b63","#2fb8a8","#eaf7f5"],["#3b3b45","#b8860b","#f4f2ee"]],VAR=0;
var SMIC=12.31;
function collect(){var d={};$$("#ct-form [data-f]").forEach(function(e){d[e.dataset.f]=e.type==="checkbox"?(e.checked?"1":""):e.value;});return d;}
function addMonths(s,n){var a=s.split("-"),dt=new Date(+a[0],+a[1]-1+n,+a[2]);return dt;}
function essai(d){
  if(!d.essai)return"Aucune période d'essai n'est prévue.";
  if(d.type==="cdi")return"Le contrat comporte une période d'essai d'un mois"+(d.renouv?", renouvelable une fois : le salarié sera averti par écrit avant la fin de la période initiale":"")+". Chaque partie peut y mettre fin librement, par écrit, en respectant le préavis prévu par la convention collective.";
  if(d.debut&&d.fin){var a=d.debut.split("-"),b=d.fin.split("-"),s=new Date(+a[0],+a[1]-1,+a[2]),f=new Date(+b[0],+b[1]-1,+b[2]),days=Math.round((f-s)/864e5)+1;
    if(f>addMonths(d.debut,6))return"Le contrat comporte une période d'essai d'un mois, non renouvelable. Chaque partie peut y mettre fin librement, par écrit, en respectant le préavis prévu par la convention collective.";
    var n=Math.min(14,Math.max(1,Math.floor(days/7)));return"Le contrat comporte une période d'essai de "+n+" jour"+(n>1?"s":"")+", non renouvelable. Chaque partie peut y mettre fin librement, par écrit, en respectant le préavis prévu par la convention collective.";}
  return"Le contrat comporte une période d'essai dont la durée sera précisée à partir des dates du CDD (1 jour par semaine de contrat, 2 semaines au maximum ; 1 mois si le CDD dépasse 6 mois).";
}
function mensuel(d){var h=num(d.heures),t=num(d.taux);return h>0&&t>0?h*t*52/12:0;}
function conges(d){var h=num(d.heures);if(!h)return"Les congés payés sont dus selon les règles de la convention collective.";var m=h*52/12;return m<32?"Le salarié est déclaré au Cesu avec moins de 32 heures de travail par mois : l'indemnité de congés payés est incluse dans la rémunération, le taux horaire étant majoré de 10 %.":"Le salarié travaille 32 heures ou plus par mois : l'indemnité de congés payés est versée au moment où il prend ses congés (ou intégrée au salaire mensuel avec son accord, avec un taux horaire majoré de 10 %).";}
function parties(d){return{e:[d.enom,d.eadr,d.enum?"Numéro d'employeur : "+d.enum:""].filter(Boolean),s:[d.snom,d.sadr,d.snaiss?"Né(e) le "+dfr(d.snaiss):"",d.ssec?"Numéro de sécurité sociale : "+d.ssec:""].filter(Boolean)};}
function articles(d){
  var cdd=d.type==="cdd",A=[],tx=num(d.taux),m=mensuel(d);
  A.push(["Article 1 - Emploi et durée","Le salarié est engagé "+(cdd?"en contrat à durée déterminée":"en contrat à durée indéterminée")+" en qualité de "+(d.emploi||"…")+(d.debut?", à compter du "+dfr(d.debut):"")+(cdd&&d.fin?", jusqu'au "+dfr(d.fin):"")+"."+(cdd?" Motif du recours au CDD : "+(d.motif||"…")+".":"")]);
  A.push(["Article 2 - Lieu de travail","Le travail s'exécute au domicile de l'employeur"+(d.eadr?" : "+d.eadr:"")+"."]);
  A.push(["Article 3 - Horaires et repos","Durée du travail : "+(d.heures||"…")+" heure(s) par semaine. Répartition : "+(d.horaires||"…")+". Repos hebdomadaire : "+(d.repos||"…")+"."]);
  A.push(["Article 4 - Rémunération","Taux horaire brut : "+eur(tx)+(m?", soit environ "+eur(m)+" brut par mois pour "+d.heures+" heure(s) par semaine":"")+". Le salaire est versé le "+(d.jourpaie||"…")+" de chaque mois. Ce taux ne peut être inférieur au minimum de la convention collective ni au Smic horaire. Un jour férié travaillé est rémunéré avec une majoration de 10 %."]);
  A.push(["Article 5 - Congés payés",conges(d)]);
  A.push(["Article 6 - Période d'essai",essai(d)]);
  A.push(["Article 7 - Convention collective","Le présent contrat est soumis à la convention collective nationale des particuliers employeurs et de l'emploi à domicile du 15 mars 2021."]);
  return A;
}
function sheet(d){
  var P=parties(d),cdd=d.type==="cdd";
  var h='<div class="dv-top"><div class="dv-p"><strong>Emploi à domicile</strong><span>Particulier employeur</span></div><div class="dv-c"><p class="dv-h">CONTRAT DE TRAVAIL '+(cdd?"À DURÉE DÉTERMINÉE":"À DURÉE INDÉTERMINÉE")+'</p>'+(d.date?'<p>Établi le '+E(dfr(d.date))+'</p>':"")+'</div></div>';
  h+='<div class="dv-cl"><strong>Employeur</strong>'+(P.e.length?P.e:["…"]).map(function(x){return"<span>"+E(x)+"</span>";}).join("")+'</div>';
  h+='<div class="dv-cl"><strong>Salarié</strong>'+(P.s.length?P.s:["…"]).map(function(x){return"<span>"+E(x)+"</span>";}).join("")+'</div>';
  h+='<div class="dv-m">'+articles(d).map(function(a){return"<p><strong>"+E(a[0])+".</strong> "+E(a[1])+"</p>";}).join("")+'</div>';
  h+='<div class="dv-sig"><div><p>L\'employeur'+(d.lieu?" - fait à "+E(d.lieu):"")+(d.date?", le "+E(dfr(d.date)):"")+'</p><p class="dv-sg">Signature, précédée de « lu et approuvé »</p></div><div><p>Le salarié</p><p class="dv-sg">Signature, précédée de « lu et approuvé »</p></div></div>';
  return h;
}
function plain(d){var P=parties(d),L=["CONTRAT DE TRAVAIL "+(d.type==="cdd"?"À DURÉE DÉTERMINÉE":"À DURÉE INDÉTERMINÉE")+" - EMPLOI À DOMICILE","","Employeur : "+P.e.join(", "),"Salarié : "+P.s.join(", "),""];articles(d).forEach(function(a){L.push(a[0]+". "+a[1]);L.push("");});L.push("Fait"+(d.lieu?" à "+d.lieu:"")+(d.date?", le "+dfr(d.date):"")+".");L.push("Signatures de l'employeur et du salarié, précédées de « lu et approuvé ».");return L.join("\n");}
function warn(d){var w=$("#ct-warn");if(!w)return;var t=num(d.taux),m="";if(t>0&&t<SMIC)m="Attention : ce taux est inférieur au Smic horaire brut ("+eur(SMIC).replace(",00","")+" depuis le 1er juin 2026). Le minimum de la convention collective peut être plus élevé.";w.textContent=m;w.hidden=!m;var h=$("#ct-cdd");if(h)h.hidden=d.type!=="cdd";var r=$("#ct-renouv-w");if(r)r.hidden=d.type!=="cdi";}
function draw(){var d=collect(),s=$("#dv-sheet"),t=THEMES[VAR%3];s.className="ct dvh-"+["band","bar","center"][VAR%3];s.style.cssText="--dp:"+t[0]+";--da:"+t[1]+";--ds:"+t[2]+";--df:Inter,Arial,sans-serif;--dr:6px";s.innerHTML=sheet(d);warn(d);var lb=$("#ct-style-lab");if(lb)lb.textContent="Style "+(VAR%3+1)+" sur 3";save(d);}
function save(d){var on=$("#ct-mem");if(on&&on.checked){var c={};for(var k in d)if(k!=="ssec")c[k]=d[k];try{localStorage.setItem(KEY,JSON.stringify(c));}catch(e){}}}
function load(){try{return JSON.parse(localStorage.getItem(KEY)||"null");}catch(e){return null;}}
function fill(d){$$("#ct-form [data-f]").forEach(function(e){if(d[e.dataset.f]==null)return;if(e.type==="checkbox")e.checked=!!d[e.dataset.f];else e.value=d[e.dataset.f];});}
function ymd(dt){return dt.getFullYear()+"-"+("0"+(dt.getMonth()+1)).slice(-2)+"-"+("0"+dt.getDate()).slice(-2);}
function defaults(){$('[data-f="date"]').value=ymd(new Date());}
function example(){fill({enom:"Mme Camille Martin",eadr:"4 allée des Tilleuls, 69003 Lyon",enum:"",snom:"Mme Sophie Bernard",sadr:"8 rue des Roses, 69003 Lyon",snaiss:"",ssec:"",type:"cdi",motif:"",emploi:"employée de maison (ménage et repassage)",debut:ymd(new Date()),fin:"",heures:"4",horaires:"le mardi de 9 h à 11 h et le vendredi de 14 h à 16 h",repos:"le dimanche",taux:"14",jourpaie:"5",essai:"1",renouv:"",lieu:"Lyon"});defaults();draw();}
function mkDocx(d,sz){sz=sz||{};var C=THEMES[VAR%3][0].slice(1),x=function(t){return String(t).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");};
  var p=function(t,o){o=o||{};return'<w:p><w:pPr><w:spacing w:before="'+(o.b||0)+'" w:after="'+(o.a||80)+'"/><w:jc w:val="'+(o.j||"left")+'"/></w:pPr><w:r><w:rPr>'+(o.bold?'<w:b/>':"")+(o.c?'<w:color w:val="'+o.c+'"/>':"")+'<w:sz w:val="'+(o.sz||23)+'"/></w:rPr><w:t xml:space="preserve">'+x(t)+'</w:t></w:r></w:p>';};
  var pic=function(rid,id,s){var k=Math.min(150/s[0],60/s[1],1),cx=Math.round(s[0]*k*9525),cy=Math.round(s[1]*k*9525);return'<w:p><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="'+cx+'" cy="'+cy+'"/><wp:docPr id="'+id+'" name="image'+id+'"/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="'+id+'" name="image'+id+'"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="'+rid+'"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="'+cx+'" cy="'+cy+'"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>';};
  var P=parties(d),B=p("CONTRAT DE TRAVAIL "+(d.type==="cdd"?"À DURÉE DÉTERMINÉE":"À DURÉE INDÉTERMINÉE"),{bold:1,sz:36,c:C,a:60});B+=p("Emploi à domicile",{a:200});
  B+=p("Employeur",{bold:1,c:C,a:10});P.e.forEach(function(t,i){B+=p(t,{bold:i===0,a:10});});
  B+=p("Salarié",{bold:1,c:C,b:200,a:10});P.s.forEach(function(t,i){B+=p(t,{bold:i===0,a:10});});
  articles(d).forEach(function(a){B+=p(a[0],{bold:1,b:200,a:10});B+=p(a[1],{a:40});});
  B+=p("Fait"+(d.lieu?" à "+d.lieu:"")+(d.date?", le "+dfr(d.date):"")+".",{b:300});B+=p("L'employeur : signature précédée de « lu et approuvé »",{b:300,a:20});B+=p("Le salarié : signature précédée de « lu et approuvé »",{b:300,a:20});
  var NS='xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"',HD='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
  var doc=HD+'<w:document '+NS+'><w:body>'+B+'<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1200" w:right="1300" w:bottom="1200" w:left="1300" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>';
  var sty=HD+'<w:styles '+NS+'><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/><w:sz w:val="23"/><w:lang w:val="fr-FR"/></w:rPr></w:rPrDefault></w:docDefaults></w:styles>';
  var ct=HD+'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Default Extension="jpeg" ContentType="image/jpeg"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>';
  var rels=HD+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>';
  var dr=HD+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'+(d.sign&&sz.sign?'<Relationship Id="rIdSign" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/sign.'+ext(d.sign)+'"/>':"")+'</Relationships>';
  var fl=[["[Content_Types].xml",ct],["_rels/.rels",rels],["word/document.xml",doc],["word/styles.xml",sty],["word/_rels/document.xml.rels",dr]];if(d.sign&&sz.sign)fl.push(["word/media/sign."+ext(d.sign),dataBytes(d.sign)]);return zip(fl);}
function say(t){var l=$("#ct-live");if(l){l.textContent="";setTimeout(function(){l.textContent=t;},40);}}
function fname(d){return"contrat-travail-domicile";}
function init(){
  var f=$("#ct-form");if(!f)return;defaults();
  var saved=load();if(saved){fill(saved);defaults();var m=$("#ct-mem");if(m){m.checked=true;$("#ct-memclear").hidden=false;}}
  f.addEventListener("input",draw);f.addEventListener("change",draw);
  $("#ct-style").addEventListener("click",function(){VAR++;draw();say("Style changé");});
  $("#ct-example").addEventListener("click",function(){example();say("Exemple chargé");});
  $("#ct-clear").addEventListener("click",function(){f.reset();defaults();draw();say("Formulaire vidé");});
  $("#ct-mem").addEventListener("change",function(){if(this.checked){$("#ct-memclear").hidden=false;save(collect());}else{try{localStorage.removeItem(KEY);}catch(e){}$("#ct-memclear").hidden=true;}});
  $("#ct-memclear").addEventListener("click",function(){try{localStorage.removeItem(KEY);}catch(e){}$("#ct-mem").checked=false;this.hidden=true;say("Données effacées");});
  $("#ct-pdf").addEventListener("click",function(){var d=collect(),t=document.title;document.title=fname(d);draw();window.print();setTimeout(function(){document.title=t;},800);});
  $("#ct-docx").addEventListener("click",function(){var d=collect();saveBlob(mkDocx(d,{}),fname(d)+".docx");say("Fichier Word téléchargé");});
  $("#ct-copy").addEventListener("click",function(){var t=plain(collect());if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(t).then(function(){say("Texte copié");},function(){say("Copie impossible");});}else say("Copie impossible");});
  draw();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
