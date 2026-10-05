# عزل Boosthis من تطبيق المدير للتشخيص

هذا تغيير تشخيصي مؤقت للتحقق مما إذا كان تكامل Boosthis يسبب انهيار نسخة الإنتاج. أُجري على تطبيق المدير فقط؛ لم تتغير ملفات تطبيق العميل أو تطبيق الموصل.

## ما أُزيل

- مشغّل Boosthis ومتعقبات الشاشات من `admin-app/App.tsx` و`admin-app/src/screens/InventoryScreen.tsx` و`admin-app/src/screens/PaymentsScreen.tsx`.
- ملف التكامل `admin-app/src/monitoring/BoosthisRuntime.tsx`.
- اعتمادا npm المحليان `@workspace/boosthis-runtime-rn` و`boosthis-checklist` من `admin-app/package.json` و`admin-app/package-lock.json`.
- استثناءات EAS التي كانت تُضمّن ملفات checklist في الأرشيف من `admin-app/.easignore`.
- مجلدا الحزم المحلية بالكامل: `admin-app/lib/boosthis-runtime-rn/` و`admin-app/lib/boosthis-checklist/`.
- أداة Boosthis وإعداداتها: `admin-app/boosthis` و`admin-app/boosthis.config.json` و`admin-app/boosthis-kit-manifest.json`.
- وثائق Boosthis التي كانت ضمن مجلد تطبيق المدير: `INSTALL.md` و`DISCLAIMER.md` و`PRIVACY.md` و`QUICKSTART.md` و`SECURITY.md` و`TERMS.md`.
- متغير المشروع الاختياري `EXPO_PUBLIC_BOOSTHIS_PROJECT_KEY` من `admin-app/.env.example`.

حُدّث ملف القفل بعد إزالة الاعتمادين. لا ينبغي أن تحتوي حزمة JavaScript أو اعتماديات Android في بناء المدير على Boosthis.

## ما لم يتغير

- كود الشاشات والطلبات والمخزون والمدفوعات ووظائف التطبيق الأخرى.
- إعدادات Expo وEAS وملف تحديثات التطبيق.
- إعدادات وأسرار بيئة EAS البعيدة، وأي ملف `.env` محلي غير متعقب. لم تعد نسخة المدير تستخدم مفتاح Boosthis لأن التكامل أزيل.
- أي ملف من تطبيق العميل أو تطبيق الموصل.

## طريقة إعادة كل شيء

بعد معرفة نتيجة الاختبار، استخدم **Revert** على commit التشخيص في GitHub، أو نفّذ `git revert <commit-hash>` على commit الذي يحمل هذا التوثيق. سيعيد ذلك ملفات Boosthis المحذوفة وتعديلات التكامل وملف القفل معاً. لا تستخدم `git reset` على الفرع المشترك.

لرؤية القائمة الكاملة لكل ملف متأثر في ذلك commit، افتح تبويب **Files changed** في GitHub أو نفّذ `git show --name-status <commit-hash>`.

## بناء الاختبار

من GitHub Actions شغّل **Build Android production APKs**، واختر `admin-app` فقط. ثبّت APK الناتج واختبر التشغيل على الجهاز نفسه. فتح التطبيق بعد إزالة Boosthis يرجح أن التكامل أو إحدى اعتمادياته مشاركة في المشكلة؛ استمرار الانهيار يجعل Boosthis أقل احتمالاً ويوجه التحقيق إلى إعدادات الإنتاج أو الوحدات الأصلية الأخرى. هذه نتيجة عزل تشخيصي وليست وحدها تحديداً للسبب الجذري.

## تحذير Git في GitHub Actions

كان المستودع يسجل `backend` كرابط git submodule من دون ملف `.gitmodules`. إعادة إنتاج أمر التنظيف أعطت `fatal: No url found for submodule path 'backend' in .gitmodules` وخروجاً برمز 128. أُضيف تعريف الرابط إلى `.gitmodules` وحدد سير البناء صراحةً `submodules: false` لأن بناء تطبيقات الجوال لا يحتاج إلى تنزيل backend. هذا تحذير تنظيف Git في بيئة البناء؛ لا يدخل في APK ولا يفسر انهيار التطبيق بعد تثبيته. إذا ظهر الرمز 128 في خطوة أخرى غير تنظيف `actions/checkout`، يلزم فحص السطور المحيطة به لتحديد الخطأ الخاص بتلك الخطوة.
