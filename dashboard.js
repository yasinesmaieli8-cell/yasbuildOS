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
        const financial=document.createElement('p'), alert=document.createElement('p');
        const budget=typeof p.budget==='number'&&Number.isFinite(p.budget)&&p.budget>=0?p.budget:null;
        const reserve=Number(checks[p.id]?.reserve)||0;
        let projectSpent=0,projectCommit=0,missingPrices=0,openTasks=0;
        for(const item of items){
          if(item.status==='پرداخت‌شده')projectSpent+=Number(item.paid)||0;
          if(item.status==='متعهدشده')projectCommit+=Number(item.paid)||0;
          if(item.unitPrice===null)missingPrices++;
          if(!item.done)openTasks++;
        }
        financial.textContent=budget===null?'بودجه ثبت نشده':`بودجه: ${fmt(budget)} تومان · مانده پس از پرداخت، تعهد و ذخیره: ${fmt(budget-projectSpent-projectCommit-reserve)} تومان`;
        const notices=[];
        if(budget!==null&&projectSpent+projectCommit+reserve>budget)notices.push('هزینه و تعهد با ذخیره از بودجه بیشتر است');
        if(missingPrices)notices.push(`${fmt(missingPrices)} ردیف بدون قیمت واحد`);
        if(openTasks)notices.push(`${fmt(openTasks)} فعالیت انجام‌نشده`);
        alert.textContent=notices.join(' · ')||'هشداری برای این پروژه ثبت نشده است.';
        const open=document.createElement('button');open.type='button';open.className='btn secondary sm';open.textContent='چک‌لیست و بودجه';open.setAttribute('aria-label','چک‌لیست و بودجه پروژه '+p.name);
        open.addEventListener('click',()=>{if(!window.yasbuildosOpenChecklist||!window.yasbuildosOpenChecklist(p.id))$('dashSummary').textContent='باز کردن چک‌لیست ممکن نشد؛ فهرست پروژه‌ها را بررسی کنید.';});
        card.append(title,desc,financial,alert,open);list.appendChild(card);
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
