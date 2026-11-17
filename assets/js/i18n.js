/* =====================================================
   DESH 71 — i18n (Language Toggle System)
   Bangla ↔ English · Auto-persist · Full UI translation
===================================================== */

const STORAGE_KEY = "desh71-language";

/* ========== TRANSLATIONS ========== */
const TRANSLATIONS = {
  bn: {
    "page.title": "Desh 71 | সত্যের পথে সংবাদ",
    "brand.name": "DESH 71",
    "brand.tagline": "সত্যের পথে সংবাদ",
    "brand-center.category": "বাংলাদেশের সংবাদমাধ্যম",
    "brand-center.slogan": "সত্যের পাশে, মানুষের সাথে",
    "topbar.about": "আমাদের সম্পর্কে",
    "topbar.contact": "যোগাযোগ",
    "menu.aria": "মেনু",
    "theme.aria": "থিম পরিবর্তন করুন",
    "nav.home": "প্রচ্ছদ",
    "nav.national": "জাতীয়",
    "nav.politics": "রাজনীতি",
    "nav.international": "আন্তর্জাতিক",
    "nav.sports": "খেলাধুলা",
    "nav.business": "ব্যবসা",
    "nav.technology": "প্রযুক্তি",
    "nav.entertainment": "বিনোদন",
    "breaking.text": "বাংলা ও English-এ প্রকাশিত সংবাদ পড়ুন",
    "hero.heading": "আজকের প্রধান সংবাদ",
    "hero.live": "সর্বশেষ আপডেট",
    "news.heading": "সর্বশেষ সংবাদ",
    "search.placeholder": "সংবাদ খুঁজুন...",
    "search.aria": "সংবাদ খুঁজুন",
    "search.button": "খুঁজুন",
    "filter.all": "সব সংবাদ",
    "newsletter.heading": "সত্যের পাশে, মানুষের সাথে",
    "newsletter.text": "নির্ভরযোগ্য সংবাদ ও তথ্য পাঠকের কাছে পৌঁছে দেওয়াই আমাদের লক্ষ্য।",
    "newsletter.cta": "যোগাযোগ করুন →",
    "footer.tagline": "সত্যের পাশে, মানুষের সাথে।",
    "footer.about": "আমাদের সম্পর্কে",
    "footer.latest": "সর্বশেষ সংবাদ",
    "footer.email": "ইমেইল",
    "footer.copyright": "সর্বস্বত্ব সংরক্ষিত।",
    "article.readMore": "বিস্তারিত পড়ুন →",
    "article.count": "টি সংবাদ",
    "article.noArticles": "এখনো কোনো প্রকাশিত সংবাদ নেই",
    "article.noArticlesSub": "প্রকাশিত সংবাদ এখানে দেখা যাবে।",
    "article.noHeadlines": "কোনো প্রধান সংবাদ নেই",
    "article.noMatch": "কোনো মিলে যাওয়া সংবাদ নেই",
    "article.loadError": "সংবাদ লোড করা যায়নি",
    "article.loadErrorSub": "Supabase কনফিগারেশন চেক করুন।",
    "article.setupRequired": "Supabase সেটআপ প্রয়োজন",
    "article.setupRequiredSub": "config/supabase.js কনফিগার করুন।",
    "category.news": "সংবাদ",
    "category.all": "সব বিভাগ",
    "search.results": "সার্চ ফলাফল",
    "search.noResults": "কোনো ফলাফল পাওয়া যায়নি",
    "category.heading": "বিভাগ",
    "lang.toggleAria": "Switch to English",
    "lang.buttonText": "EN"
  },

  en: {
    "page.title": "Desh 71 | Truth beside people",
    "brand.name": "DESH 71",
    "brand.tagline": "Truth beside people",
    "brand-center.category": "Bangladesh's news media",
    "brand-center.slogan": "Truth beside people",
    "topbar.about": "About us",
    "topbar.contact": "Contact",
    "menu.aria": "Menu",
    "theme.aria": "Toggle theme",
    "nav.home": "Home",
    "nav.national": "National",
    "nav.politics": "Politics",
    "nav.international": "International",
    "nav.sports": "Sports",
    "nav.business": "Business",
    "nav.technology": "Technology",
    "nav.entertainment": "Entertainment",
    "breaking.text": "Read news published in Bangla & English",
    "hero.heading": "Today's headlines",
    "hero.live": "Latest update",
    "news.heading": "Latest stories",
    "search.placeholder": "Search news...",
    "search.aria": "Search news",
    "search.button": "Search",
    "filter.all": "All news",
    "newsletter.heading": "Truth beside people",
    "newsletter.text": "Our goal is to deliver reliable news and information to our readers.",
    "newsletter.cta": "Contact us →",
    "footer.tagline": "Truth beside people.",
    "footer.about": "About us",
    "footer.latest": "Latest news",
    "footer.email": "Email",
    "footer.copyright": "All rights reserved.",
    "article.readMore": "Read story →",
    "article.count": "articles",
    "article.noArticles": "No published articles yet",
    "article.noArticlesSub": "Published articles will appear here.",
    "article.noHeadlines": "No headlines available",
    "article.noMatch": "No matching articles",
    "article.loadError": "Could not load articles",
    "article.loadErrorSub": "Check Supabase configuration.",
    "article.setupRequired": "Supabase setup required",
    "article.setupRequiredSub": "Configure config/supabase.js.",
    "category.news": "News",
    "category.all": "All categories",
    "search.results": "Search results",
    "search.noResults": "No results found",
    "category.heading": "Category",
    "lang.toggleAria": "বাংলায় দেখুন",
    "lang.buttonText": "বাং"
  }
};

