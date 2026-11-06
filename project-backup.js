// پشتیبان پروژه‌های محلی؛ فایل پشتیبان محرمانه است و رمزگذاری نشده است.
(() => {
  const key = 'yasbuildos.projects.v1';
  const input = document.getElementById('projectBackupFile');
  const message = document.getElementById('projectBackupMessage');
  const say = text => { message.textContent = text; };
  const validProject = p => p && typeof p === 'object' && !Array.isArray(p)
    && typeof p.id === 'string' && p.id.length > 0 && p.id.length <= 100
    && typeof p.name === 'string' && p.name.trim().length > 0 && p.name.length <= 100
    && typeof p.city === 'string' && p.city.length <= 100
    && ['', 'مسکونی', 'ویلایی', 'تجاری', 'بازسازی', 'سایر'].includes(p.type)
    && ['برنامه‌ریزی', 'در حال اجرا', 'متوقف', 'پایان‌یافته'].includes(p.status)
    && (p.area === null || (Number.isFinite(p.area) && p.area >= 0 && p.area <= 1000000000))
    && (p.budget === null || (Number.isFinite(p.budget) && p.budget >= 0 && p.budget <= 1000000000000000))
    && typeof p.createdAt === 'string' && Number.isFinite(Date.parse(p.createdAt))
    && typeof p.updatedAt === 'string' && Number.isFinite(Date.parse(p.updatedAt));
  const validate = projects => Array.isArray(projects) && projects.length <= 10000
    && projects.every(validProject) && new Set(projects.map(p => p.id)).size === projects.length;
  const read = () => {
    const raw = localStorage.getItem(key);
    const projects = raw === null ? [] : JSON.parse(raw);
    if (!validate(projects)) throw new Error('invalid projects');
    return projects;
  };
  document.getElementById('projectBackupExport').addEventListener('click', () => {
    try {
      const projects = read();
      const data = {format: 'yasbuildos-projects', version: 1, exportedAt: new Date().toISOString(), projects};
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'}));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'yasbuildos-projects-' + new Date().toISOString().slice(0, 10) + '.json';
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      say('فایل پشتیبان ساخته شد؛ آن را در جای امن نگهداری کنید.');
    } catch (_) { say('ساخت پشتیبان ممکن نشد. وضعیت داده‌ها و دسترسی مرورگر را بررسی کنید.'); }
  });
  input.addEventListener('change', async () => {
    const file = input.files && input.files[0];
    if (!file) return;
    try {
      if (file.size > 5 * 1024 * 1024) throw new Error('too large');
      const backup = JSON.parse(await file.text());
      if (!backup || backup.format !== 'yasbuildos-projects' || backup.version !== 1 || !validate(backup.projects)) throw new Error('invalid backup');
      const current = read();
      const ids = new Set(current.map(p => p.id));
      const added = backup.projects.filter(p => !ids.has(p.id));
      if (current.length + added.length > 10000) throw new Error('too many');
      localStorage.setItem(key, JSON.stringify([...current, ...added]));
      window.dispatchEvent(new Event('yasbuildos-projects-updated'));
      say(`${added.length.toLocaleString('fa-IR')} پروژه افزوده شد؛ پروژه‌های دارای شناسه تکراری تغییر نکردند.`);
    } catch (_) { say('فایل معتبر نیست، بیش از حد بزرگ است یا ذخیره‌سازی در دسترس نیست؛ داده‌های قبلی تغییر نکردند.'); }
    finally { input.value = ''; }
  });
})();
