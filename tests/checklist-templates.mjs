import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source=await readFile('checklist.js','utf8');
function element(){return {children:[],value:'',textContent:'',hidden:false,selectionStart:0,form:null,handlers:{},appendChild(x){this.children.push(x)},append(...xs){this.children.push(...xs)},replaceChildren(){this.children=[]},set onclick(f){this.handlers.click=f},set onchange(f){this.handlers.change=f},set onsubmit(f){this.handlers.submit=f},addEventListener(k,f){this.handlers[k]=f},setCustomValidity(){},setSelectionRange(){},reset(){},focus(){},click(){this.handlers.click?.()},reportValidity(){return true}}}
const els={}; const el=id=>els[id] ||= element(); const nav=element(); const project={id:'p1',name:'پروژه',budget:100000000};
const store={'yasbuildos.projects.v1':JSON.stringify([project])};
const localStorage={getItem:k=>store[k]??null,setItem:(k,v)=>{store[k]=v}};
const document={getElementById:el,createElement:element,querySelector:()=>nav};
let exported; const fakeURL={createObjectURL(blob){exported=blob;return 'blob:test'},revokeObjectURL(){}};
let printed=false;
const window={handlers:{},addEventListener(k,fn){this.handlers[k]=fn},print(){printed=true}};
vm.runInNewContext(await readFile('budget-input.js','utf8'),{document,window,queueMicrotask});
vm.runInNewContext(await readFile('checklist-templates.js','utf8'),{window});
vm.runInNewContext(source,{document,localStorage,Intl,crypto:{randomUUID:(()=>{let id=0;return ()=>`id-${++id}`})()},confirm:()=>true,console,URL:fakeURL,Blob,setTimeout,window});
el('checkProject').value='p1';el('checkProject').handlers.change();
for (const [choice,expected] of [['construction',19],['villa',17],['renovation',14]]) {
  const before=JSON.parse(store['yasbuildos.checklist.v1']||'{}').p1?.items||[];
  el('checkTemplateType').value=choice;el('checkTemplate').handlers.click();
  const after=JSON.parse(store['yasbuildos.checklist.v1']).p1.items;
  assert.equal(after.length,before.length+expected);
  assert.ok(after.slice(before.length).every(i=>i.quantity===1&&i.unit==='فعالیت'&&i.unitPrice===null&&i.paid===0&&!i.done));
  assert.equal(new Set(after.map(i=>i.id)).size,after.length);
}
const before=store['yasbuildos.checklist.v1'];el('checkTemplateType').value='unknown';el('checkTemplate').handlers.click();assert.equal(store['yasbuildos.checklist.v1'],before);
console.log('checklist templates passed');
