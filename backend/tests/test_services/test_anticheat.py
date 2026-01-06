from backend.app.services.anticheat import AntiCheatService


def test_is_suspicious_pattern_detects_repeated_intervals():
    actions = [
        {"t": 1}, {"t": 5}, {"t": 9}, {"t": 13}, {"t": 17}, {"t": 21},
        {"t": 25}, {"t": 29}, {"t": 33}, {"t": 37}, {"t": 41}, {"t": 45},
        {"t": 49}
    ]
    assert AntiCheatService.is_suspicious_pattern(actions) is True


def test_is_suspicious_pattern_allows_varied_intervals():
    actions = [{"t": 1}, {"t": 3}, {"t": 8}, {"t": 14}, {"t": 23}]
    assert AntiCheatService.is_suspicious_pattern(actions) is False
