import re
import logging
import threading
from typing import Dict, Any, List, Optional, Callable
from pathlib import Path
from faster_whisper import WhisperModel

from app.config import DEFAULT_WHISPER_MODEL, DEFAULT_DEVICE, DEFAULT_COMPUTE_TYPE

logger = logging.getLogger(__name__)

# Model cache to avoid reloading heavy weights on every request
_MODEL_CACHE: Dict[str, WhisperModel] = {}
_MODEL_LOCK = threading.Lock()

# Mapping of Whisper language codes to display names and script directions
LANGUAGE_METADATA: Dict[str, Dict[str, Any]] = {
    "auto": {"name": "Auto Detect Language", "native": "Auto Detect", "rtl": False},
    "te": {"name": "Telugu", "native": "తెలుగు", "rtl": False},
    "en": {"name": "English", "native": "English", "rtl": False},
    "hi": {"name": "Hindi", "native": "हिन्दी", "rtl": False},
    "ta": {"name": "Tamil", "native": "தமிழ்", "rtl": False},
    "kn": {"name": "Kannada", "native": "ಕನ್ನಡ", "rtl": False},
    "ml": {"name": "Malayalam", "native": "മലയാളം", "rtl": False},
    "bn": {"name": "Bengali", "native": "বাংলা", "rtl": False},
    "mr": {"name": "Marathi", "native": "मराठी", "rtl": False},
    "pa": {"name": "Punjabi", "native": "ਪੰਜਾਬੀ", "rtl": False},
    "ur": {"name": "Urdu", "native": "اردو", "rtl": True},
    "gu": {"name": "Gujarati", "native": "ગુજરાતી", "rtl": False},
    "ar": {"name": "Arabic", "native": "العربية", "rtl": True},
    "es": {"name": "Spanish", "native": "Español", "rtl": False},
    "fr": {"name": "French", "native": "Français", "rtl": False},
    "de": {"name": "German", "native": "Deutsch", "rtl": False},
    "zh": {"name": "Chinese", "native": "中文", "rtl": False},
    "ja": {"name": "Japanese", "native": "日本語", "rtl": False},
    "ko": {"name": "Korean", "native": "한국어", "rtl": False},
    "pt": {"name": "Portuguese", "native": "Português", "rtl": False},
    "ru": {"name": "Russian", "native": "Русский", "rtl": False},
    "it": {"name": "Italian", "native": "Italiano", "rtl": False},
    "tr": {"name": "Turkish", "native": "Türkçe", "rtl": False},
    "nl": {"name": "Dutch", "native": "Nederlands", "rtl": False},
    "id": {"name": "Indonesian", "native": "Bahasa Indonesia", "rtl": False},
    "vi": {"name": "Vietnamese", "native": "Tiếng Việt", "rtl": False},
    "th": {"name": "Thai", "native": "ไทย", "rtl": False},
    "fa": {"name": "Persian", "native": "فارسی", "rtl": True},
    "he": {"name": "Hebrew", "native": "עברית", "rtl": True},
    "pl": {"name": "Polish", "native": "Polski", "rtl": False},
    "uk": {"name": "Ukrainian", "native": "Українська", "rtl": False},
    "el": {"name": "Greek", "native": "Ελληνικά", "rtl": False},
    "sv": {"name": "Swedish", "native": "Svenska", "rtl": False},
    "cs": {"name": "Czech", "native": "Čeština", "rtl": False},
    "ro": {"name": "Romanian", "native": "Română", "rtl": False},
    "hu": {"name": "Hungarian", "native": "Magyar", "rtl": False},
    "da": {"name": "Danish", "native": "Dansk", "rtl": False},
    "fi": {"name": "Finnish", "native": "Suomi", "rtl": False},
    "no": {"name": "Norwegian", "native": "Norsk", "rtl": False},
    "ms": {"name": "Malay", "native": "Bahasa Melayu", "rtl": False},
    "ne": {"name": "Nepali", "native": "नेपाली", "rtl": False},
    "si": {"name": "Sinhala", "native": "සිංහල", "rtl": False},
    "my": {"name": "Burmese", "native": "မြန်မာ", "rtl": False},
    "km": {"name": "Khmer", "native": "ខ្មែរ", "rtl": False},
    "am": {"name": "Amharic", "native": "አማርኛ", "rtl": False},
    "sw": {"name": "Swahili", "native": "Kiswahili", "rtl": False},
    "tl": {"name": "Tagalog / Filipino", "native": "Filipino", "rtl": False},
    "as": {"name": "Assamese", "native": "অসমীয়া", "rtl": False},
    "or": {"name": "Odia", "native": "ଓଡ଼ିଆ", "rtl": False},
    "af": {"name": "Afrikaans", "native": "Afrikaans", "rtl": False},
    "ca": {"name": "Catalan", "native": "Català", "rtl": False},
    "hr": {"name": "Croatian", "native": "Hrvatski", "rtl": False},
    "sr": {"name": "Serbian", "native": "Српски", "rtl": False},
    "bg": {"name": "Bulgarian", "native": "Български", "rtl": False},
    "sk": {"name": "Slovak", "native": "Slovenčina", "rtl": False},
    "sl": {"name": "Slovenian", "native": "Slovenščina", "rtl": False},
    "lt": {"name": "Lithuanian", "native": "Lietuvių", "rtl": False},
    "lv": {"name": "Latvian", "native": "Latviešu", "rtl": False},
    "et": {"name": "Estonian", "native": "Eesti", "rtl": False},
}

