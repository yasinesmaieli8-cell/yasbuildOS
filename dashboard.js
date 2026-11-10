(() => {
  'use strict';
  const $=id=>document.getElementById(id), fmt=n=>new Intl.NumberFormat('fa-IR',{maximumFractionDigits:2}).format(n);
  function readData(){
    const projects=JSON.parse(localStorage.getItem('yasbuildos.projects.v1')||'[]'),checks=JSON.parse(localStorage.getItem('yasbuildos.checklist.v1')||'{}');
    if(!Array.isArray(projects)||!checks||typeof checks!=='object'||Array.isArray(checks))throw Error('invalid');
    return {projects,checks};
  }
  const dateToday=()=>{const now=new Date();return [now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-');};
  function dueItems(projects,checks){
    const due=[];
    for(const p of projects){const items=Array.isArray(checks[p.id]?.items)?checks[p.id].items:[];
      for(const i of items)if(!i.done&&/^\d{4}-\d{2}-\d{2}$/.test(i.due||''))due.push({name:i.name,project:p.name,projectId:p.id,date:i.due,assignee:i.assignee||'',priority:i.priority||'معمولی'});
    }
    return due.sort((a,b)=>a.date.localeCompare(b.date));
  }
  function blockedItems(projects,checks){
    const blocked=[];
    for(const p of projects){const items=Array.isArray(checks[p.id]?.items)?checks[p.id].items:[],byId=new Map(items.map(item=>[item.id,item]));
      for(const item of items){if(item.done||!item.dependencyId)continue;const prior=byId.get(item.dependencyId);if(!prior||!prior.done)blocked.push({name:item.name,project:p.name,projectId:p.id,prior:prior?prior.name:'پیش‌نیاز یافت نشد',missing:!prior});}
    }
    return blocked;
  }
  function stageRisks(projects,checks){
    const risks=[];
    for(const project of projects){
      const data=checks[project.id]||{},items=Array.isArray(data.items)?data.items:[],allocations=Array.isArray(data.stageBudgets)?data.stageBudgets:[];
      for(const allocation of allocations){
        if(!allocation||typeof allocation.stage!=='string'||typeof allocation.amount!=='number'||!Number.isFinite(allocation.amount)||allocation.amount<0)continue;
        let estimate=0,actual=0,missing=0;
        for(const item of items){
          if(item.stage!==allocation.stage)continue;
          if(item.unitPrice===null)missing++;
          else if([item.quantity,item.unitPrice,item.extra].every(n=>typeof n==='number'&&Number.isFinite(n)&&n>=0))estimate+=item.quantity*item.unitPrice+item.extra;
          if((item.status==='پرداخت‌شده'||item.status==='متعهدشده')&&typeof item.paid==='number'&&Number.isFinite(item.paid)&&item.paid>=0)actual+=item.paid;
        }
        if(estimate>allocation.amount||actual>allocation.amount)risks.push({project:project.name,projectId:project.id,stage:allocation.stage,limit:allocation.amount,estimate,actual,missing});
      }
    }
    return risks;
  }
  function render(){
    const list=$('dashProjects'); list.replaceChildren();
    try {
      const {projects,checks}=readData(),due=dueItems(projects,checks),blocked=blockedItems(projects,checks),risks=stageRisks(projects,checks);
      let rows=0, done=0, spent=0, commitments=0, missing=0;
      for(const p of projects){
        const items=Array.isArray(checks[p.id]?.items)?checks[p.id].items:[];
        rows+=items.length;
        for(const i of items){ if(i.done)done++; if(i.unitPrice===null)missing++; if(i.status==='پرداخت‌شده')spent+=Number(i.paid)||0; if(i.status==='متعهدشده')commitments+=Number(i.paid)||0; }
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
      const localDate=dateToday();
      $('dashDueCount').textContent=`${fmt(due.length)} فعالیت دارای موعد · ${fmt(due.filter(i=>i.date<localDate).length)} موعد گذشته؛ نمایش حداکثر ۵ مورد`;
      for(const item of due.slice(0,5)){
        const row=document.createElement('div'),desc=document.createElement('p'),open=document.createElement('button');
        desc.textContent=[item.name,item.project,item.date,'اولویت: '+item.priority,item.assignee?'مسئول: '+item.assignee:'',item.date<localDate?'موعد گذشته':''].filter(Boolean).join(' · ');
        open.type='button';open.className='btn secondary sm';open.textContent='باز کردن پروژه';open.setAttribute('aria-label','باز کردن پروژه '+item.project+' برای فعالیت '+item.name);
        open.addEventListener('click',()=>{if(!window.yasbuildosOpenChecklist||!window.yasbuildosOpenChecklist(item.projectId))$('dashSummary').textContent='باز کردن پروژه ممکن نشد؛ فهرست پروژه‌ها را بررسی کنید.';});
        row.append(desc,open);deadlines.appendChild(row);
      }
      if(!due.length)deadlines.textContent='فعالیت انجام‌نشده با موعد ثبت نشده است.';
      const waiting=$('dashBlocked');waiting.replaceChildren();
      $('dashBlockedCount').textContent=`${fmt(blocked.length)} فعالیت منتظر پیش‌نیاز · نمایش حداکثر ۵ مورد`;
      for(const item of blocked.slice(0,5)){
        const row=document.createElement('div'),desc=document.createElement('p'),open=document.createElement('button');
        desc.textContent=[item.name,item.project,item.missing?item.prior:'منتظر: '+item.prior].join(' · ');
        open.type='button';open.className='btn secondary sm';open.textContent='بررسی فعالیت‌ها';open.setAttribute('aria-label','بررسی فعالیت‌های منتظر در پروژه '+item.project);
        open.addEventListener('click',()=>{if(!window.yasbuildosOpenChecklist||!window.yasbuildosOpenChecklist(item.projectId,'blocked'))$('dashSummary').textContent='باز کردن پروژه ممکن نشد؛ فهرست پروژه‌ها را بررسی کنید.';});
        row.append(desc,open);waiting.appendChild(row);
      }
      if(!blocked.length)waiting.textContent='فعالیتی منتظر پیش‌نیاز ثبت نشده است.';
      const riskList=$('dashStageRisks');riskList.replaceChildren();
      $('dashStageRiskCount').textContent=`${fmt(risks.length)} مرحله با برآورد یا پرداخت و تعهد بیشتر از سقف · نمایش حداکثر ۵ مورد`;
      for(const risk of risks.slice(0,5)){
        const row=document.createElement('div'),desc=document.createElement('p'),open=document.createElement('button');
        desc.textContent=[risk.project,risk.stage,`سقف: ${fmt(risk.limit)} تومان`,`برآورد: ${fmt(risk.estimate)} تومان`,`پرداخت و تعهد: ${fmt(risk.actual)} تومان`,risk.missing?`${fmt(risk.missing)} ردیف بدون قیمت`: ''].filter(Boolean).join(' · ');
        open.type='button';open.className='btn secondary sm';open.textContent='بررسی بودجه پروژه';open.setAttribute('aria-label','بررسی بودجه پروژه '+risk.project+'، مرحله '+risk.stage);
        open.addEventListener('click',()=>{if(!window.yasbuildosOpenChecklist||!window.yasbuildosOpenChecklist(risk.projectId))$('dashSummary').textContent='باز کردن پروژه ممکن نشد؛ فهرست پروژه‌ها را بررسی کنید.';});
        row.append(desc,open);riskList.appendChild(row);
      }
      if(!risks.length)riskList.textContent='مرحله‌ای با عبور ثبت‌شده از سقف وجود ندارد. ردیف‌های بدون قیمت در برآورد کامل لحاظ نمی‌شوند.';
    }catch(_){$('dashSummary').textContent='اطلاعات محلی خوانده نشد. دسترسی مرورگر به فضای ذخیره‌سازی را بررسی کنید.';}
  }
  $('dashDueCsv').addEventListener('click',()=>{
    try{
      const {projects,checks}=readData(),today=dateToday();
      const cell=value=>{let text=String(value??'');if(/^[\s\t\r\n]*[=+@-]/.test(text))text="'"+text;return '"'+text.replace(/"/g,'""')+'"';};
      const rows=[['فعالیت','پروژه','موعد میلادی','وضعیت موعد','مسئول','اولویت']];
      for(const item of dueItems(projects,checks))rows.push([item.name,item.project,item.date,item.date<today?'موعد گذشته':'آینده یا امروز',item.assignee,item.priority]);
      const blob=new Blob(['\uFEFF'+rows.map(row=>row.map(cell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),link=document.createElement('a');
      link.href=url;link.download='yasbuildos-deadlines.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    }catch(_){$('dashSummary').textContent='دریافت گزارش ممکن نشد؛ دسترسی به داده‌های محلی را بررسی کنید.';}
  });
  document.querySelector('[data-tab="dashboard"]').addEventListener('click',render);
  for(const button of document.querySelectorAll('[data-dash-go]')) button.addEventListener('click',()=>document.querySelector(`[data-tab="${button.dataset.dashGo}"]`).click());
  window.addEventListener('yasbuildos-projects-updated',render);
  render();
})();
