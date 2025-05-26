const express = require('express');
const axios = require('axios');
const ytdl = require('ytdl-core');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

const API_KEY = 'AIzaSyAcFTJAfZM23_bxQwVtCyMUkbCeM8jFWhQ';

app.use(cors());
app.use(express.static('public'));

// Search or trending
app.get('/api/search', async (req, res) => {
  const { q } = req.query;
  const searchTerm = q || 'trending music';
  try {
    const search = await axios.get('https://www.googleapis.com/youtube/v3/search', {
      params: {
        key: API_KEY,
        part: 'snippet',
        q: searchTerm,
        maxResults: 8,
        type: 'video'
      }
    });

    const ids = search.data.items.map(i => i.id.videoId).join(',');
    const details = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
      params: {
        key: API_KEY,
        part: 'snippet,statistics',
        id: ids
      }
    });

    const videos = details.data.items.map(v => ({
      id: v.id,
      title: v.snippet.title,
      thumbnail: v.snippet.thumbnails.medium.url,
      channel: v.snippet.channelTitle,
      views: v.statistics.viewCount,
      likes: v.statistics.likeCount
    }));

    res.json(videos);
  } catch (err) {
    res.status(500).json({ error: 'Search failed' });
  }
});

// Fetch formats
app.get('/api/formats', async (req, res) => {
  try {
    const info = await ytdl.getInfo(req.query.url);
    const video = ytdl.filterFormats(info.formats, 'videoandaudio').filter(f => f.hasAudio && f.hasVideo);
    const audio = ytdl.filterFormats(info.formats, 'audioonly');
    res.json({
      title: info.videoDetails.title,
      video,
      audio
    });
  } catch {
    res.status(400).json({ error: 'Invalid or restricted URL' });
  }
});

// Download endpoint
app.get('/api/download', async (req, res) => {
  const { url, itag } = req.query;
  try {
    const info = await ytdl.getInfo(url);
    const format = ytdl.chooseFormat(info.formats, { quality: itag });
    res.setHeader('Content-Disposition', `attachment; filename="${info.videoDetails.title}.mp4"`);
    ytdl(url, { quality: itag }).pipe(res);
  } catch {
    res.status(410).json({ error: 'Download failed' });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