# Priming prompts for Whisper to enforce correct orthography, spelling, technical terms, and punctuation
LANGUAGE_PROMPTS: Dict[str, str] = {
    "te": "నమస్కారం! ఇది స్పష్టమైన తెలుగు సంభాషణ. దయచేసి సరైన తెలుగు వ్యాకరణం, స్పెల్లింగ్ మరియు పదబంధాలతో రాయండి: హాయ్, నేను, మీరు, నేర్చుకోవాలి, పైథాన్, SQL, కోడింగ్, సాఫ్ట్‌వేర్, డేటాబేస్, ప్రాజెక్ట్, ప్రశ్నలు.",
    "hi": "नमस्ते! यह हिन्दी भाषा की स्पष्ट बातचीत है। कृपया सही हिन्दी वर्तनी, पूर्ण विराम और व्याकरण के साथ लिखें: हाय, मैं, आप, सीखना, पाइथन, एसक्यूएल, कोडिंग, सॉफ्टवेयर, डेटाबेस।",
    "ta": "வணக்கம்! இது தெளிவான தமிழ் உரையாடல். சரியான தமிழ் எழுத்துப்பிழையின்றி எழுதுக: பைதான், எஸ்.க்யூ.எல், மென்பொருள், நிரலாக்கம்.",
    "kn": "ನಮಸ್ಕಾರ! ಇದು ಸ್ಪಷ್ಟವಾದ ಕನ್ನಡ ಸಂಭಾಷಣೆ. ಸರಿಯಾದ ಕನ್ನಡ ಕಾಗುಣಿತದೊಂದಿಗೆ ಬರೆಯಿರಿ: ಪೈಥಾನ್, ಕೋಡಿಂಗ್, ಸಾಫ್ಟ್‌ವೇರ್.",
    "ml": "നമസ്കാരം! ഇത് വ്യക്തമായ മലയാളം സംഭാഷണമാണ്. ശരിയായ അക്ഷരവിന്യാസത്തിലും വ്യാകരണത്തിലും എഴുതുക.",
    "es": "Hola y bienvenido. Transcripción en español con ortografía impecable, tildes, signos de puntuación y términos técnicos correctos: Python, SQL, software, base de datos.",
    "en": "Proper capitalization, correct spelling, punctuation, and clear technical terminology: Python, SQL, JavaScript, React, software, database, API."
}

