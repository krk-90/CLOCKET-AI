"""Evaluate Clocket AI's local retrieval path without calling an LLM."""
from __future__ import annotations

import json
import time
from pathlib import Path

from agent.rag.loading import chunk_documents, load_documents
from agent.rag.retriever.retrieval import LocalRetriever
from evaluation.metrics import summarize

BASE = Path(__file__).resolve().parent
DATASET = BASE / "clocket_rag_eval.json"
RESULTS = BASE / "clocket_rag_results.json"
ROOT = BASE.parent


def main() -> None:
    data = json.loads(DATASET.read_text(encoding="utf-8"))
    documents = load_documents([
        ROOT / "agent",
        ROOT / "app",
        ROOT / "mcp_server",
        ROOT / "llm_gateway",
    ])
    chunks = chunk_documents(documents, chunk_size=800, overlap=120)
    retriever = LocalRetriever(chunks)
    k = int(data["k"])
    rows = []

    for case in data["cases"]:
        started = time.perf_counter()
        docs = retriever.search(case["question"], limit=k)
        latency_ms = (time.perf_counter() - started) * 1000
        sources = [Path(item.chunk.source).name.lower() for item in docs]
        relevant = set(x.lower() for x in case["relevant"])
        labels = [
            expected
            for source in sources
            for expected in relevant
            if expected in source
        ]
        rows.append({
            "id": case["id"],
            "question": case["question"],
            "retrieved": labels,
            "retrieved_sources": sources,
            "relevant": sorted(relevant),
            "latency_ms": round(latency_ms, 2),
        })

    summary = summarize(rows, k=k)
    output = {"summary": summary, "cases": rows}
    RESULTS.write_text(json.dumps(output, indent=2), encoding="utf-8")
    print(json.dumps(summary, indent=2))
    print(f"Results: {RESULTS}")


if __name__ == "__main__":
    main()
