import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const html=await readFile('index.html','utf8');
const start=html.indexOf('const basicTools='),end=html.indexOf('const incompleteTools=',start);
assert.ok(start>=0&&end>start);
const elements={};
function element(id){return elements[id] ||= {style:{},textContent:'',classList:{add(){},remove(){},contains(){return true}},focus(){},querySelectorAll(){return this.inputs||[]},set innerHTML(value){this._html=value;if(id==='runnerFields')this.inputs=[...value.matchAll(/<input ([^>]+)>/g)].map(([,attrs])=>({value:attrs.match(/value="([^"]*)"/)?.[1]??'',required:/\brequired\b/.test(attrs),min:Number(attrs.match(/min="([^"]+)"/)?.[1]??0),get validity(){return {valid:this.value===''?!this.required:Number.isFinite(Number(this.value))&&Number(this.value)>=this.min}}}));},get innerHTML(){return this._html}};}
const context=vm.createContext({$:element,window:{},document:{body:{style:{}},querySelector:()=>({style:{}})},Intl,toolExamples:{},showToolDiagram(){}});
vm.runInContext(html.slice(start,end),context);
vm.runInContext("openBasic('محاسبه حجم و طرح اختلاط بتن')",context);
const inputs=element('runnerFields').inputs, update=()=>element('runnerFields').oninput();
const results=()=>Object.fromEntries(context.window.ybCurrentResult.outputs.نتایج.map(x=>[x.عنوان,x.مقدار]));
inputs[3].value='0';update();assert.ok(Math.abs(results()['حجم هندسی بتن (مترمکعب)']-2.4)<1e-12);assert.equal(results()['سیمان طرح تأییدشده (کیلوگرم)'],undefined);
inputs[4].value='350';inputs[5].value='700';inputs[6].value='1050';inputs[7].value='175';update();
assert.ok(Math.abs(results()['سیمان طرح تأییدشده (کیلوگرم)']-840)<1e-10);assert.equal(results()['تعداد تقریبی کیسه سیمان (عدد)'],17);assert.equal(results()['نسبت آب مؤثر به سیمان'],0.5);
inputs[3].value='5';update();assert.ok(Math.abs(results()['حجم با پرت (مترمکعب)']-2.52)<1e-12);assert.ok(Math.abs(results()['سیمان طرح تأییدشده (کیلوگرم)']-882)<1e-10);assert.equal(results()['تعداد تقریبی کیسه سیمان (عدد)'],18);
inputs[5].value='';update();assert.equal(context.window.ybCurrentResult,null);assert.ok(element('runnerCards').textContent.includes('هر چهار'));
inputs[5].value='700';inputs[3].value='101';update();assert.equal(context.window.ybCurrentResult,null);
inputs[3].value='0';inputs[0].value='0';update();assert.equal(context.window.ybCurrentResult,null);
inputs[0].value='1e308';inputs[1].value='1e308';update();assert.equal(context.window.ybCurrentResult,null);assert.ok(element('runnerCards').textContent.includes('قابل محاسبه نیست'));
console.log('PASS concrete volume, optional approved mix, waste and invalid inputs');
