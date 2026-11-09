(() => {
  'use strict';
  const $ = id => document.getElementById(id), key = 'yasbuildos.checklist.v1', projectKey = 'yasbuildos.projects.v1';
  const number = n => new Intl.NumberFormat('fa-IR', {maximumFractionDigits: 2}).format(n);
  const money = n => number(n) + ' تومان';
  const stages = ['آماده‌سازی و مجوزها','خاک‌برداری','پی و فونداسیون','اسکلت و سقف','دیوارچینی','تأسیسات','نازک‌کاری','نما و محوطه','تحویل'];
  let all = {}, projects = [], selected = '', editing = null, healthy = true;
  const msg = text => { $('checkMessage').textContent = text; };
  function read() {
    try {
      const raw = localStorage.getItem(key), saved = raw ? JSON.parse(raw) : {};
      if (!saved || typeof saved !== 'object' || Array.isArray(saved)) throw Error('invalid');
      all = saved;
      const list = JSON.parse(localStorage.getItem(projectKey) || '[]');
      if (!Array.isArray(list)) throw Error('invalid');
      projects = list.filter(p => p && typeof p.id === 'string' && typeof p.name === 'string');
    } catch (_) { healthy = false; msg('داده‌ها خوانده نشدند؛ برای جلوگیری از بازنویسی، ثبت اطلاعات غیرفعال است.'); }
  }
  function save(next) {
    try { localStorage.setItem(key, JSON.stringify(next)); all = next; return true; }
    catch (_) { msg('ذخیره انجام نشد؛ فضای ذخیره‌سازی مرورگر را بررسی کنید.'); return false; }
  }
  const state = () => all[selected] || {reserve:0, items:[]};
  function resetForm(){ editing=null; $('checkForm').reset(); $('checkSubmit').textContent='افزودن ردیف'; $('checkCancel').hidden=true; }
  function refreshProjects() {
    const previous = selected;
    read(); if (!healthy) return;
    $('checkProject').replaceChildren();
    const blank=document.createElement('option'); blank.value=''; blank.textContent='انتخاب پروژه محلی'; $('checkProject').appendChild(blank);
    for (const p of projects) { const o=document.createElement('option'); o.value=p.id; o.textContent=p.name; $('checkProject').appendChild(o); }
    selected=projects.some(p=>p.id===previous)?previous:''; $('checkProject').value=selected; render();
  }
  function render(){
    const box=$('checkContent'); box.hidden=!selected; if(!selected) return;
    const project=projects.find(p=>p.id===selected), s=state(), items=Array.isArray(s.items)?s.items:[];
    $('checkReserve').value=s.reserve || '';
    let estimate=0, spent=0, committed=0, missing=0, done=0;
    $('checkItems').replaceChildren();
    for (const item of items) {
      const cost=item.unitPrice===null?null:item.quantity*item.unitPrice+item.extra;
      if(cost===null) missing++; else estimate+=cost;
      if(item.status==='پرداخت‌شده') spent+=item.paid;
      if(item.status==='متعهدشده') committed+=item.paid;
      if(item.done) done++;
      const row=document.createElement('article'); row.className='project-item';
      const title=document.createElement('h3'); title.textContent=item.name;
      const detail=document.createElement('p'); detail.textContent=[item.stage,number(item.quantity)+' '+item.unit,item.unitPrice===null?'قیمت واحد نامشخص':'قیمت واحد: '+money(item.unitPrice),cost===null?'برآورد نامشخص':'برآورد: '+money(cost),item.status==='برآورد'?'بدون پرداخت ثبت‌شده':item.status+': '+money(item.paid),item.done?'انجام شده':'انجام نشده'].join(' · ');
      row.append(title,detail);
      if(item.source){ const source=document.createElement('p'); source.textContent='منبع ثبت‌شده: '+item.source+(item.date?' · '+item.date:''); row.appendChild(source); }
      const actions=document.createElement('div'); actions.className='project-actions';
      const toggle=document.createElement('button'); toggle.type='button'; toggle.className='btn secondary sm'; toggle.textContent=item.done?'علامت به‌عنوان انجام‌نشده':'علامت به‌عنوان انجام‌شده';
      toggle.onclick=()=>{const current=state(); const next=current.items.map(x=>x.id===item.id?{...x,done:!x.done}:x); if(save({...all,[selected]:{...current,items:next}})) render();};
      const edit=document.createElement('button'); edit.type='button'; edit.className='btn secondary sm'; edit.textContent='ویرایش'; edit.onclick=()=>{editing=item.id; for(const [id,val] of Object.entries({checkName:item.name,checkStage:item.stage,checkQuantity:item.quantity,checkUnit:item.unit,checkUnitPrice:item.unitPrice??'',checkExtra:item.extra,checkStatus:item.status,checkPaid:item.paid,checkSource:item.source,checkDate:item.date})) $(id).value=val; $('checkSubmit').textContent='ذخیره تغییرات'; $('checkCancel').hidden=false; $('checkName').focus();};
      const remove=document.createElement('button'); remove.type='button'; remove.className='btn secondary sm'; remove.textContent='حذف'; remove.onclick=()=>{if(!confirm('این ردیف از چک‌لیست حذف شود؟'))return; const current=state(); if(save({...all,[selected]:{...current,items:current.items.filter(x=>x.id!==item.id)}})){if(editing===item.id)resetForm();render();}};
      actions.append(toggle,edit,remove); row.appendChild(actions); $('checkItems').appendChild(row);
    }
    if(!items.length) $('checkItems').textContent='هنوز ردیفی ثبت نشده است.';
    const budget=project.budget===null||project.budget===undefined?null:Number(project.budget), reserve=Number(s.reserve)||0;
    $('checkBudget').textContent=budget===null?'ثبت نشده':money(budget); $('checkEstimate').textContent=money(estimate)+(missing?' + '+number(missing)+' قلم بدون قیمت':'');
    $('checkSpent').textContent=money(spent); $('checkCommit').textContent=money(committed);
    $('checkBalance').textContent=budget===null?'بودجه ثبت نشده':money(budget-spent-committed-reserve);
    $('checkProgress').textContent=items.length?number(done/items.length*100)+'٪':'۰٪';
    $('checkWarning').textContent=budget!==null && (spent+committed+reserve>budget || estimate+reserve>budget)?'هشدار: مجموع برآورد یا هزینه‌ها با ذخیره احتیاطی از بودجه بیشتر است.':'';
  }
  $('checkProject').onchange=()=>{selected=$('checkProject').value;resetForm();render();};
  $('checkReload').onclick=refreshProjects;
  $('checkReserveSave').onclick=()=>{if(!selected)return;const v=Number($('checkReserve').value);if(!Number.isFinite(v)||v<0||v>1e15){msg('ذخیره احتیاطی معتبر نیست.');return;} if(save({...all,[selected]:{...state(),reserve:v}})){msg('ذخیره احتیاطی ثبت شد.');render();}};
  $('checkCancel').onclick=resetForm;
  $('checkForm').onsubmit=e=>{
    e.preventDefault(); if(!selected||!healthy||!$('checkForm').reportValidity())return;
    const n=id=>Number($(id).value), unitPrice=$('checkUnitPrice').value===''?null:n('checkUnitPrice');
    const item={id:editing||crypto.randomUUID(),name:$('checkName').value.trim(),stage:$('checkStage').value,quantity:n('checkQuantity'),unit:$('checkUnit').value.trim(),unitPrice,extra:n('checkExtra'),status:$('checkStatus').value,paid:n('checkPaid'),source:$('checkSource').value.trim(),date:$('checkDate').value,done:editing?(state().items.find(x=>x.id===editing)?.done||false):false};
    if(!item.name||!item.unit||![item.quantity,item.extra,item.paid,...(unitPrice===null?[]:[unitPrice])].every(x=>Number.isFinite(x)&&x>=0&&x<=1e15)||!Number.isSafeInteger(Math.round(item.quantity*(unitPrice??0)+item.extra))){msg('مقدارها معتبر نیستند یا از محدوده قابل محاسبه بیشترند.');return;}
    const s=state(), items=editing?s.items.map(x=>x.id===editing?item:x):[...(s.items||[]),item];
    if(save({...all,[selected]:{...s,items}})){resetForm();msg('ردیف ذخیره شد.');render();}
  };
  $('checkExport').onclick=()=>{if(!selected)return; const p=projects.find(x=>x.id===selected), payload={version:1,project:p,checklist:state(),exportedAt:new Date().toISOString()};const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='yasbuildos-checklist.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
  for(const s of stages){const o=document.createElement('option');o.textContent=s;$('checkStage').appendChild(o);}
  document.querySelector('[data-tab="checklist"]').addEventListener('click',refreshProjects);
  refreshProjects();
})();
