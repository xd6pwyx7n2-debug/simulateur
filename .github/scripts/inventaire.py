#!/usr/bin/env python3
"""Inventaire des simulateurs : identification, champs, résultat initial, navigation, maintenance.
Usage : python3 .github/scripts/inventaire.py  (écrit .github/inventaire/simulateurs.md et .json)"""
import re,json,glob,os,subprocess,sys,time
from playwright.sync_api import sync_playwright
ROOT=os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.chdir(ROOT)
PORT=8791
srv=subprocess.Popen([sys.executable,"-m","http.server",str(PORT)],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL);time.sleep(1)
rows=[]
try:
  with sync_playwright() as p:
    b=p.chromium.launch()
    for d in sorted(glob.glob('simulateur-*/index.html')):
      slug=d.split('/')[0];html=open(d,encoding='utf-8').read()
      pg=b.new_page(viewport={"width":390,"height":800});errs=[]
      pg.on("pageerror",lambda e,errs=errs:errs.append(str(e)))
      pg.goto(f"http://localhost:{PORT}/{slug}/");pg.wait_for_timeout(500)
      info=pg.evaluate("""()=>{
        const inp=[...document.querySelectorAll('main input:not([type=hidden]):not([type=checkbox]):not([type=radio]), main select')];
        const num=inp.filter(i=>i.type==='number'||i.inputMode==='decimal'||i.inputMode==='numeric');
        const res=[...document.querySelectorAll('main .result')].filter(r=>r.offsetParent!==null);
        const txt=res.map(r=>[...r.querySelectorAll('.result-main,.result-total,.amount,.result-row strong,.result-card-value,.breakdown-row strong')].map(n=>n.textContent).join(' ')||r.innerText).join(' ');
        const m=(txt.replace(/\\u00a0|\\u202f/g,' ').match(/\\d+(?:[ .]\\d{3})*(?:,\\d+)?(?= ?€)/g)||[]);const zero=m.length>0&&m.every(x=>parseFloat(x.replace(/[ .]/g,'').replace(',','.'))===0)&&!res.some(r=>r.classList.contains('is-empty'));
        return {champs:inp.length,nombres:num.length,sansInputmode:num.filter(i=>!i.inputMode).length,resultat_initial_zero:zero,blocs_resultat:res.length}}""")
      guides=len(set(re.findall(r'href="/guides/[^"]+"',html)));lettres=len(set(re.findall(r'href="/modele-lettre-[^"]+"',html)))
      outils=len(set(re.findall(r'href="/simulateur-[^"]+"',html)))
      src=len(re.findall(r'(service-public\.gouv\.fr|legifrance\.gouv\.fr|urssaf\.fr|francetravail\.fr|ameli\.fr|info-retraite\.fr|travail-emploi\.gouv\.fr|code\.travail\.gouv\.fr)',html))
      m=re.search(r'(?:vérifié|Vérifié|mise à jour|Mis à jour)[^<]{0,40}?(\d{1,2}(?:er)? [a-zéû]+ 20\d\d)',html)
      last=subprocess.run(["git","log","-1","--format=%cs","--",d],capture_output=True,text=True).stdout.strip()
      title=re.search(r'<title>(.*?)</title>',html).group(1)
      rows.append(dict(slug=slug,titre=title,**info,guides=guides,lettres=lettres,outils_lies=outils,sources_officielles=src,date_verif=m.group(1) if m else "",derniere_modif=last,erreurs_js=len(errs)))
      pg.close()
    b.close()
finally: srv.kill()
os.makedirs('.github/inventaire',exist_ok=True)
json.dump(rows,open('.github/inventaire/simulateurs.json','w',encoding='utf-8'),ensure_ascii=False,indent=1)
L=["# Inventaire des simulateurs","","Généré par `.github/scripts/inventaire.py`. Colonnes : champs, champs numériques sans `inputmode`, résultat affichant 0 avant calcul, guides / lettres / outils liés, sources officielles citées, date de vérification affichée, dernière modification, erreurs JavaScript au chargement.","","| Simulateur | Champs | Sans inputmode | Zéro initial | Guides | Lettres | Outils | Sources | Vérifié | Modifié | Erreurs JS |","|---|---|---|---|---|---|---|---|---|---|---|"]
for r in rows:
    L.append(f"| {r['slug']} | {r['champs']} | {r['sansInputmode']} | {'oui' if r['resultat_initial_zero'] else 'non'} | {r['guides']} | {r['lettres']} | {r['outils_lies']} | {r['sources_officielles']} | {r['date_verif'] or '-'} | {r['derniere_modif']} | {r['erreurs_js']} |")
open('.github/inventaire/simulateurs.md','w',encoding='utf-8').write("\n".join(L)+"\n")
print(len(rows),"simulateurs;","zéro initial:",sum(r['resultat_initial_zero'] for r in rows),"; sans inputmode:",sum(r['sansInputmode']>0 for r in rows),"; erreurs js:",sum(r['erreurs_js']>0 for r in rows),"; sans guide:",sum(r['guides']==0 for r in rows),"; sans source:",sum(r['sources_officielles']==0 for r in rows))
