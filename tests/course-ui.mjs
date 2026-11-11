import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
function element(){ const classes=new Set(); return {children:[],dataset:{},classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),contains:x=>classes.has(x)},appendChild(x){this.children.push(x)},addEventListener(event,fn){this[event]=fn}} }
const nav=element(),content=element(), ids={crumb:element(),title:element(),subtitle:element()};
const document={querySelector:s=>s==='.nav'?nav:content,createElement:element,querySelectorAll:s=>s==='.nav button'?nav.children:content.children,getElementById:id=>ids[id]};
vm.runInNewContext(fs.readFileSync(new URL('../course.js',import.meta.url),'utf8'),{document});
assert.equal(nav.children.length,1); const button=nav.children[0], section=content.children[0], card=section.children[0];
assert.match(button.textContent,/دوره‌ها/); assert.doesNotMatch(button.textContent,/رایگان/); assert.equal(card.children[0].textContent,'دوره‌ها'); assert.equal(card.children[1].textContent,'به‌زودی');
button.click(); assert.ok(button.classList.contains('active')); assert.ok(section.classList.contains('show')); assert.equal(ids.crumb.textContent,'دوره‌ها'); assert.match(ids.subtitle.textContent,/به‌زودی/);
console.log('Course coming-soon navigation passed');
