import type { Language } from "./profile.ts";
export type ProjectCopy = {
  title: string;
  category: string;
  summary: string;
  problem: string;
  solution: string;
  features: { title: string; text: string }[];
  notes: string[];
  coverLines: string[];
};
export type Project = {
  slug: string;
  name: string;
  number: string;
  team: boolean;
  publicRepo: string | null;
  website?: string;
  screenshot?: string;
  technologies: string[];
  cover: string;
  copy: Record<Language, ProjectCopy>;
};
export const projects: Project[] = [
  {
    slug: "bs-store",
    name: "BS Store",
    number: "01",
    team: false,
    publicRepo: "https://github.com/Ammar-Zuhair/BS-Store",
    technologies: [
      "React Native",
      "TypeScript",
      "Expo",
      ".NET 10",
      "Entity Framework Core",
      "PostgreSQL",
    ],
    cover: "store",
    copy: {
      ar: {
        title: "BS Store",
        category: "تجارة متعددة المتاجر · تطبيقات موبايل وخدمات خلفية",
        summary:
          "منصة توصيل ووساطة تربط العميل والمتاجر والمدير والمندوب، عبر ثلاثة تطبيقات مستقلة وخادم خلفي واحد.",
        problem:
          "الطلب من متاجر متعددة يخلق مسارات مختلفة للشراء والتحصيل والتوصيل. يحتاج العميل إلى تجربة موحّدة، وتحتاج الإدارة والمندوب إلى متابعة التفاصيل نفسها دون فقدان السياق.",
        solution:
          "فصل تجارب العميل والمدير والمندوب، مع ربطها بخدمات .NET وقاعدة PostgreSQL، وتنسيق حالات الطلب والدفع والمشتريات والتسويات المالية.",
        features: [
          {
            title: "تجربة العميل",
            text: "تصفح وبحث المنتجات والمتاجر، سلة تجمع المنتجات حسب المتجر، كوبونات وعناوين وسجل طلبات مع إعادة الطلب.",
          },
          {
            title: "الدفع ومراجعة الإيصالات",
            text: "الدفع عند الاستلام أو التحويل البنكي وإرفاق الإيصال، مع مراجعة إدارية لقيمة التحويل ومعالجة الفارق عند التسليم.",
          },
          {
            title: "تشغيل المتاجر والطلبات",
            text: "لوحة مؤشرات وإدارة المنتجات والمخزون والطلبات وإسناد المندوبين ومراجعة المدفوعات.",
          },
          {
            title: "تجربة المندوب",
            text: "متابعة محطات الشراء والتسليم، توثيق الشراء الفعلي والفواتير، الاتصال وفتح العناوين في تطبيق الخرائط.",
          },
          {
            title: "العهدة والتسويات",
            text: "عرض المحفظة والحركات المالية، تقديم طلب تسوية ومراجعته من الإدارة.",
          },
          {
            title: "تجربة محلية",
            text: "واجهات عربية باتجاه RTL وعرض المبالغ بالريال اليمني.",
          },
        ],
        notes: [
          "ثبتت التدفقات بقراءة الشاشات وسياقات البيانات ونقاط API في النسخة المتاحة، دون إجراء طلب شراء حقيقي.",
          "المصادقة في الخادم الذي تمت مراجعته تستخدم الهاتف وكلمة المرور؛ لا يُعرض OTP كخدمة رسائل نصية فعلية.",
          "الملاحة تفتح تطبيق الخرائط الخارجي. لا يُدّعى وجود تتبع حي أو محرك خرائط ومسارات إنتاجي داخل التطبيق.",
        ],
        coverLines: ["العميل", "الإدارة", "المندوب"],
      },
      en: {
        title: "BS Store",
        category: "Multi-store commerce · Mobile & backend",
        summary:
          "A delivery and shopping platform connecting customers, stores, administrators and couriers through three separate apps and a shared backend.",
        problem:
          "Ordering from multiple stores creates separate purchasing, collection and delivery flows. Customers need a unified experience while administrators and couriers need a consistent view of each order.",
        solution:
          "Separate customer, admin and courier experiences connected to .NET services and PostgreSQL, coordinating order states, payments, actual purchases and financial settlements.",
        features: [
          {
            title: "Customer experience",
            text: "Product and store browsing and search, a cart grouped by store, coupons, addresses, order history and reordering.",
          },
          {
            title: "Payments & receipts",
            text: "Cash on delivery or bank transfer with receipt upload, administrative amount verification and settlement of differences at delivery.",
          },
          {
            title: "Store & order operations",
            text: "Dashboard, product and inventory management, order management, courier assignment and payment review.",
          },
          {
            title: "Courier workflow",
            text: "Pickup and delivery stops, actual purchase and invoice recording, calling customers and opening addresses in a maps application.",
          },
          {
            title: "Cash custody & settlements",
            text: "Wallet and transaction views, settlement requests and administrative review.",
          },
          {
            title: "Local experience",
            text: "Arabic RTL interfaces and amounts displayed in Yemeni rials.",
          },
        ],
        notes: [
          "Flows were checked in screens, data contexts and API endpoints in the available snapshot. No real purchase was made.",
          "The reviewed backend authenticates using phone and password. OTP is not presented as an operational SMS service.",
          "Navigation opens an external maps application. Live tracking or a production in-app routing engine is not claimed.",
        ],
        coverLines: ["Customer", "Admin", "Courier"],
      },
    },
  },
  {
    slug: "nexuspay",
    name: "NexusPay",
    number: "02",
    team: false,
    publicRepo: "https://github.com/Ammar-Zuhair/NexusPay",
    website: "https://nexuspaystore.com",
    screenshot: "nexuspay",
    technologies: [
      "React",
      "JavaScript",
      "Vite",
      "Tailwind CSS",
      "Node.js",
      "Express.js",
      "PostgreSQL",
    ],
    cover: "nexus",
    copy: {
      ar: {
        title: "NexusPay",
        category: "تجارة إلكترونية · خدمات ومنتجات رقمية",
        summary:
          "منصة لعرض وطلب الاشتراكات والخدمات الرقمية، تشمل أدوات الذكاء الاصطناعي والتطبيقات والمواقع وشحن الألعاب.",
        problem:
          "الخدمات الرقمية متنوعة في باقاتها وبيانات طلبها وطريقة تسليمها. يحتاج المشتري إلى كتالوج واضح، وتحتاج الإدارة إلى تنظيم المنتجات وحالات الطلب.",
        solution:
          "واجهة React لعرض المنتجات والباقات، مع خادم Express ونقاط API لإدارة المنتجات والطلبات والحسابات وطلبات الإيداع.",
        features: [
          {
            title: "كتالوج المنتجات والباقات",
            text: "عرض فئات الخدمات الرقمية ومنتجاتها وباقاتها، مع إدارة المنتجات والأسعار والباقات من الواجهات المرتبطة بالخادم.",
          },
          {
            title: "تدفق الطلب",
            text: "إنشاء الطلبات وتخزين بيانات عناصرها وتتبع حالاتها، مع مسارات للمراجعة والرفض والتسليم الرقمي.",
          },
          {
            title: "الحسابات وطلبات الإيداع",
            text: "تسجيل الدخول وإنشاء الحساب واستعادة كلمة المرور، ونقاط API لطرق الإيداع المحلي ومراجعته.",
          },
          {
            title: "خدمات خلفية مستقلة",
            text: "Express مع طبقة PostgreSQL ومسارات منفصلة للمنتجات والطلبات والتقييمات والشكاوى.",
          },
        ],
        notes: [
          "تمت مراجعة الواجهة ومسارات الخادم، واستجاب الموقع العام أثناء الفحص. لم تُنفّذ عملية دفع أو شراء حقيقية.",
          "تتضمن بعض طبقات المزودين مسارات محاكاة وبدائل في الذاكرة؛ وجودها لا يثبت تشغيل جميع التكاملات الخارجية.",
          "المشروع متجر خدمات رقمية، ولا يُقدَّم كبنك أو مزود دفع مرخّص أو شريك رسمي للعلامات التجارية.",
        ],
        coverLines: ["خدمات رقمية", "باقات واشتراكات", "تجربة مترابطة"],
      },
      en: {
        title: "NexusPay",
        category: "E-commerce · Digital products & services",
        summary:
          "A platform for discovering and ordering digital subscriptions and services, including AI tools, apps, websites and game top-ups.",
        problem:
          "Digital services differ in packages, required order information and delivery methods. Buyers need a clear catalog, while administrators need organized product and order workflows.",
        solution:
          "A React storefront for products and packages, connected to an Express backend with APIs for products, orders, accounts and deposit requests.",
        features: [
          {
            title: "Products & packages",
            text: "Digital service categories, products and packages, with backend-connected management of products, prices and packages.",
          },
          {
            title: "Order flow",
            text: "Order creation, item storage and status tracking, with routes for review, rejection and digital fulfillment.",
          },
          {
            title: "Accounts & deposit requests",
            text: "Login, account creation and password recovery, plus API routes for local deposit methods and review.",
          },
          {
            title: "Separate backend services",
            text: "Express with a PostgreSQL layer and separate routes for products, orders, reviews and complaints.",
          },
        ],
        notes: [
          "Frontend and backend routes were reviewed, and the public site responded during inspection. No real payment or purchase was performed.",
          "Some provider layers include sandbox paths and in-memory fallbacks. Their presence does not establish that every external integration is operational.",
          "This is a digital services store. Banking, licensed payment services and official brand partnerships are not claimed.",
        ],
        coverLines: [
          "Digital services",
          "Plans & subscriptions",
          "A connected experience",
        ],
      },
    },
  },
  {
    slug: "graduation",
    name: "Graduate Website",
    number: "03",
    team: false,
    publicRepo: "https://github.com/Ammar-Zuhair/GraduateWebsite",
    website: "https://it-and-architecture.vercel.app",
    screenshot: "graduation",
    technologies: ["React", "JavaScript", "Vite", "Tailwind CSS", "Supabase"],
    cover: "graduation",
    copy: {
      ar: {
        title: "موقع احتفال التخرج",
        category: "تجربة ويب · مجتمع وذكريات",
        summary:
          "مساحة للاحتفاء بالخريجين، وتصفح ملفاتهم وذكريات رحلتهم، وإرسال تهانٍ تبقى معهم.",
        problem:
          "تحتاج مناسبة التخرج إلى مكان يجمع الخريجين والذكريات والتهاني، ويتيح الوصول إلى خريج بعينه دون تشتيت المحتوى.",
        solution:
          "موقع React بواجهتين عربية وإنجليزية، مع Supabase لبيانات الطلاب والتهاني والذكريات، وتدفق لاختيار التخصص والخريج قبل كتابة التهنئة.",
        features: [
          {
            title: "دليل الخريجين",
            text: "عرض الطلاب بحسب التخصص والبحث عنهم وفتح ملفاتهم الشخصية.",
          },
          {
            title: "تهانٍ موجهة",
            text: "اختيار التخصص والخريج وإرسال رسالة باسم المرسل أو بصورة مجهولة.",
          },
          {
            title: "الذكريات والأحداث",
            text: "عرض صور ومواد الذكريات وصفحات للأحداث والخط الزمني.",
          },
          {
            title: "إدارة المحتوى",
            text: "عمليات في طبقة البيانات لإدارة الطلاب والتهاني والذكريات، مع مصادقة وسياسات وصول في Supabase.",
          },
        ],
        notes: [
          "ثبتت الميزات بقراءة الصفحات وDataContext وعمليات Supabase. استجاب الموقع العام أثناء الفحص.",
          "لم تُرسل تهانٍ تجريبية إلى بيانات الموقع، ولم يُختبر حساب إدارة أو تعديل بيانات حقيقية.",
        ],
        coverLines: ["خريجون", "ذكريات", "كلمات تبقى"],
      },
      en: {
        title: "Graduation Celebration Website",
        category: "Web experience · Community & memories",
        summary:
          "A place to celebrate graduates, explore their profiles and memories, and leave personal messages of congratulations.",
        problem:
          "A graduation celebration needs a shared space for graduates, memories and wishes, with an easy way to find and congratulate a specific person.",
        solution:
          "An Arabic and English React website using Supabase for student, wish and memory data, with a guided flow to select a department and graduate before writing a message.",
        features: [
          {
            title: "Graduate directory",
            text: "Browse students by department, search for graduates and open their profiles.",
          },
          {
            title: "Personal wishes",
            text: "Choose a department and graduate, then send a message with your name or anonymously.",
          },
          {
            title: "Memories & events",
            text: "Photo and media memories, event pages and a timeline.",
          },
          {
            title: "Content management",
            text: "Data operations for managing students, wishes and memories, with Supabase authentication and access policies.",
          },
        ],
        notes: [
          "Features were checked in pages, DataContext and Supabase operations. The public website responded during inspection.",
          "No test wishes were posted. Administrative access and changes to real data were not tested.",
        ],
        coverLines: ["Graduates", "Memories", "Words that stay"],
      },
    },
  },
  {
    slug: "tradeai",
    name: "TradeAi",
    number: "04",
    team: true,
    publicRepo: "https://github.com/Ammar-Zuhair/TradeAi",
    technologies: [
      "React Native",
      "TypeScript",
      "Expo",
      "Python",
      "FastAPI",
      "SQLAlchemy",
      "TensorFlow",
    ],
    cover: "trade",
    copy: {
      ar: {
        title: "TradeAi",
        category: "تحليل الأسواق · موبايل وذكاء اصطناعي",
        summary:
          "مشروع جماعي يجمع تطبيق موبايل وخدمات Python لتحليل الأسواق وعرض الحسابات والصفقات وتشغيل نماذج تدعم قرارات التداول.",
        problem:
          "توزّع بيانات الحسابات والصفقات والتحليلات بين أدوات متعددة يجعل متابعة الصورة العامة أكثر تعقيدًا.",
        solution:
          "تطبيق React Native متصل بخادم FastAPI، إلى جانب نظام Python مستقل لتحميل النماذج وتحليل البيانات والربط بمنصة تداول.",
        features: [
          {
            title: "واجهة موبايل",
            text: "شاشات للحسابات والصفقات ونشاط الذكاء الاصطناعي، مع طبقات اتصال بخدمات الخادم.",
          },
          {
            title: "إدارة الحسابات والصفقات",
            text: "نقاط API للحسابات وسجلات التداول والتوصيات ونشاط التحليل.",
          },
          {
            title: "تشغيل النماذج",
            text: "كود لتحميل نماذج TensorFlow/Keras وتخزينها في الذاكرة واستخدامها ضمن مسارات التحليل.",
          },
          {
            title: "ربط منصة التداول",
            text: "وحدة مواءمة MetaTrader 5 ومسارات لتكامل الحسابات وتنفيذ أوامر التداول في نظام Python.",
          },
        ],
        notes: [
          "المشاركة جماعية مع زميل؛ لا تُنسب هنا مهام تفصيلية أو ملكية المشروع بالكامل لعمار.",
          "تأكد وجود كود النماذج والربط، دون تشغيل تداول حقيقي أو التحقق من حساب وسيط فعلي أو أداء النماذج.",
          "تنفيذ الربط يحتاج بيئة منصة التداول وبيانات اعتماد وإعدادات مناسبة. لا توجد ادعاءات عن الأرباح أو دقة التنبؤ أو عوائد مضمونة.",
        ],
        coverLines: ["بيانات الأسواق", "نماذج وتحليل", "تطبيق موبايل"],
      },
      en: {
        title: "TradeAi",
        category: "Market analysis · Mobile & AI",
        summary:
          "A collaborative project combining a mobile app and Python services for market analysis, account and trade views, and models that support trading decisions.",
        problem:
          "Account information, trades and analysis distributed across separate tools make it harder to follow the overall picture.",
        solution:
          "A React Native app connected to FastAPI, alongside a separate Python system for loading models, analyzing data and connecting to a trading platform.",
        features: [
          {
            title: "Mobile interface",
            text: "Screens for accounts, trades and AI activity, with service layers connecting to the backend.",
          },
          {
            title: "Accounts & trade records",
            text: "API routes for accounts, trade records, recommendations and analysis activity.",
          },
          {
            title: "Model execution",
            text: "Code for loading and caching TensorFlow/Keras models and using them in analysis workflows.",
          },
          {
            title: "Trading platform integration",
            text: "A MetaTrader 5 adapter and Python integration paths for accounts and trading orders.",
          },
        ],
        notes: [
          "Built collaboratively with a colleague. Detailed individual responsibilities and sole ownership are not attributed to Ammar.",
          "Model and integration code was reviewed. Live trading, real broker accounts and model performance were not tested.",
          "Execution requires the trading platform environment, credentials and configuration. No profits, prediction accuracy or guaranteed returns are claimed.",
        ],
        coverLines: ["Market data", "Models & analysis", "Mobile application"],
      },
    },
  },
  {
    slug: "hsa",
    name: "HSA",
    number: "05",
    team: true,
    publicRepo: null,
    technologies: [
      "React",
      "JavaScript",
      "Capacitor",
      "Python",
      "FastAPI",
      "SQLAlchemy",
    ],
    cover: "hsa",
    copy: {
      ar: {
        title: "HSA",
        category: "تقليل الهدر الغذائي · أنظمة مترابطة",
        summary:
          "مشروع جماعي لتتبع المنتجات عبر المخازن وفهم مخاطر الهدر وسوء التخزين، عبر واجهات إدارة وتطبيقات وتحليلات مدعومة بالذكاء الاصطناعي.",
        problem:
          "يصعب فهم أسباب الهدر الغذائي عندما تنفصل بيانات المنتجات والمخازن والصلاحية وظروف التخزين عن بعضها.",
        solution:
          "واجهات React للإدارة وتطبيقات مبنية باستخدام Capacitor، مع خدمات FastAPI لتتبع الدفعات والمخزون ومؤشرات مخاطر الهدر والتوصيات.",
        features: [
          {
            title: "الدفعات والمخازن",
            text: "خدمات لإدارة دفعات المنتجات وتتبع المخزون والصلاحية والمنتجات المعرّضة للخطر.",
          },
          {
            title: "متابعة المخاطر",
            text: "نقاط API لحساب درجات الخطر واكتشاف الدفعات القريبة من انتهاء الصلاحية واقتراح إجراءات.",
          },
          {
            title: "واجهات متعددة",
            text: "موقع إدارة ومكونات تطبيقات للإدارة والعملاء والمتاجر، مع إعدادات Capacitor لتطبيقات Android.",
          },
          {
            title: "التحليل والتوصيات",
            text: "طبقات لخدمات التحليل والتوصيات ومراقبة البيانات، يختلف تشغيلها بحسب النماذج والتكاملات المتاحة.",
          },
        ],
        notes: [
          "حاز المشروع الجماعي على المركز الأول في مسابقة جامعية وفق البيانات المقدمة. شهادة المشاركة في مسابقة هائل سعيد معروضة بصورة مستقلة.",
          "المستودع خاص؛ استخدم لفهم البنية والميزات دون نسخ الشيفرة أو البيانات أو عرض لقطات داخلية.",
          "لم تُشغّل المنظومة كاملة أو تكاملات الحساسات والنماذج. لا تُدّعى نتائج تجارية أو نسبة لتقليل الهدر، ولا تُنسب مهام فردية غير موثقة.",
        ],
        coverLines: ["تتبّع المنتجات", "فهم الهدر", "قرارات أوضح"],
      },
      en: {
        title: "HSA",
        category: "Food-waste reduction · Connected systems",
        summary:
          "A collaborative project for tracking products through warehouses and understanding waste and storage risks, using management interfaces, applications and AI-assisted analysis.",
        problem:
          "Understanding food waste is difficult when product, warehouse, expiry and storage-condition data remain disconnected.",
        solution:
          "React management interfaces and Capacitor-based applications, supported by FastAPI services for batches, inventory, waste-risk indicators and recommendations.",
        features: [
          {
            title: "Batches & warehouses",
            text: "Services for product batches, inventory, expiry tracking and at-risk products.",
          },
          {
            title: "Risk monitoring",
            text: "API endpoints for risk scores, soon-to-expire batches and suggested actions.",
          },
          {
            title: "Multiple interfaces",
            text: "Management website and application components for administration, customers and stores, with Capacitor Android configuration.",
          },
          {
            title: "Analysis & recommendations",
            text: "Analysis, recommendation and monitoring service layers whose execution depends on available models and integrations.",
          },
        ],
        notes: [
          "The collaborative project won first place in a university competition according to the supplied information. Hael Saeed participation is listed separately.",
          "The private repository informed the architecture and feature description. No private code, data or internal screenshots are reproduced.",
          "The full system, sensor integrations and models were not run. No commercial outcomes, waste-reduction percentages or undocumented individual responsibilities are claimed.",
        ],
        coverLines: ["Track products", "Understand waste", "Clearer decisions"],
      },
    },
  },
];
