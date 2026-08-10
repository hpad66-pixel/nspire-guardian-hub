# -*- coding: utf-8 -*-
import json, csv, html, os, re
from register import (PROGRAM, BUCKETS, P, ROLE_TEXT, FEE_TEXT, FEE_SHORT,
                      ROLE_SHORT, AUTH_TEXT)
from glossary import G, BYKEY

# Resolved from this file so the build runs wherever the repo is checked out.
# (Was hardcoded to the Cowork sandbox path the documents were first generated in.)
OUT = os.environ.get("GLORIETA_OUT") or os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "out")
os.makedirs(OUT, exist_ok=True)
BK = {b["id"]: b for b in BUCKETS}
e = lambda s: html.escape(str(s))

# ------------------------------------------------------------- glossary link
_pairs = []
for g in G:
    for a in [g["k"]] + g.get("alias", []):
        _pairs.append((a, g["k"]))
_pairs.sort(key=lambda t: -len(t[0]))
_LOOKUP = {a.lower(): k for a, k in _pairs}
_RE = re.compile(r"(?<![\w-])(" + "|".join(re.escape(a) for a, _ in _pairs) + r")(?![\w-])", re.I)


def link(text, used):
    """Wrap the first occurrence of each glossary term in a clickable span."""
    def sub(m):
        raw = m.group(1)
        key = _LOOKUP.get(raw.lower())
        if key is None or key in used:
            return raw
        used.add(key)
        return '<span class="tt" data-k="%s" tabindex="0" role="button">%s</span>' % (key, raw)
    return _RE.sub(sub, text)


def L(text, used):
    return link(e(text), used)


