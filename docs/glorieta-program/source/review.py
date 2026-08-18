# -*- coding: utf-8 -*-
"""Tracked changes, comments and review for the program document.

Three modes:
  Read     clean document, no markup
  Comment  select text, attach a margin note
  Suggest  every edit is recorded as a tracked change against the original

Every change carries an author and a timestamp. Structural edits (adding,
duplicating or deleting a project or package) are tracked too: nothing is
destroyed until it is accepted. The Changes panel lists everything, jumps to it,
and holds the accept and reject controls behind an owner toggle so the client
sees a clean review surface.

State lives in the document itself, so saving produces one HTML file that
carries the markup with it. No server, no accounts, no browser storage.
"""

REVIEW_CSS = """
/* ─────────────────────────────────────────── toolbar */
.edbar{position:fixed;right:24px;bottom:24px;z-index:800;display:flex;gap:1px;
  background:var(--ink);box-shadow:0 16px 44px rgba(14,36,26,.36)}
.edbar button{font-family:var(--sans);font-size:10.5px;font-weight:800;letter-spacing:.11em;
  text-transform:uppercase;color:#fff;background:var(--ink);border:0;padding:14px 16px;
  cursor:pointer;transition:.12s;white-space:nowrap}
.edbar button:hover{background:#20362A}
.edbar button.on{background:var(--gold-fill);color:var(--forest)}
.edbar button.pri{background:var(--gold-fill);color:var(--forest)}
.edbar button.pri:hover{background:#C89235}
.edbar .sep{width:1px;background:rgba(255,255,255,.22)}
.edbar .cnt{background:#9B2C2C;color:#fff;padding:1px 6px;margin-left:7px;font-size:9.5px}
.edbar button.on .cnt{background:var(--forest);color:var(--gold-fill)}
.who{position:fixed;left:24px;bottom:24px;z-index:800;font-family:var(--sans);font-size:10.5px;
  font-weight:800;letter-spacing:.11em;text-transform:uppercase;background:var(--ink);color:#fff;
  padding:13px 16px;cursor:pointer;display:flex;align-items:center;gap:10px}
.who i{font-style:normal;width:9px;height:9px;background:var(--au)}
.who:hover{background:#20362A}

/* ─────────────────────────────────────────── tracked changes */
ins.ins{text-decoration:none;background:rgba(31,107,72,.14);
  border-bottom:2px solid #1F6B48;color:var(--ink);padding:0 1px}
del.del{background:rgba(155,44,44,.11);color:#8A2C2C;text-decoration:line-through;
  text-decoration-thickness:1.5px;padding:0 1px}
body.nomarks ins.ins{background:none;border-bottom:0}
body.nomarks del.del{display:none}

.chg-add{position:relative;background:rgba(31,107,72,.07);
  box-shadow:inset 4px 0 0 #1F6B48}
.chg-del{position:relative;background:rgba(155,44,44,.07);
  box-shadow:inset 4px 0 0 #9B2C2C;opacity:.75}
.chg-del .pj-name,.chg-del .pj-scope,.chg-del .pj-sub li,.chg-del h3{
  text-decoration:line-through;text-decoration-thickness:1.5px}
body.nomarks .chg-add{background:none;box-shadow:none}
body.nomarks .chg-del{display:none}
.chgtag{display:inline-block;font-family:var(--sans);font-size:8.5px;font-weight:800;
  letter-spacing:.14em;text-transform:uppercase;padding:3px 7px;margin-bottom:8px;color:#fff}
.chg-add > .chgtag,.chg-add > div > .chgtag{background:#1F6B48}
.chg-del > .chgtag,.chg-del > div > .chgtag{background:#9B2C2C}
body.nomarks .chgtag{display:none}

/* ─────────────────────────────────────────── comments */
.cmt{background:rgba(217,168,63,.3);border-bottom:2px solid var(--gold-fill);cursor:pointer}
.cmt.sel{background:var(--gold-fill)}
body.nomarks .cmt{background:none;border-bottom:0}
.cnote{margin:16px 0 4px;border-left:4px solid var(--au,#8A6516);background:var(--band);
  padding:14px 18px;max-width:640px}
body.nomarks .cnote{display:none}
.cnote .hd{display:flex;align-items:baseline;gap:10px;margin-bottom:7px}
.cnote .au{font-family:var(--sans);font-size:10px;font-weight:800;letter-spacing:.12em;
  text-transform:uppercase;color:var(--ink)}
.cnote .ts{font-family:var(--sans);font-size:10px;font-weight:600;color:var(--mute);
  letter-spacing:.06em}
.cnote .bd{font-size:14.5px;line-height:1.55;color:var(--body);min-height:20px;outline:none}
.cnote .bd:focus{background:#fff;outline:2px solid var(--gold-fill);padding:4px 6px;margin:-4px -6px}
.cnote .rp{margin-top:12px;padding-top:12px;border-top:1px solid var(--rule)}
.cnote .act{display:flex;gap:6px;margin-top:11px}
.cnote .act button{font-family:var(--sans);font-size:9px;font-weight:800;letter-spacing:.1em;
  text-transform:uppercase;background:transparent;border:1px solid var(--rule);
  padding:4px 9px;cursor:pointer;color:var(--slate)}
.cnote .act button:hover{background:var(--ink);color:#fff;border-color:var(--ink)}
.cnote.resolved{opacity:.5}
.cnote.resolved .bd{text-decoration:line-through}

/* ─────────────────────────────────────────── editing affordances */
body.suggesting [contenteditable]{outline:1px dashed rgba(122,87,16,.4);outline-offset:3px}
body.suggesting [contenteditable]:hover{outline-color:var(--gold-fill);
  background:rgba(217,168,63,.06)}
body.suggesting [contenteditable]:focus{outline:2px solid var(--gold-fill);
  background:rgba(217,168,63,.11)}
body.suggesting .pill{cursor:pointer}
body.suggesting .pill:hover{outline:2px solid var(--ink);outline-offset:2px}
.rowctl{display:none;gap:6px;margin-top:14px;flex-wrap:wrap}
body.suggesting .rowctl{display:flex}
.rowctl button{font-family:var(--sans);font-size:9px;font-weight:800;letter-spacing:.1em;
  text-transform:uppercase;color:var(--slate);background:#fff;border:1px solid var(--rule);
  padding:5px 9px;cursor:pointer}
.rowctl button:hover{background:var(--ink);color:#fff;border-color:var(--ink)}
.rowctl button.del:hover{background:#9B2C2C;border-color:#9B2C2C}
body.suggesting .pkgctl{display:flex;gap:6px;margin-top:20px}
.pkgctl{display:none}

/* ─────────────────────────────────────────── review panel */
.panel{position:fixed;top:0;right:0;bottom:0;width:430px;background:#fff;z-index:850;
  box-shadow:-14px 0 50px rgba(14,36,26,.22);transform:translateX(100%);
  transition:transform .22s ease;display:flex;flex-direction:column}
.panel.on{transform:none}
.panel .ph{background:var(--ink);color:#fff;padding:20px 24px}
.panel .ph h4{color:#fff;font-size:20px;margin-bottom:4px}
.panel .ph .sub{font-family:var(--sans);font-size:10px;font-weight:700;letter-spacing:.12em;
  text-transform:uppercase;color:var(--on-dark-mute)}
.panel .ph .x{position:absolute;top:16px;right:18px;background:transparent;border:0;color:#fff;
  font-size:22px;cursor:pointer;line-height:1}
.panel .pt{display:flex;gap:8px;padding:14px 24px;border-bottom:1px solid var(--rule);
  align-items:center;flex-wrap:wrap}
.panel .pt button{font-family:var(--sans);font-size:9px;font-weight:800;letter-spacing:.1em;
  text-transform:uppercase;background:#fff;border:1px solid var(--rule);padding:6px 10px;
  cursor:pointer;color:var(--slate)}
.panel .pt button:hover,.panel .pt button.on{background:var(--ink);color:#fff;border-color:var(--ink)}
.panel .pb{overflow-y:auto;flex:1;padding:8px 0 40px}
.pitem{padding:16px 24px;border-bottom:1px solid var(--rule-light);cursor:pointer}
.pitem:hover{background:var(--band)}
.pitem .k{display:flex;align-items:center;gap:9px;margin-bottom:7px}
.pitem .dot{width:9px;height:9px;flex:none}
.pitem .ty{font-family:var(--sans);font-size:9px;font-weight:800;letter-spacing:.13em;
  text-transform:uppercase;color:var(--ink)}
.pitem .lo{font-family:var(--sans);font-size:9.5px;font-weight:700;color:var(--mute);
  margin-left:auto;letter-spacing:.06em}
.pitem .tx{font-size:13.5px;line-height:1.5;color:var(--body)}
.pitem .tx del{color:#8A2C2C}
.pitem .tx ins{text-decoration:none;color:#1F6B48;font-weight:600}
.pitem .mt{font-family:var(--sans);font-size:9.5px;font-weight:700;color:var(--mute);
  margin-top:7px;letter-spacing:.05em}
.pitem .ar{display:none;gap:6px;margin-top:11px}
body.owner .pitem .ar{display:flex}
.pitem .ar button{font-family:var(--sans);font-size:9px;font-weight:800;letter-spacing:.1em;
  text-transform:uppercase;border:1px solid var(--rule);background:#fff;padding:5px 10px;
  cursor:pointer;color:var(--slate)}
.pitem .ar .ok:hover{background:#1F6B48;color:#fff;border-color:#1F6B48}
.pitem .no:hover{background:#9B2C2C;color:#fff;border-color:#9B2C2C}
.pempty{padding:40px 24px;font-size:14.5px;color:var(--mute);line-height:1.6}
.panel .pf{border-top:1px solid var(--rule);padding:14px 24px;display:none;gap:8px}
body.owner .panel .pf{display:flex}
.panel .pf button{flex:1;font-family:var(--sans);font-size:9.5px;font-weight:800;
  letter-spacing:.1em;text-transform:uppercase;border:1px solid var(--rule);background:#fff;
  padding:9px;cursor:pointer;color:var(--slate)}
.panel .pf .ok:hover{background:#1F6B48;color:#fff;border-color:#1F6B48}
.panel .pf .no:hover{background:#9B2C2C;color:#fff;border-color:#9B2C2C}

/* ─────────────────────────────────────────── help card */
.helpcard{background:var(--band2);border-left:4px solid var(--gold-fill);padding:22px 26px;
  margin-top:34px;max-width:820px}
.helpcard h4{font-size:17px;margin-bottom:10px}
.helpcard p{font-size:14.5px;line-height:1.6;color:var(--body)}
.helpcard p+p{margin-top:9px}
.helpcard b{font-weight:700;color:var(--ink)}

@media(max-width:900px){.panel{width:100%}}
@media print{
  .edbar,.who,.panel,.rowctl,.pkgctl,.helpcard{display:none !important}
  ins.ins{background:none;border-bottom:1px solid #1F6B48}
  del.del{background:none}
  .chg-add,.chg-del{box-shadow:none;background:none}
}
"""

