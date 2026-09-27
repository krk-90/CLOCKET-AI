"""Deterministic repository scanner for Clocket AI.

Performs static analysis of a repository to detect:
- Programming languages
- Frameworks and libraries
- Infrastructure tools (Docker, CI/CD, etc.)
- Databases
- Important files (entry points, config, docs)
- Environment variables (from .env.example, README, etc.)
- API routes (best-effort pattern matching)

All detection is deterministic — no LLM calls here.
LLM reasoning is applied in subsequent pipeline nodes.
"""
from __future__ import annotations

import json
import logging
import re
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# File extension → language mapping
# ---------------------------------------------------------------------------
EXTENSION_LANGUAGE: dict[str, str] = {
    ".py": "python",
    ".js": "javascript",
    ".jsx": "javascript",
    ".ts": "typescript",
    ".tsx": "typescript",
    ".java": "java",
    ".go": "go",
    ".rs": "rust",
    ".rb": "ruby",
    ".php": "php",
    ".cs": "csharp",
    ".cpp": "cpp",
    ".cc": "cpp",
    ".c": "c",
    ".h": "c",
    ".swift": "swift",
    ".kt": "kotlin",
    ".scala": "scala",
    ".r": "r",
    ".sh": "shell",
    ".bash": "shell",
    ".zsh": "shell",
    ".ps1": "powershell",
    ".sql": "sql",
    ".html": "html",
    ".css": "css",
    ".scss": "scss",
    ".sass": "sass",
    ".vue": "vue",
    ".svelte": "svelte",
    ".dart": "dart",
    ".lua": "lua",
    ".ex": "elixir",
    ".exs": "elixir",
    ".erl": "erlang",
    ".clj": "clojure",
}

# ---------------------------------------------------------------------------
# Known important filenames
# ---------------------------------------------------------------------------
IMPORTANT_FILENAMES = {
    # Dependency manifests
    "package.json", "package-lock.json", "yarn.lock", "pnpm-lock.yaml",
    "requirements.txt", "setup.py", "setup.cfg", "pyproject.toml", "Pipfile", "Pipfile.lock",
    "pom.xml", "build.gradle", "build.gradle.kts", "settings.gradle",
    "go.mod", "go.sum",
    "Cargo.toml", "Cargo.lock",
    "Gemfile", "Gemfile.lock",
    "composer.json", "composer.lock",
    # Docker
    "Dockerfile", "docker-compose.yml", "docker-compose.yaml",
    ".dockerignore",
    # CI/CD
    ".travis.yml", "Jenkinsfile", ".circleci/config.yml",
    # Env / config
    ".env", ".env.example", ".env.sample", ".env.template",
    "config.yml", "config.yaml", "config.json", "application.yml", "application.properties",
    # Deployment
    "render.yaml", "fly.toml", "Procfile", "app.yaml", "vercel.json", "netlify.toml",
    "terraform.tf", "main.tf",
    # Docs
    "README.md", "README.rst", "README.txt",
    "CONTRIBUTING.md", "ARCHITECTURE.md", "CHANGELOG.md",
    # Kubernetes
    "kubernetes.yml", "kubernetes.yaml", "k8s.yml", "k8s.yaml",
}

