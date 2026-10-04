# التفاصيل التقنية للنتائج الأمنية

**تاريخ خط الأساس:** 2026-10-03
**ملاحظة حالة:** الأدلة أدناه تصف نسخة ما قبل الإصلاح. تغيّرت عدة مسارات منذ ذلك الحين؛ راجع `SECURITY-REMEDIATION-RESULT.md` للحالة الحالية. لا تعتبر Finding مغلقة قبل تحقق التكامل المذكور هناك. لم تُختبر Production ولم تُطبع قيم أسرار.
**قاعدة التقييم:** CONFIRMED تعني أن مسار المصدر في نسخة خط الأساس أثبت الشرط/الأثر؛ LIKELY مشروط بتوفر سيناريو تشغيل؛ NEEDS VALIDATION يعتمد على إعداد أو سياسة غير موجودة بالمستودع. لا تُدرج النتائج FALSE POSITIVE ضمن سجل الثغرات.

## ملخص الحالة الحالية بعد إعادة المراجعة

| Finding | المصدر الحالي | اختبار الإغلاق المطلوب |
|---|---|---|
| F-01 | إصلاح الدور وقراءة GET فقط ظاهر | مصفوفة Anonymous/Customer/Driver/Admin/SuperAdmin مع إثبات عدم تعديل DB عند الرفض |
| F-02 | GET يربط السائق بالطلب المسند إليه | اختبار سائقين وطلبات منفصلة |
| F-03 | ملكية العميل وتنزيل إيصال مصادق | اختبار Customer A/B وملف خاص عبر static route |
| F-04 | المخزون أزيل من Workflow والكمية موجبة | اختبار checkout الخام وcart المحفوظة |
| F-05 | الإلغاء والحالات النهائية مقيدة | اختبارات transitions والتسليم المكرر والتزامن |
| F-06 | حدود السعر والدفتر والتكرار موجودة في المصدر | اختبارات DB متزامنة للشراء والدفتر والأرباح |
| F-07 | استعلام الهاتف أزيل ورد طلب الموصل موحد | مقارنة رد التسجيل على أرقام وهمية موجودة/غير موجودة |

لا يصنف أي صف CLOSED قبل الاختبار المعزول. تفاصيل المخاطر الخارجية وقواعد المنتج في `SECURITY-NEEDS-VALIDATION.md`.

## F-01 — واجهات الدفع والفواتير تتجاوز دور المدير

