/* =====================================================
   DESH 71 - ADMIN PANEL
   Supabase Authentication, Dashboard, Articles,
   Categories and Image Upload
===================================================== */

const supabase = window.supabase.createClient(
  window.DESh71_SUPABABASE_CONFIG.url,
  window.DESh71_SUPABABASE_CONFIG.anonKey
);

const $ = (selector) => document.querySelector(selector);

const showMessage = (element, message, type = "error") => {
  if (!element) return;
  element.textContent = message;
  element.className = `form-message ${type}`;
};

const escapeHTML = (value = "") =>
  String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);

async function getAdminSession() {
  const { data: { session }, error } =
    await supabase.auth.getSession();

  if (error || !session) {
    window.location.href = "login.html";
    return null;
  }

  const { data: isAdmin, error: roleError } =
    await supabase.rpc("is_admin");

  if (roleError || !isAdmin) {
    await supabase.auth.signOut();
    window.location.href = "login.html";
    return null;
  }

  return session;
}

async function adminLogout() {
  await supabase.auth.signOut();
  window.location.href = "login.html";
}

/* LOGIN */

async function adminLogin(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const email = form.querySelector('[name="email"]').value.trim();
  const password = form.querySelector('[name="password"]').value;
  const message = $("#formMessage");

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

  if (roleError || !isAdmin) {
    await supabase.auth.signOut();
    showMessage(message, "Admin access denied.");
    return;
  }

  window.location.href = "dashboard.html";
}

/* DASHBOARD */

async function loadDashboard() {
  const session = await getAdminSession();
  if (!session) return;

  const [articles, published, drafts, categories] =
    await Promise.all([
      supabase.from("articles").select("id", { count: "exact", head: true }),
      supabase.from("articles").select("id", { count: "exact", head: true }).eq("status", "published"),
      supabase.from("articles").select("id", { count: "exact", head: true }).eq("status", "draft"),
      supabase.from("categories").select("id", { count: "exact", head: true })
    ]);

  if ($("#totalArticles")) $("#totalArticles").textContent = articles.count ?? 0;
  if ($("#publishedArticles")) $("#publishedArticles").textContent = published.count ?? 0;
  if ($("#draftArticles")) $("#draftArticles").textContent = drafts.count ?? 0;
  if ($("#totalCategories")) $("#totalCategories").textContent = categories.count ?? 0;
}

/* ARTICLE LIST */

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

  container.innerHTML = (data || []).map(article => `
    <tr>
      <td>${escapeHTML(article.title_bn)}</td>
      <td>${escapeHTML(article.title_en)}</td>
      <td>${escapeHTML(article.status)}</td>
      <td>
        <a href="editor.html?id=${encodeURIComponent(article.id)}">Edit</a>
        <button type="button" data-delete-article="${escapeHTML(article.id)}">Delete</button>
      </td>
    </tr>
  `).join("");

  container.querySelectorAll("[data-delete-article]").forEach(button => {
    button.addEventListener("click", () =>
      deleteArticle(button.dataset.deleteArticle)
    );
  });
}

async function deleteArticle(id) {
  if (!confirm("Delete this article permanently?")) return;

  const { error } = await supabase
    .from("articles")
    .delete()
    .eq("id", id);

  if (error) {
    alert(error.message);
    return;
  }

  loadArticles();
}

/* CATEGORIES */

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

  container.innerHTML = (data || []).map(category => `
    <tr>
      <td>${escapeHTML(category.name_bn)}</td>
      <td>${escapeHTML(category.name_en)}</td>
      <td>${escapeHTML(category.slug)}</td>
      <td>
        <button type="button" data-delete-category="${escapeHTML(category.id)}">Delete</button>
      </td>
    </tr>
  `).join("");

  container.querySelectorAll("[data-delete-category]").forEach(button => {
    button.addEventListener("click", () =>
      deleteCategory(button.dataset.deleteCategory)
    );
  });
}

async function deleteCategory(id) {
  if (!confirm("Delete this category?")) return;

  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", id);

  if (error) {
    alert(error.message);
    return;
  }

  loadCategories();
}