CSS = """
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400..700&family=Inter:wght@300;400;500;600;700;800&display=swap');

:root{
  /* civic.apas.ai — see source/civic-tokens.md */
  --forest:#17352B; --forest-900:#0E241D; --night:#071D18;
  --cream:#F5F1E8; --paper:#FBF9F3; --sand:#EFE9DB;
  --line:#DED7C6; --line-soft:#E9E3D5;
  --ink:#1A211E; --body:#3C4A44; --muted:#6A7A72; --mute:#8B9A92;
  --brass:#B08948; --brass-deep:#8C6A34; --brass-bright:#C8A45E; --brass-lit:#D6B36A;
  --brass-bg:rgba(176,137,72,.075);
  --pass:#3E7A5E; --mint:#B7E2CE;
  --display:'Fraunces',Georgia,'Times New Roman',serif;
  --sans:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
  --shadow:0 22px 60px -42px rgba(14,36,29,.36);
  --lift:0 30px 70px -44px rgba(14,36,29,.44);
}
*{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth;scroll-padding-top:64px}
body{background:var(--cream);color:var(--body);font-family:var(--sans);
  font-size:16px;line-height:1.62;-webkit-font-smoothing:antialiased;
  font-feature-settings:'cv05' 1,'ss01' 1}
.wrap{max-width:1160px;margin:0 auto;padding:0 clamp(24px,5vw,64px)}
.narrow{max-width:860px}
.tnum{font-variant-numeric:tabular-nums}

/* ---------- glossary term ---------- */
.tt{border-bottom:1px solid rgba(176,137,72,.55);cursor:help;color:inherit;
  background:rgba(176,137,72,.07);padding:0 2px;transition:.13s}
.tt:hover,.tt:focus{background:rgba(176,137,72,.2);border-bottom-color:var(--brass-deep);outline:none}
.tt:after{content:'?';font-size:.6em;font-weight:800;vertical-align:super;
  color:var(--brass-deep);margin-left:2px;letter-spacing:0}
.band-dark .tt{background:rgba(214,179,106,.15);border-bottom-color:var(--brass-lit)}
.band-dark .tt:after{color:var(--brass-lit)}

/* ---------- modal ---------- */
.gdim{position:fixed;inset:0;background:rgba(7,29,24,.62);backdrop-filter:blur(4px);
  display:none;align-items:center;justify-content:center;z-index:900;padding:24px}
.gdim.on{display:flex}
.gbox{background:var(--paper);max-width:660px;width:100%;max-height:86vh;overflow-y:auto;
  box-shadow:0 40px 90px -30px rgba(7,29,24,.55);position:relative;
  border-top:4px solid var(--brass)}
.gbox-in{padding:40px 46px 44px}
.gclose{position:absolute;top:14px;right:16px;width:32px;height:32px;border:0;cursor:pointer;
  background:transparent;color:var(--mute);font-size:22px;line-height:1}
.gclose:hover{background:var(--sand);color:var(--forest)}
.gk{font-size:10px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;
  color:var(--brass-deep);margin-bottom:12px}
.gbox h3{font-family:var(--display);font-weight:600;font-size:31px;letter-spacing:-.025em;
  color:var(--forest);margin-bottom:24px;line-height:1.08}
.gsec{margin-bottom:22px}
.gsec:last-child{margin-bottom:0}
.gsec-l{font-size:9.5px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;
  color:var(--mute);margin-bottom:8px}
.gsec p{font-size:15px;line-height:1.68;color:var(--body)}
.gsec.plain{background:var(--sand);border-left:4px solid var(--brass);padding:20px 22px}
.gsec.why{border-top:1px solid var(--line);padding-top:20px}
.gsec.why p{color:var(--ink);font-weight:500}

/* ---------- masthead ---------- */
.masthead{background:var(--night);color:#F4F0E5;position:relative;overflow:hidden}
.masthead:after{content:'';position:absolute;left:0;right:0;bottom:0;height:3px;
  background:linear-gradient(90deg,var(--brass-deep),var(--brass),var(--brass-lit),var(--brass))}
.mh-top{display:flex;justify-content:space-between;align-items:center;
  padding:24px 0;border-bottom:1px solid rgba(244,240,229,.12)}
.lockup{display:flex;align-items:center;gap:11px;font-size:11px;font-weight:800;
  letter-spacing:.16em;text-transform:uppercase;color:#F4F0E5}
.dot{width:9px;height:9px;background:var(--brass-lit);display:inline-block}
.mh-meta{font-size:10.5px;font-weight:700;letter-spacing:.12em;
  text-transform:uppercase;color:#7E9389}
.hero{padding:84px 0 88px}
.eyebrow{font-size:11px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;
  color:var(--brass-lit);margin-bottom:24px}
h1{font-family:var(--display);font-weight:600;font-size:clamp(42px,5.6vw,76px);
  line-height:.99;letter-spacing:-.035em;color:#F6F1E5;margin-bottom:28px;max-width:960px}
h1 em{font-style:italic;font-weight:400;color:var(--brass-lit)}
.lede{font-size:19px;line-height:1.6;color:#A9BCB2;max-width:760px;font-weight:300}
.hero-facts{display:flex;flex-wrap:wrap;margin-top:56px;border-top:1px solid rgba(244,240,229,.14)}
.fact{padding:24px 36px 6px 0;margin-right:36px;border-right:1px solid rgba(244,240,229,.12)}
.fact:last-child{border-right:0}
.fact-l{font-size:9.5px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;
  color:#6F857B;margin-bottom:8px}
.fact-v{font-size:14px;color:#E4E1D8;font-weight:500;line-height:1.45}
.hint{margin-top:28px;font-size:10px;font-weight:800;letter-spacing:.14em;
  text-transform:uppercase;color:var(--brass-lit);display:inline-flex;align-items:center;gap:9px;
  border:1px solid rgba(214,179,106,.42);padding:9px 15px}

/* ---------- nav ---------- */
.navstrip{background:var(--paper);border-bottom:1px solid var(--line);position:sticky;top:0;z-index:50}
.navstrip .wrap{display:flex;overflow-x:auto}
.navstrip a{font-size:10.5px;font-weight:800;letter-spacing:.13em;
  text-transform:uppercase;color:var(--muted);text-decoration:none;padding:16px 22px 14px;
  border-bottom:2px solid transparent;white-space:nowrap;transition:.15s}
.navstrip a:first-child{padding-left:0}
.navstrip a:hover{color:var(--forest);border-bottom-color:var(--brass)}

/* ---------- sections ---------- */
section{padding:86px 0;scroll-margin-top:52px}
section.tight{padding:58px 0}
.band-alt{background:var(--paper);border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
.band-dark{background:var(--forest-900);color:#A9BCB2}
.slabel{font-size:11px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;
  color:var(--brass-deep);margin-bottom:14px}
.band-dark .slabel{color:var(--brass-lit)}
h2{font-family:var(--display);font-weight:600;font-size:clamp(31px,3.9vw,48px);
  line-height:1.04;letter-spacing:-.03em;color:var(--forest);margin-bottom:20px}
.band-dark h2{color:#F6F1E5}
h3{font-family:var(--display);font-weight:600;font-size:26px;
  line-height:1.16;color:var(--forest);margin-bottom:14px;letter-spacing:-.025em}
h4{font-weight:700;font-size:14px;color:var(--forest);margin-bottom:11px;letter-spacing:-.005em}
.sdesc{font-size:17px;line-height:1.66;color:var(--muted);max-width:820px;font-weight:300}
.band-dark .sdesc{color:#93A89E}
.goldrule{width:56px;height:3px;background:var(--brass);margin:0 0 28px}

/* ---------- bucket cards ---------- */
.bgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:20px;margin-top:46px}
.bcard{background:var(--paper);border:1px solid var(--line);padding:34px 32px 30px;
  position:relative;overflow:hidden;box-shadow:var(--shadow);text-decoration:none;display:block;transition:.18s}
.bcard:hover{transform:translateY(-3px);border-color:var(--brass);box-shadow:var(--lift)}
.bcard:before{content:'';position:absolute;left:0;top:0;bottom:0;width:4px;background:var(--bc)}
.bnum{position:absolute;top:22px;right:26px;font-family:var(--display);font-weight:600;
  font-size:48px;line-height:1;color:var(--bc);opacity:.16;letter-spacing:-.04em}
.btag{font-size:9.5px;font-weight:800;letter-spacing:.16em;
  text-transform:uppercase;color:var(--bc);margin-bottom:13px}
.bcard h3{font-size:24px;margin-bottom:12px;padding-right:56px}
.btagline{font-size:15px;color:var(--body);line-height:1.6;margin-bottom:18px}
.bposture{font-size:13px;color:var(--muted);line-height:1.55;padding-top:16px;
  border-top:1px solid var(--line-soft)}
.bposture b{font-size:10px;font-weight:800;color:var(--forest);text-transform:uppercase;
  letter-spacing:.14em;display:block;margin-bottom:6px}
.bmore{margin-top:16px;font-size:10px;font-weight:800;letter-spacing:.14em;
  text-transform:uppercase;color:var(--brass-deep)}

/* ---------- three-up ---------- */
.ssb{display:grid;grid-template-columns:repeat(3,1fr);margin-top:40px;
  border:1px solid var(--line);background:var(--paper)}
.ssb > div{padding:32px 30px;border-right:1px solid var(--line)}
.ssb > div:last-child{border-right:0}
.ssb .n{font-family:var(--display);font-weight:600;font-size:38px;color:var(--brass);
  opacity:.32;line-height:1;margin-bottom:12px;letter-spacing:-.04em}
.ssb h4{font-size:15px;margin-bottom:9px}
.ssb p{font-size:14.5px;color:var(--muted);line-height:1.6}

/* ---------- table ---------- */
.tblwrap{margin-top:42px;border:1px solid var(--line);background:var(--paper);overflow-x:auto}
table{width:100%;border-collapse:collapse;font-size:13.5px}
.tblwrap.fixed table{table-layout:fixed}
.tblwrap.fixed col.c1{width:70px}.tblwrap.fixed col.c3{width:120px}
.tblwrap.fixed col.c4{width:104px}.tblwrap.fixed col.c5{width:92px}.tblwrap.fixed col.c6{width:96px}
.tblwrap.fixed thead th{white-space:normal;padding:13px 10px}
.tblwrap.fixed tbody td{padding:13px 10px;overflow-wrap:anywhere}
thead th{background:var(--forest);color:#CFDDD5;font-size:9.5px;font-weight:800;
  letter-spacing:.14em;text-transform:uppercase;padding:13px;text-align:left}
tbody td{padding:13px;border-bottom:1px solid var(--line-soft);vertical-align:top;line-height:1.5}
tbody tr:hover{background:var(--brass-bg)}
tr.grp td{background:var(--sand);font-size:10px;font-weight:800;
  letter-spacing:.16em;text-transform:uppercase;color:var(--forest);
  padding:12px 10px;border-bottom:1px solid var(--line);text-align:left}
tr.grp td span.sw{display:inline-block;width:8px;height:8px;margin-right:9px}
td.pid{font-size:11.5px;font-weight:800;letter-spacing:.06em;color:var(--forest);
  font-variant-numeric:tabular-nums}
td.pname{font-weight:500;color:var(--ink)}
td.dep,td.role{font-size:10.5px;font-weight:600;letter-spacing:.04em;color:var(--muted);line-height:1.6}
td.bud{font-size:11px;font-weight:700;color:var(--forest);text-align:right;
  font-variant-numeric:tabular-nums;letter-spacing:.02em}
td.bud.tbd{color:var(--mute);font-weight:600}
td.bud.set{color:var(--brass-deep);font-weight:800}
.pill{display:inline-block;font-size:9px;font-weight:800;
  letter-spacing:.1em;text-transform:uppercase;padding:4px 9px;
  border:1px solid;white-space:nowrap}
.p-first{color:#0E241D;border-color:var(--brass);background:var(--brass-lit)}
.p-ok{color:var(--pass);border-color:rgba(62,122,94,.42);background:rgba(62,122,94,.08)}
.p-act{color:var(--brass-deep);border-color:rgba(176,137,72,.48);background:var(--brass-bg)}
.p-new{color:var(--muted);border-color:var(--line);background:var(--sand)}
.p-cond{color:#6B5AA8;border-color:rgba(107,90,168,.36);background:rgba(107,90,168,.07)}
.p-disc{color:#F6F1E5;border-color:var(--forest);background:var(--forest)}

/* ---------- project ---------- */
.proj{background:var(--paper);border:1px solid var(--line);margin-bottom:26px;
  scroll-margin-top:60px;box-shadow:var(--shadow);overflow:hidden;position:relative}
.proj:before{content:'';position:absolute;left:0;top:0;bottom:0;width:4px;background:var(--bc)}
.proj.first{border-color:var(--brass);box-shadow:0 26px 64px -40px rgba(176,137,72,.6)}
.flagbar.discuss{background:var(--forest);color:#F6F1E5}
.proj.discuss{border-color:var(--forest)}
.flagbar{background:var(--brass);color:#0E241D;font-size:10px;font-weight:800;
  letter-spacing:.2em;text-transform:uppercase;padding:10px 40px;margin-left:4px}
.proj-head{padding:36px 42px 28px;border-bottom:1px solid var(--line-soft)}
.proj-id{display:flex;align-items:center;gap:14px;margin-bottom:14px;flex-wrap:wrap}
.proj-id .code{font-size:11.5px;font-weight:800;letter-spacing:.12em;
  color:var(--bc);background:var(--bct);padding:5px 11px}
.proj-id .type{font-size:9.5px;font-weight:800;letter-spacing:.14em;
  text-transform:uppercase;color:var(--mute)}
.proj h3{font-size:28px;margin-bottom:16px}
.headline{font-size:17px;line-height:1.58;color:var(--ink);font-weight:500;
  border-left:4px solid var(--brass);padding-left:20px;margin-bottom:20px}
.context{font-size:15.5px;line-height:1.7;color:var(--muted)}
.proj-body{display:grid;grid-template-columns:1fr 304px;align-items:stretch}
.proj-scope{padding:34px 42px 38px;border-right:1px solid var(--line-soft)}
.proj-side{padding:32px 30px 38px;background:var(--sand);height:100%}
.blk{margin-bottom:30px}
.blk:last-child{margin-bottom:0}
.blk-l{font-size:9.5px;font-weight:800;letter-spacing:.18em;
  text-transform:uppercase;color:var(--brass-deep);margin-bottom:15px;padding-bottom:9px;
  border-bottom:1px solid var(--line)}
ul.chk{list-style:none}
ul.chk li{position:relative;padding-left:23px;margin-bottom:11px;font-size:14.5px;
  line-height:1.64;color:var(--body)}
ul.chk li:before{content:'';position:absolute;left:0;top:9px;width:7px;height:7px;
  background:var(--bc);opacity:.6}
ul.dv{list-style:none}
ul.dv li{position:relative;padding-left:20px;margin-bottom:9px;font-size:13.5px;
  line-height:1.6;color:var(--body)}
ul.dv li:before{content:'\\2192';position:absolute;left:0;top:0;color:var(--brass);font-size:13px}
.sfact{padding:15px 0;border-bottom:1px solid var(--line)}
.sfact:last-of-type{border-bottom:0}
.sfact-l{font-size:9px;font-weight:800;letter-spacing:.16em;
  text-transform:uppercase;color:var(--mute);margin-bottom:7px}
.sfact-v{font-size:13.5px;color:var(--forest);font-weight:600;line-height:1.5}
.sfact-v.big{font-size:18px;font-weight:800;letter-spacing:-.01em;font-variant-numeric:tabular-nums}
.sfact-v.tbd{color:var(--mute)}
.sfact-v.set{color:var(--brass-deep)}
.sfact-n{font-size:12px;color:var(--muted);line-height:1.55;margin-top:7px;font-weight:400}
.driver{font-size:12px;color:var(--muted);line-height:1.6}

/* ---------- sequence ---------- */
.seqrow{display:grid;grid-template-columns:158px 1fr;gap:30px;padding:28px 0;border-top:1px solid var(--line)}
.seqrow:last-child{border-bottom:1px solid var(--line)}
.seq-ph{font-size:10px;font-weight:800;letter-spacing:.16em;
  text-transform:uppercase;color:var(--brass-deep);padding-top:3px}
.seq-ph span{display:block;font-family:var(--display);font-size:34px;font-weight:600;
  color:var(--brass);opacity:.3;letter-spacing:-.04em;margin-bottom:6px;text-transform:none}
.seq h4{font-size:16px;margin-bottom:8px}
.seq p{font-size:14.5px;color:var(--muted);line-height:1.66;margin-bottom:12px}
.chips{display:flex;flex-wrap:wrap;gap:7px}
.chip{font-size:10px;font-weight:700;letter-spacing:.06em;padding:5px 10px;
  border:1px solid var(--line);background:var(--cream);color:var(--forest)}

/* ---------- callout ---------- */
.callout{background:var(--forest);color:#C6D6CD;border-left:4px solid var(--brass);
  padding:32px 36px;margin-top:34px;box-shadow:var(--shadow)}
.callout h4{margin-bottom:11px;font-size:15px;color:#F6F1E5}
.callout p{font-size:15px;color:#A9BCB2;line-height:1.68}
.callout p+p{margin-top:12px}
.callout .tt{background:rgba(214,179,106,.16);border-bottom-color:var(--brass-lit)}
.callout .tt:after{color:var(--brass-lit)}
.band-dark .callout{background:rgba(244,240,229,.04);box-shadow:none}

/* ---------- commercial ---------- */
.comgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-top:40px}
@media(max-width:980px){.comgrid{grid-template-columns:repeat(2,1fr)}}
.comcard{background:var(--paper);border:1px solid var(--line);padding:30px 28px;
  box-shadow:var(--shadow);border-top:3px solid var(--brass)}
.comcard .n{font-size:9.5px;font-weight:800;letter-spacing:.16em;
  text-transform:uppercase;color:var(--brass-deep);margin-bottom:12px}
.comcard h4{font-size:16px;margin-bottom:9px}
.comcard p{font-size:14px;color:var(--muted);line-height:1.64}
.mathbar{display:flex;flex-wrap:wrap;gap:0;margin-top:32px;border:1px solid var(--line);
  background:var(--paper)}
.mathbar > div{flex:1;min-width:160px;padding:24px 26px;border-right:1px solid var(--line)}
.mathbar > div:last-child{border-right:0;background:var(--brass-bg)}
.mathbar .ml{font-size:9px;font-weight:800;letter-spacing:.16em;
  text-transform:uppercase;color:var(--mute);margin-bottom:8px}
.mathbar .mv{font-size:21px;font-weight:800;letter-spacing:-.02em;
  color:var(--forest);margin-bottom:6px;font-variant-numeric:tabular-nums}
.mathbar .mn{font-size:12.5px;color:var(--muted);line-height:1.55}

/* ---------- projos ---------- */
.osgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:1px;
  background:rgba(244,240,229,.12);border:1px solid rgba(244,240,229,.12);margin-top:42px}
.oscell{background:var(--forest-900);padding:30px 28px}
.oscell .n{font-size:10px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;
  color:var(--brass-lit);margin-bottom:13px}
.oscell h4{color:#F6F1E5;font-size:15px;margin-bottom:9px}
.oscell p{font-size:13.5px;color:#8FA69B;line-height:1.65}

/* ---------- glossary index ---------- */
.gindex{display:grid;grid-template-columns:repeat(auto-fill,minmax(215px,1fr));gap:9px;margin-top:38px}
.gitem{background:var(--paper);border:1px solid var(--line);padding:14px 16px;
  cursor:pointer;transition:.14s;text-align:left;font-family:inherit}
.gitem:hover{border-color:var(--brass);background:var(--brass-bg);transform:translateY(-2px)}
.gitem b{display:block;font-size:13.5px;color:var(--forest);font-weight:700;margin-bottom:4px}
.gitem span{font-size:11.5px;color:var(--muted);line-height:1.45;display:block}

/* ---------- quals ---------- */
.quals{columns:2;column-gap:46px;margin-top:34px}
.quals li{break-inside:avoid;list-style:none;position:relative;padding-left:20px;
  margin-bottom:14px;font-size:13.5px;line-height:1.64;color:var(--muted)}
.quals li:before{content:'\\00A7';position:absolute;left:0;top:0;color:var(--brass);font-size:12px}

/* ---------- footer ---------- */
footer{background:var(--forest-900);color:#7E9389;padding:50px 0 56px;border-top:3px solid var(--brass)}
.ft{display:flex;justify-content:space-between;gap:36px;flex-wrap:wrap}
.ft-l,.ft-r{font-size:10px;font-weight:700;letter-spacing:.14em;
  text-transform:uppercase;line-height:2.1}
.ft-r{text-align:right}
.backlink{display:inline-block;margin-top:8px;font-size:10px;font-weight:800;
  letter-spacing:.14em;text-transform:uppercase;color:var(--brass-lit);text-decoration:none}

@media(max-width:880px){
  .proj-body{grid-template-columns:1fr}
  .proj-scope{border-right:0;border-bottom:1px solid var(--line-soft)}
  .proj-head{padding:28px 26px 22px}
  .proj-scope{padding:26px}
  .ssb{grid-template-columns:1fr}
  .ssb > div{border-right:0;border-bottom:1px solid var(--line)}
  .seqrow{grid-template-columns:1fr;gap:12px}
  .quals{columns:1}
  .hero{padding:56px 0 60px}
  section{padding:56px 0}
  .gbox-in{padding:32px 26px 34px}
}
@media print{
  body{background:#fff}
  .navstrip,.gdim,.hint{display:none}
  section{padding:32px 0;break-inside:avoid}
  .proj,.bcard{break-inside:avoid;box-shadow:none}
  .tt{background:none;border-bottom:1px dotted #999}
  .tt:after{content:''}
  a{text-decoration:none;color:inherit}
}
"""

