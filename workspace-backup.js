// پشتیبان محلی پروژه‌ها و چک‌لیست‌ها؛ فایل رمزگذاری نشده است.
(() => {
  'use strict';
  const projectsKey='yasbuildos.projects.v1', checksKey='yasbuildos.checklist.v1', trashKey='yasbuildos.projects.trash.v1', maxSize=10*1024*1024;
  const input=document.getElementById('workspaceBackupFile'), message=document.getElementById('workspaceBackupMessage');
  const say=text=>{message.textContent=text;};
  const str=(v,max)=>typeof v==='string'&&v.length<=max;
  const num=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=1e15;
  const validProject=p=>p&&typeof p==='object'&&!Array.isArray(p)&&str(p.id,100)&&p.id.length>0&&str(p.name,100)&&p.name.trim()&&str(p.city,100)&&['','مسکونی','ویلایی','تجاری','بازسازی','سایر'].includes(p.type)&&['برنامه‌ریزی','در حال اجرا','متوقف','پایان‌یافته'].includes(p.status)&&(p.area===null||num(p.area)&&p.area<=1e9)&&(p.budget===null||num(p.budget))&&str(p.createdAt,40)&&Number.isFinite(Date.parse(p.createdAt))&&str(p.updatedAt,40)&&Number.isFinite(Date.parse(p.updatedAt));
  const validHistory=h=>Array.isArray(h)&&h.length<=30&&h.every(p=>p&&typeof p==='object'&&(p.unitPrice===null||num(p.unitPrice))&&str(p.unit,30)&&p.unit.trim()&&str(p.source,200)&&str(p.date,10)&&str(p.changedAt,40)&&Number.isFinite(Date.parse(p.changedAt)));
  const validOffers=offers=>Array.isArray(offers)&&offers.length<=20&&offers.every(o=>o&&typeof o==='object'&&num(o.price)&&str(o.source,200)&&o.source.trim()&&str(o.unit,30)&&o.unit.trim()&&(o.note===undefined||str(o.note,200))&&str(o.date,10)&&(!o.date||/^\d{4}-\d{2}-\d{2}$/.test(o.date)));
  const validItem=i=>i&&typeof i==='object'&&!Array.isArray(i)&&str(i.id,100)&&i.id.length>0&&str(i.name,100)&&i.name.trim()&&str(i.stage,100)&&i.stage.trim()&&num(i.quantity)&&str(i.unit,30)&&i.unit.trim()&&(i.unitPrice===null||num(i.unitPrice))&&num(i.extra)&&num(i.paid)&&['برآورد','متعهدشده','پرداخت‌شده'].includes(i.status)&&str(i.source,200)&&str(i.date,10)&&(i.assignee===undefined||str(i.assignee,100))&&(i.due===undefined||str(i.due,10)&&(!i.due||/^\d{4}-\d{2}-\d{2}$/.test(i.due)))&&typeof i.done==='boolean'&&Number.isSafeInteger(Math.round(i.quantity*(i.unitPrice??0)+i.extra))&&(i.priority===undefined||['پایین','معمولی','بالا'].includes(i.priority))&&(i.costType===undefined||['دسته‌بندی نشده','مصالح','دستمزد','حمل','تجهیزات','سایر هزینه‌ها'].includes(i.costType))&&(i.priceHistory===undefined||validHistory(i.priceHistory))&&(i.offers===undefined||validOffers(i.offers));
  const validStageBudgets=a=>Array.isArray(a)&&a.length<=10000&&a.every(b=>b&&str(b.stage,100)&&b.stage.trim()&&num(b.amount))&&new Set(a.map(b=>b.stage)).size===a.length&&Number.isSafeInteger(Math.round(a.reduce((sum,b)=>sum+b.amount,0)));
  const validCalculations=a=>Array.isArray(a)&&a.length<=100&&a.every(r=>r&&typeof r==='object'&&!Array.isArray(r)&&str(r.id,100)&&r.id.length>0&&str(r.createdAt,40)&&Number.isFinite(Date.parse(r.createdAt))&&r.result&&typeof r.result==='object'&&!Array.isArray(r.result)&&str(r.result.tool,200)&&r.result.tool.length>0&&JSON.stringify(r.result).length<=20000)&&new Set(a.map(r=>r.id)).size===a.length;
  const validChecks=checks=>checks&&typeof checks==='object'&&!Array.isArray(checks)&&Object.keys(checks).length<=10000&&Object.entries(checks).every(([id,c])=>id.length>0&&id.length<=100&&c&&typeof c==='object'&&!Array.isArray(c)&&num(c.reserve)&&(c.stageBudgets===undefined||validStageBudgets(c.stageBudgets))&&(c.calculations===undefined||validCalculations(c.calculations))&&Array.isArray(c.items)&&c.items.length<=10000&&c.items.every(i=>validItem(i)&&(i.dependencyId===undefined||str(i.dependencyId,100))&&(i.purchased==null||num(i.purchased)&&i.purchased<=i.quantity)&&(i.notes===undefined||str(i.notes,2000)))&&new Set(c.items.map(i=>i.id)).size===c.items.length);
  const validProjects=projects=>Array.isArray(projects)&&projects.length<=10000&&projects.every(validProject)&&new Set(projects.map(p=>p.id)).size===projects.length;
  const validTrash=entries=>Array.isArray(entries)&&entries.length<=10000&&entries.every(e=>e&&typeof e==='object'&&validProject(e.project)&&str(e.deletedAt,40)&&Number.isFinite(Date.parse(e.deletedAt)))&&new Set(entries.map(e=>e.project.id)).size===entries.length;
  function hasDependencyCycle(items){
    const links=new Map(items.map(item=>[item.id,item.dependencyId||''])),done=new Set();
    for(const item of items){let id=item.id;const path=new Set();while(id&&links.has(id)&&!done.has(id)){if(path.has(id))return true;path.add(id);id=links.get(id);}for(const visited of path)done.add(visited);}
    return false;
  }
  function read(){
    const rawProjects=localStorage.getItem(projectsKey),rawChecks=localStorage.getItem(checksKey),rawTrash=localStorage.getItem(trashKey);
    const projects=rawProjects===null?[]:JSON.parse(rawProjects),checks=rawChecks===null?{}:JSON.parse(rawChecks),trash=rawTrash===null?[]:JSON.parse(rawTrash);
    if(!validProjects(projects)||!validChecks(checks)||!validTrash(trash))throw Error('invalid local data');
    return {projects,checks,trash,rawProjects,rawChecks,rawTrash};
  }
  document.getElementById('workspaceBackupExport').addEventListener('click',()=>{
    try{
      const {projects,checks,trash}=read(),selected=Object.create(null);
      for(const p of [...projects,...trash.map(e=>e.project)])if(Object.hasOwn(checks,p.id))selected[p.id]=checks[p.id];
      const payload={format:'yasbuildos-workspace',version:2,exportedAt:new Date().toISOString(),projects,deletedProjects:trash,checklists:selected};
      const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
      if(blob.size>maxSize)throw Error('too large');
      const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='yasbuildos-workspace-'+new Date().toISOString().slice(0,10)+'.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
      say('پشتیبان پروژه‌ها، فهرست حذف‌شده‌ها و چک‌لیست‌ها آماده شد؛ فایل را در جای امن نگه دارید.');
    }catch(_){say('ساخت پشتیبان ممکن نشد؛ داده‌ها یا فضای ذخیره‌سازی و سقف ۱۰ مگابایت را بررسی کنید.');}
  });
  input.addEventListener('change',async()=>{
    const file=input.files?.[0];if(!file)return;
    try{
      if(file.size>maxSize)throw Error('too large');
      const backup=JSON.parse(await file.text());
      if(!backup||backup.format!=='yasbuildos-workspace'||![1,2].includes(backup.version)||!validProjects(backup.projects)||!validChecks(backup.checklists))throw Error('invalid');
      if(Object.values(backup.checklists).some(check=>hasDependencyCycle(check.items))){say('بازیابی انجام نشد؛ وابستگی فعالیت‌های داخل فایل دوری است. داده‌های فعلی تغییر نکردند.');return;}
      const deleted=backup.version===1?[]:backup.deletedProjects;
      if(!validTrash(deleted))throw Error('invalid deleted projects');
      const importedIds=new Set([...backup.projects.map(p=>p.id),...deleted.map(e=>e.project.id)]);
      if(Object.keys(backup.checklists).some(id=>!importedIds.has(id)))throw Error('orphan checklist');
      const current=read(),existing=new Set([...current.projects.map(p=>p.id),...current.trash.map(e=>e.project.id)]);
      const added=backup.projects.filter(p=>!existing.has(p.id)&&!Object.hasOwn(current.checks,p.id));
      const addedIds=new Set(added.map(p=>p.id));
      const addedTrash=deleted.filter(e=>!existing.has(e.project.id)&&!addedIds.has(e.project.id)&&!Object.hasOwn(current.checks,e.project.id));
      if(current.projects.length+added.length>10000||current.trash.length+addedTrash.length>10000)throw Error('too many');
      if(!confirm(`${added.length.toLocaleString('fa-IR')} پروژه فعال و ${addedTrash.length.toLocaleString('fa-IR')} پروژه حذف‌شده همراه چک‌لیست مربوطه افزوده شود؟ موارد موجود یا دارای شناسه تکراری تغییر نمی‌کنند.`))return;
      const checks=Object.assign(Object.create(null),current.checks);
      for(const p of [...added,...addedTrash.map(e=>e.project)])if(Object.hasOwn(backup.checklists,p.id))checks[p.id]=backup.checklists[p.id];
      if(Object.keys(checks).length>10000)throw Error('too many checklists');
      const expected=new Map([[projectsKey,current.rawProjects],[checksKey,current.rawChecks],[trashKey,current.rawTrash]]),written=[];
      const unchanged=()=>[...expected].every(([key,value])=>localStorage.getItem(key)===value);
      if(!unchanged()){say('اطلاعات در زبانه دیگری تغییر کرد؛ بازیابی متوقف شد. صفحه را تازه کنید و دوباره تلاش کنید.');return;}
      const write=(key,value)=>{if(!unchanged())throw Error('concurrent change');const previous=expected.get(key);localStorage.setItem(key,value);written.push({key,previous,value});expected.set(key,value);};
      try{
        write(checksKey,JSON.stringify(checks));
        if(addedTrash.length)write(trashKey,JSON.stringify([...current.trash,...addedTrash]));
        write(projectsKey,JSON.stringify([...current.projects,...added]));
      }catch(_){
        let rollbackIncomplete=false;
        for(const change of written.reverse()){try{if(localStorage.getItem(change.key)!==change.value){rollbackIncomplete=true;continue;}if(change.previous===null)localStorage.removeItem(change.key);else localStorage.setItem(change.key,change.previous);}catch(_){rollbackIncomplete=true;}}
        if(rollbackIncomplete){say('بازیابی کامل نشد؛ داده تغییرکرده در زبانه دیگر را بازنویسی نکردیم یا بازگرداندن خودکار ناموفق بود. اطلاعات و فایل پشتیبان را بررسی کنید.');return;}
        say('بازیابی انجام نشد؛ فضای ذخیره‌سازی و دسترسی مرورگر را بررسی کنید.');return;
      }
      window.dispatchEvent(new Event('yasbuildos-projects-updated'));
      say(`${added.length.toLocaleString('fa-IR')} پروژه فعال و ${addedTrash.length.toLocaleString('fa-IR')} پروژه حذف‌شده همراه چک‌لیست‌های موجود اضافه شد؛ موارد تکراری تغییر نکردند.`);
    }catch(_){say('فایل معتبر نیست، بیش از ۱۰ مگابایت است یا داده‌های محلی خوانده نمی‌شوند؛ بازیابی انجام نشد.');}
    finally{input.value='';}
  });
})();
