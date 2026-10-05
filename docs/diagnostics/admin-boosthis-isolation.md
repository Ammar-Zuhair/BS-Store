# عزل Boosthis من تطبيق المدير للتشخيص

هذا سجل تجربة عزل Boosthis المؤقتة في الالتزام `e4f9ab9`. بعد أن استمر انهيار نسخة الإنتاج، أُعيدت ملفات Boosthis إلى تطبيق المدير لأن الاختبار أظهر أن Boosthis ليس سبب المشكلة على الأرجح. لم تتغير ملفات تطبيق العميل أو تطبيق الموصل في التجربة أو الاستعادة.

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

## حالة الاستعادة

أُعيدت الملفات من الحالة السابقة للالتزام `e4f9ab9` ضمن التغييرات الحالية. لا تنفّذ `git revert e4f9ab9` الآن؛ فهذا الالتزام هو تجربة الحذف وسيحذف الملفات مجدداً. لإعادة تجربة العزل مستقبلاً فقط، يمكن استعادة حالة المدير المعزولة بالأمر `git restore --source=e4f9ab9 -- admin-app`.

القائمة الكاملة للملفات التي حذفتها التجربة موجودة في تبويب **Files changed** للالتزام `e4f9ab9` أو عبر `git show --name-status e4f9ab9`.

## بناء الاختبار

اختبار النسخة المعزولة انتهى مع استمرار الانهيار، ما يقلل احتمال أن يكون Boosthis سبب المشكلة. يعاد بناء نسخة المدير الحالية بعد التغييرات الجديدة من GitHub Actions باختيار `admin-app` فقط.

## تحذير Git في GitHub Actions

كان المستودع يسجل `backend` كرابط git submodule من دون ملف `.gitmodules`. إعادة إنتاج أمر التنظيف أعطت `fatal: No url found for submodule path 'backend' in .gitmodules` وخروجاً برمز 128. أُضيف تعريف الرابط إلى `.gitmodules` وحدد سير البناء صراحةً `submodules: false` لأن بناء تطبيقات الجوال لا يحتاج إلى تنزيل backend. هذا تحذير تنظيف Git في بيئة البناء؛ لا يدخل في APK ولا يفسر انهيار التطبيق بعد تثبيته. إذا ظهر الرمز 128 في خطوة أخرى غير تنظيف `actions/checkout`، يلزم فحص السطور المحيطة به لتحديد الخطأ الخاص بتلك الخطوة.
