# تقرير تنفيذ منظومة الإصدارات والصيانة والإشعارات

## المنفذ

- إضافة `expo-updates` بالإصدار الذي اختاره Expo SDK 57 إلى Customer/Admin/Courier، وإضافة `expo-application` لقراءة رقم البناء من الـBinary.
- إعداد `runtimeVersion` باستراتيجية `appVersion`، رابط EAS Update من معرّف المشروع الموجود مسبقاً، وقنوات `preview` و`production` منفصلة.
- إعداد EAS profiles: `development`, `preview`, `production` (الإعداد السابق APK داخلي محفوظ)، و`production-aab` كخيار AAB للمتجر.
- إضافة `GET /api/app-version` مع مقارنة SemVer وقواعد تحديث اختياري/إلزامي عبر الحد الأدنى للإصدار أو البناء.
- إضافة إعداد إصدار منفصل لكل app type ومنصة، وتعديله للمديرين فقط، مع تسجيل Audit Log.
- منع رفع الحد الأدنى للإصدار أو البناء دون توفير رابط تحديث HTTPS في العملية نفسها.
- إضافة `GET /api/system/status` ووضع صيانة مركزي مخزن في `AppSettings`، وحجب عمليات API العادية بـ503 أثناءه. يسمح middleware بفحص الصحة/الإصدار والحالة وتسجيل الدخول؛ Admin/SuperAdmin يتجاوز الحجب.
- إضافة واجهات صيانة وتحديث إلزامي/اختياري للعميل والموصل، مع إعادة فحص عند الرجوع للتطبيق، ومهلة polling قدرها دقيقة. عند وجود مهمة موصل نشطة تبقى الشاشة مركبة ويظهر تنبيه الصيانة؛ يتأجل حاجب التحديث الإلزامي إلى نقطة آمنة. لا يجرى reload OTA تلقائياً وسط الشاشات الحساسة.
- إضافة إدارة إصدار وصيانة في Admin App، مع تأكيد رفع الحد الأدنى وتأكيد تفعيل/إنهاء الصيانة.
- إضافة Broadcast endpoint إداري جديد وطابور خلفي وسجل تاريخي. يستهدف فقط حسابات Customer النشطة وأجهزة `AppType=customer`، ويزيل تكرار الرموز ويعالج Expo على دفعات وينظف `DeviceNotRegistered`.
- إضافة محرر إشعار مع اختيار نوع ومعاينة وتأكيد وسجل الأعداد والحالة في Admin App. لا يقبل الجمهور رموز Push من العميل.
- بقي `POST /api/notifications/broadcast` القديم بعقده وسلوكه السابق؛ ميزة الواجهة الجديدة تستخدم المسار الإداري الجديد المقيد بعملاء التطبيق.
- إضافة [DEPLOYMENT-AND-UPDATES.md](./DEPLOYMENT-AND-UPDATES.md) لإعداد البناء والقنوات والإصدارات والصيانة والبث والتراجع.

## الملفات التي تخص هذه الميزة

### Backend

- `backend/src/BSStore.API/Program.cs`
- `backend/src/BSStore.API/Controllers/AppVersionController.cs`
- `backend/src/BSStore.API/Controllers/AdminAppVersionController.cs`
- `backend/src/BSStore.API/Controllers/SystemController.cs`
- `backend/src/BSStore.API/Controllers/AdminBroadcastController.cs`
- `backend/src/BSStore.API/Controllers/NotificationsController.cs` (المسار القديم محفوظ)
- `backend/src/BSStore.API/Middleware/MaintenanceModeMiddleware.cs`
- `backend/src/BSStore.API/Services/SemanticVersion.cs`
- `backend/src/BSStore.API/Services/MaintenanceModeStore.cs`
- `backend/src/BSStore.API/Services/BroadcastAudienceRules.cs`
- `backend/src/BSStore.API/Services/BroadcastJobService.cs`
- `backend/src/BSStore.API/Services/BroadcastQueueWorker.cs`
- `backend/src/BSStore.API/Services/PushNotificationService.cs`
- `backend/src/BSStore.Domain/Entities/AppVersionConfiguration.cs`
- `backend/src/BSStore.Domain/Entities/BroadcastNotification.cs`
- `backend/src/BSStore.Infrastructure/Data/AppDbContext.cs`
- `backend/src/BSStore.Infrastructure/Data/Configurations/OrderConfigurations.cs` (حفظ فهرس سابق أثناء مزامنة النموذج)
- `backend/src/BSStore.Infrastructure/Data/Migrations/20261004160000_AddAppVersionAndBroadcastManagement.cs`
- `backend/src/BSStore.Infrastructure/Data/Migrations/20261004160000_AddAppVersionAndBroadcastManagement.Designer.cs`
- `backend/src/BSStore.Infrastructure/Data/Migrations/AppDbContextModelSnapshot.cs`
- `backend/tests/BSStore.FeatureChecks/BSStore.FeatureChecks.csproj`
- `backend/tests/BSStore.FeatureChecks/Program.cs`

