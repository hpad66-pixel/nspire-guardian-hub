# -*- coding: utf-8 -*-
"""Single-document builder. Bucket > work package > project > sub-items.
No glossary section. Tooltips retained. No em dashes anywhere in output."""

import json, html, os, re
from program import META, INTRO, BUCKETS, SEQUENCE, COMMERCIAL
from brand import CSS
from review import REVIEW_CSS as EDIT_CSS, TOOLBAR, REVIEW_JS as EDIT_JS, HELP
import glossary as GL

OUT = "/home/claude/glorieta/out"
os.makedirs(OUT, exist_ok=True)
e = lambda s: html.escape(str(s))


# ---------------------------------------------------------- em dash sweep ---
_US = [("Programme","Program"),("programme","program"),("authorise","authorize"),
       ("authorised","authorized"),("authorisation","authorization"),("organised","organized"),
       ("characterisation","characterization"),("mobilise","mobilize"),("stabilise","stabilize"),
       ("modelling","modeling"),("modelled","modeled"),("behaviour","behavior"),
       ("neighbour","neighbor"),("analyse","analyze"),("licence","license"),("centre","center")]


def nodash(t):
    t = t.replace(" — ", ", ").replace("—", ", ").replace(" – ", ", ")
    for a, z in _US:
        t = t.replace(a, z)
    return re.sub(r",\s*,", ",", t)


for g in GL.G:
    for k in ("term", "tech", "plain", "why"):
        if k in g:
            g[k] = nodash(g[k])

# ---------------------------------------------------------- tooltip links ---
_pairs = sorted(((a, g["k"]) for g in GL.G for a in [g["k"]] + g.get("alias", [])),
                key=lambda t: -len(t[0]))
_LOOK = {a.lower(): k for a, k in _pairs}
_RE = re.compile(r"(?<![\w-])(" + "|".join(re.escape(a) for a, _ in _pairs) + r")(?![\w-])", re.I)


def L(text, used):
    def sub(m):
        raw = m.group(1)
        k = _LOOK.get(raw.lower())
        if k is None or k in used:
            return raw
        used.add(k)
        return '<span class="tt" data-k="%s" tabindex="0" role="button">%s</span>' % (k, raw)
    return _RE.sub(sub, e(nodash(text)))


EXTRA = ""

MODAL = """
<div class="gdim" id="gdim" role="dialog" aria-modal="true" aria-labelledby="gterm">
  <div class="gbox"><button class="gclose" id="gclose" aria-label="Close">&times;</button>
    <div class="gbox-in"><div class="gk">Scope note</div><h3 id="gterm"></h3>
      <div class="gsec"><div class="gsec-l">Technical definition</div><p id="gtech"></p></div>
      <div class="gsec plain"><div class="gsec-l">In plain terms</div><p id="gplain"></p></div>
      <div class="gsec why" id="gwhywrap"><div class="gsec-l">Relevance here</div><p id="gwhy"></p></div>
    </div></div></div>
<script>
var GLOSS = __GLOSS__;
(function(){
  var dim=document.getElementById('gdim');
  function open(k){var g=GLOSS[k];if(!g)return;
    document.getElementById('gterm').textContent=g.t;
    document.getElementById('gtech').textContent=g.e;
    document.getElementById('gplain').textContent=g.p;
    var w=document.getElementById('gwhywrap');
    if(g.w){document.getElementById('gwhy').textContent=g.w;w.style.display='block';}
    else{w.style.display='none';}
    dim.classList.add('on');document.getElementById('gclose').focus();}
  function close(){dim.classList.remove('on');}
  document.addEventListener('click',function(ev){
    if(document.body.classList.contains('suggesting'))return;
    var t=ev.target.closest('.tt');
    if(t){ev.preventDefault();open(t.getAttribute('data-k'));return;}
    if(ev.target.id==='gclose'||ev.target===dim){close();}});
  document.addEventListener('keydown',function(ev){
    if(ev.key==='Escape')close();
    if((ev.key==='Enter'||ev.key===' ')&&document.activeElement&&
       document.activeElement.classList.contains('tt')){
      ev.preventDefault();open(document.activeElement.getAttribute('data-k'));}});
})();
</script>"""