# ---------------------------------------------------------------------------
# Framework detection rules: filename/path pattern → framework
# ---------------------------------------------------------------------------
FRAMEWORK_INDICATORS: list[tuple[str, str]] = [
    # Python web
    ("requirements.txt:fastapi", "FastAPI"),
    ("requirements.txt:flask", "Flask"),
    ("requirements.txt:django", "Django"),
    ("requirements.txt:starlette", "Starlette"),
    ("requirements.txt:tornado", "Tornado"),
    ("requirements.txt:aiohttp", "aiohttp"),
    ("pyproject.toml:fastapi", "FastAPI"),
    ("pyproject.toml:flask", "Flask"),
    ("pyproject.toml:django", "Django"),
    # Python AI/ML
    ("requirements.txt:langchain", "LangChain"),
    ("requirements.txt:langgraph", "LangGraph"),
    ("requirements.txt:openai", "OpenAI"),
    ("requirements.txt:anthropic", "Anthropic"),
    ("requirements.txt:transformers", "HuggingFace Transformers"),
    ("requirements.txt:torch", "PyTorch"),
    ("requirements.txt:tensorflow", "TensorFlow"),
    ("requirements.txt:sklearn", "scikit-learn"),
    # JavaScript/TypeScript frontend
    ("package.json:react", "React"),
    ("package.json:next", "Next.js"),
    ("package.json:vue", "Vue.js"),
    ("package.json:@angular/core", "Angular"),
    ("package.json:svelte", "Svelte"),
    ("package.json:vite", "Vite"),
    ("package.json:webpack", "Webpack"),
    ("package.json:express", "Express.js"),
    ("package.json:fastify", "Fastify"),
    ("package.json:koa", "Koa"),
    ("package.json:nestjs", "NestJS"),
    ("package.json:@nestjs/core", "NestJS"),
    ("package.json:remix", "Remix"),
    ("package.json:nuxt", "Nuxt.js"),
    # Testing
    ("requirements.txt:pytest", "pytest"),
    ("package.json:jest", "Jest"),
    ("package.json:vitest", "Vitest"),
    ("package.json:mocha", "Mocha"),
    ("package.json:cypress", "Cypress"),
]

# ---------------------------------------------------------------------------
# Database detection
# ---------------------------------------------------------------------------
DATABASE_INDICATORS: list[tuple[str, str]] = [
    ("requirements.txt:psycopg", "PostgreSQL"),
    ("requirements.txt:asyncpg", "PostgreSQL"),
    ("requirements.txt:supabase", "Supabase"),
    ("requirements.txt:sqlalchemy", "SQLAlchemy"),
    ("requirements.txt:pymongo", "MongoDB"),
    ("requirements.txt:motor", "MongoDB"),
    ("requirements.txt:redis", "Redis"),
    ("requirements.txt:aioredis", "Redis"),
    ("requirements.txt:mysql", "MySQL"),
    ("requirements.txt:sqlite", "SQLite"),
    ("requirements.txt:peewee", "Peewee ORM"),
    ("requirements.txt:tortoise", "Tortoise ORM"),
    ("requirements.txt:prisma", "Prisma"),
    ("package.json:@supabase/supabase-js", "Supabase"),
    ("package.json:mongoose", "MongoDB"),
    ("package.json:pg", "PostgreSQL"),
    ("package.json:mysql2", "MySQL"),
    ("package.json:redis", "Redis"),
    ("package.json:prisma", "Prisma"),
    ("package.json:@prisma/client", "Prisma"),
]

# ---------------------------------------------------------------------------
# Infrastructure detection
# ---------------------------------------------------------------------------
INFRA_INDICATORS: list[tuple[str, str]] = [
    ("Dockerfile", "Docker"),
    ("docker-compose.yml", "Docker Compose"),
    ("docker-compose.yaml", "Docker Compose"),
    ("render.yaml", "Render"),
    ("fly.toml", "Fly.io"),
    ("Procfile", "Heroku"),
    ("app.yaml", "Google App Engine"),
    ("vercel.json", "Vercel"),
    ("netlify.toml", "Netlify"),
    (".github/workflows", "GitHub Actions"),
    ("kubernetes.yml", "Kubernetes"),
    ("kubernetes.yaml", "Kubernetes"),
    ("main.tf", "Terraform"),
    ("terraform.tf", "Terraform"),
    (".travis.yml", "Travis CI"),
    ("Jenkinsfile", "Jenkins"),
    (".circleci/config.yml", "CircleCI"),
]

ENV_VAR_PATTERN = re.compile(r"\b([A-Z][A-Z0-9_]{2,})\s*=", re.MULTILINE)
ROUTE_PATTERNS = [
    # FastAPI / Flask style
    re.compile(r'@\w+\.(get|post|put|delete|patch)\s*\(\s*["\']([^"\']+)["\']', re.IGNORECASE),
    # Express style
    re.compile(r'(?:app|router)\.(get|post|put|delete|patch)\s*\(\s*["\']([^"\']+)["\']', re.IGNORECASE),
    # Spring Boot style
    re.compile(r'@(?:Get|Post|Put|Delete|Patch|Request)Mapping\s*\(\s*["\']([^"\']+)["\']', re.IGNORECASE),
]


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

