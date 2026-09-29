"""Small, dependency-free evaluation metrics for retrieval systems."""
from __future__ import annotations

from statistics import quantiles
from typing import Iterable, Sequence


def hit_rate(retrieved: Sequence[str], relevant: set[str], k: int) -> float:
    return float(bool(set(retrieved[:k]) & relevant))


def recall_at_k(retrieved: Sequence[str], relevant: set[str], k: int) -> float:
    if not relevant:
        return 0.0
    return len(set(retrieved[:k]) & relevant) / len(relevant)


def precision_at_k(retrieved: Sequence[str], relevant: set[str], k: int) -> float:
    if k <= 0:
        return 0.0
    return len(set(retrieved[:k]) & relevant) / k


def reciprocal_rank(retrieved: Sequence[str], relevant: set[str]) -> float:
    for rank, item in enumerate(retrieved, 1):
        if item in relevant:
            return 1.0 / rank
    return 0.0


def mrr(results: Iterable[tuple[Sequence[str], set[str]]]) -> float:
    rows = list(results)
    return sum(reciprocal_rank(items, relevant) for items, relevant in rows) / len(rows) if rows else 0.0


def percentile_ms(values: Sequence[float], percentile: float) -> float:
    if not values:
        return 0.0
    if len(values) == 1:
        return float(values[0])
    return float(quantiles(values, n=100, method="inclusive")[int(percentile) - 1])


def summarize(rows: list[dict], k: int = 5) -> dict:
    pairs = [
        (row["retrieved"], set(row["relevant"]))
        for row in rows
        if row.get("retrieved") is not None
    ]
    latencies = [float(row["latency_ms"]) for row in rows if "latency_ms" in row]
    return {
        f"hit_rate@{k}": sum(hit_rate(a, b, k) for a, b in pairs) / len(pairs) if pairs else 0.0,
        f"recall@{k}": sum(recall_at_k(a, b, k) for a, b in pairs) / len(pairs) if pairs else 0.0,
        f"precision@{k}": sum(precision_at_k(a, b, k) for a, b in pairs) / len(pairs) if pairs else 0.0,
        "mrr": mrr(pairs),
        "latency_p50_ms": percentile_ms(latencies, 50),
        "latency_p95_ms": percentile_ms(latencies, 95),
    }
