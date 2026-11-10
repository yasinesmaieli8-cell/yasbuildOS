(() => {
  'use strict';
  // Add the real, authorized course video path only when it is ready to publish.
  const course={id:'budget-intro-v1',videoUrl: ''};
  const $=id=>document.getElementById(id),nav=document.querySelector('.nav'),content=document.querySelector('.content');
  const button=document.createElement('button');button.dataset.tab='course';button.type='button';button.textContent='▶  دوره رایگان';nav.appendChild(button);
  const section=document.createElement('section');section.className='tabpage';section.id='course';
  const card=document.createElement('div');card.className='card';section.appendChild(card);content.appendChild(section);
  const add=(parent,tag,text)=>{const node=document.createElement(tag);node.textContent=text;parent.appendChild(node);return node;};
  add(card,'h2','دوره رایگان آشنایی مقدماتی با بودجه پروژه ساختمانی');
  const intro=add(card,'p','آشنایی با ثبت پروژه، برآورد فعالیت‌ها، تفاوت هزینه پرداخت‌شده و تعهد، گزارش و پشتیبان. این آموزش مقدماتی است و جای بررسی متخصص را نمی‌گیرد.');intro.className='notice';
  const list=document.createElement('ol');card.appendChild(list);for(const title of ['تعریف پروژه و بودجه','ثبت فعالیت و قیمت دستی','پرداخت، ذخیره احتیاطی و گزارش','پیش‌نیاز فعالیت و پشتیبان'])add(list,'li',title);
  const status=add(card,'p','');status.className='project-message';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  const actions=document.createElement('div');actions.className='project-actions';card.appendChild(actions);
  const login=add(actions,'button','ورود یا ثبت‌نام');login.type='button';login.className='btn secondary sm';
  const enroll=add(actions,'button','دریافت دوره رایگان');enroll.type='button';enroll.className='btn sm';
  const video=document.createElement('video');video.controls=true;video.preload='metadata';video.hidden=true;video.style.cssText='width:100%;max-width:800px;margin-top:16px';card.appendChild(video);
  let request=0;
  function videoAvailable(){try{const url=new URL(course.videoUrl,location.href);return Boolean(course.videoUrl)&&(url.protocol==='https:'||url.origin===location.origin);}catch(_){return false;}}
  async function render(){
    const token=++request,ready=videoAvailable(),signed=Boolean(window.yasCloud?.isSignedIn());
    login.hidden=signed;enroll.hidden=!ready||!signed;enroll.disabled=true;video.hidden=true;video.removeAttribute('src');
    if(!ready){status.textContent='ویدیوی این دوره هنوز آماده نشده است؛ پس از آماده‌سازی امکان دریافت فعال می‌شود.';return;}
    if(!signed){status.textContent='برای دریافت دوره رایگان ابتدا وارد حساب شوید.';return;}
    status.textContent='در حال بررسی دسترسی دوره…';
    try{const registered=await window.yasCloud.courseEnrollment(course.id);if(token!==request)return;if(registered){enroll.hidden=true;video.src=course.videoUrl;video.hidden=false;status.textContent='دوره به حساب شما اضافه شده است.';}else{enroll.disabled=false;status.textContent='دریافت این دوره رایگان است.';}}
    catch(_){if(token===request){enroll.hidden=true;status.textContent='بررسی دسترسی دوره ممکن نشد؛ اتصال یا راه‌اندازی سرویس را بررسی کنید.';}}
  }
  button.addEventListener('click',()=>{document.querySelectorAll('.nav button').forEach(x=>x.classList.remove('active'));document.querySelectorAll('.tabpage').forEach(x=>x.classList.remove('show'));button.classList.add('active');section.classList.add('show');$('crumb').textContent='دوره رایگان';$('title').textContent='دوره آموزشی';$('subtitle').textContent='آموزش مقدماتی و رایگان برای شروع کار با پروژه.';render();});
  login.addEventListener('click',()=>document.querySelector('[data-tab="auth"]').click());
  enroll.addEventListener('click',async()=>{const token=++request;enroll.disabled=true;status.textContent='در حال ثبت درخواست…';try{if(!await window.yasCloud.enrollCourse(course.id))throw Error('not confirmed');if(token===request)await render();}catch(_){if(token===request){status.textContent='دریافت دوره انجام نشد؛ اتصال یا راه‌اندازی سرویس را بررسی کنید.';enroll.disabled=false;}}});
  window.addEventListener('yasbuildos-auth-changed',()=>render());
  render();
})();