- **Severity:** HIGH
- **Confidence / Validation status:** CONFIRMED
- **Affected application:** Backend؛ أثر عابر للتطبيقات على الأموال وبيانات العميل والسائق.
- **Affected file:** backend/src/BSStore.API/Controllers/AdminController.cs
- **Function / endpoint:** GET /api/admin/payments، GET /api/admin/payments/pending، POST /api/admin/payments/{id}/approve، POST /api/admin/payments/{id}/reject، GET /api/admin/invoices، POST /api/admin/invoices/{id}/approve، POST /api/admin/invoices/{id}/reject.
- **Relevant lines:** 17-20, 264-340, 343-401, 403-489.
- **Description:** Controller يحمل [Authorize(Roles = "Admin,SuperAdmin")]، لكن الإجراءات المذكورة تحمل [AllowAnonymous]، ما يتجاوز شرط الدور. قوائم الدفع متاحة دون مصادقة وتعيد PaymentId وOrderId واسم/هاتف العميل والمبلغ والحالة وسبب الرفض وروابط/مفاتيح الإيصالات. قائمة الفواتير تعيد بيانات السائق ورقم هاتفه والمتجر والمبلغ ورابط الإيصال والملاحظات.
- **Attack scenario:** زائر يقرأ القوائم والإيصالات ويجمع المعرّفات. يستطيع طلب رفض دفعة أو رفض/اعتماد فاتورة دون دور إداري. مستخدم موثق عادي يستطيع اعتماد دفعة، لأن GetUserId() ناجح لديه، رغم أنه ليس Admin.
- **Impact:** تغيير حالات الدفع والطلب أو اعتماد سجل فاتورة/تحويل دون صلاحية إدارية؛ كشف بيانات اتصال وإيصالات مالية. هذا يضعف استقلال مراجعة الدفع اليدوي وقد يؤدي إلى تنفيذ طلب على أنه مدفوع أو إنهاء حالة فرعية دون مراجعة.
- **Evidence:** RejectPayment يغيّر Payment.Status وOrder.PaymentStatus وOrder.Status ثم يحفظ؛ إجراءات الفاتورة تغيّر SubOrder.Status أو Notes ثم تحفظ. AllowAnonymous ظاهر على كل endpoint المعني.
- **Existing mitigations / counterevidence:** باقي إجراءات Controller تستفيد من دور Admin/SuperAdmin. محاولة اعتماد دفعة من مجهول تمامًا تبدو أنها تفشل عند استدعاء GetUserId غير المحمي داخل سجل الحالة قبل SaveChanges؛ لا يعتمد هذا على المجهول بوصفه شرطًا آمنًا، لأن القراءة والرفض والفواتير بلا مصادقة، والمستخدم العادي يستطيع الاعتماد.
- **Recommended remediation:** فرض مصادقة ودور إداري صريح على كل إجراءات القراءة والكتابة المالية؛ فصل API العامة عن واجهات الإدارة؛ عدم إنشاء صفوف Payment ضمن GET؛ تسجيل الفاعل بشكل إلزامي دون تجاهل فشل الحصول على الهوية؛ مراجعة ترتيب الحالة المالية وتغيير حالة الطلب داخل عملية منضبطة. لا تُنفذ هذه التوصية ضمن هذا التدقيق.
- **Safe validation:** في قاعدة وبيانات وهمية معزولة فقط، افحص نتائج list/reject/invoice endpoints لزائر، ثم approve لمستخدم Customer. قارن صفوف الدفع والطلب والفاتورة قبل وبعد. لا تستخدم طلبًا حقيقيًا أو إيصالًا حقيقيًا.

## F-02 — Driver يقرأ تفاصيل طلب مسند إلى Driver آخر (BOLA)

- **Severity:** HIGH
- **Confidence / Validation status:** CONFIRMED
- **Affected application:** Backend وCourier/Driver App؛ بيانات Customer.
- **Affected file:** backend/src/BSStore.API/Controllers/OrdersController.cs
- **Function / endpoint:** GET /api/orders/{id:guid} — GetOrderDetails.
- **Relevant lines:** 81-115، خصوصًا 90-112؛ DTO عند 201-250.
- **Description:** الاستعلام يحمّل الطلب باستخدام ID وحده. شرط السائق هو أن يحمل الدور Driver وأن يكون order.DriverId غير null؛ لا يقارن DriverId بملف السائق الحالي أو UserId الخاص به.
- **Attack scenario:** سائق موثق يطلب GUID لطلب مسند إلى سائق آخر. معرّفات OrderId ظاهرة أيضًا في قائمة الدفع العامة F-01، فلا يصح اعتبار UUID حاجز التفويض.
- **Impact:** كشف اسم العميل وهاتفه وإحداثيات عنوانه، إضافة إلى عناصر الطلب ومعلومات المتجر؛ يمكن أن يمكّن تتبع عميل أو اتصالًا غير مصرح به.
- **Evidence:** MapToDto يضم Customer.FullName وCustomer.User.Phone وAddress.Latitude/Longitude. المسارات الأخرى في DriverController تطبق order.DriverId == driver.Id، ما يبين ضابط الملكية المتوقع وغير الموجود هنا.
- **Existing mitigations / counterevidence:** endpoint يتطلب مصادقة على مستوى Controller؛ العميل المالك والمدير مسموح لهما. قائمة السائق المعتادة مقيّدة بالطلبات المعينة إليه، لكن هذا لا يحمي endpoint التفاصيل.
- **Recommended remediation:** حصر استعلام تفاصيل السائق بالـDriverId المستخرج من حسابه الموثق، مع بقاء حالات المالك والمدير منفصلة؛ إرجاع أقل قدر من PII حسب الدور.
- **Safe validation:** في قاعدة معزولة، أنشئ سائقين وطلبًا واحدًا لكل منهما. اطلب تفاصيل طلب B برمز Driver A، وتحقق أن النتيجة رفض/عدم وجود وأن رمز B وAdmin لهما السلوك المتوقع.

