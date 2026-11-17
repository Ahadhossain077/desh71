
/* =====================================================
   DESH 71 - COMPLETE ADMIN PANEL
   Authentication | Dashboard | Articles
   Categories | Supabase Storage Image Upload
===================================================== */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import "../../config/supabase.js";

const config = window.DESh71_SUPABABASE_CONFIG;

if (!config?.url || !config?.anonKey) {
  throw new Error("Supabase configuration not found.");
}

const supabase = createClient(config.url, config.anonKey);

const $ = (selector) => document.querySelector(selector);

const escapeHTML = (value = "") =>
  String(value).replace(/[&<>"']/g, (char) => ({
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

  if (!email || !password) {
    showMessage(message, "Enter your email and password.");
    return;
  }

  showMessage(message, "Logging in...", "info");

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    showMessage(message, error.message);
    return;
  }

  const { data: isAdmin, error: roleError } =
    await supabase.rpc("is_admin");

  if (roleError || isAdmin !== true) {
    await supabase.auth.signOut();
    showMessage(message, "Admin access denied.");
    return;
  }

  window.location.href = "dashboard.html";
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

  const [articles, published, drafts, categories] = queries;

  const error = queries.find(result => result.error);

  if (error) {
    console.error("Dashboard error:", error.error);
    return;
  }

  if ($("#totalArticles"))
    $("#totalArticles").textContent = articles.count ?? 0;

  if ($("#publishedArticles"))
    $("#publishedArticles").textContent = published.count ?? 0;

  if ($("#draftArticles"))
    $("#draftArticles").textContent = drafts.count ?? 0;

  if ($("#totalCategories"))
    $("#totalCategories").textContent = categories.count ?? 0;
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
        <a href="editor.html?id=${encodeURIComponent(article.id)}">
          Edit
        </a>

        <button
          type="button"
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
        <button
          type="button"
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
    showMessage($("#formMessage"), "Complete all category fields.");
    return;
  }

  const { error } = await supabase
    .from("categories")
    .insert(category);

  if (error) {
    showMessage($("#formMessage"), error.message);
    return;
  }

  showMessage(
    $("#formMessage"),
    "Category saved successfully.",
    "success"
  );

  form.reset();
  await loadCategories();
}

/* =====================================================
   IMAGE PREVIEW
===================================================== */

function displayImagePreview(imagePreview, source) {
  if (!imagePreview) return;

  imagePreview.src = source;
  imagePreview.hidden = false;
  imagePreview.style.display = "block";
}

function hideImagePreview(imagePreview) {
  if (!imagePreview) return;

  imagePreview.removeAttribute("src");
  imagePreview.hidden = true;
  imagePreview.style.display = "none";
}

/* =====================================================
   ARTICLE EDITOR + IMAGE UPLOAD
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
          ${escapeHTML(category.name_bn)} /
          ${escapeHTML(category.name_en)}
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
        value !== null &&
        field instanceof HTMLElement &&
        field.type !== "file"
      ) {
        field.value = value;
      }
    }

    if (existingImage) {
      displayImagePreview(imagePreview, existingImage);
      if (removeImage) removeImage.checked = false;
    }

    const heading = $("#editorHeading");
    if (heading) heading.textContent = "Edit article";
  }

  /* IMAGE FILE VALIDATION AND PREVIEW */

  if (imageInput) {
    imageInput.addEventListener("change", () => {
      const file = imageInput.files?.[0];

      if (!file) return;

      const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp"
      ];

      if (!allowedTypes.includes(file.type)) {
        showMessage(
          message,
          "Only JPG, PNG and WEBP images are allowed."
        );

        imageInput.value = "";
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        showMessage(
          message,
          "Image size must be 5 MB or less."
        );

        imageInput.value = "";
        return;
      }

      if (previewObjectUrl) {
        URL.revokeObjectURL(previewObjectUrl);
      }

      previewObjectUrl = URL.createObjectURL(file);

      displayImagePreview(imagePreview, previewObjectUrl);

      if (removeImage) removeImage.checked = false;

      showMessage(message, "Image selected successfully.", "success");
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

  /* SAVE ARTICLE */

  form.onsubmit = async (event) => {
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

    showMessage(message, "Saving article...", "info");

    let imageUrl = existingImage;

    /* REMOVE IMAGE */

    if (removeImage?.checked && !file) {
      imageUrl = "";
    }

    /* UPLOAD NEW IMAGE */

    if (file) {
      const extension = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp"
      }[file.type];

      if (!extension || file.size > 5 * 1024 * 1024) {
        showMessage(message, "Invalid image file.");
        return;
      }

      const filePath =
        `articles/${Date.now()}-${crypto.randomUUID()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("article-images")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type
        });

      if (uploadError) {
        showMessage(
          message,
          "Image upload failed: " + uploadError.message
        );
        return;
      }

      const { data: publicData } = supabase.storage
        .from("article-images")
        .getPublicUrl(filePath);

      imageUrl = publicData.publicUrl;
    }

    /* ARTICLE DATA */

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
      updated_at: new Date().toISOString()
    };

    if (status === "published") {
      articleData.published_at =
        existingPublishedAt || new Date().toISOString();
    } else {
      articleData.published_at = null;
    }

    /* UPDATE OR INSERT */

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

    if (result.error) {
      showMessage(message, result.error.message);
      return;
    }

    showMessage(
      message,
      "Article saved successfully.",
      "success"
    );

    setTimeout(() => {
      window.location.href = "articles.html";
    }, 1000);
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

  /* MATCHES YOUR editor.html ID */

  const logoutButton = $("#signOut");
  if (logoutButton) {
    logoutButton.addEventListener("click", adminLogout);
  }

  /* SUPPORT OTHER ADMIN PAGE ID */

  const logoutAlternative = $("#logoutBtn");
  if (logoutAlternative) {
    logoutAlternative.addEventListener("click", adminLogout);
  }

  if ($("#totalArticles")) {
    loadDashboard();
  }

  if ($("#articlesList")) {
    loadArticles();
  }

  if ($("#categoriesList")) {
    loadCategories();
  }

  if ($("#articleForm")) {
    loadEditor();
  }

  const categoryForm = $("#categoryForm");
  if (categoryForm) {
    categoryForm.addEventListener("submit", saveCategory);
  }
});
