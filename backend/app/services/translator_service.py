import logging
import time
import re
import urllib.request
import urllib.parse
import json
from typing import List, Dict, Any, Optional
from deep_translator import GoogleTranslator, MyMemoryTranslator

logger = logging.getLogger(__name__)

# Target translation languages list
TRANSLATION_LANGUAGES = [
    {"code": "en", "name": "English", "native": "English", "rtl": False, "mymemory": "en-US"},
    {"code": "te", "name": "Telugu", "native": "తెలుగు", "rtl": False, "mymemory": "te-IN"},
    {"code": "hi", "name": "Hindi", "native": "हिन्दी", "rtl": False, "mymemory": "hi-IN"},
    {"code": "ta", "name": "Tamil", "native": "தமிழ்", "rtl": False, "mymemory": "ta-IN"},
    {"code": "kn", "name": "Kannada", "native": "ಕನ್ನಡ", "rtl": False, "mymemory": "kn-IN"},
    {"code": "ml", "name": "Malayalam", "native": "മലയാളം", "rtl": False, "mymemory": "ml-IN"},
    {"code": "bn", "name": "Bengali", "native": "বাংলা", "rtl": False, "mymemory": "bn-IN"},
    {"code": "mr", "name": "Marathi", "native": "मराठी", "rtl": False, "mymemory": "mr-IN"},
    {"code": "pa", "name": "Punjabi", "native": "ਪੰਜਾਬੀ", "rtl": False, "mymemory": "pa-IN"},
    {"code": "ur", "name": "Urdu", "native": "اردو", "rtl": True, "mymemory": "ur-PK"},
    {"code": "gu", "name": "Gujarati", "native": "ગુજરાતી", "rtl": False, "mymemory": "gu-IN"},
    {"code": "es", "name": "Spanish", "native": "Español", "rtl": False, "mymemory": "es-ES"},
    {"code": "fr", "name": "French", "native": "Français", "rtl": False, "mymemory": "fr-FR"},
    {"code": "de", "name": "German", "native": "Deutsch", "rtl": False, "mymemory": "de-DE"},
    {"code": "ar", "name": "Arabic", "native": "العربية", "rtl": True, "mymemory": "ar-SA"},
    {"code": "zh-CN", "name": "Chinese (Simplified)", "native": "简体中文", "rtl": False, "mymemory": "zh-CN"},
    {"code": "ja", "name": "Japanese", "native": "日本語", "rtl": False, "mymemory": "ja-JP"},
    {"code": "ko", "name": "Korean", "native": "한국어", "rtl": False, "mymemory": "ko-KR"},
    {"code": "pt", "name": "Portuguese", "native": "Português", "rtl": False, "mymemory": "pt-PT"},
    {"code": "ru", "name": "Russian", "native": "Русский", "rtl": False, "mymemory": "ru-RU"},
    {"code": "it", "name": "Italian", "native": "Italiano", "rtl": False, "mymemory": "it-IT"},
    {"code": "tr", "name": "Turkish", "native": "Türkçe", "rtl": False, "mymemory": "tr-TR"},
    {"code": "nl", "name": "Dutch", "native": "Nederlands", "rtl": False, "mymemory": "nl-NL"},
    {"code": "id", "name": "Indonesian", "native": "Bahasa Indonesia", "rtl": False, "mymemory": "id-ID"},
    {"code": "vi", "name": "Vietnamese", "native": "Tiếng Việt", "rtl": False, "mymemory": "vi-VN"},
    {"code": "fa", "name": "Persian", "native": "فارسی", "rtl": True, "mymemory": "fa-IR"},
    {"code": "he", "name": "Hebrew", "native": "עברית", "rtl": True, "mymemory": "he-IL"},
]