## F-03 — واجهات الدفع لا تتحقق من ملكية الطلب

- **Severity:** MEDIUM
- **Confidence / Validation status:** CONFIRMED
- **Affected application:** Backend؛ Customer App وبيانات الدفع.
- **Affected file:** backend/src/BSStore.API/Controllers/PaymentsController.cs
- **Function / endpoint:** GET /api/payments/{orderId}/transfer-info وPOST /api/payments/{orderId}/upload-receipt.
- **Relevant lines:** 13-17, 39-67, 70-116.
- **Description:** [Authorize] يفرض وجود مستخدم فقط. الاستعلامان يبحثان عن OrderId دون فحص أن الطلب مملوك للعميل الحالي أو أن الدور مناسب. transfer-info يعيد رقم الطلب والمبلغ والحالة وسبب الرفض وبيانات التحويل. upload-receipt يضيف إيصالًا إلى الدفع، ثم يضبط Payment.Status وOrder.Status إلى انتظار التحقق.
- **Attack scenario:** بعد الحصول على OrderId من قائمة F-01، يسجل عميل حسابًا ويقرأ بيانات الدفع أو يرفع إيصالًا على طلب عميل آخر.
- **Impact:** كشف تفاصيل دفع، وإضافة ملفات إلى سجل آخر، وإرجاع حالته إلى PendingVerification؛ قد يعطل إجراء دفع قيد المراجعة أو يربك تسوية الطلب. المصدر لا يثبت أن ذلك يعادل اعتماد الدفع.
- **Evidence:** الاستعلام عند السطر 45-47 وعند 89-91 يرشح بالـID وحده؛ تغييرات الحالة عند 112-116.
- **Existing mitigations / counterevidence:** يتطلب endpoint رمزًا صالحًا؛ فحص الحجم 5 MB وامتداد الملف موجود؛ التخزين يستخدم IStorageService. إنشاء اسم الملف ومساره في مسار التخزين يقلل مخاطر traversal، ولا يظهر هنا تحكم بالاسم الخام كمسار.
- **Recommended remediation:** ربط كل orderId بهوية العميل الحالية في الخدمة، وتحديد إجراءات كل دور؛ جعل الرفع والتحقق من الحالة عملية محدودة الانتقالات، وعدم إعادة الحالة تلقائيًا إذا كان الدفع قد حُسم.
- **Safe validation:** ببيانات وهمية لحسابين، اطلب transfer-info وارفع ملفًا غير حقيقي على طلب الحساب الآخر، ثم تحقق من رفض الطلب وعدم تغير الحالة أو سجل الإيصالات.

## F-04 — Checkout لا يفرض كمية موجبة؛ افتراض مخزون الشركة لا ينطبق

