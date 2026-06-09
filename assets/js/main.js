// GitHub API Configuration
const GITHUB_USERNAME = "mokhatiri";
const GITHUB_API_URL = `https://api.github.com/users/${GITHUB_USERNAME}/repos`;
const ROBOT_API_URL = window.MK_BOT_API_URL || "/api/chat";

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
  initNavigation();
  initTypingEffect();
  fetchGitHubRepos();
  initContactForm();
  initScrollEffects();
  initRobotAssistant();
});

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

// Fetch GitHub repositories
async function fetchGitHubRepos() {
  try {
    const response = await fetch(`${GITHUB_API_URL}?sort=updated&per_page=100`);

    if (!response.ok) {
      throw new Error("Failed to fetch repositories");
    }

    const repos = await response.json();
    allRepositories = repos.filter((repo) => !repo.fork);

    // Update repo count in about section
    if (repoCountEl) {
      repoCountEl.textContent = allRepositories.length;
    }

    displayRepositories(allRepositories);
    initFilters();
  } catch (error) {
    console.error("Error fetching repos:", error);
    projectsGrid.innerHTML = `
            <div class="loading-spinner">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Failed to load repositories. Please try again later.</p>
            </div>
        `;
  }
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
}

// Create repository card
function createRepoCard(repo) {
  const languageColor = languageColors[repo.language] || "#8b8b8b";
  const description = repo.description || "No description available";
  const homepage = repo.homepage
    ? `<a href="${repo.homepage}" target="_blank" rel="noopener noreferrer" aria-label="Live Demo"><i class="fas fa-external-link-alt"></i></a>`
    : "";

  return `
        <div class="project-card" data-language="${repo.language || "Other"}">
            <div class="project-header">
                <i class="fas fa-folder-open project-icon"></i>
                <div class="project-links">
                    ${homepage}
                    <a href="${repo.html_url}" target="_blank" rel="noopener noreferrer" aria-label="View on GitHub">
                        <i class="fab fa-github"></i>
                    </a>
                </div>
            </div>
            <div class="project-content">
                <h3 class="project-title">
                    <a href="${repo.html_url}" target="_blank" rel="noopener noreferrer">${repo.name}</a>
                </h3>
                <p class="project-description">${description}</p>
                <div class="project-meta">
                    ${
                      repo.language
                        ? `
                        <span class="project-language">
                            <span class="language-dot" style="background-color: ${languageColor}"></span>
                            ${repo.language}
                        </span>
                    `
                        : '<span class="project-language">-</span>'
                    }
                    <div class="project-stats">
                        <span><i class="fas fa-star"></i> ${repo.stargazers_count}</span>
                        <span><i class="fas fa-code-branch"></i> ${repo.forks_count}</span>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Initialize filters dynamically based on repository languages
function initFilters() {
  // Count languages
  const languageCounts = {};
  allRepositories.forEach((repo) => {
    if (repo.language) {
      languageCounts[repo.language] = (languageCounts[repo.language] || 0) + 1;
    }
  });

  // Sort by count (most used first) and take top languages
  const topLanguages = Object.entries(languageCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6) // Show top 6 languages
    .map(([lang]) => lang);

  // Generate filter buttons
  projectsFilter.innerHTML = `
    <button class="filter-btn active" data-filter="all">All</button>
    ${topLanguages.map((lang) => `<button class="filter-btn" data-filter="${lang}">${lang}</button>`).join("")}
  `;

  // Add event listeners to buttons
  const filterBtns = projectsFilter.querySelectorAll(".filter-btn");
  filterBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      // Update active button
      filterBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      // Filter repositories
      const filter = btn.dataset.filter;
      let filteredRepos;

      if (filter === "all") {
        filteredRepos = allRepositories;
      } else {
        filteredRepos = allRepositories.filter(
          (repo) => repo.language === filter,
        );
      }

      displayRepositories(filteredRepos);
    });
  });
}

// Contact form handling
function initContactForm() {
  if (contactForm) {
    contactForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const formData = new FormData(contactForm);
      const name = formData.get("name");
      const email = formData.get("email");
      const subject = formData.get("subject");
      const message = formData.get("message");

      // Create mailto link
      const mailtoLink = `mailto:mohamed.khatiri2006@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`)}`;

      window.location.href = mailtoLink;

      // Show feedback
      const btn = contactForm.querySelector('button[type="submit"]');
      const originalText = btn.innerHTML;
      btn.innerHTML = '<i class="fas fa-check"></i> Opening Email Client...';
      btn.disabled = true;

      setTimeout(() => {
        btn.innerHTML = originalText;
        btn.disabled = false;
      }, 3000);
    });
  }
}

// Scroll effects and animations
function initScrollEffects() {
  // Intersection Observer for reveal animations
  const revealElements = document.querySelectorAll(
    ".skill-category, .project-card, .contact-item",
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

  function updateRobotPosition() {
    if (window.matchMedia("(max-width: 768px)").matches) {
      assistant.style.removeProperty("--robot-top");
      return;
    }

    const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = scrollableHeight > 0 ? window.scrollY / scrollableHeight : 0;
    const top = 20 + progress * 62;

    assistant.style.setProperty("--robot-top", `${top}vh`);
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

  window.addEventListener("scroll", updateRobotPosition, { passive: true });
  window.addEventListener("resize", updateRobotPosition);
  updateRobotPosition();
}
