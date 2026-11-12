import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source=await readFile('cloud.js','utf8');
function element(){return {children:[],handlers:{},value:'',textContent:'',hidden:false,disabled:false,open:false,style:{},validity:{valid:true},appendChild(x){this.children.push(x)},append(...x){this.children.push(...x)},replaceChildren(){this.children=[]},addEventListener(k,f){this.handlers[k]=f},setAttribute(){},reset(){},focus(){},reportValidity(){return true}};}
async function scenario(role){
  const elements={}; const el=id=>elements[id] ||= element(); const owner='11111111-1111-4111-8111-111111111111', member='22222222-2222-4222-8222-222222222222';
  const me=role==='owner'?owner:member, project={id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',owner_id:owner,name:'پروژه',city:'',project_type:'',status:'برنامه‌ریزی',area:null,budget:null};
  let callback, sent=[];
  const membership=role==='owner'?[]:[{project_id:project.id,user_id:member,role,status:'active'}];
  const client={auth:{onAuthStateChange(f){callback=f}},rpc:async(name,args)=>{sent.push([name,args]);return {error:null}},from(table){return {select(){let query={eq(){return query},order:async()=>({data:table==='yb_projects'?[project]:membership,error:null}),then(resolve){resolve({data:table==='yb_project_members'?membership:[project],error:null})}};return query}}}};
  const tabs={}, clicks=[];
  const document={getElementById:el,createElement:element,querySelector:selector=>tabs[selector] ||= {...element(),click(){clicks.push(selector);this.handlers.click?.()}}};
  const window={supabase:{createClient:()=>client},budgetInputs:{cloudProjectBudget:{set(){},get(){return null}}}};
  vm.runInNewContext(source,{document,window,location:{origin:'https://example.com',pathname:'/',search:''},setTimeout,URLSearchParams,confirm:()=>true,console});
  callback('SIGNED_IN',{user:{id:me,email:'user@example.com'}}); await new Promise(r=>setTimeout(r,10));
  assert.ok(clicks.includes('[data-tab="dashboard"]'),'successful login opens dashboard');
  assert.equal(el('cloudProjectList').children.length,0,'login does not wait for projects');
  document.querySelector('[data-tab="auth"]').click(); await new Promise(r=>setTimeout(r,10));
  const card=el('cloudProjectList').children[0]; assert.ok(card,'project renders');
  const actions=card.children[3];
  if(role==='owner'){
    assert.equal(actions.children.filter(x=>x.textContent==='حذف').length,1);
    const box=card.children[4]; assert.equal(box.children[0].textContent,'اعضا و دعوت به پروژه');
    const form=box.children[2], input=form.children[0].children[0], select=form.children[1];
    input.value=member;select.value='viewer';await form.handlers.submit({preventDefault(){}});
    assert.equal(sent[0][0],'yb_invite_member');assert.equal(sent[0][1].p_user,member);
  } else if(role==='viewer') assert.equal(actions.children.filter(x=>x.textContent==='ویرایش').length,0);
  else {assert.equal(actions.children.filter(x=>x.textContent==='ویرایش').length,1);assert.equal(actions.children.filter(x=>x.textContent==='حذف').length,0)}
  console.log('PASS '+role+' controls');
}
await scenario('owner');await scenario('viewer');await scenario('editor');