# Rule-based phonetic & technical spell correction dictionary
COMMON_SPELLING_FIXES = [
    # Technical & Developer Terms
    (r"\b(?:python|pythun|pythan|pithon|pyton)\b", "Python"),
    (r"\b(?:sql|esquel|esql|sq\s*l)\b", "SQL"),
    (r"\b(?:javascript|javascrip|jawascript|jscript)\b", "JavaScript"),
    (r"\b(?:sofware|softwere|soffware)\b", "software"),
    (r"\b(?:databse|data base)\b", "database"),
    (r"\b(?:subtital|subtitel|subtitele|subtitels)\b", "subtitles"),
    (r"\b(?:vedio|vidio)\b", "video"),
    (r"\b(?:youtube|youtub)\b", "YouTube"),
    (r"\b(?:github|git hub)\b", "GitHub"),
    (r"\b(?:frontend|front end)\b", "Frontend"),
    (r"\b(?:backend|back end)\b", "Backend"),
    (r"\b(?:api's|apis)\b", "APIs"),
    
    # Common English spelling corrections
    (r"\b(?:recieve|recieved|recieving)\b", lambda m: m.group(0).replace("ie", "ei")),
    (r"\bseperate\b", "separate"),
    (r"\bseperately\b", "separately"),
    (r"\bdefinately\b", "definitely"),
    (r"\boccured\b", "occurred"),
    (r"\buntill\b", "until"),
    (r"\balot\b", "a lot"),
    (r"\btrancribe\b", "transcribe"),
    (r"\btrancription\b", "transcription"),
    (r"\bteh\b", "the"),
    (r"\bwhta\b", "what"),
    
    # English Grammar: Pronouns, Contractions & Common Slips
    (r"\bi\b", "I"),
    (r"\b(?:im|i'm)\b", "I'm"),
    (r"\b(?:dont|don't)\b", "don't"),
    (r"\b(?:cant|can't)\b", "can't"),
    (r"\b(?:wont|won't)\b", "won't"),
    (r"\b(?:didnt|didn't)\b", "didn't"),
    (r"\b(?:doesnt|doesn't)\b", "doesn't"),
    (r"\b(?:isnt|isn't)\b", "isn't"),
    (r"\b(?:arent|aren't)\b", "aren't"),
    (r"\b(?:wasnt|wasn't)\b", "wasn't"),
    (r"\b(?:werent|weren't)\b", "weren't"),
    (r"\b(?:youre|you're)\b", "you're"),
    (r"\b(?:theyre|they're)\b", "they're"),
    (r"\b(?:weve|we've)\b", "we've"),
    (r"\b(?:youve|you've)\b", "you've"),
    (r"\b(?:theyve|they've)\b", "they've"),
    (r"\bcould of\b", "could have"),
    (r"\bshould of\b", "should have"),
    (r"\bwould of\b", "would have"),
    (r"\btheir is\b", "there is"),
    (r"\btheir are\b", "there are"),
    
    # Telugu phonetic code-switching corrections when rendered in Latin or transliterated
    (r"\bnaino\b", "nenu"),
    (r"\bharita\b", "Haritha"),
    (r"\bnage\s*ko\s*ali\b", "nerchukovali"),
    (r"\bnagekoali\b", "nerchukovali"),
    (r"\bhai\b", "Hi"),
    (r"\bnamaskaram\b", "Namaskaram"),
    (r"\bdhanyavadalu\b", "Dhanyavadalu"),
    (r"\bbagunara\b", "bagunnara"),
    (r"\bchesko\b", "chesuko"),
    (r"\bmatladtharu\b", "matladatharu"),
    (r"\bkanipisthundi\b", "kanipistundi"),
    (r"\bchoodandi\b", "chudandi"),
    (r"\bavuthundi\b", "avutundi"),
    (r"\bendhuku\b", "enduku"),
    (r"\beppudu\b", "ippudu"),
]

