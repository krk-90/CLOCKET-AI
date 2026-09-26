import React from "react";
import { useNavigate } from "react-router-dom";
import {
  GitBranch, Layers, Terminal, ListTodo, MessageSquare,
  TrendingUp, ArrowRight, Code2, Search, FileText,
  Zap, Shield, ChevronDown, CheckCircle, Circle,
  Database, Globe, Box, Server, Star, Users, BookOpen
} from "lucide-react";

/* ─── tiny scroll-reveal hook ──────────────────────────────────── */
function useReveal() {
  const ref = React.useRef(null);
  const [visible, setVisible] = React.useState(false);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.12 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return [ref, visible];
}

function Reveal({ children, delay = 0, className = "" }) {
  const [ref, visible] = useReveal();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(28px)",
        transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

/* ─── Navbar ────────────────────────────────────────────────────── */
function Navbar({ onGetStarted }) {
  const [scrolled, setScrolled] = React.useState(false);
  React.useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <nav className={`lp-nav ${scrolled ? "lp-nav-scrolled" : ""}`}>
      <div className="lp-nav-inner">
        <div className="lp-nav-brand">
          <Code2 size={20} style={{ color: "#58a6ff" }} />
          <span>CLOCKET AI</span>
        </div>
        <div className="lp-nav-links">
          <a href="#features" className="lp-nav-link">Features</a>
          <a href="#how-it-works" className="lp-nav-link">How It Works</a>
          <a href="#preview" className="lp-nav-link">Product</a>
        </div>
        <div className="lp-nav-actions">
          <a href="/login" className="lp-btn-ghost">Sign In</a>
          <button className="lp-btn-primary" onClick={onGetStarted}>Get Started</button>
        </div>
      </div>
    </nav>
  );
}

