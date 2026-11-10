import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const elements={};
function element(id){return elements[id] ||= {value:'',textContent:'',disabled:false,children:[],handlers:{},addEventListener(name,fn){this.handlers[name]=fn},replaceChildren(){this.children=[];this.value=''},appendChild(child){this.children.push(child)}};}
const document={getElementById:element,createElement:()=>({value:'',textContent:''})},listeners=[];
let resolveProjects,resolveSave,rejectSave,loadCalls=0,saveCalls=[];
const window={ybCurrentResult:{tool:'example'},ybStairResult:null,addEventListener(name,fn){if(name==='yasbuildos-auth-changed')listeners.push(fn)},yasCloud:{projects(){loadCalls++;return new Promise(resolve=>{resolveProjects=resolve})},saveCalculation(project,record){saveCalls.push({project,record});return new Promise((resolve,reject)=>{resolveSave=resolve;rejectSave=reject})}}};
vm.runInNewContext(await readFile('cloud-calculations.js','utf8'),{document,window});
let loading=element('runnerCloudLoad').handlers.click();assert.equal(element('runnerCloudLoad').disabled,true);await element('runnerCloudLoad').handlers.click();assert.equal(loadCalls,1);
const oldResolve=resolveProjects;listeners.forEach(fn=>fn());const newer=element('runnerCloudLoad').handlers.click();oldResolve([{id:'old',name:'قدیمی'}]);await loading;assert.equal(element('runnerCloudProject').children.length,0);assert.equal(element('runnerCloudMessage').textContent,'');assert.equal(element('runnerCloudLoad').disabled,true);
resolveProjects([{id:'one',name:'یک'}]);await newer;assert.equal(element('runnerCloudProject').children[1].value,'one');assert.equal(element('runnerCloudLoad').disabled,false);
element('runnerCloudProject').value='one';let saving=element('runnerCloudSave').handlers.click();await element('runnerCloudSave').handlers.click();assert.equal(saveCalls.length,1);
element('runnerCloudProject').value='two';resolveSave();await saving;assert.ok(element('runnerCloudMessage').textContent.includes('انتخاب فعلی تغییر کرده'));
element('runnerCloudProject').value='one';saving=element('runnerCloudSave').handlers.click();listeners.forEach(fn=>fn());resolveSave();await saving;assert.equal(element('runnerCloudMessage').textContent,'');
element('runnerCloudProject').value='one';saving=element('runnerCloudSave').handlers.click();rejectSave(Error('network'));await saving;assert.ok(element('runnerCloudMessage').textContent.includes('پیش از تلاش دوباره'));
element('stairCloudProject').value='one';await element('stairCloudSave').handlers.click();assert.ok(element('stairCloudMessage').textContent.includes('ورودی‌های معتبر'));
console.log('PASS stale cloud calculation requests, changed project and uncertain save response');
