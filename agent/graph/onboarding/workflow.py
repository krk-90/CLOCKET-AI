"""Clocket AI — LangGraph Onboarding Workflow.

Pipeline:
  START
    ↓ validate_github_url
    ↓ clone_repository
    ↓ static_scan
    ↓ analyze_architecture_node
    ↓ generate_setup_guide_node
    ↓ generate_onboarding_plan_node
    ↓ generate_starter_tasks_node
    ↓ index_into_rag
    ↓ persist_results
  END

Uses:
- Static scanner (agent/analysis/scanner.py) — deterministic
- LLM for architecture, setup guide, onboarding plan, tasks
- Existing SupabaseRetriever (extended with repository_id)
- Clocket AI MCP tools for persistence
"""
from __future__ import annotations

import logging
import os
import shutil
import tempfile
from typing import Any, Optional

from langgraph.graph import END, START, StateGraph
from langsmith import traceable
from typing_extensions import TypedDict

from app.core.tracing import trace_config
from llm_gateway.provider.groq_llm import get_model

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Workflow state
# ---------------------------------------------------------------------------

class OnboardingState(TypedDict, total=False):
    # Input
    github_url: str
    repository_id: str
    user_id: str

    # Repository metadata (from GitHub URL parse + git clone)
    owner: str
    name: str
    local_path: str
    commit_sha: str

    # Analysis results
    scan_result: dict
    architecture: dict
    setup_guide: dict
    onboarding_plan: str
    starter_tasks: list

    # Flags
    rag_indexed: bool
    persisted: bool
    error: str
    status: str


# ---------------------------------------------------------------------------
# Node implementations
# ---------------------------------------------------------------------------

@traceable(name="onboarding.validate_url")
async def validate_github_url(state: OnboardingState) -> dict:
    import re
    pattern = re.compile(r"^https://github\.com/([A-Za-z0-9_.-]+)/([A-Za-z0-9_.-]+?)(?:\.git)?/?$")
    url = state.get("github_url", "").strip()
    m = pattern.match(url)
    if not m:
        return {"error": f"Invalid GitHub URL: {url}", "status": "failed"}
    return {"owner": m.group(1), "name": m.group(2), "status": "url_validated"}


@traceable(name="onboarding.clone_repository")
async def clone_repository(state: OnboardingState) -> dict:
    if state.get("error"):
        return {}
    import asyncio
    from agent.graph.git_router import clone_repo
    try:
        local_path = await asyncio.to_thread(clone_repo, state["github_url"])
        # Try to get current commit SHA
        commit_sha = ""
        try:
            import subprocess
            result = subprocess.run(
                ["git", "rev-parse", "HEAD"],
                capture_output=True, text=True, cwd=local_path, timeout=10
            )
            commit_sha = result.stdout.strip()
        except Exception:
            pass
        return {"local_path": local_path, "commit_sha": commit_sha, "status": "cloned"}
    except Exception as exc:
        return {"error": f"Failed to clone repository: {exc}", "status": "failed"}


@traceable(name="onboarding.static_scan")
async def static_scan(state: OnboardingState) -> dict:
    if state.get("error"):
        return {}
    import asyncio
    from agent.analysis.scanner import RepositoryScanner
    try:
        local_path = state.get("local_path", "")
        if not local_path or not os.path.exists(local_path):
            return {"error": "Local path not available for scanning", "status": "failed"}
        max_size = int(os.getenv("ANALYSIS_MAX_FILE_SIZE_KB", "500")) * 1024
        scanner = RepositoryScanner(local_path, max_file_size_bytes=max_size)
        scan_result = await asyncio.to_thread(scanner.scan)
        return {"scan_result": scan_result, "status": "scanned"}
    except Exception as exc:
        return {"error": f"Static scan failed: {exc}", "status": "failed"}


@traceable(name="onboarding.analyze_architecture")
async def analyze_architecture_node(state: OnboardingState) -> dict:
    if state.get("error"):
        return {}
    from agent.analysis.architecture import analyze_architecture
    repo_info = {"owner": state.get("owner", ""), "name": state.get("name", "")}
    scan_result = state.get("scan_result", {})
    try:
        arch = await analyze_architecture(
            llm=_get_llm(),
            repo_info=repo_info,
            scan_result=scan_result,
            user_id=state.get("user_id"),
        )
        return {"architecture": arch, "status": "architecture_analyzed"}
    except Exception as exc:
        logger.warning("Architecture analysis failed: %s", exc)
        return {"architecture": {}, "status": "architecture_analyzed"}


