# نتيجة خطة الإصلاح الأمني وإعادة المراجعة

**التاريخ:** 2026-10-04  
**النطاق:** Customer App، Admin App، Courier App، Backend  
**أسلوب التحقق:** تحليل مصدر، مراجعة مستقلة، builds واختبارات اصطناعية، مراجعة SQL، وتطبيق migrations توسعية على قاعدة PostgreSQL المضبوطة للـBackend. أُجري بعدها فحص `/health` للقراءة فقط؛ لم تُنفذ عمليات طلب/دفع على Production، ولم تُرسل إشعارات أو ترفع ملفات فعلية. لم تُطبع قيم أسرار البيئة.

## الملخص التنفيذي

أُجريت إصلاحات مصدرية لنتائج F-01 إلى F-07 ولتدفقات السعر والتحويل والخصم التي حددها مالك المشروع. نجح بناء Backend في نسخة Release مؤقتة، وفحص TypeScript للتطبيقات الثلاثة، واختبارات معزولة لقواعد الكمية والتحويل ومسار الإيصالات والتداخل في شرائح الخصم وحالات الطلب.

لا تُغلق النتائج الأمنية حتى الآن؛ اختبارات التفويض وملكية الصفوف والتزامن وعمليات قاعدة البيانات المطلوبة تحتاج اختباراً معزولاً. migrations التوسعية طُبقت على قاعدة البيانات المضبوطة ولم تحذف بيانات. بقيت قرارات مالية تحتاج حسم المالك وإعدادات خدمات خارجية لم يمكن التحقق منها من المستودع.

## حالة Findings الأصلية

| Finding | الحالة في المصدر الحالي | سبب عدم الإغلاق الكامل |
|---|---|---|
| F-01 — صلاحيات الدفع والفواتير | CODE-FIXED / NEEDS VALIDATION | الأدوار صارت Admin/SuperAdmin وGET قراءة فقط؛ لم تُختبر Anonymous/Customer/Driver/Admin على قاعدة معزولة |
| F-02 — قراءة طلب سائق آخر | CODE-FIXED / NEEDS VALIDATION | الاستعلام يطابق `Order.DriverId` مع السائق الحالي؛ لم يُختبر Driver A مقابل B بقاعدة بيانات |
| F-03 — ملكية الدفع والإيصال | CODE-FIXED / NEEDS VALIDATION | تحقق ملكية العميل ومسار تنزيل إيصال مصادق؛ يلزم اختبار endpoint/DB وعزل static serving |
| F-04 — كمية/مخزون checkout | CODE-FIXED / NEEDS VALIDATION | أزيل اعتماد Workflow على مخزون الشركة مع إبقاء schema؛ helper يرفض -1 و0 ويقبل 1، ويلزم اختبار checkout الفعلي |
| F-05 — الإلغاء وإعادة فتح الطلب | CODE-FIXED / NEEDS VALIDATION | الإلغاء بعد قبول السائق مرفوض والحالات النهائية لا تعاد؛ يلزم اختبار انتقال وتزامن DB |
| F-06 — تكلفة الشراء والدفتر | CODE-FIXED / NEEDS VALIDATION | حدود المال والتكرار والتزامن عولجت في المصدر؛ يلزم اختبار القيود والدفتر داخل DB |
| F-07 — تعداد الهاتف | CODE-FIXED / NEEDS VALIDATION | endpoint الفحص أزيل، ورد طلب الموصل لرقم مستخدم موجود أصبح مماثلًا للرد المعتاد؛ يلزم مقارنة عبر بيئة وهمية |

## ما تغير

### Backend والأمان

