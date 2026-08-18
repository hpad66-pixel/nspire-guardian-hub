# -*- coding: utf-8 -*-
"""APAS Civic design system — derived from civic.apas.ai screenshots, 9 Aug 2026.

Key departures from the previous system:
  · Deep forest green replaces obsidian. Warm cream + pale mint replace ivory.
  · Muted tan-gold replaces bright gold.
  · NO MONOSPACE ANYWHERE. Labels are uppercase sans, 700, wide tracking.
  · Serif is used for ALL headings including small card titles — not display only.
  · Square corners. Hairline borders. Almost no shadow.
"""

from fonts_b64 import FONTS

CSS = FONTS + """

:root{
  /* ── forest ── */
  --forest:#17291F;          /* primary dark ground */
  --forest-deep:#112018;     /* footer, deepest */
  --forest-panel:#1B3324;    /* panel on dark */
  --forest-row:#163024;      /* row on dark */
  --forest-line:rgba(255,255,255,.10);

  /* ── light grounds ── */
  --cream:#F6F2E9;           /* page canvas */
  --sand:#EDE6D8;            /* warm band */
  --mint:#E1ECE3;            /* pale mint band */
  --mint-strong:#D0E2D5;     /* closing / emphasis band */
  --paper:#FFFFFF;

  /* ── rules ── */
  --rule:#DCD4C4;
  --rule-soft:#E7E0D2;
  --rule-mint:#C4D8C9;

  /* ── ink ── */
  --ink:#16291F;             /* headings on light */
  --body:#454F4A;            /* body copy */
  --slate:#5F6B65;           /* secondary */
  --mute:#8A948F;            /* tertiary / labels */
  --cream-text:#F2EEE1;      /* headings on dark */
  --cream-body:#B7C2BA;      /* body on dark */
  --cream-mute:#8B9990;      /* labels on dark */

  /* ── accent ── */
  --gold:#C9A34F;            /* gold on dark */
  --gold-deep:#A8842C;       /* gold on light — labels, links */
  --gold-btn:#D8A95E;        /* button fill */
  --gold-light:#E2C079;
  --gold-bg:rgba(184,146,60,.09);
  --sage:#A9D4B8;            /* mint accent text on dark */

  --serif:'Fraunces',Georgia,'Times New Roman',serif;
  --sans:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;
}
*{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth;scroll-padding-top:64px}
body{background:var(--cream);color:var(--body);font-family:var(--sans);
  font-size:16px;line-height:1.68;-webkit-font-smoothing:antialiased}
.wrap{max-width:1200px;margin:0 auto;padding:0 56px}
.narrow{max-width:860px}

/* ── serif headings, sharp cut ── */
h1,h2,h3,.serif{font-family:var(--serif);font-variation-settings:'SOFT' 0,'WONK' 0,'opsz' 144;
  font-weight:700;letter-spacing:-.011em;color:var(--ink)}

/* ── the label: uppercase sans, heavy tracking. NO MONO. ── */
.slabel,.eyebrow,.fact-l,.bstat-l,.sfact-l,.gsec-l,.gk,.mh-meta,.btag,
.proj-id .type,.blk-l,.ml,.seq-ph,.oscell .n,.comcard .n,.bmore,.hint,
.navstrip a,.ft-l,.ft-r,.backlink,.pill,.chip,thead th,tr.grp td,.lockup-sub{
  font-family:var(--sans)}

.slabel{font-size:11px;font-weight:700;letter-spacing:.17em;text-transform:uppercase;
  color:var(--gold-deep);margin-bottom:20px}
.band-dark .slabel{color:var(--gold)}

/* ── glossary term ── */
.tt{border-bottom:1px solid rgba(168,132,44,.5);cursor:help;color:inherit;
  background:rgba(184,146,60,.07);padding:0 1px;transition:.13s}
.tt:hover,.tt:focus{background:rgba(184,146,60,.2);outline:none}
.tt:after{content:'?';font-family:var(--sans);font-size:.6em;font-weight:700;
  vertical-align:super;color:var(--gold-deep);margin-left:2px}
.band-dark .tt{background:rgba(201,163,79,.16);border-bottom-color:rgba(201,163,79,.55)}
.band-dark .tt:after{color:var(--gold)}

/* ── modal ── */
.gdim{position:fixed;inset:0;background:rgba(17,32,24,.62);backdrop-filter:blur(3px);
  display:none;align-items:center;justify-content:center;z-index:900;padding:24px}
.gdim.on{display:flex}
.gbox{background:var(--paper);max-width:660px;width:100%;max-height:86vh;overflow-y:auto;
  box-shadow:0 30px 90px rgba(17,32,24,.4);position:relative;border-top:5px solid var(--gold-btn)}
.gbox-in{padding:40px 46px 42px}
.gclose{position:absolute;top:12px;right:14px;width:32px;height:32px;border:0;cursor:pointer;
  background:transparent;color:var(--mute);font-size:22px;line-height:1}
.gclose:hover{background:var(--sand);color:var(--ink)}
.gk{font-size:10px;font-weight:700;letter-spacing:.19em;text-transform:uppercase;
  color:var(--gold-deep);margin-bottom:12px}
.gbox h3{font-size:31px;margin-bottom:24px;line-height:1.12}
.gsec{margin-bottom:20px}
.gsec:last-child{margin-bottom:0}
.gsec-l{font-size:10px;font-weight:700;letter-spacing:.17em;text-transform:uppercase;
  color:var(--mute);margin-bottom:8px}
.gsec p{font-size:15.5px;line-height:1.68;color:var(--body)}
.gsec.plain{background:var(--mint);border-left:3px solid var(--gold-btn);padding:20px 22px}
.gsec.why{border-top:1px solid var(--rule);padding-top:20px}
.gsec.why p{color:var(--ink);font-weight:500}

/* ── masthead ── */
.masthead{background:var(--forest);color:var(--cream-text);position:relative}
.mh-top{display:flex;justify-content:space-between;align-items:center;padding:20px 0;
  border-bottom:1px solid var(--forest-line)}
.lockup{display:flex;align-items:center;gap:14px}
.mark{width:40px;height:40px;border:1.5px solid var(--cream-text);border-radius:50%;
  display:flex;align-items:center;justify-content:center;font-family:var(--sans);
  font-size:9px;font-weight:700;letter-spacing:.06em;color:var(--cream-text);flex:none}
.lockup-name{display:block;font-family:var(--serif);font-variation-settings:'SOFT' 0,'WONK' 0,'opsz' 60;
  font-size:19px;font-weight:600;color:var(--cream-text);line-height:1.1}
.lockup-sub{display:block;font-size:8.5px;font-weight:700;letter-spacing:.19em;text-transform:uppercase;
  color:var(--cream-mute);margin-top:3px}
.mh-meta{font-size:10px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;
  color:var(--cream-mute)}
.hero{padding:96px 0 100px}
.eyebrow{font-size:11.5px;font-weight:700;letter-spacing:.17em;text-transform:uppercase;
  color:var(--gold);margin-bottom:32px}
h1{font-size:clamp(42px,6vw,78px);line-height:1.0;letter-spacing:-.02em;
  color:var(--cream-text);margin-bottom:30px;font-weight:700}
h1 em{font-style:normal;color:var(--sage)}
.lede{font-size:19px;line-height:1.62;color:var(--cream-body);max-width:640px}
.hero-facts{display:grid;grid-template-columns:repeat(4,auto);justify-content:start;
  margin-top:60px;border-top:1px solid var(--forest-line)}
@media(max-width:880px){.hero-facts{grid-template-columns:repeat(2,auto)}}
.fact{padding:24px 40px 6px 0;margin-right:40px;border-right:1px solid var(--forest-line)}
.fact:last-child{border-right:0}
.fact-l{font-size:9.5px;font-weight:700;letter-spacing:.17em;text-transform:uppercase;
  color:var(--cream-mute);margin-bottom:8px}
.fact-v{font-size:14px;color:var(--cream-text);font-weight:500;line-height:1.45}
.hint{margin-top:32px;font-size:10.5px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;
  color:var(--forest);background:var(--gold-btn);display:inline-flex;align-items:center;gap:9px;
  padding:11px 18px}

/* ── nav ── */
.navstrip{background:var(--paper);border-bottom:1px solid var(--rule);position:sticky;top:0;z-index:50}
.navstrip .wrap{display:flex;overflow-x:auto}
.navstrip a{font-size:10.5px;font-weight:700;letter-spacing:.11em;text-transform:uppercase;
  color:var(--slate);text-decoration:none;padding:16px 17px 14px;
  border-bottom:2px solid transparent;white-space:nowrap;transition:.15s}
.navstrip a:first-child{padding-left:0}
.navstrip a:hover{color:var(--ink);border-bottom-color:var(--gold-btn)}

/* ── sections ── */
section{padding:104px 0;scroll-margin-top:56px}
section.tight{padding:68px 0}
.band-alt{background:var(--sand)}
.band-mint{background:var(--mint)}
.band-dark{background:var(--forest);color:var(--cream-body)}
h2{font-size:clamp(32px,4vw,50px);line-height:1.06;letter-spacing:-.018em;
  color:var(--ink);margin-bottom:24px}
.band-dark h2{color:var(--cream-text)}
h3{font-size:26px;line-height:1.18;color:var(--ink);margin-bottom:14px}
h4{font-family:var(--serif);font-variation-settings:'SOFT' 0,'WONK' 0,'opsz' 60;
  font-weight:600;font-size:17px;color:var(--ink);margin-bottom:11px;letter-spacing:-.006em}
.sdesc{font-size:17.5px;line-height:1.66;color:var(--slate);max-width:780px}
.band-dark .sdesc{color:var(--cream-body)}
.goldrule{width:56px;height:2px;background:var(--gold-btn);margin:0 0 28px}

/* ── bucket cards: shared-hairline grid, one raised ── */
.bgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(330px,1fr));gap:0;
  margin-top:52px;border-top:1px solid var(--rule);border-left:1px solid var(--rule)}
.bcard{background:transparent;border-right:1px solid var(--rule);border-bottom:1px solid var(--rule);
  padding:38px 36px 34px;position:relative;text-decoration:none;display:block;transition:.18s}
.bcard:hover{background:var(--paper);box-shadow:0 14px 40px rgba(17,32,24,.09);z-index:2}
.bnum{position:absolute;top:34px;right:32px;font-family:var(--sans);font-size:11px;
  font-weight:700;letter-spacing:.12em;color:var(--bc);opacity:.6}
.btag{font-size:10px;font-weight:700;letter-spacing:.17em;text-transform:uppercase;
  color:var(--bc);margin-bottom:16px}
.bcard h3{font-size:25px;margin-bottom:14px;padding-right:44px}
.btagline{font-size:15.5px;color:var(--body);line-height:1.6;margin-bottom:22px}
.bposture{font-size:13.5px;color:var(--slate);line-height:1.55;padding-top:18px;
  border-top:1px solid var(--rule-soft)}
.bposture b{font-family:var(--sans);font-size:9.5px;font-weight:700;letter-spacing:.17em;
  text-transform:uppercase;color:var(--mute);display:block;margin-bottom:6px}
.bmore{margin-top:20px;font-size:10.5px;font-weight:700;letter-spacing:.13em;
  text-transform:uppercase;color:var(--gold-deep)}

/* ── three-up ── */
.ssb{display:grid;grid-template-columns:repeat(3,1fr);margin-top:48px;
  border-top:1px solid var(--rule);border-left:1px solid var(--rule)}
.ssb > div{padding:36px 34px;border-right:1px solid var(--rule);border-bottom:1px solid var(--rule)}
.ssb .n{font-family:var(--sans);font-weight:700;font-size:11px;letter-spacing:.14em;
  color:var(--gold-deep);margin-bottom:16px}
.ssb h4{font-size:19px;margin-bottom:11px}
.ssb p{font-size:15px;color:var(--slate);line-height:1.6}

/* ── table ── */
.tblwrap{margin-top:48px;border:1px solid var(--rule);background:var(--paper);overflow-x:auto}
table{width:100%;border-collapse:collapse;font-size:14px}
.tblwrap.fixed table{table-layout:fixed}
.tblwrap.fixed col.c1{width:70px}.tblwrap.fixed col.c3{width:120px}
.tblwrap.fixed col.c4{width:104px}.tblwrap.fixed col.c5{width:92px}.tblwrap.fixed col.c6{width:96px}
.tblwrap.fixed thead th{white-space:normal;padding:13px 10px}
.tblwrap.fixed tbody td{padding:13px 10px;overflow-wrap:anywhere}
thead th{background:var(--forest);color:var(--cream-text);font-size:9.5px;font-weight:700;
  letter-spacing:.15em;text-transform:uppercase;padding:13px;text-align:left}
tbody td{padding:13px;border-bottom:1px solid var(--rule-soft);vertical-align:top;line-height:1.5}
tbody tr:hover{background:var(--gold-bg)}
tr.grp td{background:var(--sand);font-size:10px;letter-spacing:.17em;text-transform:uppercase;
  font-weight:700;color:var(--ink);padding:12px 10px;border-bottom:1px solid var(--rule);
  text-align:left}
tr.grp td span.sw{display:inline-block;width:9px;height:9px;margin-right:10px}
td.pid{font-family:var(--sans);font-size:11.5px;font-weight:700;color:var(--ink);letter-spacing:.03em}
td.pname{font-weight:500;color:var(--ink)}
td.dep,td.role{font-size:11.5px;color:var(--slate);line-height:1.55}
td.bud{font-size:12px;font-weight:600;color:var(--ink);text-align:right}
td.bud.tbd{color:var(--mute);font-weight:400}
td.bud.set{color:var(--gold-deep);font-weight:700}
.pill{display:inline-block;font-size:9px;font-weight:700;letter-spacing:.11em;
  text-transform:uppercase;padding:4px 9px;border:1px solid;white-space:nowrap}
.p-first{color:var(--forest);border-color:var(--gold-btn);background:var(--gold-btn)}
.p-ok{color:#2F6E4F;border-color:rgba(47,110,79,.4);background:rgba(47,110,79,.09)}
.p-act{color:var(--gold-deep);border-color:rgba(168,132,44,.45);background:var(--gold-bg)}
.p-new{color:var(--slate);border-color:var(--rule);background:transparent}
.p-cond{color:#6E5A86;border-color:rgba(110,90,134,.38);background:rgba(110,90,134,.07)}
.p-disc{color:var(--cream-text);border-color:#3B5E80;background:#3B5E80}

/* ── project ── */
.proj{background:var(--paper);border:1px solid var(--rule);margin-bottom:28px;
  scroll-margin-top:60px;overflow:hidden;position:relative}
.proj:before{content:'';position:absolute;left:0;top:0;bottom:0;width:4px;background:var(--bc)}
.proj.first{border-color:var(--gold-btn)}
.proj.discuss{border-color:#3B5E80}
.flagbar{background:var(--gold-btn);color:var(--forest);font-family:var(--sans);font-size:10px;
  font-weight:700;letter-spacing:.19em;text-transform:uppercase;padding:10px 42px;margin-left:4px}
.flagbar.discuss{background:#3B5E80;color:var(--cream-text)}
.proj-head{padding:38px 44px 30px;border-bottom:1px solid var(--rule-soft)}
.proj-id{display:flex;align-items:center;gap:14px;margin-bottom:16px;flex-wrap:wrap}
.proj-id .code{font-family:var(--sans);font-size:12px;font-weight:700;letter-spacing:.08em;
  color:var(--bc);background:var(--bct);padding:5px 11px}
.proj-id .type{font-size:9.5px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;
  color:var(--mute)}
.proj h3{font-size:29px;margin-bottom:16px;line-height:1.14}
.headline{font-size:17.5px;line-height:1.58;color:var(--ink);font-weight:500;
  border-left:3px solid var(--gold-btn);padding-left:20px;margin-bottom:22px}
.context{font-size:15.5px;line-height:1.7;color:var(--slate)}
.proj-body{display:grid;grid-template-columns:1fr 300px;align-items:stretch}
.proj-scope{padding:36px 44px 40px;border-right:1px solid var(--rule-soft)}
.proj-side{padding:32px 30px 38px;background:var(--mint);height:100%}
.blk{margin-bottom:32px}
.blk:last-child{margin-bottom:0}
.blk-l{font-size:10px;font-weight:700;letter-spacing:.17em;text-transform:uppercase;
  color:var(--gold-deep);margin-bottom:16px;padding-bottom:9px;border-bottom:1px solid var(--rule)}
ul.chk{list-style:none}
ul.chk li{position:relative;padding-left:24px;margin-bottom:12px;font-size:15px;
  line-height:1.62;color:var(--body)}
ul.chk li:before{content:'';position:absolute;left:0;top:9px;width:7px;height:7px;
  background:var(--bc);opacity:.6}
ul.dv{list-style:none}
ul.dv li{position:relative;padding-left:22px;margin-bottom:10px;font-size:14px;
  line-height:1.58;color:var(--body)}
ul.dv li:before{content:'\\2192';position:absolute;left:0;top:0;color:var(--gold-deep);font-size:13px}
.sfact{padding:15px 0;border-bottom:1px solid var(--rule-mint)}
.sfact:last-of-type{border-bottom:0}
.sfact-l{font-size:9px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;
  color:var(--mute);margin-bottom:7px}
.sfact-v{font-size:14px;color:var(--ink);font-weight:500;line-height:1.48}
.sfact-v.big{font-family:var(--serif);font-variation-settings:'SOFT' 0,'WONK' 0,'opsz' 72;
  font-size:26px;font-weight:700;letter-spacing:-.01em}
.sfact-v.tbd{color:var(--mute)}
.sfact-v.set{color:var(--gold-deep)}
.sfact-n{font-size:12.5px;color:var(--slate);line-height:1.55;margin-top:8px;font-weight:400}
.driver{font-size:12.5px;color:var(--slate);line-height:1.58}

/* ── sequence ── */
.seqrow{display:grid;grid-template-columns:130px 1fr;gap:32px;padding:30px 0;
  border-top:1px solid var(--rule)}
.seqrow:last-child{border-bottom:1px solid var(--rule)}
.seq-ph{font-size:10px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;
  color:var(--gold-deep);padding-top:4px}
.seq-ph span{display:block;font-family:var(--serif);
  font-variation-settings:'SOFT' 0,'WONK' 0,'opsz' 90;font-size:38px;font-weight:700;
  color:var(--ink);letter-spacing:-.02em;margin-bottom:6px;text-transform:none}
.seq h4{font-size:19px;margin-bottom:10px}
.seq p{font-size:15px;color:var(--slate);line-height:1.64;margin-bottom:14px}
.chips{display:flex;flex-wrap:wrap;gap:8px}
.chip{font-size:10px;font-weight:700;letter-spacing:.08em;padding:5px 10px;
  border:1px solid var(--rule);background:var(--paper);color:var(--ink)}

/* ── callout ── */
.callout{background:var(--paper);border:1px solid var(--rule);border-left:4px solid var(--gold-btn);
  padding:32px 36px;margin-top:36px}
.callout h4{margin-bottom:12px;font-size:18px}
.callout p{font-size:15.5px;color:var(--slate);line-height:1.68}
.callout p+p{margin-top:14px}
.band-dark .callout{background:var(--forest-panel);border-color:var(--forest-line);
  border-left-color:var(--gold-btn)}
.band-dark .callout h4{color:var(--cream-text)}
.band-dark .callout p{color:var(--cream-body)}

/* ── commercial ── */
.comgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:0;margin-top:46px;
  border-top:1px solid var(--rule);border-left:1px solid var(--rule)}
@media(max-width:980px){.comgrid{grid-template-columns:repeat(2,1fr)}}
.comcard{background:var(--paper);border-right:1px solid var(--rule);
  border-bottom:1px solid var(--rule);padding:32px 28px}
.comcard .n{font-size:10.5px;font-weight:700;letter-spacing:.15em;color:var(--gold-deep);
  margin-bottom:14px}
.comcard h4{font-size:18px;margin-bottom:11px}
.comcard p{font-size:14.5px;color:var(--slate);line-height:1.62}
.mathbar{display:flex;flex-wrap:wrap;margin-top:36px;border:1px solid var(--rule);
  background:var(--paper)}
.mathbar > div{flex:1;min-width:170px;padding:28px 28px;border-right:1px solid var(--rule)}
.mathbar > div:last-child{border-right:0;background:var(--mint)}
.mathbar .ml{font-size:9.5px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;
  color:var(--mute);margin-bottom:12px}
.mathbar .mv{font-family:var(--serif);font-variation-settings:'SOFT' 0,'WONK' 0,'opsz' 90;
  font-size:34px;font-weight:700;color:var(--ink);margin-bottom:10px;letter-spacing:-.018em}
.mathbar .mn{font-size:13px;color:var(--slate);line-height:1.55}

/* ── projos on forest ── */
.osgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;
  background:var(--forest-line);border:1px solid var(--forest-line);margin-top:46px}
.oscell{background:var(--forest-panel);padding:32px 28px}
.oscell .n{font-size:10.5px;font-weight:700;letter-spacing:.16em;color:var(--gold);margin-bottom:14px}
.oscell h4{color:var(--cream-text);font-size:19px;margin-bottom:11px}
.oscell p{font-size:14px;color:var(--cream-body);line-height:1.62}

/* ── glossary index ── */
.gindex{display:grid;grid-template-columns:repeat(auto-fill,minmax(228px,1fr));gap:0;
  margin-top:44px;border-top:1px solid var(--rule);border-left:1px solid var(--rule)}
.gitem{background:transparent;border-right:1px solid var(--rule);border-bottom:1px solid var(--rule);
  padding:16px 18px;cursor:pointer;transition:.14s;text-align:left;font-family:var(--sans)}
.gitem:hover{background:var(--paper);box-shadow:0 8px 26px rgba(17,32,24,.08)}
.gitem b{display:block;font-family:var(--serif);font-variation-settings:'SOFT' 0,'WONK' 0,'opsz' 40;
  font-size:15px;color:var(--ink);font-weight:600;margin-bottom:4px;letter-spacing:-.005em}
.gitem span{font-size:12px;color:var(--slate);line-height:1.45;display:block}

/* ── quals ── */
.quals{columns:2;column-gap:52px;margin-top:38px}
.quals li{break-inside:avoid;list-style:none;position:relative;padding-left:22px;
  margin-bottom:16px;font-size:14px;line-height:1.62;color:var(--slate)}
.quals li:before{content:'\\00A7';position:absolute;left:0;top:0;color:var(--gold-deep);font-size:12px}

/* ── footer ── */
footer{background:var(--forest-deep);color:var(--cream-mute);padding:56px 0 60px}
.ft{display:flex;justify-content:space-between;gap:40px;flex-wrap:wrap}
.ft-l,.ft-r{font-size:10px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;line-height:2.1}
.ft-r{text-align:right}
.ft .lockup{margin-bottom:14px}
.backlink{display:inline-block;margin-top:10px;font-size:10px;font-weight:700;letter-spacing:.14em;
  text-transform:uppercase;color:var(--gold);text-decoration:none}

@media(max-width:980px){.osgrid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:880px){
  .wrap{padding:0 26px}
  .proj-body{grid-template-columns:1fr}
  .proj-scope{border-right:0;border-bottom:1px solid var(--rule-soft)}
  .ssb{grid-template-columns:1fr}
  .seqrow{grid-template-columns:1fr;gap:12px}
  .quals{columns:1}
  .hero{padding:60px 0 64px}
  section{padding:64px 0}
  .gbox-in{padding:32px 26px 34px}
}
@media print{
  body{background:#fff}
  .navstrip,.gdim,.hint{display:none}
  section{padding:34px 0;break-inside:avoid}
  .proj,.bcard{break-inside:avoid;box-shadow:none}
  .tt{background:none;border-bottom:1px dotted #999}
  .tt:after{content:''}
  a{text-decoration:none;color:inherit}
}
"""
