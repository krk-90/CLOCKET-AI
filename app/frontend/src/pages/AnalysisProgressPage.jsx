import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AuthContext, apiFetch } from "../main.jsx";
import { Layout } from "../components/Layout.jsx";
import {
  CheckCircle, Circle, Loader, GitBranch, Layers,
  Terminal, ListTodo, MessageSquare, TrendingUp, AlertCircle
} from "lucide-react";

const STAGES = [
  { key: "clone", label: "Cloning repository", desc: "Downloading source code" },
  { key: "scan", label: "Static analysis", desc: "Detecting languages, frameworks, and APIs" },
  { key: "architecture", label: "Architecture analysis", desc: "Generating component breakdown" },
  { key: "setup", label: "Setup guide", desc: "Creating step-by-step instructions" },
  { key: "plan", label: "Onboarding plan", desc: "Generating personalized plan" },
  { key: "tasks", label: "Starter tasks", desc: "Creating beginner-friendly tasks" },
  { key: "rag", label: "Indexing for Q&A", desc: "Embedding code for semantic search" },
  { key: "persist", label: "Saving results", desc: "Storing everything to your account" },
];

export default function AnalysisProgressPage() {
  const { token } = React.useContext(AuthContext);
  const { repoId } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = React.useState("analyzing");
  const [repo, setRepo] = React.useState(null);
  const [activeStage, setActiveStage] = React.useState(0);
  const [errorMsg, setErrorMsg] = React.useState("");
  const startRef = React.useRef(Date.now());

  // Poll analysis status every 3s
  React.useEffect(() => {
    let cancelled = false;
    let timer;
    const controller = new AbortController();

    async function poll() {
      try {
        const data = await apiFetch(`/analysis/${repoId}/status`, { signal: controller.signal }, token);
        if (cancelled) return;
        setStatus(data.status);

        if (data.status === "failed") {
          setErrorMsg(data.error_message || "Analysis failed");
          return;
        }

        if (data.status === "ready") {
          navigate(`/repository/${repoId}`);
          return;
        }

        // Advance the animated stage every ~20s to give visual feedback
        const elapsed = Math.floor((Date.now() - startRef.current) / 1000);
        const stageIndex = Math.min(Math.floor(elapsed / 18), STAGES.length - 1);
        setActiveStage(stageIndex);

        timer = setTimeout(poll, 3000);
      } catch {
        if (!cancelled) timer = setTimeout(poll, 5000);
      }
    }

    // Also fetch repo name
    apiFetch(`/repositories/${repoId}`, { signal: controller.signal }, token)
      .then(setRepo)
      .catch(() => {});

    poll();
    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timer);
    };
  }, [repoId, token, navigate]);

  return (
    <Layout
      title="Analyzing Repository"
      subtitle="Please wait while the AI processes your repository"
      breadcrumb={[{ to: "/dashboard", label: "Dashboard" }, { label: "Analyzing..." }]}
    >
      <div className="analysis-progress-wrap">
        <div className="analysis-icon-wrap">
          {status === "failed"
            ? <AlertCircle size={32} style={{ color: "var(--red)" }} />
            : <Loader size={32} className="spin" />
          }
        </div>

        {repo && (
          <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>
            {repo.owner}/{repo.name}
          </p>
        )}

        {status === "failed" ? (
          <>
            <p className="analysis-subtitle" style={{ color: "var(--red)" }}>
              {errorMsg || "Analysis failed. Please try again."}
            </p>
            <button
              className="btn btn-primary"
              onClick={async () => {
                setErrorMsg("");
                setStatus("analyzing");
                setActiveStage(0);
                startRef.current = Date.now();
                try {
                  await apiFetch(`/analysis/${repoId}/trigger`, { method: "POST" }, token);
                } catch (err) {
                  setStatus("failed");
                  setErrorMsg(err.message);
                }
              }}
            >
              Retry Analysis
            </button>
          </>
        ) : (
          <>
            <p className="analysis-subtitle">
              This typically takes 2–5 minutes. You can leave this page and come back.
            </p>

            <div className="analysis-stages">
              {STAGES.map((stage, i) => {
                const isDone = i < activeStage;
                const isActive = i === activeStage;
                const isPending = i > activeStage;
                return (
                  <div
                    key={stage.key}
                    className={`analysis-stage ${isDone ? "stage-done" : isActive ? "stage-active" : "stage-pending"}`}
                  >
                    <div className={`stage-icon ${isDone ? "stage-icon-done" : isActive ? "stage-icon-active" : "stage-icon-pending"}`}>
                      {isDone
                        ? <CheckCircle size={12} />
                        : isActive
                          ? <Loader size={12} className="spin" />
                          : <Circle size={12} />
                      }
                    </div>
                    <div className="stage-name">{stage.label}</div>
                    {isActive && <span className="text-xs text-muted">{stage.desc}</span>}
                  </div>
                );
              })}
            </div>

            <p className="text-muted text-sm" style={{ marginTop: 24 }}>
              Page auto-refreshes. No need to stay on this page.
            </p>
          </>
        )}
      </div>
    </Layout>
  );
}
