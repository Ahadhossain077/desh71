
"use strict";

/*
  DESH 71 - Frontend Controller
  News data will be connected to Supabase in the next stage.
*/

const categories = [
  "সব",
  "জাতীয়",
  "রাজনীতি",
  "আন্তর্জাতিক",
  "খেলাধুলা",
  "ব্যবসা",
  "প্রযুক্তি",
  "বিনোদন"
];

// No fabricated news articles.
// Only published database articles will be shown after Supabase integration.
let articles = [];

let selectedCategory = "সব";
let searchTerm = "";
let currentLanguage = "bn";

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

const newsGrid = $("#newsGrid");
const resultMessage = $("#resultMessage");
const searchInput = $("#searchInput");
const modal = $("#newsModal");

function initializeDate() {
  const now = new Date();

  const dateElement = $("#todayDate");
  const yearElement = $("#year");

  if (dateElement) {
    dateElement.textContent = new Intl.DateTimeFormat("bn-BD", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    }).format(now);
  }

  if (yearElement) {
    yearElement.textContent = now.getFullYear();
  }
}

function renderNews() {
  if (!newsGrid) return;

  const filtered = articles.filter((article) => {
    const matchesCategory =
      selectedCategory === "সব" ||
      article.category === selectedCategory;

    const searchText = (
      article.title + " " +
      article.summary + " " +
      article.category
    ).toLowerCase();

    const matchesSearch = searchText.includes(
      searchTerm.toLowerCase()
    );

    return matchesCategory && matchesSearch;
  });

  if (filtered.length === 0) {
    newsGrid.innerHTML = `
      <div class="empty-state">
        <span>📰</span>
        <h3>এখনো কোনো প্রকাশিত সংবাদ নেই</h3>
        <p>
          ${searchTerm
            ? "তোমার অনুসন্ধানের সঙ্গে মিলে এমন সংবাদ পাওয়া যায়নি।"
            : "Admin Panel থেকে সংবাদ প্রকাশ করলে এখানে দেখা যাবে।"}
        </p>
      </div>
    `;

    if (resultMessage) {
      resultMessage.textContent = searchTerm
        ? "অনুসন্ধানের ফলাফল: ০"
        : "";
    }

    return;
  }

  newsGrid.innerHTML = filtered.map((article) => `
    <article class="news-card">
      <div class="news-card-art" style="background:${safeColor(article.color)}">
        ${escapeHTML(article.category)}
      </div>
      <div class="news-card-body">
        <span class="category-tag">
          ${escapeHTML(article.category)}
        </span>
        <h3>${escapeHTML(article.title)}</h3>
        <p>${escapeHTML(article.summary)}</p>
        <div class="news-meta">
          <span>${escapeHTML(article.author || "Desh 71")}</span>
          <span>${escapeHTML(article.date || "")}</span>
        </div>
        <button class="card-read" data-article-id="${escapeHTML(article.id)}">
          বিস্তারিত পড়ুন →
        </button>
      </div>
    </article>
  `).join("");

  if (resultMessage) {
    resultMessage.textContent = `মোট সংবাদ: ${filtered.length}`;
  }
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function safeColor(value) {
  const allowedColors = [
    "linear-gradient(135deg,#102c50,#316da5)",
    "linear-gradient(135deg,#8b2430,#ed5964)",
    "linear-gradient(135deg,#12634c,#35a87b)",
    "linear-gradient(135deg,#493b82,#9370db)",
    "linear-gradient(135deg,#94551b,#df9b47)"
  ];

  return allowedColors.includes(value)
    ? value
    : allowedColors[0];
}

function selectCategory(category) {
  if (!categories.includes(category)) return;

  selectedCategory = category;

  $$(".filter-btn").forEach((button) => {
    button.classList.toggle(
      "selected",
      button.dataset.category === category
    );
  });

  $$(".nav-link").forEach((link) => {
    link.classList.toggle(
      "active",
      link.dataset.category === category
    );
  });

  renderNews();
}

function setupCategoryFilters() {
  $$(".filter-btn").forEach((button) => {
    button.addEventListener("click", () => {
      selectCategory(button.dataset.category);
      $("#news")?.scrollIntoView({ behavior: "smooth" });
    });
  });

  $$(".nav-link[data-category]").forEach((link) => {
    link.addEventListener("click", () => {
      selectCategory(link.dataset.category);
      $("#mainNav")?.classList.remove("open");
    });
  });
}

function setupSearch() {
  if (!searchInput) return;

  searchInput.addEventListener("input", () => {
    searchTerm = searchInput.value.trim();
    renderNews();
  });

  $("#searchButton")?.addEventListener("click", () => {
    searchTerm = searchInput.value.trim();
    renderNews();
  });

  searchInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      searchTerm = searchInput.value.trim();
      renderNews();
    }
  });
}

function openModal(title, description) {
  if (!modal) return;

  $("#modalTitle").textContent = title;
  $("#modalText").textContent = description;

  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeModal() {
  if (!modal) return;

  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

function setupModal() {
  $("#heroRead")?.addEventListener("click", () => {
    openModal(
      "Desh 71",
      "এটি Desh 71-এর প্রাথমিক পরিচিতি। Supabase ও Admin Panel যুক্ত হওয়ার পর এখানে প্রকাশিত সংবাদ বিস্তারিত পড়তে পারবে।"
    );
  });

  newsGrid?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-article-id]");
    if (!button) return;

    const article = articles.find(
      (item) => String(item.id) === button.dataset.articleId
    );

    if (article) {
      openModal(article.title, article.summary);
    }
  });

  $("#modalClose")?.addEventListener("click", closeModal);

  modal?.addEventListener("click", (event) => {
    if (event.target === modal) closeModal();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeModal();
  });
}

function setupMobileMenu() {
  const toggle = $("#menuToggle");
  const nav = $("#mainNav");

  toggle?.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("open");
    toggle.textContent = isOpen ? "✕" : "☰";
    toggle.setAttribute("aria-expanded", String(isOpen));
  });
}

function setupTheme() {
  const themeButton = $("#themeToggle");

  let savedTheme = "light";

  try {
    savedTheme = localStorage.getItem("desh71-theme") || "light";
  } catch (error) {
    console.warn("Theme preference storage unavailable.");
  }

  function applyTheme(theme) {
    const isDark = theme === "dark";

    document.body.classList.toggle("dark", isDark);

    if (themeButton) {
      themeButton.textContent = isDark ? "☀" : "☾";
    }
  }

  applyTheme(savedTheme);

  themeButton?.addEventListener("click", () => {
    const nextTheme = document.body.classList.contains("dark")
      ? "light"
      : "dark";

    applyTheme(nextTheme);

    try {
      localStorage.setItem("desh71-theme", nextTheme);
    } catch (error) {
      console.warn("Could not save theme preference.");
    }
  });
}

function setupLanguageButton() {
  const button = $("#languageToggle");

  button?.addEventListener("click", () => {
    openModal(
      "Language / ভাষা",
      "বাংলা ও ইংরেজি কনটেন্টের পূর্ণ Language System পরবর্তী ধাপে যুক্ত হবে।"
    );
  });
}

function initializeWebsite() {
  initializeDate();
  setupCategoryFilters();
  setupSearch();
  setupModal();
  setupMobileMenu();
  setupTheme();
  setupLanguageButton();
  renderNews();

  console.info("Desh 71 frontend initialized successfully.");
}

document.addEventListener("DOMContentLoaded", initializeWebsite);
app.
