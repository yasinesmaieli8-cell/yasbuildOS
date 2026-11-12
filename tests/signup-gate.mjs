import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const handlers = {};
const buttons = ['auth','dashboard','tools','projects','checklist','plans','course'].map(tab => ({dataset:{tab},attrs:{},setAttribute(name,value){this.attrs[name]=value}}));
const nav = {querySelectorAll(){return buttons},addEventListener(name,handler){handlers[name]=handler},insertAdjacentElement(_position,element){this.notice=element}};
const document = {head:{appendChild(){}},body:{dataset:{}},querySelector:()=>nav,createElement:()=>({style:{},setAttribute(){},textContent:''})};
const window = {};
vm.runInNewContext(await readFile('signup-gate.js','utf8'),{document,window,location:{search:'?view=signup'},URLSearchParams});
function attempt(tab) {
  const event={target:{closest:()=>buttons.find(button=>button.dataset.tab===tab)},preventDefault(){this.blocked=true},stopImmediatePropagation(){this.stopped=true}};
  handlers.click(event); return Boolean(event.blocked && event.stopped);
}
assert.equal(document.body.dataset.signupStage,'account');
for (const tab of ['dashboard','tools','projects','checklist','plans','course']) assert.equal(attempt(tab),true,tab+' blocked before registration');
assert.equal(attempt('auth'),false);
window.yasSignupGate.setStage('plan');
assert.equal(attempt('plans'),false);
assert.equal(attempt('dashboard'),true);
window.yasSignupGate.setStage('open');
assert.equal(attempt('dashboard'),false);
assert.equal(attempt('course'),false);
console.log('PASS signup navigation gate and plan selection stages');
