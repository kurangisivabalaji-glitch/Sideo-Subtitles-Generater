import pytest
from app.services.subtitle_service import (
    format_timestamp_srt,
    format_timestamp_vtt,
    format_timestamp_ass,
    segments_to_srt,
    segments_to_vtt,
    segments_to_ass,
    parse_srt
)

def test_timestamp_formatting():
    # 0 seconds
    assert format_timestamp_srt(0.0) == "00:00:00,000"
    assert format_timestamp_vtt(0.0) == "00:00:00.000"
    assert format_timestamp_ass(0.0) == "0:00:00.00"

    # 65.432 seconds -> 1 min, 5 sec, 432 ms
    assert format_timestamp_srt(65.432) == "00:01:05,432"
    assert format_timestamp_vtt(65.432) == "00:01:05.432"
    assert format_timestamp_ass(65.432) == "0:01:05.43"

    # 3661.12 seconds -> 1 hr, 1 min, 1 sec, 120 ms
    assert format_timestamp_srt(3661.12) == "01:01:01,120"
    assert format_timestamp_vtt(3661.12) == "01:01:01.120"
    assert format_timestamp_ass(3661.12) == "1:01:01.12"

def test_segments_to_srt_unicode():
    segments = [
        {"id": 1, "start": 0.5, "end": 2.5, "text": "నమస్కారం, స్వాగతం!"}, # Telugu
        {"id": 2, "start": 3.0, "end": 5.2, "text": "नमस्ते दुनिया"},          # Hindi
        {"id": 3, "start": 5.5, "end": 7.0, "text": "مرحبا بك"},              # Arabic
        {"id": 4, "start": 7.5, "end": 9.0, "text": "Hello World"}           # English
    ]
    srt = segments_to_srt(segments)
    assert "1" in srt
    assert "00:00:00,500 --> 00:00:02,500" in srt
    assert "నమస్కారం, స్వాగతం!" in srt
    assert "नमस्ते दुनिया" in srt
    assert "مرحبا بك" in srt

def test_parse_srt():
    sample_srt = """1
00:00:01,000 --> 00:00:03,500
First line of subtitles

2
00:00:04,200 --> 00:00:06,800
Second line with Telugu: తెలుగు
"""
    parsed = parse_srt(sample_srt)
    assert len(parsed) == 2
    assert parsed[0]["start"] == 1.0
    assert parsed[0]["end"] == 3.5
    assert parsed[0]["text"] == "First line of subtitles"
    assert parsed[1]["start"] == 4.2
    assert "తెలుగు" in parsed[1]["text"]

def test_segments_to_ass_styling():
    segments = [
        {"id": 1, "start": 1.0, "end": 3.0, "text": "Styled subtitle"}
    ]
    ass = segments_to_ass(
        segments=segments,
        video_width=1920,
        video_height=1080,
        font_family="Roboto",
        font_size=28,
        text_color="#FFD700",
        bg_style="box",
        position="bottom"
    )
    assert "[Script Info]" in ass
    assert "PlayResX: 1920" in ass
    assert "Roboto" in ass
    assert "Dialogue: 0,0:00:01.00,0:00:03.00" in ass
    assert "Styled subtitle" in ass