MODAL = """
<div class="gdim" id="gdim" role="dialog" aria-modal="true" aria-labelledby="gterm">
  <div class="gbox"><button class="gclose" id="gclose" aria-label="Close">&times;</button>
    <div class="gbox-in">
      <div class="gk">Glossary</div>
      <h3 id="gterm"></h3>
      <div class="gsec"><div class="gsec-l">In engineering terms</div><p id="gtech"></p></div>
      <div class="gsec plain"><div class="gsec-l">In plain terms</div><p id="gplain"></p></div>
      <div class="gsec why" id="gwhywrap"><div class="gsec-l">Why it matters here</div><p id="gwhy"></p></div>
    </div>
  </div>
</div>
<script>
var GLOSS = __GLOSS__;
(function(){
  var dim=document.getElementById('gdim');
  function open(k){
    var g=GLOSS[k]; if(!g) return;
    document.getElementById('gterm').textContent=g.t;
    document.getElementById('gtech').textContent=g.e;
    document.getElementById('gplain').textContent=g.p;
    var w=document.getElementById('gwhywrap');
    if(g.w){document.getElementById('gwhy').textContent=g.w;w.style.display='block';}
    else{w.style.display='none';}
    dim.classList.add('on');
    document.getElementById('gclose').focus();
  }
  function close(){dim.classList.remove('on');}
  document.addEventListener('click',function(ev){
    var t=ev.target.closest('.tt,.gitem');
    if(t){ev.preventDefault();open(t.getAttribute('data-k'));return;}
    if(ev.target.id==='gclose'||ev.target===dim){close();}
  });
  document.addEventListener('keydown',function(ev){
    if(ev.key==='Escape')close();
    if((ev.key==='Enter'||ev.key===' ')&&document.activeElement&&
       document.activeElement.classList.contains('tt')){
      ev.preventDefault();open(document.activeElement.getAttribute('data-k'));}
  });
})();
</script>"""