/* ========== STATE ========== */
let _cachedLang = null;

/* ========== CORE FUNCTIONS ========== */

export function getLang() {
  if (_cachedLang) return _cachedLang;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "en" || stored === "bn") {
      _cachedLang = stored;
      return _cachedLang;
    }
  } catch (e) {}

  _cachedLang = "bn";
  return _cachedLang;
}

/* Aliases for news.js compatibility */
export const getLanguage = getLang;

export function setLang(lang) {
  _cachedLang = lang === "en" ? "en" : "bn";
  try {
    localStorage.setItem(STORAGE_KEY, _cachedLang);
  } catch (e) {}

  document.documentElement.setAttribute("lang", _cachedLang);
  return _cachedLang;
}

export const setLanguage = setLang;

/* Translate a key */
export function t(key) {
  const lang = getLang();
  const dict = TRANSLATIONS[lang] || TRANSLATIONS.bn;
  return dict[key] ?? TRANSLATIONS.bn[key] ?? key;
}

/* Apply all translations to DOM */
export function applyTranslations() {
  const lang = getLang();
  const dict = TRANSLATIONS[lang] || TRANSLATIONS.bn;

  document.documentElement.setAttribute("lang", lang);

  /* Text content */
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    const text = dict[key] ?? TRANSLATIONS.bn[key];
    if (text != null) el.textContent = text;
  });

  /* Placeholders */
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.getAttribute("data-i18n-placeholder");
    const text = dict[key] ?? TRANSLATIONS.bn[key];
    if (text != null) el.setAttribute("placeholder", text);
  });

  /* Aria-labels */
  document.querySelectorAll("[data-i18n-aria-label]").forEach((el) => {
    const key = el.getAttribute("data-i18n-aria-label");
    const text = dict[key] ?? TRANSLATIONS.bn[key];
    if (text != null) el.setAttribute("aria-label", text);
  });

  /* Titles */
  document.querySelectorAll("[data-i18n-title]").forEach((el) => {
    const key = el.getAttribute("data-i18n-title");
    const text = dict[key] ?? TRANSLATIONS.bn[key];
    if (text != null) el.setAttribute("title", text);
  });

  /* Page title */
  const pageTitle = dict["page.title"] ?? TRANSLATIONS.bn["page.title"];
  if (pageTitle) document.title = pageTitle;

  /* Language toggle button */
  const langBtn = document.querySelector("#languageToggle");
  if (langBtn) {
    langBtn.textContent = dict["lang.buttonText"] ?? "EN";
    langBtn.setAttribute(
      "aria-label",
      dict["lang.toggleAria"] ?? "Change language"
    );
  }

  /* Date */
  updateTodayDate();
}

/* Date in current language */
function updateTodayDate() {
  const el = document.getElementById("todayDate");
  if (!el) return;

  const lang = getLang();
  const locale = lang === "bn" ? "bn-BD" : "en-GB";

  try {
    el.textContent = new Date().toLocaleDateString(locale, {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  } catch (e) {
    el.textContent = lang === "bn" ? "আজকের সংবাদ" : "Today";
  }
}

/* Toggle language */
export function toggleLang() {
  setLang(getLang() === "bn" ? "en" : "bn");
  applyTranslations();

  document.dispatchEvent(
    new CustomEvent("lang:changed", { detail: getLang() })
  );
}

/* Init (call on DOM ready) */
export function initI18n() {
  setLang(getLang());
  applyTranslations();
}

/* Count suffix helper */
export function countLabel(count) {
  const lang = getLang();
  if (lang === "bn") return count + " " + t("article.count");
  return count + " " + t("article.count");
}

/* Listen for external language changes */
document.addEventListener("lang:changed", (e) => {
  const newLang = e.detail === "en" ? "en" : "bn";
  if (newLang === _cachedLang) return;
  _cachedLang = newLang;
  applyTranslations();
});
