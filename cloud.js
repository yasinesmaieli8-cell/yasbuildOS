// Cloud workspace uses the public client key; access control is enforced by database RLS.
(() => {
  const el = id => document.getElementById(id);
  const message = text => { el('cloudMessage').textContent = text; };
  const projectMessage = text => { el('cloudProjectMessage').textContent = text; };
  const url = 'https://cekxtxncdourlengbkzy.supabase.co';
  const publicKey = 'sb_publishable_VVozb50ZJ4v0wQ8-PVF7YA_kwgY5uUe';
  if (!window.supabase) { el('cloudActions').disabled = true; message('سرویس ورود بارگذاری نشد؛ اتصال اینترنت را بررسی و صفحه را دوباره باز کنید.'); return; }
  const client = window.supabase.createClient(url, publicKey);
  const redirect = location.origin + location.pathname;
  let currentUser = null;
  let editingId = null;
  let requestNumber = 0;
  const showError = (error, fallback) => {
    if (error?.status === 429) return 'تعداد درخواست‌ها زیاد است؛ کمی بعد دوباره تلاش کنید.';
    if (error?.status === 400 || error?.status === 401) return fallback;
    return 'عملیات انجام نشد؛ اتصال اینترنت و وضعیت سرویس را بررسی کنید.';
  };
  const field = id => el(id).value.trim();
  function resetProject() {
    editingId = null;
    el('cloudProjectForm').reset();
    el('cloudProjectSave').textContent = 'ثبت پروژه ابری';
    el('cloudProjectCancel').hidden = true;
  }
  function renderUser(user) {
    currentUser = user;
    requestNumber++;
    el('cloudSignedOut').hidden = Boolean(user);
    el('cloudSignedIn').hidden = !user;
    el('cloudEmailDisplay').textContent = user ? user.email : '';
    el('topname').textContent = user ? (user.email || 'کاربر') : 'مهمان';
    el('toprole').textContent = user ? 'حساب کاربری' : 'بدون نشست';
    el('cloudProjectList').replaceChildren();
    resetProject();
    if (user) loadProjects();
  }
  async function authAction(action) {
    const email = field('cloudEmail');
    const password = el('cloudPassword').value;
    if (!email || !el('cloudEmail').validity.valid) { message('یک ایمیل معتبر وارد کنید.'); return; }
    if (action !== 'reset' && password.length < 8) { message('گذرواژه باید دست‌کم ۸ نویسه باشد.'); return; }
    el('cloudActions').disabled = true;
    message('در حال ارتباط با سرویس…');
    try {
      let result;
      if (action === 'signup') result = await client.auth.signUp({ email, password, options: { emailRedirectTo: redirect } });
      else if (action === 'login') result = await client.auth.signInWithPassword({ email, password });
      else result = await client.auth.resetPasswordForEmail(email, { redirectTo: redirect });
      if (result.error) { message(showError(result.error, action === 'login' ? 'ایمیل یا گذرواژه معتبر نیست، یا ایمیل هنوز تأیید نشده است.' : 'درخواست انجام نشد؛ ممکن است ارسال ایمیل برای این نشانی فعال نباشد.')); return; }
      el('cloudPassword').value = '';
      if (action === 'signup') message(result.data.session ? 'حساب ساخته شد.' : 'اگر ثبت‌نام پذیرفته شده باشد، پیام تأیید را در ایمیلت بررسی کن.');
      else if (action === 'reset') message('اگر این نشانی قابل بازیابی باشد، دستورالعمل به ایمیل ارسال می‌شود.');
      else message('وارد حساب شدی.');
    } catch (_) { message('ارتباط با سرویس برقرار نشد.'); }
    finally { el('cloudActions').disabled = false; }
  }
  for (const [id, action] of [['cloudLogin','login'], ['cloudSignup','signup'], ['cloudReset','reset']]) el(id).addEventListener('click', () => authAction(action));
  el('cloudLogout').addEventListener('click', async () => {
    const { error } = await client.auth.signOut();
    if (error) message('خروج انجام نشد؛ دوباره تلاش کن.'); else message('از حساب خارج شدی.');
  });
  async function loadProjects() {
    const user = currentUser;
    if (!user) return;
    const request = ++requestNumber;
    projectMessage('در حال دریافت پروژه‌ها…');
    try {
      const { data, error } = await client.from('yb_projects').select('id,name,city,project_type,area,budget,status').order('created_at', { ascending: false });
      if (request !== requestNumber || currentUser?.id !== user.id) return;
      if (error) { projectMessage('دریافت پروژه‌ها انجام نشد؛ اتصال یا تنظیمات سرویس را بررسی کنید.'); return; }
      const list = el('cloudProjectList'); list.replaceChildren();
      projectMessage(data.length ? `${data.length.toLocaleString('fa-IR')} پروژه ابری` : 'هنوز پروژه ابری ثبت نشده است.');
      for (const p of data) {
        const card = document.createElement('article'); card.className = 'project-item';
        const heading = document.createElement('h3'); heading.textContent = p.name; card.appendChild(heading);
        const details = document.createElement('p');
        details.textContent = [p.city || 'شهر ثبت نشده', p.project_type || 'نوع ثبت نشده', p.status, p.area === null ? 'مساحت ثبت نشده' : `${p.area} مترمربع`, p.budget === null ? 'بودجه ثبت نشده' : `${Number(p.budget).toLocaleString('fa-IR')} تومان`].join(' · '); card.appendChild(details);
        const actions = document.createElement('div'); actions.className = 'project-actions';
        const edit = document.createElement('button'); edit.type = 'button'; edit.className = 'btn secondary sm'; edit.textContent = 'ویرایش'; edit.setAttribute('aria-label','ویرایش پروژه ' + p.name);
        edit.addEventListener('click', () => {
          editingId = p.id; el('cloudProjectName').value = p.name; el('cloudProjectCity').value = p.city; el('cloudProjectType').value = p.project_type;
          el('cloudProjectArea').value = p.area ?? ''; window.budgetInputs.cloudProjectBudget.set(p.budget); el('cloudProjectStatus').value = p.status;
          el('cloudProjectSave').textContent = 'ذخیره تغییرات'; el('cloudProjectCancel').hidden = false; el('cloudProjectName').focus();
        });
        const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'btn secondary sm'; remove.textContent = 'حذف'; remove.setAttribute('aria-label','حذف پروژه ' + p.name);
        remove.addEventListener('click', async () => {
          if (!confirm(`پروژه «${p.name}» و محاسبات وابسته به آن به‌طور دائمی حذف شود؟`)) return;
          const { error } = await client.from('yb_projects').delete().eq('id',p.id);
          if (error) { projectMessage('حذف پروژه انجام نشد.'); return; }
          if (editingId === p.id) resetProject(); await loadProjects();
        });
        actions.append(edit,remove); card.appendChild(actions); list.appendChild(card);
      }
    } catch (_) { if (request === requestNumber) projectMessage('دریافت پروژه‌ها انجام نشد.'); }
  }
  el('cloudProjectCancel').addEventListener('click', resetProject);
  el('cloudRefresh').addEventListener('click', loadProjects);
  el('cloudProjectForm').addEventListener('submit', async event => {
    event.preventDefault();
    if (!currentUser || !el('cloudProjectForm').reportValidity()) return;
    const name = field('cloudProjectName');
    if (!name) { projectMessage('نام پروژه را وارد کنید.'); return; }
    const area = el('cloudProjectArea').value, budget = window.budgetInputs.cloudProjectBudget.get();
    if (budget !== null && !Number.isFinite(budget)) { projectMessage('مبلغ بودجه معتبر نیست.'); return; }
    const values = { name, city: field('cloudProjectCity'), project_type: el('cloudProjectType').value, status: el('cloudProjectStatus').value, area: area === '' ? null : Number(area), budget };
    el('cloudProjectSave').disabled = true;
    try {
      const { error } = editingId ? await client.from('yb_projects').update(values).eq('id',editingId) : await client.from('yb_projects').insert(values);
      if (error) { projectMessage('ذخیره پروژه انجام نشد؛ داده‌ها و اتصال را بررسی کنید.'); return; }
      resetProject(); await loadProjects();
    } catch (_) { projectMessage('ذخیره پروژه انجام نشد.'); }
    finally { el('cloudProjectSave').disabled = false; }
  });
  client.auth.onAuthStateChange((event, session) => {
    queueMicrotask(() => {
      renderUser(session?.user || null);
      if (event === 'PASSWORD_RECOVERY') { el('cloudPasswordChange').hidden = false; message('گذرواژه جدید را در قسمت زیر وارد کنید.'); }
    });
  });
  el('cloudPasswordChange').addEventListener('submit', async event => {
    event.preventDefault(); const password = el('cloudNewPassword').value;
    if (password.length < 8) { message('گذرواژه جدید باید دست‌کم ۸ نویسه باشد.'); return; }
    const { error } = await client.auth.updateUser({ password });
    if (error) message('تغییر گذرواژه انجام نشد؛ لینک بازیابی را دوباره درخواست کن.');
    else { el('cloudNewPassword').value = ''; el('cloudPasswordChange').hidden = true; message('گذرواژه تغییر کرد.'); }
  });
})();
