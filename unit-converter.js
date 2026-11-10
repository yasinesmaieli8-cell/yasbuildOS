const unitGroups = {
  'طول': {base:'متر', nonnegative:true, units:{'میلی‌متر (mm)':0.001,'سانتی‌متر (cm)':0.01,'متر (m)':1,'اینچ بین‌المللی (in)':0.0254,'فوت بین‌المللی (ft)':0.3048}},
  'مساحت': {base:'مترمربع', nonnegative:true, units:{'میلی‌مترمربع (mm²)':1e-6,'سانتی‌مترمربع (cm²)':1e-4,'مترمربع (m²)':1,'فوت مربع (ft²)':0.3048**2}},
  'حجم': {base:'مترمکعب', nonnegative:true, units:{'لیتر (L)':0.001,'مترمکعب (m³)':1,'فوت مکعب (ft³)':0.3048**3}},
  'جرم': {base:'کیلوگرم', nonnegative:true, units:{'گرم (g)':0.001,'کیلوگرم (kg)':1,'تن متریک (t)':1000,'پوند جرم (lb)':0.45359237}},
  'نیرو': {base:'نیوتن', units:{'نیوتن (N)':1,'کیلونیوتن (kN)':1000,'کیلوگرم‌نیرو (kgf)':9.80665,'پوند نیرو (lbf)':4.4482216152605}},
  'فشار و تنش': {base:'پاسکال', units:{'پاسکال (Pa)':1,'کیلوپاسکال (kPa)':1000,'مگاپاسکال (MPa)':1e6,'نیوتن بر میلی‌مترمربع (N/mm²)':1e6,'کیلوگرم‌نیرو بر سانتی‌مترمربع (kgf/cm²)':98066.5,'پوند نیرو بر اینچ مربع (psi)':4.4482216152605/0.0254**2}},
  'لنگر و گشتاور': {base:'نیوتن‌متر', units:{'نیوتن‌متر (N·m)':1,'کیلونیوتن‌متر (kN·m)':1000,'کیلوگرم‌نیرو متر (kgf·m)':9.80665}},
  'بار خطی': {base:'نیوتن بر متر', units:{'نیوتن بر متر (N/m)':1,'کیلونیوتن بر متر (kN/m)':1000,'کیلوگرم‌نیرو بر متر (kgf/m)':9.80665}}
};

function convertUnit(group, from, to, value){
  const data=unitGroups[group];
  if(!data || !Object.hasOwn(data.units,from) || !Object.hasOwn(data.units,to) || !Number.isFinite(value) || (data.nonnegative && value<0)) throw new Error('ورودی یا واحد نامعتبر است.');
  const result=value*(data.units[from]/data.units[to]);
  if(!Number.isFinite(result)) throw new Error('عدد برای محاسبه بیش از حد بزرگ است.');
  if(value!==0 && result===0) throw new Error('عدد برای نمایش دقیق بیش از حد کوچک است.');
  return result;
}

function openUnitConverter(){
  const back=$('toolRunner'), fields=$('runnerFields');
  fields.oninput=null;
  $('runnerTitle').textContent='تبدیل واحدهای مهندسی';
  $('runnerSub').textContent='کمیت، واحد مبدأ و مقصد را انتخاب کنید.';
  $('runnerStatus').textContent='تبدیل واحد';
  fields.innerHTML='<div class="rf"><label for="unitGroup">کمیت</label><select id="unitGroup"></select></div><div class="rf"><label for="unitValue">مقدار ورودی</label><input id="unitValue" type="number" step="any" value="1"></div><div class="rf"><label for="unitFrom">واحد مبدأ</label><select id="unitFrom"></select></div><div class="rf"><label for="unitTo">واحد مقصد</label><select id="unitTo"></select></div>';
  $('runnerNote').textContent='مبدأ و مقصد باید از یک کمیت باشند. فوت و اینچ از نوع بین‌المللی‌اند. جرم و نیرو یکسان نیستند؛ برای کیلوگرم‌نیرو شتاب گرانش استاندارد به کار رفته است. مقادیر نمایش‌داده‌شده برای خوانایی گرد می‌شوند. منبع ضرایب: راهنمای NIST SP 811، پیوست B.';
  $('runnerExample').style.display='none';
  showToolDiagram($('runnerSvg'),'تبدیل واحدهای مهندسی');
  document.querySelector('.runner-actions').style.display='flex';
  const group=$('unitGroup'), from=$('unitFrom'), to=$('unitTo'), input=$('unitValue');
  group.innerHTML=Object.keys(unitGroups).map(name=>`<option>${name}</option>`).join('');
  let last=null;
  function update(){
    last=null; window.ybCurrentResult=null;
    if(input.value==='' || !input.validity.valid){$('runnerCards').textContent='مقدار معتبر وارد کنید.';return}
    try{
      const value=Number(input.value);
      if(value===0 && /[1-9]/.test(input.value.split(/[eE]/)[0])) throw new Error('عدد ورودی برای محاسبه دقیق بیش از حد کوچک است.');
      const result=convertUnit(group.value,from.value,to.value,value),factor=convertUnit(group.value,from.value,to.value,1);
      const number=new Intl.NumberFormat('fa-IR',{maximumSignificantDigits:10});
      last={کمیت:group.value,مقدار:value,مبدأ:from.value,مقصد:to.value,نتیجه:result,ضریب:factor,مبنا:unitGroups[group.value].base,منبع:'NIST SP 811 Appendix B'};
      window.ybCurrentResult={tool:'تبدیل واحدهای مهندسی',inputs:{کمیت:group.value,مقدار:value,مبدأ:from.value,مقصد:to.value},outputs:{نتیجه:result,ضریب:factor,مبنا:unitGroups[group.value].base}};
      $('runnerCards').innerHTML=`<div class="result-card"><small>نتیجه (${to.value})</small><b>${number.format(result)}</b></div><div class="result-card"><small>ضریب تبدیل مبدأ به مقصد</small><b>${number.format(factor)}</b></div>`;
    }catch(error){$('runnerCards').textContent=error.message}
  }
  function setUnits(){const data=unitGroups[group.value],names=Object.keys(data.units);from.innerHTML=to.innerHTML=names.map(name=>`<option>${name}</option>`).join('');to.selectedIndex=Math.min(1,names.length-1);input.min=data.nonnegative?'0':'';update()}
  function download(format){if(!last){$('runnerCards').textContent='ابتدا مقدار معتبری وارد کنید.';return}const data=format==='json'?JSON.stringify(last,null,2):'\ufeff'+Object.entries(last).map(row=>row.map(x=>'"'+String(x).replaceAll('"','""')+'"').join(',')).join('\r\n');const url=URL.createObjectURL(new Blob([data],{type:format==='json'?'application/json;charset=utf-8':'text/csv;charset=utf-8'})),link=document.createElement('a');link.href=url;link.download='yasbuildos-unit-conversion.'+format;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
  group.onchange=setUnits;from.onchange=to.onchange=input.oninput=update;
  $('exportCsv').onclick=()=>download('csv');$('exportJson').onclick=()=>download('json');setUnits();
  back.classList.add('open');document.body.style.overflow='hidden';
  $('runnerClose').onclick=()=>{back.classList.remove('open');document.body.style.overflow=''};
  back.onclick=event=>{if(event.target===back)$('runnerClose').click()};
  document.onkeydown=event=>{if(event.key==='Escape'&&back.classList.contains('open'))$('runnerClose').click()};
  $('runnerClose').focus();
}
