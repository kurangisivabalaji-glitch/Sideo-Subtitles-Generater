import re
from typing import List, Dict, Any, Optional

def format_timestamp_srt(seconds: float) -> str:
    """Format seconds into SRT timestamp: HH:MM:SS,mmm"""
    if seconds < 0:
        seconds = 0.0
    total_ms = int(round(seconds * 1000))
    hours = total_ms // 3600000
    minutes = (total_ms % 3600000) // 60000
    secs = (total_ms % 60000) // 1000
    ms = total_ms % 1000
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{ms:03d}"

def format_timestamp_vtt(seconds: float) -> str:
    """Format seconds into VTT timestamp: HH:MM:SS.mmm"""
    if seconds < 0:
        seconds = 0.0
    total_ms = int(round(seconds * 1000))
    hours = total_ms // 3600000
    minutes = (total_ms % 3600000) // 60000
    secs = (total_ms % 60000) // 1000
    ms = total_ms % 1000
    return f"{hours:02d}:{minutes:02d}:{secs:02d}.{ms:03d}"

def format_timestamp_ass(seconds: float) -> str:
    """Format seconds into ASS timestamp: H:MM:SS.cc (centiseconds)"""
    if seconds < 0:
        seconds = 0.0
    total_cs = int(round(seconds * 100))
    hours = total_cs // 360000
    minutes = (total_cs % 360000) // 6000
    secs = (total_cs % 6000) // 100
    cs = total_cs % 100
    return f"{hours:d}:{minutes:02d}:{secs:02d}.{cs:02d}"

def parse_srt_timestamp(time_str: str) -> float:
    """Parse SRT timestamp 'HH:MM:SS,mmm' or 'HH:MM:SS.mmm' into seconds."""
    time_str = time_str.strip().replace(",", ".")
    parts = time_str.split(":")
    if len(parts) == 3:
        hours = float(parts[0])
        minutes = float(parts[1])
        seconds = float(parts[2])
        return hours * 3600 + minutes * 60 + seconds
    elif len(parts) == 2:
        minutes = float(parts[0])
        seconds = float(parts[1])
        return minutes * 60 + seconds
    return 0.0

def segments_to_srt(segments: List[Dict[str, Any]]) -> str:
    """Convert segments list to standard UTF-8 SRT string."""
    srt_lines = []
    for i, seg in enumerate(segments, start=1):
        start = format_timestamp_srt(float(seg.get("start", 0.0)))
        end = format_timestamp_srt(float(seg.get("end", 0.0)))
        text = str(seg.get("text", "")).strip()
        srt_lines.append(f"{i}\n{start} --> {end}\n{text}\n")
    return "\n".join(srt_lines)

def segments_to_vtt(segments: List[Dict[str, Any]]) -> str:
    """Convert segments list to WebVTT format."""
    vtt_lines = ["WEBVTT", ""]
    for i, seg in enumerate(segments, start=1):
        start = format_timestamp_vtt(float(seg.get("start", 0.0)))
        end = format_timestamp_vtt(float(seg.get("end", 0.0)))
        text = str(seg.get("text", "")).strip()
        vtt_lines.append(f"{i}\n{start} --> {end}\n{text}\n")
    return "\n".join(vtt_lines)

def hex_to_ass_color(hex_str: str, alpha_hex: str = "00") -> str:
    """
    Convert CSS hex color '#RRGGBB' to ASS color format '&HAABBGGRR'.
    ASS uses BGR order with alpha first (00 = opaque, FF = fully transparent).
    """
    hex_clean = hex_str.lstrip("#")
    if len(hex_clean) == 3:
        hex_clean = "".join([c * 2 for c in hex_clean])
    if len(hex_clean) == 6:
        r, g, b = hex_clean[0:2], hex_clean[2:4], hex_clean[4:6]
        return f"&H{alpha_hex}{b}{g}{r}"
    return f"&H{alpha_hex}FFFFFF"