- **Severity:** MEDIUM
- **Confidence / Validation status:** CONFIRMED
- **Affected application:** Backend وCustomer App؛ المخزون والأسعار والطلبات.
- **Affected files:** backend/src/BSStore.API/Controllers/CheckoutController.cs، backend/src/BSStore.Application/Orders/DTOs/OrderDtos.cs.
- **Function / endpoint:** PlaceOrder (POST checkout) وValidateCheckout.
- **Relevant lines:** CheckoutController.cs 69-102, 206-228, 346-395, 599-612؛ OrderDtos.cs 11-16.
- **Business-model clarification:** مالك المشروع أوضح أن الشركة لا تدير مخزون المنتجات؛ المنتجات ومخزونها للمتاجر. لذلك سيناريو بيع أكثر من “مخزون الشركة” وقيد منع مخزون سالب **FALSE POSITIVE بالنسبة لنموذج العمل** ولا يُعالج بإضافة constraint. جداول المخزون القديمة بقيت Legacy.
- **Description:** الخلل الأمني/المالي ذي الصلة كان غياب قاعدة `Quantity > 0` في Checkout. أما تكرار أسطر المنتج فليس تجاوز مخزون؛ ظهرت له لاحقًا حالة تقنية في price update، وعولجت بدمج الأسطر المكررة قبل إنشاء الطلب.
- **Attack scenario:** عميل يرسل Quantity=0 أو قيمة سالبة إلى Checkout بدل القيمة الموجبة التي تسمح بها الواجهة. لا يجوز للخادم إنشاء/حساب طلب من هذه الكمية.
- **Impact:** قيمة سطر/فاتورة غير منطقية وإفساد Business Logic إذا قبل الخادم الكمية. أثر تغيير رصيد المخزون لا يعتمد كخطر لأن مخزون الشركة غير موجود في النموذج.
- **Evidence:** في خط الأساس كان المسار يستقبل int دون فحص موجب موحد في API. المصدر الحالي يطبق قاعدة كمية موجبة في `CheckoutController` ويزيل اعتماد التحقق/الحجز/الخصم/الاستعادة على Inventory.
- **Existing mitigations / counterevidence:** السعر الفعلي للعميل يقرأ من DB، والطلبات تحفظ transaction. هذان الضابطان لا يغنيان عن `Quantity > 0`.
- **Current status:** CODE-FIXED / NEEDS VALIDATION. اختبار مساعد معزول لـ-1 و0 و1 نجح؛ يجب اختبار PlaceOrder الخام وcart المحفوظة على DB وهمية.
- **Recommended remediation:** فرض `Quantity > 0` في الخادم، والحفاظ على حقول/جداول Inventory دون حذف migration مدمرة. لا تضف negative-stock constraint ولا تجعل Checkout يفشل بسبب مخزون الشركة.
- **Safe validation:** بيانات وهمية: Quantity=-1 و0 ترفض، Quantity=1 يسمح بها؛ لا تنشئ اختبار oversell لمخزون الشركة.

## F-05 — يمكن إعادة فتح طلب مسلّم وتكرار دفتر التحصيل/الأرباح

- **Severity:** MEDIUM
- **Confidence / Validation status:** CONFIRMED
- **Affected application:** Backend وCourier App؛ دورة الطلب والدفتر المالي.
- **Affected file:** backend/src/BSStore.API/Controllers/DriverController.cs
- **Function / endpoint:** PUT /api/driver/orders/{id}/accept وPUT /api/driver/orders/{id}/delivered.
- **Relevant lines:** 172-208, 283-357؛ مجاميع الرصيد عند 368-380.
- **Description:** AcceptOrder يتحقق من أن الطلب مسند إلى السائق الحالي، لكنه لا يتحقق من حالته الحالية؛ يكتب Purchasing أو WarehousePickup. ConfirmDelivery يمنع التسليم فقط إذا كانت الحالة Delivered لحظة الطلب. لذلك يستطيع سائق معيّن قبول طلبه بعد تسليمه، ثم طلب تسليمه مجددًا.
- **Attack scenario:** سائق لديه طلب مكتمل ظاهر في سجله يكرر accept ثم delivered. السطر الأول يعيد الحالة من Delivered؛ الثاني يضيف معاملة تحصيل COD عند انطباق الدفع النقدي، وقد يضيف معاملة أرباح ثانية.
- **Impact:** تضخيم المجاميع المالية/سجل التحصيل والأرباح، وتغيير الحالة وسجلها بعد الإكمال.
- **Evidence:** عدم فحص حالة الطلب في AcceptOrder، ورفض Delivered فقط في ConfirmDelivery؛ إنشاء DriverTransaction عند التحصيل/الربح. OrderStateMachine يحدد انتقالات أضيق، لكن البحث عن الاستدعاءات لم يجد استخدامه في هذه الإجراءات.
- **Existing mitigations / counterevidence:** كلا المسارين يربطان الطلب بالسائق المسند إليه؛ طلب delivered متكرر مباشرة وهو ما يزال Delivered مرفوض. هذه الضوابط لا تمنع تسلسل accept ثم delivered.
- **Recommended remediation:** فرض انتقال حالة مسموح به في الخدمة/القاعدة لكل تغيير؛ منع إعادة فتح الحالة النهائية؛ جعل المعاملات المالية idempotent أو فريدة بحسب نوعها وكيانها، مع حماية من الطلبات المتزامنة.
- **Safe validation:** في بيئة معزولة فقط، أنشئ طلبًا وهميًا مسلّمًا ومسندًا، أعد التسلسل، وقارن status history وعدد ومجاميع ledger entries.

