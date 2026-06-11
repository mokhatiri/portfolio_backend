// GitHub API Configuration
const GITHUB_USERNAME = "mokhatiri";
const GITHUB_API_URL = `https://api.github.com/users/${GITHUB_USERNAME}/repos`;
const ROBOT_API_URL = window.MK_BOT_API_URL || "/api/chat";
const CONTACT_API_URL = window.MK_CONTACT_API_URL || "/api/contact";
const REPO_CACHE_KEY = "mk-github-repos";
const REPO_CACHE_TTL_MS = 10 * 60 * 1000;
const FEATURED_TOPIC = "featured";

// DOM Elements
const navToggle = document.getElementById("nav-toggle");
const navMenu = document.getElementById("nav-menu");
const navbar = document.getElementById("navbar");
const navLinks = document.querySelectorAll(".nav-link");
const projectsGrid = document.getElementById("projects-grid");
const projectsFilter = document.getElementById("projects-filter");
const contactForm = document.getElementById("contact-form");
const typingText = document.getElementById("typing-text");
const repoCountEl = document.getElementById("repo-count");

// Store repositories globally for filtering
let allRepositories = [];
let currentTab = "active";
let currentTopic = "all";
let currentSort = "size";
let updateFilterArrows = () => {};

// Language colors mapping
const languageColors = {
  JavaScript: "#f1e05a",
  TypeScript: "#3178c6",
  Python: "#3572A5",
  Java: "#b07219",
  HTML: "#e34c26",
  CSS: "#563d7c",
  Vue: "#41b883",
  Go: "#00ADD8",
  "C++": "#f34b7d",
  C: "#555555",
  Shell: "#89e051",
  "Jupyter Notebook": "#DA5B0B",
  PHP: "#4F5D95",
  Ruby: "#701516",
  Rust: "#dea584",
  Swift: "#ffac45",
  Kotlin: "#A97BFF",
};

// Initialize the application
document.addEventListener("DOMContentLoaded", () => {
  initThemeToggle();
  initNavigation();
  initTypingEffect();
  fetchGitHubRepos();
  initContactForm();
  initScrollEffects();
  initRobotAssistant();
  initOrbAnimation();
});

// Light / dark theme toggle (persisted in localStorage).
// The initial theme is set by an inline script in <head> to avoid a flash.
function initThemeToggle() {
  const toggle = document.getElementById("theme-toggle");
  const root = document.documentElement;

  const syncIcon = () => {
    const icon = toggle?.querySelector("i");
    if (icon) {
      const isLight = root.getAttribute("data-theme") === "light";
      icon.className = isLight ? "fas fa-sun" : "fas fa-moon";
    }
  };

  syncIcon();

  if (toggle) {
    toggle.addEventListener("click", () => {
      const next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
      root.setAttribute("data-theme", next);
      try {
        localStorage.setItem("theme", next);
      } catch (error) {
        console.warn("Could not persist theme:", error);
      }
      syncIcon();
    });
  }
}

// Navigation functionality
function initNavigation() {
  // Mobile menu toggle
  navToggle.addEventListener("click", () => {
    navToggle.classList.toggle("active");
    navMenu.classList.toggle("active");
  });

  // Close mobile menu when clicking a link
  navLinks.forEach((link) => {
    link.addEventListener("click", () => {
      navToggle.classList.remove("active");
      navMenu.classList.remove("active");
    });
  });

  // Active link on scroll
  window.addEventListener("scroll", () => {
    const sections = document.querySelectorAll("section[id]");
    const scrollY = window.pageYOffset;

    sections.forEach((section) => {
      const sectionHeight = section.offsetHeight;
      const sectionTop = section.offsetTop - 100;
      const sectionId = section.getAttribute("id");
      const navLink = document.querySelector(`.nav-link[href="#${sectionId}"]`);

      if (navLink) {
        if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
          navLink.classList.add("active");
        } else {
          navLink.classList.remove("active");
        }
      }
    });

    // Navbar background on scroll
    if (window.scrollY > 50) {
      navbar.classList.add("scrolled");
    } else {
      navbar.classList.remove("scrolled");
    }
  });
}

