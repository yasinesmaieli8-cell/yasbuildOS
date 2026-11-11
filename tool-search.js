(() => {
  'use strict';
  const aliases = {
    'طراحی هوشمند راه‌پله': 'پله راه پله پلکان',
    'محاسبه وزن و تعداد میلگرد': 'آرماتور وزن آهن تعداد شاخه برش میلگرد',
    'محاسبه پی نواری و منفرد': 'فونداسیون شالوده',
    'ظرفیت باربری پی': 'باربری فونداسیون شالوده',
    'نشست پی سطحی': 'نشست فونداسیون شالوده',
    'برآورد دیوار آجری و بلوکی': 'دیوارچینی بلوک آجر',
    'حجم خاک‌برداری': 'گودبرداری گود خاک برداری',
    'مقدار کاشی و سرامیک': 'کفپوش سرامیک کاشی کاری',
    'رنگ‌آمیزی سطوح': 'نقاشی رنگ',
    'طراحی صفحه‌ستون': 'بیس پلیت بیس پلیت ستون',
    'تبدیل واحدهای مهندسی': 'تبدیل واحد یکا',
    'برنامه‌ریزی زمان‌بندی': 'زمان بندی زمانبندی مدت برنامه ریزی'
  };
  function normalize(value) {
    return String(value || '').normalize('NFKC').toLowerCase()
      .replace(/[يى]/g,'ی').replace(/ك/g,'ک').replace(/[ً-ٰٟـ]/g,'')
      .replace(/[‌‍\s]+/g,' ').trim();
  }
  function matches(name, category, query) {
    const words = normalize(query).split(' ').filter(Boolean);
    const haystack = normalize(name + ' ' + category + ' ' + (aliases[name] || ''));
    const compact = haystack.replace(/ /g,'');
    return words.every(word => haystack.includes(word) || compact.includes(word));
  }
  globalThis.YasToolSearch = {normalize, matches};
})();