class RepositoryScanner:
    """Deterministic static scanner for a local repository clone."""

    def __init__(self, repo_path: str, max_file_size_bytes: int = 512 * 1024):
        self.root = Path(repo_path).resolve()
        self.max_file_size = max_file_size_bytes
        self._file_tree: list[str] = []

    # ------------------------------------------------------------------
    def scan(self) -> dict[str, Any]:
        """Run full static scan and return structured results."""
        logger.info("Scanning repository at %s", self.root)
        file_tree = self._walk_tree()
        languages = self._detect_languages(file_tree)
        important_files = self._find_important_files(file_tree)
        file_contents = self._read_important_files(important_files)
        frameworks = self._detect_frameworks(file_contents)
        databases = self._detect_databases(file_contents)
        infrastructure = self._detect_infrastructure(file_tree)
        env_vars = self._extract_env_vars(file_contents)
        api_routes = self._extract_api_routes(file_contents, file_tree)
        entry_points = self._detect_entry_points(file_tree, file_contents)
        directory_structure = self._summarize_directory_structure(file_tree)

        return {
            "file_tree": file_tree,
            "languages": languages,
            "frameworks": frameworks,
            "databases": databases,
            "infrastructure": infrastructure,
            "env_vars": env_vars,
            "api_routes": api_routes,
            "entry_points": entry_points,
            "important_files": important_files,
            "important_file_contents": file_contents,
            "directory_structure": directory_structure,
        }

    # ------------------------------------------------------------------
    def _walk_tree(self, max_files: int = 2000) -> list[str]:
        SKIP_DIRS = {
            ".git", "node_modules", "__pycache__", ".venv", "venv",
            ".mypy_cache", ".pytest_cache", "dist", "build", ".next",
            "target", "bin", "obj", ".gradle", ".idea", ".vscode",
        }
        paths: list[str] = []
        for path in sorted(self.root.rglob("*")):
            if len(paths) >= max_files:
                break
            if any(skip in path.parts for skip in SKIP_DIRS):
                continue
            if path.is_file():
                paths.append(str(path.relative_to(self.root)))
        return paths

    def _detect_languages(self, file_tree: list[str]) -> dict[str, int]:
        counts: dict[str, int] = {}
        for path in file_tree:
            ext = Path(path).suffix.lower()
            lang = EXTENSION_LANGUAGE.get(ext)
            if lang:
                counts[lang] = counts.get(lang, 0) + 1
        return dict(sorted(counts.items(), key=lambda x: x[1], reverse=True))

    def _find_important_files(self, file_tree: list[str]) -> list[str]:
        important: list[str] = []
        for path in file_tree:
            name = Path(path).name
            if name in IMPORTANT_FILENAMES:
                important.append(path)
            # GitHub Actions workflows
            elif ".github/workflows" in path and path.endswith((".yml", ".yaml")):
                important.append(path)
        return important

    def _read_important_files(self, important_files: list[str]) -> dict[str, str]:
        contents: dict[str, str] = {}
        for rel_path in important_files:
            abs_path = self.root / rel_path
            try:
                if abs_path.stat().st_size > self.max_file_size:
                    contents[rel_path] = f"[File too large: {abs_path.stat().st_size} bytes]"
                    continue
                contents[rel_path] = abs_path.read_text(encoding="utf-8", errors="ignore")
            except Exception as exc:
                contents[rel_path] = f"[Read error: {exc}]"
        return contents

    def _detect_frameworks(self, file_contents: dict[str, str]) -> list[str]:
        found: set[str] = set()
        for indicator, framework in FRAMEWORK_INDICATORS:
            if ":" in indicator:
                filename, keyword = indicator.split(":", 1)
                for path, content in file_contents.items():
                    if Path(path).name == filename and keyword.lower() in content.lower():
                        found.add(framework)
            else:
                if any(Path(p).name == indicator for p in file_contents):
                    found.add(framework)
        return sorted(found)

    def _detect_databases(self, file_contents: dict[str, str]) -> list[str]:
        found: set[str] = set()
        for indicator, db in DATABASE_INDICATORS:
            if ":" in indicator:
                filename, keyword = indicator.split(":", 1)
                for path, content in file_contents.items():
                    if Path(path).name == filename and keyword.lower() in content.lower():
                        found.add(db)
        return sorted(found)

    def _detect_infrastructure(self, file_tree: list[str]) -> list[str]:
        found: set[str] = set()
        for indicator, infra in INFRA_INDICATORS:
            if any(indicator in p or Path(p).name == indicator for p in file_tree):
                found.add(infra)
        return sorted(found)

    def _extract_env_vars(self, file_contents: dict[str, str]) -> list[str]:
        """Extract env var names from .env.example and similar files."""
        env_vars: set[str] = set()
        env_files = [p for p in file_contents if Path(p).name in {".env.example", ".env.sample", ".env.template", ".env"}]
        for path in env_files:
            for match in ENV_VAR_PATTERN.finditer(file_contents[path]):
                env_vars.add(match.group(1))
        # Also scan README for env var patterns
        readme = next((c for p, c in file_contents.items() if Path(p).name.upper().startswith("README")), "")
        for match in ENV_VAR_PATTERN.finditer(readme):
            name = match.group(1)
            if len(name) > 3:  # filter very short names
                env_vars.add(name)
        return sorted(env_vars)

    def _extract_api_routes(self, file_contents: dict[str, str], file_tree: list[str]) -> list[dict]:
        routes: list[dict] = []
        # Scan all source files for route patterns
        for rel_path in file_tree:
            ext = Path(rel_path).suffix.lower()
            if ext not in {".py", ".js", ".ts", ".java", ".go"}:
                continue
            abs_path = self.root / rel_path
            try:
                if abs_path.stat().st_size > self.max_file_size:
                    continue
                content = abs_path.read_text(encoding="utf-8", errors="ignore")
            except Exception:
                continue
            for pattern in ROUTE_PATTERNS:
                for match in pattern.finditer(content):
                    groups = match.groups()
                    method = groups[0].upper()
                    path_val = groups[-1]
                    routes.append({"method": method, "path": path_val, "file": rel_path})
        # Deduplicate
        seen = set()
        unique: list[dict] = []
        for r in routes:
            key = (r["method"], r["path"])
            if key not in seen:
                seen.add(key)
                unique.append(r)
        return unique[:100]  # cap at 100 routes

    def _detect_entry_points(self, file_tree: list[str], file_contents: dict[str, str]) -> dict[str, Any]:
        entry: dict[str, Any] = {}

        # Backend entry points
        for candidate in ["app/main.py", "main.py", "app.py", "server.py", "index.py", "src/main.py", "src/app.py"]:
            if candidate in file_tree:
                entry["backend"] = candidate
                break

        # Frontend entry points
        for candidate in ["app/frontend/src/main.jsx", "app/frontend/src/main.tsx",
                          "src/main.jsx", "src/main.tsx", "src/index.js", "src/index.ts",
                          "pages/index.tsx", "pages/index.js"]:
            if candidate in file_tree:
                entry["frontend"] = candidate
                break

        # Package.json main/scripts
        pkg_json = file_contents.get("package.json")
        if pkg_json:
            try:
                pkg = json.loads(pkg_json)
                if "scripts" in pkg:
                    entry["npm_scripts"] = pkg["scripts"]
                if "main" in pkg:
                    entry["node_main"] = pkg["main"]
            except Exception:
                pass

        return entry

    def _summarize_directory_structure(self, file_tree: list[str]) -> list[dict]:
        """Return top-level directory listing with file counts."""
        dirs: dict[str, int] = {}
        top_files: list[str] = []
        for path in file_tree:
            parts = Path(path).parts
            if len(parts) == 1:
                top_files.append(parts[0])
            else:
                top_dir = parts[0]
                dirs[top_dir] = dirs.get(top_dir, 0) + 1
        result = [{"type": "file", "name": f} for f in sorted(top_files)]
        result += [{"type": "directory", "name": d, "file_count": c} for d, c in sorted(dirs.items())]
        return result
