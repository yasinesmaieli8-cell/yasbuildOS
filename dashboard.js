(() => {
  'use strict';
  const $=id=>document.getElementById(id), fmt=n=>new Intl.NumberFormat('fa-IR',{maximumFractionDigits:2}).format(n);
  function render(){
    const list=$('dashProjects'); list.replaceChildren();
    try {
      const projects=JSON.parse(localStorage.getItem('yasbuildos.projects.v1')||'[]');
      const checks=JSON.parse(localStorage.getItem('yasbuildos.checklist.v1')||'{}');
      if(!Array.isArray(projects)||!checks||typeof checks!=='object'||Array.isArray(checks)) throw Error('invalid');
      let rows=0, done=0, spent=0, commitments=0, missing=0; const due=[];
      for(const p of projects){
        const items=Array.isArray(checks[p.id]?.items)?checks[p.id].items:[];
        rows+=items.length;
        for(const i of items){ if(i.done)done++; if(i.unitPrice===null)missing++; if(i.status==='پرداخت‌شده')spent+=Number(i.paid)||0; if(i.status==='متعهدشده')commitments+=Number(i.paid)||0; if(!i.done && /^\d{4}-\d{2}-\d{2}$/.test(i.due||''))due.push({name:i.name,project:p.name,date:i.due,assignee:i.assignee||'',priority:i.priority||'معمولی'}); }
      }
      $('dashProjectCount').textContent=fmt(projects.length); $('dashTaskCount').textContent=fmt(rows);
      $('dashDone').textContent=fmt(done); $('dashSpent').textContent=fmt(spent)+' تومان';
      $('dashSummary').textContent=`تعهدات ثبت‌شده: ${fmt(commitments)} تومان · ${fmt(missing)} ردیف بدون قیمت واحد`;
      for(const p of [...projects].reverse().slice(0,5)){
        const card=document.createElement('article');card.className='project-item';
        const title=document.createElement('h3');title.textContent=p.name;
        const desc=document.createElement('p');const items=Array.isArray(checks[p.id]?.items)?checks[p.id].items:[];
        desc.textContent=[p.city||'شهر ثبت نشده',p.status||'وضعیت ثبت نشده',fmt(items.length)+' ردیف چک‌لیست'].join(' · ');
        card.append(title,desc);list.appendChild(card);
      }
      if(!projects.length)list.textContent='هنوز پروژه‌ای ثبت نشده است. برای شروع از بخش پروژه‌های من، پروژه بسازید.';
      const deadlines=$('dashDue');deadlines.replaceChildren();
      const today=new Date(), localDate=[today.getFullYear(),String(today.getMonth()+1).padStart(2,'0'),String(today.getDate()).padStart(2,'0')].join('-');
      for(const item of due.sort((a,b)=>a.date.localeCompare(b.date)).slice(0,5)){
        const row=document.createElement('p');row.textContent=[item.name,item.project,item.date,'اولویت: '+item.priority,item.assignee?'مسئول: '+item.assignee:'',item.date<localDate?'موعد گذشته':''].filter(Boolean).join(' · ');deadlines.appendChild(row);
      }
      if(!due.length)deadlines.textContent='فعالیت انجام‌نشده با موعد ثبت نشده است.';
    }catch(_){$('dashSummary').textContent='اطلاعات محلی خوانده نشد. دسترسی مرورگر به فضای ذخیره‌سازی را بررسی کنید.';}
  }
  document.querySelector('[data-tab="dashboard"]').addEventListener('click',render);
  for(const button of document.querySelectorAll('[data-dash-go]')) button.addEventListener('click',()=>document.querySelector(`[data-tab="${button.dataset.dashGo}"]`).click());
  window.addEventListener('yasbuildos-projects-updated',render);
  render();
})();