## F-06 — RecordPurchase يقبل تكلفة سالبة أو خارج الحدود ويضيف قيودًا قابلة للتكرار

- **Severity:** MEDIUM
- **Confidence / Validation status:** CONFIRMED
- **Affected application:** Backend وCourier App؛ حساب تكلفة الشراء وتسوية السائق.
- **Affected files:** backend/src/BSStore.API/Controllers/DriverController.cs، backend/src/BSStore.Application/Driver/DTOs/DriverDtos.cs.
- **Function / endpoint:** POST /api/driver/orders/{id}/record-purchase.
- **Relevant lines:** DriverController.cs 211-280, 327-342, 429-438؛ DriverDtos.cs 20-29.
- **Description:** بعد التحقق من تعيين الطلب وانتماء الطلب الفرعي، يكتب ActualPurchasePrice وActualPrice الواردتين إلى صفوف الشراء/العناصر من دون تحقق ظاهر من الإشارة أو سقف متوقع أو مطابقة مجموع العناصر. كل طلب يضيف StorePurchase ledger transaction، ولا يظهر منع لتكرار العملية لنفس الطلب الفرعي.
- **Attack scenario:** سائق معيّن يرسل قيمة تكلفة سالبة لبند، ما يرفع هامش الربح المحسوب، أو يعيد الإرسال ليضيف قيود شراء أخرى. قيمة إجمالية كبيرة قد تغيّر رصيد المصروفات/المستحقات.
- **Impact:** تلاعب بحساب الأرباح ومبالغ التسوية أو تكرار أثر مالي في دفتر السائق.
- **Evidence:** تعيين SubOrder.ActualPurchaseCost والسعر الفعلي من body، ثم إضافة DriverTransaction بمبلغ الطلب. القيم الفعلية تستخدم في حساب أرباح السائق.
- **Existing mitigations / counterevidence:** الطلب والسائق الفرعي مربوطان بالسائق الحالي. نوع numeric يحد حجم التمثيل فقط ولا يضمن موجبًا أو مطابقًا لإيصال. يمكن أن توجد مطابقة خارجية يدوية، لكنها غير ظاهرة في مسار التطبيق.
- **Recommended remediation:** تحقق من مبلغ موجب ومقيد بسياسة العمل، ومطابقة المجموع مع الأسعار الفعلية/المتوقعة والإيصال، ومنع تسجيل نفس الشراء عدة مرات أو ضبط تحديثه بمعاملة idempotent.
- **Safe validation:** بيانات دفتر وهمية؛ اختبر قيمًا سالبة/عالية وإعادة الطلب، ثم راجع القيمة المخزنة وعدد معاملات StorePurchase وحساب التسوية.

## F-07 — كشف وجود مستخدم عبر رقم الهاتف

