import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const elements={};
const form={addEventListener(){}};
const get=id=>elements[id] ||= {value:'',textContent:'',selectionStart:0,form:id==='checkReserve'?null:form,handlers:{},addEventListener(name,fn){this.handlers[name]=fn},setCustomValidity(message){this.error=message},setSelectionRange(){}};
const window={};
vm.runInNewContext(await readFile('budget-input.js','utf8'),{window,document:{getElementById:get},queueMicrotask});

for(const id of ['projectBudget','cloudProjectBudget','checkReserve','checkUnitPrice','checkExtra','checkPaid']){
  const input=get(id), hint=get(id+'Hint');
  input.value='۱۵۰۰۰۰۰';input.selectionStart=input.value.length;input.handlers.input();
  assert.equal(input.value,'۱٬۵۰۰٬۰۰۰');assert.equal(window.budgetInputs[id].get(),1500000);assert.ok(hint.textContent.includes('میلیون'));
  input.value='12a';input.handlers.input();assert.ok(input.error);assert.ok(Number.isNaN(window.budgetInputs[id].get()));
  window.budgetInputs[id].set(1234567);assert.equal(window.budgetInputs[id].get(),1234567);assert.equal(input.value,'۱٬۲۳۴٬۵۶۷');
  window.budgetInputs[id].set(null);assert.equal(window.budgetInputs[id].get(),null);
}
console.log('PASS formatted Persian amounts, validation and values across all budget fields');
