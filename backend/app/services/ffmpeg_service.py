import json
import logging
import subprocess
import os
from pathlib import Path
from typing import Dict, Any, Optional

from app.config import FFMPEG_BIN, FFPROBE_BIN, TEMP_DIR
from app.services.subtitle_service import segments_to_ass

logger = logging.getLogger(__name__)

class VideoValidationError(Exception):
    pass

class AudioExtractionError(Exception):
    pass

class SubtitleBurnError(Exception):
    pass

def get_video_info(video_path: Path) -> Dict[str, Any]:
    """
    Probe video using ffprobe to get duration, streams, resolution, and validate audio.
    Raises VideoValidationError if corrupted or invalid.
    """
    if not video_path.exists():
        raise VideoValidationError(f"Video file not found: {video_path}")

    cmd = [
        FFPROBE_BIN,
        "-v", "error",
        "-show_entries", "format=duration,size,bit_rate:stream=index,codec_type,codec_name,width,height,channels,sample_rate",
        "-of", "json",
        str(video_path)
    ]

    try:
        result = subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            check=True
        )
        info = json.loads(result.stdout)
    except subprocess.CalledProcessError as e:
        logger.error(f"FFprobe error: {e.stderr}")
        raise VideoValidationError(f"Invalid or corrupted video file. FFprobe error: {e.stderr.strip()}")
    except Exception as e:
        logger.error(f"Failed to probe video: {str(e)}")
        raise VideoValidationError(f"Failed to inspect video: {str(e)}")

    format_info = info.get("format", {})
    streams = info.get("streams", [])

    duration = float(format_info.get("duration", 0.0))
    file_size = int(format_info.get("size", 0))

    has_video = False
    has_audio = False
    width = 1920
    height = 1080
    video_codec = ""
    audio_codec = ""

    for s in streams:
        if s.get("codec_type") == "video" and not has_video:
            has_video = True
            width = int(s.get("width") or 1920)
            height = int(s.get("height") or 1080)
            video_codec = s.get("codec_name", "")
        elif s.get("codec_type") == "audio" and not has_audio:
            has_audio = True
            audio_codec = s.get("codec_name", "")

    if not has_video and not has_audio:
        raise VideoValidationError("File does not contain valid audio or video tracks.")

    return {
        "duration": duration,
        "size": file_size,
        "width": width,
        "height": height,
        "has_video": has_video,
        "has_audio": has_audio,
        "video_codec": video_codec,
        "audio_codec": audio_codec,
    }

def extract_audio(video_path: Path, output_wav_path: Path) -> Path:
    """
    Extract audio track to 16kHz mono WAV format optimized for Whisper.
    """
    output_wav_path.parent.mkdir(parents=True, exist_ok=True)

    cmd = [
        FFMPEG_BIN,
        "-y",
        "-i", str(video_path),
        "-vn",
        "-acodec", "pcm_s16le",
        "-ar", "16000",
        "-ac", "1",
        str(output_wav_path)
    ]

    try:
        result = subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            check=True
        )
        if not output_wav_path.exists() or output_wav_path.stat().st_size == 0:
            raise AudioExtractionError("Extracted audio file is empty or missing.")
        return output_wav_path
    except subprocess.CalledProcessError as e:
        err_msg = e.stderr.strip() if e.stderr else str(e)
        # Extract meaningful error lines instead of compiler banner
        lines = [l.strip() for l in err_msg.splitlines() if l.strip() and not l.strip().startswith(("built with", "configuration:", "ffmpeg version"))]
        clean_err = "\n".join(lines[-6:]) if lines else err_msg[:200]
        logger.error(f"FFmpeg audio extraction error: {clean_err}")
        raise AudioExtractionError(f"Failed to extract audio from video: {clean_err}")
    except Exception as e:
        logger.error(f"Unexpected audio extraction error: {str(e)}")
        raise AudioExtractionError(f"Unexpected audio extraction error: {str(e)}")

def burn_subtitles_to_video(
    video_path: Path,
    segments: list,
    output_video_path: Path,
    style_options: Optional[Dict[str, Any]] = None
) -> Path:
    """
    Burns subtitles permanently into video with user styling using ASS format.
    """
    style = style_options or {}
    font_family = style.get("fontFamily", "Arial")
    font_size = int(style.get("fontSize", 24))
    text_color = style.get("textColor", "#FFFFFF")
    bg_style = style.get("bgStyle", "outline")  # outline, box, transparent
    position = style.get("position", "bottom")   # bottom, top, middle
    outline_color = style.get("outlineColor", "#000000")
    bg_color = style.get("bgColor", "#000000")
    bg_opacity = float(style.get("bgOpacity", 0.6))

    # Probe video dimensions
    video_info = get_video_info(video_path)
    width = video_info.get("width", 1920)
    height = video_info.get("height", 1080)

    # Generate ASS file in TEMP_DIR
    temp_ass_path = TEMP_DIR / f"{video_path.stem}_burn.ass"
    ass_content = segments_to_ass(
        segments=segments,
        video_width=width,
        video_height=height,
        font_family=font_family,
        font_size=font_size,
        text_color=text_color,
        bg_style=bg_style,
        position=position,
        outline_color=outline_color,
        bg_color=bg_color,
        bg_opacity=bg_opacity
    )

    with open(temp_ass_path, "w", encoding="utf-8") as f:
        f.write(ass_content)

    output_video_path.parent.mkdir(parents=True, exist_ok=True)

    # In FFmpeg on Windows, filter graph file paths need forward slashes
    # and colon in drive letters escaped (e.g. C\\:/path/to/file.ass)
    ass_path_str = str(temp_ass_path.resolve()).replace("\\", "/")
    # Escape colon for ffmpeg filter: C: -> C\\:
    if ":" in ass_path_str:
        drive, rest = ass_path_str.split(":", 1)
        ass_path_str = f"{drive}\\:{rest}"

    vf_filter = f"ass='{ass_path_str}'"

    cmd = [
        FFMPEG_BIN,
        "-y",
        "-i", str(video_path),
        "-vf", vf_filter,
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "22",
        "-c:a", "aac",
        "-b:a", "192k",
        "-movflags", "+faststart",
        str(output_video_path)
    ]

    try:
        subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            check=True
        )
        if not output_video_path.exists() or output_video_path.stat().st_size == 0:
            raise SubtitleBurnError("Output burned video was not generated or is empty.")
        return output_video_path
    except subprocess.CalledProcessError as e:
        logger.error(f"FFmpeg subtitle burn failed: {e.stderr}")
        raise SubtitleBurnError(f"Failed to burn subtitles into video: {e.stderr.strip()[:300]}")
    finally:
        # Clean up temp ASS file
        if temp_ass_path.exists():
            try:
                temp_ass_path.unlink()
            except Exception:
                pass
