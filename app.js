"use strict";

/* =========================================
   DESH 71 — HOME PAGE SCRIPT
   Mobile-first | Zoom-off | Full bilingual
========================================= */

/* ========== DISABLE ALL ZOOM ========== */
(function () {
  "use strict";

  document.addEventListener("gesturestart", function (e) {
    e.preventDefault();
  }, { passive: false });

  document.addEventListener("touchstart", function (e) {
    if (e.touches.length > 1) e.preventDefault();
  }, { passive: false });

  let lastTouchEnd = 0;
  document.addEventListener("touchend", function (e) {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) e.preventDefault();
    lastTouchEnd = now;
  }, { passive: false });

  document.addEventListener("wheel", function (e) {
    if (e.ctrlKey || e.metaKey) e.preventDefault();
  }, { passive: false });

  document.addEventListener("keydown", function (e) {
    if ((e.ctrlKey || e.metaKey) && ["+", "-", "=", "0"].includes(e.key)) {
      e.preventDefault();
    }
  }, { passive: false });
})();

/* ========== IMPORTS ========== */
import {
  listPublishedArticles,
  renderArticleCards,
  escapeHTML,
  initializeSharedUI,
  getLanguage,
  setLanguage,
} from "./assets/js/news.js";

/* ========== DOM CACHE ========== */
const grid = document.querySelector("#newsGrid");
const result = document.querySelector("#resultMessage");
const hero = document.querySelector("#heroNews");

let stories = [];

/* ========== LANGUAGE LABELS ========== */
const LABELS = {
  bn: {
    noArticles: "এখনো কোনো প্রকাশিত সংবাদ নেই",
    noArticlesSub: "প্রকাশিত সংবাদ এখানে দেখা যাবে।",
    noHeadlines: "কোনো প্রধান সংবাদ নেই",
    noMatch: "কোনো মিলে যাওয়া সংবাদ নেই",
    readMore: "বিস্তারিত পড়ুন →",
    articlesSuffix: "টি সংবাদ",
    articlesPrefix: "",
    searchPlaceholder: "সংবাদ খুঁজুন...",
    searchLabel: "সংবাদ খুঁজুন",
    category: "সংবাদ",
    loadError: "সংবাদ লোড করা যায়নি",
    loadErrorSub: "Supabase কনফিগারেশন ও ডেটাবেস চেক করুন।",
    setupRequired: "Supabase সেটআপ প্রয়োজন",
    setupRequiredSub: "config/supabase.js কনফিগার করুন।",
    langBtn: "EN",
    langAria: "Switch to English",
    heroHeading: "আজকের প্রধান সংবাদ",
    newsHeading: "সর্বশেষ সংবাদ",
    pageTitle: "Desh 71 | সত্যের পথে সংবাদ",
    nav: {
      home: "প্রচ্ছদ",
      national: "জাতীয়",
      politics: "রাজনীতি",
      international: "আন্তর্জাতিক",
      sports: "খেলাধুলা",
      business: "ব্যবসা",
      technology: "প্রযুক্তি",
      entertainment: "বিনোদন",
      allNews: "সব সংবাদ",
    },
    eyebrow: {
      hero: "আজকের প্রধান সংবাদ",
      latest: "সর্বশেষ সংবাদ",
      about: "দেশ ৭১ সম্পর্কে",
    },
  },
  en: {
    noArticles: "No published articles yet",
    noArticlesSub: "Published articles will appear here.",
    noHeadlines: "No headlines available",
    noMatch: "No matching articles",
    readMore: "Read story →",
    articlesSuffix: "articles",
    articlesPrefix: "",
    searchPlaceholder: "Search news...",
    searchLabel: "Search news",
    category: "News",
    loadError: "Could not load articles",
    loadErrorSub: "Check Supabase configuration and database setup.",
    setupRequired: "Supabase setup required",
    setupRequiredSub: "Configure config/supabase.js to load published articles.",
    langBtn: "বাং",
    langAria: "বাংলায় দেখুন",
    heroHeading: "Today's headlines",
    newsHeading: "Latest stories",
    pageTitle: "Desh 71 | Truth beside people",
    nav: {
      home: "Home",
      national: "National",
      politics: "Politics",
      international: "International",
      sports: "Sports",
      business: "Business",
      technology: "Technology",
      entertainment: "Entertainment",
      allNews: "All news",
    },
    eyebrow: {
      hero: "Today's headlines",
      latest: "Latest stories",
      about: "About Desh 71",
    },
  },
};

/* ========== HELPERS ========== */
function t(key) {
  const lang = getLanguage();
  return (LABELS[lang] && LABELS[lang][key]) || LABELS.bn[key] || key;
}

function getCategoryName(article) {
  const lang = getLanguage();
  if (!article || !article.category) return t("category");
  return lang === "bn"
    ? (article.category.name_bn || article.category.name_en || t("category"))
    : (article.category.name_en || article.category.name_bn || t("category"));
}

