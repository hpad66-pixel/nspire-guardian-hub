# -*- coding: utf-8 -*-
"""In-browser editing for the program document.

Edit mode turns every piece of copy into a live text field, lets you add,
duplicate and delete projects and sub-items, and cycles status labels on click.
Save writes a complete new HTML file to your downloads folder. The saved file is
itself editable, so the document is its own format. Nothing is stored in the
browser and nothing is sent anywhere.
"""

EDIT_CSS = """
/* ─────────────────────────────────────────── edit bar */
.edbar{position:fixed;right:24px;bottom:24px;z-index:800;display:flex;gap:1px;
  background:var(--ink);box-shadow:0 14px 40px rgba(14,36,26,.34)}
.edbar button{font-family:var(--sans);font-size:10.5px;font-weight:800;letter-spacing:.12em;
  text-transform:uppercase;color:#fff;background:var(--ink);border:0;padding:14px 18px;
  cursor:pointer;transition:.12s;white-space:nowrap}
.edbar button:hover{background:#1D3126}
.edbar button.on{background:var(--gold-fill);color:var(--forest)}
.edbar button.pri{background:var(--gold-fill);color:var(--forest)}
.edbar button.pri:hover{background:#C89235}
.edbar .sep{width:1px;background:rgba(255,255,255,.2)}
.edstate{position:fixed;left:24px;bottom:24px;z-index:800;font-family:var(--sans);
  font-size:10.5px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;
  background:var(--gold-fill);color:var(--forest);padding:12px 16px;display:none}
body.editing .edstate{display:block}

/* ─────────────────────────────────────────── editable affordances */
body.editing [contenteditable]{outline:1px dashed rgba(122,87,16,.45);
  outline-offset:3px;border-radius:1px}
body.editing [contenteditable]:hover{outline-color:var(--gold-fill);
  background:rgba(217,168,63,.07)}
body.editing [contenteditable]:focus{outline:2px solid var(--gold-fill);
  background:rgba(217,168,63,.12)}
body.editing .bhead [contenteditable]:hover,
body.editing .masthead [contenteditable]:hover{background:rgba(217,168,63,.16)}
body.editing .pill{cursor:pointer}
body.editing .pill:hover{outline:2px solid var(--ink);outline-offset:2px}
body.editing .tt{cursor:text}

/* ─────────────────────────────────────────── row controls */
.rowctl{display:none;gap:6px;margin-top:14px;flex-wrap:wrap}
body.editing .rowctl{display:flex}
.rowctl button{font-family:var(--sans);font-size:9px;font-weight:800;letter-spacing:.1em;
  text-transform:uppercase;color:var(--slate);background:transparent;
  border:1px solid var(--rule);padding:5px 9px;cursor:pointer;transition:.12s}
.rowctl button:hover{background:var(--ink);color:#fff;border-color:var(--ink)}
.rowctl button.del:hover{background:#9B2C2C;border-color:#9B2C2C}
.pkgctl{display:none;margin-top:20px}
body.editing .pkgctl{display:flex;gap:6px}
@media print{.edbar,.edstate,.rowctl,.pkgctl{display:none !important}}
"""

TOOLBAR = """
<div class="edstate">Editing</div>
<div class="edbar">
  <button id="edToggle" title="Toggle editing">Edit</button><span class="sep"></span>
  <button id="edUndo" title="Undo last change">Undo</button><span class="sep"></span>
  <button id="edPrint" title="Print or save as PDF">Print</button><span class="sep"></span>
  <button id="edSave" class="pri" title="Save. Shift-click to choose a new location.">Save</button>
</div>
"""

