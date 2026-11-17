
/* =====================================================
   DESH 71 - COMPLETE ADMIN PANEL
   Authentication | Dashboard | Articles | Categories
   Featured Image + Inline Article Image Upload
===================================================== */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import "../../config/supabase.js";

const config = window.DESh71_SUPABASE_CONFIG;

if (!config?.url || !config?.anonKey) {
  throw new Error("Desh 71 Supabase configuration not found.");
}

const supabase = createClient(config.url, config.anonKey);
const BUCKET = "article-images";
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const $ = (selector, parent = document) =>
  parent.querySelector(selector);

const escapeHTML = (value = "") =>
  String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);

function showMessage(element, message, type = "error") {
  if (!element) return;
  element.textContent = message;
  element.className = `form-message ${type}`;
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
    "image/webp": "webp"
  }[file.type];
}

/* =====================================================
   AUTHENTICATION
===================================================== */

async function getAdminSession() {
  const { data, error } = await supabase.auth.getSession();

  if (error || !data.session) {
    window.location.href = "login.html";
    return null;
  }

  const { data: isAdmin, error: roleError } =
    await supabase.rpc("is_admin");

  if (roleError || isAdmin !== true) {
    await supabase.auth.signOut();
    window.location.href = "login.html";
    return null;
  }

  return data.session;
}

async function adminLogout() {
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
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;

    const { data: isAdmin, error: roleError } =
      await supabase.rpc("is_admin");

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

  const queries = await Promise.all([
    supabase.from("articles")
      .select("id", { count: "exact", head: true }),

    supabase.from("articles")
      .select("id", { count: "exact", head: true })
      .eq("status", "published"),

    supabase.from("articles")
      .select("id", { count: "exact", head: true })
      .eq("status", "draft"),

    supabase.from("categories")
      .select("id", { count: "exact", head: true })
  ]);

  const error = queries.find(result => result.error);

  if (error) {
    console.error("Dashboard error:", error.error);
    return;
  }

  const ids = [
    "#totalArticles",
    "#publishedArticles",
    "#draftArticles",
    "#totalCategories"
  ];

  queries.forEach((result, index) => {
    const element = $(ids[index]);
    if (element) element.textContent = result.count ?? 0;
  });
}

/* =====================================================
   ARTICLES LIST
===================================================== */

async function loadArticles() {
  const session = await getAdminSession();
  if (!session) return;

  const container = $("#articlesList");
  if (!container) return;

  const { data, error } = await supabase
    .from("articles")
    .select("id,title_bn,title_en,status,created_at")
    .order("created_at", { ascending: false });

  if (error) {
    container.textContent = error.message;
    return;
  }

  if (!data?.length) {
    container.innerHTML = "<p>No articles found.</p>";
    return;
  }

  container.innerHTML = data.map(article => `
    <tr>
      <td>${escapeHTML(article.title_bn)}</td>
      <td>${escapeHTML(article.title_en)}</td>
      <td>${escapeHTML(article.status)}</td>
      <td>
        <a href="editor.html?id=${encodeURIComponent(article.id)}">Edit</a>
        <button type="button"
          data-delete-article="${escapeHTML(article.id)}">
          Delete
        </button>
      </td>
    </tr>
  `).join("");

  container.querySelectorAll("[data-delete-article]")
    .forEach(button => {
      button.addEventListener("click", () => {
        deleteArticle(button.dataset.deleteArticle);
      });
    });
}

async function deleteArticle(id) {
  const session = await getAdminSession();
  if (!session) return;

  if (!confirm("Delete this article permanently?")) return;

  const { error } = await supabase
    .from("articles")
    .delete()
    .eq("id", id);

  if (error) {
    alert(error.message);
    return;
  }

  await loadArticles();
}

/* =====================================================
   CATEGORIES
===================================================== */

async function loadCategories() {
  const session = await getAdminSession();
  if (!session) return;

  const container = $("#categoriesList");
  if (!container) return;

  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("created_at");

  if (error) {
    container.textContent = error.message;
    return;
  }

  if (!data?.length) {
    container.innerHTML = "<p>No categories found.</p>";
    return;
  }

  container.innerHTML = data.map(category => `
    <tr>
      <td>${escapeHTML(category.name_bn)}</td>
      <td>${escapeHTML(category.name_en)}</td>
      <td>${escapeHTML(category.slug)}</td>
      <td>
        <button type="button"
          data-delete-category="${escapeHTML(category.id)}">
          Delete
        </button>
      </td>
    </tr>
  `).join("");

  container.querySelectorAll("[data-delete-category]")
    .forEach(button => {
      button.addEventListener("click", () => {
        deleteCategory(button.dataset.deleteCategory);
      });
    });
}

async function deleteCategory(id) {
  const session = await getAdminSession();
  if (!session) return;

  if (!confirm("Delete this category?")) return;

  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", id);

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

  const category = {
    name_bn: formData.get("name_bn")?.trim(),
    name_en: formData.get("name_en")?.trim(),
    slug: formData.get("slug")?.trim()
  };

  if (!category.name_bn || !category.name_en || !category.slug) {
    showMessage($("#formMessage"), "সব Category তথ্য পূরণ করো।");
    return;
  }

  const { error } = await supabase
    .from("categories")
    .insert(category);

  if (error) {
    showMessage($("#formMessage"), error.message);
    return;
  }

  showMessage($("#formMessage"), "Category saved successfully.", "success");
  form.reset();
  await loadCategories();
}

