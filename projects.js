// پروژه‌های این نسخه فقط در مرورگر همین دستگاه نگهداری می‌شوند.
(() => {
  const key = 'yasbuildos.projects.v1';
  const trashKey = 'yasbuildos.projects.trash.v1';
  const byId = id => document.getElementById(id);
  const form = byId('projectForm');
  const message = byId('projectMessage');
  const list = byId('projectList');
  const count = byId('projectCount');
  let editing = null, editOriginal = null, lastRaw = null;
  let projects;

  function setMessage(text, isError = false) {
    message.textContent = text;
    message.classList.toggle('error', isError);
  }

  function read() {
    try {
      const stored = localStorage.getItem(key);
      if (stored === null) { lastRaw = null; return []; }
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed) || parsed.some(item => !item || typeof item.id !== 'string' || typeof item.name !== 'string')) throw new Error('invalid');
      lastRaw = stored; return parsed;
    } catch (_) {
      setMessage('داده‌های پروژه خوانده نشدند یا دسترسی به ذخیره‌سازی بسته است. برای جلوگیری از بازنویسی داده، ثبت پروژه غیرفعال است.', true);
      form.querySelector('button[type="submit"]').disabled = true;
      return null;
    }
  }

  function save(next) {
    try {
      if (localStorage.getItem(key) !== lastRaw) {
        setMessage('فهرست پروژه‌ها در زبانه دیگری تغییر کرده است؛ ابتدا فهرست را به‌روزرسانی کنید تا داده‌ها بازنویسی نشوند.', true);
        return false;
      }
      const raw=JSON.stringify(next);localStorage.setItem(key,raw);lastRaw=raw;
      projects = next;
      return true;
    } catch (_) {
      setMessage('ذخیره پروژه انجام نشد؛ دسترسی یا فضای ذخیره‌سازی مرورگر را بررسی کنید.', true);
      return false;
    }
  }

  function addText(parent, tag, value, className) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    node.textContent = value;
    parent.appendChild(node);
    return node;
  }

  function readTrash() {
    const raw = localStorage.getItem(trashKey);
    const entries = raw === null ? [] : JSON.parse(raw);
    if (!Array.isArray(entries) || entries.some(e => !e || !e.project || typeof e.project.id !== 'string' || typeof e.project.name !== 'string' || typeof e.deletedAt !== 'string') || new Set(entries.map(e => e.project.id)).size !== entries.length) throw new Error('invalid trash');
    return {raw, entries};
  }

  function renderTrash() {
    const target = byId('projectTrashList');
    target.replaceChildren();
    let entries;
    try { entries = readTrash().entries; }
    catch (_) { addText(target, 'p', 'فهرست پروژه‌های حذف‌شده خوانده نشد. برای حفظ اطلاعات، حذف پروژه غیرفعال است.', 'project-empty'); return; }
    if (!entries.length) { addText(target, 'p', 'پروژه حذف‌شده‌ای وجود ندارد.', 'project-empty'); return; }
    for (const entry of [...entries].reverse()) {
      const row = document.createElement('div'); row.className = 'project-item';
      addText(row, 'strong', entry.project.name);
      const restore = addText(row, 'button', 'بازیابی پروژه', 'btn secondary sm'); restore.type = 'button';
      restore.addEventListener('click', () => {
        let current;
        try { current = readTrash(); } catch (_) { setMessage('فهرست پروژه‌های حذف‌شده خوانده نشد.', true); return; }
        const found = current.entries.find(e => e.project.id === entry.project.id);
        if (!found || JSON.stringify(found) !== JSON.stringify(entry)) { setMessage('اطلاعات پروژه حذف‌شده تغییر کرده است؛ صفحه را تازه کنید.', true); return; }
        if (projects.some(p => p.id === entry.project.id)) { setMessage('پروژه‌ای با همین شناسه در فهرست وجود دارد؛ برای جلوگیری از بازنویسی، بازیابی انجام نشد.', true); return; }
        if (!save([...projects, found.project])) return;
        try {
          if (localStorage.getItem(trashKey) !== current.raw) throw new Error('changed');
          localStorage.setItem(trashKey, JSON.stringify(current.entries.filter(e => e.project.id !== entry.project.id)));
          render(); setMessage('پروژه بازیابی شد؛ چک‌لیست موجود آن نیز دوباره در دسترس است.');
        } catch (_) {
          render(); setMessage('پروژه بازیابی شد، اما نسخه سطل بازیافت باقی ماند. برای بررسی صفحه را تازه کنید.', true);
        }
      });
      target.appendChild(row);
    }
  }

  const number = value => new Intl.NumberFormat('fa-IR', {maximumFractionDigits: 2}).format(value);
  const normalize = value => String(value || '').normalize('NFKC').toLowerCase().replace(/[يى]/g,'ی').replace(/ك/g,'ک').replace(/[ً-ٰٟـ]/g,'').replace(/[‌‍\s]+/g,' ').trim();
  function render() {
    list.replaceChildren();
    renderTrash();
    const query=normalize(byId('projectSearch').value), status=byId('projectStatusFilter').value;
    const filtered=projects.filter(p=>(!query||normalize([p.name,p.city,p.type].filter(Boolean).join(' ')).includes(query))&&(!status||p.status===status));
    count.textContent = 'نمایش ' + number(filtered.length) + ' از ' + number(projects.length) + ' پروژه';
    if (!projects.length) {
      addText(list, 'p', 'هنوز پروژه‌ای ثبت نشده است. از فرم مقابل، نخستین پروژه را بسازید.', 'project-empty');
      return;
    }
    if (!filtered.length) {
      addText(list, 'p', 'پروژه‌ای با این جست‌وجو یا وضعیت پیدا نشد.', 'project-empty');
      return;
    }
    for (const project of [...filtered].reverse()) {
      const card = document.createElement('article');
      card.className = 'project-item';
      addText(card, 'h3', project.name);
      addText(card, 'p', [project.city || 'شهر مشخص نشده', project.type || 'نوع مشخص نشده', project.status || 'وضعیت مشخص نشده'].join(' · '));
      addText(card, 'p', 'مساحت: ' + (project.area === null ? 'ثبت نشده' : number(project.area) + ' مترمربع') + ' | بودجه: ' + (project.budget === null ? 'ثبت نشده' : number(project.budget) + ' تومان'));
      const actions = document.createElement('div');
      actions.className = 'project-actions';
      const checklist = addText(actions, 'button', 'چک‌لیست و بودجه', 'btn secondary sm');
      checklist.type = 'button';
      checklist.setAttribute('aria-label', 'چک‌لیست و بودجه پروژه ' + project.name);
      checklist.addEventListener('click', () => {
        if (!window.yasbuildosOpenChecklist || !window.yasbuildosOpenChecklist(project.id)) setMessage('باز کردن چک‌لیست ممکن نشد؛ فهرست پروژه‌ها را به‌روزرسانی کنید.', true);
      });
      const edit = addText(actions, 'button', 'ویرایش', 'btn secondary sm');
      edit.type = 'button';
      edit.setAttribute('aria-label', 'ویرایش پروژه ' + project.name);
      edit.addEventListener('click', () => {
        editing = project.id; editOriginal = JSON.stringify(project);
        byId('projectName').value = project.name;
        byId('projectCity').value = project.city || '';
        byId('projectType').value = project.type || '';
        byId('projectArea').value = project.area ?? '';
        window.budgetInputs.projectBudget.set(project.budget);
        byId('projectStatus').value = project.status || 'برنامه‌ریزی';
        byId('projectSubmit').textContent = 'ذخیره تغییرات';
        byId('projectCancel').hidden = false;
        byId('projectName').focus();
        setMessage('در حال ویرایش پروژه: ' + project.name);
      });
      const remove = addText(actions, 'button', 'حذف', 'btn secondary sm');
      remove.type = 'button';
      remove.setAttribute('aria-label', 'حذف پروژه ' + project.name);
      remove.addEventListener('click', () => {
        if (!confirm('پروژه «' + project.name + '» به فهرست پروژه‌های حذف‌شده در همین مرورگر منتقل شود؟')) return;
        let trash, written;
        try {
          trash = readTrash();
          if (trash.entries.some(e => e.project.id === project.id)) throw new Error('duplicate');
          if (localStorage.getItem(key) !== lastRaw || localStorage.getItem(trashKey) !== trash.raw) throw new Error('changed');
          written = JSON.stringify([...trash.entries, {project, deletedAt: new Date().toISOString()}]);
          localStorage.setItem(trashKey, written);
        } catch (_) { setMessage('انتقال به فهرست حذف‌شده‌ها انجام نشد؛ داده‌ها یا فضای مرورگر را بررسی و صفحه را تازه کنید.', true); return; }
        if (!save(projects.filter(item => item.id !== project.id))) {
          try { if (localStorage.getItem(trashKey) === written) { if (trash.raw === null) localStorage.removeItem(trashKey); else localStorage.setItem(trashKey, trash.raw); } } catch (_) {}
          renderTrash(); return;
        }
        if (editing === project.id) reset();
        render();
        setMessage('پروژه به فهرست حذف‌شده‌ها منتقل شد و در همین مرورگر قابل بازیابی است.');
      });
      card.appendChild(actions);
      list.appendChild(card);
    }
  }

  function reset() {
    form.reset();
    editing = null; editOriginal = null;
    byId('projectSubmit').textContent = 'ثبت پروژه';
    byId('projectCancel').hidden = true;
  }

  projects = read();
  if (projects === null) return;
  byId('projectSearch').addEventListener('input',render);
  byId('projectStatusFilter').addEventListener('change',render);
  byId('projectClearFilters').addEventListener('click',()=>{byId('projectSearch').value='';byId('projectStatusFilter').value='';render();byId('projectSearch').focus();});
  function refreshList() {
    const updated=read();if(updated===null)return;
    projects=updated;render();
    setMessage(editing?'فهرست به‌روزرسانی شد؛ اطلاعات فرم ویرایش حفظ شده‌اند.':'فهرست پروژه‌ها به‌روزرسانی شد.');
  }
  byId('projectReload').addEventListener('click',refreshList);
  render();
  window.addEventListener('storage', event => {
    if (event.key === trashKey) { renderTrash(); return; }
    if (event.key !== key && event.key !== null) return;
    setMessage('فهرست پروژه‌ها در زبانه دیگری تغییر کرد؛ پیش از ادامه آن را به‌روزرسانی کنید.', true);
  });
  window.addEventListener('yasbuildos-projects-updated', refreshList);
  byId('projectCancel').addEventListener('click', () => { reset(); setMessage('ویرایش لغو شد.'); });
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const name = byId('projectName').value.trim();
    const city = byId('projectCity').value.trim();
    const areaText = byId('projectArea').value;
    const area = areaText === '' ? null : Number(areaText);
    const budget = window.budgetInputs.projectBudget.get();
    if (!name || (area !== null && (!Number.isFinite(area) || area < 0)) || (budget !== null && (!Number.isFinite(budget) || budget < 0))) {
      setMessage('نام پروژه و مقادیر معتبر و غیرمنفی وارد کنید.', true);
      return;
    }
    const existing = editing ? projects.find(project => project.id === editing) : null;
    if (editing && !existing) { setMessage('پروژه برای ویرایش پیدا نشد؛ صفحه را دوباره باز کنید.', true); return; }
    if (existing && JSON.stringify(existing) !== editOriginal) { setMessage('این پروژه پس از شروع ویرایش تغییر کرده است؛ متن خود را نگه دارید، ویرایش را لغو کنید و پروژه را دوباره باز کنید.', true); return; }
    if (!existing && (!window.crypto || typeof crypto.randomUUID !== 'function')) {
      setMessage('ساخت شناسه پروژه در این مرورگر در دسترس نیست؛ لطفاً برنامه را در یک مرورگر به‌روز و اتصال امن باز کنید.', true);
      return;
    }
    const timestamp = new Date().toISOString();
    const project = {
      id: existing ? existing.id : crypto.randomUUID(), name, city,
      type: byId('projectType').value, area, budget,
      status: byId('projectStatus').value,
      createdAt: existing ? existing.createdAt : timestamp, updatedAt: timestamp
    };
    const next = existing ? projects.map(item => item.id === editing ? project : item) : [...projects, project];
    if (!save(next)) return;
    const wasEditing = Boolean(existing);
    reset();
    render();
    setMessage(wasEditing ? 'تغییرات پروژه روی همین مرورگر ذخیره شد.' : 'پروژه روی همین مرورگر ذخیره شد.');
  });
})();
