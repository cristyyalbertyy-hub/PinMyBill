export type PrologueLocale = "en" | "ar";

export const PROLOGUE_DEFAULT_LOCALE: PrologueLocale = "en";
export const PROLOGUE_STORAGE_KEY = "prologue-apps-locale";

const en: Record<string, string> = {
  "nav.badge": "Collaborator hub",
  "hero.title": "Digital tools for the people who make Prologue happen",
  "hero.subtitle":
    "Download apps built for the team — events, learning, production. The orange dot marks the {{apps}} universe. Two are live today; many more are on the way.",
  "hero.appsLabel": "Apps",
  "hero.available": "available",
  "hero.incoming": "on the way",
  "section.live": "Available now",
  "section.soon": "Coming soon — stay tuned",
  "pinmybill.desc":
    "Receipts, timesheet and invoices in one place — for freelancers and production teams who need clarity across projects.",
  "pinmybill.tag.receipts": "Receipts + photo",
  "pinmybill.tag.timesheet": "Timesheet",
  "pinmybill.tag.invoice": "Invoice PDF",
  "pinmybill.tag.i18n": "Multilingual",
  "pinmybill.open": "Open app",
  "pinmybill.install": "Install on phone",
  "pinmybill.dashboard": "View dashboard",
  "dotfive.desc":
    "Prologue also offers a reasoning and unwind puzzle — for the quiet stretches between events, when the team needs to decompress.",
  "dotfive.tag.puzzle": "Puzzle",
  "dotfive.tag.focus": "Reasoning",
  "dotfive.tag.unwind": "Unwind",
  "dotfive.play": "Play now",
  "soon.events.name": "Events Hub",
  "soon.events.hint": "Check-in, credentials and live flow — built for Prologue Events.",
  "soon.learning.name": "Learning Portal",
  "soon.learning.hint": "Training and resources for Prologue Learning collaborators.",
  "soon.mystery.name": "Mystery App",
  "soon.mystery.hint": "Something new is taking shape. The orange dot has not revealed everything yet.",
  "soon.badge": "Coming soon",
  "footer.line1": "Prologue Apps — made with care for Events & Learning collaborators.",
  "footer.line2": "Move your cursor — the orange particles follow you. The surprise keeps growing. 🍊",
  "lang.en": "English",
  "lang.ar": "العربية",
  "lang.switch": "Language",
};

const ar: Record<string, string> = {
  "nav.badge": "مركز المتعاونين",
  "hero.title": "أدوات رقمية لمن يجعل Prologue يحدث",
  "hero.subtitle":
    "حمّل تطبيقات صُممت للفريق — فعاليات، تعلّم، إنتاج. النقطة البرتقالية تميز عالم {{apps}}. اثنان متاحان اليوم؛ والمزيد في الطريق.",
  "hero.appsLabel": "التطبيقات",
  "hero.available": "متاح",
  "hero.incoming": "في الطريق",
  "section.live": "متاح الآن",
  "section.soon": "قريباً — ترقّب",
  "pinmybill.desc":
    "إيصالات وجداول زمنية وفواتير في مكان واحد — للمستقلين وفرق الإنتاج الذين يحتاجون وضوحاً بين المشاريع.",
  "pinmybill.tag.receipts": "إيصالات + صورة",
  "pinmybill.tag.timesheet": "جدول زمني",
  "pinmybill.tag.invoice": "فاتورة PDF",
  "pinmybill.tag.i18n": "متعدد اللغات",
  "pinmybill.open": "فتح التطبيق",
  "pinmybill.install": "تثبيت على الهاتف",
  "pinmybill.dashboard": "عرض لوحة التحكم",
  "dotfive.desc":
    "تقدم Prologue أيضاً لعبة للمنطق والاسترخاء — للفترات الهادئة بين الفعاليات، حين يحتاج الفريق إلى التنفّس.",
  "dotfive.tag.puzzle": "لغز",
  "dotfive.tag.focus": "تفكير",
  "dotfive.tag.unwind": "استرخاء",
  "dotfive.play": "العب الآن",
  "soon.events.name": "Events Hub",
  "soon.events.hint": "تسجيل الدخول والبطاقات والتدفق المباشر — لـ Prologue Events.",
  "soon.learning.name": "Learning Portal",
  "soon.learning.hint": "تدريب وموارد لمتعاوني Prologue Learning.",
  "soon.mystery.name": "تطبيق غامض",
  "soon.mystery.hint": "شيء جديد يتشكّل. النقطة البرتقالية لم تكشف كل شيء بعد.",
  "soon.badge": "قريباً",
  "footer.line1": "Prologue Apps — صُنع بمحبة لمتعاوني Events و Learning.",
  "footer.line2": "حرّك المؤشر — الجسيمات البرتقالية تتبعك. المفاجأة تكبر. 🍊",
  "lang.en": "English",
  "lang.ar": "العربية",
  "lang.switch": "اللغة",
};

export const prologueDictionaries: Record<PrologueLocale, Record<string, string>> = {
  en,
  ar,
};
