# بناء تطبيقات Android عبر GitHub Actions

أُضيف سير عمل يدوي يبني تطبيقات المدير والعميل والموصل على مشغّل Ubuntu مستضاف من GitHub. يستخدم البناء `eas build --local`، لذلك تتم عملية Gradle وتجميع APK على مشغّل GitHub ولا تستهلك حصة بناء EAS السحابية. يظل Expo مستخدماً للمصادقة وقراءة إعدادات المشاريع وبيانات التوقيع المخزنة لديه.

## الإعداد مرة واحدة

1. أنشئ Expo access token من حساب Expo الذي يملك مشاريع التطبيقات الثلاثة.
2. في مستودع GitHub افتح **Settings → Secrets and variables → Actions → New repository secret**. أضف السر باسم `EXPO_TOKEN` وضع قيمة Expo access token فيه.
3. تأكد من أن بيانات الاعتماد/مفتاح توقيع Android موجودة في **EAS Credentials** لكل مشروع. لا ترفع keystore أو كلمة مروره إلى GitHub؛ سيحمّلها EAS أثناء البناء.
4. تأكد أن بيئة `production` في كل مشروع Expo تحتوي متغيرات البناء المستخدمة لذلك التطبيق. يلزم `EXPO_PUBLIC_API_URL` لإعداد الإنتاج. وقد تستخدم التطبيقات أيضاً `EXPO_PUBLIC_CARTO_API_KEY` أو `EXPO_PUBLIC_BOOSTHIS_PROJECT_KEY`. رقم مشروع EAS موجود بالفعل في `app.json` لكل تطبيق؛ إذا ضبطت `EXPO_PUBLIC_EAS_PROJECT_ID` في Expo فيجب أن يطابق رقم المشروع الخاص بهذا التطبيق.

متغيرات `EXPO_PUBLIC_*` تُضمّن في تطبيق العميل ويمكن استخراجها من APK؛ لا تضع فيها كلمات مرور أو مفاتيح خادم. اجعل ظهور متغيرات البناء في Expo من نوع **Plain text** أو **Sensitive**، لأن البناء المحلي عبر EAS لا يستطيع جلب متغيرات EAS من نوع **Secret**.

## تشغيل البناء

1. افتح تبويب **Actions** في المستودع.
2. اختر **Build Android production APKs** ثم **Run workflow** على فرع `main`.
3. بعد اكتمال المهمة نزّل artifact باسم `production-apks-<رقم التشغيل>`. يحتوي ملفات APK الثلاثة، ويظل متاحاً 14 يوماً.

يبني سير العمل التطبيقات بالتتابع على المشغّل نفسه لتقليل استهلاك الذاكرة. إذا فشل تطبيق، افتح سجلات خطوة **Build production APKs on this runner** لمعرفة السبب؛ وقد يظل APK لأي تطبيق اكتمل قبله متاحاً في artifact.

## ملفات البيئة والأسرار

اترك ملفات `.env` وملفات المفاتيح مستثناة في `.gitignore`. لا تجعلها قابلة للتتبع حتى لو كان المستودع خاصاً؛ سجل Git والنسخ المحلية وملفات البناء ليست مخزناً للأسرار. لا يحتاج سير العمل إلى رفع `.env` لأن إعدادات الإنتاج تُقرأ من بيئة Expo، أما سر GitHub الوحيد المطلوب فهو `EXPO_TOKEN`. ملفات `google-services.json` الخاصة بتطبيقات Android موجودة بالفعل في المستودع؛ لا ترفع ملفات Firebase Admin أو service-account.

## نشر تحديثات Expo OTA

إعداد التطبيقات الثلاثة يتضمن `expo-updates`، ورابط تحديثات EAS، و`runtimeVersion` حسب `appVersion`، وقناة `production` في ملف `eas.json`. كما أن التطبيق يفحص التحديثات يدوياً بعد بدء الواجهة. بناء APK جديد عبر هذا السير سيضمّن إعدادات التحديث الحالية.

انشر تحديث Android لكل تطبيق على حدة، من مجلده، لأن لكل تطبيق مشروع Expo منفصلاً:

```bash
cd customer-app
eas update --channel production --message "Fix login screen" --environment production --platform android

cd ../admin-app
eas update --channel production --message "Fix login screen" --environment production --platform android

cd ../courier-app
eas update --channel production --message "Fix login screen" --environment production --platform android
```

تصل تحديثات OTA إلى النسخ المبنية مسبقاً إذا كانت قناة التحديث ونسخة `runtimeVersion` متوافقتين. تصلح OTA تغييرات JavaScript والأنماط والصور والموارد؛ أما تغيير مكتبات أو إعدادات أصلية مثل الصلاحيات أو plugins فيحتاج APK جديداً، ومع سياسة `appVersion` يجب رفع رقم نسخة التطبيق لتكوين runtime جديد عند إصدار التغيير الأصلي.