@traceable(name="onboarding.generate_setup_guide")
async def generate_setup_guide_node(state: OnboardingState) -> dict:
    if state.get("error"):
        return {}
    from agent.analysis.architecture import generate_setup_guide
    repo_info = {"owner": state.get("owner", ""), "name": state.get("name", "")}
    try:
        guide = await generate_setup_guide(
            llm=_get_llm(),
            repo_info=repo_info,
            scan_result=state.get("scan_result", {}),
            user_id=state.get("user_id"),
        )
        return {"setup_guide": guide, "status": "setup_guide_generated"}
    except Exception as exc:
        logger.warning("Setup guide generation failed: %s", exc)
        return {"setup_guide": {"prerequisites": [], "steps": [], "environment_variables": [], "issues": []}}


@traceable(name="onboarding.generate_onboarding_plan")
async def generate_onboarding_plan_node(state: OnboardingState) -> dict:
    if state.get("error"):
        return {}
    from agent.analysis.task_generator import generate_onboarding_plan
    repo_info = {"owner": state.get("owner", ""), "name": state.get("name", "")}
    try:
        plan = await generate_onboarding_plan(
            llm=_get_llm(),
            repo_info=repo_info,
            scan_result=state.get("scan_result", {}),
            architecture=state.get("architecture", {}),
            user_id=state.get("user_id"),
        )
        return {"onboarding_plan": plan, "status": "plan_generated"}
    except Exception as exc:
        logger.warning("Onboarding plan generation failed: %s", exc)
        return {"onboarding_plan": ""}


@traceable(name="onboarding.generate_starter_tasks")
async def generate_starter_tasks_node(state: OnboardingState) -> dict:
    if state.get("error"):
        return {}
    from agent.analysis.task_generator import generate_starter_tasks
    repo_info = {"owner": state.get("owner", ""), "name": state.get("name", "")}
    try:
        tasks = await generate_starter_tasks(
            llm=_get_llm(),
            repo_info=repo_info,
            scan_result=state.get("scan_result", {}),
            architecture=state.get("architecture", {}),
            user_id=state.get("user_id"),
        )
        return {"starter_tasks": tasks, "status": "tasks_generated"}
    except Exception as exc:
        logger.warning("Task generation failed: %s", exc)
        return {"starter_tasks": []}


@traceable(name="onboarding.index_into_rag")
async def index_into_rag(state: OnboardingState) -> dict:
    """Index repository files into pgvector with repository_id for scoped retrieval."""
    if state.get("error"):
        return {}
    local_path = state.get("local_path", "")
    if not local_path or not os.path.exists(local_path):
        return {"rag_indexed": False}

    try:
        import asyncio
        from agent.rag.clocket_ai_indexer import index_repository_files
        repository_id = state.get("repository_id", "")
        user_id = state.get("user_id", "")
        commit_sha = state.get("commit_sha", "")
        scan_result = state.get("scan_result", {})

        max_files = int(os.getenv("ANALYSIS_MAX_FILES", "200"))
        file_tree = scan_result.get("file_tree", [])[:max_files]

        indexed = await asyncio.to_thread(
            index_repository_files,
            user_id=user_id,
            repository_id=repository_id,
            local_path=local_path,
            file_tree=file_tree,
            commit_sha=commit_sha,
        )
        logger.info("Indexed %d chunks for repository %s", indexed, repository_id)
        return {"rag_indexed": True, "status": "rag_indexed"}
    except Exception as exc:
        logger.warning("RAG indexing failed (non-fatal): %s", exc)
        return {"rag_indexed": False}


