import "../../config/supabase.js";
import { supabase, isSupabaseConfigured } from "./client.js";

export { supabase, isSupabaseConfigured };

export async function listPublishedArticles(categorySlug = null) {
  if (!supabase) throw new Error("Supabase is not configured.");
  let query = supabase.from("articles").select("id,title_bn,title_en,summary_bn,summary_en,content_bn,content_en,image_url,author_name,published_at,category:categories(id,slug,name_bn,name_en)").eq("status", "published").order("published_at", { ascending: false });
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).filter((article) => !categorySlug || article.category?.slug === categorySlug);
}

export async function getPublishedArticle(id) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data, error } = await supabase.from("articles").select("id,title_bn,title_en,summary_bn,summary_en,content_bn,content_en,image_url,author_name,published_at,category:categories(id,slug,name_bn,name_en)").eq("id", id).eq("status", "published").maybeSingle();
  if (error) throw error;
  return data;
}

export function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]);
}

export function getLanguage() {
  try { return localStorage.getItem("desh71-language") === "en" ? "en" : "bn"; } catch { return "bn"; }
}
export function setLanguage(language) {
  try { localStorage.setItem("desh71-language", language); } catch { /* Storage is optional. */ }
  document.documentElement.lang = language;
}

export function renderArticleCards(articles, language = getLanguage()) {
  if (!articles.length) return `<div class="empty-state"><span>📰</span><h3>${language === "bn" ? "কোনো প্রকাশিত সংবাদ পাওয়া যায়নি" : "No published articles found"}</h3></div>`;
  return articles.map((article) => {
    const title = language === "bn" ? article.title_bn : article.title_en;
    const summary = language === "bn" ? article.summary_bn : article.summary_en;
    const category = language === "bn" ? article.category?.name_bn : article.category?.name_en;
    return `<article class="news-card"><a href="article.html?id=${encodeURIComponent(article.id)}" aria-label="${escapeHTML(title)}"><div class="news-card-art"${article.image_url ? ` style="background-image:url('${escapeHTML(article.image_url)}');background-size:cover;background-position:center"` : ""}>${article.image_url ? "" : escapeHTML(category || "")}</div></a><div class="news-card-body"><span class="category-tag">${escapeHTML(category || "")}</span><h3><a href="article.html?id=${encodeURIComponent(article.id)}">${escapeHTML(title)}</a></h3><p>${escapeHTML(summary)}</p><div class="news-meta"><span>${escapeHTML(article.author_name || "")}</span><span>${article.published_at ? new Date(article.published_at).toLocaleDateString(language === "bn" ? "bn-BD" : "en-US") : ""}</span></div><a class="card-read" href="article.html?id=${encodeURIComponent(article.id)}">${language === "bn" ? "বিস্তারিত পড়ুন →" : "Read more →"}</a></div></article>`;
  }).join("");
}

export function initializeSharedUI() {
  const date = document.querySelector("#todayDate");
  if (date) date.textContent = new Intl.DateTimeFormat(getLanguage() === "bn" ? "bn-BD" : "en-US", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date());
  const year = document.querySelector("#year"); if (year) year.textContent = String(new Date().getFullYear());
  const themeButton = document.querySelector("#themeToggle");
  let theme = "light"; try { theme = localStorage.getItem("desh71-theme") || "light"; } catch { /* optional */ }
  document.body.classList.toggle("dark", theme === "dark");
  if (themeButton) themeButton.textContent = theme === "dark" ? "☀" : "☾";
  themeButton?.addEventListener("click", () => { const next = document.body.classList.toggle("dark") ? "dark" : "light"; themeButton.textContent = next === "dark" ? "☀" : "☾"; try { localStorage.setItem("desh71-theme", next); } catch { /* optional */ } });
  const menu = document.querySelector("#menuToggle");
  menu?.addEventListener("click", () => { const open = document.querySelector("#mainNav")?.classList.toggle("open"); menu.setAttribute("aria-expanded", String(Boolean(open))); menu.textContent = open ? "✕" : "☰"; });
  const languageButton = document.querySelector("#languageToggle"); if (languageButton) languageButton.textContent = getLanguage() === "bn" ? "EN" : "বাংলা";
}
