(() => {
  'use strict';
  const sideFooter = document.querySelector('.sidefoot');
  if (sideFooter) {
    const landingLink = document.createElement('a');
    landingLink.href = 'landing.html';
    landingLink.textContent = 'صفحه معرفی YasBuildOS';
    landingLink.style.cssText = 'display:block;margin-top:10px;color:inherit;text-decoration:underline';
    sideFooter.appendChild(landingLink);
  }
  const version = document.querySelector('.brand small');
  if (version) version.textContent = 'WORKSPACE · v0.14.26';
})();
