import express from 'express';
import cors from 'cors';
import axios from 'axios';
import { YoutubeTranscript } from 'youtube-transcript';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Helper to extract video ID from YouTube URL
function extractVideoId(url) {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

app.get('/api/video-info', async (req, res) => {
  const videoUrl = req.query.url;
  if (!videoUrl) {
    return res.status(400).json({ error: 'Missing url parameter' });
  }

  const videoId = extractVideoId(videoUrl);
  if (!videoId) {
    return res.status(400).json({ error: 'Invalid YouTube URL' });
  }

  try {
    // 1. Fetch YouTube watch page for metadata (Title, Channel, Duration)
    const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const response = await axios.get(watchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });

    const html = response.data;

    // Extract ytInitialPlayerResponse JSON
    const jsonRegex = /ytInitialPlayerResponse\s*=\s*({.+?});/;
    const match = html.match(jsonRegex);
    if (!match) {
      return res.status(500).json({ error: 'Failed to retrieve video details from YouTube page' });
    }

    const playerResponse = JSON.parse(match[1]);
    const videoDetails = playerResponse.videoDetails || {};
    const title = videoDetails.title || 'Unknown Video';
    const channel = videoDetails.author || 'Unknown Channel';
    const lengthSeconds = parseInt(videoDetails.lengthSeconds || '0', 10);
    const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

    const metadata = {
      title,
      channel,
      duration: lengthSeconds,
      videoId,
      thumbnailUrl
    };

    // 2. Fetch Transcript using the robust youtube-transcript library
    console.log(`[Server] Fetching transcript for video ID: ${videoId}...`);
    let transcript = [];
    let captionWarning = null;

    try {
      const rawTranscript = await YoutubeTranscript.fetchTranscript(videoId);
      // Map to frontend structure (divide milliseconds to seconds)
      transcript = rawTranscript.map(item => ({
        text: item.text,
        start: item.offset / 1000,
        duration: item.duration / 1000
      }));
      console.log(`[Server] Successfully parsed ${transcript.length} transcript lines.`);
    } catch (transcriptError) {
      console.warn('[Server] Captions not directly accessible via default language:', transcriptError.message);
      try {
        // Try fallback to 'en'
        const rawTranscript = await YoutubeTranscript.fetchTranscript(videoId, { lang: 'en' });
        transcript = rawTranscript.map(item => ({
          text: item.text,
          start: item.offset / 1000,
          duration: item.duration / 1000
        }));
        console.log(`[Server] Successfully parsed ${transcript.length} lines via fallback language.`);
      } catch (fallbackErr) {
        console.warn('[Server] Fallback transcript attempt also failed:', fallbackErr.message);
        captionWarning = 'No automated captions were found for this video. You can write custom notes or paste a transcript manually.';
      }
    }

    return res.json({ 
      metadata, 
      transcript,
      warning: captionWarning 
    });

  } catch (error) {
    console.error('Error fetching YouTube info:', error.message);
    return res.status(500).json({ error: `Server error: ${error.message}` });
  }
});

app.listen(PORT, () => {
  console.log(`[Server] YouTube-to-PDF backend running on http://localhost:${PORT}`);
});
