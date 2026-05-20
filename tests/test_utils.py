from environment.utils import clip, normalize, diversity_score, safe_divide, weighted_average, format_metrics


def test_clip_bounds() -> None:
    assert clip(-1.0, 0.0, 1.0) == 0.0
    assert clip(2.0, 0.0, 1.0) == 1.0
    assert clip(0.5, 0.0, 1.0) == 0.5


def test_normalize_degenerate_range() -> None:
    assert normalize(5.0, 2.0, 2.0) == 0.0
    assert normalize(5.0, 0.0, 10.0) == 0.5


def test_diversity_score_empty_history() -> None:
    score = diversity_score([], {"a": "type1"})
    assert score == 1.0


def test_diversity_score_uniform_and_diverse() -> None:
    mapping = {"a": "x", "b": "x", "c": "y"}
    assert diversity_score(["a", "b"], mapping) == 0.0001
    assert diversity_score(["a", "c"], mapping) > 0.0001


def test_safe_divide_and_weighted_average() -> None:
    assert safe_divide(1.0, 0.0) == 0.0
    assert safe_divide(3.0, 2.0) == 1.5
    assert weighted_average({"a": (0.8, 0.5), "b": (0.2, 0.5)}) == 0.5


def test_format_metrics_pretty_print() -> None:
    text = format_metrics({"trust": 0.5, "fatigue": 0.1}, indent=2)
    assert "trust" in text
    assert "fatigue" in text
