import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source=await readFile('dashboard.js','utf8');
const elements={};function el(id){return elements[id] ||= {children:[],textContent:'',dataset:{},append(...x){this.children.push(...x)},appendChild(x){this.children.push(x)},replaceChildren(){this.children=[]},addEventListener(){}}}
const data={'yasbuildos.projects.v1':JSON.stringify([{id:'a',name:'پروژه',city:'تهران',status:'در حال اجرا'}]),'yasbuildos.checklist.v1':JSON.stringify({a:{items:[{done:true,unitPrice:200,status:'پرداخت‌شده',paid:500},{done:false,unitPrice:null,status:'متعهدشده',paid:100}]}})};
const document={getElementById:el,createElement:()=>({children:[],append(...x){this.children.push(...x)},appendChild(x){this.children.push(x)}}),querySelector:()=>el('nav'),querySelectorAll:()=>[]};
vm.runInNewContext(source,{document,localStorage:{getItem:k=>data[k]??null},window:{addEventListener(){}},Intl});
assert.equal(el('dashProjectCount').textContent,'۱');assert.equal(el('dashTaskCount').textContent,'۲');assert.equal(el('dashDone').textContent,'۱');assert.equal(el('dashSpent').textContent,'۵۰۰ تومان');assert.ok(el('dashSummary').textContent.includes('۱۰۰ تومان'));assert.equal(el('dashProjects').children.length,1);
console.log('PASS dashboard totals use saved project data');
