# النشر والتحديثات

## الوضع الحالي

- لكل من تطبيق العميل والمدير والموصل مشروع Expo مستقل ومُعرّف مسبقاً في إعدادات التطبيق.
- أُضيف `expo-updates` المتوافق مع Expo SDK 57 إلى التطبيقات الثلاثة. تُشتق قيمة `updates.url` من معرّف المشروع الموجود في الإعدادات؛ لا تضف معرّفاً جديداً يدوياً.
- `runtimeVersion` يتبع `appVersion`. تغييرات JavaScript والأصول فقط يمكن إرسالها OTA إلى runtime متوافق. إضافة مكتبة Native أو ترقية SDK أو أي تغيير Native تتطلب Binary جديداً ورفع `expo.version` قبل النشر.
- الإعدادات الحالية تستهدف Android. واجهات Backend تقبل Android وiOS، لكن إعداد iOS الفعلي يحتاج `ios.bundleIdentifier` وملف اعتماد/بناء صالحاً، وهي بيانات غير موجودة حالياً.

## ملفات التعريف والقنوات

لكل تطبيق ملفات بناء مستقلة:

| الملف | القناة | الناتج |
|---|---|---|
| `development` | `preview` | Development client داخلي |
| `preview` | `preview` | APK داخلي للاختبار |
| `production` | `production` | APK داخلي، حفاظاً على نوع التوزيع الموجود |
| `production-aab` | `production` | Android App Bundle للتوزيع عبر المتجر |

القناة مثبتة في Binary وقت البناء. تحديثات `preview` لا تصل إلى Binary مبني على `production`، والعكس صحيح. إعداد `production` الحالي ما زال يوزع APK داخلياً؛ ملف `production-aab` يضيف مسار AAB دون تغيير هذا السلوك.

## إصدار Binary جديد

نفذ الأوامر من مجلد التطبيق المطلوب (`customer-app` أو `admin-app` أو `courier-app`):

```bash
eas build --profile preview --platform android
eas build --profile production --platform android
eas build --profile production-aab --platform android
```

لإصدار متوافق مع تغييرات Native:

1. ارفع `expo.version` في `app.json` للتطبيق المعني.
2. راجع رقم البناء الذي يديره EAS وملف البناء المطلوب.
3. ابنِ Binary جديداً؛ لا ترسل تغييرات Native عبر OTA.
4. اختبر APK/AAB على أجهزة الاختبار قبل توزيعه.
5. حدّث إعداد التطبيق والمنصة في Admin App بعد تجهيز رابط التحديث المعتمد.

## إرسال EAS Update

بعد تثبيت Binary يحتوي `expo-updates` واختباره على القناة المناسبة، ومن مجلد التطبيق نفسه:

```bash
eas update --channel preview --message "وصف التغيير" --environment preview
eas update --channel production --message "وصف التغيير" --environment production
```

لا تنفذ الأمر الثاني قبل اختبار التغيير على Binary متوافق ومراجعته. يحتاج EAS إلى تسجيل دخول وصلاحيات المشروع. يجب توفير `EXPO_PUBLIC_API_URL` في EAS Environment المستخدمة لكل قناة؛ إعداد `app.config.js` يرفض بناءً لا يملك عنوان API ثابتاً وآمناً. اختر عنوان API للمعاينة وفق بيئة المشروع؛ لا تُستخدم قيمة تطوير/نفق في Production.

EAS Update يرسل JavaScript والأصول إلى القناة المحددة. لا يرسل APK/AAB ولا يضيف مكتبة Native جديدة. يبدأ التطبيق من الحزمة المضمنة، ثم يفحص التحديث من JavaScript بعد اكتمال فحوص النظام وظهور الواجهة. يمكن تنزيل التحديث أثناء الجلسة؛ واجهة التطبيق لا تعيد التحميل تلقائياً أثناء Checkout أو الدفع/الإيصال أو شراء/تسليم الموصل. يطبق المستخدم التحديث يدوياً من الشريط عندما تكون الشاشة آمنة.