def modal_block():
    d = {g["k"]: {"t": g["term"], "e": g["tech"], "p": g["plain"], "w": g.get("why", "")} for g in G}
    return MODAL.replace("__GLOSS__", json.dumps(d, ensure_ascii=False))


def masthead(eyebrow, title_html, lede, facts, hint=True):
    f = "".join('<div class="fact"><div class="fact-l">%s</div><div class="fact-v">%s</div></div>'
                % (a, b) for a, b in facts)
    h = ('<div class="hint">&#9432;&nbsp; Any underlined term is clickable — plain-English explanation</div>'
         if hint else "")
    return """<header class="masthead"><div class="wrap">
  <div class="mh-top"><div class="lockup"><span class="dot"></span> APAS Consulting</div>
    <div class="mh-meta">%s &nbsp;·&nbsp; %s</div></div>
  <div class="hero"><div class="eyebrow">%s</div><h1>%s</h1>
    <p class="lede">%s</p>%s<div class="hero-facts">%s</div></div>
</div></header>""" % (e(PROGRAM["version"]), e(PROGRAM["date"]), eyebrow, title_html, lede, h, f)


def navstrip(items):
    return '<nav class="navstrip"><div class="wrap">%s</div></nav>' % "".join(
        '<a href="%s">%s</a>' % (h, t) for h, t in items)


def footer(back=False):
    b = '<a class="backlink" href="Glorieta-Gardens-Program-of-Work.html">&larr; Program Master</a>' if back else ""
    return """<footer><div class="wrap"><div class="ft">
  <div class="ft-l"><span class="lockup"><span class="dot"></span> APAS Consulting LLC</span><br>
    Prepared for %s<br>%s<br>%s</div>
  <div class="ft-r">%s &nbsp;·&nbsp; %s<br>%s<br>Planning document — each project authorised by its own proposal<br>%s</div>
</div></div></footer>""" % (e(PROGRAM["owner"]), e(PROGRAM["property"]), e(PROGRAM["address"]),
                            e(PROGRAM["version"]), e(PROGRAM["date"]), e(PROGRAM["contract_ref"]), b)


def page(title, body):
    return """<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>%s</title><style>%s</style></head><body>
%s
%s
</body></html>""" % (e(title), CSS, body, modal_block())


SHORT_STATUS = {"First deliverable": "First", "Active obligation": "Active",
                "To be demonstrated": "Proposed", "Scope approved": "Approved",
                "For discussion": "Discuss"}


def status_pill(s, short=False):
    label = SHORT_STATUS.get(s, s) if short else s
    k = s.lower()
    if "first deliverable" in k:
        c = "p-first"
    elif "discussion" in k:
        c = "p-disc"
    elif "approved" in k:
        c = "p-ok"
    elif "progress" in k or "active" in k or "demonstrated" in k:
        c = "p-act"
    elif "conditional" in k:
        c = "p-cond"
    else:
        c = "p-new"
    return '<span class="pill %s">%s</span>' % (c, e(label))


def glossary_index(keys, title, blurb):
    ks = [k for k in [g["k"] for g in G] if k in keys]
    items = "".join('<button class="gitem" data-k="%s"><b>%s</b><span>%s</span></button>'
                    % (k, e(BYKEY[k]["term"]), e(BYKEY[k]["plain"][:82].rsplit(" ", 1)[0] + "…"))
                    for k in ks)
    return """<section class="band-alt" id="glossary"><div class="wrap">
  <div class="slabel">Glossary</div><h2>%s</h2>
  <p class="sdesc">%s</p>
  <div class="gindex">%s</div>
</div></section>""" % (title, blurb, items)