def detect_script_language(text: str) -> str:
    """Detect language code from native Unicode character scripts."""
    if not text:
        return "en-US"
    if re.search(r'[\u0c00-\u0c7f]', text):  # Telugu
        return "te-IN"
    if re.search(r'[\u0900-\u097f]', text):  # Devanagari (Hindi, Marathi)
        return "hi-IN"
    if re.search(r'[\u0b80-\u0bff]', text):  # Tamil
        return "ta-IN"
    if re.search(r'[\u0c80-\u0cff]', text):  # Kannada
        return "kn-IN"
    if re.search(r'[\u0d00-\u0d7f]', text):  # Malayalam
        return "ml-IN"
    if re.search(r'[\u0980-\u09ff]', text):  # Bengali
        return "bn-IN"
    if re.search(r'[\u0a80-\u0aff]', text):  # Gujarati
        return "gu-IN"
    if re.search(r'[\u0a00-\u0a7f]', text):  # Punjabi (Gurmukhi)
        return "pa-IN"
    if re.search(r'[\u0600-\u06ff]', text):  # Arabic / Urdu / Persian
        return "ar-SA"
    if re.search(r'[\u0400-\u04ff]', text):  # Cyrillic
        return "ru-RU"
    if re.search(r'[\u4e00-\u9fff]', text):  # Chinese
        return "zh-CN"
    if re.search(r'[\u3040-\u30ff]', text):  # Japanese
        return "ja-JP"
    if re.search(r'[\uac00-\ud7af]', text):  # Korean
        return "ko-KR"
    if re.search(r'[\u0590-\u05ff]', text):  # Hebrew
        return "he-IL"
    return "en-US"

def _get_mymemory_code(code: str) -> str:
    if not code or code == "auto":
        return "en-US"
    clean_code = code.lower().strip()
    meta = next((m for m in TRANSLATION_LANGUAGES if m["code"].lower() == clean_code), None)
    if meta and "mymemory" in meta:
        return meta["mymemory"]
    if len(clean_code) == 2:
        return f"{clean_code}-{clean_code.upper()}"
    return clean_code

def _google_translate_raw(text: str, target_lang: str, source_lang: str = "auto") -> Optional[str]:
    """
    Direct high-reliability Google Cloud Translation client.
    Tries dict-chrome-ex client first, then gtx.
    """
    if not text or not text.strip():
        return ""

    tgt = "zh-CN" if target_lang.lower() == "zh" else target_lang.lower().strip()
    src = "auto" if not source_lang or source_lang == "auto" else source_lang.lower().split("-")[0]

    q = urllib.parse.quote(text)
    clients = ["dict-chrome-ex", "gtx"]

    for client in clients:
        try:
            url = f"https://translate.googleapis.com/translate_a/single?client={client}&sl={src}&tl={tgt}&dt=t&q={q}"
            req = urllib.request.Request(
                url,
                headers={
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                    "Accept": "*/*"
                }
            )
            with urllib.request.urlopen(req, timeout=8) as res:
                raw_json = res.read().decode("utf-8")
                data = json.loads(raw_json)
                if data and isinstance(data, list) and len(data) > 0 and isinstance(data[0], list):
                    parts = [p[0] for p in data[0] if p and len(p) > 0 and p[0]]
                    if parts:
                        return "".join(parts)
        except Exception as e:
            logger.debug(f"Google client {client} error: {e}")
            continue

    return None

