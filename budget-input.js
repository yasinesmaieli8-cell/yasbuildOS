(() => {
  const limit = 1000000000000000;
  const units = ['', 'یک', 'دو', 'سه', 'چهار', 'پنج', 'شش', 'هفت', 'هشت', 'نه'];
  const teens = ['ده', 'یازده', 'دوازده', 'سیزده', 'چهارده', 'پانزده', 'شانزده', 'هفده', 'هجده', 'نوزده'];
  const tens = ['', '', 'بیست', 'سی', 'چهل', 'پنجاه', 'شصت', 'هفتاد', 'هشتاد', 'نود'];
  const hundreds = ['', 'صد', 'دویست', 'سیصد', 'چهارصد', 'پانصد', 'ششصد', 'هفتصد', 'هشتصد', 'نهصد'];
  const scales = ['', 'هزار', 'میلیون', 'میلیارد', 'تریلیون', 'هزار تریلیون'];
  const ascii = value => value.replace(/[۰-۹٠-٩]/g, digit => String(digit.charCodeAt(0) - (digit <= '۹' ? 1776 : 1632)));
  function words(integer) {
    if (!integer) return 'صفر';
    const parts = [];
    for (let scale = 0; integer > 0; scale++, integer = Math.floor(integer / 1000)) {
      const group = integer % 1000;
      if (!group) continue;
      const bits = [];
      const h = Math.floor(group / 100), rest = group % 100;
      if (h) bits.push(hundreds[h]);
      if (rest >= 10 && rest < 20) bits.push(teens[rest - 10]);
      else { if (rest >= 20) bits.push(tens[Math.floor(rest / 10)]); if (rest % 10) bits.push(units[rest % 10]); }
      if (scales[scale]) bits.push(scales[scale]);
      parts.unshift(bits.join(' و ').replace(/ و (هزار|میلیون|میلیارد|تریلیون|هزار تریلیون)$/, ' $1'));
    }
    return parts.join(' و ');
  }
  function parse(value) {
    const raw = ascii(value).replace(/[٬،,\s]/g, '').replace(/٫/g, '.');
    if (!raw) return { empty: true };
    if (!/^\d+(?:\.\d*)?$/.test(raw)) return { error: 'فقط عدد غیرمنفی وارد کنید.' };
    const [integer, fraction = ''] = raw.split('.');
    const whole = BigInt(integer);
    const number = Number(raw);
    if (!Number.isFinite(number) || whole > BigInt(limit) || (whole === BigInt(limit) && /[1-9]/.test(fraction))) return { error: 'مبلغ نمی‌تواند بیشتر از ۱٬۰۰۰٬۰۰۰٬۰۰۰٬۰۰۰٬۰۰۰ تومان باشد.' };
    return { raw, number };
  }
  function setupElements(input, hint) {
    function refresh(keepCursor = false) {
      const position = input.selectionStart;
      const before = keepCursor && position !== null ? ascii(input.value.slice(0, position)).replace(/[^0-9.٫]/g, '').length : null;
      const data = parse(input.value);
      input.setCustomValidity(data.error || '');
      if (data.error) { hint.textContent = data.error; return; }
      if (data.empty) { hint.textContent = 'مبلغ را به تومان وارد کنید.'; return; }
      const [integer, fraction] = data.raw.split('.');
      const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, '٬');
      input.value = (grouped + (fraction !== undefined ? '٫' + fraction : '')).replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);
      hint.textContent = words(Number(integer)) + (fraction && /[1-9]/.test(fraction) ? ' تومان و بخش اعشاری ۰٫' + fraction.replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]) + ' تومان' : ' تومان');
      if (before !== null) {
        let seen = 0, cursor = 0;
        while (cursor < input.value.length && seen < before) { if (/[۰-۹٫]/.test(input.value[cursor])) seen++; cursor++; }
        input.setSelectionRange(cursor, cursor);
      }
    }
    input.addEventListener('input', () => refresh(true));
    if (input.form) input.form.addEventListener('reset', () => queueMicrotask(() => refresh()));
    refresh();
    return { get: () => { const data = parse(input.value); return data.empty ? null : data.error ? NaN : data.number; }, set: value => { input.value = value == null ? '' : String(value); refresh(); } };
  }
  window.budgetInputs = Object.fromEntries(['projectBudget', 'cloudProjectBudget', 'checkReserve', 'checkUnitPrice', 'checkExtra', 'checkPaid', 'checkStageBudget'].map(id => [id, setupElements(document.getElementById(id), document.getElementById(id + 'Hint'))]));
  window.budgetInputs.attach = setupElements;
})();