### التطبيقات

- Customer/Admin/Courier: `app.config.js`, `eas.json`, `package.json`, `package-lock.json`, `App.tsx`, `src/system/SystemGate.tsx`.
- Admin: `src/api/index.ts`, `src/context/AdminContext.tsx`, `src/types/index.ts`, `src/screens/FinancialsScreen.tsx`, `src/screens/AdminSystemManagementScreen.tsx`, `src/screens/AdminBroadcastScreen.tsx`.

## Database migration

أضيفت Migration توسعية غير مدمرة تنشئ:

- `AppVersionConfigurations` مع فهرس فريد على التطبيق والمنصة.
- `BroadcastNotifications` مع فهرس الحالة/التاريخ.
- إعدادات Android الابتدائية للتطبيقات الثلاثة على `1.0.0` كأحدث وأدنى إصدار، مع `UpdateUrl=null`؛ لا توجد روابط توزيع مفترضة.

حالة الصيانة في `AppSettings`، وAudit Log في الجدول الموجود. طُبقت migrations المعلقة على قاعدة PostgreSQL المضبوطة للـBackend بعد مراجعة SQL المولد. أضيفت الجداول والأعمدة والفهارس والإعدادات الأولية فقط؛ لم تتضمن التغييرات `DROP` أو حذف/تحديث بيانات قائمة. تحقق سجل EF من التطبيق حتى `20261004160000_AddAppVersionAndBroadcastManagement` ووجود 3 إعدادات Android ابتدائية.

## الاختبارات والتحقق

- `dotnet build backend/src/BSStore.API/BSStore.API.csproj --no-restore`: نجح دون أخطاء.
- `dotnet run --project backend/tests/BSStore.FeatureChecks/BSStore.FeatureChecks.csproj`: نجحت 19 قاعدة مركزة تشمل SemVer (`1.10.0` مقابل `1.9.0`)، قواعد update، جمهور Customer-only، تكرار الرموز، استثناءات الصيانة، وسمات Authorization.
- `dotnet ef migrations has-pending-model-changes`: لا توجد تغييرات نموذج غير ممثلة في Migration.
- راجعت SQL idempotent قبل التنفيذ؛ migrations الخمس طُبقت وتحقق سجل EF من نجاحها.
- Backend Release publish/restart نجح دون warnings أو errors، و`/health` أعاد HTTP 200. اختبارات FeatureChecks نجحت (19/19).
- TypeScript في التطبيقات الثلاثة نجح باستخدام `npx tsc --noEmit --ignoreDeprecations 6.0`.
- `expo-doctor`: 21/21 فحصاً ناجحاً لكل تطبيق.
- `expo config`: تحقق من runtime policy ووجود update URL وتكوين EAS project دون عرض معرّفات المشروع.
- `npm run ts:check` مباشرةً ما زال يتوقف عند تحذير TypeScript 6 الحالي حول `baseUrl` في `tsconfig.json`؛ فحص TypeScript نفسه يمر عند تجاهل تحذير الإيقاف هذا. لم أغير إعداد TypeScript الموجود لأنه خارج نطاق الميزة.
- لم يُختبر OTA فعلياً على Binary/جهاز أو حساب EAS. لم يُبنَ أو يُرسل OTA، ولم يُرسل Push خارجي.

## عناصر تحتاج إعداداً أو اختباراً يدوياً

- `EXPO_PUBLIC_API_URL` موجود في بيئات EAS Production الثلاث، لكنه يشير حالياً إلى نفق مؤقت. استبدله بعنوان HTTPS إنتاجي ثابت قبل بناء/توزيع Production؛ كود الإعداد يرفض النفق عمداً.
- إنشاء preview/production builds جديدة؛ الإصدارات المثبتة حالياً لا تحتوي `expo-updates` حتى يُعاد بناؤها.
- إعداد رابط Android Store لكل تطبيق في Admin App قبل تفعيل حد أدنى أعلى من `1.0.0`.
- إضافة `ios.bundleIdentifier` واعتمادات iOS قبل إنشاء iOS Binaries؛ واجهات Backend تدعم `ios` لكن ملف التطبيق لم يكن يحدده.
- اختبار الصيانة وPush على بيئة اختبار وحسابات/أجهزة وهمية؛ نشر Backend وMigration اكتمل، لكن لم تُرسل إشعارات فعلية.
- لا يوجد حالياً اختيار threshold للنشر التدريجي أو إعداد سحابي للقناة؛ النشر إلى Production يظل خطوة نشر منفصلة ومدروسة.
