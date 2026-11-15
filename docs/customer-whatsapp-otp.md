# مصادقة العملاء عبر واتساب — Quick Connect

تاريخ التنفيذ: 2026-11-15. حالة الإطلاق: مكتمل. نجح اختبار واتساب الفعلي للحساب الموجود، وفُعّل اشتراط OTP، ونُشر تحديث العملاء OTA على production لـAndroid وiOS وRuntime 1.0.2. لا يوجد تعديل أو نشر لتطبيق الإدارة أو المندوب.

## البنية وفحص البيانات

- ASP.NET Core 10، Entity Framework Core/Npgsql وPostgreSQL. جدول Users محلي؛ لا يستخدم المشروع Supabase Auth أو Firebase Auth لإصدار الجلسات.
- JWT الحالي: Access Token مع userId والصلاحيات، وRefresh Token عشوائي تُخزّن بصمته، صلاحيته الحالية 7 أيام مع التدوير. لم تتغير مفاتيح JWT أو سياسة الجلسات.
- العميل يحتفظ بمسار ApiClient وتجديد الجلسات والتخزين الحالي: SecureStore عند توفره في النسخة المثبتة، والتوافق السابق للنسخ التي لا تتضمنه. لا يُخزن OTP في التخزين الدائم.
- فحص قراءة فقط قبل نشر الخلفية وبعده، بنفس الأعداد: 14 حساب عميل، 0 أرقام غير صالحة، 0 مجموعات متعارضة بعد التطبيع، 16 طلباً و30 عنواناً و307 سجلات Refresh Tokens.
- تبقى معرّفات Users وCustomers والهواتف المخزنة وكلمات المرور والعلاقات والطلبات والعناوين والصلاحيات وFCM كما هي. لم تُضف قيود فريدة جديدة للهواتف ولم تُدمج حسابات.

## السلوك الجديد

- `POST /api/auth/otp/request`: phone وdeviceId اختياري؛ استجابة ApiResponse المعتادة مع data.phone وexpiresIn وresendAfter وdeliveryStatus=accepted. لا يتحقق الطلب من وجود الحساب.
- `POST /api/auth/otp/verify`: phone وotp؛ يسترجع حساب Customer نفسه أو ينشئ User وCustomer وCart بعد نجاح التحقق فقط. يعيد نفس accessToken وrefreshToken وuser، مع isNewUser وrequiresProfileCompletion.
- `POST /api/auth/complete-profile`: جلسة Customer موثقة؛ يستكمل الاسم والمحافظة والعنوان والموقع. إعادة المحاولة لا تكرر العناوين ولا تستبدل عناوين مستخدم موجود.
- الحساب الموجود المكتمل ينتقل للرئيسية. الحساب الجديد أو الملف الافتراضي غير المكتمل ينتقل لاستكمال البيانات، وتستأنف هذه الخطوة بعد إعادة تشغيل التطبيق.
- حذف الحساب من التطبيق يستخدم `/api/account/delete/otp/request` و`/api/account/delete/otp/verify` مع OTP لغرض delete منفصل عن login. تأكيد الحذف النهائي وسياسة حماية الطلبات القائمة باقيان.
- تسجيل الدخول بكلمة المرور وrefresh وlogout وme وتغيير كلمة المرور الخلفي باقية لتوافق النسخ السابقة وتطبيقَي الإدارة والمندوب. مسارات حذف الحساب القديمة باقية للموقع والنسخ السابقة.

## الأمان والاتساق

