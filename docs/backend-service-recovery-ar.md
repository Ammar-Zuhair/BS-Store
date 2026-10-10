# استعادة خدمة الخادم والنفق

## سبب انقطاع أكتوبر 2026

أظهر سجل الحاوية إقلاعاً جديداً بتاريخ 9 أكتوبر 2026 الساعة 22:04 UTC.
بعد الإقلاع لم تكن خدمتا `bsstore-backend.service` و`bsstore-tunnel.service`
موجودتين، ولم يكن المنفذ 5295 يستمع. أعاد رابط التطبيق خطأ
`ERR_NGROK_3200` لأن النفق غير متصل. كانت الخدمات السابقة مؤقتة
(`systemd-run`) ولا يعاد إنشاؤها بعد الإقلاع.
لا يحدد سجل الحاوية سبب إعادة تشغيلها من جانب المنصة.

## إعداد التشغيل

الملفات في `scripts/systemd/` تنشئ خدمات دائمة مفعّلة عند الإقلاع،
وتعيد تشغيل العمليات إذا توقفت. يبقى الرابط المستخدم في التطبيقات:

`https://implosive-exchange-compacter.ngrok-free.dev/api`

لتثبيت الخدمات، بعد توفر الأدوات وملفات الخادم المنشورة:

```bash
bash /workspace/scripts/install-backend-services.sh
```

الخادم يستعمل محمل dotenv الموجود فيه. النفق يقرأ فقط `NGROK_AUTHTOKEN`
من ملف أسرار المشروع `/workspace/.env` عند بدء التشغيل، ولا يضع قيمته
في ملف خدمة أو وسيطة أمر. يعمل الخادم في بيئة `Production`.

## إعادة إنشاء الحاوية

الخدمات الدائمة تعود تلقائياً عند إعادة إقلاع **الحاوية نفسها**.
عند استبدال الحاوية بالكامل، لا تبقى ملفات `/etc/systemd/system`.
قوالب الخدمات والأدوات وملفات الخادم داخل `/workspace` تبقى؛ شغّل:

```bash
bash /workspace/setup.sh
```

يعيد هذا تثبيت الخدمات وتفعيلها. يجب تشغيله ضمن إعادة تهيئة الحاوية؛
وجوده في المستودع وحده لا يجعل منصة الاستضافة تنفذه تلقائياً.

## التحقق وإعادة التشغيل

```bash
systemctl is-enabled bsstore-backend.service bsstore-tunnel.service
systemctl is-active bsstore-backend.service bsstore-tunnel.service
ss -ltnp '( sport = :5295 )'
curl -fsS http://127.0.0.1:5295/health
curl -fsS -H 'ngrok-skip-browser-warning: true' https://implosive-exchange-compacter.ngrok-free.dev/api/health
systemctl restart bsstore-backend.service
systemctl restart bsstore-tunnel.service
```

لمراجعة أخطاء التشغيل استخدم `journalctl -u bsstore-backend.service`
أو `journalctl -u bsstore-tunnel.service`. لا تنشر سجلات تحتوي بيانات شخصية.
يُستخدم `scripts/restart-backend.sh` كالمعتاد عند تعديل كود الخادم.