TOOLBAR = """
<div class="who" id="rvWho" title="Change reviewer name"><i></i><span id="rvName">Reviewer</span></div>
<div class="edbar">
  <button id="rvSuggest" title="Turn on tracked editing">Suggest</button><span class="sep"></span>
  <button id="rvComment" title="Select text, then add a comment">Comment</button><span class="sep"></span>
  <button id="rvMarks" class="on" title="Show or hide markup">Markup</button><span class="sep"></span>
  <button id="rvPanel" title="All changes and comments">Changes<span class="cnt" id="rvCount">0</span></button><span class="sep"></span>
  <button id="rvPrint" title="Print or save as PDF">Print</button><span class="sep"></span>
  <button id="rvSave" class="pri" title="Save. Shift-click to choose a new location.">Save</button>
</div>
<div class="panel" id="rvPanelBox">
  <div class="ph"><button class="x" id="rvPanelX">&times;</button>
    <h4>Changes and comments</h4>
    <div class="sub" id="rvSummary">Nothing recorded yet</div></div>
  <div class="pt">
    <button data-f="all" class="on">All</button>
    <button data-f="edit">Edits</button>
    <button data-f="struct">Structure</button>
    <button data-f="comment">Comments</button>
    <button data-f="owner" id="rvOwner" style="margin-left:auto">Owner tools</button>
  </div>
  <div class="pb" id="rvList"></div>
  <div class="pf"><button class="ok" id="rvAcceptAll">Accept all</button>
    <button class="no" id="rvRejectAll">Reject all</button></div>
</div>
"""

