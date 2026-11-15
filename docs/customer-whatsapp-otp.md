# مصادقة العملاء عبر واتساب — Quick Connect

تاريخ التنفيذ: 2026-11-15. حالة الإطلاق: نُشرت الخلفية بنجاح مع الترحيل الإضافي؛ تحديث العملاء OTA ينتظر اختبار واتساب الفعلي. لا يوجد تعديل أو نشر لتطبيق الإدارة أو المندوب.

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
CUSTOMER_OTP_REQUIRED=false
```

`CUSTOMER_OTP_REQUIRED=false` حالة نشر الخلفية أولاً: يبقى التسجيل القديم عاملاً أثناء الاختبار. بعد نجاح اختبار واتساب الفعلي، يُحوّل إلى true مع إعادة تشغيل الخلفية، وعندها يعيد التسجيل القديم HTTP 426 برسالة تحديث التطبيق لمنع تجاوز إثبات ملكية الرقم. تسجيل دخول الحسابات القديمة لا يتوقف. يجب عدم تغيير OTP_HASH_SECRET أثناء وجود رموز قيد الاستخدام.

## التحقق المنفذ

- 74 فحصاً في `backend/tests/BSStore.OtpChecks` باستخدام PostgreSQL معزول، تشمل الترحيل الحقيقي، الأرقام القديمة، عدم إنشاء الحساب قبل التحقق، الطلبات والعناوين السابقة، Refresh Tokens، الرمز الخطأ والمنتهي والمستهلك والبديل، حدود الهاتف وIP والجهاز، وتعليق الحسابات والتعارضات.
- ثمانية طلبات تحقق متزامنة تُصدر جلسة واحدة، وثمانية طلبات إرسال تحجز إرسالاً واحداً؛ محاولات خاطئة متزامنة لا تتجاوز الخمس. فشل معاملة الجلسة لا يستهلك الرمز.
- اختبارات HTTP حقيقية للمسارات: طلب وتحقق وJWT وme واستكمال الملف دون تكرار عناوين وحظر تسجيل قديم عند التفعيل وحذف الحساب بغرض OTP مستقل.
- اختبارات مزود معزولة لـ401 و402 و429 و500، ورفض success=false داخل HTTP 200، والشبكة، وقبول أشكال استجابة ناجحة دون افتراض حقول تسليم.
- 44 فحص ميزات خلفية موجودة؛ واختبارات تراجع المصادقة ومحددات السرعة وحذف الحساب والعناوين والملفات والإيصالات نجحت.
- `npm run ts:check` و`npm run test:features` و`npm run test:otp` في customer-app نجحت.
- `npx expo export --platform all` نجح لـAndroid وiOS والويب، دون إضافة مكتبة Native أو تغيير Runtime Version. فحص المصدر والحزم لم يجد مفتاح Quick Connect أو OTP_HASH_SECRET.
- فحص Chromium محلي: الهاتف وOTP والخطأ وإعادة الإرسال وتعديل الهاتف والوضعان الفاتح والداكن؛ دون أخطاء JavaScript، ودون تجاوز أفقي عند عرض 320 و390 و844 و1024.
- استجابة Quick Connect الفعلية لطلب فحص ناقص آمن: HTTP 400 وJSON يوضح قنوات الإرسال المقبولة. هذه ليست تجربة إرسال أو دليلاً على الرصيد أو التسليم.
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

## نشر Expo والشرط المتبقي

- مشروع العملاء: ultra-horizon/bs-store-customer، projectId `4bddebb7-5c80-4360-b310-dbc00824cd29`.
- القناة والفرع الفعليان: production. آخر مجموعة موجودة لـAndroid وiOS تستخدم Runtime 1.0.2. مشروعَا الإدارة والمندوب مختلفان ولا يُستهدفان.
- عنوان API الفعلي الذي يستخدمه تحديث الإنتاج الحالي: `https://implosive-exchange-compacter.ngrok-free.dev/api`، وهو نفسه الموافق عليه في إعدادات العميل؛ الرابط trycloudflare الموجود في التعليمات القديمة ليس عنوان إنتاج العميل الحالي.
- رسالة التحديث المخططة: `تحديث نظام تسجيل الدخول وإنشاء الحساب باستخدام رمز OTP عبر واتساب`.
- **لم يُنفذ EAS Update**. يلزم رقم واتساب يمني مسموح للاختبار، وطلب الرمز عبر الخلفية المنشورة، ثم إدخال الرمز الذي يصل لصاحبه والتحقق من نجاح الجلسة. يجب مراجعة قبول Quick Connect الفعلي وأثر الاختبار على الحساب. لا تُحذف بيانات حساب اختبار موجود.
- بعد النجاح: فعّل CUSTOMER_OTP_REQUIRED، أعد تشغيل الخلفية وتحقق من 426 للتسجيل القديم واستمرار الدخول والتحديث، ثم من داخل customer-app فقط:

```sh
npx eas-cli update --channel production --environment production --message "تحديث نظام تسجيل الدخول وإنشاء الحساب باستخدام رمز OTP عبر واتساب" --non-interactive
```

- يجب إعادة فحص إعدادات EAS الحالية إن استؤنف العمل لاحقاً. لا تغيير Runtime أو إنشاء Build جديد لهذه التغييرات. النسخ ذات Runtime أقدم تحتفظ بمسار الدخول الحالي؛ لا تُستهدف بافتراض توافق Native دون فحصها.

## التراجع

الترحيل يضيف OtpChallenges وفهارسه فقط؛ لا يعدل جداول الحسابات أو كلمات المرور أو العلاقات. احتُفظ بنسخة ملفات الخلفية السابقة وبمعرّفات Git داخل `/workspace/.tools/otp-backend-rollback/`، المستبعد من Git.

للتراجع قبل OTA: أعد CUSTOMER_OTP_REQUIRED=false، واسترجع ملفات النشر من `before-otp.tar.gz` باستخدام إجراء إيقاف/استعادة/تشغيل مضبوط، ثم افحص health وme وتجديد الجلسات. إبقاء جدول OTP الإضافي آمن ومتوافق مع الخلفية السابقة؛ لا حاجة لحذفه ولا لتراجع بيانات العملاء. إذا سبق نشر OTA لاحقاً، أعد نشر مجموعة Expo السابقة المتوافقة مع runtime قبل إزالة واجهات OTP؛ لا تعطل الخلفية التي تعتمد عليها نسخة عميل منشورة.

## حالة نشر الخلفية المثبتة

نُفّذ `/workspace/scripts/restart-backend.sh` بنجاح، وبدأت الخدمة الجديدة `bsstore-backend.service` بتاريخ 2026-11-15 الساعة 18:21:53 UTC، على `0.0.0.0:5295` ودون إعادة تشغيل متكررة. أكدت السجلات نجاح الترحيل. فُحص `/health` محلياً و`/api/health` عبر عنوان HTTPS الفعلي، وأعاد كلاهما BS Store API healthy. مسار OTP الجديد المنشور رفض رقماً غير صالح عبر HTTPS، ورفض التحقق دون تحدٍ سابق محلياً بـOTP_INVALID؛ ما يؤكد وجود المسار وعمل استعلام جدول OTP. هذه فحوص جاهزية وليست إثبات إرسال واتساب فعلي.

بقي CUSTOMER_OTP_REQUIRED=false، ولم يُنفذ أمر Expo Update. الخطوة المطلوبة من صاحب المشروع: تحديد رقم واتساب يمني للاختبار ثم إدخال الرمز المستلم، قبل تفعيل اشتراط OTP والنشر.

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
