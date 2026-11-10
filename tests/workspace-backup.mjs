import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const projectKey='yasbuildos.projects.v1',checkKey='yasbuildos.checklist.v1',trashKey='yasbuildos.projects.trash.v1';
const project={id:'project-1',name:'ساختمان',city:'تهران',type:'مسکونی',status:'در حال اجرا',area:100,budget:1000000,createdAt:'2026-11-01T00:00:00Z',updatedAt:'2026-11-01T00:00:00Z'};
const item={id:'item-1',name:'سیمان',stage:'پی',quantity:10,purchased:4,unit:'کیسه',unitPrice:500,extra:0,paid:0,status:'برآورد',source:'فروشنده',date:'2026-11-01',notes:'حمل با کامیون',dependencyId:'predecessor',done:false,costType:'مصالح',offers:[{source:'فروشنده الف',price:450,date:'2026-11-01',unit:'کیسه',note:'تهران'}],priceHistory:[{unitPrice:400,unit:'کیسه',source:'',date:'',changedAt:'2026-11-01T00:00:00Z'}]};
let store={[projectKey]:JSON.stringify([project]),[checkKey]:JSON.stringify({'project-1':{reserve:100,items:[item],stageBudgets:[{stage:'پی',amount:2000}]}})},failProject=false,blob,onConfirm=null,onCheckWrite=null;
const localStorage={getItem:k=>store[k]??null,setItem(k,v){if(k===projectKey&&failProject){failProject=false;throw Error('quota')}store[k]=v;if(k===checkKey&&onCheckWrite){const fn=onCheckWrite;onCheckWrite=null;fn()}},removeItem(k){delete store[k]}};
const elements={};const el=id=>elements[id] ||= {value:'',textContent:'',handlers:{},addEventListener(name,fn){this.handlers[name]=fn}};
const document={getElementById:el,createElement:()=>({click(){}})};
const window={dispatchEvent(){}};class Event{constructor(type){this.type=type}}
const URL={createObjectURL(b){blob=b;return 'blob:test'},revokeObjectURL(){}};
vm.runInNewContext(await readFile('workspace-backup.js','utf8'),{document,window,Event,localStorage,URL,Blob,setTimeout,confirm:()=>{if(onConfirm){const fn=onConfirm;onConfirm=null;fn()}return true},Date,JSON,Object,Array,Set,Number});

el('workspaceBackupExport').handlers.click();const backup=JSON.parse(await blob.text());
assert.equal(backup.projects[0].name,'ساختمان');assert.equal(backup.checklists['project-1'].items[0].priceHistory[0].unitPrice,400);
assert.equal(backup.checklists['project-1'].stageBudgets[0].amount,2000);
async function importBackup(data){const text=JSON.stringify(data);el('workspaceBackupFile').files=[{size:text.length,text:async()=>text}];await el('workspaceBackupFile').handlers.change();}
store={};await importBackup(backup);assert.equal(JSON.parse(store[projectKey])[0].id,'project-1');assert.equal(JSON.parse(store[checkKey])['project-1'].items[0].name,'سیمان');assert.equal(JSON.parse(store[checkKey])['project-1'].items[0].notes,'حمل با کامیون');assert.equal(JSON.parse(store[checkKey])['project-1'].items[0].purchased,4);assert.equal(JSON.parse(store[checkKey])['project-1'].items[0].offers[0].note,'تهران');assert.equal(JSON.parse(store[checkKey])['project-1'].items[0].dependencyId,'predecessor');
assert.equal(JSON.parse(store[checkKey])['project-1'].stageBudgets[0].amount,2000);
const old=JSON.stringify(store);backup.projects[0].name='تغییر داده نشود';await importBackup(backup);assert.equal(JSON.stringify(store),old);
store={};failProject=true;await importBackup(backup);assert.equal(store[projectKey],undefined);assert.equal(store[checkKey],undefined);assert.ok(el('workspaceBackupMessage').textContent.includes('بازیابی انجام نشد'));
const bad=structuredClone(backup);bad.checklists['project-1'].items[0].unitPrice=-5;store={};await importBackup(bad);assert.equal(Object.keys(store).length,0);
const badStage=structuredClone(backup);badStage.checklists['project-1'].stageBudgets[0].amount=-1;store={};await importBackup(badStage);assert.equal(Object.keys(store).length,0);
store={[checkKey]:JSON.stringify({'project-1':{reserve:7,items:[]}})};await importBackup(backup);assert.equal(store[projectKey],JSON.stringify([]));assert.equal(JSON.parse(store[checkKey])['project-1'].reserve,7);
store={};onConfirm=()=>{store[projectKey]=JSON.stringify([{...project,id:'other'}])};await importBackup(backup);assert.equal(JSON.parse(store[projectKey])[0].id,'other');assert.equal(store[checkKey],undefined);assert.ok(el('workspaceBackupMessage').textContent.includes('زبانه دیگری'));
store={};onCheckWrite=()=>{store[checkKey]=JSON.stringify({other:{reserve:22,items:[]}})};await importBackup(backup);assert.equal(store[projectKey],undefined);assert.equal(JSON.parse(store[checkKey]).other.reserve,22);assert.ok(el('workspaceBackupMessage').textContent.includes('بازنویسی نکردیم'));
const deleted={project:{...project,id:'deleted',name:'پروژه حذف‌شده'},deletedAt:'2026-11-10T00:00:00Z'};
store={[projectKey]:JSON.stringify([project]),[trashKey]:JSON.stringify([deleted]),[checkKey]:JSON.stringify({deleted:{reserve:22,items:[item]}})};
el('workspaceBackupExport').handlers.click();const withTrash=JSON.parse(await blob.text());assert.equal(withTrash.version,2);assert.equal(withTrash.deletedProjects[0].project.id,'deleted');assert.equal(withTrash.checklists.deleted.items[0].name,'سیمان');
store={};await importBackup(withTrash);assert.equal(JSON.parse(store[trashKey])[0].project.id,'deleted');assert.equal(JSON.parse(store[checkKey]).deleted.reserve,22);assert.equal(JSON.parse(store[projectKey])[0].id,'project-1');
const beforeDuplicate=JSON.stringify(store);await importBackup(withTrash);assert.equal(JSON.stringify(store),beforeDuplicate);
store={};failProject=true;await importBackup(withTrash);assert.equal(store[trashKey],undefined);assert.equal(store[checkKey],undefined);assert.equal(store[projectKey],undefined);
store={[trashKey]:JSON.stringify([deleted]),[checkKey]:JSON.stringify({deleted:{reserve:45,items:[]}})};const activeCollision=structuredClone(withTrash);activeCollision.projects=[deleted.project];activeCollision.deletedProjects=[];await importBackup(activeCollision);assert.equal(JSON.parse(store[checkKey]).deleted.reserve,45);assert.deepEqual(JSON.parse(store[projectKey]),[]);assert.equal(JSON.parse(store[trashKey])[0].project.id,'deleted');
const v1=structuredClone(withTrash);v1.version=1;delete v1.deletedProjects;delete v1.checklists.deleted;store={};await importBackup(v1);assert.equal(JSON.parse(store[projectKey])[0].id,'project-1');
console.log('PASS complete local backup, restore, duplicate protection, invalid data and rollback');
