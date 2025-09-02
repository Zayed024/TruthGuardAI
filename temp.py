from youtube_transcript_api import YouTubeTranscriptApifrom youtube_transcript_api._errors import TranscriptNotFoundError


video_id = "abc123"
try:
    transcript = YouTubeTranscriptApi.get_transcript(video_id)
except TranscriptNotFoundError:
    print("Transcript not found for this video.")