- **Severity:** LOW
- **Confidence / Validation status:** CONFIRMED
- **Affected application:** Backend وCustomer App.
- **Affected file:** backend/src/BSStore.API/Controllers/AuthController.cs، backend/src/BSStore.Infrastructure/Services/AuthService.cs.
- **Function / endpoint:** GET /api/auth/check-phone?phone=…
- **Relevant lines:** AuthController.cs 22-29؛ AuthService.cs 184-189؛ limiter في Program.cs 222-237.
- **Description:** endpoint عام يعيد Boolean يعتمد على وجود رقم الهاتف في Users. رسالة PHONE_ALREADY_EXISTS عند التسجيل تكشف أيضًا تكرار الرقم.
- **Attack scenario:** مهاجم يجمع أرقامًا محتملة ويرسل استعلامات لمعرفة من لديه حساب.
- **Impact:** تعداد حسابات وربط بيانات أشخاص باستخدام أرقام هواتف؛ لا يتيح وحده تسجيل الدخول أو تغيير كلمة المرور.
- **Evidence:** CheckPhoneExistsAsync ينفذ AnyAsync على الرقم المطبّع ويرجع النتيجة؛ لا مصادقة على الإجراء.
- **Existing mitigations / counterevidence:** محدد معدل عام 120 طلبًا في الدقيقة حسب عنوان IP قبل المصادقة. هذا يبطئ المصدر الواحد ولا يخفي الإجابة ولا يفرض حدًا على الرقم المستهدف.
- **Recommended remediation:** إلغاء endpoint الاستعلام أو تغيير التدفق إلى رد موحد لا يكشف التسجيل؛ إضافة تحديد خاص بالهوية/الرقم وقياس إساءة الاستخدام.
- **Safe validation:** لا حاجة إلى مسح أرقام حقيقية؛ في بيئة وهمية قارن رد رقم seeded برقم غير موجود وتحقق من سلوك واجهة التسجيل.

## F-08 — السجلات المالية والعناوين والمخزون: استنتاجات لم تعتمد كثغرات

- **Severity:** لا تنطبق؛ هذه فقرة تحدي نتائج وليست Finding.
- **Validation status:** FALSE POSITIVE / ضوابط ظاهرة تمنع الادعاء الأوسع.
- **Affected application:** Backend.
- **Evidence والتفسير:**
  - إلغاء الطلب يتحقق من المالك أو Admin، ويرفض Delivered وCancelled وOutForDelivery في OrdersController.cs:137-144. لذلك لا أبلغ عن BOLA في الإلغاء أو إلغاء طلب مكتمل/خرج للتسليم.
  - Customer cart وعناوينه وقوائم طلباته لها مسارات تحقق ملكية ظاهرة. ذلك لا يلغي حالات BOLA المحددة في F-02 وF-03.
  - سعر المنتج في checkout يُقرأ من DB، فلا أبلغ عن تغيير سعر البيع من body ضمن هذا التدفق.
  - رفع الإيصال يحدد 5MB وامتدادًا مسموحًا، والتخزين يولد اسمًا في مسار ثابت؛ لا دليل في call path على Path Traversal أو تنفيذ ملف.
  - إشعارات المستخدم تُقرأ/تُلغى على أساس المستخدم الحالي، والبث العام إداري. لم يظهر endpoint يستطيع العميل من خلاله اختيار مستلم اعتباطي.
  - SQL الظاهر مبني باستعلامات EF/LINQ ذات معاملات؛ لم أعثر في المسارات التي راجعتها على SQL خام ديناميكي يثبت SQL Injection.
  - CORS يسمح بكل Origin ويقبل credentials؛ لكن المصادقة الظاهرة تعتمد Bearer ولا يظهر Cookie جلسة أو قناة سرية تلقائية للمتصفح. هذا إعداد واسع يستحق تضييقًا، لكن لم يثبت استغلال تسريب عبر المتصفح من المصدر وحده، لذلك ليس ثغرة مؤكدة هنا.

## جرد إضافي حسب النطاق

