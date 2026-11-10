import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const projectKey='yasbuildos.projects.v1',checkKey='yasbuildos.checklist.v1';
const project={id:'project-1',name:'ساختمان',city:'تهران',type:'مسکونی',status:'در حال اجرا',area:100,budget:1000000,createdAt:'2026-11-01T00:00:00Z',updatedAt:'2026-11-01T00:00:00Z'};
const item={id:'item-1',name:'سیمان',stage:'پی',quantity:10,purchased:4,unit:'کیسه',unitPrice:500,extra:0,paid:0,status:'برآورد',source:'فروشنده',date:'2026-11-01',notes:'حمل با کامیون',dependencyId:'predecessor',done:false,costType:'مصالح',offers:[{source:'فروشنده الف',price:450,date:'2026-11-01',unit:'کیسه',note:'تهران'}],priceHistory:[{unitPrice:400,unit:'کیسه',source:'',date:'',changedAt:'2026-11-01T00:00:00Z'}]};
let store={[projectKey]:JSON.stringify([project]),[checkKey]:JSON.stringify({'project-1':{reserve:100,items:[item]}})},failProject=false,blob;
const localStorage={getItem:k=>store[k]??null,setItem(k,v){if(k===projectKey&&failProject){failProject=false;throw Error('quota')}store[k]=v},removeItem(k){delete store[k]}};
const elements={};const el=id=>elements[id] ||= {value:'',textContent:'',handlers:{},addEventListener(name,fn){this.handlers[name]=fn}};
const document={getElementById:el,createElement:()=>({click(){}})};
const window={dispatchEvent(){}};class Event{constructor(type){this.type=type}}
const URL={createObjectURL(b){blob=b;return 'blob:test'},revokeObjectURL(){}};
vm.runInNewContext(await readFile('workspace-backup.js','utf8'),{document,window,Event,localStorage,URL,Blob,setTimeout,confirm:()=>true,Date,JSON,Object,Array,Set,Number});

el('workspaceBackupExport').handlers.click();const backup=JSON.parse(await blob.text());
assert.equal(backup.projects[0].name,'ساختمان');assert.equal(backup.checklists['project-1'].items[0].priceHistory[0].unitPrice,400);
async function importBackup(data){const text=JSON.stringify(data);el('workspaceBackupFile').files=[{size:text.length,text:async()=>text}];await el('workspaceBackupFile').handlers.change();}
store={};await importBackup(backup);assert.equal(JSON.parse(store[projectKey])[0].id,'project-1');assert.equal(JSON.parse(store[checkKey])['project-1'].items[0].name,'سیمان');assert.equal(JSON.parse(store[checkKey])['project-1'].items[0].notes,'حمل با کامیون');assert.equal(JSON.parse(store[checkKey])['project-1'].items[0].purchased,4);assert.equal(JSON.parse(store[checkKey])['project-1'].items[0].offers[0].note,'تهران');assert.equal(JSON.parse(store[checkKey])['project-1'].items[0].dependencyId,'predecessor');
const old=JSON.stringify(store);backup.projects[0].name='تغییر داده نشود';await importBackup(backup);assert.equal(JSON.stringify(store),old);
store={};failProject=true;await importBackup(backup);assert.equal(store[projectKey],undefined);assert.equal(store[checkKey],undefined);assert.ok(el('workspaceBackupMessage').textContent.includes('بازیابی انجام نشد'));
const bad=structuredClone(backup);bad.checklists['project-1'].items[0].unitPrice=-5;store={};await importBackup(bad);assert.equal(Object.keys(store).length,0);
store={[checkKey]:JSON.stringify({'project-1':{reserve:7,items:[]}})};await importBackup(backup);assert.equal(store[projectKey],JSON.stringify([]));assert.equal(JSON.parse(store[checkKey])['project-1'].reserve,7);
console.log('PASS complete local backup, restore, duplicate protection, invalid data and rollback');
