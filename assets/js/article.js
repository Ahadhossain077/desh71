
import {
  getPublishedArticle,
  escapeHTML,
  getLanguage,
  setLanguage,
  initializeSharedUI
} from "./news.js";

const root = document.querySelector("#articleDetail");

/* =====================================================
   DESH 71 - INLINE IMAGE RENDERER
===================================================== */

function renderArticleBody(body = "") {
  const marker =
    /\[\[DESH71_IMAGE:(https:\/\/[^\s\]]+)\]\]/g;

  let output = "";
  let lastIndex = 0;
  let match;

  while ((match = marker.exec(body)) !== null) {
    const textBefore = body.slice(lastIndex, match.index);

    output += escapeHTML(textBefore)
      .replace(/\r?\n/g, "<br><br>");

    const imageUrl = match[1];

    try {
      const parsedUrl = new URL(imageUrl);

      const validImage =
        parsedUrl.protocol === "https:" &&
        parsedUrl.hostname.endsWith(".supabase.co") &&
        parsedUrl.pathname.includes(
          "/storage/v1/object/public/article-images/"
        );

      if (validImage) {
        output += `
          <figure class="article-inline-image">
            <img
              src="${escapeHTML(imageUrl)}"
              alt="Desh 71 news image"
              loading="lazy"
              decoding="async"
            >
          </figure>
        `;
      } else {
        output += escapeHTML(match[0]);
      }

    } catch {
      output += escapeHTML(match[0]);
    }

    lastIndex = marker.lastIndex;
  }

  output += escapeHTML(body.slice(lastIndex))
    .replace(/\r?\n/g, "<br><br>");

  return output;
}

/* =====================================================
   ARTICLE RENDER
===================================================== */

function render(article) {
  if (!root) return;

  const en = getLanguage() === "en";

  if (!article) {
    root.innerHTML = `
      <div class="empty-state">
        <h2>
          ${en ? "Article not found" : "সংবাদটি পাওয়া যায়নি"}
        </h2>
        <a href="index.html">
          ${en ? "Home" : "প্রচ্ছদে ফিরুন"}
        </a>
      </div>
    `;
    return;
  }

  const title = en ? article.title_en : article.title_bn;
  const body = en ? article.content_en : article.content_bn;

  document.title = `${title} | Desh 71`;

  root.innerHTML = `
    ${
      article.image_url
        ? `
          <img
            class="article-cover"
            src="${escapeHTML(article.image_url)}"
            alt="${escapeHTML(title)}"
          >
        `
        : ""
    }

    <span class="category-tag">
      ${escapeHTML(
        en
          ? article.category?.name_en || ""
          : article.category?.name_bn || ""
      )}
    </span>

    <h1>${escapeHTML(title)}</h1>

    <p class="article-summary">
      ${escapeHTML(en ? article.summary_en : article.summary_bn)}
    </p>

    <div class="news-meta">
      <span>${escapeHTML(article.author_name || "")}</span>

      <time>
        ${
          article.published_at
            ? new Date(article.published_at).toLocaleString(
                en ? "en-US" : "bn-BD"
              )
            : ""
        }
      </time>
    </div>

    <div class="article-body">
      ${renderArticleBody(body || "")}
    </div>
  `;
}

/* =====================================================
   INITIALIZATION
===================================================== */

async function init() {
  if (!root) return;

  initializeSharedUI();

  const articleId =
    new URLSearchParams(location.search).get("id");

  if (!articleId) {
    root.innerHTML = `
      <div class="empty-state">
        সংবাদটি শনাক্ত করা যায়নি / Article ID is missing
      </div>
    `;
    return;
  }

  try {
    const article = await getPublishedArticle(articleId);
    render(article);

  } catch (error) {
    console.error("Desh 71 article error:", error);

    root.innerHTML = `
      <div class="empty-state">
        সংবাদ লোড করা যায়নি / Could not load article
      </div>
    `;
  }

  document
    .querySelector("#languageToggle")
    ?.addEventListener("click", async () => {

      setLanguage(getLanguage() === "bn" ? "en" : "bn");

      document.documentElement.lang = getLanguage();

      try {
        const article = await getPublishedArticle(articleId);
        render(article);

      } catch (error) {
        console.error(error);
      }
    });
}

document.addEventListener("DOMContentLoaded", init);
