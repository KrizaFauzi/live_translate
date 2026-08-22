import torch

def get_device_config() -> tuple[str, str]:
    """Return (device, compute_type) for faster-whisper based on hardware."""
    if torch.cuda.is_available():
        return "cuda", "float16"
    return "cpu", "int8"