def segments_to_ass(
    segments: List[Dict[str, Any]],
    video_width: int = 1920,
    video_height: int = 1080,
    font_family: str = "Arial",
    font_size: int = 24,
    text_color: str = "#FFFFFF",
    bg_style: str = "outline",  # 'outline', 'box', 'transparent'
    position: str = "bottom",   # 'bottom', 'top', 'middle'
    outline_color: str = "#000000",
    bg_color: str = "#000000",
    bg_opacity: float = 0.6,
) -> str:
    """
    Convert segments to Advanced SubStation Alpha (.ass) format.
    Allows exact styling burned cleanly onto video with FFmpeg.
    """
    # ASS Alignment:
    # 1=bottom-left, 2=bottom-center, 3=bottom-right
    # 4=middle-left, 5=middle-center, 6=middle-right
    # 7=top-left,    8=top-center,    9=top-right
    alignment = 2
    margin_v = 30
    if position == "top":
        alignment = 8
        margin_v = 35
    elif position == "middle":
        alignment = 5
        margin_v = 0
    else:  # bottom
        alignment = 2
        margin_v = 35

    # Scale font size relative to video resolution (default 1080p base)
    scale_factor = max(video_height / 720.0, 1.0)
    ass_font_size = int(round(font_size * scale_factor * 0.9))

    primary_color = hex_to_ass_color(text_color, "00")
    outline_col = hex_to_ass_color(outline_color, "00")
    
    # Border style: 1 = outline + drop shadow (NO background box), 3 = opaque box
    border_style = 1
    outline_val = 2.5
    shadow_val = 1.0

    if bg_style == "box":
        border_style = 3
        outline_val = 3
        shadow_val = 0
        alpha_int = int(round((1.0 - max(0.1, bg_opacity)) * 255))
        alpha_hex = f"{alpha_int:02X}"
        back_color = hex_to_ass_color(bg_color, alpha_hex)
    else:
        # Fully transparent background (no box)
        border_style = 1
        outline_val = 2.5
        shadow_val = 1.0
        back_color = "&HFF000000"  # Fully transparent

    header = f"""[Script Info]
Title: Universal AI Subtitles
ScriptType: v4.00+
WrapStyle: 0
ScaledBorderAndShadow: yes
YCbCr Matrix: TV.601
PlayResX: {video_width}
PlayResY: {video_height}

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,{font_family},{ass_font_size},{primary_color},&H000000FF,{outline_col},{back_color},0,0,0,0,100,100,0,0,{border_style},{outline_val},{shadow_val},{alignment},40,40,{margin_v},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    events = []
    for seg in segments:
        start_ass = format_timestamp_ass(float(seg.get("start", 0.0)))
        end_ass = format_timestamp_ass(float(seg.get("end", 0.0)))
        raw_text = str(seg.get("text", "")).strip()
        # Escape curly braces and convert newlines to ASS line break \N
        text_escaped = raw_text.replace("{", "\\{").replace("}", "\\}").replace("\r\n", "\\N").replace("\n", "\\N")
        events.append(f"Dialogue: 0,{start_ass},{end_ass},Default,,0,0,0,,{text_escaped}")

    return header + "\n".join(events) + "\n"

def parse_srt(srt_content: str) -> List[Dict[str, Any]]:
    """Parse SRT text into list of dict segments: [{'id': 1, 'start': 0.0, 'end': 2.5, 'text': '...'}]"""
    segments = []
    # Normalize line endings
    normalized = srt_content.replace("\r\n", "\n").replace("\r", "\n").strip()
    blocks = re.split(r"\n\s*\n", normalized)
    
    seg_id = 1
    for block in blocks:
        lines = [line.strip() for line in block.split("\n") if line.strip()]
        if not lines:
            continue
        
        # Check if first line is number or timestamp
        time_line_idx = 0
        if lines[0].isdigit() and len(lines) > 1:
            time_line_idx = 1
        
        if time_line_idx < len(lines) and "-->" in lines[time_line_idx]:
            time_parts = lines[time_line_idx].split("-->")
            start_sec = parse_srt_timestamp(time_parts[0])
            end_sec = parse_srt_timestamp(time_parts[1])
            text = " ".join(lines[time_line_idx + 1:])
            segments.append({
                "id": seg_id,
                "start": start_sec,
                "end": end_sec,
                "text": text
            })
            seg_id += 1
            
    return segments

def parse_vtt(vtt_content: str) -> List[Dict[str, Any]]:
    """Parse WebVTT text into list of dict segments."""
    normalized = vtt_content.replace("\r\n", "\n").replace("\r", "\n").strip()
    clean = re.sub(r"^WEBVTT[^\n]*\n+", "", normalized)
    return parse_srt(clean)

