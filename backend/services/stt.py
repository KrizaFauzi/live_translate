from faster_whisper import WhisperModel
from utils.device import get_device_config

class STTService:
    _instance = None
    _model = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def _load_model(self):
        if self._model is None:
            device, compute_type = get_device_config()
            self._model = WhisperModel("tiny", device=device, compute_type=compute_type)
    
    def transcribe(self, audio_path: str) -> tuple[str, str]:
        self._load_model()
        segments, info = self._model.transcribe(audio_path, beam_size=5)
        text = " ".join([seg.text for seg in segments])
        return text.strip(), info.language