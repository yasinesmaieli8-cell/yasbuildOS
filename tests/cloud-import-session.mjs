import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const elements={};function element(){return {value:'',type:'',textContent:'',hidden:false,disabled:false,validity:{valid:true},handlers:{},style:{},addEventListener(name,fn){this.handlers[name]=fn},setAttribute(){},focus(){},click(){},reset(){},replaceChildren(){},appendChild(){},querySelector(){return element()},reportValidity(){return true}};}
const el=id=>elements[id] ||=element(),document={getElementById:el,createElement:element,querySelector:()=>element()};
let authCallback,resolveDigest,insertCalls=0;
const client={auth:{onAuthStateChange(fn){authCallback=fn}},from(){const q={select(){return q},eq(){return q},insert(){insertCalls++;return Promise.resolve({error:null})},order:async()=>({data:[],error:null}),then(resolve){resolve({data:[],error:null})}};return q}};
const window={supabase:{createClient:()=>client},budgetInputs:{cloudProjectBudget:{set(){}}}};
const project={id:'11111111-1111-4111-8111-111111111111',name:'پروژه',city:'تهران',type:'مسکونی',status:'در حال اجرا',area:10,budget:100};
const localStorage={getItem:()=>JSON.stringify([project])},crypto={subtle:{digest(){return new Promise(resolve=>{resolveDigest=resolve})}}};
vm.runInNewContext(await readFile('cloud.js','utf8'),{document,window,location:{origin:'https://example.com',pathname:'/'},queueMicrotask,confirm:()=>true,localStorage,crypto,TextEncoder,Uint8Array});
const first={user:{id:'user-1',email:'one@example.com'}},second={user:{id:'user-2',email:'two@example.com'}};
authCallback('SIGNED_IN',first);await new Promise(resolve=>setImmediate(resolve));const pending=el('cloudImportLocal').handlers.click();await new Promise(resolve=>setImmediate(resolve));assert.ok(resolveDigest);await el('cloudImportLocal').handlers.click();assert.equal(insertCalls,0);
authCallback('SIGNED_IN',second);await new Promise(resolve=>setImmediate(resolve));el('cloudProjectMessage').textContent='حساب دوم';resolveDigest(new ArrayBuffer(32));await pending;assert.equal(insertCalls,0);assert.equal(el('cloudProjectMessage').textContent,'حساب دوم');assert.equal(el('cloudImportLocal').disabled,false);
authCallback('SIGNED_IN',first);await new Promise(resolve=>setImmediate(resolve));const normal=el('cloudImportLocal').handlers.click();await new Promise(resolve=>setImmediate(resolve));resolveDigest(new ArrayBuffer(32));await normal;assert.equal(insertCalls,1);assert.ok(el('cloudProjectMessage').textContent.includes('منتقل شد'));
console.log('PASS local-to-cloud import stops before insertion if account changes');
