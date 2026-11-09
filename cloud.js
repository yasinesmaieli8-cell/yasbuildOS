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
  window.yasCloud = {
    async projects() {
      if (!currentUser) throw new Error('login');
      const userId = currentUser.id;
      const { data, error } = await client.from('yb_projects').select('id,name,owner_id').order('created_at', { ascending: false });
      if (error || currentUser?.id !== userId) throw error || new Error('session changed');
      const membership = await client.from('yb_project_members').select('project_id,role,status').eq('user_id', userId);
      if (currentUser?.id !== userId) throw new Error('session changed');
      const editable = new Set((membership.data || []).filter(m => m.status === 'active' && m.role === 'editor').map(m => m.project_id));
      return data.filter(p => p.owner_id === userId || editable.has(p.id));
    },
    async saveCalculation(projectId, record) {
      if (!currentUser) throw new Error('login');
      const userId = currentUser.id;
      const project = await client.from('yb_projects').select('owner_id').eq('id', projectId).single();
      if (project.error || !project.data || currentUser?.id !== userId) throw project.error || new Error('project unavailable');
      const { error } = await client.from('yb_calculations').insert({ project_id: projectId, owner_id: project.data.owner_id, tool_name: record.tool, title: record.tool, inputs: record.inputs, outputs: record.outputs });
      if (error) throw error;
    }
  };
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
    el('cloudUserId').textContent = user ? user.id : '';
    el('cloudInvitations').replaceChildren();
    el('topname').textContent = user ? (user.email || 'کاربر') : 'مهمان';
    el('toprole').textContent = user ? 'حساب کاربری' : 'بدون نشست';
    el('cloudProjectList').replaceChildren();
    for (const prefix of ['runner', 'stair']) {
      const select = el(prefix + 'CloudProject');
      select.replaceChildren();
      const placeholder = document.createElement('option'); placeholder.value = ''; placeholder.textContent = 'انتخاب پروژه ابری'; select.appendChild(placeholder);
      el(prefix + 'CloudMessage').textContent = '';
    }
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
  function teamControls(project, ownerId) {
    const box = document.createElement('details');
    const heading = document.createElement('summary'); heading.textContent = 'اعضا و دعوت به پروژه'; box.appendChild(heading);
    const info = document.createElement('p'); info.className = 'project-message'; info.textContent = 'شناسه حساب همکار را از خود او بگیرید. دسترسی پس از پذیرش دعوت فعال می‌شود. تغییر نقش، پذیرش دوباره را لازم می‌کند.'; box.appendChild(info);
    const form = document.createElement('form');
    const idLabel = document.createElement('label'); idLabel.textContent = 'شناسه حساب همکار';
    const input = document.createElement('input'); input.type = 'text'; input.required = true; input.placeholder = 'شناسه حساب همکار'; input.setAttribute('aria-label','شناسه حساب همکار'); input.style.cssText = 'width:100%;padding:10px;margin:8px 0'; idLabel.appendChild(input);
    const select = document.createElement('select'); select.setAttribute('aria-label','نقش همکار');
    for (const [value, label] of [['viewer','فقط مشاهده'],['editor','مشاهده و ویرایش']]) { const option = document.createElement('option'); option.value=value; option.textContent=label; select.appendChild(option); }
    const submit = document.createElement('button'); submit.type='submit'; submit.className='btn secondary sm'; submit.textContent='ثبت دعوت';
    const status = document.createElement('p'); status.className='project-message'; status.setAttribute('role','status'); status.setAttribute('aria-live','polite');
    const list = document.createElement('div');
    form.append(idLabel,select,submit); box.append(form,status,list);
    async function refresh() {
      if (currentUser?.id !== ownerId) return;
      const { data, error } = await client.from('yb_project_members').select('user_id,role,status').eq('project_id',project.id).order('created_at',{ascending:true});
      if (currentUser?.id !== ownerId) return;
      list.replaceChildren();
      if (error) { status.textContent='دریافت فهرست اعضا انجام نشد.'; return; }
      if (!data.length) { list.textContent='هنوز عضوی دعوت نشده است.'; return; }
      for (const member of data) {
        const row=document.createElement('div'); row.className='project-item';
        const text=document.createElement('p'); text.textContent=`${member.user_id} · ${member.role === 'editor' ? 'ویرایشگر' : 'فقط مشاهده'} · ${member.status === 'active' ? 'فعال' : 'در انتظار پذیرش'}`;
        const remove=document.createElement('button'); remove.type='button'; remove.className='btn secondary sm'; remove.textContent='لغو دسترسی';
        remove.addEventListener('click', async () => {
          if (!confirm('دعوت یا دسترسی این عضو به پروژه لغو شود؟')) return;
          remove.disabled=true;
          try { const {error}=await client.rpc('yb_remove_member',{p_project:project.id,p_user:member.user_id}); if(error) throw error; status.textContent='دسترسی لغو شد.'; await refresh(); }
          catch (_) { status.textContent='لغو دسترسی انجام نشد.'; }
          finally { remove.disabled=false; }
        });
        row.append(text,remove); list.appendChild(row);
      }
    }
    box.addEventListener('toggle',()=>{ if (box.open) refresh().catch(()=>{status.textContent='دریافت فهرست اعضا انجام نشد.';}); });
    form.addEventListener('submit', async event => {
      event.preventDefault(); const id=input.value.trim();
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) { status.textContent='شناسه حساب معتبر نیست.'; return; }
      submit.disabled=true;
      try { const {error}=await client.rpc('yb_invite_member',{p_project:project.id,p_user:id,p_role:select.value}); if(error) throw error; input.value=''; status.textContent='دعوت ثبت شد؛ همکار باید آن را در حساب خود بپذیرد.'; await refresh(); }
      catch (_) { status.textContent='ثبت دعوت انجام نشد؛ شناسه حساب تأییدشده و اتصال را بررسی کنید.'; }
      finally { submit.disabled=false; }
    });
    return box;
  }
  async function loadProjects() {
    const user = currentUser;
    if (!user) return;
    const request = ++requestNumber;
    projectMessage('در حال دریافت پروژه‌ها…');
    try {
      const memberships = await client.from('yb_project_members').select('project_id,role,status').eq('user_id', user.id);
      if (request !== requestNumber || currentUser?.id !== user.id) return;
      const teamAvailable = !memberships.error;
      const memberRoles = new Map((memberships.data || []).filter(m => m.status === 'active').map(m => [m.project_id, m.role]));
      const invitations = el('cloudInvitations'); invitations.replaceChildren();
      if (!teamAvailable) invitations.textContent = 'امکانات تیمی هنوز روی سرویس فعال نشده‌اند.';
      for (const invitation of (memberships.data || []).filter(m => m.status === 'pending')) {
        const item = document.createElement('div'); item.className = 'project-item';
        const label = document.createElement('p'); label.textContent = `دعوت به پروژه ${invitation.project_id} · نقش: ${invitation.role === 'editor' ? 'ویرایشگر' : 'فقط مشاهده'}`;
        const accept = document.createElement('button'); accept.type = 'button'; accept.className = 'btn secondary sm'; accept.textContent = 'پذیرش دعوت';
        accept.addEventListener('click', async () => {
          accept.disabled = true;
          try { const { error } = await client.rpc('yb_accept_invitation', {p_project:invitation.project_id}); if (error) throw error; await loadProjects(); }
          catch (_) { projectMessage('پذیرش دعوت انجام نشد؛ دوباره تلاش کنید.'); }
          finally { accept.disabled = false; }
        });
        const reject = document.createElement('button'); reject.type = 'button'; reject.className = 'btn secondary sm'; reject.textContent = 'رد دعوت';
        reject.addEventListener('click', async () => {
          reject.disabled = true;
          try { const { error } = await client.rpc('yb_remove_member', {p_project:invitation.project_id, p_user:user.id}); if (error) throw error; await loadProjects(); }
          catch (_) { projectMessage('رد دعوت انجام نشد؛ دوباره تلاش کنید.'); }
          finally { reject.disabled = false; }
        });
        item.append(label,accept,reject); invitations.appendChild(item);
      }
      const { data, error } = await client.from('yb_projects').select('id,owner_id,name,city,project_type,area,budget,status').order('created_at', { ascending: false });
      if (request !== requestNumber || currentUser?.id !== user.id) return;
      if (error) { projectMessage('دریافت پروژه‌ها انجام نشد؛ اتصال یا تنظیمات سرویس را بررسی کنید.'); return; }
      const list = el('cloudProjectList'); list.replaceChildren();
      projectMessage(data.length ? `${data.length.toLocaleString('fa-IR')} پروژه ابری` : 'هنوز پروژه ابری ثبت نشده است.');
      for (const p of data) {
        const role = p.owner_id === user.id ? 'owner' : memberRoles.get(p.id);
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
          try {
            const { data, error } = await client.from('yb_projects').delete().eq('id',p.id).select('id');
            if (error || !data || data.length !== 1) { projectMessage('حذف انجام نشد؛ پروژه وجود ندارد یا دسترسی شما تغییر کرده است.'); return; }
            if (editingId === p.id) resetProject(); await loadProjects();
          } catch (_) { projectMessage('حذف پروژه انجام نشد؛ اتصال اینترنت را بررسی کنید.'); }
        });
        const calculations = document.createElement('details');
        const summary = document.createElement('summary'); summary.textContent = 'محاسبات ذخیره‌شده'; calculations.appendChild(summary);
        const results = document.createElement('div'); calculations.appendChild(results);
        calculations.addEventListener('toggle', async () => {
          if (!calculations.open) return;
          results.textContent = 'در حال دریافت…';
          try {
            const { data, error } = await client.from('yb_calculations').select('tool_name,inputs,outputs,created_at').eq('project_id', p.id).order('created_at', { ascending:false });
            if (error) throw error;
            results.replaceChildren();
            if (!data.length) results.textContent = 'هنوز محاسبه‌ای ذخیره نشده است.';
            for (const entry of data) {
              const record = document.createElement('div'); record.className = 'project-item';
              const title = document.createElement('h3'); title.textContent = entry.tool_name; record.appendChild(title);
              const content = document.createElement('pre'); content.style.cssText = 'white-space:pre-wrap;overflow-wrap:anywhere;direction:rtl;font:inherit';
              content.textContent = JSON.stringify({ورودی‌ها:entry.inputs, نتایج:entry.outputs},null,2); record.appendChild(content); results.appendChild(record);
            }
          } catch (_) { results.textContent = 'دریافت محاسبات انجام نشد.'; }
        });
        if (role === 'owner' || role === 'editor') actions.appendChild(edit);
        if (role === 'owner') actions.appendChild(remove);
        const roleLabel = document.createElement('p'); roleLabel.textContent = role === 'owner' ? 'نقش شما: مالک' : role === 'editor' ? 'نقش شما: ویرایشگر' : 'نقش شما: فقط مشاهده'; card.appendChild(roleLabel);
        actions.appendChild(calculations); card.appendChild(actions);
        if (role === 'owner' && teamAvailable) card.appendChild(teamControls(p, user.id));
        list.appendChild(card);
      }
    } catch (_) { if (request === requestNumber) projectMessage('دریافت پروژه‌ها انجام نشد.'); }
  }
  el('cloudProjectCancel').addEventListener('click', resetProject);
  el('cloudRefresh').addEventListener('click', loadProjects);
  el('cloudImportLocal').addEventListener('click', async () => {
    const userId = currentUser?.id;
    if (!userId) return;
    let local;
    try {
      const raw = localStorage.getItem('yasbuildos.projects.v1');
      local = raw === null ? [] : JSON.parse(raw);
      if (!Array.isArray(local) || local.length > 10000) throw new Error('invalid');
    } catch (_) { projectMessage('پروژه‌های محلی خوانده نشدند؛ ابتدا فایل پشتیبان را بررسی کنید.'); return; }
    if (!local.length) { projectMessage('در این مرورگر پروژه محلی برای انتقال وجود ندارد.'); return; }
    if (!confirm(`از ${local.length.toLocaleString('fa-IR')} پروژه محلی، یک نسخه در حساب ابری ایجاد شود؟ پروژه‌های محلی حذف نمی‌شوند و مواردی که قبلاً منتقل شده‌اند تغییر نمی‌کنند.`)) return;
    const valid = p => p && typeof p.id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(p.id)
      && typeof p.name === 'string' && p.name.trim().length > 0 && p.name.length <= 100
      && typeof p.city === 'string' && p.city.length <= 100
      && ['', 'مسکونی', 'ویلایی', 'تجاری', 'بازسازی', 'سایر'].includes(p.type)
      && ['برنامه‌ریزی', 'در حال اجرا', 'متوقف', 'پایان‌یافته'].includes(p.status)
      && (p.area === null || (typeof p.area === 'number' && Number.isFinite(p.area) && p.area >= 0 && p.area <= 1000000000))
      && (p.budget === null || (typeof p.budget === 'number' && Number.isFinite(p.budget) && p.budget >= 0 && p.budget <= 1000000000000000));
    el('cloudImportLocal').disabled = true;
    let added = 0, skipped = 0, failed = 0;
    try {
      const { data, error } = await client.from('yb_projects').select('id');
      if (error || currentUser?.id !== userId) throw new Error('unavailable');
      const known = new Set(data.map(p => p.id));
      for (const p of local) {
        if (currentUser?.id !== userId) { failed += local.length - added - skipped - failed; break; }
        if (!valid(p)) { failed++; continue; }
        const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode('yasbuildos-import-v1:' + userId + ':' + p.id)));
        bytes[6] = (bytes[6] & 15) | 128; bytes[8] = (bytes[8] & 63) | 128;
        const hex = Array.from(bytes.slice(0, 16), b => b.toString(16).padStart(2, '0')).join('');
        const id = `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
        if (known.has(id)) { skipped++; continue; }
        const row = { id, name:p.name.trim(), city:p.city, project_type:p.type, area:p.area, budget:p.budget, status:p.status };
        const result = await client.from('yb_projects').insert(row);
        if (result.error) failed++; else { added++; known.add(id); }
      }
      if (currentUser?.id === userId) {
        await loadProjects();
        projectMessage(`${added.toLocaleString('fa-IR')} پروژه منتقل شد؛ ${skipped.toLocaleString('fa-IR')} مورد تکراری و ${failed.toLocaleString('fa-IR')} مورد ناموفق بود. نسخه‌های محلی باقی ماندند.`);
      }
    } catch (_) { projectMessage(`انتقال کامل نشد؛ ${added.toLocaleString('fa-IR')} پروژه منتقل شد. ارتباط را بررسی و دوباره تلاش کنید؛ نسخه محلی تغییری نکرده است.`); }
    finally { el('cloudImportLocal').disabled = false; }
  });
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
      const result = editingId ? await client.from('yb_projects').update(values).eq('id',editingId).select('id') : await client.from('yb_projects').insert(values).select('id');
      if (result.error || !result.data || result.data.length !== 1) { projectMessage('ذخیره انجام نشد؛ اطلاعات، دسترسی یا اتصال را بررسی کنید.'); return; }
      resetProject(); await loadProjects();
    } catch (_) { projectMessage('ذخیره پروژه انجام نشد.'); }
    finally { el('cloudProjectSave').disabled = false; }
  });
  client.auth.onAuthStateChange((event, session) => {
    queueMicrotask(() => {
      renderUser(session?.user || null);
      if (event === 'SIGNED_OUT') { el('cloudPasswordChange').hidden = true; el('cloudNewPassword').value = ''; }
      if (event === 'PASSWORD_RECOVERY') { document.querySelector('[data-tab="auth"]').click(); el('cloudPasswordChange').hidden = false; message('گذرواژه جدید را در قسمت زیر وارد کنید.'); }
    });
  });
  el('cloudPasswordChange').addEventListener('submit', async event => {
    event.preventDefault(); const password = el('cloudNewPassword').value;
    if (password.length < 8) { message('گذرواژه جدید باید دست‌کم ۸ نویسه باشد.'); return; }
    const button = el('cloudPasswordChange').querySelector('button[type="submit"]');
    button.disabled = true;
    try {
      const { error } = await client.auth.updateUser({ password });
      if (error) message('تغییر گذرواژه انجام نشد؛ لینک بازیابی را دوباره درخواست کن.');
      else { el('cloudNewPassword').value = ''; el('cloudPasswordChange').hidden = true; message('گذرواژه تغییر کرد.'); }
    } catch (_) { message('ارتباط با سرویس برقرار نشد؛ دوباره تلاش کن.'); }
    finally { button.disabled = false; }
  });
})();