EDIT_JS = """
<script>
(function(){
  var EDITABLE = ['h1','.lede','.fact-v','.intro p','.bhead h2','.bhead p',
    '.toc .t','.pkg h3','.pkg-scope','.pkg-exp .x','.pj-name','.pj-scope','.pj-sub li',
    '.pj-side .v','section h2','.sdesc','.seqrw h4','.seqrw p','.seqrw .r',
    '.cbase b','.cbase p','.basisnote','.slabel','.ft-l .line','.ft-r .line'].join(',');

  var STATUS = [['First deliverable','p-first'],['Scope approved','p-ok'],
    ['In progress','p-act'],['Active','p-act'],['To be demonstrated','p-act'],
    ['For discussion','p-disc'],['Conditional','p-cond'],['Not started','p-new']];

  var editing=false, undo=[];

  function snap(){ undo.push(document.querySelector('main,body').innerHTML);
    if(undo.length>40) undo.shift(); }

  /* ---------- renumber and recount ---------- */
  function refresh(){
    var totP=0, totJ=0;
    document.querySelectorAll('.pkgwrap').forEach(function(w){
      var b=w.getAttribute('data-bucket'), bn=String(parseInt(b,10));
      var pkgs=w.querySelectorAll('.pkg'), names=[];
      pkgs.forEach(function(pk,i){
        var pn=bn+'.'+(i+1);
        pk.querySelector('.pkg-num').textContent=pn;
        var h=pk.querySelector('.pkg h3'); if(h) names.push(h.textContent.trim());
        pk.querySelectorAll('.pj').forEach(function(pj,j){
          var id=pn+'.'+(j+1);
          pj.querySelector('.pj-num').textContent=id;
          pj.id='p'+id.split('.').join('-');
        });
      });
      var nj=w.querySelectorAll('.pj').length;
      totP+=pkgs.length; totJ+=nj;
      var hd=document.querySelector('.bhead[data-bucket="'+b+'"]');
      if(hd){ var a=hd.querySelector('[data-c=pkg]'), c=hd.querySelector('[data-c=prj]');
        if(a)a.textContent=pkgs.length; if(c)c.textContent=nj; }
      var tr=document.querySelector('.toc a[data-toc="'+b+'"]');
      if(tr){ var x=tr.querySelector('[data-c=pkg]'), y=tr.querySelector('[data-c=prj]'),
              s=tr.querySelector('.t small');
        if(x)x.textContent=pkgs.length; if(y)y.textContent=nj;
        if(s)s.textContent=names.join(' \\u00B7 '); }
    });
    document.querySelectorAll('[data-c=pkg-total]').forEach(function(n){n.textContent=totP});
    document.querySelectorAll('[data-c=prj-total]').forEach(function(n){n.textContent=totJ});
  }

  /* ---------- edit mode ---------- */
  function setEdit(on){
    editing=on;
    document.body.classList.toggle('editing',on);
    document.querySelectorAll(EDITABLE).forEach(function(el){
      if(on) el.setAttribute('contenteditable','true');
      else el.removeAttribute('contenteditable');
    });
    var t=document.getElementById('edToggle');
    t.textContent = on ? 'Done' : 'Edit';
    t.classList.toggle('on',on);
  }

  /* ---------- element factories ---------- */
  function newSub(color){
    var li=document.createElement('li');
    li.textContent='New item';
    return li;
  }
  function newProject(after){
    var pj=after.cloneNode(true);
    pj.querySelector('.pj-name').textContent='New project';
    pj.querySelector('.pj-scope').textContent='Scope to be written.';
    var ul=pj.querySelector('.pj-sub');
    if(ul){ ul.innerHTML=''; ul.appendChild(newSub()); }
    var side=pj.querySelector('.pj-side');
    side.querySelectorAll('.pill').forEach(function(p){p.remove()});
    var v=side.querySelector('.v'); if(v){v.textContent='TBD';v.classList.remove('set');}
    pj.querySelectorAll('.tt').forEach(function(s){
      s.replaceWith(document.createTextNode(s.textContent));});
    return pj;
  }

  /* ---------- controls ---------- */
  function wire(){
    document.querySelectorAll('.pj').forEach(function(pj){
      if(pj.querySelector(':scope > div > .rowctl')) return;
      var host=pj.children[1];
      var c=document.createElement('div'); c.className='rowctl';
      c.innerHTML='<button data-a="sub">+ Sub-item</button>'+
                  '<button data-a="status">Status</button>'+
                  '<button data-a="dup">Duplicate</button>'+
                  '<button data-a="del" class="del">Delete</button>';
      host.appendChild(c);
    });
    document.querySelectorAll('.pkg').forEach(function(pk){
      if(pk.querySelector('.pkgctl')) return;
      var c=document.createElement('div'); c.className='rowctl pkgctl';
      c.innerHTML='<button data-a="addproj">+ Project</button>'+
                  '<button data-a="delpkg" class="del">Delete package</button>';
      pk.appendChild(c);
    });
  }

  document.addEventListener('click',function(ev){
    var btn=ev.target.closest('.rowctl button');
    if(btn){
      ev.preventDefault(); snap();
      var a=btn.getAttribute('data-a');
      var pj=btn.closest('.pj'), pk=btn.closest('.pkg');
      if(a==='sub'){ var ul=pj.querySelector('.pj-sub');
        if(!ul){ ul=document.createElement('ul'); ul.className='pj-sub';
          pj.querySelector('.pj-scope').after(ul); }
        var li=newSub(); ul.appendChild(li);
        li.setAttribute('contenteditable','true'); li.focus(); }
      else if(a==='status'){ var side=pj.querySelector('.pj-side');
        var p=side.querySelector('.pill');
        if(!p){ p=document.createElement('span'); p.className='pill p-new';
          p.textContent=STATUS[7][0]; side.prepend(p); }
        else { var i=STATUS.findIndex(function(s){return s[0]===p.textContent.trim()});
          var n=STATUS[(i+1)%STATUS.length];
          if(i===STATUS.length-1){ p.remove(); }
          else { p.textContent=n[0]; p.className='pill '+n[1]; } } }
      else if(a==='dup'){ pj.after(newProject(pj)); }
      else if(a==='del'){ if(pj.parentElement.querySelectorAll('.pj').length>1||
          confirm('Delete the last project in this package?')) pj.remove(); }
      else if(a==='addproj'){ var list=pk.querySelector('.pjlist');
        var last=list.querySelector('.pj:last-child');
        list.appendChild(newProject(last)); }
      else if(a==='delpkg'){ if(confirm('Delete this entire work package?')) pk.remove(); }
      wire(); refresh(); return;
    }
    if(editing){
      var pill=ev.target.closest('.pill');
      if(pill && !ev.target.closest('.rowctl')){
        ev.preventDefault(); snap();
        var i=STATUS.findIndex(function(s){return s[0]===pill.textContent.trim()});
        var n=STATUS[(i+1)%STATUS.length];
        pill.textContent=n[0]; pill.className='pill '+n[1]; return;
      }
    }
  },true);

  /* ---------- toolbar ---------- */
  document.getElementById('edToggle').addEventListener('click',function(){
    if(!editing){ wire(); }
    setEdit(!editing); if(!editing) refresh();
  });
  document.getElementById('edUndo').addEventListener('click',function(){
    if(!undo.length){ return; }
    var host=document.querySelector('main,body');
    host.innerHTML=undo.pop(); wire(); setEdit(editing); refresh();
  });
  document.getElementById('edPrint').addEventListener('click',function(){
    var was=editing; if(was) setEdit(false); window.print(); if(was) setEdit(true);
  });
  var fileHandle=null;

  function serialize(){
    var c=document.documentElement.cloneNode(true);
    c.querySelectorAll('[contenteditable]').forEach(function(n){n.removeAttribute('contenteditable')});
    c.querySelectorAll('.rowctl').forEach(function(n){n.remove()});
    var b=c.querySelector('body'); if(b) b.classList.remove('editing');
    return '<!DOCTYPE html>\\n'+c.outerHTML;
  }

  function toast(msg){
    var t=document.querySelector('.edstate');
    var was=t.textContent, vis=t.style.display;
    t.textContent=msg; t.style.display='block';
    setTimeout(function(){t.textContent=was;t.style.display=vis||'';},1800);
  }

  function fallbackDownload(out){
    var a=document.createElement('a');
    try{
      a.href=URL.createObjectURL(new Blob([out],{type:'text/html;charset=utf-8'}));
    }catch(err){
      a.href='data:text/html;charset=utf-8,'+encodeURIComponent(out);
    }
    a.download='Glorieta-Gardens-Program-of-Work.html';
    document.body.appendChild(a); a.click();
    setTimeout(function(){try{URL.revokeObjectURL(a.href)}catch(e){} a.remove();},3000);
    toast('Downloaded');
  }

  async function save(saveAs){
    var was=editing; if(was) setEdit(false);
    refresh();
    var out=serialize();
    try{
      if(window.showSaveFilePicker){
        if(!fileHandle || saveAs){
          fileHandle=await window.showSaveFilePicker({
            suggestedName:'Glorieta-Gardens-Program-of-Work.html',
            types:[{description:'HTML document',accept:{'text/html':['.html']}}]});
        }
        var w=await fileHandle.createWritable();
        await w.write(out); await w.close();
        toast('Saved');
      } else {
        fallbackDownload(out);
      }
    }catch(err){
      if(err && err.name==='AbortError'){ /* user cancelled */ }
      else { fallbackDownload(out); }
    }
    if(was) setEdit(true);
  }

  document.getElementById('edSave').addEventListener('click',function(ev){
    save(ev.shiftKey);
  });

  document.addEventListener('keydown',function(ev){
    if((ev.metaKey||ev.ctrlKey)&&ev.key==='s'){ev.preventDefault();
      document.getElementById('edSave').click();}
    if((ev.metaKey||ev.ctrlKey)&&ev.key==='e'){ev.preventDefault();
      document.getElementById('edToggle').click();}
  });

  /* paste as plain text so pasted formatting cannot break the design */
  document.addEventListener('paste',function(ev){
    if(!editing) return;
    var t=ev.target.closest('[contenteditable]'); if(!t) return;
    ev.preventDefault();
    var txt=(ev.clipboardData||window.clipboardData).getData('text/plain');
    document.execCommand('insertText',false,txt);
  });

  refresh();
})();
</script>"""