def correct_common_spelling_mistakes(text: str, lang: Optional[str] = None) -> str:
    """Correct frequent phonetic slips, grammar errors, technical terms, and punctuation."""
    if not text:
        return text

    corrected = text.strip()

    # 1. Remove duplicate adjacent words (e.g., "the the" -> "the")
    corrected = re.sub(r'\b(\w+)\s+\1\b', r'\1', corrected, flags=re.IGNORECASE)

    # 2. Apply grammar and spelling rules
    for pattern, replacement in COMMON_SPELLING_FIXES:
        corrected = re.sub(pattern, replacement, corrected, flags=re.IGNORECASE)

    # 3. Clean double spaces and punctuation spacing
    corrected = re.sub(r'\s+', ' ', corrected)
    corrected = re.sub(r'\s+([,.:;?!])', r'\1', corrected)
    corrected = re.sub(r'([,.:;?!])([^\s\d"\'”’\)\]])', r'\1 \2', corrected)

    # 4. Sentence capitalization for Latin scripts
    if corrected and not re.match(r'^[^\x00-\x7F]', corrected):
        corrected = corrected[0].upper() + corrected[1:]
        corrected = re.sub(r'([.?!]\s+)([a-z])', lambda m: m.group(1) + m.group(2).upper(), corrected)

    return corrected.strip()

