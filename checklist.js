(() => {
  'use strict';
  const $ = id => document.getElementById(id), key = 'yasbuildos.checklist.v1', projectKey = 'yasbuildos.projects.v1';
  const number = n => new Intl.NumberFormat('fa-IR', {maximumFractionDigits: 2}).format(n);
  const money = n => number(n) + ' تومان';
  const stages = ['آماده‌سازی و مجوزها','خاک‌برداری','پی و فونداسیون','اسکلت و سقف','دیوارچینی','تأسیسات','نازک‌کاری','نما و محوطه','تحویل'];
  const costTypes = ['دسته‌بندی نشده','مصالح','دستمزد','حمل','تجهیزات','سایر هزینه‌ها'];
  let all = {}, projects = [], selected = '', editing = null, editOriginal = null, healthy = true, reserveProject = null, lastRaw = null, openOffers = null, deletedItem = null;
  const msg = text => { $('checkMessage').textContent = text; };
  function read() {
    try {
      const raw = localStorage.getItem(key), saved = raw ? JSON.parse(raw) : {};
      if (!saved || typeof saved !== 'object' || Array.isArray(saved)) throw Error('invalid');
      const list = JSON.parse(localStorage.getItem(projectKey) || '[]');
      if (!Array.isArray(list)) throw Error('invalid');
      all = saved; lastRaw = raw; healthy = true;
      projects = list.filter(p => p && typeof p.id === 'string' && typeof p.name === 'string');
    } catch (_) { healthy = false; msg('داده‌ها خوانده نشدند؛ برای جلوگیری از بازنویسی، ثبت اطلاعات غیرفعال است.'); }
  }
  function save(next) {
    try {
      if(!healthy){msg('داده‌ها خوانده نشدند؛ ابتدا مشکل دسترسی را برطرف و فهرست را به‌روزرسانی کنید.');return false;}
      if(localStorage.getItem(key)!==lastRaw){msg('چک‌لیست در زبانه دیگری تغییر کرده است. برای جلوگیری از بازنویسی، ابتدا روی «به‌روزرسانی پروژه‌ها» بزنید و تغییرات را بررسی کنید.');return false;}
      const raw=JSON.stringify(next);localStorage.setItem(key,raw);lastRaw=raw;all=next;return true;
    }
    catch (_) { msg('ذخیره انجام نشد؛ فضای ذخیره‌سازی مرورگر را بررسی کنید.'); return false; }
  }
  const state = () => all[selected] || {reserve:0, items:[]};
  function hasDependencyCycle(items){
    const links=new Map(items.map(item=>[item.id,item.dependencyId||''])),done=new Set();
    for(const item of items){let id=item.id;const path=new Set();while(id&&links.has(id)&&!done.has(id)){if(path.has(id))return true;path.add(id);id=links.get(id);}for(const visited of path)done.add(visited);}
    return false;
  }
  const validStageBudgets = budgets => Array.isArray(budgets) && budgets.length <= 10000 && budgets.every(b => b && typeof b.stage === 'string' && b.stage.trim() && b.stage.length <= 100 && typeof b.amount === 'number' && Number.isFinite(b.amount) && b.amount >= 0 && b.amount <= 1e15) && new Set(budgets.map(b => b.stage)).size === budgets.length && Number.isSafeInteger(Math.round(budgets.reduce((sum, b) => sum + b.amount, 0)));
  function showUndo() {
    const button = $('checkUndoDelete');
    button.hidden = !deletedItem || deletedItem.projectId !== selected;
  }
  const materialCandidates = () => (state().items||[]).filter(item=>item.costType==='مصالح'&&!item.done&&(item.purchased==null||item.purchased<item.quantity));
  function resetForm(){ editing=null; editOriginal=null; $('checkForm').reset(); $('checkDepends').value=''; $('checkSubmit').textContent='افزودن ردیف'; $('checkCancel').hidden=true; }
  function refreshProjects() {
    const previous = selected;
    read(); if (!healthy) return;
    $('checkProject').replaceChildren();
    const blank=document.createElement('option'); blank.value=''; blank.textContent='انتخاب پروژه محلی'; $('checkProject').appendChild(blank);
    for (const p of projects) { const o=document.createElement('option'); o.value=p.id; o.textContent=p.name; $('checkProject').appendChild(o); }
    selected=projects.some(p=>p.id===previous)?previous:''; $('checkProject').value=selected; reserveProject=null; render();
  }
  function render(){
    showUndo();
    const box=$('checkContent'); box.hidden=!selected; if(!selected) return;
    const project=projects.find(p=>p.id===selected), s=state(), items=Array.isArray(s.items)?s.items:[], byId=new Map(items.map(item=>[item.id,item]));
    const dependencies=$('checkDepends'), selectedDependency=dependencies.value;dependencies.replaceChildren();
    const none=document.createElement('option');none.value='';none.textContent='بدون پیش‌نیاز';dependencies.appendChild(none);
    for(const candidate of items){if(candidate.id===editing)continue;const option=document.createElement('option');option.value=candidate.id;option.textContent=candidate.name+' · '+candidate.stage;dependencies.appendChild(option);}
    if(selectedDependency&&!items.some(x=>x.id===selectedDependency)){const option=document.createElement('option');option.value=selectedDependency;option.textContent='پیش‌نیاز حذف‌شده؛ پیش از ذخیره تغییر دهید';dependencies.appendChild(option);}
    dependencies.value=selectedDependency;
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
      const prerequisite=item.dependencyId&&byId.get(item.dependencyId), blocked=!!item.dependencyId&&!item.done&&(!prerequisite||!prerequisite.done);
      if(filter==='done'&&!item.done || filter==='open'&&item.done || filter==='missing'&&item.unitPrice!==null || filter==='overdue'&&(!item.due||item.done||item.due>=localDate) || filter==='urgent'&&(item.done||item.priority!=='بالا') || filter==='blocked'&&!blocked)continue;
      shown++;
      const row=document.createElement('article'); row.className='project-item';
      const title=document.createElement('h3'); title.textContent=item.name;
      const detail=document.createElement('p'); detail.textContent=[item.stage,'نوع هزینه: '+costType,'اولویت: '+(item.priority||'معمولی'),number(item.quantity)+' '+item.unit,costType==='مصالح'?(item.purchased==null?'مقدار تهیه‌شده ثبت نشده':'تهیه‌شده: '+number(item.purchased)+' '+item.unit):'',item.unitPrice===null?'قیمت واحد نامشخص':'قیمت واحد: '+money(item.unitPrice),cost===null?'برآورد نامشخص':'برآورد: '+money(cost),item.status==='برآورد'?'بدون پرداخت ثبت‌شده':item.status+': '+money(item.paid),item.done?'انجام شده':'انجام نشده'].filter(Boolean).join(' · ');
      row.append(title,detail);
      if(item.source){ const source=document.createElement('p'); source.textContent='منبع ثبت‌شده: '+item.source+(item.date?' · '+item.date:''); row.appendChild(source); }
      if(item.assignee||item.due){const details=document.createElement('p');const today=new Date(), localDate=[today.getFullYear(),String(today.getMonth()+1).padStart(2,'0'),String(today.getDate()).padStart(2,'0')].join('-');details.textContent=[item.assignee?'مسئول: '+item.assignee:'',item.due?'موعد: '+item.due:'',item.due&&!item.done&&item.due<localDate?'موعد گذشته':''].filter(Boolean).join(' · ');row.appendChild(details);}
      if(item.notes){const notes=document.createElement('p');notes.textContent='توضیحات: '+item.notes;row.appendChild(notes);}
      if(item.dependencyId){const prerequisite=byId.get(item.dependencyId),dependency=document.createElement('p');dependency.textContent=prerequisite?'پیش‌نیاز: '+prerequisite.name+' · '+(prerequisite.done?'انجام شده':'هنوز انجام نشده'):'پیش‌نیاز یافت نشد؛ ردیف را ویرایش کنید.';row.appendChild(dependency);}
      const actions=document.createElement('div'); actions.className='project-actions';
      const toggle=document.createElement('button'); toggle.type='button'; toggle.className='btn secondary sm'; toggle.textContent=item.done?'علامت به‌عنوان انجام‌نشده':'علامت به‌عنوان انجام‌شده';
      toggle.onclick=()=>{const current=state();const prior=item.dependencyId&&current.items.find(x=>x.id===item.dependencyId);if(!item.done&&item.dependencyId&&(!prior||!prior.done)&&!confirm('پیش‌نیاز این فعالیت انجام نشده یا پیدا نشد. با این حال فعالیت انجام‌شده ثبت شود؟'))return; const next=current.items.map(x=>x.id===item.id?{...x,done:!x.done}:x); if(save({...all,[selected]:{...current,items:next}})) render();};
      const edit=document.createElement('button'); edit.type='button'; edit.className='btn secondary sm'; edit.textContent='ویرایش'; edit.onclick=()=>{editing=item.id;editOriginal=JSON.stringify(item); if(item.dependencyId&&!state().items.some(x=>x.id===item.dependencyId)){const missing=document.createElement('option');missing.value=item.dependencyId;missing.textContent='\u067e\u06cc\u0634\u200c\u0646\u06cc\u0627\u0632 \u062d\u0630\u0641\u200c\u0634\u062f\u0647';$('checkDepends').appendChild(missing);} for(const [id,val] of Object.entries({checkName:item.name,checkStage:stages.includes(item.stage)?item.stage:stages[0],checkCustomStage:stages.includes(item.stage)?'':item.stage,checkPriority:item.priority||'معمولی',checkCostType:item.costType||costTypes[0],checkQuantity:item.quantity,checkPurchased:item.purchased??'',checkUnit:item.unit,checkStatus:item.status,checkSource:item.source,checkDate:item.date,checkAssignee:item.assignee||'',checkDue:item.due||'',checkNotes:item.notes||'',checkDepends:item.dependencyId||''})) $(id).value=val; for(const [id,val] of Object.entries({checkUnitPrice:item.unitPrice,checkExtra:item.extra,checkPaid:item.paid})) window.budgetInputs[id].set(val); $('checkSubmit').textContent='ذخیره تغییرات'; $('checkCancel').hidden=false; $('checkName').focus();};
      const remove=document.createElement('button'); remove.type='button'; remove.className='btn secondary sm'; remove.textContent='حذف'; remove.onclick=()=>{const current=state(), dependents=current.items.filter(x=>x.dependencyId===item.id).length;const warning=dependents?` ${number(dependents)} ردیف به آن وابسته است و پیش‌نیازشان نامشخص می‌شود.`:'';if(!confirm('این ردیف از چک‌لیست حذف شود؟'+warning))return;const index=current.items.findIndex(x=>x.id===item.id);if(index<0)return; if(save({...all,[selected]:{...current,items:current.items.filter(x=>x.id!==item.id)}})){deletedItem={projectId:selected,item:current.items[index],index};if(editing===item.id)resetForm();render();msg('ردیف حذف شد؛ تا پیش از بستن یا تازه‌کردن صفحه می‌توانید آخرین ردیف حذف‌شده را بازگردانید.');}};
      const copy=document.createElement('button'); copy.type='button'; copy.className='btn secondary sm'; copy.textContent='کپی ردیف'; copy.onclick=()=>{const current=state();if(current.items.length>=10000){msg('تعداد ردیف‌ها به حد مجاز رسیده است.');return;}const duplicate={...item,id:crypto.randomUUID(),done:false,status:'برآورد',paid:0,purchased:null,priceHistory:[]};if(save({...all,[selected]:{...current,items:[...current.items,duplicate]}})){render();msg('کپی اضافه شد؛ پرداخت یا تعهد نسخه جدید صفر و مقدار تهیه‌شده نامشخص است.');}};
      actions.append(toggle,edit,remove,copy); row.appendChild(actions); visibleRows.push({item,row});
      const offers=Array.isArray(item.offers)?item.offers:[];
      const offerBox=document.createElement('details'), offerHeading=document.createElement('summary');
      offerBox.open=openOffers===item.id;offerBox.ontoggle=()=>{if(offerBox.open)openOffers=item.id;else if(openOffers===item.id)openOffers=null;};
      offerHeading.textContent=`مقایسه قیمت فروشندگان (${number(offers.length)} مورد)`;offerBox.appendChild(offerHeading);
      const offerNote=document.createElement('p');offerNote.textContent='قیمت‌ها دستی و برای واحد ثبت‌شده هستند؛ حمل، مالیات و شرایط فروش را جداگانه بررسی کنید.';offerBox.appendChild(offerNote);
      const comparable=offers.filter(o=>o.unit===item.unit), lowest=comparable.length?Math.min(...comparable.map(o=>o.price)):null;
      offers.forEach((offer,index)=>{
        const line=document.createElement('p');line.textContent=[offer.source,money(offer.price)+' برای '+offer.unit,offer.date||'بدون تاریخ',offer.note?'مشخصات و شرایط: '+offer.note:'',offer.unit!==item.unit?'واحد متفاوت؛ قابل مقایسه نیست':offer.price===lowest?'کمترین قیمت واحد':''].filter(Boolean).join(' · ');
        const apply=document.createElement('button');apply.type='button';apply.className='btn secondary sm';apply.textContent='استفاده از قیمت';apply.disabled=offer.unit!==item.unit;
        apply.onclick=()=>{const current=state(), existing=current.items.find(x=>x.id===item.id);if(!existing||offer.unit!==existing.unit)return;if(!Number.isSafeInteger(Math.round(existing.quantity*offer.price+existing.extra))){msg('برآورد از محدوده قابل محاسبه بیشتر است.');return;}const history=[...(existing.priceHistory||[]),{unitPrice:existing.unitPrice,unit:existing.unit,source:existing.source||'',date:existing.date||'',changedAt:new Date().toISOString()}].slice(-30);const updated={...existing,unitPrice:offer.price,source:offer.source,date:offer.date,priceHistory:history};if(save({...all,[selected]:{...current,items:current.items.map(x=>x.id===item.id?updated:x)}})){render();msg('قیمت فروشنده در برآورد ردیف اعمال شد.');}};
        const del=document.createElement('button');del.type='button';del.className='btn secondary sm';del.textContent='حذف قیمت';del.onclick=()=>{const current=state(),existing=current.items.find(x=>x.id===item.id);if(!existing)return;const updated={...existing,offers:existing.offers.filter((_,i)=>i!==index)};if(save({...all,[selected]:{...current,items:current.items.map(x=>x.id===item.id?updated:x)}})){render();msg('قیمت فروشنده حذف شد.');}};
        line.append(apply,del);offerBox.appendChild(line);
      });
      const offerForm=document.createElement('form'), sourceInput=document.createElement('input'), priceInput=document.createElement('input'), priceHint=document.createElement('p'), dateInput=document.createElement('input'), addOffer=document.createElement('button'), noteInput=document.createElement('input');
      sourceInput.placeholder='نام فروشنده یا منبع';sourceInput.maxLength=200;sourceInput.required=true;sourceInput.ariaLabel='نام فروشنده یا منبع';
      priceInput.type='text';priceInput.inputMode='decimal';priceInput.autocomplete='off';priceInput.required=true;priceInput.placeholder='قیمت واحد به تومان';priceInput.ariaLabel='قیمت واحد به تومان';priceHint.className='project-message';priceHint.ariaLive='polite';
      dateInput.type='date';dateInput.ariaLabel='تاریخ قیمت';noteInput.maxLength=200;noteInput.placeholder='شهر، برند یا شرایط فروش (اختیاری)';noteInput.ariaLabel='شهر، برند یا شرایط فروش';addOffer.type='submit';addOffer.className='btn secondary sm';addOffer.textContent='افزودن قیمت';offerForm.append(sourceInput,priceInput,dateInput,addOffer,priceHint,noteInput);
      const offerPrice=window.budgetInputs.attach(priceInput,priceHint);
      offerForm.onsubmit=e=>{e.preventDefault();const source=sourceInput.value.trim(),price=offerPrice.get(),date=dateInput.value,note=noteInput.value.trim();if(!source||source.length>200||note.length>200||price===null||!Number.isFinite(price)||price<0||price>1e15||date&&!/^\d{4}-\d{2}-\d{2}$/.test(date)){msg('نام فروشنده و قیمت معتبر را وارد کنید.');return;}const current=state(),existing=current.items.find(x=>x.id===item.id);if(!existing)return;if((existing.offers||[]).length>=20){msg('حداکثر ۲۰ قیمت برای هر ردیف قابل ثبت است.');return;}const updated={...existing,offers:[...(existing.offers||[]),{source,price,date,unit:existing.unit,note}]};if(save({...all,[selected]:{...current,items:current.items.map(x=>x.id===item.id?updated:x)}})){openOffers=item.id;render();msg('قیمت دستی فروشنده ثبت شد.');}};
      offerBox.appendChild(offerForm);row.appendChild(offerBox);
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
    const allocations=s.stageBudgets===undefined?[]:s.stageBudgets, allocationList=$('checkStageBudgetList'), stageChoice=$('checkStageBudgetStage'), selectedStage=stageChoice.value;
    allocationList.replaceChildren();stageChoice.replaceChildren();
    const choose=document.createElement('option');choose.value='';choose.textContent='انتخاب مرحله';stageChoice.appendChild(choose);
    if(validStageBudgets(allocations)){
      const stageNames=new Set([...byStage.keys(),...allocations.map(x=>x.stage)]);
      for(const stage of stageNames){const option=document.createElement('option');option.value=stage;option.textContent=stage;stageChoice.appendChild(option);}
      stageChoice.value=stageNames.has(selectedStage)?selectedStage:'';
      let allocated=0;
      for(const allocation of allocations){
        allocated+=allocation.amount;const group=byStage.get(allocation.stage)||{estimate:0,spent:0,committed:0,missing:0};
        const row=document.createElement('p');row.textContent=`${allocation.stage}: سقف ${money(allocation.amount)} · برآورد ${money(group.estimate)}${group.missing?' + '+number(group.missing)+' ردیف بدون قیمت':''} · پرداخت و تعهد ${money(group.spent+group.committed)} · مانده سقف پس از پرداخت و تعهد ${money(allocation.amount-group.spent-group.committed)}${group.estimate>allocation.amount||group.spent+group.committed>allocation.amount?' · هشدار عبور از سقف':''}`;allocationList.appendChild(row);
      }
      if(!allocations.length)allocationList.textContent='هنوز سقفی برای مراحل ثبت نشده است.';
      $('checkStageBudgetTotal').textContent=`جمع سقف مراحل: ${money(allocated)}${budget===null?' · بودجه کل ثبت نشده':` · بودجه تخصیص‌نیافته پس از ذخیره احتیاطی: ${money(budget-reserve-allocated)}${allocated+reserve>budget?' · هشدار: جمع سقف‌ها و ذخیره از بودجه بیشتر است':''}`}`;
    }else{$('checkStageBudgetTotal').textContent='سقف‌های ثبت‌شده معتبر نیستند؛ برای جلوگیری از بازنویسی، ویرایش آن‌ها غیرفعال است.';}
    const costSummary=$('checkCostSummary');costSummary.replaceChildren();
    for(const [name,group] of byCostType){const row=document.createElement('p');row.textContent=`${name}: ${number(group.count)} ردیف · برآورد ${money(group.estimate)}${group.missing?' + '+number(group.missing)+' بدون قیمت':''} · پرداخت‌شده ${money(group.spent)} · تعهد ${money(group.committed)}`;costSummary.appendChild(row);}
    if(!byCostType.size)costSummary.textContent='هنوز هزینه‌ای برای نمایش ثبت نشده است.';
    const candidates=materialCandidates(), materials=$('checkMaterials');materials.replaceChildren();
    let materialEstimate=0, materialMissing=0, quantityUnknown=0;
    for(const item of candidates){
      const remaining=item.purchased==null?null:Math.max(0,item.quantity-item.purchased), cost=remaining===null||item.unitPrice===null?null:remaining*item.unitPrice;
      if(item.unitPrice===null)materialMissing++;if(remaining===null)quantityUnknown++;if(cost!==null)materialEstimate+=cost;
      const row=document.createElement('p');row.textContent=[item.name,item.stage,'کل: '+number(item.quantity)+' '+item.unit,remaining===null?'مقدار باقی‌مانده نامشخص':'باقی‌مانده: '+number(remaining)+' '+item.unit,cost===null?'برآورد باقی‌مانده نامشخص':'برآورد باقی‌مانده: '+money(cost),'وضعیت هزینه: '+item.status,item.source?'منبع: '+item.source:'',item.date?'تاریخ قیمت: '+item.date:''].filter(Boolean).join(' · ');materials.appendChild(row);
    }
    if(!candidates.length)materials.textContent='هیچ ردیف مصالحِ انجام‌نشده‌ای ثبت نشده است.';
    $('checkMaterialsSummary').textContent=`${number(candidates.length)} ردیف · برآورد باقی‌مانده اقلام معلوم: ${money(materialEstimate)}${materialMissing?' · '+number(materialMissing)+' ردیف بدون قیمت':''}${quantityUnknown?' · '+number(quantityUnknown)+' ردیف با مقدار تهیه‌شده نامشخص':''}`;
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
  const selectProject=()=>{selected=$('checkProject').value;$('checkStageFilter').value='';$('checkStageBudgetStage').value='';window.budgetInputs.checkStageBudget.set(null);resetForm();render();};
  $('checkProject').onchange=selectProject;
  $('checkSearch').oninput=render; $('checkFilter').onchange=render; $('checkStageFilter').onchange=render; $('checkCostFilter').onchange=render; $('checkSort').onchange=render; $('checkScenario').oninput=render;
  $('checkReload').onclick=()=>{refreshProjects();if(healthy)msg('فهرست به‌روزرسانی شد؛ اگر مشغول ویرایش بودید، تغییرات ردیف را بررسی کنید.');};
  $('checkReserveSave').onclick=()=>{if(!selected)return;const v=window.budgetInputs.checkReserve.get()??0;if(!Number.isFinite(v)||v<0||v>1e15){msg('ذخیره احتیاطی معتبر نیست.');return;} if(save({...all,[selected]:{...state(),reserve:v}})){msg('ذخیره احتیاطی ثبت شد.');render();}};
  $('checkCancel').onclick=resetForm;
  $('checkStageBudgetStage').onchange=()=>{const allocations=state().stageBudgets||[],entry=Array.isArray(allocations)?allocations.find(item=>item.stage===$('checkStageBudgetStage').value):null;window.budgetInputs.checkStageBudget.set(entry?.amount??null);};
  $('checkStageBudgetSave').onclick=()=>{
    if(!selected)return;const current=state(), allocations=current.stageBudgets===undefined?[]:current.stageBudgets, stage=$('checkStageBudgetStage').value, amount=window.budgetInputs.checkStageBudget.get();
    if(!validStageBudgets(allocations)||!stage||!current.items.some(item=>item.stage===stage)&&!allocations.some(item=>item.stage===stage)||amount===null||!Number.isFinite(amount)||amount<0||amount>1e15){msg('مرحله و سقف معتبر به تومان وارد کنید.');return;}
    const next=[...allocations.filter(item=>item.stage!==stage),{stage,amount}];if(!validStageBudgets(next)){msg('مجموع سقف‌ها از محدوده قابل محاسبه بیشتر است.');return;}
    if(save({...all,[selected]:{...current,stageBudgets:next}})){render();msg('سقف مرحله ثبت شد. این مبلغ برنامه‌ریزی است و هزینه واقعی محسوب نمی‌شود.');}
  };
  $('checkStageBudgetRemove').onclick=()=>{
    if(!selected)return;const current=state(),allocations=current.stageBudgets===undefined?[]:current.stageBudgets,stage=$('checkStageBudgetStage').value;
    if(!validStageBudgets(allocations)||!allocations.some(item=>item.stage===stage)){msg('برای حذف سقف، مرحله دارای سقف را انتخاب کنید.');return;}
    if(save({...all,[selected]:{...current,stageBudgets:allocations.filter(item=>item.stage!==stage)}})){render();msg('سقف مرحله حذف شد؛ ردیف‌ها و هزینه‌های آن تغییر نکردند.');}
  };
  $('checkUndoDelete').onclick=()=>{
    if(!deletedItem||deletedItem.projectId!==selected)return;
    const current=state();
    if(current.items.some(item=>item.id===deletedItem.item.id)){msg('ردیفی با همین شناسه وجود دارد؛ بازگردانی انجام نشد.');return;}
    if(current.items.length>=10000){msg('تعداد ردیف‌ها به حد مجاز رسیده است.');return;}
    const items=[...current.items];items.splice(Math.min(deletedItem.index,items.length),0,deletedItem.item);
    if(hasDependencyCycle(items)){msg('بازگردانی باعث وابستگی دوری می‌شود؛ ابتدا پیش‌نیازهای ردیف‌های موجود را اصلاح کنید.');return;}
    if(save({...all,[selected]:{...current,items}})){deletedItem=null;render();msg('ردیف حذف‌شده با اطلاعات و وابستگی‌های قبلی بازگردانده شد.');}
  };
  $('checkForm').onsubmit=e=>{
    e.preventDefault(); if(!selected||!healthy||!$('checkForm').reportValidity())return;
    const n=id=>Number($(id).value), unitPrice=window.budgetInputs.checkUnitPrice.get();
    const item={id:editing||crypto.randomUUID(),name:$('checkName').value.trim(),stage:$('checkCustomStage').value.trim()||$('checkStage').value,priority:$('checkPriority').value||'معمولی',costType:$('checkCostType').value||costTypes[0],quantity:n('checkQuantity'),purchased:$('checkPurchased').value===''?null:n('checkPurchased'),unit:$('checkUnit').value.trim(),unitPrice,extra:window.budgetInputs.checkExtra.get()??0,status:$('checkStatus').value,paid:window.budgetInputs.checkPaid.get()??0,source:$('checkSource').value.trim(),date:$('checkDate').value,assignee:$('checkAssignee').value.trim(),due:$('checkDue').value,notes:$('checkNotes').value.trim(),done:editing?(state().items.find(x=>x.id===editing)?.done||false):false};
    if(!item.name||!item.unit||!item.stage||item.stage.length>100||item.notes.length>2000||!['پایین','معمولی','بالا'].includes(item.priority)||!costTypes.includes(item.costType)||![item.quantity,item.extra,item.paid,...(unitPrice===null?[]:[unitPrice])].every(x=>Number.isFinite(x)&&x>=0&&x<=1e15)||!Number.isSafeInteger(Math.round(item.quantity*(unitPrice??0)+item.extra))){msg('مقدارها معتبر نیستند یا از محدوده قابل محاسبه بیشترند.');return;}
    if(item.purchased!==null&&(!Number.isFinite(item.purchased)||item.purchased<0||item.purchased>item.quantity)){msg('مقدار تهیه‌شده باید بین صفر و مقدار کل باشد.');return;}
    const s=state(), previous=editing?s.items.find(x=>x.id===editing):null;
    if(editing&&!previous){msg('ردیف برای ویرایش پیدا نشد.');return;} if(previous&&JSON.stringify(previous)!==editOriginal){msg('این ردیف پس از شروع ویرایش تغییر کرده است؛ متن خود را نگه دارید، ویرایش را لغو کنید و ردیف را دوباره باز کنید.');return;}
    item.dependencyId=$('checkDepends').value;
    if(item.dependencyId){
      const seen=new Set([item.id]);let next=item.dependencyId;
      while(next){if(seen.has(next)){msg('وابستگی دوری است؛ پیش‌نیاز دیگری انتخاب کنید.');return;}seen.add(next);const prerequisite=s.items.find(x=>x.id===next);if(!prerequisite){msg('پیش‌نیاز یافت نشد؛ فعالیت دیگری انتخاب کنید.');return;}next=prerequisite.dependencyId||'';}
    }
    if(previous){
      item.offers=Array.isArray(previous.offers)?previous.offers:[];
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
      if(item.costType==='مصالح')add(article,'p',item.purchased==null?'مقدار تهیه‌شده ثبت نشده':`تهیه‌شده: ${number(item.purchased)} ${item.unit} | باقی‌مانده: ${number(item.quantity-item.purchased)} ${item.unit}`);
      add(article,'p',`${item.status}${item.status==='برآورد'?'':': '+money(item.paid)} | ${item.done?'انجام‌شده':'انجام‌نشده'} | نوع هزینه: ${item.costType||costTypes[0]} | اولویت: ${item.priority||'معمولی'}${item.assignee?' | مسئول: '+item.assignee:''}${item.due?' | موعد: '+item.due:''}`);
      if(item.source||item.date)add(article,'p',`منبع: ${item.source||'ثبت نشده'} | تاریخ قیمت: ${item.date||'ثبت نشده'}`);
      if(item.notes)add(article,'p','توضیحات: '+item.notes);
      if(item.dependencyId){const prerequisite=current.items.find(x=>x.id===item.dependencyId);add(article,'p',prerequisite?'پیش‌نیاز: '+prerequisite.name+' | '+(prerequisite.done?'انجام شده':'انجام نشده'):'پیش‌نیاز یافت نشد');}
      if(Array.isArray(item.offers)&&item.offers.length){
        add(article,'p','قیمت‌های دستی فروشندگان؛ هزینه حمل، مالیات و شرایط فروش جداگانه بررسی شود:');
        for(const offer of item.offers)add(article,'p',[offer.source,money(offer.price)+' برای '+offer.unit,offer.date?'تاریخ: '+offer.date:'بدون تاریخ',offer.note?'شرایط: '+offer.note:'',offer.unit!==item.unit?'واحد متفاوت با ردیف':''].filter(Boolean).join(' | '));
      }
    }
    if(!current.items.length)add(report,'p','هنوز ردیفی ثبت نشده است.');
    add(report,'h2','خلاصه هزینه‌ها به تفکیک مرحله');
    const stageRows=Array.from($('checkStages').children);if(stageRows.length)for(const row of stageRows)add(report,'p',row.textContent);else add(report,'p',$('checkStages').textContent);
    add(report,'h2','خلاصه هزینه‌ها به تفکیک نوع');
    const typeRows=Array.from($('checkCostSummary').children);if(typeRows.length)for(const row of typeRows)add(report,'p',row.textContent);else add(report,'p',$('checkCostSummary').textContent);
    add(report,'h2','سقف بودجه مراحل');
    add(report,'p',$('checkStageBudgetTotal').textContent);
    const allocationRows=Array.from($('checkStageBudgetList').children);if(allocationRows.length)for(const row of allocationRows)add(report,'p',row.textContent);else add(report,'p',$('checkStageBudgetList').textContent);
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
      const validOffers=offers=>Array.isArray(offers)&&offers.length<=20&&offers.every(o=>o&&typeof o==='object'&&num(o.price)&&str(o.source,200)&&o.source.trim()&&str(o.unit,30)&&o.unit.trim()&&(o.note===undefined||str(o.note,200))&&str(o.date,10)&&(!o.date||/^\d{4}-\d{2}-\d{2}$/.test(o.date)));
      if(backup?.version!==1||!saved||!num(saved.reserve)||!Array.isArray(saved.items)||saved.items.length>10000||!saved.items.every(i=>valid(i)&&(i.dependencyId===undefined||str(i.dependencyId,100))&&(i.purchased==null||num(i.purchased)&&i.purchased<=i.quantity)&&(i.notes===undefined||str(i.notes,2000))&&(i.priority===undefined||['پایین','معمولی','بالا'].includes(i.priority))&&(i.costType===undefined||costTypes.includes(i.costType))&&(i.priceHistory===undefined||validHistory(i.priceHistory))&&(i.offers===undefined||validOffers(i.offers)))||new Set(saved.items.map(i=>i.id)).size!==saved.items.length)throw Error('invalid');
      if(selected!==projectId){msg('پروژه انتخابی عوض شد؛ دوباره فایل را انتخاب کنید.');return;}
      const current=state(), ids=new Set(current.items.map(i=>i.id)), added=saved.items.filter(i=>!ids.has(i.id));
      if(current.items.length+added.length>10000)throw Error('too many');
      if(hasDependencyCycle([...current.items,...added])){msg('بازیابی انجام نشد؛ وابستگی‌های چک‌لیست به شکل دوری به یکدیگر متصل می‌شوند.');return;}
      if(!confirm(`${added.length.toLocaleString('fa-IR')} ردیف تازه به پروژه انتخابی اضافه شود؟ ردیف‌های تکراری، ذخیره احتیاطی و سقف مراحل فعلی تغییر نمی‌کنند.`))return;
      if(save({...all,[projectId]:{...current,items:[...current.items,...added]}})){resetForm();render();msg(`${added.length.toLocaleString('fa-IR')} ردیف بازیابی شد؛ ردیف‌های تکراری، ذخیره احتیاطی و سقف مراحل فعلی تغییر نکردند.`);}
    } catch (_) {msg('فایل چک‌لیست معتبر نیست یا بیش از ۵ مگابایت است؛ اطلاعات قبلی تغییر نکرد.');}
    finally {input.value='';}
  });
  $('checkTemplate').onclick=()=>{
    if(!selected)return;
    const current=state();
    const choice=$('checkTemplateType').value||'stages';
    const entries=choice==='stages'?stages.map(stage=>[stage,stage]):window.yasbuildosChecklistTemplates?.[choice];
    if(!Array.isArray(entries)){msg('الگوی انتخاب‌شده در دسترس نیست؛ صفحه را دوباره بارگذاری کنید.');return;}
    if(current.items.length+entries.length>10000){msg('تعداد ردیف‌ها از سقف ۱۰٬۰۰۰ بیشتر می‌شود؛ الگو اضافه نشد.');return;}
    if(current.items.length&&!confirm(`${number(entries.length)} ردیف نمونه به ردیف‌های فعلی اضافه شوند؟`))return;
    let items;
    try{items=entries.map(([stage,name])=>({id:crypto.randomUUID(),name,stage,quantity:1,unit:choice==='stages'?'مرحله':'فعالیت',unitPrice:null,extra:0,status:'برآورد',paid:0,source:'',date:'',done:false}));}
    catch(_){msg('ساخت شناسه ردیف‌ها ممکن نشد؛ اطلاعات تغییری نکرد.');return;}
    if(save({...all,[selected]:{...current,items:[...current.items,...items]}})){msg('الگوی نمونه اضافه شد؛ فعالیت‌ها، مقادیر و قیمت‌ها را متناسب با پروژه بررسی و ویرایش کنید.');render();}
  };
  $('checkCsv').onclick=()=>{
    if(!selected)return;
    const cell=value=>{let text=String(value??'');if(/^[\s\t\r\n]*[=+@-]/.test(text))text="'"+text;return '"'+text.replace(/"/g,'""')+'"';};
    const rows=[['فعالیت','مرحله','مقدار','واحد','قیمت واحد تومان','هزینه اضافی تومان','برآورد تومان','وضعیت هزینه','پرداخت یا تعهد تومان','انجام شده','منبع','تاریخ قیمت','مسئول','موعد','اولویت','نوع هزینه','توضیحات','مقدار تهیه‌شده','پیش‌نیاز','وضعیت پیش‌نیاز']];
    const items=state().items;
    for(const item of items){const prior=item.dependencyId&&items.find(x=>x.id===item.dependencyId);rows.push([item.name,item.stage,item.quantity,item.unit,item.unitPrice,item.extra,item.unitPrice===null?'':item.quantity*item.unitPrice+item.extra,item.status,item.paid,item.done?'بله':'خیر',item.source,item.date,item.assignee||'',item.due||'',item.priority||'معمولی',item.costType||costTypes[0],item.notes||'',item.purchased??'',prior?prior.name:item.dependencyId?'یافت نشد':'',prior?(prior.done?'انجام شده':'انجام نشده'):'']);}
    const blob=new Blob(['\uFEFF'+rows.map(row=>row.map(cell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'});
    const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='yasbuildos-checklist.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);msg('گزارش CSV ساخته شد.');
  };
  $('checkMaterialsCsv').onclick=()=>{
    if(!selected)return;
    const cell=value=>{let text=String(value??'');if(/^[\s\t\r\n]*[=+@-]/.test(text))text="'"+text;return '"'+text.replace(/"/g,'""')+'"';};
    const rows=[['مصالح فعالیت انجام‌نشده','مرحله','مقدار کل','مقدار تهیه‌شده','مقدار باقی‌مانده','واحد','قیمت واحد تومان','برآورد باقی‌مانده بدون هزینه اضافی تومان','وضعیت هزینه','منبع','تاریخ قیمت','مسئول','موعد']];
    for(const item of materialCandidates()){const remaining=item.purchased==null?null:item.quantity-item.purchased;rows.push([item.name,item.stage,item.quantity,item.purchased??'',remaining??'',item.unit,item.unitPrice,remaining===null||item.unitPrice===null?'':remaining*item.unitPrice,item.status,item.source,item.date,item.assignee||'',item.due||'']);}
    const blob=new Blob(['\uFEFF'+rows.map(row=>row.map(cell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'});
    const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='yasbuildos-open-materials.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);msg('فهرست مصالح فعالیت‌های باز دانلود شد.');
  };
  $('checkOffersCsv').onclick=()=>{
    if(!selected)return;
    const cell=value=>{let text=String(value??'');if(/^[\s\t\r\n]*[=+@-]/.test(text))text="'"+text;return '"'+text.replace(/"/g,'""')+'"';};
    const rows=[['فعالیت','مرحله','واحد ردیف','فروشنده یا منبع','قیمت واحد تومان','واحد قیمت','تاریخ قیمت','شهر، برند یا شرایط فروش','وضعیت واحد']];
    for(const item of state().items)for(const offer of item.offers||[])rows.push([item.name,item.stage,item.unit,offer.source,offer.price,offer.unit,offer.date,offer.note||'',offer.unit===item.unit?'همسان':'متفاوت']);
    const blob=new Blob(['\uFEFF'+rows.map(row=>row.map(cell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'});
    const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='yasbuildos-supplier-quotes.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);msg('فهرست قیمت‌های دستی فروشندگان دانلود شد.');
  };
  $('checkStageCsv').onclick=()=>{
    if(!selected)return;
    const current=state(),allocations=current.stageBudgets===undefined?[]:current.stageBudgets;
    if(!validStageBudgets(allocations)){msg('سقف مراحل معتبر نیست؛ گزارش ساخته نشد.');return;}
    const cell=value=>{let text=String(value??'');if(/^[\s\t\r\n]*[=+@-]/.test(text))text="'"+text;return '"'+text.replace(/"/g,'""')+'"';};
    const rows=[['مرحله','سقف تومان','برآورد اقلام قیمت‌دار تومان','تعداد اقلام بدون قیمت','پرداخت‌شده تومان','تعهد تومان','مانده سقف پس از پرداخت و تعهد تومان','وضعیت سقف']];
    const groups=new Map();
    for(const item of current.items){const group=groups.get(item.stage)||{estimate:0,missing:0,spent:0,committed:0};if(item.unitPrice===null)group.missing++;else group.estimate+=item.quantity*item.unitPrice+item.extra;if(item.status==='پرداخت‌شده')group.spent+=item.paid;if(item.status==='متعهدشده')group.committed+=item.paid;groups.set(item.stage,group);}
    for(const allocation of allocations){const group=groups.get(allocation.stage)||{estimate:0,missing:0,spent:0,committed:0};group.limit=allocation.amount;groups.set(allocation.stage,group);}
    for(const [stage,{estimate,missing,spent,committed,limit}] of groups){
      rows.push([stage,limit??'',estimate,missing,spent,committed,limit===undefined?'':limit-spent-committed,limit===undefined?'سقف ثبت نشده':estimate>limit||spent+committed>limit?'عبور از سقف':'در محدوده سقف']);
    }
    const blob=new Blob(['\uFEFF'+rows.map(row=>row.map(cell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'});
    const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='yasbuildos-stage-budgets.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);msg('گزارش بودجه مراحل ساخته شد؛ اقلام بدون قیمت در برآورد کامل لحاظ نشده‌اند.');
  };
  for(const s of stages){const o=document.createElement('option');o.textContent=s;$('checkStage').appendChild(o);}
  window.addEventListener('storage',event=>{if(event.key===key||event.key===null)msg('اطلاعات چک‌لیست در زبانه دیگری تغییر کرد. پیش از ادامه، فهرست را به‌روزرسانی کنید.');});
  document.querySelector('[data-tab="checklist"]').addEventListener('click',refreshProjects);
  window.yasbuildosOpenChecklist=(id,filter='all',stage='')=>{
    refreshProjects();
    if(!healthy||!projects.some(project=>project.id===id))return false;
    document.querySelector('[data-tab="checklist"]').click();
    $('checkSearch').value='';$('checkFilter').value=filter==='blocked'?'blocked':'all';$('checkCostFilter').value='';
    $('checkProject').value=id;selectProject();
    if(stage&&state().items.some(item=>item.stage===stage)){$('checkStageFilter').value=stage;render();}
    return true;
  };
  refreshProjects();
})();