- التطبيع إلى +967 مع دعم الرقم المحلي، الصفر الأول، 967 و+967 و00967 والأرقام العربية والفواصل المعتادة. البحث في حسابات Customer فقط. وجود حسابين متكافئين يرفض الدخول بعد التحقق بكود PHONE_CONFLICT دون دمج أو نقل بيانات؛ يلزم عندها فحص الملكية والعلاقات يدوياً بواسطة الإدارة.
- 6 أرقام من RandomNumberGenerator، وبصمة HMAC-SHA256 بمفتاح خادمي مستقل مع ربطها بمعرّف التحدي والهاتف والغرض. لا يسجل الرمز ولا يرجع في API.
- صلاحية 5 دقائق، 5 محاولات، 60 ثانية لإعادة الإرسال، و5 طلبات لكل هاتف في ساعة متحركة. حدود إضافية دائمة: 20/IP و10/device في الساعة. تُحسب أيضاً محاولات الإرسال الفاشلة أو الملتبسة لمنع الإساءة.
- حدود HTTP مستقلة عن تسجيل الدخول القديم: طلب OTP حتى 20/IP/ساعة، والتحقق حتى 30/IP/دقيقة، مع الرد 429 وRetry-After.
- أقفال PostgreSQL transaction advisory locks تسلسل طلبات الهاتف وعدادات IP والجهاز بين العمليات. التحقق وزيادة المحاولات واستهلاك الرمز وإنشاء الحساب/Refresh Token تتم داخل المعاملة. فشل إنشاء الجلسة يعيد المعاملة؛ المحاولات الخاطئة تُحفظ قبل الرد.
- رمز واحد صالح للاستخدام مرة واحدة؛ طلب بديل يبطل القديم، مع تجنب تكرار قيمة الرمز السابق. حالات pending/accepted/failed/replaced/locked/consumed محفوظة في قاعدة البيانات.
- حذف الحساب بـOTP يحافظ على مستوى العزل Serializable المستخدم سابقاً لحماية الحذف من الطلبات المتزامنة.
- Quick Connect من الخلفية فقط، عبر HTTPS وBearer، وقناة whatsapp افتراضياً؛ auto قابلة للضبط. لا إعادة إرسال تلقائية عند مهلة ملتبسة، ولا تتبع لتحويلات HTTP قد تكشف المفتاح. 401/403 و402 و429 و5xx وأخطاء الشبكة تتحول إلى أخطاء آمنة بلا جلسة.
- accepted يعني قبول طلب الإرسال فقط؛ لا يُدّعى وصول الرسالة. خطأ JSON صريح يُرفض. لا يُشترط وجود معرف رسالة أو حقول تسليم غير موثقة.

## إعدادات الخادم

أُضيف المفتاح المقدم إلى `backend/.env` المحمي والمستبعد من Git، دون استبدال الإعدادات الأخرى. أُنشئ OTP_HASH_SECRET عشوائي ثابت ولم يدخل Expo أو Git.

```dotenv
QUICK_CONNECT_API_KEY=<server-only>
QUICK_CONNECT_BASE_URL=https://aalcgjgocszngpcqzjih.supabase.co/functions/v1/public-api
QUICK_CONNECT_CHANNEL=whatsapp
OTP_HASH_SECRET=<32 random bytes encoded as base64>
OTP_EXPIRY_MINUTES=5
OTP_MAX_ATTEMPTS=5
OTP_RESEND_COOLDOWN_SECONDS=60
OTP_MAX_SENDS_PER_HOUR=5
CUSTOMER_OTP_REQUIRED=true
```

`CUSTOMER_OTP_REQUIRED=true` هي القيمة الفعلية بعد نجاح اختبار واتساب. أُعيد تشغيل الخلفية وأُثبت عبر HTTPS أن التسجيل القديم يعيد HTTP 426 وOTP_UPGRADE_REQUIRED لمنع تجاوز إثبات ملكية الرقم. تسجيل دخول الحسابات القديمة لا يتوقف. يحتفظ ملف .env.example بالقيمة false لمرحلة التحضير في بيئة جديدة. يجب عدم تغيير OTP_HASH_SECRET أثناء وجود رموز قيد الاستخدام.

## التحقق المنفذ

