# Task 1: Backend - Device Detection Utility

## Files
- Create: `backend/utils/device.py`
- Create: `backend/utils/__init__.py`
- Test: `backend/tests/test_device.py`

## Interfaces
- Produces: `get_device_config() -> tuple[str, str]` (device, compute_type)

## Steps

### Step 1: Write the failing test

```python
# backend/tests/test_device.py
import pytest

def test_get_device_config_returns_tuple():
    from utils.device import get_device_config
    result = get_device_config()
    assert isinstance(result, tuple)
    assert len(result) == 2
    device, compute_type = result
    assert device in ("cuda", "cpu")
    assert compute_type in ("float16", "int8")
```

### Step 2: Run test to verify it fails

Run: `pytest backend/tests/test_device.py -v`
Expected: FAIL - module not found

### Step 3: Write minimal implementation

```python
# backend/utils/device.py
import torch

def get_device_config() -> tuple[str, str]:
    """Return (device, compute_type) for faster-whisper based on hardware."""
    if torch.cuda.is_available():
        return "cuda", "float16"
    return "cpu", "int8"
```

### Step 4: Run test to verify it passes

Run: `pytest backend/tests/test_device.py -v`
Expected: PASS

### Step 5: Commit

```bash
git add backend/utils/device.py backend/utils/__init__.py backend/tests/test_device.py
git commit -m "feat: add device detection utility"
```

## Global Constraints
- Backend port: 8000 internal, 8008 external
- Frontend port: 3005 (internal and external)
- STT: faster-whisper tiny model, beam_size=5, device auto-detect (cuda/float16 or cpu/int8)
- Translation: Helsinki-NLP/opus-mt-id-en and opus-mt-en-id
- Temp audio files cleaned up after processing
- No external API calls except model downloads on first run
- CORS: allow all origins