// Typing effect for hero section
function initTypingEffect() {
  const texts = [
    "CS Student",
    "AI Enthusiast",
    "Big Data Explorer",
    "Full Stack Developer",
    "Problem Solver",
  ];
  let textIndex = 0;
  let charIndex = 0;
  let isDeleting = false;
  let typeSpeed = 100;

  function type() {
    const currentText = texts[textIndex];

    if (isDeleting) {
      typingText.textContent = currentText.substring(0, charIndex - 1);
      charIndex--;
      typeSpeed = 50;
    } else {
      typingText.textContent = currentText.substring(0, charIndex + 1);
      charIndex++;
      typeSpeed = 100;
    }

    if (!isDeleting && charIndex === currentText.length) {
      typeSpeed = 2000;
      isDeleting = true;
    } else if (isDeleting && charIndex === 0) {
      isDeleting = false;
      textIndex = (textIndex + 1) % texts.length;
      typeSpeed = 500;
    }

    setTimeout(type, typeSpeed);
  }

  type();
}

// Keep only the repo fields the UI uses, so the cache stays small
function slimRepo(repo) {
  return {
    name: repo.name,
    html_url: repo.html_url,
    homepage: repo.homepage,
    description: repo.description,
    language: repo.language,
    stargazers_count: repo.stargazers_count,
    forks_count: repo.forks_count,
    size: repo.size,
    archived: repo.archived,
    fork: repo.fork,
    topics: repo.topics || [],
    pushed_at: repo.pushed_at,
  };
}

function readRepoCache(allowStale = false) {
  try {
    const cached = JSON.parse(localStorage.getItem(REPO_CACHE_KEY));
    if (
      cached &&
      Array.isArray(cached.repos) &&
      (allowStale || Date.now() < cached.expiresAt)
    ) {
      return cached.repos;
    }
  } catch (error) {
    console.warn("Could not read repo cache:", error);
  }
  return null;
}

function writeRepoCache(repos) {
  try {
    localStorage.setItem(
      REPO_CACHE_KEY,
      JSON.stringify({ repos, expiresAt: Date.now() + REPO_CACHE_TTL_MS }),
    );
  } catch (error) {
    console.warn("Could not write repo cache:", error);
  }
}

// Fetch GitHub repositories (served from a 10-minute localStorage cache
// when possible, to stay well under GitHub's unauthenticated rate limit)
async function fetchGitHubRepos() {
  const cached = readRepoCache();
  if (cached) {
    initProjectsSection(cached);
    return;
  }

  try {
    const response = await fetch(`${GITHUB_API_URL}?sort=updated&per_page=100`);

    if (!response.ok) {
      throw new Error("Failed to fetch repositories");
    }

    const repos = (await response.json()).map(slimRepo);
    writeRepoCache(repos);
    initProjectsSection(repos);
  } catch (error) {
    console.error("Error fetching repos:", error);

    // Fall back to an expired cache rather than showing nothing
    const stale = readRepoCache(true);
    if (stale) {
      initProjectsSection(stale);
      return;
    }

    projectsGrid.innerHTML = `
            <div class="loading-spinner">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Failed to load repositories. Please try again later.</p>
            </div>
        `;
  }
}

function initProjectsSection(repos) {
  allRepositories = repos;

  // Update repo count in about section
  if (repoCountEl) {
    repoCountEl.textContent = allRepositories.length;
  }

  initTabs();
  initFilters();
  initFilterArrows();
  initSort();
  initTopicTagClicks();
  applyFilters();
}

// Display repositories
function displayRepositories(repos) {
  if (repos.length === 0) {
    projectsGrid.innerHTML = `
            <div class="loading-spinner">
                <i class="fas fa-folder-open"></i>
                <p>No repositories found.</p>
            </div>
        `;
    return;
  }

  projectsGrid.innerHTML = repos.map((repo) => createRepoCard(repo)).join("");
  revealProjectCards();
}

// Fade-up reveal for freshly rendered cards (the global scroll-effects
// observer runs before the cards exist, so they get their own)
const cardRevealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = "1";
        entry.target.style.transform = "translateY(0)";
        cardRevealObserver.unobserve(entry.target);
      }
    });
  },
  {
    threshold: 0.1,
    rootMargin: "0px 0px -50px 0px",
  },
);