- 74 فحصاً في `backend/tests/BSStore.OtpChecks` باستخدام PostgreSQL معزول، تشمل الترحيل الحقيقي، الأرقام القديمة، عدم إنشاء الحساب قبل التحقق، الطلبات والعناوين السابقة، Refresh Tokens، الرمز الخطأ والمنتهي والمستهلك والبديل، حدود الهاتف وIP والجهاز، وتعليق الحسابات والتعارضات.
- ثمانية طلبات تحقق متزامنة تُصدر جلسة واحدة، وثمانية طلبات إرسال تحجز إرسالاً واحداً؛ محاولات خاطئة متزامنة لا تتجاوز الخمس. فشل معاملة الجلسة لا يستهلك الرمز.
- اختبارات HTTP حقيقية للمسارات: طلب وتحقق وJWT وme واستكمال الملف دون تكرار عناوين وحظر تسجيل قديم عند التفعيل وحذف الحساب بغرض OTP مستقل.
- اختبارات مزود معزولة لـ401 و402 و429 و500، ورفض success=false داخل HTTP 200، والشبكة، وقبول أشكال استجابة ناجحة دون افتراض حقول تسليم.
- 44 فحص ميزات خلفية موجودة؛ واختبارات تراجع المصادقة ومحددات السرعة وحذف الحساب والعناوين والملفات والإيصالات نجحت.
- `npm run ts:check` و`npm run test:features` و`npm run test:otp` في customer-app نجحت.
- `npx expo export --platform all` نجح لـAndroid وiOS والويب، دون إضافة مكتبة Native أو تغيير Runtime Version. فحص المصدر والحزم لم يجد مفتاح Quick Connect أو OTP_HASH_SECRET.
- فحص Chromium محلي: الهاتف وOTP والخطأ وإعادة الإرسال وتعديل الهاتف والوضعان الفاتح والداكن؛ دون أخطاء JavaScript، ودون تجاوز أفقي عند عرض 320 و390 و844 و1024.
- نجح الاختبار الفعلي برقم واتساب معتمد من صاحب المشروع: قُبل الإرسال من Quick Connect، واستُخدم الرمز الذي أعاده صاحبه للتحقق عبر الخلفية العامة. أعاد التحقق HTTP 200 وisNewUser=false وrequiresProfileCompletion=false، وأصدر Access/Refresh Tokens للحساب الموجود. نجح /auth/me وتجديد الجلسة وبقي معرّف المستخدم نفسه في الاستجابات الثلاث. لم تُسجل الرموز أو التوكنات في التقرير أو الملفات.
- توجد تحذيرات NuGet سابقة في تبعيات الصور والتشفير؛ البناء والاختبارات ينجحان. لم توسع هذه المهمة لتحديث تبعيات غير مرتبطة بالمصادقة.

تشغيل الفحوص من جديد:

```sh
/workspace/backend/tests/BSStore.OtpChecks/run.sh
cd /workspace/customer-app
npm run ts:check
npm run test:features
npm run test:otp
npx expo export --platform all
```

## نشر Expo

- مشروع العملاء: ultra-horizon/bs-store-customer، projectId `4bddebb7-5c80-4360-b310-dbc00824cd29`.
- القناة والفرع الفعليان: production. آخر مجموعة موجودة لـAndroid وiOS تستخدم Runtime 1.0.2. مشروعَا الإدارة والمندوب مختلفان ولا يُستهدفان.
- عنوان API الفعلي الذي يستخدمه تحديث الإنتاج الحالي: `https://implosive-exchange-compacter.ngrok-free.dev/api`، وهو نفسه الموافق عليه في إعدادات العميل؛ الرابط trycloudflare الموجود في التعليمات القديمة ليس عنوان إنتاج العميل الحالي.
- رسالة التحديث المخططة: `تحديث نظام تسجيل الدخول وإنشاء الحساب باستخدام رمز OTP عبر واتساب`.
- اكتمل شرط النشر: وصل رمز واتساب إلى صاحب الرقم، ونجح التحقق بالخلفية العامة للحساب الموجود، ثم نجح me وتجديد الجلسة بنفس معرّف المستخدم. المفتاح الفعلي موجود بالخادم، والاختبارات والبناء مكتملة.
- فُعّل CUSTOMER_OTP_REQUIRED وأُعيد تشغيل الخلفية، ثم تأكد HTTP 426 للتسجيل القديم وصحة الخدمة عبر HTTPS.
- أُعيد فحص EAS مباشرة قبل النشر: production فعّالة، ومشروع العملاء مستقل عن مشروعَي الإدارة والمندوب. متغيرَا EAS الإنتاجيان EXPO_PUBLIC_API_URL وEXPO_PUBLIC_EAS_PROJECT_ID يطابقان API ومشروع العملاء المذكورين أعلاه.
- أمر النشر المنفذ من customer-app فقط، دون تعديل Runtime أو إنشاء Build:

