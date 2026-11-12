import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const html=await readFile('app.html','utf8'),start=html.indexOf('function calc(){'),end=html.indexOf('calc();',start);
assert.ok(start>=0&&end>start);
const ranges={height:[1800,6000,3000],tread:[200,400,280],width:[800,2500,1100],riserTarget:[140,220,170]},elements={};
function element(id){if(!elements[id]){const range=ranges[id];elements[id]={value:range?String(range[2]):'',textContent:'',innerHTML:'',style:{},addEventListener(){},get validity(){const n=Number(this.value);return {valid:!range||(Number.isFinite(n)&&n>=range[0]&&n<=range[1])}}};}return elements[id];}
const context=vm.createContext({$:element,fa:v=>String(v),window:{},Intl});vm.runInContext(html.slice(start,end+'calc();'.length),context);
let result=context.window.ybStairResult.outputs;
assert.equal(result.تعداد_رایزر,18);assert.equal(result.تعداد_کف_پله,17);assert.ok(Math.abs(result.ارتفاع_رایزر_میلیمتر-166.6666667)<1e-6);assert.ok(Math.abs(result.بلوندل_میلیمتر-613.3333333)<1e-6);
function checkDrawing(){
  const svg=element('stairSvg').innerHTML,points=svg.match(/<polyline points="([^"]+)"/)[1].split(' ').map(p=>p.split(',').map(Number));
  const expected=context.window.ybStairResult.outputs.تعداد_کف_پله;assert.equal(points.length,expected*2+2);
  for(const [x,y] of points){assert.ok(x>=0&&x<=700&&y>=0&&y<=330);}
  const firstRise=points[0][1]-points[1][1],firstRun=points[2][0]-points[1][0];
  assert.ok(Math.abs(firstRise/firstRun-result.ارتفاع_رایزر_میلیمتر/Number(element('tread').value))<1e-10);
  const last=points.at(-1),prior=points.at(-2);assert.ok(Math.abs(last[0]-prior[0])<1e-9);assert.ok(last[1]<prior[1]);
}
checkDrawing();
for(const [height,tread,target] of [[1800,200,220],[6000,400,140],[6000,200,220]]){element('height').value=String(height);element('tread').value=String(tread);element('riserTarget').value=String(target);vm.runInContext('calc()',context);result=context.window.ybStairResult.outputs;checkDrawing();}
element('height').value='1799';vm.runInContext('calc()',context);assert.equal(context.window.ybStairResult,null);assert.equal(element('stairSvg').innerHTML,'');
console.log('PASS preliminary stair geometry, drawing scale, boundaries and invalid input');
