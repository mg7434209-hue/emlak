(function(){'use strict';
  function fmt(n){return new Intl.NumberFormat('tr-TR').format(Number(n)||0)}
  function add(){var f=document.querySelector('.site-footer .container');if(!f||document.getElementById('siteVisitorCounter'))return;var el=document.createElement('div');el.id='siteVisitorCounter';el.style.cssText='margin-top:10px;font-size:.82rem;opacity:.72;display:flex;gap:14px;flex-wrap:wrap';el.innerHTML='<span>👥 Toplam ziyaretçi: <b id="visitorTotal">—</b></span><span>📅 Bugün: <b id="visitorToday">—</b></span>';f.appendChild(el)}
  function load(){fetch('/api/site-stats',{cache:'no-store'}).then(function(r){return r.ok?r.json():null}).then(function(x){if(!x)return;var a=document.getElementById('visitorTotal'),b=document.getElementById('visitorToday');if(a)a.textContent=fmt(x.total);if(b)b.textContent=fmt(x.today)}).catch(function(){})}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){add();load()});else{add();load()}
})();
