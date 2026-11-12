import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';

function makeElement() {
  return {children:[],dataset:{},style:{},attrs:{},handlers:{},textContent:'',
    appendChild(child){this.children.push(child)}, append(...children){this.children.push(...children)},
    prepend(child){this.children.unshift(child)}, insertBefore(child){this.children.push(child)},
    replaceChildren(...children){this.children=children}, remove(){}, focus(){},
    addEventListener(name,fn){this.handlers[name]=fn}, setAttribute(name,value){this.attrs[name]=value},
    toggleAttribute(name,enabled){if(enabled)this.attrs[name]='';else delete this.attrs[name]},
    closest(){return this.parent || null}, querySelector(){return null}};
}
async function scenario(initial) {
  const ids={}, signedOut=makeElement(), phoneSection=makeElement(), modes=[];
  const byId=id => ids[id] ||= makeElement();
  ids.cloudSignedOut=signedOut; byId('phonePasswordNumber').parent=phoneSection;
  byId('cloudEmail').parent=makeElement(); byId('cloudPassword').parent=makeElement();
  const document={head:makeElement(),createElement:makeElement,createTextNode:text=>({textContent:text}),getElementById:byId,
    querySelector(selector){if(selector==='[data-tab="auth"]')return {click(){}};return null},querySelectorAll(){return []}};
  const window={yasCloud:{setAuthMode(mode){modes.push(mode)}}};
  vm.runInNewContext(await readFile('landing-integration.js','utf8'),{document,window,location:{search:'?view='+initial},URLSearchParams});
  const info=signedOut.children.at(-1), toggle=info.children[1], code=signedOut.children.find(child=>child.textContent==='ورود با کد پیامکی');
  assert.equal(signedOut.dataset.authMode,initial);
  assert.equal('data-auth-hidden' in phoneSection.attrs,initial==='signup');
  toggle.handlers.click();
  const next=initial==='signup'?'login':'signup';
  assert.equal(signedOut.dataset.authMode,next);
  assert.equal(modes.at(-1),next);
  assert.equal('data-auth-hidden' in phoneSection.attrs,next==='signup');
  if(next==='login') {
    code.handlers.click(); assert.equal(signedOut.dataset.authMode,'login-sms');
    assert.equal('data-auth-hidden' in phoneSection.attrs,true);
    code.handlers.click(); assert.equal(signedOut.dataset.authMode,'login');
  }
}
await scenario('signup'); await scenario('login');
console.log('PASS registration/login toggle and SMS login mode');