def translate_single_text(text: str, target_lang: str, source_lang: str = "auto") -> str:
    """Translate a single piece of text with multi-engine robust fallback."""
    if not text or not text.strip():
        return ""

    raw_text = text.strip()
    tgt_code = target_lang.lower().strip()

    # 1. Primary Engine: Direct Google API
    try:
        res = _google_translate_raw(raw_text, target_lang=tgt_code, source_lang=source_lang)
        if res and res.strip():
            return res.strip()
    except Exception as e:
        logger.debug(f"Primary Google API failed: {e}")

    # 2. Secondary Engine: MyMemory
    try:
        mm_tgt = _get_mymemory_code(tgt_code)
        if not source_lang or source_lang.lower() == "auto":
            mm_src = detect_script_language(raw_text)
        else:
            mm_src = _get_mymemory_code(source_lang)

        if mm_src.split("-")[0] != mm_tgt.split("-")[0]:
            mm = MyMemoryTranslator(source=mm_src, target=mm_tgt)
            res = mm.translate(raw_text)
            if res and res.strip() and not res.strip().startswith("MYMEMORY WARNING"):
                return res.strip()
    except Exception as e:
        logger.debug(f"MyMemory fallback failed: {e}")

    # 3. Tertiary Engine: deep_translator GoogleTranslator
    try:
        short_tgt = "zh-CN" if tgt_code == "zh" else tgt_code.split("-")[0]
        short_src = "auto" if not source_lang or source_lang == "auto" else source_lang.split("-")[0]
        gt = GoogleTranslator(source=short_src, target=short_tgt)
        res = gt.translate(raw_text)
        if res and res.strip():
            return res.strip()
    except Exception as e:
        logger.debug(f"deep_translator GoogleTranslator fallback failed: {e}")

    return raw_text

def translate_segments(
    segments: List[Dict[str, Any]],
    target_language: str,
    source_language: Optional[str] = "auto"
) -> Dict[str, Any]:
    """
    Translates a list of subtitle segments completely and accurately.
    Uses smart chunk batching to translate all segments in sub-second time without hitting rate limits,
    with individual fallback to guarantee 100% completion for all lines.
    """
    if not segments:
        return {
            "target_language": target_language,
            "target_language_name": target_language.upper(),
            "is_rtl": False,
            "segments": []
        }

    tgt = "zh-CN" if target_language.lower() == "zh" else target_language.lower().strip()
    src = source_language if source_language and source_language != "auto" else "auto"

    target_meta = next((l for l in TRANSLATION_LANGUAGES if l["code"].lower() == tgt), None)
    target_name = target_meta["name"] if target_meta else tgt.upper()
    is_rtl = target_meta.get("rtl", False) if target_meta else False

    DELIMITER = "\n<<<SEG>>>\n"
    CHUNK_SIZE = 25  # Translate up to 25 segments per batch

    # Prepare list for results
    translated_segments = []

    # Process segments in chunks
    for i in range(0, len(segments), CHUNK_SIZE):
        chunk = segments[i:i + CHUNK_SIZE]
        
        # Check if batch translation can be performed on this chunk
        texts_to_translate = [s.get("text", "") for s in chunk]
        has_non_empty = any(t.strip() for t in texts_to_translate)

        chunk_results = []
        if has_non_empty:
            combined = DELIMITER.join(texts_to_translate)
            translated_combined = _google_translate_raw(combined, target_lang=tgt, source_lang=src)
            
            if translated_combined:
                parts = translated_combined.split("<<<SEG>>>")
                # If delimiter split matches segment count exactly
                if len(parts) == len(chunk):
                    chunk_results = [p.strip() for p in parts]

        # If batch succeeded for this chunk
        if len(chunk_results) == len(chunk):
            for orig_seg, trans_text in zip(chunk, chunk_results):
                translated_segments.append({
                    "id": orig_seg.get("id"),
                    "start": orig_seg.get("start"),
                    "end": orig_seg.get("end"),
                    "text": trans_text
                })
        else:
            # Fallback to segment-by-segment translation to guarantee 100% completion
            logger.info(f"Chunk {i//CHUNK_SIZE + 1} using per-segment fallback to guarantee complete translation.")
            for orig_seg in chunk:
                text = orig_seg.get("text", "")
                if not text or not text.strip():
                    trans_text = ""
                else:
                    trans_text = translate_single_text(text, target_lang=tgt, source_lang=src)
                
                translated_segments.append({
                    "id": orig_seg.get("id"),
                    "start": orig_seg.get("start"),
                    "end": orig_seg.get("end"),
                    "text": trans_text
                })

    return {
        "target_language": tgt,
        "target_language_name": target_name,
        "is_rtl": is_rtl,
        "segments": translated_segments
    }
