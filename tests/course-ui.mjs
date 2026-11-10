import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source=await readFile('course.js','utf8');
function node(tag='div'){return {tag,children:[],dataset:{},style:{},classList:{add(){},remove(){}},hidden:false,disabled:false,textContent:'',handlers:{},appendChild(x){this.children.push(x)},setAttribute(){},removeAttribute(name){delete this[name]},addEventListener(name,fn){this.handlers[name]=fn},click(){this.handlers.click?.()}};}
function setup(script,api){
  const nav=node(),content=node(),els={crumb:node(),title:node(),subtitle:node()},listeners={};
  const auth=node();const document={createElement:node,getElementById:id=>els[id],querySelector:q=>q==='.nav'?nav:q==='.content'?content:auth,querySelectorAll:()=>[]};
  const window={yasCloud:api,addEventListener:(name,fn)=>{listeners[name]=fn}};
  vm.runInNewContext(script,{document,window,URL,location:{href:'https://example.com/app/',origin:'https://example.com'}});
  const card=content.children[0].children[0],status=card.children[3],actions=card.children[4];
  return {status,login:actions.children[0],enroll:actions.children[1],video:card.children[5],lessons:card.children[6],listeners};
}
let signed=false,registered=false;
const api={isSignedIn:()=>signed,courseEnrollment:async()=>registered,enrollCourse:async()=>{registered=true;return true}};
let ui=setup(source,api);assert.equal(ui.enroll.hidden,true);assert.ok(ui.status.textContent.includes('هنوز آماده نشده'));
assert.equal(ui.lessons.children.filter(x=>x.tag==='details').length,4);
const quiz=ui.lessons.children.find(x=>x.className==='project-actions'),feedback=ui.lessons.children.at(-1);
quiz.children[0].click();assert.ok(feedback.textContent.includes('دوباره'));
quiz.children[1].click();assert.ok(feedback.textContent.includes('۷۵ میلیون'));
ui=setup(source.replace("videoUrl: ''","videoUrl: 'training.mp4'"),api);assert.equal(ui.login.hidden,false);assert.equal(ui.enroll.hidden,true);
signed=true;await ui.listeners['yasbuildos-auth-changed']();assert.equal(ui.enroll.hidden,false);assert.equal(ui.enroll.disabled,false);assert.equal(ui.video.hidden,true);
await ui.enroll.handlers.click();assert.equal(ui.video.hidden,false);assert.equal(ui.video.src,'training.mp4');assert.equal(ui.enroll.hidden,true);
signed=false;await ui.listeners['yasbuildos-auth-changed']();assert.equal(ui.video.hidden,true);assert.equal(ui.video.src,undefined);
signed=true;api.courseEnrollment=async()=>{throw Error('unavailable')};await ui.listeners['yasbuildos-auth-changed']();assert.equal(ui.enroll.hidden,true);assert.ok(ui.status.textContent.includes('ممکن نشد'));
console.log('PASS unavailable video, sign-in, enrollment, playback gating and service errors');
