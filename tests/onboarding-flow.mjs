import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source = await readFile('cloud.js', 'utf8');
function element() {
  return {children:[], handlers:{}, value:'', textContent:'', hidden:false, disabled:false, style:{}, validity:{valid:true},
    appendChild(child){this.children.push(child)}, append(...children){this.children.push(...children)}, replaceChildren(){this.children=[]},
    addEventListener(name,handler){this.handlers[name]=handler}, setAttribute(){}, reset(){}, focus(){}, reportValidity(){return true}};
}
async function setup() {
  const elements={}, tabs={}, clicks=[];
  const el=id => elements[id] ||= element();
  const document={getElementById:el, createElement:element, querySelector:selector => tabs[selector] ||= {...element(),click(){clicks.push(selector);this.handlers.click?.()}}};
  let callback;
  const client={auth:{onAuthStateChange(handler){callback=handler},async updateUser({data}){return {data:{user:{id:'user-1',phone:'+989000000000',user_metadata:data}},error:null}}}};
  const window={supabase:{createClient:()=>client}};
  const location={origin:'https://example.com',pathname:'/app.html',search:'?view=signup',hash:''};
  const history={replaceState(_state,_title,url){location.search=url.includes('?')?'?'+url.split('?')[1]:''}};
  vm.runInNewContext(source,{document,window,location,history,setTimeout,URLSearchParams,confirm:()=>true,console});
  const emit=async(event,user)=>{callback(event,{user});await new Promise(resolve=>setTimeout(resolve,10));};
  return {el,clicks,window,emit};
}

const newUser = await setup();
await newUser.emit('SIGNED_IN',{id:'user-1',phone:'+989000000000',user_metadata:{}});
assert.ok(newUser.clicks.includes('[data-tab="auth"]'),'new phone account must complete its profile');
assert.equal(newUser.window.yasCloud.chooseFreePlan(),false,'plan requires a completed profile');
newUser.el('profileFirst').value='نام'; newUser.el('profileLast').value='نام خانوادگی'; newUser.el('profileEmail').value='user@example.com';
await newUser.el('cloudProfileForm').handlers.submit({preventDefault(){}});
assert.equal(newUser.clicks.at(-1),'[data-tab="plans"]','completed registration opens plan selection');
assert.equal(newUser.window.yasCloud.chooseFreePlan(),true);
assert.equal(newUser.clicks.at(-1),'[data-tab="dashboard"]','free plan opens dashboard');

const existing = await setup();
const existingUser={id:'user-1',phone:'+989000000000',user_metadata:{first_name:'نام',last_name:'نام خانوادگی',contact_email:'user@example.com'}};
await existing.emit('INITIAL_SESSION',existingUser);
await existing.emit('SIGNED_IN',existingUser);
assert.equal(existing.clicks.length,0,'restored session does not skip registration screen');
assert.equal(existing.window.yasCloud.choosePlanScreen(),true);
assert.equal(existing.clicks.at(-1),'[data-tab="plans"]','continuing an existing session opens plans');
console.log('PASS signup, profile, plan selection and existing-session flow');