## runtimeVersion والتوافق

الاستراتيجية هي `runtimeVersion: { "policy": "appVersion" }`. runtime يأخذ قيمة `expo.version`؛ لا ترفع هذا الرقم لإصدار JavaScript عادي. ارفعه عندما يتغير native runtime، وابنِ Binary جديداً بالقيمة ذاتها قبل نشر OTA لها. ستظل الإصدارات القديمة المدعومة بحاجة لعقود API المتوافقة حتى ترفع الإدارة `minimumSupportedVersion`.

## App Version API

تطبيقات العميل والمدير والموصل تستعلم عند التشغيل من:

```text
GET /api/app-version?appType=customer&platform=android&currentVersion=1.0.0&buildNumber=...
```

القيم المدعومة لـ`appType`: `customer`, `admin`, `courier`؛ والمنصة: `android`, `ios`. يقارن Backend إصدارات SemVer، ورقم البناء اختيارياً.

- `LatestVersion`: وجود إصدار أحدث يعرض تحديثاً اختيارياً.
- `MinimumSupportedVersion`: الإصدار الأدنى الذي يسمح بدخول التطبيق. ما دونه يتطلب تحديثاً.
- `LatestBuildNumber` و`MinimumBuildNumber`: حدّان اختياريان لأرقام البناء.
- `UpdateUrl`: رابط HTTPS لتوزيع Binary. لا يوجد رابط متجر مضاف تلقائياً؛ احفظ الرابط المعتمد من المالك قبل جعل أي إصدار إلزامياً.
- `IsActive`: إيقاف السياسة يجعل التطبيق يتابع عمله دون فرض التحديث.

يرفض Backend رفع حد الإصدار/البناء الأدنى ما لم يُرسل المدير رابط HTTPS للتحديث مع التغيير، حتى لا يُحجب مستخدمون بلا مسار تحديث.

تهيئ Migration سجلات Android الثلاثة على `1.0.0` للحدين، دون رابط توزيع. لهذا لن يظهر تحديث عند أول تشغيل. شاشة إدارة النظام في Admin App تتيح إعداد إصدار ومنصة مستقلة. لا ترفع الحد الأدنى إلا بعد توفر Binary ورابطه.

مسارات المدير:

- `GET /api/admin/app-versions`
- `PUT /api/admin/app-versions/{appType}/{platform}`

تتطلب التعديلات دور `Admin` أو `SuperAdmin` من Backend، وتُسجل في `AuditLogs`.

## التوافق الخلفي وDatabase

المسارات الجديدة مضافة دون حذف أو تغيير المسارات الحالية. Migration `20261004160000_AddAppVersionAndBroadcastManagement` تضيف جدولي إعدادات الإصدارات وسجل البث وتزرع الإعدادات الابتدائية. إعداد الصيانة يعيد استخدام `AppSettings`، والتدقيق يعيد استخدام `AuditLogs`.

طُبقت migrations المعلقة على قاعدة PostgreSQL المضبوطة للـBackend بعد مراجعة SQL idempotent. تحقق سجل EF من آخر migration والجداول الخمسة الجديدة وثلاثة إعدادات Android ابتدائية. التغييرات توسعية ولم تحذف جداول أو بيانات. بدء الخدمة ما زال يطبق أي migrations مستقبلية تلقائياً؛ راجعها واختبرها قبل النشر.

## Maintenance Mode

من Admin App افتح **الضبط ← إدارة النظام**. أدخل عنوان الرسالة ونصها ووقت العودة إن عُرف، ثم أكد التفعيل. الإيقاف له تأكيد مستقل. يمكن تحديد إرسال إشعار منفصل للعملاء؛ حفظ الصيانة لا يعتمد على نجاح إرسال Push.