/* ─── Hero ──────────────────────────────────────────────────────── */
function Hero({ onGetStarted }) {
  return (
    <section className="lp-hero">
      {/* background grid */}
      <div className="lp-hero-grid" aria-hidden="true" />
      <div className="lp-hero-glow lp-hero-glow-1" aria-hidden="true" />
      <div className="lp-hero-glow lp-hero-glow-2" aria-hidden="true" />

      <div className="lp-container lp-hero-inner">
        <div className="lp-hero-text">
          <div className="lp-badge">
            <Zap size={11} />
            AI-Powered Developer Onboarding
          </div>

          <h1 className="lp-hero-title">
            Understand any codebase.<br />
            <span className="lp-hero-accent">Start contributing</span> faster.
          </h1>

          <p className="lp-hero-sub">
            CLOCKET AI analyzes repositories and turns complex codebases into clear
            architecture insights, setup guidance, starter tasks, and AI-powered
            codebase conversations.
          </p>

          <div className="lp-hero-actions">
            <button className="lp-btn-primary lp-btn-lg" onClick={onGetStarted}>
              Analyze a Repository <ArrowRight size={16} />
            </button>
            <a href="#how-it-works" className="lp-btn-ghost lp-btn-lg">
              Explore How It Works <ChevronDown size={16} />
            </a>
          </div>

          <div className="lp-hero-trust">
            <Shield size={13} style={{ color: "#6e7681" }} />
            <span>Secured with Supabase auth · All data user-isolated · No write access to your repos</span>
          </div>
        </div>

        {/* Mockup */}
        <div className="lp-hero-mockup">
          <div className="lp-mock-window">
            <div className="lp-mock-bar">
              <span className="lp-mock-dot" style={{ background: "#ff5f57" }} />
              <span className="lp-mock-dot" style={{ background: "#febc2e" }} />
              <span className="lp-mock-dot" style={{ background: "#28c840" }} />
              <span style={{ fontSize: 11, color: "#6e7681", marginLeft: 8 }}>CLOCKET AI — Repository Analysis</span>
            </div>
            <div className="lp-mock-body">
              <div className="lp-mock-flow">
                {[
                  { icon: <GitBranch size={14} />, label: "Repository", sub: "github.com/owner/repo", color: "#58a6ff" },
                  { icon: <Search size={14} />, label: "Analysis", sub: "Scanning 2,847 files…", color: "#a78bfa", active: true },
                  { icon: <Layers size={14} />, label: "Architecture", sub: "Components mapped", color: "#34d399" },
                  { icon: <Terminal size={14} />, label: "Setup Guide", sub: "8 steps generated", color: "#fbbf24" },
                  { icon: <ListTodo size={14} />, label: "Starter Tasks", sub: "12 tasks created", color: "#f87171" },
                  { icon: <MessageSquare size={14} />, label: "AI Q&A", sub: "Ask anything", color: "#60a5fa" },
                ].map((item, i) => (
                  <React.Fragment key={i}>
                    <div className={`lp-mock-step ${item.active ? "lp-mock-step-active" : ""}`}>
                      <div className="lp-mock-step-icon" style={{ color: item.color, borderColor: item.color + "33", background: item.color + "15" }}>
                        {item.icon}
                      </div>
                      <div>
                        <div className="lp-mock-step-label">{item.label}</div>
                        <div className="lp-mock-step-sub">{item.sub}</div>
                      </div>
                      {item.active && <div className="lp-mock-pulse" />}
                    </div>
                    {i < 5 && <div className="lp-mock-arrow">↓</div>}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Problem ───────────────────────────────────────────────────── */
function Problem() {
  const problems = [
    { icon: "?", q: "Where do I even start?", desc: "Hundreds of files, no clear entry point." },
    { icon: "🏗", q: "How is this structured?", desc: "No architecture diagram. Just guess." },
    { icon: "📦", q: "What technologies are used?", desc: "Surprise dependencies buried in configs." },
    { icon: "⚙️", q: "How do I run it locally?", desc: "Outdated README. Broken steps." },
    { icon: "📁", q: "Which files matter first?", desc: "Thousands of files, unknown relevance." },
    { icon: "✅", q: "What should I work on?", desc: "No beginner-friendly task list anywhere." },
  ];

  return (
    <section className="lp-section lp-problem" id="problem">
      <div className="lp-container">
        <Reveal>
          <div className="lp-section-label">The Problem</div>
          <h2 className="lp-section-title">New codebase. <span className="lp-hero-accent">Zero context.</span></h2>
          <p className="lp-section-sub">
            Every developer knows the feeling. A new repository feels like arriving in a city
            with no map, no guide, and no one to ask.
          </p>
        </Reveal>

        <div className="lp-problem-grid">
          {problems.map((p, i) => (
            <Reveal key={i} delay={i * 60}>
              <div className="lp-problem-card">
                <div className="lp-problem-icon">{p.icon}</div>
                <div className="lp-problem-q">{p.q}</div>
                <div className="lp-problem-desc">{p.desc}</div>
              </div>
            </Reveal>
          ))}
        </div>

        {/* fake terminal */}
        <Reveal delay={200}>
          <div className="lp-terminal">
            <div className="lp-terminal-bar">
              <span className="lp-mock-dot" style={{ background: "#ff5f57" }} />
              <span className="lp-mock-dot" style={{ background: "#febc2e" }} />
              <span className="lp-mock-dot" style={{ background: "#28c840" }} />
              <span style={{ fontSize: 11, color: "#6e7681", marginLeft: 8 }}>bash — new-developer</span>
            </div>
            <div className="lp-terminal-body">
              <div className="lp-term-line"><span className="lp-term-prompt">$</span> git clone https://github.com/org/project</div>
              <div className="lp-term-line lp-term-out">Cloning into 'project'... done.</div>
              <div className="lp-term-line"><span className="lp-term-prompt">$</span> ls</div>
              <div className="lp-term-line lp-term-out lp-term-dim">src/ tests/ docs/ config/ scripts/ lib/ utils/ api/ db/ ...and 47 more</div>
              <div className="lp-term-line"><span className="lp-term-prompt">$</span> cat README.md</div>
              <div className="lp-term-line lp-term-out lp-term-amber"># Project — Last updated 3 years ago</div>
              <div className="lp-term-line lp-term-out lp-term-dim">TODO: add setup instructions</div>
              <div className="lp-term-line"><span className="lp-term-prompt">$</span> <span className="lp-term-cursor">_</span></div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ─── Solution ──────────────────────────────────────────────────── */
function Solution() {
  const steps = [
    { icon: <GitBranch size={18} />, label: "GitHub Repository", color: "#58a6ff" },
    { icon: <Zap size={18} />, label: "Analyze", color: "#a78bfa" },
    { icon: <Layers size={18} />, label: "Understand", color: "#34d399" },
    { icon: <Terminal size={18} />, label: "Setup", color: "#fbbf24" },
    { icon: <BookOpen size={18} />, label: "Learn", color: "#f87171" },
    { icon: <CheckCircle size={18} />, label: "Contribute", color: "#60a5fa" },
  ];

  return (
    <section className="lp-section lp-solution">
      <div className="lp-container">
        <Reveal>
          <div className="lp-section-label">The Solution</div>
          <h2 className="lp-section-title">From repository <span className="lp-hero-accent">to understanding.</span></h2>
          <p className="lp-section-sub">
            CLOCKET AI turns any public GitHub repository into a complete onboarding experience.
            In minutes, not days.
          </p>
        </Reveal>

        <div className="lp-flow-row">
          {steps.map((s, i) => (
            <React.Fragment key={i}>
              <Reveal delay={i * 80}>
                <div className="lp-flow-card">
                  <div className="lp-flow-icon" style={{ color: s.color, borderColor: s.color + "44", background: s.color + "18" }}>
                    {s.icon}
                  </div>
                  <div className="lp-flow-label">{s.label}</div>
                </div>
              </Reveal>
              {i < steps.length - 1 && (
                <div className="lp-flow-connector" aria-hidden="true">
                  <ArrowRight size={16} style={{ color: "#30363d" }} />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── How It Works ──────────────────────────────────────────────── */
function HowItWorks({ onGetStarted }) {
  const steps = [
    {
      num: "01", icon: <GitBranch size={22} />, color: "#58a6ff",
      title: "Connect your repository",
      desc: "Paste any public GitHub URL. CLOCKET AI validates and registers it for analysis.",
      detail: "https://github.com/owner/repo",
    },
    {
      num: "02", icon: <Search size={22} />, color: "#a78bfa",
      title: "CLOCKET AI analyzes the codebase",
      desc: "A 10-node LangGraph pipeline scans languages, frameworks, APIs, and architecture.",
      detail: "Scanning 2,847 files · Detecting 6 languages · Mapping 34 endpoints",
    },
    {
      num: "03", icon: <Layers size={22} />, color: "#34d399",
      title: "Explore architecture and technology",
      desc: "See a visual breakdown of frontend, backend, database, and infrastructure layers.",
      detail: "Frontend: React · Backend: FastAPI · DB: PostgreSQL · Auth: Supabase",
    },
    {
      num: "04", icon: <Terminal size={22} />, color: "#fbbf24",
      title: "Follow the setup guide",
      desc: "Get step-by-step instructions derived from the actual config files in the repository.",
      detail: "$ pip install -r requirements.txt  →  $ npm install  →  $ uvicorn ...",
    },
    {
      num: "05", icon: <ListTodo size={22} />, color: "#f87171",
      title: "Complete beginner-friendly starter tasks",
      desc: "AI-generated tasks grounded in real files and difficulty-filtered for new contributors.",
      detail: "Beginner: 4 tasks · Intermediate: 5 tasks · Advanced: 3 tasks",
    },
    {
      num: "06", icon: <MessageSquare size={22} />, color: "#60a5fa",
      title: "Ask questions about the codebase",
      desc: "Chat with an AI that has read every indexed file. Answers come with source citations.",
      detail: '"How is auth implemented?" → src/auth/jwt.py, config/settings.py',
    },
  ];

  return (
    <section className="lp-section lp-hiw" id="how-it-works">
      <div className="lp-container">
        <Reveal>
          <div className="lp-section-label">Step by Step</div>
          <h2 className="lp-section-title">How <span className="lp-hero-accent">CLOCKET AI</span> works</h2>
          <p className="lp-section-sub">Six steps from confusion to confident contribution.</p>
        </Reveal>

        <div className="lp-hiw-grid">
          {steps.map((s, i) => (
            <Reveal key={i} delay={i * 70}>
              <div className="lp-hiw-card">
                <div className="lp-hiw-num">{s.num}</div>
                <div className="lp-hiw-icon" style={{ color: s.color, background: s.color + "18", borderColor: s.color + "44" }}>
                  {s.icon}
                </div>
                <h3 className="lp-hiw-title">{s.title}</h3>
                <p className="lp-hiw-desc">{s.desc}</p>
                <div className="lp-hiw-detail">{s.detail}</div>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={100}>
          <div style={{ textAlign: "center", marginTop: 48 }}>
            <button className="lp-btn-primary lp-btn-lg" onClick={onGetStarted}>
              Start Analyzing <ArrowRight size={16} />
            </button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ─── Features ──────────────────────────────────────────────────── */
function Features() {
  const features = [
    {
      icon: <GitBranch size={24} />, color: "#58a6ff",
      title: "Repository Analysis",
      desc: "Deep static analysis of any public GitHub repository — languages, frameworks, APIs, and infrastructure detected in minutes.",
      tags: ["Python", "JavaScript", "Go", "Rust", "Java"],
    },
    {
      icon: <Layers size={24} />, color: "#a78bfa",
      title: "Architecture Insights",
      desc: "See how components, services, and data flow connect. Visual layer breakdown from frontend through database to infrastructure.",
      tags: ["Frontend", "Backend", "Database", "Auth"],
    },
    {
      icon: <Terminal size={24} />, color: "#fbbf24",
      title: "Setup Guide",
      desc: "Setup instructions extracted from actual configuration files — not guesswork. Prerequisites, commands, and environment variables all included.",
      tags: ["Env Vars", "Commands", "Prerequisites"],
    },
    {
      icon: <ListTodo size={24} />, color: "#f87171",
      title: "Starter Tasks",
      desc: "AI-generated beginner, intermediate, and advanced tasks grounded in real files. Each task includes relevant files, skills needed, and acceptance criteria.",
      tags: ["Beginner", "Intermediate", "Advanced"],
    },
    {
      icon: <MessageSquare size={24} />, color: "#34d399",
      title: "Codebase Q&A",
      desc: "Ask any question about the repository and get an AI answer backed by RAG — every answer includes source file citations from the actual codebase.",
      tags: ["RAG", "Citations", "Code blocks"],
    },
    {
      icon: <TrendingUp size={24} />, color: "#60a5fa",
      title: "Onboarding Progress",
      desc: "Track exactly what you have understood and what remains. Mark tasks as done, in-progress, or skipped. Your progress is saved per repository.",
      tags: ["Per-user", "Per-repo", "Persistent"],
    },
  ];

  return (
    <section className="lp-section lp-features" id="features">
      <div className="lp-container">
        <Reveal>
          <div className="lp-section-label">Capabilities</div>
          <h2 className="lp-section-title">Everything you need to <span className="lp-hero-accent">understand a codebase</span></h2>
          <p className="lp-section-sub">
            Six interconnected features that guide you from zero context to confident contribution.
          </p>
        </Reveal>

        <div className="lp-features-grid">
          {features.map((f, i) => (
            <Reveal key={i} delay={i * 60}>
              <div className="lp-feature-card">
                <div className="lp-feature-icon" style={{ color: f.color, background: f.color + "18", borderColor: f.color + "33" }}>
                  {f.icon}
                </div>
                <h3 className="lp-feature-title">{f.title}</h3>
                <p className="lp-feature-desc">{f.desc}</p>
                <div className="lp-feature-tags">
                  {f.tags.map((t) => (
                    <span key={t} className="lp-feature-tag">{t}</span>
                  ))}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Dashboard Preview ─────────────────────────────────────────── */
function Preview() {
  return (
    <section className="lp-section lp-preview" id="preview">
      <div className="lp-container">
        <Reveal>
          <div className="lp-section-label">Product Preview</div>
          <h2 className="lp-section-title">See it in <span className="lp-hero-accent">action</span></h2>
          <p className="lp-section-sub">
            A realistic look at the CLOCKET AI dashboard after a repository is analyzed.
          </p>
        </Reveal>

        <Reveal delay={100}>
          <div className="lp-preview-window">
            <div className="lp-mock-bar" style={{ padding: "10px 16px", borderBottom: "1px solid #21262d" }}>
              <span className="lp-mock-dot" style={{ background: "#ff5f57" }} />
              <span className="lp-mock-dot" style={{ background: "#febc2e" }} />
              <span className="lp-mock-dot" style={{ background: "#28c840" }} />
              <span style={{ fontSize: 11, color: "#6e7681", marginLeft: 10 }}>CLOCKET AI — Dashboard</span>
            </div>
            <div className="lp-preview-body">
              {/* Sidebar mock */}
              <div className="lp-preview-sidebar">
                <div className="lp-preview-sidebar-brand">
                  <Code2 size={14} style={{ color: "#58a6ff" }} />
                  <span>CLOCKET AI</span>
                </div>
                {["Overview", "Architecture", "Setup Guide", "Starter Tasks", "Codebase Q&A", "My Progress"].map((item, i) => (
                  <div key={item} className={`lp-preview-nav-item ${i === 0 ? "active" : ""}`}>{item}</div>
                ))}
              </div>
              {/* Main content mock */}
              <div className="lp-preview-main">
                <div className="lp-preview-header">
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#f0f6fc" }}>tiangolo/fastapi</div>
                    <div style={{ fontSize: 11, color: "#6e7681" }}>github.com/tiangolo/fastapi</div>
                  </div>
                  <span className="lp-preview-badge-green">● Ready</span>
                </div>
                <div className="lp-preview-cards">
                  <div className="lp-preview-card">
                    <div className="lp-preview-card-label">Languages</div>
                    <div className="lp-preview-tags">
                      {["Python", "Shell", "Markdown"].map(t => <span key={t} className="lp-preview-tag">{t}</span>)}
                    </div>
                  </div>
                  <div className="lp-preview-card">
                    <div className="lp-preview-card-label">Frameworks</div>
                    <div className="lp-preview-tags">
                      {["FastAPI", "Starlette", "Pydantic"].map(t => <span key={t} className="lp-preview-tag lp-preview-tag-blue">{t}</span>)}
                    </div>
                  </div>
                  <div className="lp-preview-card">
                    <div className="lp-preview-card-label">Tasks</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: "#f0f6fc" }}>12</div>
                    <div style={{ fontSize: 11, color: "#6e7681" }}>4 beginner · 5 intermediate</div>
                  </div>
                  <div className="lp-preview-card">
                    <div className="lp-preview-card-label">Progress</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: "#34d399" }}>33%</div>
                    <div className="lp-preview-progress-bar">
                      <div className="lp-preview-progress-fill" style={{ width: "33%" }} />
                    </div>
                  </div>
                </div>
                <div className="lp-preview-arch">
                  <div className="lp-preview-card-label" style={{ marginBottom: 8 }}>Architecture Overview</div>
                  {[
                    { label: "Frontend", items: ["React", "TypeScript"], color: "#58a6ff" },
                    { label: "Backend", items: ["FastAPI", "Uvicorn", "Pydantic"], color: "#a78bfa" },
                    { label: "Database", items: ["PostgreSQL", "pgvector"], color: "#34d399" },
                  ].map((row) => (
                    <div key={row.label} className="lp-preview-arch-row">
                      <div style={{ fontSize: 10, fontWeight: 700, color: row.color, textTransform: "uppercase", minWidth: 64 }}>{row.label}</div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {row.items.map(it => (
                          <span key={it} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, border: `1px solid ${row.color}44`, color: row.color, background: row.color + "18" }}>{it}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ─── Q&A Section ───────────────────────────────────────────────── */
function QASection() {
  const messages = [
    { role: "user", text: "Where is authentication handled?" },
    { role: "ai", text: "Authentication is implemented using Supabase JWT tokens. The `get_authenticated_user_id()` function in `app/core/security.py` validates bearer tokens on every protected route by calling `supabase.auth.get_user(token)`.", sources: ["app/core/security.py", "app/routes/auth.py"] },
    { role: "user", text: "How does the API request flow work?" },
    { role: "ai", text: "Requests arrive at FastAPI → middleware adds request ID and timing headers → route handler validates the Bearer token → business logic runs → Supabase stores results. The main entry point is `app/main.py` which mounts all routers.", sources: ["app/main.py", "app/routes/"] },
    { role: "user", text: "Which files should I understand first?" },
    { role: "ai", text: "Start with: (1) `app/main.py` — application entry point and router registration, (2) `app/core/security.py` — authentication logic, (3) `app/routes/analysis.py` — the main feature endpoints.", sources: ["app/main.py", "app/core/security.py", "app/routes/analysis.py"] },
  ];

  return (
    <section className="lp-section lp-qa" id="qa">
      <div className="lp-container">
        <Reveal>
          <div className="lp-section-label">Codebase Q&amp;A</div>
          <h2 className="lp-section-title">Ask anything. <span className="lp-hero-accent">Get real answers.</span></h2>
          <p className="lp-section-sub">
            Every answer is grounded in the actual indexed repository files.
            Source citations are always shown.
          </p>
        </Reveal>

        <Reveal delay={100}>
          <div className="lp-qa-window">
            <div className="lp-mock-bar" style={{ padding: "10px 16px", borderBottom: "1px solid #21262d" }}>
              <span className="lp-mock-dot" style={{ background: "#ff5f57" }} />
              <span className="lp-mock-dot" style={{ background: "#febc2e" }} />
              <span className="lp-mock-dot" style={{ background: "#28c840" }} />
              <span style={{ fontSize: 11, color: "#6e7681", marginLeft: 10 }}>CLOCKET AI — Codebase Q&amp;A · tiangolo/fastapi</span>
            </div>
            <div className="lp-qa-body">
              {messages.map((m, i) => (
                <div key={i} className={`lp-qa-msg ${m.role === "user" ? "lp-qa-msg-user" : "lp-qa-msg-ai"}`}>
                  <div className={`lp-qa-avatar ${m.role === "user" ? "lp-qa-av-user" : "lp-qa-av-ai"}`}>
                    {m.role === "user" ? "U" : "AI"}
                  </div>
                  <div className={`lp-qa-bubble ${m.role === "user" ? "lp-qa-bubble-user" : "lp-qa-bubble-ai"}`}>
                    <div style={{ fontSize: 13, lineHeight: 1.7 }}>{m.text}</div>
                    {m.sources && (
                      <div className="lp-qa-sources">
                        <FileText size={11} style={{ color: "#6e7681" }} />
                        {m.sources.map((s) => (
                          <span key={s} className="lp-qa-source">{s}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div className="lp-qa-composer">
                <div className="lp-qa-input">Ask a question about the codebase…</div>
                <div className="lp-qa-send">↵</div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ─── Before / After ────────────────────────────────────────────── */
function Journey() {
  const before = [
    "Confused by the file structure",
    "Searching random files for context",
    "Reading outdated documentation",
    "Guessing the architecture",
    "Unsure what to work on first",
  ];
  const after = [
    "Architecture clearly understood",
    "Setup guide followed step-by-step",
    "Important files identified",
    "Beginner tasks waiting",
    "AI answers any codebase question",
    "Start contributing confidently",
  ];

  return (
    <section className="lp-section lp-journey">
      <div className="lp-container">
        <Reveal>
          <div className="lp-section-label">Developer Journey</div>
          <h2 className="lp-section-title">The transformation <span className="lp-hero-accent">CLOCKET AI</span> delivers</h2>
        </Reveal>

        <div className="lp-journey-cols">
          <Reveal delay={0}>
            <div className="lp-journey-col lp-journey-before">
              <div className="lp-journey-col-header">
                <div className="lp-journey-dot lp-journey-dot-red" />
                Without CLOCKET AI
              </div>
              <div className="lp-journey-items">
                {before.map((item, i) => (
                  <div key={i} className="lp-journey-item lp-journey-item-before">
                    <Circle size={14} style={{ color: "#6e7681", flexShrink: 0 }} />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>

          <Reveal delay={60}>
            <div className="lp-journey-arrow">
              <div className="lp-journey-arrow-inner">
                <Code2 size={28} style={{ color: "#58a6ff" }} />
                <div style={{ fontSize: 11, color: "#8b949e", marginTop: 6, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>CLOCKET AI</div>
              </div>
            </div>
          </Reveal>

          <Reveal delay={120}>
            <div className="lp-journey-col lp-journey-after">
              <div className="lp-journey-col-header">
                <div className="lp-journey-dot lp-journey-dot-green" />
                With CLOCKET AI
              </div>
              <div className="lp-journey-items">
                {after.map((item, i) => (
                  <div key={i} className="lp-journey-item lp-journey-item-after">
                    <CheckCircle size={14} style={{ color: "#34d399", flexShrink: 0 }} />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ─── Who It's For ──────────────────────────────────────────────── */
function WhoFor({ onGetStarted }) {
  const cards = [
    { icon: <Users size={22} />, color: "#58a6ff", title: "New Developers", desc: "Join an existing codebase without weeks of confusion. Get architecture, setup, and tasks on day one." },
    { icon: <BookOpen size={22} />, color: "#a78bfa", title: "Students", desc: "Learn from real production repositories. Understand how professional code is structured and maintained." },
    { icon: <Server size={22} />, color: "#34d399", title: "Engineering Teams", desc: "Reduce onboarding time for new hires. Let CLOCKET AI generate the onboarding guide automatically." },
    { icon: <Star size={22} />, color: "#fbbf24", title: "Open Source Contributors", desc: "Understand an open source project before opening your first pull request." },
    { icon: <GitBranch size={22} />, color: "#f87171", title: "Developers Joining Projects", desc: "Switching teams or picking up an abandoned project? Get up to speed instantly." },
  ];

  return (
    <section className="lp-section lp-whofor">
      <div className="lp-container">
        <Reveal>
          <div className="lp-section-label">Who It's For</div>
          <h2 className="lp-section-title">Built for every developer <span className="lp-hero-accent">starting fresh</span></h2>
        </Reveal>

        <div className="lp-whofor-grid">
          {cards.map((c, i) => (
            <Reveal key={i} delay={i * 60}>
              <div className="lp-whofor-card">
                <div className="lp-whofor-icon" style={{ color: c.color, background: c.color + "18", borderColor: c.color + "33" }}>
                  {c.icon}
                </div>
                <h3 className="lp-whofor-title">{c.title}</h3>
                <p className="lp-whofor-desc">{c.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Final CTA ─────────────────────────────────────────────────── */
function FinalCTA({ onGetStarted }) {
  return (
    <section className="lp-section lp-cta">
      <div className="lp-cta-glow" aria-hidden="true" />
      <div className="lp-container lp-cta-inner">
        <Reveal>
          <div className="lp-badge" style={{ marginBottom: 20 }}>
            <Zap size={11} /> Ready to start
          </div>
          <h2 className="lp-cta-title">
            Your next codebase<br />
            shouldn't feel <span className="lp-hero-accent">unfamiliar.</span>
          </h2>
          <p className="lp-cta-sub">
            Connect a repository and start understanding it with CLOCKET AI.
          </p>
          <div className="lp-hero-actions" style={{ justifyContent: "center" }}>
            <button className="lp-btn-primary lp-btn-lg" onClick={onGetStarted}>
              Analyze a Repository <ArrowRight size={16} />
            </button>
            <a href="#features" className="lp-btn-ghost lp-btn-lg">
              Explore CLOCKET AI
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ─── Footer ────────────────────────────────────────────────────── */
function Footer() {
  return (
    <footer className="lp-footer">
      <div className="lp-container lp-footer-inner">
        <div className="lp-footer-brand">
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <Code2 size={18} style={{ color: "#58a6ff" }} />
            <span style={{ fontWeight: 700, color: "#f0f6fc", fontSize: 15 }}>CLOCKET AI</span>
          </div>
          <p className="lp-footer-desc">
            AI-powered developer onboarding. Understand any codebase faster.
          </p>
        </div>
        <div className="lp-footer-links">
          <div className="lp-footer-col">
            <div className="lp-footer-col-title">Product</div>
            <a href="#features" className="lp-footer-link">Features</a>
            <a href="#how-it-works" className="lp-footer-link">How It Works</a>
            <a href="#preview" className="lp-footer-link">Product Preview</a>
          </div>
          <div className="lp-footer-col">
            <div className="lp-footer-col-title">Account</div>
            <a href="/login" className="lp-footer-link">Sign In</a>
            <a href="/login" className="lp-footer-link">Get Started</a>
          </div>
        </div>
      </div>
      <div className="lp-footer-bottom">
        <span>© {new Date().getFullYear()} CLOCKET AI</span>
        <a
          href="https://github.com/krk-90/CLOCKET-AI"
          target="_blank"
          rel="noopener noreferrer"
          className="lp-footer-link"
          style={{ display: "flex", alignItems: "center", gap: 5 }}
        >
          <GitBranch size={13} /> GitHub
        </a>
      </div>
    </footer>
  );
}

/* ─── Main export ───────────────────────────────────────────────── */
export default function LandingPage() {
  const navigate = useNavigate();
  function getStarted() { navigate("/login"); }

  return (
    <div className="lp-root">
      <Navbar onGetStarted={getStarted} />
      <Hero onGetStarted={getStarted} />
      <Problem />
      <Solution />
      <HowItWorks onGetStarted={getStarted} />
      <Features />
      <Preview />
      <QASection />
      <Journey />
      <WhoFor onGetStarted={getStarted} />
      <FinalCTA onGetStarted={getStarted} />
      <Footer />
    </div>
  );
}
