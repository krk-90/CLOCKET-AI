import React from "react";
import { useParams } from "react-router-dom";
import { AuthContext, apiFetch } from "../main.jsx";
import { Layout, LoadingSpinner, ErrorBanner } from "../components/Layout.jsx";
import { Send, FileText, MessageSquare, Copy, CheckCircle, Trash2 } from "lucide-react";

const EXAMPLE_QUESTIONS = [
  "How is authentication implemented?",
  "What are the main API endpoints?",
  "Explain the project architecture.",
  "How does the database connection work?",
  "Where is the entry point of the application?",
  "Which file handles environment variables?",
];

function CodeBlock({ code, lang }) {
  const [copied, setCopied] = React.useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="code-block">
      <div className="code-block-header">
        <span className="code-lang">{lang || "code"}</span>
        <button type="button" className="copy-btn" onClick={copy} aria-label={copied ? "Copied to clipboard" : "Copy code to clipboard"}>
          {copied ? <CheckCircle size={13} /> : <Copy size={13} />}
        </button>
      </div>
      <pre>{code}</pre>
    </div>
  );
}

function MessageBubble({ msg }) {
  const isUser = msg.role === "user";

  // Render answer with basic code block support
  function renderText(text) {
    if (!text) return null;
    const parts = text.split(/(```[\s\S]*?```)/g);
    return parts.map((part, i) => {
      if (part.startsWith("```")) {
        const lines = part.replace(/^```|```$/g, "").split("\n");
        const lang = lines[0].trim();
        const code = lines.slice(lang ? 1 : 0).join("\n");
        return <CodeBlock key={i} code={code} lang={lang} />;
      }
      return <span key={i} style={{ whiteSpace: "pre-wrap" }}>{part}</span>;
    });
  }

  return (
    <div className={`qa-message ${isUser ? "qa-message-user" : ""}`}>
      <div className={`qa-avatar ${isUser ? "qa-avatar-user" : "qa-avatar-ai"}`}>
        {isUser ? "U" : "AI"}
      </div>
      <div className={`qa-bubble ${isUser ? "qa-bubble-user" : "qa-bubble-ai"}`}>
        {isUser
          ? <span>{msg.question || msg.text}</span>
          : renderText(msg.answer)
        }
        {msg.sources && msg.sources.length > 0 && (
          <div className="qa-sources">
            <span className="sources-label"><FileText size={11} /> Sources:</span>
            {msg.sources.slice(0, 5).map((s, i) => (
              <span key={i} className="tag tag-dark text-xs font-mono">
                {typeof s === "string" ? s : (s.file || s.file_path || "Source file")}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function CodebaseQAPage() {
  const { token } = React.useContext(AuthContext);
  const { repoId } = useParams();
  const [messages, setMessages] = React.useState([]);
  const [question, setQuestion] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const [repo, setRepo] = React.useState(null);
  const bottomRef = React.useRef(null);
  const textareaRef = React.useRef(null);

  // Auto-resize textarea
  React.useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }, [question]);

  React.useEffect(() => {
    apiFetch(`/repositories/${repoId}`, {}, token)
      .then(setRepo)
      .catch(() => {});
  }, [repoId, token]);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  async function sendQuestion(q) {
    const text = (q || question).trim();
    if (!text || busy) return;
    setQuestion("");
    setError("");
    setMessages((m) => [...m, { role: "user", question: text }]);
    setBusy(true);
    try {
      const data = await apiFetch(
        `/analysis/${repoId}/qa`,
        { method: "POST", body: JSON.stringify({ question: text }) },
        token
      );
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          answer: data.answer || data.reply || "No answer returned.",
          sources: data.sources || [],
          chunk_count: data.chunk_count,
        },
      ]);
    } catch (err) {
      setError(err.message);
      setMessages((m) => [...m, {
        role: "assistant",
        answer: `Error: ${err.message}`,
        sources: [],
      }]);
    } finally {
      setBusy(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendQuestion();
    }
  }

  return (
    <Layout
      title="Codebase Q&A"
      subtitle={repo ? `${repo.owner}/${repo.name}` : "Ask anything about the codebase"}
      breadcrumb={[
        { to: "/dashboard", label: "Dashboard" },
        { to: `/repository/${repoId}`, label: repo ? `${repo.owner}/${repo.name}` : "Repository" },
        { label: "Codebase Q&A" },
      ]}
      actions={
        messages.length > 0 && (
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setMessages([])}
            title="Clear conversation"
          >
            <Trash2 size={13} /> Clear chat
          </button>
        )
      }
    >
      <div className="qa-wrap">
        <div className="qa-messages">
          {messages.length === 0 && (
            <div className="qa-welcome">
              <div className="qa-welcome-icon">
                <MessageSquare size={28} />
              </div>
              <h3>Ask anything about the codebase</h3>
              <p className="qa-welcome-sub">
                Every answer is grounded in the actual repository files using RAG.
                Source file citations are always shown.
              </p>
              <div className="example-questions">
                {EXAMPLE_QUESTIONS.map((q) => (
                  <button key={q} className="example-q" onClick={() => sendQuestion(q)}>
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <MessageBubble key={i} msg={msg} />
          ))}

          {busy && (
            <div className="qa-message">
              <div className="qa-avatar qa-avatar-ai">AI</div>
              <div className="qa-bubble qa-bubble-ai qa-thinking-bubble">
                <div className="thinking-dots">
                  <span /><span /><span />
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        <ErrorBanner message={error} onDismiss={() => setError("")} />

        <form className="qa-composer" onSubmit={(e) => { e.preventDefault(); sendQuestion(); }}>
          <textarea
            ref={textareaRef}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about the codebase… (Enter to send, Shift+Enter for newline)"
            rows={1}
          />
          <button
            type="submit"
            disabled={busy || !question.trim()}
            className="btn btn-primary"
            style={{ alignSelf: "flex-end" }}
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </Layout>
  );
}