- الدفع والفواتير الإدارية تتطلب `Admin` أو `SuperAdmin`؛ أزيلت `AllowAnonymous` غير المناسبة، وفُصلت استعلامات GET عن إنشاء/تعديل Payment. تسجيل فاعل رفض الدفع لم يعد يتجاهل خطأ الهوية.
- إعداد JWT لا يستخدم secret fallback. السر السابق طابق بصمة سر معروف ومكشوف، فدُوّر في EnvironmentFile غير المتتبع؛ لم يوضع في المصدر أو التقرير. أدى ذلك إلى إبطال access tokens القديمة؛ قد يحتاج مستخدمو Customer إلى تسجيل الدخول مجدداً، بينما يستطيع Admin وCourier تجديد الجلسات من refresh tokens المحفوظة.
- أزيل `POST /api/system/restart` من التطبيق واستدعاؤه من سكربت التطوير.
- تفاصيل الطلب للسائق تُقرأ فقط عند تطابق الطلب مع السائق الحالي.
- معلومات التحويل ورفع الإيصال تتحقق من ملكية الطلب للعميل. تنزيل الإيصال يمر بمسار مصادق.
- يمنع مسار Static Files عرض `wwwroot/uploads/receipts` حتى عبر middleware الجذر، مع إبقاء الملفات العامة الأخرى متاحة.
- رفع الإيصال محدود بالحجم والامتداد ونوع الملف وتوقيع المحتوى، ويُحفظ خارج العرض العام.
- فحص ملكية العنوان في ValidateCheckout، وتقييد مفتاح Idempotency بمالك الطلب.
- صارت أخطاء التسجيل لا تكشف هل رقم الهاتف مسجل في Customer أو Driver application.
- حد الكمية `> 0` مفروض في Backend. أزيل فحص/حجز/خصم/استعادة المخزون من Workflow؛ بقيت الجداول والأعمدة كـLegacy ولم تُحذف.
- الإلغاء من العميل مسموح قبل قبول الموصل فقط. حالات Delivered/Cancelled/PaymentFailed/Returned نهائية عبر State Machine، مع حماية تزامن الحالة.
- عمليات شراء المتجر وتحصيل COD ورد المبالغ وأرباح السائق تمنع التكرار عبر حالة الطلب والقيود/التزامن المتاحة.
- أضيفت ملكية/تحقق عنوان واستعلامات محددة بدل الثقة بالمعرفات القادمة من العميل.

### سعر المنتج والشراء والتحويل

- تغيير السعر العام لا يمكن للسائق تنفيذه عبر endpoint عام. يقتصر على منتج موجود داخل SubOrder لطلب معيّن مسند إليه وفي مرحلة Purchasing، مع محاولة اتصال وإقرار إبلاغ العميل.
- عند تغير سعر المتجر: يُحدّث `Product.SellingPrice` للعملاء الجدد، ويُحدّث سعر/إجمالي سطر الطلب الحالي فقط. تبقى snapshots للطلبات القديمة كما كانت.
- تحفظ تغييرات السعر وسجل الاتصال والبلاغات ولقطة قاعدة الخصم، ويحسب الخادم النسب والإجماليات والرسوم ولا يقبل إجماليًا من التطبيق. تغيير السعر المتزامن يستخدم concurrency token/compare-and-update.
- سجل الإشعار داخل التطبيق يحفظ مع معاملة السعر والطلب؛ بعد نجاح الحفظ تُجرّب Push عبر Expo. الإشعار الداخلي لا يتكرر عند retry، لكن التسليم الخارجي يعتمد على Expo ورمز جهاز صالح ولم يُختبر.
- يراجع Admin سجل تغييرات السعر والبلاغات، ويمكنه فتحها ومراجعتها وحلها. التغيير غير المعتاد يُعلّم للمراجعة عند بلوغ threshold إعداد؛ عند غياب threshold تُعلّم التغييرات للمراجعة بدل اختراع نسبة افتراضية.
- أضيف حقل مبلغ التحويل الفعلي الذي تؤكده الإدارة، منفصلًا عن قيمة الفاتورة الأصلية. عند تسليم الطلب يحسب النظام الفرق من إجمالي الفاتورة بعد تحديث السعر: يطلب الفرق نقدًا إذا كان المستلم أقل، ويسجل مبلغ رد نقدي إذا كان أعلى. يتطلب التسليم تأكيد الموصل، وهو إقرار منه لا إثبات مستقل لتسليم النقد.

