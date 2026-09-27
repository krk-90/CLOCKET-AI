"""Repository-scoped RAG indexer for Clocket AI.

Indexes repository source files into Supabase pgvector with:
- user_id (required, for user isolation)
- repository_id (required, for repository-scoped retrieval)
- file_path (relative path within repo)
- language (detected from file extension)
- chunk_type (code | doc | config)
- commit_sha

Reuses the existing SupabaseRetriever infrastructure but adds
the repository_id column for scoped retrieval.
"""
from __future__ import annotations

import logging
import os
from hashlib import sha256
from pathlib import Path
from typing import Iterator

logger = logging.getLogger(__name__)

SUPPORTED_EXTENSIONS = {
    # Code
    ".py", ".js", ".jsx", ".ts", ".tsx", ".java", ".go", ".rs", ".rb",
    ".php", ".cs", ".cpp", ".cc", ".c", ".h", ".swift", ".kt", ".scala",
    ".sh", ".bash", ".ps1", ".lua", ".ex", ".exs", ".erl", ".clj",
    ".vue", ".svelte", ".dart",
    # Config / docs
    ".md", ".txt", ".rst", ".yaml", ".yml", ".json", ".toml", ".env",
    ".sql", ".html", ".css", ".scss",
    # Build files
    ".gradle", ".xml",
}

DOC_EXTENSIONS = {".md", ".txt", ".rst"}
CONFIG_EXTENSIONS = {".yaml", ".yml", ".json", ".toml", ".env", ".sql", ".xml", ".gradle"}

SKIP_DIRS = {
    ".git", "node_modules", "__pycache__", ".venv", "venv",
    ".mypy_cache", ".pytest_cache", "dist", "build", ".next",
    "target", "bin", "obj", ".gradle", "coverage",
}

EXTENSION_LANGUAGE = {
    ".py": "python", ".js": "javascript", ".jsx": "javascript",
    ".ts": "typescript", ".tsx": "typescript", ".java": "java",
    ".go": "go", ".rs": "rust", ".rb": "ruby", ".php": "php",
    ".cs": "csharp", ".cpp": "cpp", ".cc": "cpp", ".c": "c",
    ".swift": "swift", ".kt": "kotlin", ".scala": "scala",
    ".sh": "shell", ".bash": "shell", ".ps1": "powershell",
    ".sql": "sql", ".html": "html", ".css": "css",
    ".json": "json", ".yaml": "yaml", ".yml": "yaml",
    ".toml": "toml", ".md": "markdown",
}


def _detect_chunk_type(ext: str) -> str:
    if ext in DOC_EXTENSIONS:
        return "doc"
    if ext in CONFIG_EXTENSIONS:
        return "config"
    return "code"


def _chunk_text(text: str, chunk_size: int = 800, overlap: int = 120) -> Iterator[str]:
    words = text.split()
    step = max(1, chunk_size - overlap)
    for start in range(0, len(words), step):
        chunk = " ".join(words[start: start + chunk_size]).strip()
        if chunk:
            yield chunk
        if start + chunk_size >= len(words):
            break


def _row_id(user_id: str, repository_id: str, source: str, chunk_id: int) -> str:
    value = f"{user_id}:{repository_id}:{source}:{chunk_id}"
    return sha256(value.encode("utf-8")).hexdigest()


def index_repository_files(
    user_id: str,
    repository_id: str,
    local_path: str,
    file_tree: list[str],
    commit_sha: str = "",
    chunk_size: int = 800,
    overlap: int = 120,
    max_file_size_bytes: int = 512 * 1024,
    batch_size: int = 50,
) -> int:
    """
    Index repository files into Supabase rag_documents with repository_id scoping.
    Returns the number of chunks indexed.
    """
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required for RAG indexing")

    from fastembed import TextEmbedding
    from supabase import create_client

    client = create_client(url, key)
    embedder = TextEmbedding(
        model_name=os.getenv("RAG_EMBEDDING_MODEL", "BAAI/bge-small-en-v1.5")
    )
    root = Path(local_path).resolve()
    total_indexed = 0
    batch: list[dict] = []

    for rel_path in file_tree:
        ext = Path(rel_path).suffix.lower()
        if ext not in SUPPORTED_EXTENSIONS:
            continue

        abs_path = root / rel_path
        if not abs_path.exists() or not abs_path.is_file():
            continue

        try:
            stat = abs_path.stat()
            if stat.st_size == 0 or stat.st_size > max_file_size_bytes:
                continue
            text = abs_path.read_text(encoding="utf-8", errors="ignore").strip()
            if not text:
                continue
        except Exception as exc:
            logger.debug("Skipping %s: %s", rel_path, exc)
            continue

        language = EXTENSION_LANGUAGE.get(ext, "unknown")
        chunk_type = _detect_chunk_type(ext)
        source = rel_path  # relative path used as source

        for chunk_index, chunk_text in enumerate(_chunk_text(text, chunk_size, overlap)):
            embedding = [float(x) for x in next(iter(embedder.embed([chunk_text])))]
            row = {
                "id": _row_id(user_id, repository_id, source, chunk_index),
                "user_id": user_id,
                "repository_id": repository_id,
                "source": source,
                "file_path": rel_path,
                "content": chunk_text,
                "chunk_id": chunk_index,
                "language": language,
                "chunk_type": chunk_type,
                "commit_sha": commit_sha,
                "embedding": embedding,
            }
            batch.append(row)

            if len(batch) >= batch_size:
                client.table("rag_documents").upsert(batch).execute()
                total_indexed += len(batch)
                batch.clear()

    if batch:
        client.table("rag_documents").upsert(batch).execute()
        total_indexed += len(batch)

    logger.info(
        "Indexed %d chunks for user=%s repository=%s",
        total_indexed, user_id, repository_id,
    )
    return total_indexed


def delete_repository_rag_documents(user_id: str, repository_id: str) -> None:
    """Remove all RAG documents for a repository."""
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        return
    from supabase import create_client
    client = create_client(url, key)
    client.table("rag_documents").delete().eq("user_id", user_id).eq("repository_id", repository_id).execute()