def format_and_diarize_segments(raw_segments: List[Dict[str, Any]], max_chars_per_line: int = 48, lang: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Apply speaker alternation based on natural speech pauses (> 1.6s)
    and format readable sentence breaks respecting punctuation and script conventions.
    """
    formatted = []
    current_speaker = 1
    last_end = 0.0

    for idx, seg in enumerate(raw_segments):
        raw_text = str(seg.get("text", "")).strip()
        if not raw_text:
            continue

        # Apply AI spell & grammar correction
        text = correct_common_spelling_mistakes(raw_text, lang)

        start = float(seg.get("start", 0.0))
        end = float(seg.get("end", start + 1.0))

        # Detect speaker change upon long pause (> 1.6 seconds)
        if idx > 0 and (start - last_end) > 1.6:
            current_speaker = 2 if current_speaker == 1 else 1
        last_end = end

        # Sentence / readable line break if text is longer than max_chars_per_line
        if len(text) > max_chars_per_line and "\n" not in text:
            # Prefer breaking at sentence punctuation: comma, period, question mark, dash, or whitespace
            split_points = [m.start() for m in re.finditer(r'[,.?!;:—\s]', text)]
            target = len(text) // 2
            best_point = min(split_points, key=lambda p: abs(p - target)) if split_points else -1
            if best_point > 8 and best_point < len(text) - 8:
                text = text[:best_point].rstrip() + "\n" + text[best_point:].lstrip(",.?!;: \t")

        formatted.append({
            "id": idx + 1,
            "start": round(start, 2),
            "end": round(max(start + 0.8, end), 2),
            "text": text,
            "speaker": f"Speaker {current_speaker}",
            "words": seg.get("words", [])
        })

    return formatted

def get_whisper_model(model_name: str = DEFAULT_WHISPER_MODEL) -> WhisperModel:
    """Retrieve cached Whisper model or instantiate a new one."""
    with _MODEL_LOCK:
        if model_name not in _MODEL_CACHE:
            logger.info(f"Loading faster-whisper model '{model_name}' on {DEFAULT_DEVICE} ({DEFAULT_COMPUTE_TYPE})...")
            _MODEL_CACHE[model_name] = WhisperModel(
                model_name,
                device=DEFAULT_DEVICE,
                compute_type=DEFAULT_COMPUTE_TYPE,
                cpu_threads=4,
                num_workers=2
            )
            logger.info(f"Whisper model '{model_name}' loaded successfully.")
        return _MODEL_CACHE[model_name]

def transcribe_audio(
    audio_path: Path,
    model_name: str = DEFAULT_WHISPER_MODEL,
    language: Optional[str] = None,
    total_duration: float = 0.0,
    progress_callback: Optional[Callable[[int, str], None]] = None
) -> Dict[str, Any]:
    """
    Transcribe audio file using faster-whisper with automatic language detection,
    timestamp synchronization, punctuation breaks, and speaker diarization.
    """
    if progress_callback:
        progress_callback(10, f"Loading AI model ({model_name})...")

    model = get_whisper_model(model_name)

    if progress_callback:
        progress_callback(25, "Detecting language and analyzing speech...")

    # Language parameter: None triggers automatic detection in Whisper
    target_lang = None
    if language and language.strip() and language.strip().lower() != "auto":
        target_lang = language.strip().lower()

    # Retrieve tailored primer prompt to guide correct vocabulary and spelling
    prompt = LANGUAGE_PROMPTS.get(target_lang or "en", "Clear speech with correct spelling, proper capitalization, and punctuation.")

    # Run transcription with beam search and initial prompt
    segments_gen, info = model.transcribe(
        str(audio_path),
        beam_size=5,
        best_of=5,
        language=target_lang,
        task="transcribe",
        initial_prompt=prompt,
        condition_on_previous_text=False,
        vad_filter=True,
        vad_parameters=dict(min_silence_duration_ms=400),
        word_timestamps=True
    )

    detected_lang = info.language
    lang_meta = LANGUAGE_METADATA.get(detected_lang, {
        "name": detected_lang.upper(),
        "native": detected_lang.upper(),
        "rtl": False
    })

    # Collect alternative candidate languages if available
    alt_languages = []
    if hasattr(info, "all_language_probs") and info.all_language_probs:
        sorted_probs = sorted(info.all_language_probs, key=lambda x: x[1], reverse=True)[:5]
        for l_code, l_prob in sorted_probs:
            l_meta = LANGUAGE_METADATA.get(l_code, {"name": l_code.upper(), "native": l_code.upper()})
            alt_languages.append({
                "code": l_code,
                "name": l_meta["name"],
                "native": l_meta.get("native", l_meta["name"]),
                "confidence": round(float(l_prob), 3)
            })

    logger.info(f"Detected language: {detected_lang} ({lang_meta['name']}) with probability {info.language_probability:.2f}")

    audio_duration = total_duration or info.duration or 1.0

    raw_segments = []
    seg_idx = 1

    for seg in segments_gen:
        text = seg.text.strip()
        if not text:
            continue

        words_data = []
        if hasattr(seg, "words") and seg.words:
            for w in seg.words:
                w_text = w.word.strip()
                if w_text:
                    words_data.append({
                        "word": w_text,
                        "start": round(w.start, 2),
                        "end": round(w.end, 2),
                        "probability": round(getattr(w, "probability", 1.0), 2)
                    })

        raw_segments.append({
            "id": seg_idx,
            "start": round(seg.start, 2),
            "end": round(seg.end, 2),
            "text": text,
            "words": words_data
        })

        if progress_callback and audio_duration > 0:
            # Scale progress between 30% and 92%
            pct = 30 + int((min(seg.end, audio_duration) / audio_duration) * 62)
            progress_callback(min(pct, 92), f"Transcribing ({len(raw_segments)} dialogue segments captured)...")

        seg_idx += 1

    if progress_callback:
        progress_callback(95, "Formatting synchronized subtitles & speaker tracks...")

    formatted_segments = format_and_diarize_segments(raw_segments, lang=detected_lang)

    return {
        "language": detected_lang,
        "language_name": lang_meta["name"],
        "language_native": lang_meta.get("native", lang_meta["name"]),
        "language_probability": round(info.language_probability, 3),
        "is_rtl": lang_meta.get("rtl", False),
        "alternative_languages": alt_languages,
        "duration": round(audio_duration, 2),
        "segments": formatted_segments
    }
