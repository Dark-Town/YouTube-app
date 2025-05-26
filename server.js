const express = require('express');
const axios = require('axios');
const ytdl = require('ytdl-core');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

const API_KEY = 'AIzaSyAcFTJAfZM23_bxQwVtCyMUkbCeM8jFWhQ';

app.use(express.static('public'));

app.get('/api/search', async (req, res) => {
  const { q } = req.query;
  try {
    const search = await axios.get('https://www.googleapis.com/youtube/v3/search', {
      params: { key: API_KEY, part: 'snippet', q, maxResults: 5, type: 'video' }
    });

    const videoIds = search.data.items.map(i => i.id.videoId).join(',');
    const details = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
      params: { key: API_KEY, part: 'snippet,statistics', id: videoIds }
    });

    const videos = details.data.items.map(item => ({
      id: item.id,
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails.medium.url,
      views: item.statistics.viewCount,
      likes: item.statistics.likeCount,
      channel: item.snippet.channelTitle
    }));

    res.json(videos);
  } catch (err) {
    res.status(500).json({ error: 'Search failed' });
  }
});

app.get('/api/formats', async (req, res) => {
  const { url } = req.query;
  try {
    const info = await ytdl.getInfo(url);
    const video = ytdl.filterFormats(info.formats, 'videoandaudio').filter(f => f.qualityLabel);
    const audio = ytdl.filterFormats(info.formats, 'audioonly');

    res.json({ title: info.videoDetails.title, video, audio });
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch formats' });
  }
});

app.get('/api/download', (req, res) => {
  const { url, itag } = req.query;
  try {
    res.header('Content-Disposition', 'attachment');
    ytdl(url, { quality: itag }).pipe(res);
  } catch {
    res.status(500).json({ error: 'Download failed' });
  }
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