- `GET /api/system/status` عام ويعرض حالة الصيانة ورسالتها فقط.
- `GET /api/admin/system/maintenance` و`PUT /api/admin/system/maintenance` للمدير المخول.
- Middleware يمنع طلبات API الاعتيادية بـ`503` و`code=MAINTENANCE_MODE` للعملاء/الموصلين؛ يترك الصحة والحالة وفحص الإصدار وتسجيل الدخول متاحة. يمكن للمدير المصادق تجاوز الحجب وإيقاف الصيانة.
- تعرض تطبيقات العميل والموصل حالة الصيانة بالعربية وتعيد فحصها عند الطلب، وعند الرجوع للتطبيق، وكل 60 ثانية. إذا كان الموصل داخل مهمة، تبقى شاشة المهمة مركبة ويظهر تنبيه الصيانة بدلاً من فقدان حالتها؛ يظهر حاجب التحديث الإلزامي للموصل عند نقطة آمنة. عند بدء التشغيل تنتظر التطبيقات استجابة الإصدار/الحالة أو مهلة 5 ثوانٍ؛ تعذر الوصول إلى API لا يقفل التطبيق.

## إرسال Broadcast وسجلّه

من **الضبط ← إشعارات العملاء** اختر النوع واكتب العنوان والنص وراجع المعاينة، ثم أكد الإرسال. Backend يختار الأجهزة النشطة ذات دور Customer و`AppType=customer` من قاعدة البيانات، ويزيل تكرار الرموز ويرسل على دفعات في Background Worker. لا تقبل الواجهة رموز Push يدوية أو بيانات تنقل عشوائية.

- `POST /api/admin/notifications/broadcasts` ينشئ مهمة ويرجع `202 Accepted`.
- `GET /api/admin/notifications/broadcasts` يعرض الحالة والأعداد.
- حالات المهمة: `Pending`, `Processing`, `Completed`, `Partial`, `Failed`.
- رموز `DeviceNotRegistered` تزال من سجل الأجهزة. فشل دفعة/رمز لا يوقف بقية الدفعات.
- كل عملية إنشاء تسجل في `AuditLogs`. تاريخ الحملات لا يعرض Expo Push Tokens.

## التراجع عن OTA سيئ

من داخل مجلد التطبيق والقناة المتأثرة، راجع تحديثاً مستقراً ثم استخدم:

```bash
eas update:rollback
```

اختر إعادة نشر آخر تحديث مستقر أو الرجوع إلى التحديث المضمّن داخل Binary. ويمكن إعادة نشر مجموعة معلومة عبر `eas update:republish --group <UPDATE_GROUP_ID>` بعد التحقق من المجموعة والقناة. لا تستخدم الرجوع إلى Binary مضمّن إذا كان ذلك سيكسر توافق بيانات محلية كتبها تحديث أحدث.

## خطوات ما قبل Production

1. تحقق من قيم `EXPO_PUBLIC_API_URL` لإعدادات EAS preview وproduction دون وضع Secrets في التطبيق.
2. ابنِ preview Binary لكل تطبيق واختبر تسجيل الدخول والتصفح والطلبات على بيئة اختبار.
3. اختبر OTA ناجحاً وفاشلاً، الوضع دون إنترنت، وعملية حساسة جارية؛ تأكد من عدم إعادة تحميل التطبيق أثناءها.
4. اختبر App Version: الإصدار الحالي، اختياري، تحت الحد، `1.10.0` مقابل `1.9.0`، ورقم البناء.
5. اختبر الصيانة بحسابات اختبار: Customer/Driver محجوبان، المدير يسجل ويفك الصيانة.
6. اختبر Broadcast إلى أجهزة Customer اختبارية فقط؛ لا ترسل إلى قائمة العملاء الفعلية أثناء التحقق.
7. افحص Audit Logs، حالة job، أعداد النجاح/الفشل، ثم ابنِ/انشر على Production بعد المراجعة.

توضح [وثائق EAS Update](https://docs.expo.dev/eas-update/getting-started/) إعداد القنوات والنشر، وتشرح [سياسات runtime](https://docs.expo.dev/eas-update/runtime-versions/) توافق Binary مع OTA، كما توضح [وثائق التراجع](https://docs.expo.dev/eas-update/rollbacks/) خيارات الرجوع.
