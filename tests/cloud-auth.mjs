import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const elements={};
function element(){return {value:'',type:'',textContent:'',hidden:false,disabled:false,validity:{valid:true},handlers:{},style:{},addEventListener(name,fn){this.handlers[name]=fn},setAttribute(){},focus(){},reset(){},replaceChildren(){},appendChild(){},querySelector(){return element()}};}
const el=id=>elements[id] ||=element();
const document={getElementById:el,createElement:element,querySelector:()=>element()};
let calls=[],resolveSignup;
const client={auth:{onAuthStateChange(){},signUp(payload){calls.push(['signup',payload]);return new Promise(resolve=>{resolveSignup=resolve})},async signInWithPassword(payload){calls.push(['login',payload]);return {data:{},error:null}},async resetPasswordForEmail(email,options){calls.push(['reset',email,options]);return {data:{},error:null}}}};
const window={supabase:{createClient:()=>client},budgetInputs:{}};
vm.runInNewContext(await readFile('cloud.js','utf8'),{document,window,location:{origin:'https://example.com',pathname:'/app/'},queueMicrotask,confirm:()=>true,console});
el('cloudConfirmField').hidden=true;el('cloudPassword').type='password';
el('cloudEmail').value='test@example.com';el('cloudPassword').value='abcdefgh';
await el('cloudSignup').handlers.click();assert.equal(el('cloudConfirmField').hidden,false);assert.equal(calls.length,0);
el('cloudPasswordConfirm').value='different';await el('cloudSignup').handlers.click();assert.equal(calls.length,0);assert.ok(el('cloudMessage').textContent.includes('یکسان نیست'));
el('cloudPasswordToggle').handlers.click();assert.equal(el('cloudPassword').type,'text');assert.equal(el('cloudPasswordConfirm').type,'text');el('cloudPasswordToggle').handlers.click();assert.equal(el('cloudPassword').type,'password');
el('cloudPasswordConfirm').value='abcdefgh';const pending=el('cloudSignup').handlers.click();assert.equal(calls.length,1);assert.equal(el('cloudActions').disabled,true);await el('cloudLogin').handlers.click();assert.equal(calls.length,1);
resolveSignup({data:{session:null},error:null});await pending;assert.equal(el('cloudActions').disabled,false);assert.equal(el('cloudPassword').value,'');assert.equal(el('cloudPasswordConfirm').value,'');assert.equal(el('cloudConfirmField').hidden,true);
el('cloudPassword').value='short';await el('cloudLogin').handlers.click();assert.equal(calls.at(-1)[0],'login');assert.equal(calls.at(-1)[1].password,'short');
el('cloudPassword').value='';await el('cloudReset').handlers.click();assert.equal(calls.at(-1)[0],'reset');assert.equal(calls.at(-1)[2].redirectTo,'https://example.com/app/');
el('cloudEmail').validity.valid=false;const count=calls.length;await el('cloudReset').handlers.click();assert.equal(calls.length,count);assert.ok(el('cloudMessage').textContent.includes('ایمیل معتبر'));
console.log('PASS signup confirmation, login, recovery, visibility and concurrent request protection');