```sh
npx --yes eas-cli@latest update --channel production --environment production --platform all --message "تحديث نظام تسجيل الدخول وإنشاء الحساب باستخدام رمز OTP عبر واتساب" --non-interactive --json
```

- اكتمل النشر بتاريخ 2026-11-15 الساعة 22:45:58 UTC. مجموعة التحديث: `536c24d8-c68c-4fad-951a-8715f620bf90`، والقناة والفرع production، وRuntime 1.0.2 لكلا المنصتين.
- Android update ID: `01a1e163-8754-78d4-b0f0-87c7d6765547`.
- iOS update ID: `01a1e163-8754-74a0-bdbe-7a3639ec3f7d`.
- [مجموعة التحديث في Expo](https://expo.dev/accounts/ultra-horizon/projects/bs-store-customer/updates/536c24d8-c68c-4fad-951a-8715f620bf90).
- تأكدت قراءة قناة production بعد النشر من أن المجموعة الجديدة هي الأحدث. وأعادت خدمة تحديثات Expo نفسها HTTP 200 وmanifest الجديد الصحيح لكل منصة، مع معرّف مشروع العملاء وعنوان API الصحيحين وRuntime 1.0.2.
- فُحصت ملفات التصدير الثلاثون الناتجة عن النشر بمقارنة فعلية مع أسرار الخلفية: لا يوجد مفتاح Quick Connect ولا OTP_HASH_SECRET في الحزم. لم يُنشأ Build جديد ولم يتغير Runtime Version.
- النسخ ذات Runtime أقدم تحتفظ بمسار الدخول الحالي؛ لم يُفترض توافق Native ولم تُستهدف تلقائياً. لم يُنشر أي تحديث للإدارة أو المندوب.

## التراجع

الترحيل يضيف OtpChallenges وفهارسه فقط؛ لا يعدل جداول الحسابات أو كلمات المرور أو العلاقات. احتُفظ بنسخة ملفات الخلفية السابقة وبمعرّفات Git داخل `/workspace/.tools/otp-backend-rollback/`، المستبعد من Git.

مجموعة العملاء السابقة على production وRuntime 1.0.2 هي `84843e73-3644-4429-b19f-be44b180abfc`. للتراجع عن واجهة OTP، يُعاد نشر هذه المجموعة أولاً من customer-app، ثم يُعاد CUSTOMER_OTP_REQUIRED=false مع إعادة تشغيل الخلفية لاستعادة تسجيل الحسابات من النسخ القديمة. الخلفية الجديدة تحتفظ بمسارات الدخول القديمة، لذلك يمكن إبقاؤها منشورة أثناء التراجع:

```sh
npx --yes eas-cli@latest update:republish --group 84843e73-3644-4429-b19f-be44b180abfc --destination-channel production --message "Rollback customer OTP interface" --non-interactive
```

لا تُسترجع ملفات الخلفية القديمة قبل رجوع واجهة العملاء، حتى لا تتوقف مسارات OTP عن عميل منشور. عند الحاجة بعدها، تُستعاد ملفات النشر من `before-otp.tar.gz` بإجراء إيقاف/استعادة/تشغيل مضبوط، ثم تُفحص health وme وتجديد الجلسات. إبقاء جدول OTP الإضافي آمن ومتوافق مع الخلفية السابقة؛ لا حاجة لحذفه أو لتراجع بيانات العملاء.

## حالة نشر الخلفية المثبتة

نُفّذ `/workspace/scripts/restart-backend.sh` بنجاح، وبدأت الخدمة الجديدة `bsstore-backend.service` بتاريخ 2026-11-15 الساعة 18:21:53 UTC، على `0.0.0.0:5295` ودون إعادة تشغيل متكررة. أكدت السجلات نجاح الترحيل. فُحص `/health` محلياً و`/api/health` عبر عنوان HTTPS الفعلي، وأعاد كلاهما BS Store API healthy. مسار OTP الجديد المنشور رفض رقماً غير صالح عبر HTTPS، ورفض التحقق دون تحدٍ سابق محلياً بـOTP_INVALID؛ ما يؤكد وجود المسار وعمل استعلام جدول OTP. هذه فحوص جاهزية وليست إثبات إرسال واتساب فعلي.

في الإطلاق النهائي أُعيد نشر/تشغيل الخلفية بعد تفعيل CUSTOMER_OTP_REQUIRED=true. بدأت الخدمة بتاريخ 2026-11-15 الساعة 22:43:13 UTC، وأكدت سجلاتها نجاح الترحيل وبدء الاستماع على 0.0.0.0:5295، دون إعادة تشغيل متكررة. أعاد فحص HTTPS للصحة healthy، وأعاد مسار التسجيل القديم HTTP 426 كما هو مطلوب. اختبار واتساب الفعلي والجلسة وتجديدها نجح قبل هذا التفعيل؛ لم تتغير مفاتيح JWT أو سياسة الجلسات.

## النتيجة والخطوات المتبقية

الإطلاق مكتمل، ولا توجد خطوة معلقة أو بيانات دخول مطلوبة من صاحب المشروع. واجهة العملاء الجديدة تعتمد على الهاتف وOTP، وتأكيد الحذف يستخدم OTP مستقلاً. النسخ المتوافقة مع Runtime 1.0.2 تستطيع جلب التحديث عبر آلية Expo الموجودة في التطبيق؛ لم يُدّع تثبيته على كل جهاز بعينه.

فحص الإنتاج بعد الاختبار الفعلي: بقيت الحسابات 14 والطلبات 16 والعناوين 30، دون أرقام متعارضة أو غير صالحة. ارتفع إجمالي سجلات Refresh Tokens إلى 315 نتيجة إصدار/تدوير الجلسات خلال التشغيل والاختبار؛ لم تُحذف الجلسات السابقة. اختُبر التسجيل الجديد في PostgreSQL المعزول، بينما أثبت اختبار واتساب الحقيقي دخول الحساب الموجود نفسه ونجاح me وتجديد الجلسة.

تغييرات الكود منشورة في Git: backend `28aeca8`، والعميل `cd3b75c`، وتُحفظ نتيجة الإطلاق في تحديث لاحق لهذا التقرير. جميع مسارات التراجع المذكورة أعلاه جاهزة؛ لا حاجة لتراجع بيانات المستخدمين.

## الملفات المعدلة

```text
backend/src/BSStore.Domain/Entities/OtpChallenge.cs
backend/src/BSStore.Infrastructure/Data/Migrations/20261115180558_AddCustomerOtpChallenges.Designer.cs
backend/src/BSStore.Infrastructure/Data/Migrations/20261115180558_AddCustomerOtpChallenges.cs
backend/src/BSStore.Infrastructure/Services/OtpService.cs
backend/src/BSStore.Infrastructure/Services/YemenPhone.cs
backend/tests/BSStore.OtpChecks/BSStore.OtpChecks.csproj
backend/tests/BSStore.OtpChecks/Program.cs
backend/tests/BSStore.OtpChecks/run.sh
backend/.env.example
backend/src/BSStore.API/Controllers/AccountController.cs
backend/src/BSStore.API/Controllers/AuthController.cs
backend/src/BSStore.API/Middleware/ExceptionHandlingMiddleware.cs
backend/src/BSStore.API/Middleware/MaintenanceModeMiddleware.cs
backend/src/BSStore.API/Program.cs
backend/src/BSStore.API/Services/AccountDeletionService.cs
backend/src/BSStore.API/Services/AuthenticationProtection.cs
backend/src/BSStore.Application/Auth/DTOs/AuthDtos.cs
backend/src/BSStore.Application/Auth/Interfaces/IAuthService.cs
backend/src/BSStore.Infrastructure/Data/AppDbContext.cs
backend/src/BSStore.Infrastructure/Data/Migrations/AppDbContextModelSnapshot.cs
backend/src/BSStore.Infrastructure/Services/AuthService.cs
customer-app/App.tsx
customer-app/package.json
customer-app/src/api/client.ts
customer-app/src/api/index.ts
customer-app/src/components/TermsModal.tsx
customer-app/src/context/AppContext.tsx
customer-app/src/screens/AuthScreen.tsx
customer-app/src/screens/ProfileScreen.tsx
customer-app/src/utils/otp.ts
customer-app/tests/otp-auth.cjs
docs/customer-whatsapp-otp.md
```
