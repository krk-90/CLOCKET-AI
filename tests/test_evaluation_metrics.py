from evaluation.metrics import hit_rate, mrr, percentile_ms, precision_at_k, recall_at_k, reciprocal_rank


def test_retrieval_metrics():
    retrieved = ["a", "b", "c", "d"]
    relevant = {"b", "d"}
    assert hit_rate(retrieved, relevant, 3) == 1.0
    assert recall_at_k(retrieved, relevant, 3) == 0.5
    assert precision_at_k(retrieved, relevant, 4) == 0.5
    assert reciprocal_rank(retrieved, relevant) == 0.5
    assert mrr([(retrieved, relevant)]) == 0.5


def test_percentile():
    assert percentile_ms([10], 95) == 10
    assert percentile_ms([10, 20, 30, 40], 95) >= 30
