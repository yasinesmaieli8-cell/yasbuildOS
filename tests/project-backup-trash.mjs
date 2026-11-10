import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const key='yasbuildos.projects.v1',trashKey='yasbuildos.projects.trash.v1';
const project={id:'p',name:'پروژه',city:'تهران',type:'مسکونی',status:'در حال اجرا',area:100,budget:1000,createdAt:'2026-11-01T00:00:00Z',updatedAt:'2026-11-01T00:00:00Z'};
let store={},reads=0,changeDuringRead=false;
const localStorage={getItem(k){if(k===key&&changeDuringRead&&++reads===2)store[key]=JSON.stringify([{...project,id:'other'}]);return store[k]??null},setItem(k,v){store[k]=v}};
const els={},el=id=>els[id] ||= {handlers:{},addEventListener(k,fn){this.handlers[k]=fn}};
const document={getElementById:el};const window={dispatchEvent(){}};class Event{};
vm.runInNewContext(await readFile('project-backup.js','utf8'),{document,localStorage,window,Event,Intl,Set,Date,JSON,Number});
async function restore(){const text=JSON.stringify({format:'yasbuildos-projects',version:1,projects:[project]});el('projectBackupFile').files=[{size:text.length,text:async()=>text}];await el('projectBackupFile').handlers.change();}
store={[trashKey]:JSON.stringify([{project,deletedAt:'2026-11-10T00:00:00Z'}])};await restore();assert.deepEqual(JSON.parse(store[key]),[]);assert.equal(JSON.parse(store[trashKey])[0].project.id,'p');
store={[trashKey]:'invalid'};await restore();assert.equal(store[key],undefined);
store={};changeDuringRead=true;reads=0;await restore();assert.equal(JSON.parse(store[key])[0].id,'other');assert.ok(el('projectBackupMessage').textContent.includes('زبانه دیگری'));
store={};changeDuringRead=false;await restore();assert.equal(JSON.parse(store[key])[0].id,'p');
console.log('PASS project-only backups protect deleted projects and concurrent edits');
