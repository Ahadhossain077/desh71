/* =====================================================
   DESH 71 — COMPLETE ADMIN PANEL
   Authentication · Dashboard · Articles · Categories
   Featured Image + Inline Image Upload
===================================================== */

/* ========== DISABLE ALL ZOOM (ADMIN) ========== */
(function () {
  "use strict";

  document.addEventListener("gesturestart", function (e) {
    e.preventDefault();
  }, { passive: false });

  document.addEventListener("touchstart", function (e) {
    if (e.touches.length > 1) e.preventDefault();
  }, { passive: false });

  let lastTouchEnd = 0;
  document.addEventListener("touchend", function (e) {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) e.preventDefault();
    lastTouchEnd = now;
  }, { passive: false });
})();

/* ========== IMPORTS ========== */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import "../../config/supabase.js";

const config = window.DESh71_SUPABASE_CONFIG;

if (!config?.url || !config?.anonKey) {
  throw new Error("Desh 71 Supabase configuration not found.");
}

const supabase = createClient(config.url, config.anonKey);

const BUCKET = "article-images";
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const SESSION_CACHE_MS = 60 * 1000;

/* ========== HELPERS ========== */
const $ = (selector, parent = document) => parent.querySelector(selector);

const ESCAPE_MAP = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#039;",
};

