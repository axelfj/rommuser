import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
for(const lang of ['es','en']){
 let s=readFileSync(`site/${lang}/index.html`,'utf8');
 s=s.replace('index, follow, max-image-preview:large','noindex, nofollow');
 s=s.replace('</head>','<link rel="stylesheet" href="/preview/presencia/presence.css"></head>');
 s=s.replace(/href="\/(en|es)\/" hreflang=/g,'href="/preview/presencia/$1/" hreflang=');
 s=s.replace('<div class="world-index">',`<aside class="proposal-bar"><a href="/preview/propuestas/">${lang==='es'?'← Comparar las 10 propuestas':'← Compare all 10 concepts'}</a><span>01 / PRESENCIA · ${lang==='es'?'PROPUESTA':'CONCEPT'}</span></aside><div class="world-index">`);
 mkdirSync(`site/preview/presencia/${lang}`,{recursive:true});writeFileSync(`site/preview/presencia/${lang}/index.html`,s);
}
