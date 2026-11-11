(() => {
  'use strict';
  const nav=document.querySelector('.nav'),content=document.querySelector('.content');
  const button=document.createElement('button');button.dataset.tab='course';button.type='button';button.textContent='▶  دوره‌ها';nav.appendChild(button);
  const section=document.createElement('section');section.className='tabpage';section.id='course';
  const card=document.createElement('div');card.className='card';section.appendChild(card);content.appendChild(section);
  const title=document.createElement('h2');title.textContent='دوره‌ها';card.appendChild(title);
  const status=document.createElement('p');status.className='notice';status.textContent='به‌زودی';card.appendChild(status);
  const description=document.createElement('p');description.textContent='دوره‌های آموزشی YasBuildOS در حال آماده‌سازی هستند.';card.appendChild(description);
  button.addEventListener('click',()=>{
    document.querySelectorAll('.nav button').forEach(x=>x.classList.remove('active'));
    document.querySelectorAll('.tabpage').forEach(x=>x.classList.remove('show'));
    button.classList.add('active');section.classList.add('show');
    document.getElementById('crumb').textContent='دوره‌ها';document.getElementById('title').textContent='دوره‌ها';document.getElementById('subtitle').textContent='دوره‌های آموزشی به‌زودی در دسترس قرار می‌گیرند.';
  });
})();