# ============================================================ BUCKET PAGE ====
def bucket_page(b):
    items = [p for p in P if p["bucket"] == b["id"]]
    used_all = set()
    nav = navstrip([("Glorieta-Gardens-Program-of-Work.html", "&larr; Program Master")]
                   + [("#" + p["id"], p["id"]) for p in items] + [("#glossary", "Glossary")])
    facts = [("Bucket", "%s &nbsp;/&nbsp; %s" % (b["num"], b["id"])),
             ("Projects", str(len(items))),
             ("Posture", e(b["posture"])),
             ("Authorisation", "One proposal per project")]
    head = masthead("Glorieta Gardens &nbsp;·&nbsp; Bucket %s of 05" % b["num"],
                    e(b["name"]), e(b["tagline"]), facts)

    u = set()
    intro = """<section class="tight"><div class="wrap narrow">
  <div class="goldrule"></div><p class="sdesc">%s</p>
  <div class="callout"><h4>Why this matters</h4><p>%s</p></div>
</div></section>""" % (L(b["summary"], u), L(b["why"], u))
    used_all |= u

    cards = []
    for p in items:
        u = set()
        scope = "".join("<li>%s</li>" % L(x, u) for x in p["scope"])
        dels = "".join("<li>%s</li>" % L(x, u) for x in p["deliverables"])
        pred = " · ".join(p["pred"]) if p["pred"] else "None — can start now"
        bud_cls = "set" if p["budget"] != "TBD" else "tbd"
        kind = p.get("flag_kind", "first")
        flag = ('<div class="flagbar %s">%s</div>' % (kind, e(p["flag"]))) if p.get("flag") else ""
        cards.append("""
<article class="proj%s" id="%s" style="--bc:%s;--bct:%s">%s
  <div class="proj-head">
    <div class="proj-id"><span class="code">%s</span><span class="type">%s</span>%s</div>
    <h3>%s</h3><p class="headline">%s</p><p class="context">%s</p>
  </div>
  <div class="proj-body">
    <div class="proj-scope">
      <div class="blk"><div class="blk-l">Scope of Work</div><ul class="chk">%s</ul></div>
      <div class="blk"><div class="blk-l">Deliverables</div><ul class="dv">%s</ul></div>
    </div>
    <aside class="proj-side">
      <div class="sfact"><div class="sfact-l">Budget</div>
        <div class="sfact-v big %s">%s</div><div class="sfact-n">%s</div></div>
      <div class="sfact"><div class="sfact-l">Authorisation</div><div class="sfact-v">%s</div></div>
      <div class="sfact"><div class="sfact-l">Fee Basis</div><div class="sfact-v">%s</div></div>
      <div class="sfact"><div class="sfact-l">APAS Role</div><div class="sfact-v">%s</div></div>
      <div class="sfact"><div class="sfact-l">Follows</div><div class="sfact-v">%s</div></div>
      <div class="sfact"><div class="sfact-l">Parties</div><div class="sfact-v">%s</div></div>
      <div class="sfact"><div class="sfact-l">Regulatory Driver</div><div class="driver">%s</div></div>
    </aside>
  </div>
</article>""" % ((" " + kind) if p.get("flag") else "", p["id"], b["color"], b["tint"], flag,
                 p["id"], e(p["type"]), status_pill(p["status"]),
                 L(p["name"], u), L(p["headline"], u), L(p["context"], u), scope, dels,
                 bud_cls, e(p["budget"]), L(p["budget_note"], u), e(AUTH_TEXT[p["auth"]]),
                 e(FEE_TEXT[p["fee"]]), e(ROLE_TEXT[p["role"]]), e(pred), e(p["party"]),
                 L(p["driver"], u)))
        used_all |= u

    body_sec = """<section class="band-alt"><div class="wrap">
  <div class="slabel">Bucket %s — Projects</div>
  <h2>%s projects, each authorised by its own proposal</h2>
  <p class="sdesc">Every item below is a discrete project with a defined scope and a defined set of deliverables. No amount is shown where none has been established. Where a project depends on an earlier result, that dependency is named — and where it can start now, it says so.</p>
  <div style="margin-top:44px">%s</div>
</div></section>""" % (b["num"], len(items), "".join(cards))

    gl = glossary_index(used_all, "Every technical term in this document, in plain English",
                        "Click any term for the engineering definition and the plain-English version side by side. The same terms are clickable wherever they appear in the text above.")

    close = """<section><div class="wrap narrow">
  <div class="slabel">Next Step</div><h2>How this bucket gets authorised</h2>
  <p class="sdesc">Each project above is issued as a short standalone proposal — scope, deliverables, fee and terms on one or two pages. Your signature on that proposal is the basis of the work, and nothing proceeds without it. Projects can be authorised individually and in any order the dependencies permit, so the program can start small and expand as results come in.</p>
  <a class="backlink" href="Glorieta-Gardens-Program-of-Work.html">&larr; Back to the Program Master</a>
</div></section>"""

    return page("%s — %s | Glorieta Gardens Program of Work" % (b["num"], b["name"]),
                head + nav + intro + body_sec + gl + close + footer(back=True))


