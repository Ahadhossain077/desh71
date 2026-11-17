import { listPublishedArticles, renderArticleCards, getLanguage, setLanguage, initializeSharedUI } from "./news.js";
const grid = document.querySelector("#categoryGrid");
const slug = new URLSearchParams(location.search).get("slug");
let articles = [];
async function render() {
  const language = getLanguage();
  const selected = articles[0]?.category;
  document.querySelector("#categoryTitle").textContent = selected ? (language === "bn" ? selected.name_bn : selected.name_en) : (language === "bn" ? "সংবাদ বিভাগ" : "Category");
  grid.innerHTML = renderArticleCards(articles, language);
}
document.addEventListener("DOMContentLoaded", async () => {
  initializeSharedUI();
  if (!slug) { grid.innerHTML = '<div class="empty-state">বিভাগ নির্বাচন করুন / Choose a category</div>'; return; }
  try { articles = await listPublishedArticles(slug); await render(); }
  catch (error) { console.error(error); grid.innerHTML = '<div class="empty-state">সংবাদ লোড করা যায়নি / Could not load articles</div>'; }
  document.querySelector("#languageToggle")?.addEventListener("click", () => { setLanguage(getLanguage() === "bn" ? "en" : "bn"); render(); });
});
