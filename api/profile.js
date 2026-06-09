// Curated, public-safe portfolio context for MK Bot.
// Source: Mohammed's LinkedIn data export, manually filtered to exclude all PII
// (email beyond the public one, phone, address, birth date, connections, messages).
// Anything added here is sent to the LLM in plaintext and may be surfaced to
// visitors, so keep it to information that is safe to be fully public.
export const profileContext = `
Name: Mohammed Khatiri
Headline: Computer Science Student at UM6P-CC | AI & Big Data Minor | Aspiring AI & Cloud Engineer
Location: Morocco
Portfolio: https://mokhatiri.github.io
GitHub: https://github.com/mokhatiri
LinkedIn: https://www.linkedin.com/in/khatirimohammed
Email: mohamed.khatiri2006@gmail.com
CV: Available as assets/CV_MOHAMMED_KHATIRI_english.pdf on the portfolio.

Summary:
Computer Science student with a strong interest in backend systems, algorithms, distributed architectures, and machine learning. Enjoys working close to fundamentals: performance, correctness, and system design. Comfortable reasoning about complex problems and building reliable, efficient software. Prefers depth over surface-level implementations.

Positioning:
Mohammed pairs a strong theoretical foundation with a practical, solution-driven approach. He works across AI/ML, big data, distributed systems, DevOps, and full-stack development.

Education:
- UM6P - Mohammed VI Polytechnic University (2023-2028). Focus areas: machine learning, data science, cyber security, cloud computing, software engineering principles, algorithms/complexity/optimization, object-oriented and systems programming, web and backend development. Activities: UM6P ACM Chapter, HTB UM6P network.
- Maghreb Arabi Technical High School, Bachelor's degree (2022-2023).

Experience:
- Artificial Intelligence Engineer at MAROCLEAR, Casablanca-Settat, Morocco (since Jun 2026).
- Undergraduate Student at UM6P (since 2023): software engineering, algorithms, web development, and optimization through academic projects and theoretical courses.
- Intern at Atlas Cloud Services, Benguerir, Morocco (Feb 2026 - May 2026): part of the College of Computing's LEAP Program. Built a Compliance-as-Code pipeline that translates regulatory requirements (CIS Ubuntu 22.04, NIST, ISO 27001) into technical controls, with automated evidence collection and compliance monitoring.

Skills:
Programming languages: Python, Java, JavaScript, TypeScript, Go, C++, SQL.
AI and data: Machine Learning, Artificial Intelligence, Big Data, NumPy, data structures, algorithm optimization.
Web and full-stack: Vue.js, Nuxt.js, REST APIs, front-end development, full-stack development, Firebase, Jakarta EE, JavaFX, Maven.
DevOps and cloud: Docker, Kubernetes, Terraform, Ansible, Puppet, Vagrant, CI/CD, GitHub Actions, SonarQube, Prometheus, Grafana, Shell scripting, SSH, OpenSCAP, security auditing.
Foundations: Algorithms, data structures, object-oriented programming, software engineering practices, resource and algorithm optimization.

Projects:
- GlassBox AutoML (Mar 2026 - Apr 2026): a transparent machine learning library built from scratch with NumPy, providing an end-to-end AutoML pipeline that stays readable, explainable, and easy to debug.
- CasC Pipeline (Feb 2026 - May 2026): a complete Compliance-as-Code solution that automates hardening and compliance verification of Linux servers (requested by Atlas Cloud Services).
- Key-Value Store with Raft consensus (Dec 2025 - Mar 2026): a distributed key-value store using the Raft consensus algorithm for strong consistency and fault tolerance across a cluster (Go, Docker, SonarQube, GitHub Actions, SQLite).
- CI/CD pipeline for an existing backend project (Nov 2025 - Dec 2025): SonarQube code-quality analysis, Docker containerization, Kubernetes (Minikube) deployment, and Prometheus/Grafana monitoring.
- RTG & PSO for Resource Generation (Nov 2025 - Dec 2025): procedural terrain and resource generation using Simplex Noise, with Particle Swarm Optimization for optimal resource placement (Java).
- Symbolic Controller Generator (Oct 2025 - Dec 2025): a symbolic controller generator for nonlinear systems with automated specification and control synthesis (Python, NumPy).
- DevGate Web Platform (2025): a web platform for developers with chat, posts, and account management, including authentication, data storage, and real-time features (Firebase, Nuxt, Vue.js).
Note: The portfolio also loads Mohammed's public GitHub repositories live from the GitHub API, so visitors can browse and filter additional projects by language.

Languages:
Arabic (native or bilingual), English (professional working), French (professional working), Spanish (elementary).

Continuous learning (recent coursework):
Databricks Certified Data Engineer Associate (exam prep), Dataiku for machine learning, Python predictive analytics, Azure AI (machine learning), and public-speaking in English.

Contact:
Visitors can contact Mohammed by email at mohamed.khatiri2006@gmail.com, through GitHub at github.com/mokhatiri, or through LinkedIn at linkedin.com/in/khatirimohammed.

LinkedIn policy:
The assistant may point visitors to Mohammed's public LinkedIn profile. It should not claim live LinkedIn access unless LINKEDIN_PROFILE_CONTEXT or an approved LinkedIn API integration is configured on the backend.
`;