# ============================================================ MASTER =========
def master_page():
    used_all = set()
    facts = [("Property", e(PROGRAM["property"])),
             ("Owner", "Glorieta Partners, Ltd. / R4"),
             ("Program Buckets", "05"),
             ("Discrete Projects", str(len(P))),
             ("First Deliverable", "Stormwater Management Plan")]
    head = masthead("Glorieta Gardens &nbsp;·&nbsp; Program of Work",
                    'Four systems.<br>One property.<br><em>One operating record.</em>',
                    "This document sets out every piece of work required to bring the stormwater, sewer, water and environmental systems at Glorieta Gardens into a defensible, permitted, operable condition — and to close the Consent Order completely. Each piece of work is presented as a project, because that is what it is: a defined scope, a defined set of deliverables, and its own proposal for your signature.",
                    facts)
    nav = navstrip([("#read", "How to read this"), ("#buckets", "The five buckets"),
                    ("#portfolio", "Project portfolio"), ("#discuss", "For discussion"),
                    ("#commercial", "Authorisation & fees"),
                    ("#sequence", "Sequencing"), ("#projos", "ProjOS"),
                    ("#glossary", "Glossary"), ("#basis", "Basis & qualifications")])

    read = """<section id="read"><div class="wrap">
  <div class="slabel">How to read this document</div>
  <h2>Everything here is a project</h2>
  <p class="sdesc">That framing is deliberate. Some of this work is construction and looks like a project already. Some of it is administrative — a conveyance, a file review, a compliance close-out — and is easy to mistake for an errand. It is not. Administrative work consumes real effort, depends on outside parties, and slips if nobody is accountable for it. So every item in this program, technical or administrative, carries the same three things.</p>
  <div class="ssb">
    <div><div class="n">01</div><h4>Scope</h4><p>What gets done, what gets produced, and where the boundary is. Every project lists its scope of work and its deliverables, so completion is a fact rather than an opinion.</p></div>
    <div><div class="n">02</div><h4>Sequence</h4><p>A named list of what must finish first. The dependency map is what turns thirty-one projects into an ordered program instead of a queue of requests.</p></div>
    <div><div class="n">03</div><h4>Authorisation</h4><p>Each project is issued as a short proposal — scope, deliverables, fee, terms. Your signature on it is the basis of the work. Nothing proceeds without one.</p></div>
  </div>
  <div class="callout"><h4>A note on the language</h4>
    <p>This is a technical program and the technical terms are used deliberately, because they are the words the City, DERM, SFWMD and FDEP will use in every document they send back. But no term should be a barrier. Every one of them is underlined and clickable — click it and you get the engineering definition and the plain-English version side by side, and for the ones that really matter, why it matters on this property specifically.</p>
    <p>There is also a full glossary at the bottom of this document and of each bucket document.</p></div>
  <div class="callout"><h4>What the program is for</h4>
    <p>Three outcomes, in order of consequence. First, close the Consent Order completely — every enumerated corrective action documented and released in writing. Second, get water, sewer and stormwater operating in conformance with their design, their permits and their environmental and regulatory obligations at both local and state level. Third, and underneath both, mitigate physical risk to the property — above all the risk of a flooding event.</p></div>
</div></section>"""

    bcards = []
    for b in BUCKETS:
        n = len([p for p in P if p["bucket"] == b["id"]])
        bcards.append("""<a class="bcard" href="%s" style="--bc:%s">
  <div class="bnum">%s</div><div class="btag">Bucket %s &nbsp;·&nbsp; %d projects</div>
  <h3>%s</h3><p class="btagline">%s</p>
  <div class="bposture"><b>Current posture</b>%s</div>
  <div class="bmore">Open the bucket document &rarr;</div></a>"""
                      % (b["file"], b["color"], b["num"], b["num"], n, e(b["name"]),
                         e(b["tagline"]), e(b["posture"])))

    buckets_sec = """<section id="buckets" class="band-alt"><div class="wrap">
  <div class="slabel">The Program</div>
  <h2>Four systems and the layer that runs them</h2>
  <p class="sdesc">Stormwater leads, because its governing plan is the program's first deliverable and everything in that bucket is written into it. Sewer and water are the two other physical systems. Environmental services and regulatory compliance is the fourth bucket — the standing obligation that runs across all three and terminates in the Consent Order close-out. The fifth is not a system but a delivery layer: APAS program management, and ProjOS as the single operating record.</p>
  <div class="bgrid">%s</div>
</div></section>""" % "".join(bcards)

    rows = []
    for b in BUCKETS:
        items = [p for p in P if p["bucket"] == b["id"]]
        rows.append('<tr class="grp"><td colspan="6"><span class="sw" style="background:%s"></span>Bucket %s — %s</td></tr>'
                    % (b["color"], b["num"], e(b["name"])))
        for p in items:
            pred = " · ".join(p["pred"]) if p["pred"] else "—"
            cls = "set" if p["budget"] != "TBD" else "tbd"
            rows.append("""<tr><td class="pid">%s</td>
  <td class="pname"><a href="%s#%s" style="color:inherit;text-decoration:none">%s</a></td>
  <td>%s</td><td class="role">%s</td><td class="dep">%s</td><td class="bud %s">%s</td></tr>"""
                        % (p["id"], b["file"], p["id"], e(p["name"]),
                           status_pill(p["status"], short=True),
                           e(ROLE_SHORT[p["role"]]), e(pred), cls,
                           e(p["budget"].split(" — ")[0])))

    portfolio = """<section id="portfolio"><div class="wrap">
  <div class="slabel">Project Portfolio</div>
  <h2>All %d projects, in one register</h2>
  <p class="sdesc">Click any project name to open its full scope and deliverables in the relevant bucket document. <strong>Follows</strong> shows what must finish before a project can start. <strong>Budget</strong> shows TBD wherever no amount has been established — a figure appears only once a scope has been approved.</p>
  <div class="tblwrap fixed"><table>
    <colgroup><col class="c1"><col class="c2"><col class="c3"><col class="c4"><col class="c5"><col class="c6"></colgroup>
    <thead><tr><th>ID</th><th>Project</th><th>Status</th><th>APAS role</th><th>Follows</th><th>Budget</th></tr></thead>
    <tbody>%s</tbody></table></div>
  <div class="callout"><h4>Reading the Budget column</h4>
    <p>Only one line in this program currently carries a number: <strong>WTR-01, the Water &amp; Sewer Records and File Assessment, at $3,000 lump sum — scope approved.</strong> Every other line reads TBD, and that is accurate rather than evasive. Several of these projects cannot be priced responsibly until an earlier one tells us what is actually there, and quoting a number before that point would be a guess dressed as an estimate.</p>
    <p>Each project is priced in its own proposal at the point it is ready to be authorised.</p></div>
</div></section>""" % (len(P), "".join(rows))

    disc_items = [p for p in P if p["status"] == "For discussion"]
    u = set()
    dcards = "".join("""<div class="comcard" style="border-top-color:var(--forest)">
      <div class="n" style="color:var(--forest)">%s &nbsp;·&nbsp; %s</div>
      <h4>%s</h4><p>%s</p>
      <p style="margin-top:12px"><a href="%s#%s" style="color:var(--brass-deep);text-decoration:none;
        font-weight:800;font-size:10.5px;letter-spacing:.14em;
        text-transform:uppercase">Read the outline &rarr;</a></p></div>"""
      % (p["id"], e(BK[p["bucket"]]["name"]), L(p["name"], u), L(p["headline"], u),
         BK[p["bucket"]]["file"], p["id"]) for p in disc_items)
    used_all |= u

    discuss = """<section id="discuss"><div class="wrap">
  <div class="slabel">For Discussion</div>
  <h2>One item I would like to talk through before proposing anything</h2>
  <p class="sdesc">Everything else in this program is either underway, approved, or ready to be proposed when you want it. This one is different. It is a small piece of work, it is not scoped, and I have deliberately not put a scope or a fee against it — because the right shape for it depends on what you want out of it, and that is a conversation rather than a document.</p>
  <div class="comgrid" style="grid-template-columns:repeat(2,1fr);max-width:760px">%s</div>
  <div class="callout" style="border-left-color:#2E6BA6"><h4>Why I am raising it now rather than later</h4>
    <p>The timing is unusually good, and it will not stay this good. Non-revenue water analysis needs three things: a reliable measurement of what enters the property, reliable measurement of what gets used, and a clean separation of the large uses that are not billed to residents. Right now the property has none of those. Within this program it acquires all three — the meter box program puts real metering in, and the irrigation well takes the single largest unbilled use off the potable system entirely.</p>
    <p>That means a baseline established now, before those changes, and re-run after them, is worth considerably more than one done at either point alone. It would tell you not just what the loss is, but how much of it the work you are already paying for has recovered.</p>
    <p>It is also the one item in this program that is likely to <em>reduce</em> an operating cost rather than avoid a future one. Worth twenty minutes of conversation.</p></div>
</div></section>""" % dcards

    commercial = """<section id="commercial" class="band-alt"><div class="wrap">
  <div class="slabel">Authorisation &amp; Fees</div>
  <h2>How the work is authorised, and how APAS is paid</h2>
  <p class="sdesc">The mechanism is deliberately simple, because complicated authorisation is how programs stall. One project, one short proposal, one signature. No master commitment, no open-ended retainer for technical work, and no work performed without an approved scope behind it.</p>
  <div class="comgrid">
    <div class="comcard"><div class="n">01</div><h4>One proposal per project</h4>
      <p>Each project is issued as a standalone proposal of one or two pages: scope, deliverables, fee, schedule and terms. Nothing bundled, nothing buried.</p></div>
    <div class="comcard"><div class="n">02</div><h4>Your signature is the basis of the work</h4>
      <p>An executed proposal is the authorisation document. It defines what was agreed and what will be delivered, and it is the reference for any later question about scope.</p></div>
    <div class="comcard"><div class="n">03</div><h4>Authorise in any order</h4>
      <p>Projects can be approved individually and in whatever order the dependencies allow. The program can start with one project and expand as results come in.</p></div>
    <div class="comcard"><div class="n">04</div><h4>Nothing proceeds unauthorised</h4>
      <p>No work begins, and no subcontractor is engaged, without an approved proposal covering it. Every proposal and its approval status is tracked in ProjOS.</p></div>
  </div>
  <h3 style="margin-top:56px">Two ways APAS delivers, two ways APAS is paid</h3>
  <p class="sdesc">Some of this work APAS performs directly. The rest requires licensed specialists — surveyors, drillers, CCTV crews, geotechnical and environmental firms, laboratories, contractors. Those are procured, contracted, supervised, verified and paid through APAS, and that administration carries a standard markup.</p>
  <div class="mathbar">
    <div><div class="ml">APAS self-performed</div><div class="mv">Lump sum</div>
      <div class="mn">Planning, records review, modelling, analysis, design coordination, compliance and program management. Fixed fee, stated in the proposal.</div></div>
    <div><div class="ml">Specialty subcontract</div><div class="mv">Cost</div>
      <div class="mn">Survey, CCTV, geotechnical, drilling, laboratory, dredging and construction, at the price APAS contracts them for.</div></div>
    <div><div class="ml">Overhead</div><div class="mv">+ 10%</div>
      <div class="mn">Procurement, contracting, insurance and bonding administration, supervision, verification of installed work, and payment control.</div></div>
    <div><div class="ml">Profit</div><div class="mv">+ 10%</div>
      <div class="mn">APAS fee for carrying performance and schedule risk on subcontracted work.</div></div>
  </div>
  <div class="callout"><h4>What that means in practice</h4>
    <p>Professional services APAS performs directly are quoted as a fixed lump sum — you know the number before you sign. Third-party work is passed through at APAS's contracted cost plus 10&#37; overhead and 10&#37; profit, and the underlying cost is open to you on request. Recurring services — ongoing regulatory compliance, program management and the ProjOS operating record — are monthly under an annual authorisation.</p>
    <p>Every project card in the bucket documents states which of these applies, so there is never a question about how a given line is billed.</p></div>
</div></section>"""

    phases = [
        ("01", "Authorise the plan and the two approved reviews",
         "The Stormwater Management Plan is written first, because it defines the design basis and the standard the property will be held to, and gives every project after it a stated place inside a document rather than a standalone cost. Alongside it, the water and sewer records assessment is already approved, and the environmental file review can start immediately — neither has a predecessor.",
         ["STM-01", "WTR-01", "ENV-01", "SWR-01"]),
        ("02", "Discovery — find out what is actually there",
         "The field campaign. The camera goes through the stormwater system and tells us what exists; the survey then locates and elevates it; the geotechnical work measures how fast the soil absorbs water; the pond is surveyed above and below the waterline; the water system is field-verified; and the boundary monitoring wells go in where the plume analysis says they belong.",
         ["STM-02", "STM-03", "STM-04", "STM-05", "STM-06", "WTR-02", "ENV-02"]),
        ("03", "Analysis — turn fact into a decision",
         "The hydraulic model is the fulcrum of the entire program. It takes the survey, the camera geometry, the permeability values and the pond storage curve and answers the question that matters: in a 5-year, 25-year and 100-year storm, does water enter the buildings and are the streets passable. Everything downstream of it is scoped by its results. The dredge volume, the sediment characterization and the groundwater sampling run in parallel.",
         ["STM-10", "STM-07", "STM-08", "ENV-03"]),
        ("04", "Design and permit — build what the analysis requires",
         "Pond, lift station, regrading and any supplemental features are designed to the capacity the model demands, then permitted through DERM, SFWMD and the City. On the water side, the meter box, backflow and irrigation well programs are designed and permitted off the verified as-built. The flow meter goes in at the sewer discharge point.",
         ["STM-11", "STM-12", "STM-13", "STM-14", "WTR-03", "WTR-04", "WTR-05", "SWR-02", "ENV-04"]),
        ("05", "Construct — the physical work",
         "Dredging and regrading are the largest physical items in the program, and both stay unpriced until Phase 03 closes. That is the argument for moving briskly through discovery and analysis: until the model runs, the construction scope is genuinely unknown.",
         ["STM-09", "STM-13", "STM-14"]),
        ("06", "Operationalize — hand over a running system",
         "The Stormwater Management Plan is reissued as the final governing document, and the Stormwater Operations Plan turns it into a running operation — the same way the sewer extension was operationalized. The Consent Order closes with a written release. Ongoing compliance, program management and ProjOS continue.",
         ["STM-01", "STM-15", "ENV-05", "ENV-06", "PMO-01", "PMO-02"]),
    ]
    u = set()
    seqrows = "".join("""<div class="seqrow"><div class="seq-ph"><span>%s</span>Phase %s</div>
  <div><h4>%s</h4><p>%s</p><div class="chips">%s</div></div></div>"""
                      % (n, n, t, L(d, u), "".join('<span class="chip">%s</span>' % c for c in ch))
                      for n, t, d, ch in phases)
    used_all |= u

    sequence = """<section id="sequence"><div class="wrap">
  <div class="slabel">Sequencing</div>
  <h2>The order matters more than the pace</h2>
  <p class="sdesc">This program has a critical path, and it runs through the plan and then through discovery. Almost every consequential decision in the stormwater bucket is downstream of the hydraulic model, and the model cannot run until the camera, the survey and the geotechnical work are complete. Doing the inexpensive front end first is what makes everything after it estimable.</p>
  <div class="seq">%s</div>
  <div class="callout"><h4>The critical path, stated plainly</h4>
    <p>STM-01 &rarr; STM-02 &rarr; STM-03 &rarr; STM-04 &rarr; STM-05 &rarr; STM-10 &rarr; STM-13. Plan, records, camera, survey, geotechnical, model, construction. Six comparatively small projects stand between the owner and a defined, priceable scope on the largest physical item in the program. Until that chain is complete, any number attached to the construction work would be invented.</p></div>
</div></section>""" % seqrows

    projos = """<section id="projos" class="band-dark"><div class="wrap">
  <div class="slabel">Delivery Layer</div>
  <h2>ProjOS — one operating record for the whole property</h2>
  <p class="sdesc">Thirty-one projects across four systems and three regulators is not a spreadsheet problem. Every project in this document is instantiated in ProjOS as a live object carrying its scope, deliverables, permits, documents, proposal status and current progress. The systems connect to each other: the sewer flow meter feeds live data, the compliance calendar drives alerts before deadlines rather than after them, and the evidence file for the Consent Order assembles itself as work is completed. This is the piece worth demonstrating live rather than describing — we should put it in front of R4 and walk through it.</p>
  <div class="osgrid">
    <div class="oscell"><div class="n">01</div><h4>Project register</h4><p>All thirty-one projects with scope, deliverables and dependencies, rolled up by bucket to a single program dashboard.</p></div>
    <div class="oscell"><div class="n">02</div><h4>Proposal &amp; approval tracking</h4><p>Every proposal from issue through signature to completion, so the authorisation record for any project is one click away.</p></div>
    <div class="oscell"><div class="n">03</div><h4>Live data</h4><p>Sewer effluent flow and wet-weather response, groundwater analytical trends, and stormwater system performance — measured, not reported.</p></div>
    <div class="oscell"><div class="n">04</div><h4>Compliance engine</h4><p>Permit register, reporting calendar, lead-time alerts and automatic evidence capture across the City, DERM, RER, SFWMD and FDEP.</p></div>
    <div class="oscell"><div class="n">05</div><h4>Document control</h4><p>Every drawing, permit, certification, test result and report attached to the project that produced it. Audit-ready at any moment.</p></div>
    <div class="oscell"><div class="n">06</div><h4>Operations layer</h4><p>The sewer, water and stormwater operations plans running as scheduled tasks with completion evidence — the plan actually operating, not sitting on a shelf.</p></div>
  </div>
  <div class="callout"><h4>Recommended next step</h4>
    <p>A working session with R4 to walk through ProjOS with this program already loaded — the five buckets, the thirty-one projects and the dependency map live on screen. Reading about an operating record and using one are different experiences, and the second one is short.</p></div>
</div></section>"""

    gl = glossary_index(set(BYKEY.keys()),
                        "Every technical term in this program, in plain English",
                        "Click any term for the engineering definition and the plain-English version side by side. The same terms are clickable wherever they appear in this document and in each bucket document.")

    quals = [
        "No dollar amount appears in this document except where a scope has been approved. Where a line reads TBD, no amount has been established and none is implied.",
        "Every project is priced in its own proposal at the point it is ready to be authorised. Nothing in this document constitutes a proposal, a quotation or a commitment to price.",
        "Several projects cannot be priced responsibly until an earlier project establishes what is physically present. This is stated on each affected project rather than concealed behind a placeholder figure.",
        "APAS self-performed professional services are quoted as a fixed lump sum in each proposal.",
        "Third-party and specialty subcontracted work is procured, contracted, administered and paid through APAS at contracted cost plus 10&#37; overhead and 10&#37; profit. Underlying cost is available to the owner on request.",
        "Recurring services — ongoing regulatory compliance, program management and the ProjOS operating record — are monthly under an annual authorisation.",
        "Permit fees, agency review fees, records request and reproduction fees, the Utilities Performance Security, the final-obligations cash bond and City-supplied water meters are excluded and pass through at cost or sit with the owner.",
        "No schedule durations are shown. Sequence and dependencies are shown instead, because durations on unscoped work are guesses and dependencies are facts. Each proposal carries its own schedule.",
        "STM-14 is conditional. It is proposed only if the hydraulic model demonstrates a residual storage deficit the primary system cannot meet.",
        "WTR-02 is scoped across two paths. The approved records and file assessment determines which applies before the project is proposed.",
        "Environmental scope is presented for the owner's own information and protection. Any regulatory notification obligation arising from findings is a decision for the owner in consultation with counsel.",
        "Glossary definitions are provided for clarity of communication. They are plain-language summaries, not regulatory definitions, and the governing text in any permit or code controls.",
        "This document reflects the program as understood on %s. It is maintained in ProjOS and reissued as scope, findings and sequencing evolve." % PROGRAM["date"],
    ]
    basis = """<section id="basis"><div class="wrap">
  <div class="slabel">Basis &amp; Qualifications</div>
  <h2>What this document is, and what it is not</h2>
  <p class="sdesc">Stating the basis is part of the work. The following qualifications apply to everything in this document and in the five bucket documents behind it.</p>
  <ul class="quals">%s</ul>
</div></section>""" % "".join("<li>%s</li>" % q for q in quals)

    return page("Glorieta Gardens — Program of Work | APAS Consulting",
                head + nav + read + buckets_sec + portfolio + discuss + commercial + sequence
                + projos + gl + basis + footer())


