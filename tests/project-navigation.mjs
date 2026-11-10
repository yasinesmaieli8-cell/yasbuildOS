import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const elements={};
function element(){return {children:[],handlers:{},classList:{toggle(){}},appendChild(x){this.children.push(x)},replaceChildren(){this.children=[]},setAttribute(){},addEventListener(k,fn){this.handlers[k]=fn},querySelector(){return {}},focus(){},reset(){}}}
const get=id=>elements[id] ||= element();
const document={getElementById:get,createElement:element};
const projects=[{id:'p1',name:'ساختمان',city:'تهران',type:'مسکونی',status:'در حال اجرا',area:100,budget:1000}];
const localStorage={getItem:()=>JSON.stringify(projects)};
let opened;const window={addEventListener(){},yasbuildosOpenChecklist(id){opened=id;return true}};
vm.runInNewContext(await readFile('projects.js','utf8'),{document,window,localStorage,Intl});
const card=get('projectList').children[0],actions=card.children.at(-1);actions.children[0].handlers.click();assert.equal(opened,'p1');
window.yasbuildosOpenChecklist=()=>false;actions.children[0].handlers.click();assert.ok(get('projectMessage').textContent.includes('باز کردن چک‌لیست ممکن نشد'));
console.log('PASS opening the selected local project checklist and error handling');
