from __future__ import annotations

import os
from typing import Any

from dotenv import load_dotenv

load_dotenv()


def tracing_enabled() -> bool:
    value = os.getenv("LANGSMITH_TRACING", os.getenv("LANGCHAIN_TRACING_V2", "false"))
    return value.strip().lower() in {"1", "true", "yes", "on"}


def trace_config(
    run_name: str,
    *,
    user_id: str | None = None,
    tags: list[str] | None = None,
    metadata: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Build consistent LangChain run metadata without including secrets or prompts."""
    run_tags = ["clocket-ai", *(tags or [])]
    run_metadata: dict[str, Any] = {
        "service": "clocket-ai",
        "tracing_enabled": tracing_enabled(),
    }
    if user_id:
        run_metadata["user_id"] = user_id
    if metadata:
        run_metadata.update(metadata)

    return {
        "run_name": run_name,
        "tags": run_tags,
        "metadata": run_metadata,
    }


__all__ = ["trace_config", "tracing_enabled"]