function revealProjectCards() {
  projectsGrid.querySelectorAll(".project-card").forEach((card, index) => {
    const delay = Math.min(index * 0.05, 0.3);
    card.style.opacity = "0";
    card.style.transform = "translateY(20px)";
    card.style.transition = `opacity 0.5s ease ${delay}s, transform 0.5s ease ${delay}s`;
    cardRevealObserver.observe(card);
  });
}

function escapeHtml(value) {
  return String(value).replace(
    /[&<>"']/g,
    (ch) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[ch],
  );
}

function timeAgo(dateString) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  const units = [
    ["y", 31536000],
    ["mo", 2592000],
    ["d", 86400],
    ["h", 3600],
  ];

  for (const [label, unitSeconds] of units) {
    const value = Math.floor(seconds / unitSeconds);
    if (value >= 1) {
      return `${value}${label} ago`;
    }
  }

  return "just now";
}

// Create repository card
function createRepoCard(repo) {
  const languageColor = languageColors[repo.language] || "#8b8b8b";
  const description = escapeHtml(repo.description || "No description available");
  const repoUrl = escapeHtml(repo.html_url);
  const homepage = repo.homepage
    ? `<a href="${escapeHtml(repo.homepage)}" target="_blank" rel="noopener noreferrer" aria-label="Live Demo"><i class="fas fa-external-link-alt"></i></a>`
    : "";

  const featuredBadge = isFeatured(repo)
    ? '<span class="featured-badge"><i class="fas fa-star"></i> Featured</span>'
    : "";
  const forkBadge = repo.fork
    ? '<span class="fork-badge"><i class="fas fa-code-branch"></i> Fork</span>'
    : "";

  // Tech tags come from the repo's GitHub topics; clicking one
  // activates the matching filter button
  const topics = (repo.topics || []).filter((topic) => topic !== FEATURED_TOPIC);
  const topicsHtml = topics.length
    ? `<div class="project-topics">${topics
        .map(
          (topic) =>
            `<button type="button" class="topic-tag" data-topic="${escapeHtml(topic)}">${escapeHtml(topic)}</button>`,
        )
        .join("")}</div>`
    : "";

  const updated = timeAgo(repo.pushed_at);
  const updatedHtml = updated
    ? `<span title="Last updated"><i class="far fa-clock"></i> ${updated}</span>`
    : "";

  return `
        <div class="project-card" data-language="${escapeHtml(repo.language || "Other")}">
            <div class="project-header">
                <div class="project-header-left">
                    <i class="fas fa-folder-open project-icon"></i>
                    ${featuredBadge}
                    ${forkBadge}
                </div>
                <div class="project-links">
                    ${homepage}
                    <a href="${repoUrl}" target="_blank" rel="noopener noreferrer" aria-label="View on GitHub">
                        <i class="fab fa-github"></i>
                    </a>
                </div>
            </div>
            <div class="project-content">
                <h3 class="project-title">
                    <a href="${repoUrl}" target="_blank" rel="noopener noreferrer">${escapeHtml(repo.name)}</a>
                </h3>
                <p class="project-description">${description}</p>
                ${topicsHtml}
                <div class="project-meta">
                    ${
                      repo.language
                        ? `
                        <span class="project-language">
                            <span class="language-dot" style="background-color: ${languageColor}"></span>
                            ${escapeHtml(repo.language)}
                        </span>
                    `
                        : '<span class="project-language">-</span>'
                    }
                    <div class="project-stats">
                        <span><i class="fas fa-star"></i> ${repo.stargazers_count}</span>
                        <span><i class="fas fa-code-branch"></i> ${repo.forks_count}</span>
                        ${updatedHtml}
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Clicking a topic pill on a card activates the matching filter button
function initTopicTagClicks() {
  projectsGrid.addEventListener("click", (event) => {
    const tag = event.target.closest(".topic-tag");
    if (!tag) return;

    const btn = projectsFilter.querySelector(
      `.filter-btn[data-filter="${CSS.escape(tag.dataset.topic)}"]`,
    );
    if (!btn) return;

    btn.click();
    btn.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  });
}

// Repositories belonging to a tab (active vs archived)
function getTabRepos(tab) {
  return allRepositories.filter(
    (repo) => Boolean(repo.archived) === (tab === "archived"),
  );
}

const repoSorters = {
  size: (a, b) => b.size - a.size,
  updated: (a, b) => new Date(b.pushed_at) - new Date(a.pushed_at),
  stars: (a, b) => b.stargazers_count - a.stargazers_count,
};

function isFeatured(repo) {
  return (repo.topics || []).includes(FEATURED_TOPIC);
}

// Apply the current tab + topic filter + sort and render the result
function applyFilters() {
  let repos = getTabRepos(currentTab);

  if (currentTopic !== "all") {
    repos = repos.filter((repo) => (repo.topics || []).includes(currentTopic));
  }

  repos = [...repos].sort(repoSorters[currentSort] || repoSorters.size);

  // Featured repos stay pinned on top regardless of the chosen sort
  repos.sort((a, b) => isFeatured(b) - isFeatured(a));

  displayRepositories(repos);
}

// Sort dropdown (size by default)
function initSort() {
  const sortSelect = document.getElementById("projects-sort");
  if (!sortSelect) return;

  sortSelect.value = currentSort;
  sortSelect.addEventListener("change", () => {
    currentSort = sortSelect.value;
    applyFilters();
  });
}

// Initialize active/archived tabs, ordered from the biggest to the smallest
function initTabs() {
  const tabsContainer = document.getElementById("projects-tabs");
  if (!tabsContainer) return;

  let tabs = [
    { id: "active", label: "Active", count: getTabRepos("active").length },
    { id: "archived", label: "Archived", count: getTabRepos("archived").length },
  ].filter((tab) => tab.count > 0);

  if (tabs.length === 0) {
    tabs = [{ id: "active", label: "Active", count: 0 }];
  }

  // Biggest tab first
  tabs.sort((a, b) => b.count - a.count);
  currentTab = tabs[0].id;

  tabsContainer.innerHTML = tabs
    .map(
      (tab) => `
        <button class="tab-btn${tab.id === currentTab ? " active" : ""}" data-tab="${tab.id}"
          role="tab" aria-selected="${tab.id === currentTab}" aria-controls="projects-grid">
          ${tab.label} <span class="tab-count">${tab.count}</span>
        </button>
      `,
    )
    .join("");

  const tabBtns = tabsContainer.querySelectorAll(".tab-btn");
  tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.dataset.tab === currentTab) return;

      tabBtns.forEach((b) => {
        b.classList.remove("active");
        b.setAttribute("aria-selected", "false");
      });
      btn.classList.add("active");
      btn.setAttribute("aria-selected", "true");
      currentTab = btn.dataset.tab;

      // Rebuild the language filter for the new tab and re-render
      initFilters();
      applyFilters();
    });
  });
}

// Initialize filters dynamically based on repository topics
function initFilters() {
  // Count topics in the current tab
  const topicCounts = {};
  getTabRepos(currentTab).forEach((repo) => {
    (repo.topics || []).forEach((topic) => {
      if (topic === FEATURED_TOPIC) return; // meta-topic, not a tech tag
      topicCounts[topic] = (topicCounts[topic] || 0) + 1;
    });
  });

  // All topics, sorted from the most used to the least used
  const topics = Object.entries(topicCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([topic]) => topic);

  currentTopic = "all";

  // Generate filter buttons
  projectsFilter.innerHTML = `
    <button class="filter-btn active" data-filter="all">All</button>
    ${topics.map((topic) => `<button class="filter-btn" data-filter="${topic}">${topic}</button>`).join("")}
  `;

  // Add event listeners to buttons
  const filterBtns = projectsFilter.querySelectorAll(".filter-btn");
  filterBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      // Update active button
      filterBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      currentTopic = btn.dataset.filter;
      applyFilters();
    });
  });

  projectsFilter.scrollLeft = 0;
  updateFilterArrows();
}

// Left/right arrows to navigate the language filter when it overflows
function initFilterArrows() {
  const leftArrow = document.getElementById("filter-arrow-left");
  const rightArrow = document.getElementById("filter-arrow-right");
  if (!leftArrow || !rightArrow || !projectsFilter) return;

  updateFilterArrows = () => {
    const maxScroll = projectsFilter.scrollWidth - projectsFilter.clientWidth;
    leftArrow.disabled = projectsFilter.scrollLeft <= 0;
    rightArrow.disabled = projectsFilter.scrollLeft >= maxScroll - 1;
  };

  const scrollAmount = () => Math.max(projectsFilter.clientWidth * 0.6, 150);

  leftArrow.addEventListener("click", () => {
    projectsFilter.scrollBy({ left: -scrollAmount(), behavior: "smooth" });
  });

  rightArrow.addEventListener("click", () => {
    projectsFilter.scrollBy({ left: scrollAmount(), behavior: "smooth" });
  });

  projectsFilter.addEventListener("scroll", updateFilterArrows, { passive: true });
  window.addEventListener("resize", updateFilterArrows, { passive: true });

  updateFilterArrows();
}

// Contact form handling: send through the backend, fall back to the
// visitor's email client if the backend is unavailable
function initContactForm() {
  if (!contactForm) return;

  contactForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = new FormData(contactForm);
    const name = formData.get("name");
    const email = formData.get("email");
    const subject = formData.get("subject");
    const message = formData.get("message");

    const btn = contactForm.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
    btn.disabled = true;

    try {
      const response = await fetch(CONTACT_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, subject, message }),
      });

      if (!response.ok) {
        throw new Error("Contact backend is unavailable");
      }

      contactForm.reset();
      btn.innerHTML = '<i class="fas fa-check"></i> Message Sent!';
    } catch (error) {
      console.warn("Contact backend fallback:", error);

      const mailtoLink = `mailto:mohamed.khatiri2006@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`)}`;
      window.location.href = mailtoLink;
      btn.innerHTML = '<i class="fas fa-check"></i> Opening Email Client...';
    }

    setTimeout(() => {
      btn.innerHTML = originalText;
      btn.disabled = false;
    }, 3000);
  });
}

