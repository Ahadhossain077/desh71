
import "../../config/supabase.js";
import { supabase, isSupabaseConfigured } from "./client.js";

export { supabase, isSupabaseConfigured };

export async function listPublishedArticles(categorySlug = null) {
  if (!supabase) throw new Error("Supabase is not configured.");

  const { data, error } = await supabase
    .from("articles")
    .select("id,title_bn,title_en,summary_bn,summary_en,content_bn,content_en,image_url,author_name,published_at,category:categories(id,slug,name_bn,name_en)")
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
    .select("id,title_bn,title_en,summary_bn,summary_en,content_bn,content_en,image_url,author_name,published_at,category:categories(id,slug,name_bn,name_en)")
    .eq("id", id)
    .eq("status", "published")
    .maybeSingle();

  if (error) throw error;
  return data;
}

export function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

export function getLanguage() {
  try {
    return localStorage.getItem("desh71-language") === "en" ? "en" : "bn";
  } catch {
    return "bn";
  }
}

export function setLanguage(language) {
  const selected = language === "en" ? "en" : "bn";

  try {
    localStorage.setItem("desh71-language", selected);
  } catch {
    // Storage is optional.
  }

  document.documentElement.lang = selected;

  const languageButton = document.querySelector("#languageToggle");
  if (languageButton) {
    languageButton.textContent = selected === "bn" ? "EN" : "বাংলা";
  }
}

export function renderArticleCards(articles, language = getLanguage()) {
  if (!articles.length) {
    return `
      <div class="empty-state">
        <span>📰</span>
        <h3>${language === "bn"
          ? "কোনো প্রকাশিত সংবাদ পাওয়া যায়নি"
          : "No published articles found"}</h3>
      </div>
    `;
  }

  return articles.map((article) => {
    const title = language === "bn" ? article.title_bn : article.title_en;
    const summary = language === "bn" ? article.summary_bn : article.summary_en;
    const category = language === "bn"
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
            ${escapeHTML(category || (language === "bn" ? "সংবাদ" : "News"))}
          </span>

          <h3>
            <a href="article.html?id=${encodeURIComponent(article.id)}">
              ${escapeHTML(title)}
            </a>
          </h3>

          <p>${escapeHTML(summary)}</p>

          <div class="news-meta">
            <span>${escapeHTML(article.author_name || "")}</span>
            <span>
              ${article.published_at
                ? new Date(article.published_at).toLocaleDateString(
                    language === "bn" ? "bn-BD" : "en-US"
                  )
                : ""}
            </span>
          </div>

          <a
            class="card-read"
            href="article.html?id=${encodeURIComponent(article.id)}"
          >
            ${language === "bn" ? "বিস্তারিত পড়ুন →" : "Read more →"}
          </a>

        </div>
      </article>
    `;
  }).join("");
}

export function initializeSharedUI() {
  const language = getLanguage();

  const date = document.querySelector("#todayDate");
  if (date) {
    date.textContent = new Intl.DateTimeFormat(
      language === "bn" ? "bn-BD" : "en-US",
      {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
      }
    ).format(new Date());
  }

  const year = document.querySelector("#year");
  if (year) {
    year.textContent = String(new Date().getFullYear());
  }

  // Theme
  const themeButton = document.querySelector("#themeToggle");

  let theme = "light";
  try {
    theme = localStorage.getItem("desh71-theme") || "light";
  } catch {
    // Storage is optional.
  }

  document.body.classList.toggle("dark", theme === "dark");

  if (themeButton) {
    themeButton.textContent = theme === "dark" ? "☀" : "☾";
    themeButton.setAttribute("aria-label", "Toggle dark mode");

    themeButton.addEventListener("click", () => {
      const next = document.body.classList.toggle("dark") ? "dark" : "light";

      themeButton.textContent = next === "dark" ? "☀" : "☾";

      try {
        localStorage.setItem("desh71-theme", next);
      } catch {
        // Storage is optional.
      }
    });
  }

  // Mobile navigation
  const menu = document.querySelector("#menuToggle");

  menu?.addEventListener("click", () => {
    const nav = document.querySelector("#mainNav");
    const open = nav?.classList.toggle("open");

    menu.setAttribute("aria-expanded", String(Boolean(open)));
    menu.textContent = open ? "✕" : "☰";
  });

  // Language
  const languageButton = document.querySelector("#languageToggle");

  if (languageButton) {
    languageButton.textContent = language === "bn" ? "EN" : "বাংলা";
  }

  // Desktop / Mobile layout toggle
  const headerActions = document.querySelector(".header-actions");

  if (headerActions && !document.querySelector("#desktopToggle")) {
    const desktopButton = document.createElement("button");

    desktopButton.type = "button";
    desktopButton.id = "desktopToggle";
    desktopButton.className = "desktop-toggle";

    const updateDesktopButton = () => {
      const enabled = document.body.classList.contains("desktop-mode");

      desktopButton.textContent = enabled ? "Mobile" : "Desktop";
      desktopButton.setAttribute("aria-pressed", String(enabled));
      desktopButton.setAttribute(
        "aria-label",
        enabled ? "Switch to mobile layout" : "Switch to desktop layout"
      );
    };

    let desktopMode = false;

    try {
      desktopMode = localStorage.getItem("desh71-desktop-mode") === "true";
    } catch {
      // Storage is optional.
    }

    document.body.classList.toggle("desktop-mode", desktopMode);
    updateDesktopButton();

    desktopButton.addEventListener("click", () => {
      const enabled = document.body.classList.toggle("desktop-mode");

      try {
        localStorage.setItem("desh71-desktop-mode", String(enabled));
      } catch {
        // Storage is optional.
      }

      updateDesktopButton();
    });

    const menuButton = headerActions.querySelector("#menuToggle");

    if (menuButton) {
      headerActions.insertBefore(desktopButton, menuButton);
    } else {
      headerActions.appendChild(desktopButton);
    }
  }
}
