'use strict';
(() => {
  const form = document.getElementById('delete-form');
  const button = document.getElementById('submit');
  const result = document.getElementById('result');
  let sending = false;
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (sending || !form.reportValidity()) return;
    const api = new URL(window.BSSTORE_API_URL);
    if (api.protocol !== 'https:') {
      result.hidden = false; result.textContent = 'تعذر الاتصال الآمن بالخادم. تواصل مع الدعم.'; return;
    }
    sending = true; button.disabled = true; button.textContent = 'جارٍ حذف الحساب…';
    result.hidden = false; result.className = ''; result.textContent = 'جارٍ التحقق من البيانات وتنفيذ الحذف…';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);
    try {
      const response = await fetch(`${api.href.replace(/\/$/, '')}/account/delete-with-password`, {
        method: 'POST', credentials: 'omit', cache: 'no-store', signal: controller.signal,
        headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
        body: JSON.stringify({ phone: document.getElementById('phone').value.trim(), password: document.getElementById('password').value }),
      });
      let body;
      try { body = await response.json(); } catch { throw new Error('تعذر قراءة رد الخادم. تحقق من الاتصال أو تواصل مع الدعم.'); }
      if (!response.ok || body.success !== true) {
        throw new Error(response.status === 429 ? 'عدد المحاولات كبير. انتظر 15 دقيقة ثم حاول مجدداً.' : body.message || 'تعذر تنفيذ الحذف. راجع البيانات أو تواصل مع الدعم.');
      }
      form.reset(); form.hidden = true; result.className = 'success';
      result.textContent = body.message || 'تم حذف حسابك وبياناتك الشخصية بنجاح.';
    } catch (error) {
      result.className = 'error';
      result.textContent = error.name === 'AbortError'
        ? 'انتهت مهلة الاتصال. قد يكون الحذف قد تم بالفعل؛ تحقق من حسابك أو تواصل مع الدعم قبل المحاولة مجدداً.'
        : error instanceof TypeError ? 'تعذر الوصول إلى الخادم. تحقق من اتصالك أو تواصل مع الدعم.' : error.message;
    } finally {
      clearTimeout(timeout); sending = false; button.disabled = false;
      document.getElementById('password').value = ''; button.textContent = 'حذف حسابي نهائياً';
    }
  });
})();
