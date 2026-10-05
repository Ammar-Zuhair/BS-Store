# إزالة Expo Updates مؤقتاً من تطبيق المدير

هذا تغيير تشخيصي مؤقت لأن انهيار نسخة الإنتاج بدأ بعد إضافة Expo Updates. يخص تطبيق المدير وحده. أُعيد في الوقت نفسه مسار الإشعارات الذي يتجاوز Expo Go ويواصل التسجيل في نسخ التطبيق المثبتة.

## ما أُزيل من المدير

- اعتماد `expo-updates` من `admin-app/package.json` و`admin-app/package-lock.json`.
- إعدادات `updates` ورابط EAS Update، وسياسة `runtimeVersion` من `admin-app/app.config.js`.
- قيم `channel` من ملفات بناء المدير `development` و`preview` و`production` في `admin-app/eas.json`.
- الفحص والتنزيل وإعادة التحميل عبر `expo-updates`، وشريط OTA، من `admin-app/src/system/SystemGate.tsx`.
- خاصية `safeToReload` التي كانت تخدم إعادة تحميل OTA من `admin-app/App.tsx`.

لم تُحذف آلية فحص الصيانة أو إصدار التطبيق عبر الـbackend، ولا رسائل التحديث الإلزامي ورابط تحديث التطبيق. يبقى `EXPO_PUBLIC_EAS_PROJECT_ID` وإعداد هوية EAS لأنهما مستخدمان لتسجيل الإشعارات.

## مسار الإشعارات

عاد `admin-app/src/notifications.ts` إلى التحميل المؤجل للمكتبة الأصلية مع فحص `isRunningInExpoGo()`: لا تُحمّل خدمة الإشعارات ولا يُطلب رمز دفع في Expo Go أو الويب، بينما تستمر تهيئتها وتسجيل الجهاز ومستمع الردود في نسخة Android المثبتة. لم تتغير تهيئة إشعارات العميل أو الموصل.

## الاستعادة إذا لم تكن Expo Updates السبب

من Git استخدم حالة المدير قبل commit هذا التغيير لاستعادة الملفات التالية فقط، مع إبقاء `admin-app/src/notifications.ts` على مسار Expo Go الحالي:

```sh
git restore --source=<parent-commit> -- \
  admin-app/package.json \
  admin-app/package-lock.json \
  admin-app/app.config.js \
  admin-app/eas.json \
  admin-app/src/system/SystemGate.tsx \
  admin-app/App.tsx
npm --prefix admin-app ci
```

استخدمت هنا الالتزام السابق للتغيير `1fa11b9`. هذه الاستعادة تعيد إعدادات Expo Updates وكود OTA فقط، ولا تعيد مسار الإشعارات المباشر الذي أُزيل.

## الاختبار

ابنِ تطبيق المدير فقط من GitHub Actions وثبّت APK الناتج على الجهاز نفسه. إذا اختفى الانهيار، فهذا يرجّح وجود تضارب في Expo Updates أو تهيئته؛ وإذا استمر، فانتقل إلى فحص سبب آخر في نسخة الإنتاج. لم تُبنَ APK ضمن هذا التغيير.
