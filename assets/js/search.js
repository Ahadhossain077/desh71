import { listPublishedArticles, renderArticleCards, getLanguage, setLanguage, initializeSharedUI } from "./news.js";
const queryValue = () => document.querySelector("#searchInput").value.trim();
let allArticles = [];
function render() {
  const language = getLanguage();
  const term = queryValue().toLocaleLowerCase();
  const matching = allArticles.filter((article) => [article.title_bn, article.title_en, article.summary_bn, article.summary_en, article.content_bn, article.content_en, article.category?.name_bn, article.category?.name_en].some((text) => (text || "").toLocaleLowerCase().includes(term)));
  document.querySelector("#searchHeading").textContent = language === "bn" ? `অনুসন্ধান: ${queryValue()}` : `Search: ${queryValue()}`;
  document.querySelector("#searchCount").textContent = `${matching.length} ${language === "bn" ? "টি ফলাফল" : "results"}`;
  document.querySelector("#searchGrid").innerHTML = renderArticleCards(matching, language);
}
document.addEventListener("DOMContentLoaded", async () => {
  initializeSharedUI();
  document.querySelector("#searchInput").value = new URLSearchParams(location.search).get("q") || "";
  document.querySelector("#searchForm").addEventListener("submit", (event) => { event.preventDefault(); history.replaceState(null, "", `?q=${encodeURIComponent(queryValue())}`); render(); });
  document.querySelector("#searchInput").addEventListener("input", render);
  try { allArticles = await listPublishedArticles(); render(); }
  catch (error) { console.error(error); document.querySelector("#searchGrid").innerHTML = '<div class="empty-state">অনুসন্ধান করা যায়নি / Search unavailable</div>'; }
  document.querySelector("#languageToggle")?.addEventListener("click", () => { setLanguage(getLanguage() === "bn" ? "en" : "bn"); render(); });
});
