/* Générateur de devis : tout se passe dans le navigateur, rien n'est envoyé. */
(function(){"use strict";
var $=function(s,r){return(r||document).querySelector(s);},$$=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s));};
var KEY="sd-devis-v1";
function E(t){return String(t==null?"":t).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}
function num(v){v=parseFloat(String(v).replace(",","."));return isFinite(v)?v:0;}
function eur(n){return n.toLocaleString("fr-FR",{minimumFractionDigits:2,maximumFractionDigits:2}).replace(/[  ]/g," ")+" €";}
function dfr(s){if(!s)return"";var m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(s);return m?m[3]+"/"+m[2]+"/"+m[1]:s;}
var ACT={
 bat:{n:"Bâtiment, artisanat, dépannage ou réparation à domicile",notes:["Le devis est obligatoire pour ces activités : indiquez le taux horaire de main-d'œuvre TTC, la durée estimée et les frais de déplacement.","Informez le client qu'il peut conserver les pièces remplacées (à faire écrire et signer avant les travaux).","Pour des travaux de structure, l'assurance décennale doit figurer au contrat."],extra:["Le client peut demander à conserver les pièces remplacées ; son choix est à consigner par écrit avant les travaux."]},
 sap:{n:"Services à la personne",notes:["Le devis est obligatoire si le prix mensuel est supérieur ou égal à 100 € TTC, et à conserver au moins 1 an."],extra:[]},
 dem:{n:"Déménagement",notes:["Devis obligatoire et gratuit."],extra:[]},
 aut:{n:"Autre prestation ou vente",notes:["Le devis n'est pas imposé par la liste officielle pour ce type d'activité, mais il sert de preuve de l'accord sur le prix et les conditions."],extra:[]}
};
var LIGNES=0,IMG={logo:"",sign:""};
function readImg(file,max,cb){var r=new FileReader();r.onload=function(){var im=new Image();im.onload=function(){var k=Math.min(1,max/Math.max(im.width,im.height)),w=Math.max(1,Math.round(im.width*k)),h=Math.max(1,Math.round(im.height*k)),c=document.createElement("canvas");c.width=w;c.height=h;var x=c.getContext("2d");var png=/png|webp|gif|svg/.test(file.type);if(!png){x.fillStyle="#fff";x.fillRect(0,0,w,h);}x.drawImage(im,0,0,w,h);cb(c.toDataURL(png?"image/png":"image/jpeg",.88),w,h);};im.onerror=function(){say("Image illisible");};im.src=r.result;};r.readAsDataURL(file);}
function dataBytes(u){var b=atob(u.split(",")[1]),a=new Uint8Array(b.length);for(var i=0;i<b.length;i++)a[i]=b.charCodeAt(i);return a;}
function imgSize(u){return new Promise(function(ok){var i=new Image();i.onload=function(){ok([i.width,i.height]);};i.onerror=function(){ok([1,1]);};i.src=u;});}
function ligne(d){
  LIGNES++;var n=LIGNES,w=document.createElement("fieldset");w.className="cv-rep dv-l";
  var f=function(k,l,t,v,ph,st){return'<div class="field"><label for="dv-'+k+n+'">'+l+'</label><input id="dv-'+k+n+'" data-k="'+k+'" type="'+t+'"'+(t==="number"?' inputmode="decimal" min="0" step="any"':"")+' value="'+E(v||"")+'" placeholder="'+E(ph||"")+'" autocomplete="off"></div>';};
  w.innerHTML='<legend>Ligne</legend>'+f("desc","Désignation","text",d&&d.desc,"Fourniture et pose d'un lavabo")+'<div class="cv-row two">'+f("qte","Quantité","number",d&&d.qte,"1")+f("u","Unité (facultatif)","text",d&&d.u,"h, m², pièce")+f("pu","Prix unitaire HT en euros","number",d&&d.pu,"0")+'<div class="field"><label for="dv-tva'+n+'">Taux de TVA</label><select id="dv-tva'+n+'" data-k="tva"><option value="20">20 %</option><option value="10">10 %</option><option value="5.5">5,5 %</option><option value="0">0 % (non applicable)</option></select></div></div><button type="button" class="cv-btn danger" data-del>Supprimer cette ligne</button>';
  if(d&&d.tva!=null)$('[data-k="tva"]',w).value=String(d.tva);
  $("#dv-lignes").appendChild(w);relabel();
}
function relabel(){$$("#dv-lignes .dv-l").forEach(function(f,i){$("legend",f).textContent="Ligne "+(i+1);});}
function collect(){
  var d={};$$("#dv-form [data-f]").forEach(function(e){d[e.dataset.f]=e.type==="checkbox"?e.checked:e.value;});
  d.logo=IMG.logo;d.sign=IMG.sign;d.lignes=$$("#dv-lignes .dv-l").map(function(f){var g=function(k){var e=$('[data-k="'+k+'"]',f);return e?e.value:"";};return{desc:g("desc"),qte:g("qte"),u:g("u"),pu:g("pu"),tva:g("tva")};});
  return d;
}
function calc(d){
  var rows=[],ht=0,by={};
  d.lignes.forEach(function(l){if(!l.desc&&!num(l.pu))return;var q=l.qte===""?1:num(l.qte),pu=num(l.pu),t=num(l.tva),tot=q*pu;
    rows.push({desc:l.desc,q:q,u:l.u,pu:pu,tva:t,tot:tot});ht+=tot;by[t]=(by[t]||0)+tot;});
  var fr=!!d.franchise,tv=0,det=[];
  if(!fr)Object.keys(by).sort(function(a,b){return b-a;}).forEach(function(k){var m=by[k]*k/100;tv+=m;if(num(k)>0)det.push([k,by[k],m]);});
  return{rows:rows,ht:ht,tva:tv,ttc:ht+tv,det:det,fr:fr};
}
function acompte(d,c){var a=num(d.acompte);if(!(a>0))return 0;return d.acType==="pct"?c.ttc*a/100:a;}
function qfmt(q){return q.toLocaleString("fr-FR",{maximumFractionDigits:3});}
function sheet(d){
  var c=calc(d),a=ACT[d.activite]||ACT.aut,acc=acompte(d,c);
  var prest=[d.nom,d.forme,d.adresse,d.siren?"SIREN : "+d.siren:"",(!c.fr&&d.tvanum)?"TVA intracommunautaire : "+d.tvanum:"",d.assur?"Assurance professionnelle : "+d.assur:"",d.tel,d.email].filter(Boolean);
  var cli=[d.cnom,d.cadr,d.lieu?"Lieu d'exécution : "+d.lieu:""].filter(Boolean);
  var h='<div class="dv-top"><div class="dv-p">'+(d.logo?'<img class="dv-logo" src="'+d.logo+'" alt="Logo de l\'entreprise">':"")+prest.map(function(x,i){return i===0?"<strong>"+E(x)+"</strong>":"<span>"+E(x)+"</span>";}).join("")+'</div><div class="dv-c"><p class="dv-h">DEVIS'+(d.num?" n° "+E(d.num):"")+'</p><p>Date : '+E(dfr(d.date))+'</p>'+(d.valid?'<p>Valable '+E(d.valid)+' jours à compter de sa date</p>':"")+'<p>'+(d.payant?'Devis payant : '+E(eur(num(d.cout))):"Devis gratuit")+'</p></div></div>';
  h+='<div class="dv-cl"><strong>Client</strong>'+cli.map(function(x){return"<span>"+E(x)+"</span>";}).join("")+'</div>';
  if(d.objet)h+='<p class="dv-obj"><strong>Objet :</strong> '+E(d.objet)+'</p>';
  var meta=[];if(d.debut)meta.push("Début prévu : "+dfr(d.debut));if(d.duree)meta.push("Durée estimée : "+d.duree);if(d.horaire)meta.push("Taux horaire de main-d'œuvre : "+d.horaire+" TTC");if(d.depl)meta.push("Frais de déplacement : "+d.depl);
  if(meta.length)h+='<p class="dv-meta">'+meta.map(E).join(" · ")+'</p>';
  h+='<table class="dv-t"><thead><tr><th>Désignation</th><th>Qté</th><th>PU HT</th><th>TVA</th><th>Total HT</th></tr></thead><tbody>'+(c.rows.length?c.rows.map(function(r){return'<tr><td>'+E(r.desc)+'</td><td>'+E(qfmt(r.q)+(r.u?" "+r.u:""))+'</td><td>'+E(eur(r.pu))+'</td><td>'+(c.fr?"–":E(String(r.tva).replace(".",",")+" %"))+'</td><td>'+E(eur(r.tot))+'</td></tr>';}).join(""):'<tr><td colspan="5">Ajoutez une ligne</td></tr>')+'</tbody></table>';
  h+='<table class="dv-s"><tr><td>Total HT</td><td>'+E(eur(c.ht))+'</td></tr>';
  if(c.fr)h+='<tr><td>TVA</td><td>non applicable</td></tr>';else{c.det.forEach(function(x){h+='<tr><td>TVA '+E(String(x[0]).replace(".",",")+" %")+'</td><td>'+E(eur(x[2]))+'</td></tr>';});if(!c.det.length)h+='<tr><td>TVA</td><td>'+E(eur(0))+'</td></tr>';}
  h+='<tr class="dv-g"><td>Total TTC</td><td>'+E(eur(c.ttc))+'</td></tr>';
  if(acc>0)h+='<tr><td>'+(d.acKind==="arrhes"?"Arrhes":"Acompte")+' demandé</td><td>'+E(eur(acc))+'</td></tr>';
  h+='</table>';
  var m=[];
  if(c.fr)m.push("TVA non applicable, article 293 B du CGI.");
  if(d.paiement)m.push("Conditions de paiement : "+d.paiement);
  if(acc>0)m.push(d.acKind==="arrhes"?"Somme versée à titre d'arrhes : chacune des parties peut renoncer au contrat ; le client qui renonce perd les arrhes, le professionnel qui renonce rembourse le double.":"Somme versée à titre d'acompte : engagement ferme des deux parties.");
  if(d.dechets)m.push("Traitement des déchets : "+d.dechets);
  a.extra.forEach(function(x){m.push(x);});
  if(d.mentions)m.push(d.mentions);
  if(m.length)h+='<div class="dv-m">'+m.map(function(x){return"<p>"+E(x)+"</p>";}).join("")+'</div>';
  h+='<div class="dv-sig"><div><p>Le professionnel</p>'+(d.sign?'<img class="dv-sign" src="'+d.sign+'" alt="Signature du professionnel">':"")+'<p class="dv-sg">Date et signature</p></div><div><p>Le client : « Bon pour accord »</p><p class="dv-sg">Date et signature</p></div></div>';
  return h;
}
function plain(d){
  var c=calc(d),L=[];L.push("DEVIS"+(d.num?" n° "+d.num:""));L.push("Date : "+dfr(d.date)+(d.valid?" - valable "+d.valid+" jours":""));L.push("");
  [d.nom,d.forme,d.adresse,d.siren?"SIREN : "+d.siren:"",d.assur?"Assurance : "+d.assur:""].filter(Boolean).forEach(function(x){L.push(x);});
  L.push("");L.push("Client : "+[d.cnom,d.cadr].filter(Boolean).join(", "));if(d.lieu)L.push("Lieu d'exécution : "+d.lieu);if(d.objet)L.push("Objet : "+d.objet);L.push("");
  c.rows.forEach(function(r){L.push("- "+r.desc+" : "+qfmt(r.q)+(r.u?" "+r.u:"")+" x "+eur(r.pu)+" HT"+(c.fr?"":" (TVA "+String(r.tva).replace(".",",")+" %)")+" = "+eur(r.tot)+" HT");});
  L.push("");L.push("Total HT : "+eur(c.ht));L.push(c.fr?"TVA non applicable, article 293 B du CGI.":"TVA : "+eur(c.tva));L.push("Total TTC : "+eur(c.ttc));
  var acc=acompte(d,c);if(acc>0)L.push((d.acKind==="arrhes"?"Arrhes":"Acompte")+" demandé : "+eur(acc));if(d.paiement)L.push("Paiement : "+d.paiement);
  L.push("");L.push("Bon pour accord, date et signature du client :");return L.join("\n");
}
function draw(){var d=collect();$("#dv-sheet").innerHTML=sheet(d);var a=ACT[d.activite]||ACT.aut;$("#dv-notes").innerHTML=a.notes.map(function(x){return"<li>"+E(x)+"</li>";}).join("");save(d);}
function save(d){var on=$("#dv-mem");if(on&&on.checked){try{localStorage.setItem(KEY,JSON.stringify(d));}catch(e){}}}
function load(){try{return JSON.parse(localStorage.getItem(KEY)||"null");}catch(e){return null;}}
function setImgs(){var l=$("#dv-logo-prev"),s=$("#dv-sign-prev");if(l){l.innerHTML=IMG.logo?'<img src="'+IMG.logo+'" alt="Logo chargé">':"";$("#dv-logo-del").hidden=!IMG.logo;}if(s){s.innerHTML=IMG.sign?'<img src="'+IMG.sign+'" alt="Signature chargée">':"";$("#dv-sign-del").hidden=!IMG.sign;}}
function fill(d){IMG.logo=d.logo||"";IMG.sign=d.sign||"";setImgs();$$("#dv-form [data-f]").forEach(function(e){if(d[e.dataset.f]==null)return;if(e.type==="checkbox")e.checked=!!d[e.dataset.f];else e.value=d[e.dataset.f];});$("#dv-lignes").innerHTML="";LIGNES=0;(d.lignes&&d.lignes.length?d.lignes:[{}]).forEach(ligne);toggle();}
function toggle(){$("#dv-cout-w").hidden=!$('[data-f="payant"]').checked;$("#dv-tvanum-w").hidden=$('[data-f="franchise"]').checked;}
function today(){var t=new Date();return t.getFullYear()+"-"+("0"+(t.getMonth()+1)).slice(-2)+"-"+("0"+t.getDate()).slice(-2);}
function example(){fill({activite:"bat",nom:"Dupont Rénovation",forme:"Entrepreneur individuel",adresse:"12 rue des Lilas, 69000 Lyon",siren:"000 000 000",assur:"Assureur exemple, contrat n° 000, France entière",tel:"06 00 00 00 00",email:"contact@exemple.fr",cnom:"Mme Martin",cadr:"4 allée des Tilleuls, 69003 Lyon",lieu:"4 allée des Tilleuls, 69003 Lyon",num:"2026-001",date:today(),valid:"30",objet:"Remplacement d'un lavabo dans la salle de bains",duree:"1 journée",horaire:"45 €",acompte:"30",acType:"pct",acKind:"acompte",paiement:"Solde à réception de la facture, par virement ou chèque",lignes:[{desc:"Fourniture d'un lavabo",qte:"1",u:"",pu:"180",tva:"10"},{desc:"Main-d'œuvre (dépose et pose)",qte:"3",u:"h",pu:"45",tva:"10"}]});draw();}
function saveBlob(b,n){var a=document.createElement("a");a.href=URL.createObjectURL(b);a.download=n;document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(a.href);},2000);}
var CT=(function(){var t=[],c,n,k;for(n=0;n<256;n++){c=n;for(k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0;}return t;})();
function crc(u){var c=0xFFFFFFFF;for(var i=0;i<u.length;i++)c=CT[(c^u[i])&255]^(c>>>8);return(c^0xFFFFFFFF)>>>0;}
function zip(files){var enc=new TextEncoder(),parts=[],cd=[],off=0;function u16(v){return[v&255,(v>>8)&255];}function u32(v){return[v&255,(v>>8)&255,(v>>16)&255,(v>>>24)&255];}
 files.forEach(function(f){var nm=enc.encode(f[0]),d=typeof f[1]==="string"?enc.encode(f[1]):f[1],c=crc(d);var h=[].concat(u32(0x04034b50),u16(20),u16(0x0800),u16(0),u16(0),u16(0x21),u32(c),u32(d.length),u32(d.length),u16(nm.length),u16(0));parts.push(new Uint8Array(h),nm,d);
  cd.push(new Uint8Array([].concat(u32(0x02014b50),u16(20),u16(20),u16(0x0800),u16(0),u16(0),u16(0x21),u32(c),u32(d.length),u32(d.length),u16(nm.length),u16(0),u16(0),u16(0),u16(0),u32(0),u32(off))),nm);off+=h.length+nm.length+d.length;});
 var cs=0;cd.forEach(function(x){cs+=x.length;});parts=parts.concat(cd);parts.push(new Uint8Array([].concat(u32(0x06054b50),u16(0),u16(0),u16(files.length),u16(files.length),u32(cs),u32(off),u16(0))));
 return new Blob(parts,{type:"application/vnd.openxmlformats-officedocument.wordprocessingml.document"});}
function mkDocx(d,sz){sz=sz||{};
  var c=calc(d),acc=acompte(d,c),x=function(t){return String(t).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");};
  var p=function(t,o){o=o||{};return'<w:p><w:pPr><w:spacing w:before="'+(o.b||0)+'" w:after="'+(o.a||60)+'"/>'+(o.r?'<w:jc w:val="right"/>':"")+'</w:pPr><w:r><w:rPr>'+(o.bold?'<w:b/>':"")+(o.sz?'<w:sz w:val="'+o.sz+'"/>':"")+'</w:rPr><w:t xml:space="preserve">'+x(t)+'</w:t></w:r></w:p>';};
  var cell=function(t,w,bold,r){return'<w:tc><w:tcPr><w:tcW w:w="'+w+'" w:type="dxa"/></w:tcPr>'+p(t,{bold:bold,r:r,a:20})+'</w:tc>';};
  var W=[4300,1100,1500,900,1600];
  var row=function(a,b){return'<w:tr>'+a.map(function(t,i){return cell(t,W[i],b,i>0);}).join("")+'</w:tr>';};
  var tb='<w:tbl><w:tblPr><w:tblW w:w="9400" w:type="dxa"/><w:tblBorders><w:top w:val="single" w:sz="4"/><w:left w:val="single" w:sz="4"/><w:bottom w:val="single" w:sz="4"/><w:right w:val="single" w:sz="4"/><w:insideH w:val="single" w:sz="4"/><w:insideV w:val="single" w:sz="4"/></w:tblBorders></w:tblPr>'+row(["Désignation","Qté","PU HT","TVA","Total HT"],1)+c.rows.map(function(r){return row([r.desc,qfmt(r.q)+(r.u?" "+r.u:""),eur(r.pu),c.fr?"–":String(r.tva).replace(".",",")+" %",eur(r.tot)],0);}).join("")+'</w:tbl>';
  var pic=function(rid,id,w,h){var cx=Math.round(w*9525),cy=Math.round(h*9525);return'<w:p><w:pPr><w:spacing w:before="0" w:after="60"/></w:pPr><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="'+cx+'" cy="'+cy+'"/><wp:docPr id="'+id+'" name="image'+id+'"/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="'+id+'" name="image'+id+'"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="'+rid+'"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="'+cx+'" cy="'+cy+'"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>';};
  var fit=function(s,mw,mh){var k=Math.min(mw/s[0],mh/s[1],1);return[s[0]*k,s[1]*k];};
  var B=(d.logo&&sz.logo?pic("rIdLogo",1,fit(sz.logo,170,70)[0],fit(sz.logo,170,70)[1]):"")+p("DEVIS"+(d.num?" n° "+d.num:""),{bold:1,sz:36})+p("Date : "+dfr(d.date)+(d.valid?"   |   Valable "+d.valid+" jours":"")+"   |   "+(d.payant?"Devis payant : "+eur(num(d.cout)):"Devis gratuit"),{a:160});
  [d.nom,d.forme,d.adresse,d.siren?"SIREN : "+d.siren:"",(!c.fr&&d.tvanum)?"TVA intracommunautaire : "+d.tvanum:"",d.assur?"Assurance professionnelle : "+d.assur:"",d.tel,d.email].filter(Boolean).forEach(function(t,i){B+=p(t,{bold:i===0,a:10});});
  B+=p("Client",{bold:1,b:160,a:10});[d.cnom,d.cadr,d.lieu?"Lieu d'exécution : "+d.lieu:""].filter(Boolean).forEach(function(t){B+=p(t,{a:10});});
  if(d.objet)B+=p("Objet : "+d.objet,{b:160});
  var meta=[];if(d.debut)meta.push("Début prévu : "+dfr(d.debut));if(d.duree)meta.push("Durée estimée : "+d.duree);if(d.horaire)meta.push("Taux horaire de main-d'œuvre : "+d.horaire+" TTC");if(d.depl)meta.push("Frais de déplacement : "+d.depl);if(meta.length)B+=p(meta.join(" · "),{a:120});
  B+=p("",{a:40})+tb+p("",{a:40});
  B+=p("Total HT : "+eur(c.ht),{r:1,a:10});B+=p(c.fr?"TVA non applicable, article 293 B du CGI.":"TVA : "+eur(c.tva),{r:1,a:10});B+=p("Total TTC : "+eur(c.ttc),{r:1,bold:1,a:10,sz:26});
  if(acc>0)B+=p((d.acKind==="arrhes"?"Arrhes":"Acompte")+" demandé : "+eur(acc),{r:1});
  if(d.paiement)B+=p("Conditions de paiement : "+d.paiement,{b:160});
  if(acc>0)B+=p(d.acKind==="arrhes"?"Somme versée à titre d'arrhes : chacune des parties peut renoncer ; le client qui renonce perd les arrhes, le professionnel qui renonce rembourse le double.":"Somme versée à titre d'acompte : engagement ferme des deux parties.");
  if(d.dechets)B+=p("Traitement des déchets : "+d.dechets);
  (ACT[d.activite]||ACT.aut).extra.forEach(function(t){B+=p(t);});if(d.mentions)B+=p(d.mentions);
  if(d.sign&&sz.sign)B+=pic("rIdSign",2,fit(sz.sign,150,60)[0],fit(sz.sign,150,60)[1]);B+=p("Le professionnel (date et signature)                                   Le client : « Bon pour accord » (date et signature)",{b:400});
  var NS='xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"',HD='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
  var doc=HD+'<w:document '+NS+'><w:body>'+B+'<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1000" w:right="1100" w:bottom="1000" w:left="1100" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>';
  var sty=HD+'<w:styles '+NS+'><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/><w:sz w:val="21"/><w:lang w:val="fr-FR"/></w:rPr></w:rPrDefault></w:docDefaults></w:styles>';
  var ct=HD+'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Default Extension="jpeg" ContentType="image/jpeg"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>';
  var rels=HD+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>';
  var dr=HD+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'+(d.logo&&sz.logo?'<Relationship Id="rIdLogo" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/logo.'+ext(d.logo)+'"/>':"")+(d.sign&&sz.sign?'<Relationship Id="rIdSign" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/sign.png"/>':"")+'</Relationships>';
  var fl=[["[Content_Types].xml",ct],["_rels/.rels",rels],["word/document.xml",doc],["word/styles.xml",sty],["word/_rels/document.xml.rels",dr]];if(d.logo&&sz.logo)fl.push(["word/media/logo."+ext(d.logo),dataBytes(d.logo)]);if(d.sign&&sz.sign)fl.push(["word/media/sign.png",dataBytes(d.sign)]);return zip(fl);
}
function ext(u){return/^data:image\/png/.test(u)?"png":"jpeg";}
function say(t){var l=$("#dv-live");if(l){l.textContent="";setTimeout(function(){l.textContent=t;},40);}}
function fname(d){return"devis-"+(d.num||"").toString().toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")||"devis";}
function init(){
  var f=$("#dv-form");if(!f)return;
  $('[data-f="date"]').value=today();
  var saved=load();if(saved){fill(saved);var m=$("#dv-mem");if(m){m.checked=true;$("#dv-memclear").hidden=false;}}else ligne();
  f.addEventListener("input",function(){toggle();draw();});f.addEventListener("change",function(){toggle();draw();});
  $("#dv-add").addEventListener("click",function(){ligne();draw();});
  $("#dv-lignes").addEventListener("click",function(e){if(e.target.hasAttribute("data-del")){e.target.closest(".dv-l").remove();if(!$$("#dv-lignes .dv-l").length)ligne();relabel();draw();}});
  $("#dv-example").addEventListener("click",function(){example();say("Exemple chargé");});
  $("#dv-clear").addEventListener("click",function(){f.reset();$('[data-f="date"]').value=today();$("#dv-lignes").innerHTML="";LIGNES=0;ligne();toggle();draw();say("Formulaire vidé");});
  $("#dv-mem").addEventListener("change",function(){if(this.checked){$("#dv-memclear").hidden=false;save(collect());}else{try{localStorage.removeItem(KEY);}catch(e){}$("#dv-memclear").hidden=true;}});
  $("#dv-memclear").addEventListener("click",function(){try{localStorage.removeItem(KEY);}catch(e){}$("#dv-mem").checked=false;this.hidden=true;say("Données effacées");});
  $("#dv-pdf").addEventListener("click",function(){var d=collect(),t=document.title;document.title=fname(d);draw();window.print();setTimeout(function(){document.title=t;},800);});
  $("#dv-docx").addEventListener("click",function(){var d=collect();Promise.all([d.logo?imgSize(d.logo):null,d.sign?imgSize(d.sign):null]).then(function(s){saveBlob(mkDocx(d,{logo:s[0],sign:s[1]}),fname(d)+".docx");say("Fichier Word téléchargé");});});
  $("#dv-copy").addEventListener("click",function(){var t=plain(collect());if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(t).then(function(){say("Texte copié");},function(){say("Copie impossible");});}else say("Copie impossible");});
  $("#dv-logo-in").addEventListener("change",function(){var f=this.files[0];if(!f)return;readImg(f,600,function(u){IMG.logo=u;setImgs();draw();say("Logo ajouté");});this.value="";});
  $("#dv-logo-del").addEventListener("click",function(){IMG.logo="";setImgs();draw();});
  $("#dv-sign-in").addEventListener("change",function(){var f=this.files[0];if(!f)return;readImg(f,500,function(u){IMG.sign=u;setImgs();draw();say("Signature ajoutée");});this.value="";});
  $("#dv-sign-del").addEventListener("click",function(){IMG.sign="";setImgs();draw();});
  var cv=$("#dv-pad"),cx=cv.getContext("2d"),dr=false,any=false;cx.lineWidth=2.4;cx.lineCap="round";cx.lineJoin="round";cx.strokeStyle="#111";
  function pt(e){var r=cv.getBoundingClientRect();return[(e.clientX-r.left)*cv.width/r.width,(e.clientY-r.top)*cv.height/r.height];}
  cv.addEventListener("pointerdown",function(e){dr=true;any=true;var q=pt(e);cx.beginPath();cx.moveTo(q[0],q[1]);cv.setPointerCapture(e.pointerId);e.preventDefault();});
  cv.addEventListener("pointermove",function(e){if(!dr)return;var q=pt(e);cx.lineTo(q[0],q[1]);cx.stroke();});
  var end=function(){if(!dr)return;dr=false;};cv.addEventListener("pointerup",end);cv.addEventListener("pointercancel",end);
  $("#dv-pad-ok").addEventListener("click",function(){if(!any){say("Rien n'est dessiné");return;}IMG.sign=cv.toDataURL("image/png");setImgs();draw();say("Signature ajoutée");});
  $("#dv-pad-clear").addEventListener("click",function(){cx.clearRect(0,0,cv.width,cv.height);any=false;});
  toggle();draw();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
