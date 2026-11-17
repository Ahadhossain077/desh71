import { getPublishedArticle, escapeHTML, getLanguage, setLanguage, initializeSharedUI } from "./news.js";
const root = document.querySelector("#articleDetail");
function render(article) {
  const en = getLanguage() === "en";
  if (!article) { root.innerHTML = `<div class="empty-state"><h2>${en ? "Article not found" : "সংবাদটি পাওয়া যায়নি"}</h2><a href="index.html">${en ? "Home" : "প্রচ্ছদে ফিরুন"}</a></div>`; return; }
  const title = en ? article.title_en : article.title_bn;
  const body = en ? article.content_en : article.content_bn;
  document.title = `${title} | Desh 71`;
  root.innerHTML = `${article.image_url ? `<img class="article-cover" src="${escapeHTML(article.image_url)}" alt="">` : ""}<span class="category-tag">${escapeHTML(en ? article.category?.name_en : article.category?.name_bn)}</span><h1>${escapeHTML(title)}</h1><p class="article-summary">${escapeHTML(en ? article.summary_en : article.summary_bn)}</p><div class="news-meta"><span>${escapeHTML(article.author_name || "")}</span><time>${article.published_at ? new Date(article.published_at).toLocaleString(en ? "en-US" : "bn-BD") : ""}</time></div><div class="article-body">${escapeHTML(body).replace(/\r?\n/g, "<br><br>")}</div>`;
}
async function init() {
  initializeSharedUI();
  if (!new URLSearchParams(location.search).get("id")) { root.innerHTML = '<div class="empty-state">সংবাদটি শনাক্ত করা যায়নি / Article ID is missing</div>'; return; }
  try { render(await getPublishedArticle(new URLSearchParams(location.search).get("id"))); }
  catch (error) { console.error(error); root.innerHTML = '<div class="empty-state">সংবাদ লোড করা যায়নি / Could not load article</div>'; }
  document.querySelector("#languageToggle")?.addEventListener("click", async () => { setLanguage(getLanguage() === "bn" ? "en" : "bn"); document.documentElement.lang = getLanguage(); render(await getPublishedArticle(new URLSearchParams(location.search).get("id"))); });
}
document.addEventListener("DOMContentLoaded", init);