### الخصومات والكوبونات

- آلية الخصم ليست واجهة فقط: الإدارة تحفظ deals/coupons في `FlashDeals`، وAPI يتحقق من الكود والشرائح، وCheckout يعيد الحساب من بيانات الخادم ويحفظ Snapshot، وتغيير السعر يعيد الحساب من القاعدة المحفوظة. أضيف تحقق خادمي يمنع شرائح متداخلة أو غير صالحة.
- **لم يتغير أساس الحساب:** المصدر الحالي يقيس شرائح خصم المنتجات على مجموع المنتجات قبل التوصيل. ويختار الشريحة الأولى أو الأخيرة خارج حدودها. أرسلت للمالك سؤالًا عن معنى “السعر النهائي للطلب” وعن كون الحد الأدنى شرط أهلية؛ لا أغير هذا السلوك المالي حتى يصل القرار.

## Dependency / Supply Chain

استخدم `npm audit` بتاريخ 2026-10-04 على كل ملفات القفل التي عُثر عليها:

| ملف القفل | findings | Critical | High | Moderate |
|---|---:|---:|---:|---:|
| Customer | 26 | 0 | 18 | 8 |
| Admin | 26 | 0 | 18 | 8 |
| Courier | 23 | 0 | 16 | 7 |
| قالب `admin-app/bs-store-admin` | 30 | 0 | 19 | 11 |

النتائج تتضمن شجرة Expo/Metro وReact Native. من الحزم والإصدارات الظاهرة: `expo@57.0.26`، `react-native@0.86.3`، `react-native-maps@1.27.2`، `braces@3.0.3`، `node-forge@1.4.0`، `http-cache-semantics@4.2.0`، `uuid@7.0.3`. القالب المتداخل يتضمن أيضًا `expo-router@57.0.24` و`react-native-reanimated@4.5.1` و`react-native-worklets@0.10.1` و`decode-uri-component@0.2.2`.