def pill(status):
    k = (status or "").lower()
    c = ("p-first" if "first" in k else "p-disc" if "discussion" in k else
         "p-ok" if "approved" in k else "p-act" if "active" in k or "progress" in k
         or "demonstrated" in k else "p-new")
    return '<span class="pill %s">%s</span>' % (c, e(status))


def build():
    used = set()
    n_pkg = sum(len(b["packages"]) for b in BUCKETS)
    n_prj = sum(len(p["projects"]) for b in BUCKETS for p in b["packages"])

    # ---- masthead
    meta = [("Property", META["property"]), ("Owner", META["owner"]),
            ("Contract", META["contract"]), ("Issued", META["date"])]
    head = """<header class="masthead"><div class="wrap">
  <div class="mh-top"><div class="lockup"><span class="mark">APAS</span>
    <span><span class="lockup-name">Consulting</span>
    <span class="lockup-sub">Glorieta Gardens</span></span></div>
    <div class="mh-meta">%s &nbsp;&middot;&nbsp; %s</div></div>
  <div class="hero"><div class="eyebrow">Prepared for Glorieta Partners, Ltd. and R4 GGOL GP LLC</div>
    <h1>Glorieta Gardens<br><em>Program of Work</em></h1>
    <p class="lede">Five buckets, <span data-c="pkg-total">%d</span> work packages, <span data-c="prj-total">%d</span> projects. A record of the scope discussed, at the level of detail required to procure it.</p>
    <div class="hero-facts doc-meta">%s</div></div>
</div></header>""" % (e(META["version"]), e(META["date"]), n_pkg, n_prj,
    "".join('<div class="fact"><div class="fact-l">%s</div><div class="fact-v">%s</div></div>'
            % (a, e(b)) for a, b in meta))

    nav = '<nav class="navstrip"><div class="wrap">%s</div></nav>' % "".join(
        '<a href="#b%s">%s &nbsp;%s</a>' % (b["id"], b["id"], e(b["name"].split(" and ")[0]))
        for b in BUCKETS)

    # ---- intro + contents
    toc = "".join(
      '<a href="#b%s" data-toc="%s" style="--bc:%s"><span class="n">%s</span>'
      '<span class="t">%s<small>%s</small></span>'
      '<span class="c"><span data-c="pkg">%d</span> packages<br>'
      '<i><span data-c="prj">%d</span> projects</i></span></a>'
      % (b["id"], b["id"], b["color"], b["id"], e(b["name"]),
         e(" &middot; ".join(p["name"] for p in b["packages"])).replace("&amp;", "&"),
         len(b["packages"]), sum(len(p["projects"]) for p in b["packages"]))
      for b in BUCKETS)

    intro = """<section class="tight" id="top"><div class="wrap">
  <div class="intro">%s</div>
  <div class="toc">%s</div>
  %s
</div></section>""" % ("".join("<p>%s</p>" % L(t, used) for t in INTRO), toc, HELP)

    # ---- buckets
    body = []
    for b in BUCKETS:
        np = sum(len(p["projects"]) for p in b["packages"])
        body.append("""<div class="bhead" id="b%s" data-bucket="%s"><div class="wrap">
  <div class="bn">Bucket %s</div><h2>%s</h2>%s
  <div class="bstats"><div><span>Work packages</span><b data-c="pkg">%d</b></div>
    <div><span>Projects</span><b data-c="prj">%d</b></div></div>
</div></div>""" % (b["id"], b["id"], b["id"], e(b["name"]),
                   "".join("<p>%s</p>" % L(t, used) for t in b["about"]),
                   len(b["packages"]), np))

        pk = []
        for pi, pkg in enumerate(b["packages"], 1):
            rows = []
            for ji, pj in enumerate(pkg["projects"], 1):
                num = "%s.%d.%d" % (b["id"].lstrip("0"), pi, ji)
                side = []
                if pj.get("flag"):
                    side.append(pill(pj.get("status") or pj["flag"].title()))
                elif pj.get("status"):
                    side.append(pill(pj["status"]))
                if pj.get("cond"):
                    side.append(pill("Conditional"))
                bud = pj.get("budget")
                side.append('<span class="b">Budget</span><span class="v%s">%s</span>'
                            % (" set" if bud else "", e(bud) if bud else "TBD"))
                sub = "".join("<li>%s</li>" % L(x, used) for x in pj.get("sub", []))
                rows.append("""<li class="pj" id="p%s">
  <div class="pj-num">%s</div>
  <div><span class="pj-name">%s</span>
    <p class="pj-scope">%s</p><ul class="pj-sub">%s</ul></div>
  <div class="pj-side">%s</div></li>""" % (num.replace(".", "-"), num, L(pj["n"], used),
                                           L(pj["s"], used), sub, "".join(side)))
            pk.append("""<div class="pkg" style="--bc:%s">
  <div class="pkg-head"><div class="pkg-num">%s.%d</div>
    <div><h3>%s</h3><p class="pkg-scope">%s</p>
      <div class="pkg-exp"><b>Expertise</b><span class="x">%s</span></div></div></div>
  <ol class="pjlist">%s</ol></div>""" % (b["color"], b["id"].lstrip("0"), pi, e(pkg["name"]),
                                         L(pkg["scope"], used), e(pkg["exp"]), "".join(rows)))
        cls = "band-alt" if b["id"] in ("02", "04") else ""
        body.append('<div class="pkgwrap %s" data-bucket="%s"><div class="wrap">%s</div></div>'
                    % (cls, b["id"], "".join(pk)))

    # ---- sequence
    seq = "".join("""<div class="seqrw"><div class="p">%s</div>
  <div><h4>%s</h4><p>%s</p></div><div class="r">%s</div></div>"""
      % (a, e(t), L(d, used), e(r)) for a, t, d, r in SEQUENCE)
    seq_sec = """<section id="sequence"><div class="wrap">
  <div class="slabel">Sequence</div><h2>The order the work has to run in</h2>
  <p class="sdesc">Almost every consequential decision in stormwater sits downstream of the hydraulic model, and the model cannot run until the camera, the survey and the geotechnical work are complete. The inexpensive front end is what makes everything after it estimable.</p>
  <div class="seqtbl">%s</div></div></section>""" % seq

    # ---- commercial basis
    cb = "".join("<div><b>%s</b><p>%s</p></div>" % (e(a), L(d, used)) for a, d in COMMERCIAL)
    com = """<section class="band-alt" id="basis"><div class="wrap">
  <div class="slabel">Basis</div><h2>Authorization and fees</h2>
  <div class="cbase">%s</div>
  <p class="basisnote" style="margin-top:28px;font-size:14px;color:var(--slate);max-width:820px">No amount is shown against any project except the one whose scope is approved. Several projects cannot be priced until an earlier project establishes what is physically present, and a figure produced before that point would be an estimate without a basis.</p>
</div></section>""" % cb

    foot = """<footer><div class="wrap"><div class="ft">
  <div class="ft-l"><span class="lockup"><span class="mark">APAS</span>
    <span><span class="lockup-name">Consulting</span><span class="lockup-sub">LLC</span></span></span><br>
    <span class="line">Prepared for %s</span><br><span class="line">%s</span><br>
    <span class="line">%s</span></div>
  <div class="ft-r"><span class="line">%s &nbsp;&middot;&nbsp; %s</span><br>
    <span class="line">%s</span><br><span data-c="pkg-total">%d</span> work packages,
    <span data-c="prj-total">%d</span> projects</div>
</div></div></footer>""" % (e(META["owner"]), e(META["property"]), e(META["address"]),
                            e(META["version"]), e(META["date"]), e(META["contract"]), n_pkg, n_prj)

    gl = {g["k"]: {"t": g["term"], "e": g["tech"], "p": g["plain"], "w": g.get("why", "")}
          for g in GL.G if g["k"] in used}
    modal = MODAL.replace("__GLOSS__", json.dumps(gl, ensure_ascii=False))

    doc = """<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Glorieta Gardens: Program of Work</title>
<style>%s%s%s</style></head><body>
<main>%s%s%s%s%s%s</main>
%s%s%s
</body></html>""" % (CSS, EXTRA, EDIT_CSS, head, nav, intro, "".join(body), seq_sec,
                     com + foot, modal, TOOLBAR, EDIT_JS)

    path = os.path.join(OUT, "Glorieta-Gardens-Program-of-Work.html")
    open(path, "w").write(doc)
    return path, n_pkg, n_prj, len(used)


if __name__ == "__main__":
    p, a, b, c = build()
    print("packages:", a, "| projects:", b, "| tooltip terms used:", c)
    print("size:", os.path.getsize(p) // 1024, "KB")
