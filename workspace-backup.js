// پشتیبان محلی پروژه‌ها و چک‌لیست‌ها؛ فایل رمزگذاری نشده است.
(() => {
  'use strict';
  const projectsKey='yasbuildos.projects.v1', checksKey='yasbuildos.checklist.v1', maxSize=10*1024*1024;
  const input=document.getElementById('workspaceBackupFile'), message=document.getElementById('workspaceBackupMessage');
  const say=text=>{message.textContent=text;};
  const str=(v,max)=>typeof v==='string'&&v.length<=max;
  const num=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=1e15;
  const validProject=p=>p&&typeof p==='object'&&!Array.isArray(p)&&str(p.id,100)&&p.id.length>0&&str(p.name,100)&&p.name.trim()&&str(p.city,100)&&['','مسکونی','ویلایی','تجاری','بازسازی','سایر'].includes(p.type)&&['برنامه‌ریزی','در حال اجرا','متوقف','پایان‌یافته'].includes(p.status)&&(p.area===null||num(p.area)&&p.area<=1e9)&&(p.budget===null||num(p.budget))&&str(p.createdAt,40)&&Number.isFinite(Date.parse(p.createdAt))&&str(p.updatedAt,40)&&Number.isFinite(Date.parse(p.updatedAt));
  const validHistory=h=>Array.isArray(h)&&h.length<=30&&h.every(p=>p&&typeof p==='object'&&(p.unitPrice===null||num(p.unitPrice))&&str(p.unit,30)&&p.unit.trim()&&str(p.source,200)&&str(p.date,10)&&str(p.changedAt,40)&&Number.isFinite(Date.parse(p.changedAt)));
  const validOffers=offers=>Array.isArray(offers)&&offers.length<=20&&offers.every(o=>o&&typeof o==='object'&&num(o.price)&&str(o.source,200)&&o.source.trim()&&str(o.unit,30)&&o.unit.trim()&&(o.note===undefined||str(o.note,200))&&str(o.date,10)&&(!o.date||/^\d{4}-\d{2}-\d{2}$/.test(o.date)));
  const validItem=i=>i&&typeof i==='object'&&!Array.isArray(i)&&str(i.id,100)&&i.id.length>0&&str(i.name,100)&&i.name.trim()&&str(i.stage,100)&&i.stage.trim()&&num(i.quantity)&&str(i.unit,30)&&i.unit.trim()&&(i.unitPrice===null||num(i.unitPrice))&&num(i.extra)&&num(i.paid)&&['برآورد','متعهدشده','پرداخت‌شده'].includes(i.status)&&str(i.source,200)&&str(i.date,10)&&(i.assignee===undefined||str(i.assignee,100))&&(i.due===undefined||str(i.due,10)&&(!i.due||/^\d{4}-\d{2}-\d{2}$/.test(i.due)))&&typeof i.done==='boolean'&&Number.isSafeInteger(Math.round(i.quantity*(i.unitPrice??0)+i.extra))&&(i.priority===undefined||['پایین','معمولی','بالا'].includes(i.priority))&&(i.costType===undefined||['دسته‌بندی نشده','مصالح','دستمزد','حمل','تجهیزات','سایر هزینه‌ها'].includes(i.costType))&&(i.priceHistory===undefined||validHistory(i.priceHistory))&&(i.offers===undefined||validOffers(i.offers));
  const validChecks=checks=>checks&&typeof checks==='object'&&!Array.isArray(checks)&&Object.keys(checks).length<=10000&&Object.entries(checks).every(([id,c])=>id.length>0&&id.length<=100&&c&&typeof c==='object'&&!Array.isArray(c)&&num(c.reserve)&&Array.isArray(c.items)&&c.items.length<=10000&&c.items.every(i=>validItem(i)&&(i.purchased==null||num(i.purchased)&&i.purchased<=i.quantity)&&(i.notes===undefined||str(i.notes,2000)))&&new Set(c.items.map(i=>i.id)).size===c.items.length);
  const validProjects=projects=>Array.isArray(projects)&&projects.length<=10000&&projects.every(validProject)&&new Set(projects.map(p=>p.id)).size===projects.length;
  function read(){
    const rawProjects=localStorage.getItem(projectsKey),rawChecks=localStorage.getItem(checksKey);
    const projects=rawProjects===null?[]:JSON.parse(rawProjects),checks=rawChecks===null?{}:JSON.parse(rawChecks);
    if(!validProjects(projects)||!validChecks(checks))throw Error('invalid local data');
    return {projects,checks,rawProjects,rawChecks};
  }
  document.getElementById('workspaceBackupExport').addEventListener('click',()=>{
    try{
      const {projects,checks}=read(),selected=Object.create(null);
      for(const p of projects)if(Object.hasOwn(checks,p.id))selected[p.id]=checks[p.id];
      const payload={format:'yasbuildos-workspace',version:1,exportedAt:new Date().toISOString(),projects,checklists:selected};
      const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
      if(blob.size>maxSize)throw Error('too large');
      const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='yasbuildos-workspace-'+new Date().toISOString().slice(0,10)+'.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
      say('پشتیبان پروژه‌ها و چک‌لیست‌ها آماده شد؛ فایل را در جای امن نگه دارید.');
    }catch(_){say('ساخت پشتیبان ممکن نشد؛ داده‌ها یا فضای ذخیره‌سازی و سقف ۱۰ مگابایت را بررسی کنید.');}
  });
  input.addEventListener('change',async()=>{
    const file=input.files?.[0];if(!file)return;
    try{
      if(file.size>maxSize)throw Error('too large');
      const backup=JSON.parse(await file.text());
      if(!backup||backup.format!=='yasbuildos-workspace'||backup.version!==1||!validProjects(backup.projects)||!validChecks(backup.checklists))throw Error('invalid');
      const importedIds=new Set(backup.projects.map(p=>p.id));
      if(Object.keys(backup.checklists).some(id=>!importedIds.has(id)))throw Error('orphan checklist');
      const current=read(),existing=new Set(current.projects.map(p=>p.id));
      const added=backup.projects.filter(p=>!existing.has(p.id)&&!Object.hasOwn(current.checks,p.id));
      if(current.projects.length+added.length>10000)throw Error('too many');
      if(!confirm(`${added.length.toLocaleString('fa-IR')} پروژه جدید همراه چک‌لیست مربوطه افزوده شود؟ موارد موجود یا دارای شناسه تکراری تغییر نمی‌کنند.`))return;
      const checks=Object.assign(Object.create(null),current.checks);
      for(const p of added)if(Object.hasOwn(backup.checklists,p.id))checks[p.id]=backup.checklists[p.id];
      if(Object.keys(checks).length>10000)throw Error('too many checklists');
      let changedChecks=false;
      try{
        localStorage.setItem(checksKey,JSON.stringify(checks));changedChecks=true;
        localStorage.setItem(projectsKey,JSON.stringify([...current.projects,...added]));
      }catch(_){
        if(changedChecks){try{if(current.rawChecks===null)localStorage.removeItem(checksKey);else localStorage.setItem(checksKey,current.rawChecks);}catch(_){say('بازیابی کامل نشد و بازگرداندن خودکار ناموفق بود. داده‌های محلی را بررسی کنید و فایل پشتیبان را نگه دارید.');return;}}
        say('بازیابی انجام نشد؛ فضای ذخیره‌سازی و دسترسی مرورگر را بررسی کنید.');return;
      }
      window.dispatchEvent(new Event('yasbuildos-projects-updated'));
      say(`${added.length.toLocaleString('fa-IR')} پروژه همراه چک‌لیست‌های موجود در پشتیبان اضافه شد؛ موارد تکراری تغییر نکردند.`);
    }catch(_){say('فایل معتبر نیست، بیش از ۱۰ مگابایت است یا داده‌های محلی خوانده نمی‌شوند؛ بازیابی انجام نشد.');}
    finally{input.value='';}
  });
})();
