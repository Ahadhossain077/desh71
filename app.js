/* ========== DISABLE ALL ZOOM ========== */
(function () {
  "use strict";

  document.addEventListener("gesturestart", function (e) {
    e.preventDefault();
  }, { passive: false });

  document.addEventListener("touchstart", function (e) {
    if (e.touches.length > 1) e.preventDefault();
  }, { passive: false });

  var lastTouchEnd = 0;
  document.addEventListener("touchend", function (e) {
    var now = Date.now();
    if (now - lastTouchEnd <= 300) e.preventDefault();
    lastTouchEnd = now;
  }, { passive: false });

  document.addEventListener("wheel", function (e) {
    if (e.ctrlKey || e.metaKey) e.preventDefault();
  }, { passive: false });

  document.addEventListener("keydown", function (e) {
    if ((e.ctrlKey || e.metaKey) && (e.key === "+" || e.key === "-" || e.key === "=" || e.key === "0")) {
      e.preventDefault();
    }
  }, { passive: false });
})();

"use strict";

import { listPublishedArticles, renderArticleCards, escapeHTML, initializeSharedUI, getLanguage, setLanguage } from "./assets/js/news.js";

const grid = document.querySelector("#newsGrid");
const result = document.querySelector("#resultMessage");
const hero = document.querySelector("#heroNews");
let stories = [];

function renderHome() {
  const language = getLanguage();
  if (!grid) return;
  if (!stories.length) {
    grid.innerHTML = '<div class="empty-state"><span>📰</span><h3>No published articles yet / এখনো কোনো প্রকাশিত সংবাদ নেই</h3><p>Published database articles will appear here. / প্রকাশিত সংবাদ এখানে দেখা যাবে।</p></div>';
    if (hero) hero.innerHTML = '<div class="empty-state"><h3>No published headlines / কোনো প্রধান সংবাদ নেই</h3></div>';
    if (result) result.textContent = "";
    return;
  }
  const query = new URLSearchParams(location.search).get("q") || "";
  const matching = stories.filter((item) => !query || [item.title_bn, item.title_en, item.summary_bn, item.summary_en].some((value) => (value || "").toLocaleLowerCase().includes(query.toLocaleLowerCase())));
  grid.innerHTML = renderArticleCards(matching, language);
  if (result) result.textContent = `${matching.length} ${language === "bn" ? "টি সংবাদ" : "articles"}`;
  if (hero) {
    const lead = matching[0];
    hero.innerHTML = lead ? `<article class="hero-main"><div class="hero-art art-blue"${lead.image_url ? ` style="background-image:url('${escapeHTML(lead.image_url)}')"` : ""}><span>${escapeHTML(language === "bn" ? (lead.category?.name_bn || "সংবাদ") : (lead.category?.name_en || "News"))}</span></div><div class="hero-content"><span class="category-tag">${escapeHTML(language === "bn" ? (lead.category?.name_bn || "সংবাদ") : (lead.category?.name_en || "News"))}</span><h1>${escapeHTML(language === "bn" ? lead.title_bn : lead.title_en)}</h1><p>${escapeHTML(language === "bn" ? lead.summary_bn : lead.summary_en)}</p><a class="read-more" href="article.html?id=${encodeURIComponent(lead.id)}">${language === "bn" ? "বিস্তারিত পড়ুন →" : "Read story →"}</a></div></article><div class="hero-side">${matching.slice(1, 3).map((article) => `<article class="side-card"><div class="side-art art-green">${escapeHTML(language === "bn" ? (article.category?.name_bn || "সংবাদ") : (article.category?.name_en || "News"))}</div><div><span class="category-tag">${escapeHTML(language === "bn" ? (article.category?.name_bn || "সংবাদ") : (article.category?.name_en || "News"))}</span><h3><a href="article.html?id=${encodeURIComponent(article.id)}">${escapeHTML(language === "bn" ? article.title_bn : article.title_en)}</a></h3><small>${escapeHTML(article.author_name || "")}</small></div></article>`).join("")}</div>` : '<div class="empty-state"><h3>No matching headlines / কোনো প্রধান সংবাদ নেই</h3></div>';
  }
}

async function initialize() {
  initializeSharedUI();
  const languageButton = document.querySelector("#languageToggle");
  languageButton?.addEventListener("click", () => { setLanguage(getLanguage() === "bn" ? "en" : "bn"); renderHome(); });
  const form = document.querySelector("#searchForm");
  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    const query = document.querySelector("#searchInput")?.value.trim() || "";
    location.href = `search.html?q=${encodeURIComponent(query)}`;
  });
  grid?.addEventListener("click", (event) => { const card = event.target.closest("[data-article-id]"); if (card && !event.target.closest("a")) location.href = `article.html?id=${encodeURIComponent(card.dataset.articleId)}`; });
  if (!window.DESh71_SUPABASE_CONFIG?.url || window.DESh71_SUPABASE_CONFIG.url.includes("YOUR_")) {
    grid.innerHTML = '<div class="empty-state"><h3>Supabase setup required / Supabase সেটআপ প্রয়োজন</h3><p>Configure config/supabase.js to load published articles.</p></div>';
    if (hero) hero.innerHTML = "";
    return;
  }
  try { stories = await listPublishedArticles(); renderHome(); }
  catch (error) { console.error(error); grid.innerHTML = '<div class="empty-state"><h3>সংবাদ লোড করা যায়নি / Could not load articles</h3><p>Check Supabase configuration and database setup.</p></div>'; }
}
document.addEventListener("DOMContentLoaded", initialize);