/* =====================================================
   IMAGE UPLOAD HELPERS
===================================================== */

async function uploadImage(file) {
  validateImage(file);

  const extension = getExtension(file);
  const filePath =
    `articles/${Date.now()}-${crypto.randomUUID()}.${extension}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type
    });

  if (error) throw error;

  const { data } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(filePath);

  if (!data?.publicUrl) {
    throw new Error("Could not create public image URL.");
  }

  return data.publicUrl;
}

function displayImagePreview(image, source) {
  if (!image) return;
  image.src = source;
  image.hidden = false;
  image.style.display = "block";
}

function hideImagePreview(image) {
  if (!image) return;
  image.removeAttribute("src");
  image.hidden = true;
  image.style.display = "none";
}

/* =====================================================
   INSERT INLINE IMAGE MARKER
===================================================== */

function insertAtCursor(textarea, text) {
  if (!textarea) return;

  const start = textarea.selectionStart ?? textarea.value.length;
  const end = textarea.selectionEnd ?? textarea.value.length;

  textarea.value =
    textarea.value.slice(0, start) +
    text +
    textarea.value.slice(end);

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
        if (status) {
          status.textContent = `Uploading ${file.name}...`;
        }

        const imageUrl = await uploadImage(file);

        const marker =
          `\n\n[[DESH71_IMAGE:${imageUrl}]]\n\n`;

        insertAtCursor(textarea, marker);
      }

      if (status) {
        status.textContent = "ছবিগুলো Upload হয়েছে এবং লেখায় যুক্ত হয়েছে।";
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

  /* LOAD CATEGORIES */

  const { data: categories, error: categoryError } =
    await supabase
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
      (categories || []).map(category => `
        <option value="${escapeHTML(category.id)}">
          ${escapeHTML(category.name_bn)} / ${escapeHTML(category.name_en)}
        </option>
      `).join("");
  }

  /* LOAD EXISTING ARTICLE */

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

    if (existingImage) {
      displayImagePreview(imagePreview, existingImage);
    }

    const heading = $("#editorHeading");
    if (heading) heading.textContent = "Edit article";
  }

  /* FEATURED IMAGE PREVIEW */

  if (imageInput) {
    imageInput.addEventListener("change", () => {
      const file = imageInput.files?.[0];
      if (!file) return;

      try {
        validateImage(file);

        if (previewObjectUrl) {
          URL.revokeObjectURL(previewObjectUrl);
        }

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

  /* INLINE IMAGES - BANGLA AND ENGLISH */

  setupInlineImageUpload(
    "content_bn",
    "inlineImagesBn",
    "uploadInlineBn",
    "inlineStatusBn"
  );

  setupInlineImageUpload(
    "content_en",
    "inlineImagesEn",
    "uploadInlineEn",
    "inlineStatusEn"
  );

  /* SAVE ARTICLE */

  form.onsubmit = async event => {
    event.preventDefault();

    const currentSession = await getAdminSession();
    if (!currentSession) return;

    const formData = new FormData(form);
    const file = imageInput?.files?.[0];

    const titleBn = formData.get("title_bn")?.trim();
    const titleEn = formData.get("title_en")?.trim();

    if (!titleBn || !titleEn) {
      showMessage(message, "Bangla and English titles are required.");
      return;
    }

    if (!formData.get("category_id")) {
      showMessage(message, "Please select a category.");
      return;
    }

    const submitButton = form.querySelector('[type="submit"]');
    if (submitButton) submitButton.disabled = true;

    showMessage(message, "Saving article...", "info");

    try {
      let imageUrl = existingImage;

      if (removeImage?.checked && !file) {
        imageUrl = "";
      }

      if (file) {
        imageUrl = await uploadImage(file);
      }

      const status = formData.get("status") || "draft";

      const articleData = {
        title_bn: titleBn,
        title_en: titleEn,
        summary_bn: formData.get("summary_bn")?.trim() || "",
        summary_en: formData.get("summary_en")?.trim() || "",
        content_bn: formData.get("content_bn")?.trim() || "",
        content_en: formData.get("content_en")?.trim() || "",
        category_id: formData.get("category_id"),
        author_name:
          formData.get("author_name")?.trim() || "Desh 71 News Desk",
        image_url: imageUrl || null,
        status,
        updated_at: new Date().toISOString(),
        published_at: status === "published"
          ? existingPublishedAt || new Date().toISOString()
          : null
      };

      let result;

      if (articleId) {
        result = await supabase
          .from("articles")
          .update(articleData)
          .eq("id", articleId);
      } else {
        articleData.author_id = currentSession.user.id;

        result = await supabase
          .from("articles")
          .insert(articleData);
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
   PAGE INITIALIZATION
===================================================== */

document.addEventListener("DOMContentLoaded", () => {
  const loginForm = $("#loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", adminLogin);
  }

  const logoutButton = $("#signOut") || $("#logoutBtn");
  if (logoutButton) {
    logoutButton.addEventListener("click", adminLogout);
  }

  if ($("#totalArticles")) loadDashboard();
  if ($("#articlesList")) loadArticles();
  if ($("#categoriesList")) loadCategories();
  if ($("#articleForm")) loadEditor();

  const categoryForm = $("#categoryForm");
  if (categoryForm) {
    categoryForm.addEventListener("submit", saveCategory);
  }
});