# ============================================================ EXPORT =========
def projos_export():
    data = {
        "schema": "projos.program.v2", "generated": PROGRAM["date"], "version": PROGRAM["version"],
        "program": {
            "key": "GLORIETA",
            "name": "Glorieta Gardens — Utility & Environmental Program of Work",
            "property": PROGRAM["property"], "address": PROGRAM["address"],
            "owner": PROGRAM["owner"], "advisor": PROGRAM["advisor"],
            "contract_ref": PROGRAM["contract_ref"],
            "first_deliverable": "STM-01",
            "objectives": [
                "Close the Consent Order completely with written termination.",
                "Operate water, sewer and stormwater in conformance with design, permits and local/state regulatory obligations.",
                "Mitigate physical risk to the property, principally flooding.",
            ],
            "authorization_model": "One short proposal per project; owner signature is the basis of the work; no work proceeds without an approved proposal.",
            "fee_model": {
                "apas_self_performed": "Lump sum fixed fee",
                "subcontracted": "Cost plus 10% overhead plus 10% profit (20% total)",
                "recurring": "Monthly professional services under annual authorization",
            },
        },
        "buckets": [{"key": b["id"], "seq": int(b["num"]), "name": b["name"], "color": b["color"],
                     "posture": b["posture"], "tagline": b["tagline"], "summary": b["summary"],
                     "rationale": b["why"], "document": b["file"],
                     "project_count": len([p for p in P if p["bucket"] == b["id"]])}
                    for b in BUCKETS],
        "projects": [{
            "key": p["id"], "bucket": p["bucket"], "name": p["name"], "type": p["type"],
            "status": p["status"], "flag": p.get("flag", ""), "headline": p["headline"],
            "context": p["context"], "scope": p["scope"], "deliverables": p["deliverables"],
            "sequence": {"predecessors": p["pred"],
                         "successors": [q["id"] for q in P if p["id"] in q["pred"]]},
            "commercial": {"budget": p["budget"], "budget_established": p["budget"] != "TBD",
                           "authorization": AUTH_TEXT[p["auth"]], "fee_basis": FEE_TEXT[p["fee"]],
                           "apas_role": ROLE_TEXT[p["role"]], "note": p["budget_note"]},
            "parties": p["party"], "regulatory_driver": p["driver"],
        } for p in P],
        "glossary": [{"key": g["k"], "term": g["term"], "technical": g["tech"],
                      "plain_english": g["plain"], "why_it_matters": g.get("why", "")} for g in G],
    }
    with open(os.path.join(OUT, "Glorieta-ProjOS-Import.json"), "w") as f:
        json.dump(data, f, indent=2)

    with open(os.path.join(OUT, "Glorieta-ProjOS-Import.csv"), "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["project_key", "bucket_key", "bucket_name", "bucket_seq", "project_name",
                    "type", "status", "flag", "headline", "predecessors", "successors",
                    "budget", "budget_established", "authorization", "fee_basis", "apas_role",
                    "budget_note", "parties", "regulatory_driver", "scope", "deliverables"])
        for p in P:
            b = BK[p["bucket"]]
            w.writerow([p["id"], p["bucket"], b["name"], b["num"], p["name"], p["type"],
                        p["status"], p.get("flag", ""), p["headline"], "|".join(p["pred"]),
                        "|".join(q["id"] for q in P if p["id"] in q["pred"]),
                        p["budget"], "yes" if p["budget"] != "TBD" else "no",
                        AUTH_TEXT[p["auth"]], FEE_TEXT[p["fee"]], ROLE_TEXT[p["role"]],
                        p["budget_note"], p["party"], p["driver"],
                        " | ".join(p["scope"]), " | ".join(p["deliverables"])])
    return data


if __name__ == "__main__":
    with open(os.path.join(OUT, "Glorieta-Gardens-Program-of-Work.html"), "w") as f:
        f.write(master_page())
    for b in BUCKETS:
        with open(os.path.join(OUT, b["file"]), "w") as f:
            f.write(bucket_page(b))
    projos_export()
    print("projects:", len(P), "| glossary terms:", len(G))
    for fn in sorted(os.listdir(OUT)):
        print("  ", fn, os.path.getsize(os.path.join(OUT, fn)))
