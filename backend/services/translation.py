from transformers import pipeline

class TranslationService:
    _instance = None
    _models = {}
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def _get_pipeline(self, source_lang: str, target_lang: str):
        key = f"{source_lang}-{target_lang}"
        if key not in self._models:
            model_name = f"Helsinki-NLP/opus-mt-{source_lang}-{target_lang}"
            self._models[key] = pipeline("translation", model=model_name)
        return self._models[key]
    
    def translate(self, text: str, source_lang: str, target_lang: str) -> str:
        pipe = self._get_pipeline(source_lang, target_lang)
        result = pipe(text, max_length=512)
        return result[0]["translation_text"]