### Authentication وAuthorization

- تسجيل الدخول، إصدار JWT وتجديد refresh tokens موجودة. Program.cs يطلب توقيعًا وجهة وجمهورًا ومدة صلاحية، وClockSkew صفر. BCrypt يستخدم لتجزئة كلمة المرور في التسجيل.
- لا يوجد مسار OTP أو إعادة تعيين كلمة مرور ظاهر في Controllers التي جرى استعراضها. غياب إثبات الهاتف في مسار التسجيل موثق كحالة تحقق يدوية.
- دور المستخدم في تسجيل العميل مضبوط إلى Customer في الخدمة؛ لم يظهر قبول role من تسجيل العميل.
- bootstrap-admin عام على مستوى Controller لكنه يرفض العملية بعد إنشاء أول Admin/SuperAdmin، ويستخدم معاملة Serializable؛ حالة قاعدة الإنتاج ومسار التهيئة الأول تحتاج تحققًا.
- لا يُعد رمز مصادقة بحد ذاته تفويضًا لقراءة صفوف الآخرين؛ F-02/F-03/F-01 تثبت الفجوة في إجراءات محددة.

### Database وInput

- لا يظهر ORM mass-binding مباشر لكيانات الإدارة في مسارات Checkout/Driver التي راجعتها؛ DTOs تدخل إلى خدمات تتحكم بكتابة الحقول.
- ما زالت Quantity وActualPurchasePrice قيمًا غير موثوقة وتُستخدم دون حدود كافية، وفق F-04/F-06.
- ValidateCheckout يقبل AddressId ويبحث عنه دون فلتر CustomerId (CheckoutController.cs:111-120)، في حين أن PlaceOrder يختار من customer.Addresses (298-324). النتيجة الظاهرة تقدير مسافة/رسوم لا إنشاء طلب؛ معرّف العنوان شرط مسبق، لذا Needs Validation.
- Idempotency lookup في CheckoutController.cs:187-203 يبحث بالمفتاح وحده ويرجع DTO الطلب دون مقارنة CustomerId. لا دليل مصدر على سهولة معرفة مفتاح مستخدم آخر، لذلك Needs Validation لا BOLA مؤكدة.

### File upload وStorage وPush

- ملفات uploads التي يخدمها Static Files عامة؛ وصول الإيصالات متأثر خصوصًا ببيانات F-01.
- لا يتحقق مسار الإيصال من magic bytes/content signature، ويخزن ContentType المرسل من العميل؛ فحص خطر sniffing/عرض الملف يتطلب تحققًا من إعدادات HTTP والعميل.
- مسار Admin Supabase Storage يستخدم مفتاح publishable وبنية URL عامة للصورة. المفتاح ليس سرًا، والكتابة/overwrite تتوقف على سياسات الحاوية البعيدة.
- لم يظهر API عام لإرسال Push إلى أي device token يرسله العميل. يلزم مراجعة إعدادات Expo/FCM الخارجية إذا كانت هناك شاشات أو مسارات غير ممثلة بالمصدر.

### Expo/React Native والعميل

- Customer API client يخزن access token في AsyncStorage؛ Admin وCourier يخزنان access وrefresh. أصل Web لـAsyncStorage يستخدم localStorage بحسب نسخة الاعتماد الموجودة. على الجهاز الأصلي، قابلية استخراج الرمز من sandbox/backup لم تثبت.
- نسختا Customer وAdmin تضمان web في app.json واعتمادات Web، وملفات EAS التي روجعت تركز على Android internal APK؛ لا دليل على نشر Web حالي.
- صفحات LocationPicker تبني iframe من srcDoc وتحمل Leaflet من CDN بلا sandbox أو SRI ظاهر. إن استُخدمت نسخة Web، فقد يعمل JavaScript ضمن أصل التطبيق ويصل إلى تخزين الصفحة. وقوع اختراق CDN أو نشر هذه النسخة غير مثبت.
- تطبيق Courier يعيد الطلب بعد 401 وتجديد ناجح بلا علم hasRetried في client.ts:127-129؛ حلقة دائمة مشروطة بأن يستمر endpoint بإرجاع 401 مع نجاح كل تجديد. تصنف NEEDS VALIDATION.

