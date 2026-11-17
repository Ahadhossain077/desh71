import "../../config/supabase.js";
import { supabase, isSupabaseConfigured } from "./client.js";

export { supabase, isSupabaseConfigured };

/* ========== CONSTANTS ========== */
const STORAGE_KEY_LANG = "desh71-language";
const STORAGE_KEY_THEME = "desh71-theme";

/* =====================================================
   ARTICLES
===================================================== */

export async function listPublishedArticles(categorySlug = null) {
  if (!supabase) throw new Error("Supabase is not configured.");

  const { data, error } = await supabase
    .from("articles")
    .select(
      "id,title_bn,title_en,summary_bn,summary_en,content_bn,content_en,image_url,author_name,published_at,category:categories(id,slug,name_bn,name_en)"
    )
    .eq("status", "published")
    .order("published_at", { ascending: false });

  if (error) throw error;

  return (data || []).filter(
    (article) => !categorySlug || article.category?.slug === categorySlug
  );
}

export async function getPublishedArticle(id) {
  if (!supabase) throw new Error("Supabase is not configured.");

  const { data, error } = await supabase
    .from("articles")
    .select(
      "id,title_bn,title_en,summary_bn,summary_en,content_bn,content_en,image_url,author_name,published_at,category:categories(id,slug,name_bn,name_en)"
    )
    .eq("id", id)
    .eq("status", "published")
    .maybeSingle();

  if (error) throw error;
  return data;
}

/* =====================================================
   HTML ESCAPE
===================================================== */

export function escapeHTML(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[char]
  );
}

/* =====================================================
   LANGUAGE (cached + i18n-synced)
===================================================== */

let _langCache = null;

export function getLanguage() {
  if (_langCache) return _langCache;

  try {
    _langCache =
      localStorage.getItem(STORAGE_KEY_LANG) === "en" ? "en" : "bn";
  } catch {
    _langCache = "bn";
  }

  return _langCache;
}

export function setLanguage(language) {
  const selected = language === "en" ? "en" : "bn";
  _langCache = selected;

  try {
    localStorage.setItem(STORAGE_KEY_LANG, selected);
  } catch {
    /* storage optional */
  }

  document.documentElement.lang = selected;

  /* Keep i18n.js cache in sync */
  document.dispatchEvent(
    new CustomEvent("lang:changed", { detail: selected })
  );
}

/* =====================================================
   ARTICLE CARDS RENDERER
===================================================== */

export function renderArticleCards(articles, language = getLanguage()) {
  if (!articles.length) {
    return `
      <div class="empty-state">
        <span>📰</span>
        <h3>${
          language === "bn"
            ? "কোনো প্রকাশিত সংবাদ পাওয়া যায়নি"
            : "No published articles found"
        }</h3>
      </div>
    `;
  }

  const locale = language === "bn" ? "bn-BD" : "en-GB";

  return articles
    .map((article) => {
      const title =
        language === "bn" ? article.title_bn : article.title_en;
      const summary =
        language === "bn" ? article.summary_bn : article.summary_en;
      const category =
        language === "bn"
          ? article.category?.name_bn
          : article.category?.name_en;

      const image = article.image_url
        ? `
          <img
            class="news-card-image"
            src="${escapeHTML(article.image_url)}"
            alt="${escapeHTML(title)}"
            loading="lazy"
            decoding="async"
          >
        `
        : `<div class="news-card-placeholder" aria-label="No image">📰</div>`;

      let dateStr = "";
      if (article.published_at) {
        try {
          dateStr = new Date(article.published_at).toLocaleDateString(
            locale
          );
        } catch {
          dateStr = "";
        }
      }

      return `
        <article class="news-card" data-article-id="${escapeHTML(article.id)}">

          <a
            class="news-card-media"
            href="article.html?id=${encodeURIComponent(article.id)}"
            aria-label="${escapeHTML(title)}"
          >
            ${image}
          </a>

          <div class="news-card-body">

            <span class="category-tag">
              ${escapeHTML(
                category || (language === "bn" ? "সংবাদ" : "News")
              )}
            </span>

            <h3>
              <a href="article.html?id=${encodeURIComponent(article.id)}">
                ${escapeHTML(title)}
              </a>
            </h3>

            <p>${escapeHTML(summary)}</p>

            <div class="news-meta">
              <span>${escapeHTML(article.author_name || "")}</span>
              <span>${escapeHTML(dateStr)}</span>
            </div>

            <a
              class="card-read"
              href="article.html?id=${encodeURIComponent(article.id)}"
            >
              ${
                language === "bn"
                  ? "বিস্তারিত পড়ুন →"
                  : "Read more →"
              }
            </a>

          </div>
        </article>
      `;
    })
    .join("");
}

/* =====================================================
   SHARED UI (idempotent, no desktop toggle)
===================================================== */

let _sharedUIInitialized = false;

export function initializeSharedUI() {
  if (_sharedUIInitialized) return;
  _sharedUIInitialized = true;

  const language = getLanguage();

  /* ---------- Date ---------- */
  const date = document.querySelector("#todayDate");
  if (date) {
    try {
      date.textContent = new Intl.DateTimeFormat(
        language === "bn" ? "bn-BD" : "en-GB",
        {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        }
      ).format(new Date());
    } catch {
      date.textContent = "";
    }
  }

  /* ---------- Year ---------- */
  const year = document.querySelector("#year");
  if (year) {
    year.textContent = String(new Date().getFullYear());
  }

  /* ---------- Theme ---------- */
  const themeButton = document.querySelector("#themeToggle");

  let theme = "light";
  try {
    theme = localStorage.getItem(STORAGE_KEY_THEME) || "light";
  } catch {
    /* storage optional */
  }

  document.body.classList.toggle("dark", theme === "dark");

  if (themeButton) {
    themeButton.textContent = theme === "dark" ? "☀" : "☾";
    themeButton.setAttribute("aria-label", "Toggle dark mode");

    themeButton.addEventListener("click", () => {
      const isDark = document.body.classList.toggle("dark");
      const next = isDark ? "dark" : "light";

      themeButton.textContent = isDark ? "☀" : "☾";

      try {
        localStorage.setItem(STORAGE_KEY_THEME, next);
      } catch {
        /* storage optional */
      }
    });
  }

  /* ---------- Mobile navigation ---------- */
  const menu = document.querySelector("#menuToggle");

  menu?.addEventListener("click", () => {
    const nav = document.querySelector("#mainNav");
    const open = nav?.classList.toggle("open");

    menu.setAttribute("aria-expanded", String(Boolean(open)));
    menu.textContent = open ? "✕" : "☰";
  });

  /* ---------- Language button label ---------- */
  const languageButton = document.querySelector("#languageToggle");

  if (languageButton) {
    languageButton.textContent = language === "bn" ? "EN" : "বাং";
    languageButton.setAttribute(
      "aria-label",
      language === "bn" ? "Switch to English" : "বাংলায় দেখুন"
    );
  }

  /* ---------- Listen for language changes ---------- */
  document.addEventListener("lang:changed", (e) => {
    const nextLang = e.detail === "en" ? "en" : "bn";

    if (languageButton) {
      languageButton.textContent = nextLang === "bn" ? "EN" : "বাং";
      languageButton.setAttribute(
        "aria-label",
        nextLang === "bn" ? "Switch to English" : "বাংলায় দেখুন"
      );
    }

    /* Refresh date locale */
    if (date) {
      try {
        date.textContent = new Intl.DateTimeFormat(
          nextLang === "bn" ? "bn-BD" : "en-GB",
          {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          }
        ).format(new Date());
      } catch {
        /* ignore */
      }
    }
  });
}