// Scroll effects and animations
function initScrollEffects() {
  // Intersection Observer for reveal animations
  // Project cards are rendered later from the GitHub fetch and have
  // their own reveal observer (see revealProjectCards)
  const revealElements = document.querySelectorAll(
    ".skill-category, .contact-item",
  );

  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = "1";
          entry.target.style.transform = "translateY(0)";
        }
      });
    },
    {
      threshold: 0.1,
      rootMargin: "0px 0px -50px 0px",
    },
  );

  revealElements.forEach((el) => {
    el.style.opacity = "0";
    el.style.transform = "translateY(20px)";
    el.style.transition = "opacity 0.5s ease, transform 0.5s ease";
    revealObserver.observe(el);
  });

  // Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute("href"));
      if (target) {
        const offsetTop = target.offsetTop - 70;
        window.scrollTo({
          top: offsetTop,
          behavior: "smooth",
        });
      }
    });
  });
}

// Floating robot assistant
function initRobotAssistant() {
  const assistant = document.getElementById("robot-assistant");
  const button = document.getElementById("robot-button");
  const closeButton = document.getElementById("robot-close");
  const chatPanel = document.getElementById("robot-chat");
  const chatLog = document.getElementById("robot-chat-log");
  const chatForm = document.getElementById("robot-chat-form");
  const chatInput = document.getElementById("robot-chat-input");

  if (!assistant || !button || !chatPanel || !chatLog || !chatForm || !chatInput) {
    return;
  }

  const portfolioFacts = {
    intro:
      "Mohammed Khatiri is a Computer Science student focused on Artificial Intelligence and Big Data. He likes turning theory into practical, solution-driven projects.",
    skills:
      "Mohammed works with Python, Java, JavaScript, TypeScript, Go, C++, C, Django, Vue, Nuxt, REST APIs, Docker, Kubernetes, GitHub Actions, SQL, Pandas, NumPy, and PyTorch.",
    ai:
      "His AI and data interests include machine learning, data preprocessing, large-scale data analysis, PyTorch, Pandas, and NumPy.",
    projects:
      "The Projects section loads Mohammed's public GitHub repositories live from the GitHub API, so visitors can explore his recent work and filter it by language.",
    contact:
      "You can reach Mohammed at mohamed.khatiri2006@gmail.com, visit github.com/mokhatiri, or open linkedin.com/in/khatirimohammed.",
    cv:
      "Mohammed's CV is available from the navigation button and the About section as a downloadable PDF.",
    linkedin:
      "I can point visitors to Mohammed's LinkedIn profile, but querying LinkedIn directly needs OAuth, approved API access, and a secure backend. Static GitHub Pages should not store LinkedIn tokens.",
    llm:
      "This bot is a safe static prototype. To make me a real LLM, connect this chat form to a serverless endpoint that holds the API key and answers from approved portfolio, CV, GitHub, and LinkedIn context.",
  };

  const responseRules = [
    { keywords: ["skill", "tech", "stack", "language", "tools"], response: portfolioFacts.skills },
    { keywords: ["ai", "machine learning", "ml", "data", "big data", "pytorch", "pandas"], response: portfolioFacts.ai },
    { keywords: ["project", "github", "repo", "repository"], response: portfolioFacts.projects },
    { keywords: ["contact", "email", "hire", "reach", "linkedin"], response: portfolioFacts.contact },
    { keywords: ["cv", "resume"], response: portfolioFacts.cv },
    { keywords: ["linkedin", "profile"], response: portfolioFacts.linkedin },
    { keywords: ["llm", "chatgpt", "ai bot", "backend", "api"], response: portfolioFacts.llm },
    { keywords: ["who", "about", "mohammed", "khatiri"], response: portfolioFacts.intro },
  ];

  function setChatOpen(isOpen) {
    assistant.classList.toggle("open", isOpen);
    button.setAttribute("aria-expanded", String(isOpen));
    chatPanel.setAttribute("aria-hidden", String(!isOpen));

    if (isOpen) {
      chatInput.focus();
    }
  }

  function addMessage(message, sender) {
    const messageEl = document.createElement("div");
    messageEl.className = `robot-message ${sender}`;
    messageEl.textContent = message;
    chatLog.appendChild(messageEl);
    chatLog.scrollTop = chatLog.scrollHeight;
    return messageEl;
  }

  function getBotResponse(question) {
    const normalizedQuestion = question.toLowerCase();
    const match = responseRules.find((rule) =>
      rule.keywords.some((keyword) => normalizedQuestion.includes(keyword)),
    );

    if (match) {
      return match.response;
    }

    return "I can answer from Mohammed's portfolio facts. Try asking about his skills, AI and Big Data focus, projects, GitHub, CV, contact info, or LinkedIn.";
  }

  async function getBackendResponse(question) {
    const response = await fetch(ROBOT_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ question }),
    });

    if (!response.ok) {
      throw new Error("Assistant backend is unavailable");
    }

    const data = await response.json();

    if (!data.answer) {
      throw new Error("Assistant backend returned no answer");
    }

    return data.answer;
  }

  button.addEventListener("click", () => {
    setChatOpen(!assistant.classList.contains("open"));
  });

  closeButton.addEventListener("click", () => {
    setChatOpen(false);
  });

  chatForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const question = chatInput.value.trim();

    if (!question) {
      return;
    }

    addMessage(question, "user");
    chatInput.value = "";
    chatInput.disabled = true;
    const thinkingMessage = addMessage("Thinking through Mohammed's portfolio...", "bot");

    try {
      thinkingMessage.textContent = await getBackendResponse(question);
    } catch (error) {
      console.warn("Robot assistant backend fallback:", error);
      thinkingMessage.textContent = getBotResponse(question);
    } finally {
      chatInput.disabled = false;
      chatInput.focus();
    }
  });

}