### Secrets وتهيئة الخادم

- Program.cs:132-150 يستخدم Jwt:Secret من التكوين؛ عند غيابه يوجد fallback مضمّن، وappsettings.json:17-21 يحتوي قيمة placeholder عامة غير صالحة كسر إنتاجي. إذا لم تُضبط قيمة إنتاجية قوية، يستطيع من يعرف المصدر تكوين JWT بتوقيع معروف وربما تضمين دور مرتفع. إعداد Production الفعلي لم يُقرأ.
- في تاريخ Git لمستودع backend ظهرت نسختان تاريخيتان من backend/.env. احتوتا على قيم تبدو اعتمادًا محليًا لكلمة مرور DB وسر JWT مخصص؛ البيئة/المضيف في الملف تاريخيًا محليان ولا يوجد دليل يثبت أنها Production. لا تعرض هذه المراجعة أي قيمة كاملة أو جزئية. انظر SECURITY-NEEDS-VALIDATION.md.
- ملف .env الحالي موجود لكن لم تُقرأ قيمه. إعداد origin في .git/config للمستودعين احتوى اعتمادًا داخل عنوان remote؛ القيمة لم تُعرض أو تُفحص كنص. يلزم تقييم الصلاحية والنطاق وتدويرها إن كانت فعالة.
- القيم في appsettings.json تشمل placeholders صريحة. لم يظهر service account JSON أو مفتاح خاص PEM في الملفات المفحوصة. google-services.json إعداد عميل Firebase وليس سر خادم لمجرد وجوده.

## Dependencies / Supply Chain

الجرد يشمل ملفات package-lock لتطبيقات العميل والمدير والموصل والقالب المتداخل، وملفات NuGet للمشروع الخلفي. أمثلة الإصدارات المسجلة: Expo 57.0.26، React Native 0.86.3، React 19.2.3، react-native-webview 13.16.1، AsyncStorage 2.2.0؛ وفي .NET ASP.NET JwtBearer وEF Core/Npgsql 10.0.0، FluentValidation.AspNetCore 11.3.0، BCrypt.Net-Next 4.0.3، Supabase 1.1.1. هذا ليس تعدادًا لكل dependency أو بيانًا بأن الشجرة خالية من CVE.

المراجعة الاستشارية المستهدفة لم تثبت انطباق advisories المعروفة التالية على النسخ المقروءة:
- React Native WebView CVE-2020-6506 يتناول الإصدارات الأقدم من 11؛ النسخة الموجودة 13.16.1: [GHSA-36j3-xxf7-4pqg](https://github.com/advisories/GHSA-36j3-xxf7-4pqg).
- Advisory Expo القديمة CVE-2020-24653 تخص إصدارات ما قبل 9.1، لا SDK 57 المسجل: [GHSA-rwx9-wqj8-vr77](https://github.com/advisories/GHSA-rwx9-wqj8-vr77).
- Advisory JWT Bearer CVE-2021-26701 لا تنطبق على 10.0.0 وفق نطاقها المنشور: [GHSA-q7cg-43mg-qp69](https://github.com/advisories/GHSA-q7cg-43mg-qp69).
- صفحات المشروعين الرسميتين: [Expo Security](https://github.com/expo/expo/security) و[React Native Security](https://github.com/facebook/react-native/security/advisories).

لم يُشغّل npm audit أو NuGet vulnerability scan أو خدمة registry، ولم تُحدّث أي حزمة. قد توجد advisories أحدث أو في dependencies عابرة لم يشملها الفحص الموجه؛ اعتمدوا على فحص lockfile كامل ومعتمد في بيئة منفصلة قبل الإصلاح.
