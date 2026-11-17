"use strict";

/* =========================================
   DESH 71 — HOME PAGE SCRIPT
========================================= */

/* ========== DISABLE ALL ZOOM ========== */
(function () {
  document.addEventListener("gesturestart", (e) => e.preventDefault(), { passive: false });
  document.addEventListener("touchstart", (e) => {
    if (e.touches.length > 1) e.preventDefault();
  }, { passive: false });

  let lastTouchEnd = 0;
  document.addEventListener("touchend", (e) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) e.preventDefault();
    lastTouchEnd = now;
  }, { passive: false });

  document.addEventListener("wheel", (e) => {
    if (e.ctrlKey || e.metaKey) e.preventDefault();
  }, { passive: false });

  document.addEventListener("keydown", (e) => {
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
} from "./assets/js/news.js";

import {
  getLang,
  t,
  toggleLang,
  initI18n,
} from "./assets/js/i18n.js";

/* ========== DOM ========== */
const grid = document.querySelector("#newsGrid");
const result = document.querySelector("#resultMessage");
const hero = document.querySelector("#heroNews");

let stories = [];

/* ========== HELPERS ========== */
function getTitle(article) {
  const lang = getLang();
  return lang === "bn"
    ? (article.title_bn || article.title_en || "")
    : (article.title_en || article.title_bn || "");
}

function getSummary(article) {
  const lang = getLang();
  return lang === "bn"
    ? (article.summary_bn || article.summary_en || "")
    : (article.summary_en || article.summary_bn || "");
}

function getCategoryName(article) {
  const lang = getLang();
  if (!article || !article.category) return t("category.news");
  return lang === "bn"
    ? (article.category.name_bn || article.category.name_en || t("category.news"))
    : (article.category.name_en || article.category.name_bn || t("category.news"));
}

function safeImage(url) {
  if (!url || typeof url !== "string") return "";
  const trimmed = url.trim();
  if (!/^https?:\/\//i.test(trimmed)) return "";
  return trimmed.replace(/'/g, "%27").replace(/"/g, "%22");
}

/* ========== RENDER ========== */
function renderHome() {
  if (!grid) return;

  /* No data */
  if (!stories.length) {
    grid.innerHTML =
      '<div class="empty-state">' +
        "<span>📰</span>" +
        "<h3>" + escapeHTML(t("article.noArticles")) + "</h3>" +
        "<p>" + escapeHTML(t("article.noArticlesSub")) + "</p>" +
      "</div>";
    if (hero) {
      hero.innerHTML =
        '<div class="empty-state"><h3>' +
        escapeHTML(t("article.noHeadlines")) +
        "</h3></div>";
    }
    if (result) result.textContent = "";
    return;
  }

  /* Filter by query */
  const query = new URLSearchParams(location.search).get("q") || "";
  const qLower = query.toLocaleLowerCase();

  const matching = stories.filter((item) => {
    if (!query) return true;
    return [item.title_bn, item.title_en, item.summary_bn, item.summary_en]
      .some((v) => (v || "").toLocaleLowerCase().includes(qLower));
  });

  /* No match */
  if (!matching.length) {
    grid.innerHTML =
      '<div class="empty-state">' +
        "<span>🔍</span>" +
        "<h3>" + escapeHTML(t("article.noMatch")) + "</h3>" +
        "<p>&quot;" + escapeHTML(query) + "&quot;</p>" +
      "</div>";
    if (hero) {
      hero.innerHTML =
        '<div class="empty-state"><h3>' +
        escapeHTML(t("article.noMatch")) +
        "</h3></div>";
    }
    if (result) result.textContent = "";
    return;
  }

  /* Render grid */
  grid.innerHTML = renderArticleCards(matching, getLang());

  if (result) {
    result.textContent = matching.length + " " + t("article.count");
  }

  /* Render hero */
  if (hero) {
    const lead = matching[0];
    const leadImg = safeImage(lead.image_url);
    const leadCat = escapeHTML(getCategoryName(lead));

    const sideCards = matching.slice(1, 3).map((article) => {
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
              '<a href="article.html?id=' +
                encodeURIComponent(article.id) + '">' +
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
            escapeHTML(t("article.readMore")) +
          "</a>" +
        "</div>" +
      "</article>" +
      '<div class="hero-side">' + sideCards + "</div>";
  }
}

/* ========== INIT ========== */
async function initialize() {
  /* Language init */
  initI18n();

  /* Shared UI */
  try {
    if (typeof initializeSharedUI === "function") initializeSharedUI();
  } catch (err) {
    console.warn("[Desh 71] initializeSharedUI error:", err);
  }

  /* Language toggle */
  const langBtn = document.querySelector("#languageToggle");
  if (langBtn) {
    langBtn.addEventListener("click", () => {
      toggleLang();      // Updates all [data-i18n] + aria + title + date
      renderHome();      // Re-render articles in new lang
    });
  }

  /* Search form */
  const form = document.querySelector("#searchForm");
  if (form) {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const input = document.querySelector("#searchInput");
      const query = input?.value.trim() || "";
      if (!query) {
        input?.focus();
        return;
      }
      location.href = "search.html?q=" + encodeURIComponent(query);
    });
  }

  /* Click on card */
  if (grid) {
    grid.addEventListener("click", (event) => {
      const card = event.target.closest("[data-article-id]");
      if (card && !event.target.closest("a")) {
        location.href = "article.html?id=" +
          encodeURIComponent(card.dataset.articleId);
      }
    });
  }

  /* Language changed from other tabs */
  document.addEventListener("lang:changed", () => renderHome());

  /* Supabase guard */
  const cfg = window.DESh71_SUPABASE_CONFIG;
  if (!cfg || !cfg.url || cfg.url.includes("YOUR_")) {
    grid.innerHTML =
      '<div class="empty-state">' +
        "<h3>" + escapeHTML(t("article.setupRequired")) + "</h3>" +
        "<p>" + escapeHTML(t("article.setupRequiredSub")) + "</p>" +
      "</div>";
    if (hero) hero.innerHTML = "";
    return;
  }

  /* Load articles */
  try {
    stories = await listPublishedArticles();
    renderHome();
  } catch (error) {
    console.error("[Desh 71] Load failed:", error);
    grid.innerHTML =
      '<div class="empty-state">' +
        "<h3>" + escapeHTML(t("article.loadError")) + "</h3>" +
        "<p>" + escapeHTML(t("article.loadErrorSub")) + "</p>" +
      "</div>";
    if (hero) hero.innerHTML = "";
  }
}

/* ========== BOOTSTRAP ========== */
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initialize);
} else {
  initialize();
}