const escapeHTML = (value = "") =>
  String(value).replace(/[&<>"']/g, (char) => ESCAPE_MAP[char]);

function showMessage(element, message, type = "error") {
  if (!element) return;
  element.textContent = message;
  element.className = `form-message ${type}`;
}

function formatDate(dateString) {
  if (!dateString) return "—";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "—";
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function generateId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

function validateImage(file) {
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (!file || !allowed.includes(file.type)) {
    throw new Error("শুধু JPG, PNG অথবা WEBP ছবি ব্যবহার করো।");
  }
  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error("ছবির সাইজ সর্বোচ্চ 5 MB হতে পারবে।");
  }
}

function getExtension(file) {
  return {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  }[file.type];
}

/* =====================================================
   AUTHENTICATION (with cache)
===================================================== */

let _sessionCache = null;
let _sessionCacheTime = 0;

async function getAdminSession(force = false) {
  if (!force && _sessionCache && Date.now() - _sessionCacheTime < SESSION_CACHE_MS) {
    return _sessionCache;
  }

  const { data, error } = await supabase.auth.getSession();

  if (error || !data.session) {
    window.location.href = "login.html";
    return null;
  }

  const { data: isAdmin, error: roleError } = await supabase.rpc("is_admin");

  if (roleError || isAdmin !== true) {
    await supabase.auth.signOut();
    window.location.href = "login.html";
    return null;
  }

  _sessionCache = data.session;
  _sessionCacheTime = Date.now();
  return data.session;
}

async function adminLogout() {
  _sessionCache = null;
  _sessionCacheTime = 0;

  const { error } = await supabase.auth.signOut();
  if (error) {
    alert(error.message);
    return;
  }
  window.location.href = "login.html";
}

/* =====================================================
   LOGIN
===================================================== */

async function adminLogin(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const email = form.querySelector('[name="email"]')?.value.trim();
  const password = form.querySelector('[name="password"]')?.value;

  const message = $("#formMessage");
  const button = form.querySelector('[type="submit"]');

  if (!email || !password) {
    showMessage(message, "Email ও Password লিখো।");
    return;
  }

  if (button) button.disabled = true;
  showMessage(message, "Logging in...", "info");

  try {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    const { data: isAdmin, error: roleError } = await supabase.rpc("is_admin");

    if (roleError || isAdmin !== true) {
      await supabase.auth.signOut();
      throw new Error("এই Account-এর Admin Permission নেই।");
    }

    window.location.href = "dashboard.html";
  } catch (error) {
    showMessage(message, error.message);
    if (button) button.disabled = false;
  }
}

/* =====================================================
   DASHBOARD
===================================================== */

async function loadDashboard() {
  const session = await getAdminSession();
  if (!session) return;

  const errorElement = $("#dashboardError");
  const ids = [
    "#totalArticles",
    "#publishedArticles",
    "#draftArticles",
    "#totalCategories",
  ];

  ids.forEach((selector) => {
    const el = $(selector);
    if (el) el.textContent = "…";
  });

  try {
    const queries = await Promise.all([
      supabase.from("articles").select("id", { count: "exact", head: true }),
      supabase.from("articles").select("id", { count: "exact", head: true }).eq("status", "published"),
      supabase.from("articles").select("id", { count: "exact", head: true }).eq("status", "draft"),
      supabase.from("categories").select("id", { count: "exact", head: true }),
    ]);

    let hasError = false;
    let firstError = null;

    queries.forEach((result, index) => {
      const el = $(ids[index]);
      if (!el) return;
      if (result.error) {
        hasError = true;
        if (!firstError) firstError = result.error;
        el.textContent = "!";
      } else {
        el.textContent = result.count ?? 0;
      }
    });

    if (hasError && errorElement) {
      showMessage(errorElement, "Dashboard data load failed: " + firstError.message);
    } else if (errorElement) {
      errorElement.textContent = "";
      errorElement.className = "form-message";
    }
  } catch (error) {
    console.error("Dashboard loading error:", error);
    if (errorElement) {
      showMessage(errorElement, "Dashboard data load failed: " + error.message);
    }
    ids.forEach((selector) => {
      const el = $(selector);
      if (el) el.textContent = "!";
    });
  }
}

/* =====================================================
   ARTICLES LIST
===================================================== */

async function loadArticles() {
  const session = await getAdminSession();
  if (!session) return;

  const container = $("#articlesList");
  if (!container) return;

  container.innerHTML =
    '<tr><td colspan="4" class="admin-table-loading">Loading articles…</td></tr>';

  const { data, error } = await supabase
    .from("articles")
    .select("id,title_bn,title_en,status,created_at,updated_at")
    .order("created_at", { ascending: false });

  if (error) {
    container.innerHTML =
      '<tr><td colspan="4" class="admin-table-loading">' +
      escapeHTML(error.message) +
      "</td></tr>";
    return;
  }

  if (!data?.length) {
    container.innerHTML =
      '<tr><td colspan="4" class="admin-empty-row">No articles yet. Create your first story →</td></tr>';
    return;
  }

  container.innerHTML = data
    .map((article) => {
      const statusClass =
        article.status === "published" ? "published" : "draft";
      const statusLabel = article.status === "published" ? "Published" : "Draft";
      const titleBn = article.title_bn || "";
      const titleEn = article.title_en || "";
      const mainTitle = titleBn || titleEn || "(Untitled)";
      const subTitle = titleBn && titleEn && titleBn !== titleEn ? titleEn : "";

      return `
        <tr>
          <td>
            <div class="article-title-cell">
              <strong>${escapeHTML(mainTitle)}</strong>
              ${subTitle ? `<small>${escapeHTML(subTitle)}</small>` : ""}
            </div>
          </td>
          <td>
            <span class="admin-status ${statusClass}">${statusLabel}</span>
          </td>
          <td>${formatDate(article.updated_at || article.created_at)}</td>
          <td>
            <div class="admin-row-actions">
              <a class="admin-row-btn edit" href="editor.html?id=${encodeURIComponent(article.id)}">Edit</a>
              <button class="admin-row-btn delete" type="button" data-delete-article="${escapeHTML(article.id)}">Delete</button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");

  container.querySelectorAll("[data-delete-article]").forEach((button) => {
    button.addEventListener("click", () => {
      deleteArticle(button.dataset.deleteArticle);
    });
  });
}

async function deleteArticle(id) {
  const session = await getAdminSession();
  if (!session) return;

  if (!confirm("এই সংবাদটি স্থায়ীভাবে মুছে ফেলবেন?")) return;

  const { error } = await supabase.from("articles").delete().eq("id", id);

  if (error) {
    alert(error.message);
    return;
  }

  await loadArticles();
}

/* =====================================================
   CATEGORIES
===================================================== */

let _categoriesCache = [];

async function loadCategories() {
  const session = await getAdminSession();
  if (!session) return;

  const container = $("#categoryRows");
  if (!container) return;

  container.innerHTML =
    '<tr><td colspan="4" class="admin-table-loading">Loading categories…</td></tr>';

  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("created_at");

  if (error) {
    container.innerHTML =
      '<tr><td colspan="4" class="admin-table-loading">' +
      escapeHTML(error.message) +
      "</td></tr>";
    return;
  }

  _categoriesCache = data || [];

  if (!data?.length) {
    container.innerHTML =
      '<tr><td colspan="4" class="admin-empty-row">No categories yet. Add your first category above ↑</td></tr>';
    return;
  }

  container.innerHTML = data
    .map(
      (category) => `
        <tr>
          <td><strong>${escapeHTML(category.name_bn || "—")}</strong></td>
          <td>${escapeHTML(category.name_en || "—")}</td>
          <td><code>${escapeHTML(category.slug || "—")}</code></td>
          <td>
            <div class="admin-row-actions">
              <button class="admin-row-btn edit" type="button" data-edit-category="${escapeHTML(category.id)}">Edit</button>
              <button class="admin-row-btn delete" type="button" data-delete-category="${escapeHTML(category.id)}">Delete</button>
            </div>
          </td>
        </tr>
      `
    )
    .join("");

  /* Edit handlers */
  container.querySelectorAll("[data-edit-category]").forEach((button) => {
    button.addEventListener("click", () => {
      startCategoryEdit(button.dataset.editCategory);
    });
  });

  /* Delete handlers */
  container.querySelectorAll("[data-delete-category]").forEach((button) => {
    button.addEventListener("click", () => {
      deleteCategory(button.dataset.deleteCategory);
    });
  });
}

function startCategoryEdit(id) {
  const category = _categoriesCache.find((c) => c.id === id);
  if (!category) return;

  const form = $("#categoryForm");
  if (!form) return;

  const idField = form.querySelector('[name="id"]');
  const nameBnField = form.querySelector('[name="name_bn"]');
  const nameEnField = form.querySelector('[name="name_en"]');
  const slugField = form.querySelector('[name="slug"]');
  const heading = $("#categoryFormHeading");
  const cancel = $("#cancelCategoryEdit");

  if (idField) idField.value = category.id;
  if (nameBnField) nameBnField.value = category.name_bn || "";
  if (nameEnField) nameEnField.value = category.name_en || "";
  if (slugField) slugField.value = category.slug || "";

  if (heading) heading.textContent = "Edit category";
  if (cancel) cancel.hidden = false;

  form.scrollIntoView({ behavior: "smooth", block: "start" });
  nameBnField?.focus();
}

function resetCategoryForm() {
  const form = $("#categoryForm");
  if (!form) return;

  form.reset();

  const idField = form.querySelector('[name="id"]');
  if (idField) idField.value = "";

  const heading = $("#categoryFormHeading");
  if (heading) heading.textContent = "Add category";

  const cancel = $("#cancelCategoryEdit");
  if (cancel) cancel.hidden = true;

  const message = $("#formMessage");
  if (message) {
    message.textContent = "";
    message.className = "form-message";
  }
}

async function deleteCategory(id) {
  const session = await getAdminSession();
  if (!session) return;

  if (!confirm("এই Category মুছে ফেলবেন? সংশ্লিষ্ট সংবাদ থাকলে আগে সরান।")) {
    return;
  }

  const { error } = await supabase.from("categories").delete().eq("id", id);

  if (error) {
    alert(error.message);
    return;
  }

  await loadCategories();
}

async function saveCategory(event) {
  event.preventDefault();

  const session = await getAdminSession();
  if (!session) return;

  const form = event.currentTarget;
  const formData = new FormData(form);
  const message = $("#formMessage");
  const submitBtn = form.querySelector('[type="submit"]');

  const categoryId = (formData.get("id") || "").toString().trim();

  const category = {
    name_bn: (formData.get("name_bn") || "").toString().trim(),
    name_en: (formData.get("name_en") || "").toString().trim(),
    slug: (formData.get("slug") || "").toString().trim(),
  };

  if (!category.name_bn || !category.name_en || !category.slug) {
    showMessage(message, "সব Category তথ্য পূরণ করো।");
    return;
  }

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(category.slug)) {
    showMessage(
      message,
      "Slug শুধু ছোট হাতের অক্ষর, সংখ্যা ও হাইফেন (-) দিয়ে হতে হবে।"
    );
    return;
  }

  if (submitBtn) submitBtn.disabled = true;

  try {
    if (categoryId) {
      const { error } = await supabase
        .from("categories")
        .update(category)
        .eq("id", categoryId);

      if (error) throw error;

      showMessage(message, "Category আপডেট হয়েছে।", "success");
    } else {
      const { error } = await supabase.from("categories").insert(category);
      if (error) throw error;

      showMessage(message, "Category যোগ হয়েছে।", "success");
    }

    resetCategoryForm();
    await loadCategories();
  } catch (error) {
    showMessage(message, error.message);
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
}

/* =====================================================
   IMAGE UPLOAD
===================================================== */

async function uploadImage(file) {
  validateImage(file);

  const extension = getExtension(file);
  const filePath = `articles/${Date.now()}-${generateId()}.${extension}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });

  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(filePath);

  if (!data?.publicUrl) {
    throw new Error("Could not create public image URL.");
  }

  return data.publicUrl;
}

function displayImagePreview(image, source) {
  if (!image || !source) return;
  image.src = source;
  image.hidden = false;
}

function hideImagePreview(image) {
  if (!image) return;
  image.removeAttribute("src");
  image.hidden = true;
}

/* =====================================================
   INLINE IMAGE INSERT
===================================================== */

function insertAtCursor(textarea, text) {
  if (!textarea) return;

  const start = textarea.selectionStart ?? textarea.value.length;
  const end = textarea.selectionEnd ?? textarea.value.length;

  textarea.value =
    textarea.value.slice(0, start) + text + textarea.value.slice(end);

  const cursor = start + text.length;
  textarea.focus();
  textarea.setSelectionRange(cursor, cursor);
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
}

function setupInlineImageUpload(textareaId, inputId, buttonId, statusId) {
  const textarea = document.getElementById(textareaId);
  const input = document.getElementById(inputId);
  const button = document.getElementById(buttonId);
  const status = document.getElementById(statusId);

  if (!textarea || !input || !button) return;

  button.addEventListener("click", () => input.click());

  input.addEventListener("change", async () => {
    const files = Array.from(input.files || []);
    if (!files.length) return;

    button.disabled = true;

    try {
      const session = await getAdminSession();
      if (!session) return;

      for (const file of files) {
        if (status) status.textContent = `Uploading ${file.name}...`;

        const imageUrl = await uploadImage(file);
        const marker = `\n\n[[DESH71_IMAGE:${imageUrl}]]\n\n`;

        insertAtCursor(textarea, marker);
      }

      if (status) {
        status.textContent = "ছবিগুলো Upload হয়েছে এবং লেখায় যুক্ত হয়েছে।";
      }
    } catch (error) {
      if (status) status.textContent = error.message;
      else alert(error.message);
    } finally {
      button.disabled = false;
      input.value = "";
    }
  });
}

/* =====================================================
   ARTICLE EDITOR
===================================================== */

async function loadEditor() {
  const session = await getAdminSession();
  if (!session) return;

  const form = $("#articleForm");
  if (!form) return;

  const message = $("#formMessage");
  const categorySelect = form.querySelector('[name="category_id"]');
  const imageInput = $("#articleImage");
  const imagePreview = $("#imagePreview");
  const removeImage = $("#removeImage");

  const params = new URLSearchParams(window.location.search);
  const articleId = params.get("id");

  let existingImage = "";
  let existingPublishedAt = null;
  let previewObjectUrl = null;

  /* Load categories */
  const { data: categories, error: categoryError } = await supabase
    .from("categories")
    .select("*")
    .order("created_at");

  if (categoryError) {
    showMessage(message, categoryError.message);
    return;
  }

  if (categorySelect) {
    categorySelect.innerHTML =
      '<option value="">Select category</option>' +
      (categories || [])
        .map(
          (c) => `
            <option value="${escapeHTML(c.id)}">
              ${escapeHTML(c.name_bn)} / ${escapeHTML(c.name_en)}
            </option>
          `
        )
        .join("");
  }

  /* Load existing article */
  if (articleId) {
    const { data: article, error } = await supabase
      .from("articles")
      .select("*")
      .eq("id", articleId)
      .single();

    if (error) {
      showMessage(message, error.message);
      return;
    }

    existingImage = article.image_url || "";
    existingPublishedAt = article.published_at || null;

    for (const [key, value] of Object.entries(article)) {
      const field = form.elements.namedItem(key);
      if (
        field &&
        typeof field.value !== "undefined" &&
        value !== null &&
        field.type !== "file"
      ) {
        field.value = value;
      }
    }

    if (existingImage) displayImagePreview(imagePreview, existingImage);

    const heading = $("#editorHeading");
    if (heading) heading.textContent = "Edit article";
  }

  /* Featured image preview */
  if (imageInput) {
    imageInput.addEventListener("change", () => {
      const file = imageInput.files?.[0];
      if (!file) return;

      try {
        validateImage(file);

        if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
        previewObjectUrl = URL.createObjectURL(file);

        displayImagePreview(imagePreview, previewObjectUrl);

        if (removeImage) removeImage.checked = false;

        showMessage(message, "Image selected successfully.", "success");
      } catch (error) {
        imageInput.value = "";
        showMessage(message, error.message);
      }
    });
  }

  if (removeImage) {
    removeImage.addEventListener("change", () => {
      if (removeImage.checked && !imageInput?.files?.length) {
        hideImagePreview(imagePreview);
      } else if (!removeImage.checked && existingImage) {
        displayImagePreview(imagePreview, existingImage);
      }
    });
  }

  /* Inline image upload */
  setupInlineImageUpload("content_bn", "inlineImagesBn", "uploadInlineBn", "inlineStatusBn");
  setupInlineImageUpload("content_en", "inlineImagesEn", "uploadInlineEn", "inlineStatusEn");

  /* Save */
  form.onsubmit = async (event) => {
    event.preventDefault();

    const currentSession = await getAdminSession();
    if (!currentSession) return;

    const formData = new FormData(form);
    const file = imageInput?.files?.[0];

    const titleBn = (formData.get("title_bn") || "").toString().trim();
    const titleEn = (formData.get("title_en") || "").toString().trim();

    if (!titleBn || !titleEn) {
      showMessage(message, "Bangla এবং English শিরোনাম দুটোই দিতে হবে।");
      return;
    }

    if (!formData.get("category_id")) {
      showMessage(message, "Category সিলেক্ট করো।");
      return;
    }

    const submitButton = form.querySelector('[type="submit"]');
    if (submitButton) submitButton.disabled = true;

    showMessage(message, "Saving article...", "info");

    try {
      let imageUrl = existingImage;

      if (removeImage?.checked && !file) imageUrl = "";
      if (file) imageUrl = await uploadImage(file);

      const status = formData.get("status") || "draft";

      const articleData = {
        title_bn: titleBn,
        title_en: titleEn,
        summary_bn: (formData.get("summary_bn") || "").toString().trim(),
        summary_en: (formData.get("summary_en") || "").toString().trim(),
        content_bn: (formData.get("content_bn") || "").toString().trim(),
        content_en: (formData.get("content_en") || "").toString().trim(),
        category_id: formData.get("category_id"),
        author_name:
          (formData.get("author_name") || "").toString().trim() ||
          "Desh 71 News Desk",
        image_url: imageUrl || null,
        status,
        updated_at: new Date().toISOString(),
        published_at:
          status === "published"
            ? existingPublishedAt || new Date().toISOString()
            : null,
      };

      let result;

      if (articleId) {
        result = await supabase
          .from("articles")
          .update(articleData)
          .eq("id", articleId);
      } else {
        articleData.author_id = currentSession.user.id;
        result = await supabase.from("articles").insert(articleData);
      }

      if (result.error) throw result.error;

      showMessage(message, "Article saved successfully.", "success");

      setTimeout(() => {
        window.location.href = "articles.html";
      }, 900);
    } catch (error) {
      showMessage(message, error.message || "Could not save article.");
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  };
}

/* =====================================================
   PAGE INIT
===================================================== */

document.addEventListener("DOMContentLoaded", () => {
  /* Login form */
  const loginForm = $("#loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", adminLogin);
  }

  /* Sign out */
  const logoutButton = $("#signOut") || $("#logoutBtn");
  if (logoutButton) {
    logoutButton.addEventListener("click", adminLogout);
  }

  /* Dashboard */
  if ($("#totalArticles")) {
    loadDashboard();
  }

  /* Articles */
  if ($("#articlesList")) {
    loadArticles();
  }

  /* Categories */
  if ($("#categoryRows")) {
    loadCategories();
  }

  /* Category form */
  const categoryForm = $("#categoryForm");
  if (categoryForm) {
    categoryForm.addEventListener("submit", saveCategory);
  }

  /* Category cancel */
  const cancelCategoryEdit = $("#cancelCategoryEdit");
  if (cancelCategoryEdit) {
    cancelCategoryEdit.addEventListener("click", () => {
      resetCategoryForm();
    });
  }

  /* Article editor */
  if ($("#articleForm")) {
    loadEditor();
  }
});
