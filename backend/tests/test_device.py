import pytest

def test_get_device_config_returns_tuple():
    from utils.device import get_device_config
    result = get_device_config()
    assert isinstance(result, tuple)
    assert len(result) == 2
    device, compute_type = result
    assert device in ("cuda", "cpu")
    assert compute_type in ("float16", "int8")