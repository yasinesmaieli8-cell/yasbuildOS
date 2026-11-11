// محاسبات محلی همراه چک‌لیست و پشتیبان فضای کار ذخیره می‌شوند.
(() => {
  'use strict';
  const $=id=>document.getElementById(id),projectsKey='yasbuildos.projects.v1',checksKey='yasbuildos.checklist.v1';
  const read=()=>{
    const projectsRaw=localStorage.getItem(projectsKey),checksRaw=localStorage.getItem(checksKey);
    const projects=JSON.parse(projectsRaw||'[]'),checks=JSON.parse(checksRaw||'{}');
    if(!Array.isArray(projects)||!checks||typeof checks!=='object'||Array.isArray(checks))throw Error('invalid storage');
    return {projects,checks,projectsRaw,checksRaw};
  };
  const validRecord=r=>r&&typeof r==='object'&&!Array.isArray(r)&&typeof r.id==='string'&&r.id.length>0&&r.id.length<=100&&typeof r.createdAt==='string'&&Number.isFinite(Date.parse(r.createdAt))&&r.result&&typeof r.result==='object'&&!Array.isArray(r.result)&&typeof r.result.tool==='string'&&r.result.tool.length>0&&r.result.tool.length<=200&&JSON.stringify(r.result).length<=20000;
  const records=state=>{const data=state.calculations??[];if(!Array.isArray(data)||data.length>100||!data.every(validRecord)||new Set(data.map(r=>r.id)).size!==data.length)throw Error('invalid calculations');return data;};
  function setup(prefix,result){
    const select=$(prefix+'LocalProject'),message=$(prefix+'LocalMessage');
    $(prefix+'LocalLoad').addEventListener('click',()=>{
      try{const {projects}=read(),previous=select.value;select.replaceChildren();const blank=document.createElement('option');blank.value='';blank.textContent='انتخاب پروژه محلی';select.appendChild(blank);
        for(const p of projects){if(!p||typeof p.id!=='string'||typeof p.name!=='string')throw Error('invalid project');const option=document.createElement('option');option.value=p.id;option.textContent=p.name;select.appendChild(option);}select.value=projects.some(p=>p.id===previous)?previous:'';message.textContent=projects.length?'پروژه محلی را انتخاب کنید.':'ابتدا در بخش پروژه‌ها یک پروژه محلی بسازید.';
      }catch(_){message.textContent='فهرست پروژه‌های محلی خوانده نشد.';}
    });
    $(prefix+'LocalSave').addEventListener('click',()=>{
      try{const data=read(),id=select.value,record=result();
        if(!id||!data.projects.some(p=>p?.id===id)){message.textContent='ابتدا پروژه‌های محلی را بارگیری و پروژه را انتخاب کنید.';return;}
        if(!record){message.textContent='ابتدا ورودی‌های معتبر وارد کنید.';return;}
        const state=data.checks[id]??{reserve:0,items:[]};if(!state||typeof state!=='object'||Array.isArray(state)||!Array.isArray(state.items)||typeof state.reserve!=='number'||!Number.isFinite(state.reserve)||state.reserve<0)throw Error('invalid checklist');
        const existing=records(state);if(existing.length>=100){message.textContent='سقف ۱۰۰ محاسبه برای این پروژه پر شده است؛ ابتدا یک محاسبه را حذف کنید.';return;}
        const entry={id:crypto.randomUUID(),createdAt:new Date().toISOString(),result:JSON.parse(JSON.stringify(record))};
        if(!validRecord(entry)||existing.some(r=>r.id===entry.id))throw Error('invalid record');
        if(localStorage.getItem(projectsKey)!==data.projectsRaw||localStorage.getItem(checksKey)!==data.checksRaw)throw Error('changed');
        localStorage.setItem(checksKey,JSON.stringify({...data.checks,[id]:{...state,calculations:[...existing,entry]}}));
        window.dispatchEvent(new Event('yasbuildos-local-calculations-updated'));
        message.textContent='محاسبه در پروژه محلی ذخیره شد؛ در چک‌لیست همان پروژه قابل مشاهده است.';
      }catch(_){message.textContent='ذخیره محاسبه ممکن نشد؛ داده‌ها و فضای مرورگر را بررسی کنید.';}
    });
  }
  setup('runner',()=>window.ybCurrentResult);setup('stair',()=>window.ybStairResult);
  const list=$('checkCalculations'),status=$('checkCalculationsMessage');
  function fields(value,path=''){
    if(value===null||typeof value!=='object')return [[path,value===null?'ثبت نشده':value]];
    if(Array.isArray(value))return value.flatMap((entry,index)=>entry&&typeof entry==='object'&&!Array.isArray(entry)&&typeof entry.عنوان==='string'&&Object.hasOwn(entry,'مقدار')?fields(entry.مقدار,[path,entry.عنوان].filter(Boolean).join(' / ')):fields(entry,[path,String(index+1)].filter(Boolean).join(' / ')));
    return Object.entries(value).flatMap(([key,entry])=>fields(entry,[path,key.replaceAll('_',' ')].filter(Boolean).join(' / ')));
  }
  function rowsFor(item){return [...fields(item.result.inputs??{},'ورودی'),...fields(item.result.outputs??{},'نتیجه')];}
  function render(){
    list.replaceChildren();const id=$('checkProject').value;if(!id){status.textContent='ابتدا پروژه را انتخاب کنید.';return;}
    try{const data=read(),state=data.checks[id]??{reserve:0,items:[]},items=records(state);status.textContent=items.length?`${items.length.toLocaleString('fa-IR')} محاسبه ذخیره‌شده در این مرورگر`:'محاسبه‌ای برای این پروژه ثبت نشده است.';
      for(const item of [...items].reverse()){
        const details=document.createElement('details');details.className='project-item';const title=document.createElement('summary');title.textContent=item.result.tool+' · '+new Date(item.createdAt).toLocaleString('fa-IR');details.appendChild(title);
        for(const [label,value] of rowsFor(item)){const line=document.createElement('p');line.textContent=label+': '+(typeof value==='number'?new Intl.NumberFormat('fa-IR',{maximumSignificantDigits:10}).format(value):String(value));details.appendChild(line);}
        const del=document.createElement('button');del.type='button';del.className='btn secondary sm';del.textContent='حذف این محاسبه';del.addEventListener('click',()=>{
          if(!confirm('این محاسبه از پروژه محلی حذف شود؟'))return;
          try{const now=read(),current=now.checks[id],all=records(current);if(!all.some(r=>r.id===item.id&&JSON.stringify(r)===JSON.stringify(item)))throw Error('changed');
            if(localStorage.getItem(checksKey)!==now.checksRaw||localStorage.getItem(projectsKey)!==now.projectsRaw)throw Error('changed');
            localStorage.setItem(checksKey,JSON.stringify({...now.checks,[id]:{...current,calculations:all.filter(r=>r.id!==item.id)}}));window.dispatchEvent(new Event('yasbuildos-local-calculations-updated'));render();status.textContent='محاسبه حذف شد.';
          }catch(_){status.textContent='حذف انجام نشد؛ اطلاعات تغییر کرده یا دسترسی به ذخیره‌سازی ممکن نیست.';}
        });details.appendChild(del);list.appendChild(details);
      }
    }catch(_){status.textContent='محاسبات خوانده نشدند؛ داده‌های محلی را بررسی کنید.';}
  }
  $('checkCalculationsCsv').addEventListener('click',()=>{
    try{const id=$('checkProject').value;if(!id){status.textContent='ابتدا پروژه را انتخاب کنید.';return;}const data=read(),items=records(data.checks[id]??{});
      if(!items.length){status.textContent='محاسبه‌ای برای دریافت گزارش وجود ندارد.';return;}
      const cell=value=>{let text=String(value??'');if(typeof value!=='number'&&/^[\s\t\r\n]*[=+@-]/.test(text))text="'"+text;return '"'+text.replace(/"/g,'""')+'"';};
      const rows=[['ابزار','زمان ثبت میلادی','عنوان ورودی یا نتیجه','مقدار']];for(const item of items)for(const [label,value] of rowsFor(item))rows.push([item.result.tool,item.createdAt,label,value]);
      const blob=new Blob(['\uFEFF'+rows.map(row=>row.map(cell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='yasbuildos-calculations.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status.textContent='گزارش محاسبات ذخیره‌شده آماده شد.';
    }catch(_){status.textContent='گزارش محاسبات ساخته نشد؛ اطلاعات و دسترسی مرورگر را بررسی کنید.';}
  });
  $('checkProject').addEventListener('change',render);$('checkReload').addEventListener('click',render);document.querySelector('[data-tab="checklist"]').addEventListener('click',render);
})();