// A small cloud of glowing particles that lives inside the assistant button.
// The whole cloud slowly expands and contracts ("breathes") and brightens on
// the inhale; it energizes briefly while hovered. Drawn on a canvas with
// additive blending, using the theme's neon accent colours. Honors
// prefers-reduced-motion by rendering a single static frame.
function initOrbAnimation() {
  const button = document.getElementById("robot-button");
  const canvas = button && button.querySelector(".particle-orb");
  if (!button || !canvas) {
    return;
  }

  const ctx = canvas.getContext("2d");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Pull the two neon accent colours from the theme so the orb always matches.
  function readColors() {
    const css = getComputedStyle(document.documentElement);
    const parse = (name, fallback) =>
      (css.getPropertyValue(name).trim() || fallback).split(",").map((n) => parseFloat(n));
    return {
      core: parse("--neon-2-rgb", "34, 211, 238"), // cyan, bright centre
      edge: parse("--neon-1-rgb", "124, 92, 255"), // violet, outer edge
    };
  }
  let colors = readColors();

  // Match the canvas to the button size at the current device pixel ratio.
  let size = 0;
  let radius = 0;
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    size = button.getBoundingClientRect().width;
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    radius = size * 0.3; // leaves room for the glow to stay inside the canvas
  }
  resize();
  window.addEventListener("resize", resize, { passive: true });

  // Particles spread evenly across a disc, each with its own orbit + twinkle.
  const COUNT = 46;
  const particles = Array.from({ length: COUNT }, () => {
    const r = Math.sqrt(Math.random()); // sqrt keeps the disc evenly filled
    return {
      angle: Math.random() * Math.PI * 2,
      baseR: r,
      spin: (Math.random() - 0.5) * 0.004,
      twinkle: Math.random() * Math.PI * 2,
      twSpeed: 0.02 + Math.random() * 0.03,
      dotR: 0.9 + Math.random() * 1.6,
      mix: r, // colour lerp: 0 = core, 1 = edge
    };
  });

  let hovered = false;
  let energy = 0;
  button.addEventListener("mouseenter", () => { hovered = true; });
  button.addEventListener("mouseleave", () => { hovered = false; });

  let t = 0;
  function draw() {
    const cx = size / 2;
    const cy = size / 2;

    // Breathing: a slow inhale/exhale of the whole cloud + matching brightness.
    const phase = reduceMotion ? Math.PI / 2 : t * 0.018;
    const breathe = 1 + Math.sin(phase) * 0.16;
    energy += ((hovered ? 1 : 0) - energy) * 0.08;
    const scale = breathe + energy * 0.12;
    const glow = 0.5 + (Math.sin(phase) * 0.5 + 0.5) * 0.35 + energy * 0.15;

    ctx.clearRect(0, 0, size, size);
    ctx.globalCompositeOperation = "lighter"; // additive blending = real glow

    for (const p of particles) {
      if (!reduceMotion) {
        p.angle += p.spin * (1 + energy * 2);
        p.twinkle += p.twSpeed;
      }
      const r = p.baseR * radius * scale;
      const x = cx + Math.cos(p.angle) * r;
      const y = cy + Math.sin(p.angle) * r;
      const tw = 0.55 + (Math.sin(p.twinkle) * 0.5 + 0.5) * 0.45;

      const cr = Math.round(colors.core[0] + (colors.edge[0] - colors.core[0]) * p.mix);
      const cg = Math.round(colors.core[1] + (colors.edge[1] - colors.core[1]) * p.mix);
      const cb = Math.round(colors.core[2] + (colors.edge[2] - colors.core[2]) * p.mix);

      const dotR = p.dotR * (1 + energy * 0.4) * 3;
      const grad = ctx.createRadialGradient(x, y, 0, x, y, dotR);
      grad.addColorStop(0, `rgba(${cr}, ${cg}, ${cb}, ${glow * tw})`);
      grad.addColorStop(1, `rgba(${cr}, ${cg}, ${cb}, 0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, dotR, 0, Math.PI * 2);
      ctx.fill();
    }

    // A soft bright core to anchor the cloud.
    const coreR = radius * 0.6 * scale;
    const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR);
    coreGrad.addColorStop(0, `rgba(${colors.core[0]}, ${colors.core[1]}, ${colors.core[2]}, ${0.45 * glow})`);
    coreGrad.addColorStop(1, `rgba(${colors.core[0]}, ${colors.core[1]}, ${colors.core[2]}, 0)`);
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalCompositeOperation = "source-over";
  }

  function frame() {
    t += 1;
    draw();
    requestAnimationFrame(frame);
  }

  if (reduceMotion) {
    draw(); // single static frame, no animation loop
  } else {
    requestAnimationFrame(frame);
  }

  // Keep the colours in sync when the light/dark theme is toggled.
  const themeObserver = new MutationObserver(() => {
    colors = readColors();
    if (reduceMotion) draw();
  });
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
}