REVIEW_JS = r"""
<script>
(function(){
  var EDITABLE = ['h1','.lede','.fact-v','.intro p','.bhead h2','.bhead p','.toc .t',
    '.pkg h3','.pkg-scope','.pkg-exp .x','.pj-name','.pj-scope','.pj-sub li','.pj-side .v',
    'section h2','.sdesc','.seqrw h4','.seqrw p','.seqrw .r','.cbase b','.cbase p',
    '.basisnote'].join(',');

  var STATUS = [['First deliverable','p-first'],['Scope approved','p-ok'],['In progress','p-act'],
    ['Active','p-act'],['To be demonstrated','p-act'],['For discussion','p-disc'],
    ['Conditional','p-cond'],['Not started','p-new']];

  var suggesting=false, commenting=false, cid=0;
  var body=document.body;

  /* ---------------- author ---------------- */
  function author(){ return body.getAttribute('data-author') || ''; }
  function hue(n){ var h=0; for(var i=0;i<n.length;i++) h=(h*31+n.charCodeAt(i))%360;
    return 'hsl('+h+',52%,32%)'; }
  function setAuthor(n){
    n=(n||'').trim(); if(!n) return false;
    body.setAttribute('data-author',n);
    document.getElementById('rvName').textContent=n;
    document.documentElement.style.setProperty('--au',hue(n));
    return true;
  }
  function needAuthor(){
    if(author()) return true;
    return setAuthor(window.prompt('Your name, so changes are attributed:',''));
  }
  function today(){ var d=new Date();
    return d.toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'}); }

  /* ---------------- word level diff ---------------- */
  function tok(s){ return s.match(/\s+|[^\s]+/g) || []; }
  function diff(a,b){
    var n=a.length,m=b.length,i,j;
    if(n*m>250000) return [{t:'-',v:a.join('')},{t:'+',v:b.join('')}];
    var dp=new Array(n+1);
    for(i=0;i<=n;i++){ dp[i]=new Int32Array(m+1); }
    for(i=n-1;i>=0;i--) for(j=m-1;j>=0;j--)
      dp[i][j] = a[i]===b[j] ? dp[i+1][j+1]+1 : Math.max(dp[i+1][j],dp[i][j+1]);
    var out=[]; i=0; j=0;
    while(i<n&&j<m){
      if(a[i]===b[j]){ out.push({t:'=',v:a[i]}); i++; j++; }
      else if(dp[i+1][j]>=dp[i][j+1]){ out.push({t:'-',v:a[i]}); i++; }
      else { out.push({t:'+',v:b[j]}); j++; }
    }
    while(i<n){ out.push({t:'-',v:a[i++]}); }
    while(j<m){ out.push({t:'+',v:b[j++]}); }
    var mg=[];
    out.forEach(function(o){
      var l=mg[mg.length-1];
      if(l&&l.t===o.t) l.v+=o.v; else mg.push({t:o.t,v:o.v});
    });
    return mg;
  }
  function esc(s){ return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function renderDiff(oldT,newT,au,ts){
    var d=diff(tok(oldT),tok(newT)), h='';
    d.forEach(function(o){
      if(o.t==='=') h+=esc(o.v);
      else if(o.t==='-') h+='<del class="del" data-au="'+esc(au)+'" data-ts="'+ts+'">'+esc(o.v)+'</del>';
      else h+='<ins class="ins" data-au="'+esc(au)+'" data-ts="'+ts+'">'+esc(o.v)+'</ins>';
    });
    return h;
  }
  /* text as it reads if every change were accepted */
  function accepted(el){ var c=el.cloneNode(true);
    c.querySelectorAll('del.del').forEach(function(d){d.remove()}); return c.textContent; }

  /* ---------------- tracked text editing ---------------- */
  function onFocus(ev){
    var el=ev.target.closest('[contenteditable]'); if(!el||!suggesting) return;
    if(el.classList.contains('bd')) return;              /* comment bodies are not tracked */
    if(!el.hasAttribute('data-orig')) el.setAttribute('data-orig',el.textContent);
    el.setAttribute('data-html',el.innerHTML);
    el.setAttribute('data-before',accepted(el));
    /* flatten to accepted text so typing is not inside markup */
    if(el.querySelector('ins.ins,del.del')) el.textContent=el.getAttribute('data-before');
  }
  function onBlur(ev){
    var el=ev.target.closest('[contenteditable]'); if(!el||!suggesting) return;
    if(el.classList.contains('bd')) return;
    var before=el.getAttribute('data-before'), orig=el.getAttribute('data-orig');
    var now=el.textContent;
    if(now===before){ if(el.getAttribute('data-html')) el.innerHTML=el.getAttribute('data-html');
      el.removeAttribute('data-html'); el.removeAttribute('data-before'); refreshPanel(); return; }
    if(now===orig){ el.innerHTML=el.getAttribute('data-html')||esc(now);
      el.querySelectorAll('ins.ins,del.del').forEach(function(x){
        if(x.tagName==='DEL')x.remove(); else x.replaceWith(document.createTextNode(x.textContent));});
      el.removeAttribute('data-orig'); }
    else { el.innerHTML=renderDiff(orig,now,author(),today()); }
    el.removeAttribute('data-html'); el.removeAttribute('data-before');
    refreshPanel();
  }

  /* ---------------- modes ---------------- */
  function setSuggest(on){
    if(on && !needAuthor()) return;
    suggesting=on; body.classList.toggle('suggesting',on);
    if(on){ commenting=false; document.getElementById('rvComment').classList.remove('on'); }
    document.querySelectorAll(EDITABLE).forEach(function(el){
      if(on) el.setAttribute('contenteditable','true'); else el.removeAttribute('contenteditable');
    });
    if(on) wire();
    var b=document.getElementById('rvSuggest');
    b.classList.toggle('on',on); b.textContent = on ? 'Suggesting' : 'Suggest';
  }

  /* ---------------- structural changes ---------------- */
  function tag(el,kind,txt){
    var t=document.createElement('span');
    t.className='chgtag'; t.textContent=txt+' by '+author()+', '+today();
    var host=el.classList.contains('pj') ? el.children[1] : el;
    host.insertBefore(t,host.firstChild);
    el.classList.add(kind); el.setAttribute('data-au',author()); el.setAttribute('data-ts',today());
  }
  function newSub(){ var li=document.createElement('li'); li.textContent='New item'; return li; }
  function newProject(model){
    var pj=model.cloneNode(true);
    pj.classList.remove('chg-add','chg-del');
    pj.querySelectorAll('.chgtag,.cnote,.rowctl').forEach(function(x){x.remove()});
    pj.querySelectorAll('ins.ins').forEach(function(x){x.replaceWith(document.createTextNode(x.textContent))});
    pj.querySelectorAll('del.del').forEach(function(x){x.remove()});
    pj.querySelectorAll('[data-orig]').forEach(function(x){x.removeAttribute('data-orig')});
    pj.querySelector('.pj-name').textContent='New project';
    pj.querySelector('.pj-scope').textContent='Scope to be written.';
    var ul=pj.querySelector('.pj-sub'); if(ul){ ul.innerHTML=''; ul.appendChild(newSub()); }
    var side=pj.querySelector('.pj-side');
    side.querySelectorAll('.pill').forEach(function(p){p.remove()});
    var v=side.querySelector('.v'); if(v){ v.textContent='TBD'; v.classList.remove('set'); }
    pj.querySelectorAll('.tt').forEach(function(s){
      s.replaceWith(document.createTextNode(s.textContent))});
    return pj;
  }
  function wire(){
    document.querySelectorAll('.pj').forEach(function(pj){
      if(pj.querySelector('.rowctl')) return;
      var c=document.createElement('div'); c.className='rowctl';
      c.innerHTML='<button data-a="sub">+ Sub-item</button><button data-a="status">Status</button>'+
        '<button data-a="dup">Duplicate</button><button data-a="del" class="del">Delete</button>';
      pj.children[1].appendChild(c);
    });
    document.querySelectorAll('.pkg').forEach(function(pk){
      if(pk.querySelector('.pkgctl')) return;
      var c=document.createElement('div'); c.className='rowctl pkgctl';
      c.innerHTML='<button data-a="addproj">+ Project</button>'+
        '<button data-a="delpkg" class="del">Delete package</button>';
      pk.appendChild(c);
    });
  }

  /* ---------------- comments ---------------- */
  var lastRange=null;
  document.addEventListener('selectionchange',function(){
    var s=window.getSelection();
    if(s && s.rangeCount && !s.isCollapsed){
      var n=s.getRangeAt(0).commonAncestorContainer;
      if(n.nodeType===3) n=n.parentElement;
      if(n && n.closest && n.closest('main')) lastRange=s.getRangeAt(0).cloneRange();
    }
  });

  function addComment(){
    if(!needAuthor()) return;
    var sel=window.getSelection(), r=null;
    if(sel && sel.rangeCount && !sel.isCollapsed) r=sel.getRangeAt(0);
    else if(lastRange) r=lastRange;
    if(!r){ alert('Select the text you want to comment on first, then press Comment.'); return; }
    var host=r.commonAncestorContainer;
    if(host.nodeType===3) host=host.parentElement;
    if(!host || !host.closest('main')){ alert('Comments can only be added inside the document.'); return; }
    var block=host.closest('.pj-sub li')||host.closest('li')||host.closest('p')||
              host.closest('.pj-name')||host.closest('.pj-scope')||host.closest('h2,h3,h4')||host;
    var id='c'+(++cid)+'-'+Date.now().toString(36);
    var span=document.createElement('span'); span.className='cmt'; span.setAttribute('data-id',id);
    try{ r.surroundContents(span); }
    catch(e1){
      try{ span.appendChild(r.extractContents()); r.insertNode(span); }
      catch(e2){ /* anchor could not be placed; the note still attaches to the block */ }
    }
    if(!document.contains(span)) span=null;
    /* the focused field holds a pre-comment HTML snapshot for restore on blur.
       refresh it, or blur would wipe the anchor we just placed. */
    if(span){ var ce=span.closest('[contenteditable]');
      if(ce && ce.hasAttribute('data-html')) ce.setAttribute('data-html',ce.innerHTML); }

    var note=document.createElement('div');
    note.className='cnote'; note.setAttribute('data-for',id);
    note.setAttribute('data-au',author()); note.setAttribute('data-ts',today());
    note.style.setProperty('--au',hue(author()));
    note.innerHTML='<div class="hd"><span class="au">'+esc(author())+'</span>'+
      '<span class="ts">'+today()+'</span></div>'+
      '<div class="bd" contenteditable="true"></div>'+
      '<div class="act"><button data-a="creply">Reply</button>'+
      '<button data-a="cresolve">Resolve</button>'+
      '<button data-a="cremove">Remove</button></div>';
    var pj=block.closest('.pj');
    if(pj) pj.children[1].appendChild(note);
    else if(block.parentElement) block.parentElement.insertBefore(note, block.nextSibling);
    else document.querySelector('main').appendChild(note);

    if(sel) sel.removeAllRanges();
    lastRange=null;
    note.querySelector('.bd').focus();
    refreshPanel();
  }

  /* ---------------- panel ---------------- */
  var filter='all';
  function locate(el){
    var pj=el.closest('.pj'); if(pj) return pj.querySelector('.pj-num').textContent;
    var pk=el.closest('.pkg'); if(pk) return 'Package '+pk.querySelector('.pkg-num').textContent;
    var bh=el.closest('.bhead'); if(bh) return 'Bucket '+bh.getAttribute('data-bucket');
    var s=el.closest('section'); if(s&&s.querySelector('h2')) return s.querySelector('h2').textContent.slice(0,28);
    return 'Document';
  }
  function collect(){
    var out=[];
    document.querySelectorAll('main [data-orig]').forEach(function(el){
      if(!el.querySelector('ins.ins,del.del')) return;
      var m=el.querySelector('ins.ins,del.del');
      out.push({type:'edit',label:'Text edit',color:'#1F6B48',el:el,
        au:m.getAttribute('data-au'),ts:m.getAttribute('data-ts'),
        html:el.innerHTML.replace(/<span class="tt"[^>]*>/g,'').replace(/<\/span>/g,'')});
    });
    document.querySelectorAll('main .chg-add,main .chg-del').forEach(function(el){
      var add=el.classList.contains('chg-add');
      out.push({type:'struct',label:add?'Added':'Deleted',color:add?'#1F6B48':'#9B2C2C',el:el,
        au:el.getAttribute('data-au'),ts:el.getAttribute('data-ts'),
        html:esc((el.querySelector('.pj-name')||el.querySelector('h3')||el).textContent.trim().slice(0,90))});
    });
    document.querySelectorAll('main .cnote').forEach(function(el){
      out.push({type:'comment',label:el.classList.contains('resolved')?'Comment, resolved':'Comment',
        color:'#8A6516',el:el,au:el.getAttribute('data-au'),ts:el.getAttribute('data-ts'),
        html:esc(el.querySelector('.bd').textContent.trim().slice(0,140)||'No text yet')});
    });
    return out;
  }
  function refreshPanel(){
    var items=collect();
    document.getElementById('rvCount').textContent=items.length;
    var ed=items.filter(function(i){return i.type==='edit'}).length,
        st=items.filter(function(i){return i.type==='struct'}).length,
        cm=items.filter(function(i){return i.type==='comment'}).length;
    document.getElementById('rvSummary').textContent =
      items.length ? (ed+' edits, '+st+' structural, '+cm+' comments') : 'Nothing recorded yet';
    var list=document.getElementById('rvList');
    var show=items.filter(function(i){return filter==='all'||i.type===filter;});
    if(!show.length){ list.innerHTML='<div class="pempty">No entries. Turn on Suggest to edit with '+
      'tracking, or select text and press Comment.</div>'; return; }
    list.innerHTML=show.map(function(i,n){
      return '<div class="pitem" data-n="'+items.indexOf(i)+'">'+
        '<div class="k"><span class="dot" style="background:'+i.color+'"></span>'+
        '<span class="ty">'+i.label+'</span><span class="lo">'+esc(locate(i.el))+'</span></div>'+
        '<div class="tx">'+i.html+'</div>'+
        '<div class="mt">'+esc(i.au||'')+(i.ts?', '+esc(i.ts):'')+'</div>'+
        '<div class="ar"><button class="ok" data-act="accept">Accept</button>'+
        '<button class="no" data-act="reject">Reject</button></div></div>';
    }).join('');
    list._items=items;
  }
  function resolveItem(it,accept){
    var el=it.el;
    if(it.type==='edit'){
      if(accept){ el.querySelectorAll('del.del').forEach(function(d){d.remove()});
        el.querySelectorAll('ins.ins').forEach(function(x){
          x.replaceWith(document.createTextNode(x.textContent))}); }
      else { el.querySelectorAll('ins.ins').forEach(function(x){x.remove()});
        el.querySelectorAll('del.del').forEach(function(x){
          x.replaceWith(document.createTextNode(x.textContent))}); }
      el.removeAttribute('data-orig');
    } else if(it.type==='struct'){
      var add=el.classList.contains('chg-add');
      if((add&&accept)||(!add&&!accept)){
        el.classList.remove('chg-add','chg-del');
        el.removeAttribute('data-au'); el.removeAttribute('data-ts');
        var t=el.querySelector('.chgtag'); if(t) t.remove();
      } else { el.remove(); }
    } else { el.remove(); }
  }

  /* ---------------- events ---------------- */
  document.addEventListener('focusin',onFocus,true);
  document.addEventListener('focusout',onBlur,true);

  document.addEventListener('click',function(ev){
    /* suppress the scope-note modal while editing */
    if(suggesting && ev.target.closest('.tt')){ ev.stopPropagation(); }

    var rc=ev.target.closest('.rowctl button');
    if(rc){
      ev.preventDefault();
      if(!needAuthor()) return;
      var a=rc.getAttribute('data-a'), pj=rc.closest('.pj'), pk=rc.closest('.pkg');
      if(a==='sub'){ var ul=pj.querySelector('.pj-sub');
        if(!ul){ ul=document.createElement('ul'); ul.className='pj-sub';
          pj.querySelector('.pj-scope').after(ul); }
        var li=newSub(); li.setAttribute('data-orig',''); ul.appendChild(li);
        li.innerHTML='<ins class="ins" data-au="'+esc(author())+'" data-ts="'+today()+'">New item</ins>';
        li.setAttribute('contenteditable','true'); li.focus(); }
      else if(a==='status'){ var side=pj.querySelector('.pj-side'), p=side.querySelector('.pill');
        if(!p){ p=document.createElement('span'); p.className='pill p-new';
          p.textContent=STATUS[7][0]; side.prepend(p); }
        else { var k=STATUS.findIndex(function(s){return s[0]===p.textContent.trim()});
          if(k===STATUS.length-1) p.remove();
          else { var nx=STATUS[(k+1)%STATUS.length]; p.textContent=nx[0]; p.className='pill '+nx[1]; } } }
      else if(a==='dup'){ var np=newProject(pj); pj.after(np); tag(np,'chg-add','Added'); }
      else if(a==='del'){ tag(pj,'chg-del','Deleted'); }
      else if(a==='addproj'){ var list=pk.querySelector('.pjlist');
        var last=list.querySelector('.pj:last-child'); var np2=newProject(last);
        list.appendChild(np2); tag(np2,'chg-add','Added'); }
      else if(a==='delpkg'){ tag(pk,'chg-del','Deleted'); }
      wire(); renumber(); refreshPanel(); return;
    }

    var ca=ev.target.closest('.cnote .act button');
    if(ca){
      ev.preventDefault();
      var note=ca.closest('.cnote'), act=ca.getAttribute('data-a');
      if(act==='cremove'){ var fid=note.getAttribute('data-for');
        var mk=document.querySelector('.cmt[data-id="'+fid+'"]');
        if(mk) mk.replaceWith(document.createTextNode(mk.textContent));
        note.remove(); }
      else if(act==='cresolve'){ note.classList.toggle('resolved'); }
      else if(act==='creply'){ if(!needAuthor()) return;
        var r=document.createElement('div'); r.className='rp';
        r.innerHTML='<div class="hd"><span class="au">'+esc(author())+'</span>'+
          '<span class="ts">'+today()+'</span></div><div class="bd" contenteditable="true"></div>';
        note.querySelector('.act').before(r); r.querySelector('.bd').focus(); }
      refreshPanel(); return;
    }

    var pi=ev.target.closest('.pitem');
    if(pi){
      var items=document.getElementById('rvList')._items||[];
      var it=items[+pi.getAttribute('data-n')]; if(!it) return;
      var ab=ev.target.closest('.ar button');
      if(ab){ ev.preventDefault(); resolveItem(it,ab.getAttribute('data-act')==='accept');
        renumber(); refreshPanel(); return; }
      it.el.scrollIntoView({block:'center'});
      it.el.style.transition='none'; it.el.style.boxShadow='0 0 0 3px var(--gold-fill)';
      setTimeout(function(){ it.el.style.boxShadow=''; },1400);
      return;
    }

    if(commenting && ev.target.closest('main')){ /* selection handled by the button */ }
  },true);

  ['.edbar','.who','.panel'].forEach(function(q){
    var n=document.querySelector(q);
    if(n) n.addEventListener('mousedown',function(ev){
      if(!ev.target.closest('[contenteditable]')) ev.preventDefault(); });
  });

  document.getElementById('rvSuggest').onclick=function(){ setSuggest(!suggesting); };
  var cmtBtn=document.getElementById('rvComment');
  cmtBtn.addEventListener('mousedown',function(ev){ ev.preventDefault(); addComment(); });
  cmtBtn.addEventListener('keydown',function(ev){
    if(ev.key==='Enter'||ev.key===' '){ ev.preventDefault(); addComment(); } });
  document.getElementById('rvMarks').onclick=function(){
    var off=body.classList.toggle('nomarks');
    this.classList.toggle('on',!off);
  };
  document.getElementById('rvPanel').onclick=function(){
    var on=document.getElementById('rvPanelBox').classList.toggle('on');
    this.classList.toggle('on',on); if(on) refreshPanel();
  };
  document.getElementById('rvPanelX').onclick=function(){
    document.getElementById('rvPanelBox').classList.remove('on');
    document.getElementById('rvPanel').classList.remove('on');
  };
  document.getElementById('rvOwner').onclick=function(){
    var on=body.classList.toggle('owner'); this.classList.toggle('on',on);
  };
  document.getElementById('rvWho').onclick=function(){
    setAuthor(window.prompt('Your name, so changes are attributed:',author()));
    refreshPanel();
  };
  document.querySelectorAll('.panel .pt button[data-f]').forEach(function(b){
    if(b.id==='rvOwner') return;
    b.onclick=function(){
      document.querySelectorAll('.panel .pt button[data-f]').forEach(function(x){
        if(x.id!=='rvOwner') x.classList.remove('on')});
      b.classList.add('on'); filter=b.getAttribute('data-f'); refreshPanel();
    };
  });
  document.getElementById('rvAcceptAll').onclick=function(){
    if(!confirm('Accept every tracked change? Comments are left in place.')) return;
    collect().filter(function(i){return i.type!=='comment'}).forEach(function(i){resolveItem(i,true)});
    renumber(); refreshPanel();
  };
  document.getElementById('rvRejectAll').onclick=function(){
    if(!confirm('Reject every tracked change? Comments are left in place.')) return;
    collect().filter(function(i){return i.type!=='comment'}).forEach(function(i){resolveItem(i,false)});
    renumber(); refreshPanel();
  };

  /* ---------------- numbering and counts ---------------- */
  function renumber(){
    var totP=0,totJ=0;
    document.querySelectorAll('.pkgwrap').forEach(function(w){
      var b=w.getAttribute('data-bucket'), bn=String(parseInt(b,10));
      var pkgs=w.querySelectorAll('.pkg'), names=[], live=0, lj=0;
      pkgs.forEach(function(pk,i){
        var pn=bn+'.'+(i+1);
        pk.querySelector('.pkg-num').textContent=pn;
        if(!pk.classList.contains('chg-del')){ live++;
          var h=pk.querySelector('h3'); if(h) names.push(h.textContent.trim()); }
        pk.querySelectorAll('.pj').forEach(function(pj,j){
          var id=pn+'.'+(j+1);
          pj.querySelector('.pj-num').textContent=id;
          pj.id='p'+id.split('.').join('-');
          if(!pj.classList.contains('chg-del')) lj++;
        });
      });
      totP+=live; totJ+=lj;
      var hd=document.querySelector('.bhead[data-bucket="'+b+'"]');
      if(hd){ var a=hd.querySelector('[data-c=pkg]'), c=hd.querySelector('[data-c=prj]');
        if(a)a.textContent=live; if(c)c.textContent=lj; }
      var tr=document.querySelector('.toc a[data-toc="'+b+'"]');
      if(tr){ var x=tr.querySelector('[data-c=pkg]'), y=tr.querySelector('[data-c=prj]'),
              s=tr.querySelector('.t small');
        if(x)x.textContent=live; if(y)y.textContent=lj;
        if(s&&!s.hasAttribute('data-orig')) s.textContent=names.join(' · '); }
    });
    document.querySelectorAll('[data-c=pkg-total]').forEach(function(n){
      if(!n.closest('[data-orig]')) n.textContent=totP});
    document.querySelectorAll('[data-c=prj-total]').forEach(function(n){
      if(!n.closest('[data-orig]')) n.textContent=totJ});
  }

  /* ---------------- save ---------------- */
  var handle=null;
  function serialize(){
    var c=document.documentElement.cloneNode(true);
    c.querySelectorAll('[contenteditable]').forEach(function(n){
      if(!n.classList.contains('bd')) n.removeAttribute('contenteditable')});
    c.querySelectorAll('.rowctl').forEach(function(n){n.remove()});
    c.querySelectorAll('[data-html],[data-before]').forEach(function(n){
      n.removeAttribute('data-html'); n.removeAttribute('data-before')});
    var b=c.querySelector('body');
    if(b){ b.classList.remove('suggesting','owner'); }
    var p=c.querySelector('#rvPanelBox'); if(p) p.classList.remove('on');
    return '<!DOCTYPE html>\n'+c.outerHTML;
  }
  function toast(m){ var w=document.getElementById('rvName'), o=w.textContent;
    w.textContent=m; setTimeout(function(){w.textContent=o;},1700); }
  function fallback(out){
    var a=document.createElement('a');
    try{ a.href=URL.createObjectURL(new Blob([out],{type:'text/html;charset=utf-8'})); }
    catch(e){ a.href='data:text/html;charset=utf-8,'+encodeURIComponent(out); }
    a.download=(author()? 'Glorieta-Program-of-Work-'+author().replace(/[^\w]+/g,'-') :
      'Glorieta-Gardens-Program-of-Work')+'.html';
    document.body.appendChild(a); a.click();
    setTimeout(function(){ try{URL.revokeObjectURL(a.href)}catch(e){} a.remove(); },3000);
    toast('Downloaded');
  }
  async function save(saveAs){
    var was=suggesting; if(was) setSuggest(false);
    renumber();
    var out=serialize();
    try{
      if(window.showSaveFilePicker){
        if(!handle||saveAs){ handle=await window.showSaveFilePicker({
          suggestedName:(author()? 'Glorieta-Program-of-Work-'+author().replace(/[^\w]+/g,'-') :
            'Glorieta-Gardens-Program-of-Work')+'.html',
          types:[{description:'HTML document',accept:{'text/html':['.html']}}]}); }
        var w=await handle.createWritable(); await w.write(out); await w.close(); toast('Saved');
      } else fallback(out);
    }catch(err){ if(!err||err.name!=='AbortError') fallback(out); }
    if(was) setSuggest(true);
  }
  document.getElementById('rvSave').onclick=function(ev){ save(ev.shiftKey); };
  document.getElementById('rvPrint').onclick=function(){
    var was=suggesting; if(was) setSuggest(false); window.print(); if(was) setSuggest(true);
  };
  document.addEventListener('keydown',function(ev){
    if((ev.metaKey||ev.ctrlKey)&&ev.key==='s'){ev.preventDefault();save(false);}
  });
  document.addEventListener('paste',function(ev){
    var t=ev.target.closest('[contenteditable]'); if(!t) return;
    ev.preventDefault();
    document.execCommand('insertText',false,
      (ev.clipboardData||window.clipboardData).getData('text/plain'));
  });

  if(author()) setAuthor(author());
  renumber(); refreshPanel();
})();
</script>"""

HELP = """<div class="helpcard">
  <h4>Reviewing this document</h4>
  <p>The controls sit in the bottom right corner. <b>Suggest</b> turns on tracked editing:
  anything you type is recorded against the original, shown as struck-through text for
  deletions and underlined text for additions, attributed to you with a date. Nothing is
  overwritten. You can also add, duplicate or delete projects, and those are tracked the
  same way.</p>
  <p>To leave a note instead of an edit, select the text and press <b>Comment</b>.
  <b>Markup</b> hides or shows all revision marks so you can read the document clean.
  <b>Changes</b> opens a panel listing every edit and comment, with a jump link to each.</p>
  <p><b>Save</b> writes a new HTML file. Send that file back and every change, comment and
  attribution travels with it. Nothing is uploaded anywhere and nothing is stored in your
  browser.</p>
</div>"""
