import express from 'express';
import cors from 'cors';
import axios from 'axios';
import { YoutubeTranscript } from 'youtube-transcript';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Helper to extract video ID from YouTube URL (supports watch, shorts, live, youtu.be, and raw ID)
function extractVideoId(url) {
  if (!url) return null;
  const trimmed = url.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  const regExp = /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/|live\/))([\w-]{11})/;
  const match = trimmed.match(regExp);
  return match ? match[1] : null;
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Video info & transcript endpoint
app.get('/api/video-info', async (req, res) => {
  const videoUrl = req.query.url;
  if (!videoUrl) {
    return res.status(400).json({ error: 'Missing url parameter' });
  }

  const videoId = extractVideoId(videoUrl);
  if (!videoId) {
    return res.status(400).json({ error: 'Invalid YouTube URL or Video ID' });
  }

  try {
    let title = 'YouTube Video';
    let channel = 'YouTube Channel';
    let lengthSeconds = 0;
    let thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

    // 1. Attempt watch page parsing for rich metadata (Duration, precise title)
    try {
      const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
      const response = await axios.get(watchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9'
        },
        timeout: 5000
      });

      const html = response.data;
      const jsonRegex = /ytInitialPlayerResponse\s*=\s*({.+?});/;
      const match = html.match(jsonRegex);
      if (match) {
        const playerResponse = JSON.parse(match[1]);
        const videoDetails = playerResponse.videoDetails || {};
        if (videoDetails.title) title = videoDetails.title;
        if (videoDetails.author) channel = videoDetails.author;
        if (videoDetails.lengthSeconds) lengthSeconds = parseInt(videoDetails.lengthSeconds, 10);
      }
    } catch (scrapeErr) {
      console.warn('[Server] Watch page scraping skipped/failed:', scrapeErr.message);
    }

    // 2. Fallback to Official YouTube oEmbed API if title is still default
    if (title === 'YouTube Video') {
      try {
        const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
        const oembedRes = await axios.get(oembedUrl, { timeout: 4000 });
        if (oembedRes.data) {
          title = oembedRes.data.title || title;
          channel = oembedRes.data.author_name || channel;
          if (oembedRes.data.thumbnail_url) thumbnailUrl = oembedRes.data.thumbnail_url;
        }
      } catch (oembedErr) {
        console.warn('[Server] oEmbed fallback error:', oembedErr.message);
      }
    }

    const metadata = {
      title,
      channel,
      duration: lengthSeconds,
      videoId,
      thumbnailUrl
    };

    // 3. Fetch Transcript using youtube-transcript library
    console.log(`[Server] Fetching transcript for video ID: ${videoId}...`);
    let transcript = [];
    let captionWarning = null;

    try {
      const rawTranscript = await YoutubeTranscript.fetchTranscript(videoId);
      transcript = rawTranscript.map(item => ({
        text: item.text,
        start: item.offset / 1000,
        duration: item.duration / 1000
      }));
      console.log(`[Server] Successfully parsed ${transcript.length} transcript lines.`);
    } catch (transcriptError) {
      console.warn('[Server] Captions not directly accessible via default language:', transcriptError.message);
      try {
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

    if (!metadata.duration && transcript.length > 0) {
      metadata.duration = Math.ceil(transcript[transcript.length - 1].start + (transcript[transcript.length - 1].duration || 10));
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

// TubeNotes Engine: High-performance vector compilation architecture