function getTitle(article) {
  const lang = getLanguage();
  return lang === "bn"
    ? (article.title_bn || article.title_en || "")
    : (article.title_en || article.title_bn || "");
}

function getSummary(article) {
  const lang = getLanguage();
  return lang === "bn"
    ? (article.summary_bn || article.summary_en || "")
    : (article.summary_en || article.summary_bn || "");
}

function safeImage(url) {
  if (!url || typeof url !== "string") return "";
  const trimmed = url.trim();
  if (!/^https?:\/\//i.test(trimmed)) return "";
  return trimmed.replace(/'/g, "%27").replace(/"/g, "%22");
}

/* ========== UPDATE PAGE CHROME ========== */
function updatePageChrome() {
  const lang = getLanguage();
  const L = LABELS[lang] || LABELS.bn;

  // Search input
  const searchInput = document.querySelector("#searchInput");
  if (searchInput) {
    searchInput.placeholder = L.searchPlaceholder;
    searchInput.setAttribute("aria-label", L.searchLabel);
  }

  // Language button
  const langBtn = document.querySelector("#languageToggle");
  if (langBtn) {
    langBtn.textContent = L.langBtn;
    langBtn.setAttribute("aria-label", L.langAria);
  }

  // Nav links
  const navMap = [
    { match: "index.html", key: "home" },
    { match: "national", key: "national" },
    { match: "politics", key: "politics" },
    { match: "international", key: "international" },
    { match: "sports", key: "sports" },
    { match: "business", key: "business" },
    { match: "technology", key: "technology" },
    { match: "entertainment", key: "entertainment" },
  ];

  document.querySelectorAll(".nav-inner a").forEach(function (link) {
    const href = link.getAttribute("href") || "";
    if (href.indexOf("index.html") !== -1 && href.indexOf("category") === -1) {
      link.textContent = L.nav.home;
      return;
    }
    for (let i = 0; i < navMap.length; i++) {
      const item = navMap[i];
      if (item.key !== "home" && href.indexOf(item.match) !== -1) {
        link.textContent = L.nav[item.key];
        return;
      }
    }
  });

  // Category filter pills
  document.querySelectorAll("#categoryFilters .filter-btn").forEach(function (link) {
    const href = link.getAttribute("href") || "";
    if (href.indexOf("index.html") !== -1 && href.indexOf("category") === -1) {
      link.textContent = L.nav.allNews;
      return;
    }
    for (let i = 0; i < navMap.length; i++) {
      const item = navMap[i];
      if (item.key !== "home" && href.indexOf(item.match) !== -1) {
        link.textContent = L.nav[item.key];
        return;
      }
    }
  });

  // Section headings
  const heroHeading = document.querySelector("#heroHeading");
  if (heroHeading) heroHeading.textContent = L.heroHeading;

  const newsHeading = document.querySelector("#newsHeading");
  if (newsHeading) newsHeading.textContent = L.newsHeading;

  // Eyebrow labels (order: TODAY'S HEADLINES, LATEST STORIES, ABOUT DESH 71)
  const eyebrows = document.querySelectorAll(".eyebrow");
  if (eyebrows[0]) eyebrows[0].textContent = L.eyebrow.hero;
  if (eyebrows[1]) eyebrows[1].textContent = L.eyebrow.latest;
  if (eyebrows[2]) eyebrows[2].textContent = L.eyebrow.about;

  // Page title
  document.title = L.pageTitle;
}

/* ========== RENDER HOME ========== */
function renderHome() {
  if (!grid) return;
  const language = getLanguage();
  const L = LABELS[language] || LABELS.bn;

  // No data
  if (!stories.length) {
    grid.innerHTML =
      '<div class="empty-state">' +
        '<span>📰</span>' +
        "<h3>" + escapeHTML(L.noArticles) + "</h3>" +
        "<p>" + escapeHTML(L.noArticlesSub) + "</p>" +
      "</div>";
    if (hero) {
      hero.innerHTML =
        '<div class="empty-state"><h3>' + escapeHTML(L.noHeadlines) + "</h3></div>";
    }
    if (result) result.textContent = "";
    return;
  }

  // Filter by search query
  const query = new URLSearchParams(location.search).get("q") || "";
  const qLower = query.toLocaleLowerCase();
  const matching = stories.filter(function (item) {
    if (!query) return true;
    return [item.title_bn, item.title_en, item.summary_bn, item.summary_en]
      .some(function (v) {
        return (v || "").toLocaleLowerCase().indexOf(qLower) !== -1;
      });
  });

  // No match
  if (!matching.length) {
    grid.innerHTML =
      '<div class="empty-state">' +
        "<span>🔍</span>" +
        "<h3>" + escapeHTML(L.noMatch) + "</h3>" +
        "<p>&quot;" + escapeHTML(query) + "&quot;</p>" +
      "</div>";
    if (hero) {
      hero.innerHTML =
        '<div class="empty-state"><h3>' + escapeHTML(L.noMatch) + "</h3></div>";
    }
    if (result) result.textContent = "";
    return;
  }

  // Render grid
  grid.innerHTML = renderArticleCards(matching, language);

  if (result) {
    result.textContent = language === "bn"
      ? (matching.length + " " + L.articlesSuffix)
      : (matching.length + " " + L.articlesSuffix);
  }

  // Render hero
  if (hero) {
    const lead = matching[0];
    const leadImg = safeImage(lead.image_url);
    const leadCat = escapeHTML(getCategoryName(lead));

    const sideCards = matching.slice(1, 3).map(function (article) {
      const sImg = safeImage(article.image_url);
      const sCat = escapeHTML(getCategoryName(article));
      const artStyle = sImg
        ? ' style="background-image:url(\'' + sImg + '\')"'
        : "";
      return (
        '<article class="side-card">' +
          '<div class="side-art"' + artStyle + ">" +
            (sImg ? "" : sCat) +
          "</div>" +
          "<div>" +
            '<span class="category-tag">' + sCat + "</span>" +
            "<h3>" +
              '<a href="article.html?id=' + encodeURIComponent(article.id) + '">' +
                escapeHTML(getTitle(article)) +
              "</a>" +
            "</h3>" +
            "<small>" + escapeHTML(article.author_name || "") + "</small>" +
          "</div>" +
        "</article>"
      );
    }).join("");

    const leadArtStyle = leadImg
      ? ' style="background-image:url(\'' + leadImg + '\')"'
      : "";

    hero.innerHTML =
      '<article class="hero-main">' +
        '<div class="hero-art"' + leadArtStyle + ">" +
          "<span>" + leadCat + "</span>" +
        "</div>" +
        '<div class="hero-content">' +
          '<span class="category-tag">' + leadCat + "</span>" +
          "<h1>" + escapeHTML(getTitle(lead)) + "</h1>" +
          "<p>" + escapeHTML(getSummary(lead)) + "</p>" +
          '<a class="read-more" href="article.html?id=' +
            encodeURIComponent(lead.id) + '">' +
            escapeHTML(L.readMore) +
          "</a>" +
        "</div>" +
      "</article>" +
      '<div class="hero-side">' + sideCards + "</div>";
  }
}

/* ========== INITIALIZE ========== */
async function initialize() {
  // Shared UI (theme, mobile menu, date, year)
  try {
    if (typeof initializeSharedUI === "function") initializeSharedUI();
  } catch (err) {
    console.warn("[Desh 71] initializeSharedUI error:", err);
  }

  // Sync chrome with current language
  updatePageChrome();

  // Language toggle
  const languageButton = document.querySelector("#languageToggle");
  if (languageButton) {
    languageButton.addEventListener("click", function () {
      setLanguage(getLanguage() === "bn" ? "en" : "bn");
      updatePageChrome();
      renderHome();
    });
  }

  // Search form
  const form = document.querySelector("#searchForm");
  if (form) {
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      const input = document.querySelector("#searchInput");
      const query = input ? input.value.trim() : "";
      if (!query) {
        input && input.focus();
        return;
      }
      location.href = "search.html?q=" + encodeURIComponent(query);
    });
  }

  // Click on card
  if (grid) {
    grid.addEventListener("click", function (event) {
      const card = event.target.closest("[data-article-id]");
      if (card && !event.target.closest("a")) {
        location.href = "article.html?id=" + encodeURIComponent(card.dataset.articleId);
      }
    });
  }

  // Supabase config guard
  const cfg = window.DESh71_SUPABASE_CONFIG;
  if (!cfg || !cfg.url || cfg.url.indexOf("YOUR_") !== -1) {
    if (grid) {
      grid.innerHTML =
        '<div class="empty-state">' +
          "<h3>" + escapeHTML(t("setupRequired")) + "</h3>" +
          "<p>" + escapeHTML(t("setupRequiredSub")) + "</p>" +
        "</div>";
    }
    if (hero) hero.innerHTML = "";
    return;
  }

  // Load articles
  try {
    stories = await listPublishedArticles();
    renderHome();
  } catch (error) {
    console.error("[Desh 71] Failed to load articles:", error);
    if (grid) {
      grid.innerHTML =
        '<div class="empty-state">' +
          "<h3>" + escapeHTML(t("loadError")) + "</h3>" +
          "<p>" + escapeHTML(t("loadErrorSub")) + "</p>" +
        "</div>";
    }
    if (hero) hero.innerHTML = "";
  }
}

/* ========== BOOTSTRAP (safe DOM-ready) ========== */
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initialize);
} else {
  initialize();
}
