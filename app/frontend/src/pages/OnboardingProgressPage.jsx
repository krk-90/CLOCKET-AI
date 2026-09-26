import React from "react";
import { useParams, Link } from "react-router-dom";
import { AuthContext, apiFetch } from "../main.jsx";
import { Layout, StatusBadge, LoadingSpinner, ErrorBanner, EmptyState } from "../components/Layout.jsx";
import { TrendingUp, CheckCircle, Circle, Clock, SkipForward } from "lucide-react";

function StatusIcon({ status }) {
  if (status === "done") return <CheckCircle size={16} style={{ color: "var(--green)", flexShrink: 0 }} />;
  if (status === "in_progress") return <Clock size={16} style={{ color: "var(--accent)", flexShrink: 0 }} />;
  if (status === "skipped") return <SkipForward size={16} style={{ color: "var(--muted)", flexShrink: 0 }} />;
  return <Circle size={16} style={{ color: "var(--muted-light)", flexShrink: 0 }} />;
}

function DonutChart({ percentage }) {
  const numericPercentage = Number(percentage);
  const safePercentage = Number.isFinite(numericPercentage) ? Math.max(0, Math.min(100, numericPercentage)) : 0;
  const r = 40;
  const circ = 2 * Math.PI * r;
  const dashArray = `${circ * safePercentage / 100} ${circ * (1 - safePercentage / 100)}`;

  return (
    <svg viewBox="0 0 100 100" className="donut-svg" role="img" aria-label={`${safePercentage}% complete`}>
      <circle cx="50" cy="50" r={r} fill="none" stroke="var(--border)" strokeWidth="12" />
      <circle
        cx="50" cy="50" r={r} fill="none"
        stroke="var(--accent)" strokeWidth="12"
        strokeDasharray={dashArray}
        strokeLinecap="round"
        transform="rotate(-90 50 50)"
        style={{ transition: "stroke-dasharray 0.6s ease" }}
      />
      <text
        x="50" y="50" textAnchor="middle" dy="0.35em"
        fontSize="16" fontWeight="800" fill="var(--text)"
        style={{ transform: "rotate(0deg)" }}
      >
        {safePercentage}%
      </text>
    </svg>
  );
}

export default function OnboardingProgressPage() {
  const { token } = React.useContext(AuthContext);
  const { repoId } = useParams();
  const [data, setData] = React.useState(null);
  const [tasks, setTasks] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    Promise.all([
      apiFetch(`/analysis/${repoId}/progress`, {}, token),
      apiFetch(`/analysis/${repoId}/tasks`, {}, token),
    ])
      .then(([prog, taskData]) => {
        setData(prog);
        setTasks(taskData.tasks || []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [repoId, token]);

  if (loading) return <Layout title="My Onboarding Progress"><LoadingSpinner /></Layout>;

  const summary = data?.summary || { total_tasks: 0, completed_tasks: 0, percentage: 0 };
  const progressMap = {};
  for (const p of data?.progress || []) progressMap[p.task_id] = p;

  const byDifficulty = {
    beginner: tasks.filter((t) => t.difficulty === "beginner"),
    intermediate: tasks.filter((t) => t.difficulty === "intermediate"),
    advanced: tasks.filter((t) => t.difficulty === "advanced"),
  };

  const inProgress = Object.values(progressMap).filter((p) => p.status === "in_progress").length;
  const skipped = Object.values(progressMap).filter((p) => p.status === "skipped").length;

  return (
    <Layout
      title="My Onboarding Progress"
      subtitle="Track your journey through the repository"
      breadcrumb={[
        { to: "/dashboard", label: "Dashboard" },
        { to: `/repository/${repoId}`, label: "Repository" },
        { label: "My Progress" },
      ]}
    >
      <ErrorBanner message={error} onDismiss={() => setError("")} />

      {/* Progress hero */}
      <div className="progress-hero">
        <div className="progress-donut-wrap">
          <DonutChart percentage={summary.percentage} />
        </div>
        <div className="progress-hero-stats">
          <div className="progress-stat">
            <span className="progress-stat-value" style={{ color: "var(--green)" }}>
              {summary.completed_tasks}
            </span>
            <span className="progress-stat-label">Completed</span>
          </div>
          <div className="progress-stat">
            <span className="progress-stat-value" style={{ color: "var(--accent)" }}>
              {inProgress}
            </span>
            <span className="progress-stat-label">In Progress</span>
          </div>
          <div className="progress-stat">
            <span className="progress-stat-value">
              {Math.max(0, summary.total_tasks - summary.completed_tasks - inProgress - skipped)}
            </span>
            <span className="progress-stat-label">Remaining</span>
          </div>
          <div className="progress-stat">
            <span className="progress-stat-value">{summary.total_tasks}</span>
            <span className="progress-stat-label">Total</span>
          </div>
        </div>
      </div>

      {tasks.length === 0 ? (
        <EmptyState
          icon={<TrendingUp size={28} />}
          title="No tasks available yet"
          description="Task progress will appear here after repository analysis completes and tasks are generated."
          action={
            <Link to={`/repository/${repoId}/tasks`} className="btn btn-primary">
              View Starter Tasks
            </Link>
          }
        />
      ) : (
        Object.entries(byDifficulty).map(([diff, diffTasks]) =>
          diffTasks.length > 0 && (
            <div key={diff} className="progress-section">
              <div className="progress-section-header">
                <div className="progress-section-title">
                  <span
                    style={{
                      width: 10, height: 10, borderRadius: "50%", flexShrink: 0,
                      background: diff === "beginner" ? "var(--green)" : diff === "intermediate" ? "var(--amber)" : "var(--red)",
                      display: "inline-block",
                    }}
                  />
                  {diff.charAt(0).toUpperCase() + diff.slice(1)} Tasks
                </div>
                <span className="progress-section-count">
                  {diffTasks.filter((t) => progressMap[t.id]?.status === "done").length}/{diffTasks.length} done
                </span>
              </div>
              <div className="progress-task-list">
                {diffTasks.map((task) => {
                  const status = progressMap[task.id]?.status || "todo";
                  return (
                    <div key={task.id} className={`progress-task-item status-${status}`}>
                      <StatusIcon status={status} />
                      <span className="progress-task-name">{task.title}</span>
                      <StatusBadge status={status} />
                    </div>
                  );
                })}
              </div>
            </div>
          )
        )
      )}
    </Layout>
  );
}
