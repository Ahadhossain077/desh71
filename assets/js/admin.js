import "../../config/supabase.js";
import { supabase, isSupabaseConfigured } from "./client.js";
import { escapeHTML } from "./news.js";

const $ = (selector) => document.querySelector(selector);
const message = (text, target = "#adminMessage") => { const el = $(target); if (el) el.textContent = text; };
function showError(error, target) { console.error(error); message(error?.message || "Request failed.", target); }
async function requireAdmin() {
  if (!isSupabaseConfigured) { location.href = "login.html?setup=required"; return false; }
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session) { location.href = "login.html"; return false; }
  const { data: allowed, error: roleError } = await supabase.rpc("is_admin");
  if (roleError || allowed !== true) { await supabase.auth.signOut(); location.href = "login.html?unauthorized=1"; return false; }
  return true;
}
async function initLogin() {
  if (new URLSearchParams(location.search).has("setup")) message("Configure Supabase URL/key before signing in.", "#formMessage");
  if (new URLSearchParams(location.search).has("unauthorized")) message("This account is not authorized for administration.", "#formMessage");
  if (!isSupabaseConfigured) { if (!new URLSearchParams(location.search).has("setup")) message("Supabase must be configured before sign in.", "#formMessage"); return; }
  $("#loginForm")?.addEventListener("submit", async (event) => {
    event.preventDefault(); const form = new FormData(event.currentTarget); const submit = event.currentTarget.querySelector("button[type=submit]"); submit.disabled = true; message("Signing in…", "#formMessage");
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: form.get("email"), password: form.get("password") }); if (error) throw error;
      const { data: allowed, error: roleError } = await supabase.rpc("is_admin");
      if (roleError || allowed !== true) { await supabase.auth.signOut(); throw new Error("This account does not have the administrator permission."); }
      location.href = "dashboard.html";
    } catch (error) { showError(error, "#formMessage"); submit.disabled = false; }
  });
}
async function loadDashboard() {
  const [{ count: articleCount, error: articleError }, { count: categoryCount, error: categoryError }] = await Promise.all([
    supabase.from("articles").select("id", { count: "exact", head: true }),
    supabase.from("categories").select("id", { count: "exact", head: true })
  ]);
  if (articleError) throw articleError; if (categoryError) throw categoryError;
  $("#dashboardStats").innerHTML = `<p><strong>${articleCount ?? 0}</strong> articles</p><p><strong>${categoryCount ?? 0}</strong> categories</p>`;
}
async function loadArticles() {
  const { data, error } = await supabase.from("articles").select("id,title_en,status,updated_at").order("updated_at", { ascending: false }); if (error) throw error;
  const tbody = $("#articleRows");
  tbody.innerHTML = data.length ? data.map((item) => `<tr><td>${escapeHTML(item.title_en)}</td><td>${escapeHTML(item.status)}</td><td>${item.updated_at ? new Date(item.updated_at).toLocaleString() : "—"}</td><td><a href="editor.html?id=${encodeURIComponent(item.id)}">Edit</a> <button type="button" data-delete-article="${escapeHTML(item.id)}" class="danger-button">Delete</button></td></tr>`).join("") : '<tr><td colspan="4">No articles have been created.</td></tr>';
  tbody.addEventListener("click", async (event) => { const button = event.target.closest("[data-delete-article]"); if (!button || !confirm("Delete this article permanently?")) return; button.disabled = true; const { error } = await supabase.from("articles").delete().eq("id", button.dataset.deleteArticle); if (error) { showError(error); button.disabled = false; } else await loadArticles(); }, { once: true });
}
async function fetchCategories() { const { data, error } = await supabase.from("categories").select("id,name_bn,name_en,slug").order("name_en"); if (error) throw error; return data || []; }
async function loadEditor() {
  const categories = await fetchCategories();
  $("#categorySelect").innerHTML = '<option value="">Choose a category</option>' + categories.map((item) => `<option value="${escapeHTML(item.id)}">${escapeHTML(item.name_en)} / ${escapeHTML(item.name_bn)}</option>`).join("");
  const id = new URLSearchParams(location.search).get("id");
  if (id) { const { data, error } = await supabase.from("articles").select("*").eq("id", id).single(); if (error) throw error; const form = $("#articleForm"); for (const [key, value] of Object.entries(data)) { if (form.elements[key]) form.elements[key].value = value ?? ""; } $("#editorHeading").textContent = "Edit article"; }
  $("#articleForm").addEventListener("submit", async (event) => {
    event.preventDefault(); const form = event.currentTarget; const values = Object.fromEntries(new FormData(form)); const article = { title_bn: values.title_bn.trim(), title_en: values.title_en.trim(), summary_bn: values.summary_bn.trim(), summary_en: values.summary_en.trim(), content_bn: values.content_bn.trim(), content_en: values.content_en.trim(), category_id: values.category_id, author_name: values.author_name.trim() || null, image_url: values.image_url.trim() || null, status: values.status, published_at: values.status === "published" ? (id ? undefined : new Date().toISOString()) : null };
    if (id && article.published_at === undefined) delete article.published_at;
    const button = form.querySelector("button[type=submit]"); button.disabled = true; message("Saving…", "#formMessage");
    try { const result = id ? await supabase.from("articles").update(article).eq("id", id) : await supabase.from("articles").insert({ ...article, author_id: (await supabase.auth.getUser()).data.user.id }); if (result.error) throw result.error; message("Article saved.", "#formMessage"); if (!id) setTimeout(() => { location.href = "articles.html"; }, 500); }
    catch (error) { showError(error, "#formMessage"); } finally { button.disabled = false; }
  });
}
async function loadCategories() {
  const { data, error } = await supabase.from("categories").select("id,name_bn,name_en,slug").order("name_en"); if (error) throw error;
  const tbody = $("#categoryRows");
  const draw = () => { tbody.innerHTML = data.length ? data.map((item) => `<tr><td>${escapeHTML(item.name_bn)}</td><td>${escapeHTML(item.name_en)}</td><td>${escapeHTML(item.slug)}</td><td><button type="button" data-edit-category="${escapeHTML(item.id)}">Edit</button> <button type="button" data-delete-category="${escapeHTML(item.id)}" class="danger-button">Delete</button></td></tr>`).join("") : '<tr><td colspan="4">No categories created.</td></tr>'; };
  draw();
  tbody.addEventListener("click", async (event) => {
    const edit = event.target.closest("[data-edit-category]"); const del = event.target.closest("[data-delete-category]");
    if (edit) { const item = data.find((row) => row.id === edit.dataset.editCategory); for (const key of ["id", "name_bn", "name_en", "slug"]) $("#categoryForm").elements[key].value = item[key]; $("#categoryFormHeading").textContent = "Edit category"; $("#cancelCategoryEdit").hidden = false; }
    if (del && confirm("Delete this category? Articles using it may prevent deletion.")) { del.disabled = true; const { error } = await supabase.from("categories").delete().eq("id", del.dataset.deleteCategory); if (error) { showError(error, "#formMessage"); del.disabled = false; } else { data.splice(data.findIndex((row) => row.id === del.dataset.deleteCategory), 1); draw(); } }
  });
  $("#cancelCategoryEdit").addEventListener("click", () => { $("#categoryForm").reset(); $("#categoryForm").elements.id.value = ""; $("#categoryFormHeading").textContent = "Add category"; $("#cancelCategoryEdit").hidden = true; });
  $("#categoryForm").addEventListener("submit", async (event) => { event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget)); const payload = { name_bn: values.name_bn.trim(), name_en: values.name_en.trim(), slug: values.slug.trim() }; const response = values.id ? await supabase.from("categories").update(payload).eq("id", values.id).select().single() : await supabase.from("categories").insert(payload).select().single(); if (response.error) { showError(response.error, "#formMessage"); return; } if (values.id) data.splice(data.findIndex((row) => row.id === values.id), 1, response.data); else data.push(response.data); event.currentTarget.reset(); event.currentTarget.elements.id.value = ""; $("#categoryFormHeading").textContent = "Add category"; $("#cancelCategoryEdit").hidden = true; message("Category saved.", "#formMessage"); draw(); });
}
document.addEventListener("DOMContentLoaded", async () => {
  if (location.pathname.endsWith("/login.html")) { await initLogin(); return; }
  if (!await requireAdmin()) return;
  $("#signOut")?.addEventListener("click", async () => { await supabase.auth.signOut(); location.href = "login.html"; });
  try {
    if ($("#dashboardStats")) await loadDashboard();
    if ($("#articleRows")) await loadArticles();
    if ($("#articleForm")) await loadEditor();
    if ($("#categoryRows")) await loadCategories();
  } catch (error) { showError(error, $("#formMessage") ? "#formMessage" : "#adminMessage"); }
});
