# إزالة Expo Updates مؤقتاً من تطبيق المدير

هذا سجل تجربة إزالة Expo Updates من تطبيق المدير مؤقتاً. لم تختفِ المشكلة بعد بناء النسخة من دون Expo Updates، لذلك أُعيدت إعداداته واعتمادياته من الالتزام `1fa11b9`. بقي مسار الإشعارات الذي يتجاوز Expo Go ويعمل في نسخ التطبيق المثبتة كما هو.

## ما أُزيل من المدير

- اعتماد `expo-updates` من `admin-app/package.json` و`admin-app/package-lock.json`.
- إعدادات `updates` ورابط EAS Update، وسياسة `runtimeVersion` من `admin-app/app.config.js`.
- قيم `channel` من ملفات بناء المدير `development` و`preview` و`production` في `admin-app/eas.json`.
- الفحص والتنزيل وإعادة التحميل عبر `expo-updates`، وشريط OTA، من `admin-app/src/system/SystemGate.tsx`.
- خاصية `safeToReload` التي كانت تخدم إعادة تحميل OTA من `admin-app/App.tsx`.

لم تُحذف آلية فحص الصيانة أو إصدار التطبيق عبر الـbackend، ولا رسائل التحديث الإلزامي ورابط تحديث التطبيق. يبقى `EXPO_PUBLIC_EAS_PROJECT_ID` وإعداد هوية EAS لأنهما مستخدمان لتسجيل الإشعارات.

## مسار الإشعارات

عاد `admin-app/src/notifications.ts` إلى التحميل المؤجل للمكتبة الأصلية مع فحص `isRunningInExpoGo()`: لا تُحمّل خدمة الإشعارات ولا يُطلب رمز دفع في Expo Go أو الويب، بينما تستمر تهيئتها وتسجيل الجهاز ومستمع الردود في نسخة Android المثبتة. لم تتغير تهيئة إشعارات العميل أو الموصل.

## حالة الاستعادة

اكتملت الاستعادة للملفات التالية من `1fa11b9`، مع إبقاء `admin-app/src/notifications.ts` على مسار Expo Go الحالي:

```sh
git restore --source=1fa11b9 -- \
  admin-app/package.json \
  admin-app/package-lock.json \
  admin-app/app.config.js \
  admin-app/eas.json \
  admin-app/src/system/SystemGate.tsx \
  admin-app/App.tsx
npm --prefix admin-app ci
```

يعرض سجل التغييرات أعلاه كل ما أُزيل مؤقتاً: الاعتمادية والقفل، إعدادات المشروع والقنوات، وفحص OTA وتنزيله وإعادة تحميله في `SystemGate`. آلية إصدار التطبيق عبر الـbackend بقيت موجودة أثناء التجربة.

## الاختبار

بعد الاستعادة ابنِ تطبيق المدير فقط من GitHub Actions وثبّت APK الناتج على الجهاز نفسه، ثم اجمع سجلات Android عند الانهيار. لم تُبنَ APK ضمن هذا التغيير.
