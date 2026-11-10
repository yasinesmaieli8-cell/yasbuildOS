import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const key='yasbuildos.projects.v1', trashKey='yasbuildos.projects.trash.v1', checkKey='yasbuildos.checklist.v1';
const project={id:'p1',name:'پروژه',city:'تهران',area:100,budget:200,createdAt:'2026-11-01T00:00:00Z'};
const source=await readFile('projects.js','utf8');
function setup(initial, failKey=null) {
  const store={...initial}, elements={};
  const localStorage={getItem:k=>store[k]??null,setItem(k,v){if(k===failKey)throw Error('quota');store[k]=v},removeItem(k){delete store[k]}};
  function element(){return {value:'',children:[],handlers:{},classList:{toggle(){}},appendChild(x){this.children.push(x)},replaceChildren(){this.children=[]},setAttribute(){},addEventListener(k,fn){this.handlers[k]=fn},querySelector(){return {}},focus(){},reset(){},reportValidity(){return true}}}
  const get=id=>elements[id] ||= element();
  const window={handlers:{},addEventListener(k,fn){this.handlers[k]=fn},budgetInputs:{projectBudget:{set(){},get(){return null}}}};
  vm.runInNewContext(source,{document:{getElementById:get,createElement:element},window,localStorage,Intl,confirm:()=>true});
  return {store,get,window};
}
const initial={[key]:JSON.stringify([project]),[checkKey]:JSON.stringify({p1:{items:[{name:'cement'}]}})};
let app=setup(initial);
app.get('projectList').children[0].children.at(-1).children[2].handlers.click();
assert.deepEqual(JSON.parse(app.store[key]),[]);
assert.deepEqual(JSON.parse(app.store[trashKey])[0].project,project);
assert.equal(app.store[checkKey],initial[checkKey]);
app=setup(app.store);
app.get('projectTrashList').children[0].children[1].handlers.click();
assert.deepEqual(JSON.parse(app.store[key]),[project]);
assert.deepEqual(JSON.parse(app.store[trashKey]),[]);
assert.equal(app.store[checkKey],initial[checkKey]);

app=setup({...initial,[trashKey]:'invalid'});
app.get('projectList').children[0].children.at(-1).children[2].handlers.click();
assert.equal(app.store[key],initial[key]); assert.equal(app.store[trashKey],'invalid');
app=setup(initial,key);
app.get('projectList').children[0].children.at(-1).children[2].handlers.click();
assert.equal(app.store[key],initial[key]); assert.equal(app.store[trashKey],undefined);
app=setup(initial);
app.store[key]=JSON.stringify([{...project,name:'changed elsewhere'}]);
app.get('projectList').children[0].children.at(-1).children[2].handlers.click();
assert.equal(JSON.parse(app.store[key])[0].name,'changed elsewhere'); assert.equal(app.store[trashKey],undefined);
console.log('PASS project trash, checklist preservation, recovery and storage failures');