من advisories التي أظهرها التقرير: [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) لـ`braces`، [GHSA-86w9-cpqp-85rv](https://github.com/advisories/GHSA-86w9-cpqp-85rv) لـ`node-forge`، [GHSA-ch52-4w7c-c8xp](https://github.com/advisories/GHSA-ch52-4w7c-c8xp) لـ`http-cache-semantics`، [GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq) لـ`uuid`، و[GHSA-q2hr-2g5m-vwhr](https://github.com/advisories/GHSA-q2hr-2g5m-vwhr) و[GHSA-qhr7-859c-m2p7](https://github.com/advisories/GHSA-qhr7-859c-m2p7) و[GHSA-6j4f-fj2g-mc7p](https://github.com/advisories/GHSA-6j4f-fj2g-mc7p) لـ`brace-expansion` في شجرة Admin.

| Package / النسخة المقفلة | النطاق/الاستشارة | الشدة ووجودها | Reachability في هذا المشروع | التوصية والتوافق |
|---|---|---|---|---|
| `braces@3.0.3` — Customer/Admin/Courier والقالب | `<=3.0.3`, GHSA-vfj7-8cjw-p6xm | HIGH | ضمن شجرة Metro/glob؛ لم يظهر مسار pattern من مدخل مستخدم إلى هذه الأداة. أثره في تشغيل أدوات Node/build غير مثبت كمسار API أو Mobile runtime. | GitHub لا يسجل إصدارًا مرقعًا بعد؛ لا توجد نسخة موصى بها حاليًا. انتظر upstream أو أزل المسار من dependency tree بعد اختبار SDK. |
| `node-forge@1.4.0` — التطبيقات الثلاثة والقالب | `<=1.4.0`, GHSA-86w9-cpqp-85rv | HIGH | يصل عبر Expo CLI وcode-signing certificate tooling؛ لا يظهر في كود التطبيق. الخطر متعلق بتشغيل أداة التوقيع/التحقق على بيانات غير موثوقة، ولم يثبت ذلك. | لا يوجد إصدار patched معلن في advisory. حدث parent toolchain عند صدور نسخة تصلحها؛ لا تضف override غير مدعوم. |
| `http-cache-semantics@4.2.0` — Customer/Admin | `<=4.2.0`, GHSA-ch52-4w7c-c8xp | HIGH | من شجرة أدوات Expo/Node؛ Backend ليس Node cache. لا يوجد مسار لتسريب cookie من تطبيق الخدمة الحالي، ويحتاج سيناريو shared cache/max-stale في أداة Node. | لا توجد patched version منشورة في advisory وقت الفحص. حدث/أزل الأداة المالكة عند توفر إصلاح upstream واختبر build. |
| `uuid@7.0.3` — الثلاثة والقالب | `<11.1.1`; ثابتة أيضًا `12.0.1`, `13.0.1`, `11.1.1`; GHSA-w5hq-g745-h8pq | MODERATE | الوصول عبر `@expo/ngrok`/أدوات Xcode؛ الخلل ينطبق فقط عند استدعاء v3/v5/v6 مع buffer يحدده المستدعي. لم يظهر استدعاء كهذا في كود التطبيقات. | استخدم نسخة patched توافق قيود parent؛ أقل خط إصدار مذكور 11.1.1 يتطلب مراجعة major API وتوافق Expo. |
| `brace-expansion@5.0.9` — Admin والقالب | دون `5.0.12`/`5.0.11`/`5.0.10` بحسب advisories الثلاثة | HIGH + MODERATE (3 advisories) | في شجرة أدوات glob/Metro. لا يوجد دليل أن المستخدم يتحكم في glob input؛ خطره أقرب لأدوات build/developer. | `5.0.12` يغطي advisory الأحدث والثلاثة المذكورة؛ افحص parent constraints ثم شغّل Expo/Metro/build قبل اعتماد override. |
| `decode-uri-component@0.2.2` — قالب Admin المتداخل فقط | `<=0.4.2`, GHSA-vcc3-ghjq-m6fr | MODERATE | ضمن `expo-router`/`query-string` في قالب منفصل؛ لا دليل أنه التطبيق النشط. إذا كان القالب يبنى أو ينشر، مدخل URL غير موثوق قد يصل لمسار فك الترميز ويحتاج تحققًا. | النسخة patched `0.5.0`. حدّث parent `expo-router` إلى نسخة متوافقة، أو احذف القالب إن ثبت أنه غير مستخدم. |
| `expo@57.0.26`, `react-native@0.86.3`, `@expo/cli`, Metro | findings عالية/متوسطة تنتقل من advisories التابعة أعلاه | AGGREGATE، لا Finding مستقلة بنفس كل حزمة | Expo/React Native direct runtime/build packages؛ audit يرفع الشدة عبر dependencies التابعة، لا يثبت أن كل CVE يصل إلى كود التطبيق. | `npm audit` يقترح `expo@44.0.6` و`react-native@0.72.17`، وكلاهما downgrade رئيسي غير مقبول دون ترقية/مواءمة SDK كاملة. لا تطبق الاقتراح تلقائيًا. |
| `react-native-maps@1.27.2` — Customer فقط | يظهر HIGH عبر dependency graph الخاص بـReact Native؛ audit يقترح `1.20.1` | AGGREGATE/NEEDS VALIDATION | لم يعثر بحث المصدر على import للحزمة؛ قد يظل native autolinking يضمها في artifact. لا يوجد exploit path مثبت. | تحقق من الحاجة للحزمة ونتيجة autolinking. النسخة المقترحة downgrade وقد تكسر توافق SDK؛ لا تخفضها دون build واختبار خرائط. |
| `@expo/ngrok@4.1.3` — Customer/Admin | يتأثر بـ`uuid`; لا fix مباشر في audit | MODERATE | tunnel/developer utility؛ كود Production config يرفض known dev tunnel، لكن وجود package بحد ذاته لا يثبت استخدامه في release. | إذا لم تعد tunnels مطلوبة، أزلها في تعديل مستقل بعد اختبار developer workflow؛ وإلا حدث dependency chain عند توافقه. |
| `braces`/`node-forge`/`uuid`/Expo Router dependencies في `admin-app/bs-store-admin` | توضح الأرقام أعلاه + `query-string@7.1.3`, `expo-router@57.0.24`, `expo-splash-screen@57.0.9`, `react-native-reanimated@4.5.1`, `react-native-worklets@0.10.1` | 30 نتيجة متراكمة، لا Critical | القالب لا يظهر كتطبيق مدير نشط؛ قابلية الاستخدام/النشر UNKNOWN. | حدّد إن كان artifact حيًا. إن كان مهجورًا، أخرجه من مسار البناء؛ وإن كان فعالًا، خطط ترقية SDK كاملة بدل خفض الحزم فرادى. |

قابلية الوصول ليست محسومة بمجرد `npm audit`: أرقام `total` تشمل أثر dependency graph وقد تعد الحزمة الأم والتابعة. لم تُشغّل `npm audit fix` ولم تُحدّث أي dependency خلال المراجعة. فحص NuGet السابق لم يسجل حزمة ضعيفة؛ build المعزول الحالي أعطى `NU1900` لتعذر جلب بيانات advisory داخل sandbox بلا شبكة.

## الملفات المعدلة

- **Customer:** إعداد Expo، API client، token storage، سياق الجلسة، cart/checkout/tracking وواجهات العروض والخرائط والأنواع.
- **Admin:** إعداد Expo وAPI، token storage، إدارة المدفوعات والخصومات والمنتجات، شاشة متابعة تغييرات السعر والبلاغات، وسياق المدير والأنواع.
- **Courier:** إعداد Expo وAPI، token storage و401 retry، سياق الموصل، شاشة شراء المتجر وتغيير السعر والتسليم، والأنواع.
- **Backend:** `Program.cs`، Controllers الخاصة بـAdmin/Auth/Catalog/Checkout/Deals/DriverApplications/Driver/Orders/Payments/Products، `PushNotificationService` و`ReceiptsExcludedFileProvider`، DTOs وEntities وOrderStateMachine وقواعد المال/الكمية، EF configurations وsnapshot وJWT/storage services.
- **إعدادات/تشغيل:** `.env.example` و`/workspace/scripts/restart-backend.sh`.
- **تقارير:** تقارير التدقيق الأربعة الحالية، وهذا التقرير، و`BUSINESS-LOGIC-CHANGES.md`.

## Migrations المحتملة

طُبقت بعد مراجعة SQL، وتحقق سجل EF من تطبيقها:

- `20261004120000_AddProductPriceChangeAudit` — price change/contact audit.
- `20261004123000_AddOrderDiscountRuleSnapshot` — قاعدة الخصم التاريخية لإعادة الحساب.
- `20261004124500_AddPriceChangeComplaints` — بلاغات العملاء على تغيير السعر.
- `20261004130000_AddConfirmedTransferAmounts` — المبلغ الفعلي المستلم والتحقق/التزامن.
- `20261004160000_AddAppVersionAndBroadcastManagement` — إعدادات الإصدارات وسجل الإشعارات الجماعية.

جداول وأعمدة Inventory القديمة باقية. لم يتضمن SQL حذف جدول أو عمود أو تحديث/حذف بيانات قائمة؛ أضاف 5 جداول وحقولاً وفهارس وصفوف إعداد Android الثلاثة.

## الاختبارات المنفذة والنتيجة

- Backend Release build على نسخة مؤقتة معزولة: **نجح، 0 أخطاء**؛ ظهر تحذيران `NU1900` لأن sandbox بلا شبكة لم يتمكن من جلب vulnerability metadata.
- فحص TypeScript في Customer/Admin/Courier باستخدام TS 6 وخيار تجاوز تحذير `baseUrl`: **نجح الثلاثة**.
- اختبار اصطناعي معزول: حجب إيصال تحت `wwwroot/uploads` مع استمرار عرض صورة عامة؛ إخفاء مجلد الإيصالات؛ كمية -1/0 مرفوضة و1 مقبولة؛ فرق التحويل تحصيلًا وردًا؛ تحقق مبلغ التحويل إلى منزلتين؛ شرائح متداخلة مرفوضة؛ delivered لا يعود إلى purchasing: **نجحت جميعها**.
- فحوص سابقة في نفس دورة العمل: Expo Doctor 21/21 في التطبيقات الثلاثة، Android bundle export، واختبارات mocks لترحيل token storage و401 retry وإعداد URL: **نجحت**.
- لم يُنفذ Android Gradle build أو DB/API integration tests أو اختبارات على جهاز فعلي. لا يحتوي المستودع على مشروع اختبارات خلفي مستقل جاهز لهذه السيناريوهات.
- لم يُختبر الدفع أو الإيصال أو Push أو Storage مع حسابات/ملفات حقيقية. نُفذ فقط GET آمن للصحة بعد النشر؛ لم تُختبر نقاط النهاية الحساسة على Production.

## Findings المتبقية واحتياج المالك

1. تم تدوير JWT في EnvironmentFile المستخدم بواسطة الخدمة. تبقى حالة اعتمادات Git التاريخية وبيانات المزود الخارجية بحاجة إلى تصنيف ACTIVE/REVOKED/UNKNOWN من مالكها.
2. تحقق من Supabase bucket policies، إعدادات ingress/IP forwarding، حالة endpoint قديم في النشر، وسجل أول Admin من بيئة موثوقة قراءةً فقط.
3. اختبر التوافق مع نسخ التطبيقات المدعومة على بيئة معزولة قبل إغلاق نتائج API/DB؛ migrations توسعية وقد طُبقت على القاعدة المضبوطة.
4. نفذ authorization matrix واختبارات التزامن/الدفتر والتحويل قبل إغلاق F-01..F-07.
5. قرار مطلوب حول أساس شرائح الخصم وأهلية أول/آخر شريحة؛ وقرار منفصل حول تحويل معتمد إذا ألغي الطلب قبل قبول الموصل.
6. لا يظهر OTP provider. يلزم قرار منتج مستقل حول إثبات ملكية الهاتف.
7. push الخارجي بعد الحفظ best-effort؛ تحقق من devices/service في بيئة اختبار. التخزين الداخلي للإشعار جزء من معاملة السعر.
8. لا يوجد إثبات artifact فعلي لمنصات iOS/Android، سياسة النسخ الاحتياطية، أو عنوان API في build موزع.

## نتيجة إعادة المراجعة

أعاد مراجعون مستقلون قراءة Backend وBusiness Logic وتطبيقات العميل دون تعديل أو تشغيل خدمات. أكدوا إصلاحات المصدر، وسجلوا ما بقي: Supabase policies غير موجودة بالمستودع، migrations وDB tests غير منفذة، دور Customer في client session لا يتحقق منه التطبيق نفسه، وملفات Web/Push/Ingress تحتاج تحققًا خارج المصدر. كما عولجت الملاحظات الإضافية المتعلقة بترتيب middleware للإيصالات، تعداد الهاتف، إدخال مبلغ التحويل تلقائيًا، تكرار المنتج في checkout، والتحقق الخادمي من تداخل الشرائح.

لا توجد finding معلنة CLOSED في هذه النتيجة؛ إغلاقها مشروط باختبار root cause على بيئة معزولة وعدم وجود regression، وفق طلب المالك.
