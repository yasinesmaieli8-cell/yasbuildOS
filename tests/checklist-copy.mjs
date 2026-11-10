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

const item={stage:'پی',quantity:2,unit:'عدد',unitPrice:30,extra:0,paid:45,status:'پرداخت‌شده',source:'فروشنده',date:'2026-01-01',done:true,assignee:'علی',due:'2026-11-12',purchased:1};
store['yasbuildos.projects.v1']=JSON.stringify([{id:'p1',name:'مقصد',budget:100},{id:'p2',name:'مبدأ',budget:200}]);
store['yasbuildos.checklist.v1']=JSON.stringify({p1:{reserve:7,items:[]},p2:{reserve:25,items:[{...item,id:'old1',name:'اول'},{...item,id:'old2',name:'دوم',dependencyId:'old1'}]}});
el('checkReload').handlers.click();el('checkProject').value='p1';el('checkProject').handlers.change();el('checkCopyProject').value='p2';el('checkCopy').handlers.click();
let data=JSON.parse(store['yasbuildos.checklist.v1']);assert.equal(data.p1.reserve,7);assert.equal(data.p1.items.length,2);assert.equal(data.p1.items[1].dependencyId,data.p1.items[0].id);assert.notEqual(data.p1.items[0].id,'old1');assert.ok(data.p1.items.every(i=>i.paid===0&&i.status==='برآورد'&&!i.done&&i.purchased===null&&i.assignee===''&&i.due===''&&i.unitPrice===30));assert.equal(data.p2.items[0].paid,45);
const current=store['yasbuildos.checklist.v1'];const changed=JSON.parse(current);changed.p2.items[0].dependencyId='old2';store['yasbuildos.checklist.v1']=JSON.stringify(changed);el('checkReload').handlers.click();el('checkCopyProject').value='p2';el('checkCopy').handlers.click();assert.equal(JSON.parse(store['yasbuildos.checklist.v1']).p1.items.length,2);assert.ok(el('checkMessage').textContent.includes('معتبر نیستند'));
console.log('PASS copying project activities resets financial and progress fields and remaps dependencies');