async function saveCategory(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const formData = new FormData(form);

  const category = {
    name_bn: formData.get("name_bn")?.trim(),
    name_en: formData.get("name_en")?.trim(),
    slug: formData.get("slug")?.trim()
  };

  const { error } = await supabase
    .from("categories")
    .insert(category);

  if (error) {
    showMessage($("#formMessage"), error.message);
    return;
  }

  showMessage($("#formMessage"), "Category saved successfully.", "success");
  form.reset();
  loadCategories();
}

/* ARTICLE EDITOR */

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

  const { data: categories, error: categoryError } =
    await supabase.from("categories").select("*").order("created_at");

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

    for (const [key, value] of Object.entries(article)) {
      const field = form.elements.namedItem(key);
      if (field && value !== null && field.type !== "file") {
        field.value = value;
      }
    }

    if (imagePreview && existingImage) {
      imagePreview.src = existingImage;
      imagePreview.hidden = false;
    }
  }

  if (imageInput) {
    imageInput.addEventListener("change", () => {
      const file = imageInput.files?.[0];

      if (!file) return;

      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        showMessage(message, "Only JPG, PNG and WEBP images are allowed.");
        imageInput.value = "";
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        showMessage(message, "Image size must be 5 MB or less.");
        imageInput.value = "";
        return;
      }

      if (imagePreview) {
        imagePreview.src = URL.createObjectURL(file);
        imagePreview.hidden = false;
      }

      if (removeImage) removeImage.checked = false;
    });
  }

  form.onsubmit = async (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const file = imageInput?.files?.[0];

    const titleBn = formData.get("title_bn")?.trim();
    const titleEn = formData.get("title_en")?.trim();

    if (!titleBn || !titleEn) {
      showMessage(message, "Bangla and English titles are required.");
      return;
    }

    showMessage(message, "Saving article...", "info");

    let imageUrl = existingImage;

    if (removeImage?.checked) {
      imageUrl = "";
    }

    if (file) {
      const extension = file.type === "image/jpeg" ? "jpg" :
        file.type === "image/png" ? "png" : "webp";

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
        showMessage(message, "Image upload failed: " + uploadError.message);
        return;
      }

      const { data: publicData } = supabase.storage
        .from("article-images")
        .getPublicUrl(filePath);

      imageUrl = publicData.publicUrl;
    }

    const status = formData.get("status") || "draft";

    const articleData = {
      title_bn: titleBn,
      title_en: titleEn,
      summary_bn: formData.get("summary_bn")?.trim() || "",
      summary_en: formData.get("summary_en")?.trim() || "",
      content_bn: formData.get("content_bn")?.trim() || "",
      content_en: formData.get("content_en")?.trim() || "",
      category_id: formData.get("category_id") || null,
      author_name: formData.get("author_name")?.trim() || "Desh 71 News Desk",
      image_url: imageUrl || null,
      status,
      updated_at: new Date().toISOString()
    };

    if (status === "published") {
      articleData.published_at = new Date().toISOString();
    }

    let result;

    if (articleId) {
      if (status !== "published") {
        articleData.published_at = null;
      }

      result = await supabase
        .from("articles")
        .update(articleData)
        .eq("id", articleId);
    } else {
      articleData.author_id = session.user.id;
      if (status === "published") {
        articleData.published_at = new Date().toISOString();
      }
      result = await supabase.from("articles").insert(articleData);
    }

    if (result.error) {
      showMessage(message, result.error.message);
      return;
    }

    showMessage(message, "Article saved successfully.", "success");

    setTimeout(() => {
      window.location.href = "articles.html";
    }, 1000);
  };
}

/* AUTOMATIC PAGE INITIALIZATION */

document.addEventListener("DOMContentLoaded", () => {
  const loginForm = $("#loginForm");
  if (loginForm) loginForm.addEventListener("submit", adminLogin);

  const logoutButton = $("#logoutBtn");
  if (logoutButton) logoutButton.addEventListener("click", adminLogout);

  if ($("#totalArticles")) loadDashboard();
  if ($("#articlesList")) loadArticles();
  if ($("#categoriesList")) loadCategories();
  if ($("#articleForm")) loadEditor();

  const categoryForm = $("#categoryForm");
  if (categoryForm) categoryForm.addEventListener("submit", saveCategory);
});
