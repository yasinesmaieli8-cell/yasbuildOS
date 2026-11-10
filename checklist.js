(() => {
  'use strict';
  const $ = id => document.getElementById(id), key = 'yasbuildos.checklist.v1', projectKey = 'yasbuildos.projects.v1';
  const number = n => new Intl.NumberFormat('fa-IR', {maximumFractionDigits: 2}).format(n);
  const money = n => number(n) + ' تومان';
  const stages = ['آماده‌سازی و مجوزها','خاک‌برداری','پی و فونداسیون','اسکلت و سقف','دیوارچینی','تأسیسات','نازک‌کاری','نما و محوطه','تحویل'];
  const costTypes = ['دسته‌بندی نشده','مصالح','دستمزد','حمل','تجهیزات','سایر هزینه‌ها'];
  let all = {}, projects = [], selected = '', editing = null, healthy = true, reserveProject = null;
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
  const materialCandidates = () => (state().items||[]).filter(item=>item.costType==='مصالح'&&!item.done);
  function resetForm(){ editing=null; $('checkForm').reset(); $('checkSubmit').textContent='افزودن ردیف'; $('checkCancel').hidden=true; }
  function refreshProjects() {
    const previous = selected;
    read(); if (!healthy) return;
    $('checkProject').replaceChildren();
    const blank=document.createElement('option'); blank.value=''; blank.textContent='انتخاب پروژه محلی'; $('checkProject').appendChild(blank);
    for (const p of projects) { const o=document.createElement('option'); o.value=p.id; o.textContent=p.name; $('checkProject').appendChild(o); }
    selected=projects.some(p=>p.id===previous)?previous:''; $('checkProject').value=selected; reserveProject=null; render();
  }
  function render(){
    const box=$('checkContent'); box.hidden=!selected; if(!selected) return;
    const project=projects.find(p=>p.id===selected), s=state(), items=Array.isArray(s.items)?s.items:[];
    if(reserveProject!==selected){window.budgetInputs.checkReserve.set(s.reserve || null);reserveProject=selected;}
    let estimate=0, pricedBase=0, spent=0, committed=0, missing=0, done=0, shown=0, stale=0, undated=0;
    const byStage=new Map(), byCostType=new Map(), visibleRows=[];
    const search=$('checkSearch').value.trim(), filter=$('checkFilter').value, costFilter=$('checkCostFilter').value, stageFilter=items.some(item=>item.stage===$('checkStageFilter').value)?$('checkStageFilter').value:'';
    const today=new Date(), localDate=[today.getFullYear(),String(today.getMonth()+1).padStart(2,'0'),String(today.getDate()).padStart(2,'0')].join('-');
    const stageSelect=$('checkStageFilter'); stageSelect.replaceChildren();
    const allStages=document.createElement('option'); allStages.value=''; allStages.textContent='همه مراحل'; stageSelect.appendChild(allStages);
    for(const name of new Set(items.map(item=>item.stage).filter(Boolean))){const option=document.createElement('option');option.value=name;option.textContent=name;stageSelect.appendChild(option);}
    stageSelect.value=stageFilter;
    $('checkItems').replaceChildren();
    for (const item of items) {
      const cost=item.unitPrice===null?null:item.quantity*item.unitPrice+item.extra;
      if(cost===null) missing++; else estimate+=cost;
      if(cost!==null){
        pricedBase+=item.quantity*item.unitPrice;
        if(!item.date) undated++;
        else {const date=Date.parse(item.date+'T00:00:00Z'), today=new Date();const now=Date.UTC(today.getFullYear(),today.getMonth(),today.getDate());if(Number.isFinite(date)&&now-date>30*86400000)stale++;}
      }
      if(item.status==='پرداخت‌شده') spent+=item.paid;
      if(item.status==='متعهدشده') committed+=item.paid;
      if(item.done) done++;
      const group=byStage.get(item.stage)||{estimate:0,missing:0,spent:0,committed:0,count:0};
      group.count++; if(cost===null)group.missing++; else group.estimate+=cost;
      if(item.status==='پرداخت‌شده')group.spent+=item.paid;
      if(item.status==='متعهدشده')group.committed+=item.paid;
      byStage.set(item.stage,group);
      const costType=item.costType||costTypes[0], typeGroup=byCostType.get(costType)||{estimate:0,missing:0,spent:0,committed:0,count:0};
      typeGroup.count++; if(cost===null)typeGroup.missing++;else typeGroup.estimate+=cost;
      if(item.status==='پرداخت‌شده')typeGroup.spent+=item.paid;
      if(item.status==='متعهدشده')typeGroup.committed+=item.paid;
      byCostType.set(costType,typeGroup);
      if(search&&!(`${item.name} ${item.stage} ${item.unit} ${item.assignee||''} ${item.notes||''}`).includes(search))continue;
      if(stageFilter && item.stage!==stageFilter)continue;
      if(costFilter && costType!==costFilter)continue;
      if(filter==='done'&&!item.done || filter==='open'&&item.done || filter==='missing'&&item.unitPrice!==null || filter==='overdue'&&(!item.due||item.done||item.due>=localDate) || filter==='urgent'&&(item.done||item.priority!=='بالا'))continue;
      shown++;
      const row=document.createElement('article'); row.className='project-item';
      const title=document.createElement('h3'); title.textContent=item.name;
      const detail=document.createElement('p'); detail.textContent=[item.stage,'نوع هزینه: '+costType,'اولویت: '+(item.priority||'معمولی'),number(item.quantity)+' '+item.unit,item.unitPrice===null?'قیمت واحد نامشخص':'قیمت واحد: '+money(item.unitPrice),cost===null?'برآورد نامشخص':'برآورد: '+money(cost),item.status==='برآورد'?'بدون پرداخت ثبت‌شده':item.status+': '+money(item.paid),item.done?'انجام شده':'انجام نشده'].join(' · ');
      row.append(title,detail);
      if(item.source){ const source=document.createElement('p'); source.textContent='منبع ثبت‌شده: '+item.source+(item.date?' · '+item.date:''); row.appendChild(source); }
      if(item.assignee||item.due){const details=document.createElement('p');const today=new Date(), localDate=[today.getFullYear(),String(today.getMonth()+1).padStart(2,'0'),String(today.getDate()).padStart(2,'0')].join('-');details.textContent=[item.assignee?'مسئول: '+item.assignee:'',item.due?'موعد: '+item.due:'',item.due&&!item.done&&item.due<localDate?'موعد گذشته':''].filter(Boolean).join(' · ');row.appendChild(details);}
      if(item.notes){const notes=document.createElement('p');notes.textContent='توضیحات: '+item.notes;row.appendChild(notes);}
      const actions=document.createElement('div'); actions.className='project-actions';
      const toggle=document.createElement('button'); toggle.type='button'; toggle.className='btn secondary sm'; toggle.textContent=item.done?'علامت به‌عنوان انجام‌نشده':'علامت به‌عنوان انجام‌شده';
      toggle.onclick=()=>{const current=state(); const next=current.items.map(x=>x.id===item.id?{...x,done:!x.done}:x); if(save({...all,[selected]:{...current,items:next}})) render();};
      const edit=document.createElement('button'); edit.type='button'; edit.className='btn secondary sm'; edit.textContent='ویرایش'; edit.onclick=()=>{editing=item.id; for(const [id,val] of Object.entries({checkName:item.name,checkStage:stages.includes(item.stage)?item.stage:stages[0],checkCustomStage:stages.includes(item.stage)?'':item.stage,checkPriority:item.priority||'معمولی',checkCostType:item.costType||costTypes[0],checkQuantity:item.quantity,checkUnit:item.unit,checkStatus:item.status,checkSource:item.source,checkDate:item.date,checkAssignee:item.assignee||'',checkDue:item.due||'',checkNotes:item.notes||''})) $(id).value=val; for(const [id,val] of Object.entries({checkUnitPrice:item.unitPrice,checkExtra:item.extra,checkPaid:item.paid})) window.budgetInputs[id].set(val); $('checkSubmit').textContent='ذخیره تغییرات'; $('checkCancel').hidden=false; $('checkName').focus();};
      const remove=document.createElement('button'); remove.type='button'; remove.className='btn secondary sm'; remove.textContent='حذف'; remove.onclick=()=>{if(!confirm('این ردیف از چک‌لیست حذف شود؟'))return; const current=state(); if(save({...all,[selected]:{...current,items:current.items.filter(x=>x.id!==item.id)}})){if(editing===item.id)resetForm();render();}};
      const copy=document.createElement('button'); copy.type='button'; copy.className='btn secondary sm'; copy.textContent='کپی ردیف'; copy.onclick=()=>{const current=state();if(current.items.length>=10000){msg('تعداد ردیف‌ها به حد مجاز رسیده است.');return;}const duplicate={...item,id:crypto.randomUUID(),done:false,status:'برآورد',paid:0,priceHistory:[]};if(save({...all,[selected]:{...current,items:[...current.items,duplicate]}})){render();msg('کپی اضافه شد؛ پرداخت یا تعهد نسخه جدید صفر و وضعیت آن برآورد است.');}};
      actions.append(toggle,edit,remove,copy); row.appendChild(actions); visibleRows.push({item,row});
      if(Array.isArray(item.priceHistory)&&item.priceHistory.length){
        const details=document.createElement('details'),heading=document.createElement('summary');heading.textContent=`سابقه قیمت (${number(item.priceHistory.length)} مورد)`;details.appendChild(heading);
        for(const previous of [...item.priceHistory].reverse()){const line=document.createElement('p');line.textContent=[previous.unitPrice===null?'قیمت نامشخص':money(previous.unitPrice)+' برای '+previous.unit,previous.date?'تاریخ قیمت: '+previous.date:'تاریخ قیمت ثبت نشده',previous.source?'منبع: '+previous.source:'منبع ثبت نشده','ثبت تغییر: '+new Date(previous.changedAt).toLocaleDateString('fa-IR')].join(' · ');details.appendChild(line);}
        row.appendChild(details);
      }
    }
    const order=$('checkSort').value;
    if(order==='due')visibleRows.sort((a,b)=>{const x=/^\d{4}-\d{2}-\d{2}$/.test(a.item.due||'')?a.item.due:'9999-99-99',y=/^\d{4}-\d{2}-\d{2}$/.test(b.item.due||'')?b.item.due:'9999-99-99';return x.localeCompare(y);});
    if(order==='priority'){const rank={'بالا':0,'معمولی':1,'پایین':2};visibleRows.sort((a,b)=>(rank[a.item.priority]??1)-(rank[b.item.priority]??1));}
    if(order==='name')visibleRows.sort((a,b)=>a.item.name.localeCompare(b.item.name,'fa'));
    for(const entry of visibleRows)$('checkItems').appendChild(entry.row);
    if(!items.length) $('checkItems').textContent='هنوز ردیفی ثبت نشده است.';
    else if(!shown) $('checkItems').textContent='ردیفی با این جست‌وجو یا فیلتر پیدا نشد.';
    $('checkVisibleCount').textContent=`نمایش ${number(shown)} از ${number(items.length)} ردیف`;
    const budget=project.budget===null||project.budget===undefined?null:Number(project.budget), reserve=Number(s.reserve)||0;
    const summary=$('checkStages');summary.replaceChildren();
    for(const [name,group] of byStage){const row=document.createElement('p');row.textContent=`${name}: ${number(group.count)} ردیف · برآورد ${money(group.estimate)}${group.missing?' + '+number(group.missing)+' بدون قیمت':''} · پرداخت‌شده ${money(group.spent)} · تعهد ${money(group.committed)}${budget>0?' · '+number(group.estimate/budget*100)+'٪ بودجه (برآورد اقلام قیمت‌دار)':''}`;summary.appendChild(row);}
    if(!byStage.size)summary.textContent='هنوز هزینه‌ای برای نمایش ثبت نشده است.';
    const costSummary=$('checkCostSummary');costSummary.replaceChildren();
    for(const [name,group] of byCostType){const row=document.createElement('p');row.textContent=`${name}: ${number(group.count)} ردیف · برآورد ${money(group.estimate)}${group.missing?' + '+number(group.missing)+' بدون قیمت':''} · پرداخت‌شده ${money(group.spent)} · تعهد ${money(group.committed)}`;costSummary.appendChild(row);}
    if(!byCostType.size)costSummary.textContent='هنوز هزینه‌ای برای نمایش ثبت نشده است.';
    const candidates=materialCandidates(), materials=$('checkMaterials');materials.replaceChildren();
    let materialEstimate=0, materialMissing=0;
    for(const item of candidates){
      const cost=item.unitPrice===null?null:item.quantity*item.unitPrice+item.extra;
      if(cost===null)materialMissing++;else materialEstimate+=cost;
      const row=document.createElement('p');row.textContent=[item.name,item.stage,number(item.quantity)+' '+item.unit,cost===null?'برآورد نامشخص':'برآورد: '+money(cost),'وضعیت هزینه: '+item.status,item.source?'منبع: '+item.source:'',item.date?'تاریخ قیمت: '+item.date:''].filter(Boolean).join(' · ');materials.appendChild(row);
    }
    if(!candidates.length)materials.textContent='هیچ ردیف مصالحِ انجام‌نشده‌ای ثبت نشده است.';
    $('checkMaterialsSummary').textContent=`${number(candidates.length)} ردیف · جمع برآورد اقلام قیمت‌دار: ${money(materialEstimate)}${materialMissing?' · '+number(materialMissing)+' ردیف بدون قیمت':''}`;
    $('checkBudget').textContent=budget===null?'ثبت نشده':money(budget); $('checkEstimate').textContent=money(estimate)+(missing?' + '+number(missing)+' قلم بدون قیمت':'');
    $('checkPlanBalance').textContent=budget===null?'بودجه ثبت نشده':money(budget-estimate-reserve)+(missing?' (بدون احتساب اقلام بی‌قیمت)':'');
    $('checkSpent').textContent=money(spent); $('checkCommit').textContent=money(committed);
    $('checkBalance').textContent=budget===null?'بودجه ثبت نشده':money(budget-spent-committed-reserve);
    $('checkProgress').textContent=items.length?number(done/items.length*100)+'٪':'۰٪';
    $('checkPriceAge').textContent=`${number(stale)} قیمت بیش از ۳۰ روز پیش ثبت شده و ${number(undated)} قیمت تاریخ ندارد. تاریخ و منبع را پیش از استفاده بررسی کنید.`;
    const change=Number($('checkScenario').value);
    $('checkScenarioResult').textContent=Number.isFinite(change)&&change>=-100&&change<=1000?`برآورد سناریو: ${money(estimate+pricedBase*change/100)}${missing?' + '+number(missing)+' قلم بدون قیمت':''}`:'درصد تغییر باید بین ۱۰۰- تا ۱۰۰۰ باشد.';
    $('checkWarning').textContent=budget!==null && (spent+committed+reserve>budget || estimate+reserve>budget)?'هشدار: مجموع برآورد یا هزینه‌ها با ذخیره احتیاطی از بودجه بیشتر است.':'';
  }
  const selectProject=()=>{selected=$('checkProject').value;$('checkStageFilter').value='';resetForm();render();};
  $('checkProject').onchange=selectProject;
  $('checkSearch').oninput=render; $('checkFilter').onchange=render; $('checkStageFilter').onchange=render; $('checkCostFilter').onchange=render; $('checkSort').onchange=render; $('checkScenario').oninput=render;
  $('checkReload').onclick=refreshProjects;
  $('checkReserveSave').onclick=()=>{if(!selected)return;const v=window.budgetInputs.checkReserve.get()??0;if(!Number.isFinite(v)||v<0||v>1e15){msg('ذخیره احتیاطی معتبر نیست.');return;} if(save({...all,[selected]:{...state(),reserve:v}})){msg('ذخیره احتیاطی ثبت شد.');render();}};
  $('checkCancel').onclick=resetForm;
  $('checkForm').onsubmit=e=>{
    e.preventDefault(); if(!selected||!healthy||!$('checkForm').reportValidity())return;
    const n=id=>Number($(id).value), unitPrice=window.budgetInputs.checkUnitPrice.get();
    const item={id:editing||crypto.randomUUID(),name:$('checkName').value.trim(),stage:$('checkCustomStage').value.trim()||$('checkStage').value,priority:$('checkPriority').value||'معمولی',costType:$('checkCostType').value||costTypes[0],quantity:n('checkQuantity'),unit:$('checkUnit').value.trim(),unitPrice,extra:window.budgetInputs.checkExtra.get()??0,status:$('checkStatus').value,paid:window.budgetInputs.checkPaid.get()??0,source:$('checkSource').value.trim(),date:$('checkDate').value,assignee:$('checkAssignee').value.trim(),due:$('checkDue').value,notes:$('checkNotes').value.trim(),done:editing?(state().items.find(x=>x.id===editing)?.done||false):false};
    if(!item.name||!item.unit||!item.stage||item.stage.length>100||item.notes.length>2000||!['پایین','معمولی','بالا'].includes(item.priority)||!costTypes.includes(item.costType)||![item.quantity,item.extra,item.paid,...(unitPrice===null?[]:[unitPrice])].every(x=>Number.isFinite(x)&&x>=0&&x<=1e15)||!Number.isSafeInteger(Math.round(item.quantity*(unitPrice??0)+item.extra))){msg('مقدارها معتبر نیستند یا از محدوده قابل محاسبه بیشترند.');return;}
    const s=state(), previous=editing?s.items.find(x=>x.id===editing):null;
    if(editing&&!previous){msg('ردیف برای ویرایش پیدا نشد.');return;}
    if(previous){
      item.priceHistory=Array.isArray(previous.priceHistory)?previous.priceHistory.slice(-30):[];
      if(previous.unitPrice!==item.unitPrice||previous.unit!==item.unit||previous.source!==item.source||previous.date!==item.date){
        item.priceHistory=[...item.priceHistory,{unitPrice:previous.unitPrice,unit:previous.unit,source:previous.source||'',date:previous.date||'',changedAt:new Date().toISOString()}].slice(-30);
      }
    }
    const items=editing?s.items.map(x=>x.id===editing?item:x):[...(s.items||[]),item];
    if(save({...all,[selected]:{...s,items}})){resetForm();msg('ردیف ذخیره شد.');render();}
  };
  $('checkExport').onclick=()=>{if(!selected)return; const p=projects.find(x=>x.id===selected), payload={version:1,project:p,checklist:state(),exportedAt:new Date().toISOString()};const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='yasbuildos-checklist.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
  $('checkPrint').onclick=()=>{
    if(!selected)return;
    const project=projects.find(p=>p.id===selected), current=state(), report=$('printReport');
    report.replaceChildren();
    const add=(parent,tag,text)=>{const element=document.createElement(tag);element.textContent=text;parent.appendChild(element);return element;};
    add(report,'h1','گزارش چک‌لیست و بودجه پروژه');
    add(report,'p',`پروژه: ${project.name} · ${project.city||'شهر ثبت نشده'} · تاریخ تهیه: ${new Date().toLocaleDateString('fa-IR')}`);
    add(report,'p',`بودجه: ${$('checkBudget').textContent} | برآورد: ${$('checkEstimate').textContent} | پرداخت: ${$('checkSpent').textContent} | تعهد: ${$('checkCommit').textContent}`);
    add(report,'p',`ذخیره احتیاطی: ${money(Number(current.reserve)||0)} | مانده پس از تعهد و ذخیره: ${$('checkBalance').textContent} | مانده برنامه‌ریزی: ${$('checkPlanBalance').textContent} | پیشرفت: ${$('checkProgress').textContent}`);
    add(report,'p','قیمت‌ها به‌صورت دستی ثبت شده‌اند. گزارش شامل همه ردیف‌هاست و به فیلتر صفحه محدود نیست.');
    for(const item of current.items){
      const article=document.createElement('article');article.className='print-item';report.appendChild(article);
      const cost=item.unitPrice===null?'نامشخص':money(item.quantity*item.unitPrice+item.extra);
      add(article,'h2',item.name);
      add(article,'p',`${item.stage} | ${number(item.quantity)} ${item.unit} | قیمت واحد: ${item.unitPrice===null?'نامشخص':money(item.unitPrice)} | برآورد: ${cost}`);
      add(article,'p',`${item.status}${item.status==='برآورد'?'':': '+money(item.paid)} | ${item.done?'انجام‌شده':'انجام‌نشده'} | نوع هزینه: ${item.costType||costTypes[0]} | اولویت: ${item.priority||'معمولی'}${item.assignee?' | مسئول: '+item.assignee:''}${item.due?' | موعد: '+item.due:''}`);
      if(item.source||item.date)add(article,'p',`منبع: ${item.source||'ثبت نشده'} | تاریخ قیمت: ${item.date||'ثبت نشده'}`);
      if(item.notes)add(article,'p','توضیحات: '+item.notes);
    }
    if(!current.items.length)add(report,'p','هنوز ردیفی ثبت نشده است.');
    add(report,'h2','خلاصه هزینه‌ها به تفکیک مرحله');
    const stageRows=Array.from($('checkStages').children);if(stageRows.length)for(const row of stageRows)add(report,'p',row.textContent);else add(report,'p',$('checkStages').textContent);
    add(report,'h2','خلاصه هزینه‌ها به تفکیک نوع');
    const typeRows=Array.from($('checkCostSummary').children);if(typeRows.length)for(const row of typeRows)add(report,'p',row.textContent);else add(report,'p',$('checkCostSummary').textContent);
    add(report,'p',$('checkPriceAge').textContent);
    if($('checkWarning').textContent)add(report,'p',$('checkWarning').textContent);
    window.print();
  };
  $('checkImport').addEventListener('change',async event=>{
    const input=event.currentTarget, file=input.files?.[0], projectId=selected;
    if(!file||!projectId)return;
    try {
      if(file.size>5*1024*1024)throw Error('too large');
      const backup=JSON.parse(await file.text()), saved=backup?.checklist;
      const num=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=1e15;
      const str=(s,max)=>typeof s==='string'&&s.length<=max;
      const valid=i=>i&&typeof i==='object'&&str(i.id,100)&&i.id.length>0&&str(i.name,100)&&i.name.trim()&&str(i.stage,100)&&i.stage.trim()&&num(i.quantity)&&str(i.unit,30)&&i.unit.trim()&&(i.unitPrice===null||num(i.unitPrice))&&num(i.extra)&&num(i.paid)&&['برآورد','متعهدشده','پرداخت‌شده'].includes(i.status)&&str(i.source,200)&&str(i.date,10)&&(i.assignee===undefined||str(i.assignee,100))&&(i.due===undefined||str(i.due,10)&&(!i.due||/^\d{4}-\d{2}-\d{2}$/.test(i.due)))&&typeof i.done==='boolean'&&Number.isSafeInteger(Math.round(i.quantity*(i.unitPrice??0)+i.extra));
      const validHistory=h=>Array.isArray(h)&&h.length<=30&&h.every(p=>p&&typeof p==='object'&&(p.unitPrice===null||num(p.unitPrice))&&str(p.unit,30)&&p.unit.trim()&&str(p.source,200)&&str(p.date,10)&&str(p.changedAt,40)&&Number.isFinite(Date.parse(p.changedAt)));
      if(backup?.version!==1||!saved||!num(saved.reserve)||!Array.isArray(saved.items)||saved.items.length>10000||!saved.items.every(i=>valid(i)&&(i.notes===undefined||str(i.notes,2000))&&(i.priority===undefined||['پایین','معمولی','بالا'].includes(i.priority))&&(i.costType===undefined||costTypes.includes(i.costType))&&(i.priceHistory===undefined||validHistory(i.priceHistory)))||new Set(saved.items.map(i=>i.id)).size!==saved.items.length)throw Error('invalid');
      if(selected!==projectId){msg('پروژه انتخابی عوض شد؛ دوباره فایل را انتخاب کنید.');return;}
      const current=state(), ids=new Set(current.items.map(i=>i.id)), added=saved.items.filter(i=>!ids.has(i.id));
      if(current.items.length+added.length>10000)throw Error('too many');
      if(!confirm(`${added.length.toLocaleString('fa-IR')} ردیف تازه به پروژه انتخابی اضافه شود؟ ردیف‌های تکراری و ذخیره احتیاطی فعلی تغییر نمی‌کنند.`))return;
      if(save({...all,[projectId]:{...current,items:[...current.items,...added]}})){resetForm();render();msg(`${added.length.toLocaleString('fa-IR')} ردیف بازیابی شد؛ ردیف‌های تکراری و ذخیره احتیاطی فعلی تغییر نکردند.`);}
    } catch (_) {msg('فایل چک‌لیست معتبر نیست یا بیش از ۵ مگابایت است؛ اطلاعات قبلی تغییر نکرد.');}
    finally {input.value='';}
  });
  $('checkTemplate').onclick=()=>{
    if(!selected)return;
    const current=state();
    if(current.items.length&&!confirm('مراحل نمونه به ردیف‌های فعلی اضافه شوند؟'))return;
    const items=stages.map(stage=>({id:crypto.randomUUID(),name:stage,stage,quantity:1,unit:'مرحله',unitPrice:null,extra:0,status:'برآورد',paid:0,source:'',date:'',done:false}));
    if(save({...all,[selected]:{...current,items:[...current.items,...items]}})){msg('مراحل نمونه اضافه شدند؛ مقادیر و قیمت‌ها را متناسب با پروژه ویرایش کنید.');render();}
  };
  $('checkCsv').onclick=()=>{
    if(!selected)return;
    const cell=value=>{let text=String(value??'');if(/^[\s\t\r\n]*[=+@-]/.test(text))text="'"+text;return '"'+text.replace(/"/g,'""')+'"';};
    const rows=[['فعالیت','مرحله','مقدار','واحد','قیمت واحد تومان','هزینه اضافی تومان','برآورد تومان','وضعیت هزینه','پرداخت یا تعهد تومان','انجام شده','منبع','تاریخ قیمت','مسئول','موعد','اولویت','نوع هزینه','توضیحات']];
    for(const item of state().items)rows.push([item.name,item.stage,item.quantity,item.unit,item.unitPrice,item.extra,item.unitPrice===null?'':item.quantity*item.unitPrice+item.extra,item.status,item.paid,item.done?'بله':'خیر',item.source,item.date,item.assignee||'',item.due||'',item.priority||'معمولی',item.costType||costTypes[0],item.notes||'']);
    const blob=new Blob(['\uFEFF'+rows.map(row=>row.map(cell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'});
    const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='yasbuildos-checklist.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);msg('گزارش CSV ساخته شد.');
  };
  $('checkMaterialsCsv').onclick=()=>{
    if(!selected)return;
    const cell=value=>{let text=String(value??'');if(/^[\s\t\r\n]*[=+@-]/.test(text))text="'"+text;return '"'+text.replace(/"/g,'""')+'"';};
    const rows=[['مصالح فعالیت انجام‌نشده','مرحله','مقدار','واحد','قیمت واحد تومان','هزینه اضافی تومان','برآورد تومان','وضعیت هزینه','منبع','تاریخ قیمت','مسئول','موعد']];
    for(const item of materialCandidates())rows.push([item.name,item.stage,item.quantity,item.unit,item.unitPrice,item.extra,item.unitPrice===null?'':item.quantity*item.unitPrice+item.extra,item.status,item.source,item.date,item.assignee||'',item.due||'']);
    const blob=new Blob(['\uFEFF'+rows.map(row=>row.map(cell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'});
    const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='yasbuildos-open-materials.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);msg('فهرست مصالح فعالیت‌های باز دانلود شد.');
  };
  for(const s of stages){const o=document.createElement('option');o.textContent=s;$('checkStage').appendChild(o);}
  document.querySelector('[data-tab="checklist"]').addEventListener('click',refreshProjects);
  window.yasbuildosOpenChecklist=id=>{
    refreshProjects();
    if(!healthy||!projects.some(project=>project.id===id))return false;
    document.querySelector('[data-tab="checklist"]').click();
    $('checkSearch').value='';$('checkFilter').value='all';$('checkCostFilter').value='';
    $('checkProject').value=id;selectProject();
    return true;
  };
  refreshProjects();
})();
