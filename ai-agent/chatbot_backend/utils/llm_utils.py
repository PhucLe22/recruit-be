# llm_utils.py
import logging
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

# Configure logging
logger = logging.getLogger(__name__)

# ——————————————————————————————————————————————————————
# Global caches
# ——————————————————————————————————————————————————————
_HF_CACHE = {}
_GEMINI_INIT = set()

def get_hf_model(model_name: str):
    """
    Returns (tokenizer, model), loading & caching them on first call.
    """
    if model_name not in _HF_CACHE:
        try:
            # Try to load with GPU first
            device = "cuda" if torch.cuda.is_available() else "cpu"
            tokenizer = AutoTokenizer.from_pretrained(model_name)
            
            # For smaller models, we can use CPU if needed
            if device == "cpu":
                model = AutoModelForCausalLM.from_pretrained(
                    model_name,
                    torch_dtype=torch.float32
                )
            else:
                model = AutoModelForCausalLM.from_pretrained(
                    model_name,
                    torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32,
                    device_map="auto" if torch.cuda.is_available() else None
                )
            
            if device == "cpu":
                model = model.to(device)
                
            _HF_CACHE[model_name] = (tokenizer, model)
            
        except Exception as e:
            logger.error(f"Error loading model {model_name}: {str(e)}")
            raise
            
    return _HF_CACHE[model_name]

def init_gemini(model_name: str, api_key: str):
    """
    Configures google.generativeai once per api_key, then returns
    a GenerativeModel handle.
    """
    import google.generativeai as genai

    if api_key not in _GEMINI_INIT:
        genai.configure(api_key=api_key)
        _GEMINI_INIT.add(api_key)

    return genai.GenerativeModel(model_name=model_name)