@traceable(name="onboarding.persist_results")
async def persist_results(state: OnboardingState) -> dict:
    """Persist all analysis results to Supabase."""
    repository_id = state.get("repository_id", "")
    user_id = state.get("user_id", "")

    if state.get("error"):
        # Mark repository as failed
        try:
            from mcp_server.clocket_ai_tools import _get_client
            client = _get_client()
            client.table("repositories").update(
                {"status": "failed", "error_message": state.get("error", "Unknown error")[:500]}
            ).eq("id", repository_id).execute()
        except Exception:
            pass
        return {"persisted": False}

    try:
        from mcp_server.clocket_ai_tools import save_repository_analysis, save_onboarding_tasks, _get_client

        scan_result = state.get("scan_result", {})
        architecture = state.get("architecture", {})
        setup_guide = state.get("setup_guide", {})
        owner = state.get("owner", "")
        name = state.get("name", "")
        commit_sha = state.get("commit_sha", "")

        # Update repository metadata
        try:
            client = _get_client()
            client.table("repositories").update({
                "owner": owner,
                "name": name,
                "commit_sha": commit_sha,
                "default_branch": "main",
            }).eq("id", repository_id).execute()
        except Exception as exc:
            logger.warning("Failed to update repository metadata: %s", exc)

        # Save analysis
        save_repository_analysis(
            repository_id=repository_id,
            architecture=architecture,
            technology_stack={
                "languages": scan_result.get("languages", {}),
                "frameworks": scan_result.get("frameworks", []),
                "infrastructure": scan_result.get("infrastructure", []),
            },
            dependencies={"detected": scan_result.get("frameworks", [])},
            configuration={
                "env_vars": scan_result.get("env_vars", []),
                "deployment": scan_result.get("infrastructure", []),
            },
            apis=scan_result.get("api_routes", []),
            database_info={"databases": scan_result.get("databases", [])},
            setup_guide=setup_guide.get("steps", []),
            setup_issues=setup_guide.get("issues", []),
            onboarding_plan=state.get("onboarding_plan", ""),
            directory_structure=scan_result.get("directory_structure", []),
            important_files=scan_result.get("important_files", []),
            entry_points=scan_result.get("entry_points", {}),
        )

        # Save onboarding tasks
        tasks = state.get("starter_tasks", [])
        if tasks:
            save_onboarding_tasks(repository_id=repository_id, tasks=tasks)

        return {"persisted": True, "status": "completed"}

    except Exception as exc:
        logger.exception("Failed to persist analysis results: %s", exc)
        return {"persisted": False, "error": f"Persistence failed: {exc}"}


async def cleanup_local_repo(state: OnboardingState) -> dict:
    """Clean up the cloned repository from disk."""
    local_path = state.get("local_path", "")
    if local_path and os.path.exists(local_path):
        shutil.rmtree(local_path, ignore_errors=True)
        logger.info("Cleaned up local repo: %s", local_path)
    return {}


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def _get_llm():
    model_name = os.getenv("CLOCKET_AI_LLM_MODEL", "openai/gpt-oss-20b")
    return get_model(model_name)


def _should_continue(state: OnboardingState) -> str:
    """Skip remaining nodes if there's an error — go directly to persist."""
    if state.get("error"):
        return "persist_results"
    return "continue"


# ---------------------------------------------------------------------------
# Graph construction
# ---------------------------------------------------------------------------

def build_onboarding_graph():
    graph = StateGraph(OnboardingState)

    graph.add_node("validate_github_url", validate_github_url)
    graph.add_node("clone_repository", clone_repository)
    graph.add_node("static_scan", static_scan)
    graph.add_node("analyze_architecture", analyze_architecture_node)
    graph.add_node("generate_setup_guide", generate_setup_guide_node)
    graph.add_node("generate_onboarding_plan", generate_onboarding_plan_node)
    graph.add_node("generate_starter_tasks", generate_starter_tasks_node)
    graph.add_node("index_into_rag", index_into_rag)
    graph.add_node("persist_results", persist_results)
    graph.add_node("cleanup", cleanup_local_repo)

    graph.add_edge(START, "validate_github_url")
    graph.add_edge("validate_github_url", "clone_repository")
    graph.add_edge("clone_repository", "static_scan")
    graph.add_edge("static_scan", "analyze_architecture")
    graph.add_edge("analyze_architecture", "generate_setup_guide")
    graph.add_edge("generate_setup_guide", "generate_onboarding_plan")
    graph.add_edge("generate_onboarding_plan", "generate_starter_tasks")
    graph.add_edge("generate_starter_tasks", "index_into_rag")
    graph.add_edge("index_into_rag", "persist_results")
    graph.add_edge("persist_results", "cleanup")
    graph.add_edge("cleanup", END)

    return graph.compile()


_ONBOARDING_GRAPH = None


def _get_graph():
    global _ONBOARDING_GRAPH
    if _ONBOARDING_GRAPH is None:
        _ONBOARDING_GRAPH = build_onboarding_graph()
    return _ONBOARDING_GRAPH


@traceable(name="onboarding.run_workflow")
async def run_onboarding_workflow(
    github_url: str,
    repository_id: str,
    user_id: str,
) -> dict:
    """Run the full onboarding workflow for a GitHub repository."""
    graph = _get_graph()
    initial_state: OnboardingState = {
        "github_url": github_url,
        "repository_id": repository_id,
        "user_id": user_id,
        "status": "starting",
    }
    result = await graph.ainvoke(
        initial_state,
        config=trace_config(
            "onboarding.graph",
            user_id=user_id,
            tags=["onboarding", "graph"],
            metadata={"repository_id": repository_id},
        ),
    )
    return result


__all__ = ["run_onboarding_workflow", "build_onboarding_graph"]
