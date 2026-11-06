// پروژه‌های این نسخه فقط در مرورگر همین دستگاه نگهداری می‌شوند.
(() => {
  const key = 'yasbuildos.projects.v1';
  const byId = id => document.getElementById(id);
  const form = byId('projectForm');
  const message = byId('projectMessage');
  const list = byId('projectList');
  const count = byId('projectCount');
  let editing = null;
  let projects;

  function setMessage(text, isError = false) {
    message.textContent = text;
    message.classList.toggle('error', isError);
  }

  function read() {
    try {
      const stored = localStorage.getItem(key);
      if (stored === null) return [];
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed) || parsed.some(item => !item || typeof item.id !== 'string' || typeof item.name !== 'string')) throw new Error('invalid');
      return parsed;
    } catch (_) {
      setMessage('داده‌های پروژه خوانده نشدند یا دسترسی به ذخیره‌سازی بسته است. برای جلوگیری از بازنویسی داده، ثبت پروژه غیرفعال است.', true);
      form.querySelector('button[type="submit"]').disabled = true;
      return null;
    }
  }

  function save(next) {
    try {
      localStorage.setItem(key, JSON.stringify(next));
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

  const number = value => new Intl.NumberFormat('fa-IR', {maximumFractionDigits: 2}).format(value);
  function render() {
    list.replaceChildren();
    count.textContent = number(projects.length) + ' پروژه';
    if (!projects.length) {
      addText(list, 'p', 'هنوز پروژه‌ای ثبت نشده است. از فرم مقابل، نخستین پروژه را بسازید.', 'project-empty');
      return;
    }
    for (const project of [...projects].reverse()) {
      const card = document.createElement('article');
      card.className = 'project-item';
      addText(card, 'h3', project.name);
      addText(card, 'p', [project.city || 'شهر مشخص نشده', project.type || 'نوع مشخص نشده', project.status || 'وضعیت مشخص نشده'].join(' · '));
      addText(card, 'p', 'مساحت: ' + (project.area === null ? 'ثبت نشده' : number(project.area) + ' مترمربع') + ' | بودجه: ' + (project.budget === null ? 'ثبت نشده' : number(project.budget) + ' تومان'));
      const actions = document.createElement('div');
      actions.className = 'project-actions';
      const edit = addText(actions, 'button', 'ویرایش', 'btn secondary sm');
      edit.type = 'button';
      edit.setAttribute('aria-label', 'ویرایش پروژه ' + project.name);
      edit.addEventListener('click', () => {
        editing = project.id;
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
        if (!confirm('پروژه «' + project.name + '» از این مرورگر حذف شود؟')) return;
        if (!save(projects.filter(item => item.id !== project.id))) return;
        if (editing === project.id) reset();
        render();
        setMessage('پروژه از همین مرورگر حذف شد.');
      });
      card.appendChild(actions);
      list.appendChild(card);
    }
  }

  function reset() {
    form.reset();
    editing = null;
    byId('projectSubmit').textContent = 'ثبت پروژه';
    byId('projectCancel').hidden = true;
  }

  projects = read();
  if (projects === null) return;
  render();
  window.addEventListener('storage', event => {
    if (event.key !== key && event.key !== null) return;
    const updated = read();
    if (updated === null) return;
    projects = updated;
    if (editing) reset();
    render();
    setMessage('فهرست پروژه‌ها از تغییرات پنجره دیگر به‌روزرسانی شد.');
  });
  window.addEventListener('yasbuildos-projects-updated', () => {
    const updated = read();
    if (updated === null) return;
    projects = updated;
    if (editing) reset();
    render();
  });
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
