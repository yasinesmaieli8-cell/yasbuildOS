import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const context=vm.createContext({});
vm.runInContext(await readFile('unit-converter.js','utf8'),context);
const convert=vm.runInContext('convertUnit',context);
const cases=[
  ['طول','اینچ بین‌المللی (in)','متر (m)',12,0.3048],
  ['مساحت','فوت مربع (ft²)','مترمربع (m²)',1,0.09290304],
  ['حجم','لیتر (L)','مترمکعب (m³)',1,0.001],
  ['جرم','تن متریک (t)','کیلوگرم (kg)',1,1000],
  ['نیرو','کیلوگرم‌نیرو (kgf)','نیوتن (N)',1,9.80665],
  ['فشار و تنش','مگاپاسکال (MPa)','نیوتن بر میلی‌مترمربع (N/mm²)',1,1],
  ['لنگر و گشتاور','کیلونیوتن‌متر (kN·m)','نیوتن‌متر (N·m)',1,1000],
  ['بار خطی','کیلونیوتن بر متر (kN/m)','نیوتن بر متر (N/m)',2,2000]
];
for(const [group,from,to,value,expected] of cases){const actual=convert(group,from,to,value);assert.ok(Math.abs(actual-expected)<=Math.abs(expected)*1e-12);assert.ok(Math.abs(convert(group,to,from,actual)-value)<=Math.abs(value)*1e-12);}
assert.equal(convert('نیرو','کیلونیوتن (kN)','نیوتن (N)',-2),-2000);
assert.equal(convert('طول','متر (m)','متر (m)',Number.MAX_VALUE),Number.MAX_VALUE);
assert.equal(convert('نیرو','کیلونیوتن (kN)','کیلونیوتن (kN)',1e308),1e308);
assert.throws(()=>convert('طول','متر (m)','فوت بین‌المللی (ft)',-1));
assert.throws(()=>convert('نیرو','کیلوگرم (kg)','نیوتن (N)',1));
assert.throws(()=>convert('نیرو','نیوتن (N)','کیلونیوتن (kN)',Number.MIN_VALUE));
assert.throws(()=>convert('نیرو','کیلونیوتن (kN)','نیوتن (N)',Number.MAX_VALUE));
assert.throws(()=>convert('نیرو','نیوتن (N)','کیلونیوتن (kN)',Infinity));
const elements={};
function element(id){return elements[id] ||= {value:id==='unitValue'?'1':'',validity:{valid:true},style:{},classList:{add(){},remove(){},contains(){return true}},focus(){},set innerHTML(html){this._html=html;const options=[...html.matchAll(/<option>(.*?)<\/option>/g)].map(m=>m[1]);if(options.length){this.options=options;this.value=options[0]}},get innerHTML(){return this._html},set selectedIndex(index){this.value=this.options[index]}};}
const ui=vm.createContext({$:element,window:{},document:{body:{style:{}},querySelector:()=>({style:{}})},showToolDiagram(){},Intl});
vm.runInContext(await readFile('unit-converter.js','utf8'),ui);vm.runInContext('openUnitConverter()',ui);
const oldFrom=element('unitFrom').value,oldTo=element('unitTo').value;
element('unitValue').value='2';element('unitValue').oninput();
element('unitSwap').onclick();assert.equal(element('unitFrom').value,oldTo);assert.equal(element('unitTo').value,oldFrom);assert.equal(ui.window.ybCurrentResult.inputs.مقدار,2);assert.equal(ui.window.ybCurrentResult.outputs.نتیجه,20);
element('unitSwap').onclick();assert.equal(element('unitFrom').value,oldFrom);assert.equal(element('unitTo').value,oldTo);assert.equal(ui.window.ybCurrentResult.outputs.نتیجه,0.2);
element('unitValue').value='1e-999';element('unitValue').oninput();assert.ok(element('runnerCards').textContent.includes('بیش از حد کوچک'));
assert.equal(ui.window.ybCurrentResult,null);
console.log('PASS independent unit conversions, invalid units and floating-point boundaries');
