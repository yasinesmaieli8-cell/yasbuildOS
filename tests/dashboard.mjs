import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source=await readFile('dashboard.js','utf8');
const elements={};function el(id){return elements[id] ||= {children:[],textContent:'',dataset:{},handlers:{},append(...x){this.children.push(...x)},appendChild(x){this.children.push(x)},replaceChildren(){this.children=[]},addEventListener(k,fn){this.handlers[k]=fn}}}
const data={'yasbuildos.projects.v1':JSON.stringify([{id:'a',name:'پروژه',city:'تهران',status:'در حال اجرا',budget:1000}]),'yasbuildos.checklist.v1':JSON.stringify({a:{reserve:100,items:[{name:'الف',done:true,unitPrice:200,status:'پرداخت‌شده',paid:500},{name:'ب',due:'2020-01-01',assignee:'علی',done:false,unitPrice:null,status:'متعهدشده',paid:100}]}})};
const document={getElementById:el,createElement:()=>({children:[],handlers:{},append(...x){this.children.push(...x)},appendChild(x){this.children.push(x)},setAttribute(){},addEventListener(k,fn){this.handlers[k]=fn}}),querySelector:()=>el('nav'),querySelectorAll:()=>[]};
let opened;const window={addEventListener(){},yasbuildosOpenChecklist(id){opened=id;return true}};
vm.runInNewContext(source,{document,localStorage:{getItem:k=>data[k]??null},window,Intl});
assert.equal(el('dashProjectCount').textContent,'۱');assert.equal(el('dashTaskCount').textContent,'۲');assert.equal(el('dashDone').textContent,'۱');assert.equal(el('dashSpent').textContent,'۵۰۰ تومان');assert.ok(el('dashSummary').textContent.includes('۱۰۰ تومان'));assert.equal(el('dashProjects').children.length,1);assert.equal(el('dashDue').children.length,1);assert.ok(el('dashDue').children[0].textContent.includes('موعد گذشته'));
assert.ok(el('dashProjects').children[0].children[2].textContent.includes('۳۰۰ تومان'));assert.ok(el('dashProjects').children[0].children[3].textContent.includes('۱ ردیف بدون قیمت'));el('dashProjects').children[0].children[4].handlers.click();assert.equal(opened,'a');
data['yasbuildos.projects.v1']=JSON.stringify([{id:'a',name:'پروژه',budget:200}]);el('nav').handlers.click();assert.ok(el('dashProjects').children[0].children[3].textContent.includes('از بودجه بیشتر است'));
data['yasbuildos.projects.v1']=JSON.stringify([{id:'a',name:'پروژه',budget:null}]);el('nav').handlers.click();assert.equal(el('dashProjects').children[0].children[2].textContent,'بودجه ثبت نشده');
console.log('PASS dashboard totals use saved project data');
