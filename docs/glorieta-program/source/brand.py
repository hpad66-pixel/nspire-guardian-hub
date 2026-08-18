# -*- coding: utf-8 -*-
"""APAS Civic, second pass. Complete design system for the single document.

What changed and why:
  Contrast. The cream canvas and grey-green body text were washing out. Canvas is
  now white, body copy is near-black, and rules carry real weight.
  Hierarchy. Numbers sit in filled chips. Package dividers are 3px ink rules.
  Section labels are ink, not pale gold, so gold only ever means status or accent.
  Density. Type is larger, leading is tighter, and figures are tabular so every
  number column aligns.
"""

from fonts_b64 import FONTS

CSS = FONTS + """
:root{
  /* grounds */
  --page:#FFFFFF;
  --band:#F4F2EC;            /* warm structural band */
  --band2:#ECF0EB;           /* cool structural band */
  --forest:#0E241A;          /* masthead, chapter bands */
  --forest2:#163525;         /* panels on dark */
  --forest-line:rgba(255,255,255,.16);

  /* ink */
  --ink:#0F1B14;             /* headings, near black */
  --body:#2B372F;            /* body copy */
  --slate:#4A564E;           /* secondary */
  --mute:#6B776F;            /* labels, tertiary */
  --on-dark:#FFFFFF;
  --on-dark-body:#CBD6CD;
  --on-dark-mute:#93A398;

  /* rules */
  --rule:#D5CFC1;
  --rule-light:#E6E1D5;
  --rule-ink:#0F1B14;

  /* accent */
  --gold:#C89235;            /* accent on dark */
  --gold-ink:#7A5710;        /* accent text on light, passes contrast */
  --gold-fill:#D9A83F;       /* solid fills, flags */
  --gold-tint:#F6EBD3;
  --sage:#9FCFB2;

  --serif:'Fraunces',Georgia,serif;
  --sans:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;
  --num:'Inter',ui-monospace,monospace;
}
*{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth;scroll-padding-top:60px}
body{background:var(--page);color:var(--body);font-family:var(--sans);
  font-size:16.5px;line-height:1.62;-webkit-font-smoothing:antialiased;
  font-feature-settings:'tnum' 1,'cv05' 1}
.wrap{max-width:1180px;margin:0 auto;padding:0 52px}

h1,h2,h3,h4{font-family:var(--serif);
  font-variation-settings:'SOFT' 0,'WONK' 0,'opsz' 144;
  font-weight:700;color:var(--ink);letter-spacing:-.014em}

/* label: ink, not gold. gold is reserved for status. */
.slabel{font-size:11px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;
  color:var(--ink);margin-bottom:18px;display:flex;align-items:center;gap:12px}
.slabel:before{content:'';width:26px;height:3px;background:var(--gold-fill);flex:none}

/* ─────────────────────────────────────────── defined term */
.tt{border-bottom:1.5px solid var(--gold-fill);cursor:pointer;color:inherit;
  font-weight:500;transition:.12s}
.tt:hover,.tt:focus{background:var(--gold-tint);outline:none}
.tt:after{content:'\\002B';font-family:var(--sans);font-size:.58em;font-weight:800;
  vertical-align:super;color:var(--gold-ink);margin-left:2px}
.bhead .tt,.band-dark .tt{border-bottom-color:var(--gold);color:var(--on-dark)}
.bhead .tt:hover,.band-dark .tt:hover{background:rgba(200,146,53,.22)}
.bhead .tt:after,.band-dark .tt:after{color:var(--gold)}

/* ─────────────────────────────────────────── modal */
.gdim{position:fixed;inset:0;background:rgba(14,36,26,.72);display:none;
  align-items:center;justify-content:center;z-index:900;padding:24px}
.gdim.on{display:flex}
.gbox{background:var(--page);max-width:660px;width:100%;max-height:86vh;overflow-y:auto;
  box-shadow:0 40px 100px rgba(14,36,26,.45);position:relative;border-top:6px solid var(--gold-fill)}
.gbox-in{padding:40px 46px 44px}
.gclose{position:absolute;top:14px;right:16px;width:34px;height:34px;border:0;cursor:pointer;
  background:var(--band);color:var(--ink);font-size:20px;line-height:1}
.gclose:hover{background:var(--ink);color:#fff}
.gk{font-size:10px;font-weight:800;letter-spacing:.2em;text-transform:uppercase;
  color:var(--gold-ink);margin-bottom:14px}
.gbox h3{font-size:32px;margin-bottom:26px;line-height:1.1}
.gsec{margin-bottom:22px}
.gsec:last-child{margin-bottom:0}
.gsec-l{font-size:10px;font-weight:800;letter-spacing:.17em;text-transform:uppercase;
  color:var(--ink);margin-bottom:9px}
.gsec p{font-size:15.5px;line-height:1.62;color:var(--body)}
.gsec.plain{background:var(--band2);border-left:4px solid var(--gold-fill);padding:20px 22px}
.gsec.why{border-top:2px solid var(--rule-ink);padding-top:20px}
.gsec.why p{color:var(--ink);font-weight:500}

/* ─────────────────────────────────────────── masthead */
.masthead{background:var(--forest);color:var(--on-dark)}
.mh-top{display:flex;justify-content:space-between;align-items:center;padding:22px 0;
  border-bottom:1px solid var(--forest-line)}
.lockup{display:flex;align-items:center;gap:14px}
.mark{width:42px;height:42px;border:2px solid var(--on-dark);border-radius:50%;
  display:flex;align-items:center;justify-content:center;font-family:var(--sans);
  font-size:9.5px;font-weight:800;letter-spacing:.04em;color:var(--on-dark);flex:none}
.lockup-name{display:block;font-family:var(--serif);
  font-variation-settings:'SOFT' 0,'WONK' 0,'opsz' 60;font-size:20px;font-weight:700;
  color:var(--on-dark);line-height:1.05}
.lockup-sub{display:block;font-size:9px;font-weight:800;letter-spacing:.2em;
  text-transform:uppercase;color:var(--on-dark-mute);margin-top:4px}
.mh-meta{font-size:10.5px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;
  color:var(--on-dark-mute)}
.hero{padding:84px 0 0}
.eyebrow{font-size:11px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;
  color:var(--gold);margin-bottom:28px;display:flex;align-items:center;gap:12px}
.eyebrow:before{content:'';width:26px;height:3px;background:var(--gold-fill)}
h1{font-size:clamp(44px,6.4vw,82px);line-height:.98;letter-spacing:-.026em;
  color:var(--on-dark);margin-bottom:32px}
h1 em{font-style:normal;color:var(--sage)}
.lede{font-size:19.5px;line-height:1.55;color:var(--on-dark-body);max-width:680px;
  padding-bottom:64px}
.doc-meta{display:grid;grid-template-columns:repeat(4,1fr);border-top:1px solid var(--forest-line)}
.fact{padding:26px 28px 40px 0;border-right:1px solid var(--forest-line)}
.fact:last-child{border-right:0;padding-right:0}
.fact-l{font-size:9.5px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;
  color:var(--on-dark-mute);margin-bottom:10px}
.fact-v{font-size:14.5px;color:var(--on-dark);font-weight:500;line-height:1.4}

/* ─────────────────────────────────────────── nav */
.navstrip{background:var(--ink);position:sticky;top:0;z-index:50;
  border-top:4px solid var(--gold-fill)}
.navstrip .wrap{display:flex;overflow-x:auto}
.navstrip a{font-size:10.5px;font-weight:800;letter-spacing:.13em;text-transform:uppercase;
  color:var(--on-dark-mute);text-decoration:none;padding:15px 20px;white-space:nowrap;
  border-bottom:3px solid transparent;transition:.14s}
.navstrip a:first-child{padding-left:0}
.navstrip a:hover{color:#fff;border-bottom-color:var(--gold-fill)}

/* ─────────────────────────────────────────── sections */
section{padding:92px 0;scroll-margin-top:56px}
section.tight{padding:64px 0}
.band-alt{background:var(--band)}
.band-dark{background:var(--forest);color:var(--on-dark-body)}
h2{font-size:clamp(32px,4vw,48px);line-height:1.04;letter-spacing:-.022em;margin-bottom:22px}
.band-dark h2{color:var(--on-dark)}
h3{font-size:27px;line-height:1.14;margin-bottom:12px}
h4{font-size:18px;line-height:1.25;margin-bottom:10px}
.sdesc{font-size:17.5px;line-height:1.6;color:var(--slate);max-width:760px}

/* ─────────────────────────────────────────── intro + contents */
.intro p{font-size:17.5px;line-height:1.62;color:var(--body);max-width:800px}
.intro p+p{margin-top:18px}
.toc{margin-top:52px;border-top:3px solid var(--rule-ink)}
.toc a{display:grid;grid-template-columns:64px 1fr 190px;gap:24px;align-items:start;
  padding:24px 0;border-bottom:1px solid var(--rule);text-decoration:none;transition:.14s}
.toc a:hover{background:var(--band)}
.toc .n{font-size:13px;font-weight:800;letter-spacing:.04em;color:#fff;background:var(--bc);
  width:34px;height:34px;display:flex;align-items:center;justify-content:center}
.toc .t{font-family:var(--serif);font-variation-settings:'SOFT' 0,'WONK' 0,'opsz' 60;
  font-size:23px;font-weight:700;color:var(--ink);letter-spacing:-.012em;line-height:1.2}
.toc .t small{display:block;font-family:var(--sans);font-size:13.5px;font-weight:400;
  letter-spacing:0;color:var(--slate);margin-top:8px;line-height:1.5}
.toc .c{font-size:11px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;
  color:var(--ink);text-align:right;padding-top:6px}
.toc .c i{font-style:normal;color:var(--mute);font-weight:600}

/* ─────────────────────────────────────────── chapter band */
.bhead{background:var(--forest);color:var(--on-dark-body);padding:72px 0;scroll-margin-top:52px}
.bhead .bn{display:inline-block;font-size:12px;font-weight:800;letter-spacing:.14em;
  text-transform:uppercase;color:var(--forest);background:var(--gold-fill);
  padding:7px 14px;margin-bottom:26px}
.bhead h2{color:var(--on-dark);margin-bottom:26px;font-size:clamp(32px,4.2vw,52px)}
.bhead p{font-size:17px;line-height:1.62;color:var(--on-dark-body);max-width:850px}
.bhead p+p{margin-top:16px}
.bstats{display:flex;margin-top:44px;border-top:1px solid var(--forest-line)}
.bstats div{padding:22px 44px 0 0;margin-right:44px;border-right:1px solid var(--forest-line)}
.bstats div:last-child{border-right:0}
.bstats span{display:block;font-size:9.5px;font-weight:800;letter-spacing:.18em;
  text-transform:uppercase;color:var(--on-dark-mute);margin-bottom:8px}
.bstats b{font-family:var(--serif);font-variation-settings:'SOFT' 0,'WONK' 0,'opsz' 72;
  font-size:30px;font-weight:700;color:var(--on-dark)}

/* ─────────────────────────────────────────── work package */
.pkgwrap{padding:0 0 84px}
.pkg{margin-top:64px}
.pkg:first-child{margin-top:68px}
.pkg-head{border-top:3px solid var(--rule-ink);padding-top:26px;
  display:grid;grid-template-columns:96px 1fr;gap:28px;margin-bottom:8px}
.pkg-num{font-size:13px;font-weight:800;letter-spacing:.04em;color:#fff;background:var(--bc);
  width:52px;height:34px;display:flex;align-items:center;justify-content:center}
.pkg h3{font-size:28px;margin-bottom:14px;letter-spacing:-.018em}
.pkg-scope{font-size:16.5px;line-height:1.58;color:var(--body);max-width:760px}
.pkg-exp{margin-top:20px;font-size:14px;color:var(--ink);background:var(--band2);
  display:inline-block;padding:11px 18px;border-left:4px solid var(--bc);font-weight:500}
.pkg-exp b{font-size:9.5px;font-weight:800;letter-spacing:.17em;text-transform:uppercase;
  color:var(--mute);margin-right:12px}

/* ─────────────────────────────────────────── project row */
.pjlist{list-style:none;margin-top:30px;border-top:1px solid var(--rule)}
.pj{display:grid;grid-template-columns:96px 1fr 176px;gap:28px;padding:28px 0;
  border-bottom:1px solid var(--rule);scroll-margin-top:60px}
.pj:hover{background:var(--band)}
.pj-num{font-size:12px;font-weight:800;letter-spacing:.03em;color:var(--ink);
  border:1.5px solid var(--rule-ink);width:62px;height:26px;
  display:flex;align-items:center;justify-content:center}
.pj-name{font-family:var(--serif);font-variation-settings:'SOFT' 0,'WONK' 0,'opsz' 60;
  font-size:21px;font-weight:700;color:var(--ink);letter-spacing:-.014em;
  margin-bottom:10px;display:block;line-height:1.2}
.pj-scope{font-size:15.5px;line-height:1.6;color:var(--body)}
.pj-sub{list-style:none;margin-top:16px;border-left:2px solid var(--rule-light);padding-left:20px}
.pj-sub li{position:relative;font-size:14px;line-height:1.5;color:var(--slate);
  margin-bottom:8px;padding-left:14px}
.pj-sub li:last-child{margin-bottom:0}
.pj-sub li:before{content:'';position:absolute;left:0;top:8px;width:5px;height:5px;
  background:var(--bc)}
.pj-side{text-align:right}
.pj-side .b{font-size:9px;font-weight:800;letter-spacing:.17em;text-transform:uppercase;
  color:var(--mute);display:block;margin-bottom:7px}
.pj-side .v{font-size:16px;font-weight:700;color:var(--mute)}
.pj-side .v.set{color:var(--ink);background:var(--gold-tint);padding:3px 9px;
  border-bottom:2px solid var(--gold-fill)}
.pj-side .pill{margin-bottom:12px}

/* ─────────────────────────────────────────── status */
.pill{display:inline-block;font-size:9.5px;font-weight:800;letter-spacing:.11em;
  text-transform:uppercase;padding:5px 10px}
.p-first{color:var(--forest);background:var(--gold-fill)}
.p-ok{color:#fff;background:#1F6B48}
.p-act{color:#fff;background:#8A6516}
.p-new{color:var(--slate);background:var(--band);border:1px solid var(--rule)}
.p-disc{color:#fff;background:#2C5578}
.p-cond{color:#fff;background:#5C4A78}

/* ─────────────────────────────────────────── sequence */
.seqtbl{margin-top:48px;border-top:3px solid var(--rule-ink)}
.seqrw{display:grid;grid-template-columns:64px 1fr 250px;gap:28px;padding:28px 0;
  border-bottom:1px solid var(--rule)}
.seqrw .p{font-size:14px;font-weight:800;color:#fff;background:var(--ink);
  width:38px;height:38px;display:flex;align-items:center;justify-content:center}
.seqrw h4{font-size:19px;margin-bottom:9px}
.seqrw p{font-size:15px;line-height:1.58;color:var(--slate)}
.seqrw .r{font-size:11.5px;font-weight:700;color:var(--ink);line-height:1.9;text-align:right;
  letter-spacing:.02em}

/* ─────────────────────────────────────────── basis */
.cbase{margin-top:44px;border-top:3px solid var(--rule-ink)}
.cbase div{display:grid;grid-template-columns:250px 1fr;gap:32px;padding:24px 0;
  border-bottom:1px solid var(--rule)}
.cbase b{font-size:11px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;
  color:var(--ink);padding-top:4px}
.cbase p{font-size:15px;line-height:1.58;color:var(--body)}

/* ─────────────────────────────────────────── footer */
footer{background:var(--forest);color:var(--on-dark-mute);padding:60px 0 64px;
  border-top:6px solid var(--gold-fill)}
.ft{display:flex;justify-content:space-between;gap:44px;flex-wrap:wrap}
.ft-l,.ft-r{font-size:10.5px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;
  line-height:2.1}
.ft-r{text-align:right}
.ft .lockup{margin-bottom:16px}
.ft .lockup-name{text-transform:none;letter-spacing:-.01em}

@media(max-width:960px){
  .wrap{padding:0 24px}
  .pj,.pkg-head,.seqrw{grid-template-columns:1fr;gap:14px}
  .pj-side{text-align:left}
  .toc a{grid-template-columns:1fr}
  .toc .c{text-align:left}
  .cbase div{grid-template-columns:1fr;gap:8px}
  .doc-meta{grid-template-columns:repeat(2,1fr)}
  .fact{border-right:0;padding-bottom:20px}
  .hero{padding:52px 0 0}
  section{padding:56px 0}
  .gbox-in{padding:30px 24px 32px}
}
@media print{
  .navstrip,.gdim{display:none}
  section,.bhead,.pkgwrap{padding:26px 0}
  .pkg,.pj{break-inside:avoid}
  .bhead,.masthead,footer{background:#fff;color:#000}
  .bhead h2,.bhead p,.lede,h1,.fact-v{color:#000}
  .tt{border-bottom:1px dotted #666}
  .tt:after{content:''}
  a{color:inherit;text-decoration:none}
}
"""
