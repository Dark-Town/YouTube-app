const express = require('express');
const axios = require('axios');
const ytdl = require('ytdl-core');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

const API_KEY = 'AIzaSyAcFTJAfZM23_bxQwVtCyMUkbCeM8jFWhQ';

app.use(express.static('public'));
app.use(require('cors')());

app.get('/api/search', async (req, res) => {
  const { q } = req.query;
  try {
    const search = await axios.get('https://www.googleapis.com/youtube/v3/search', {
      params: { key: API_KEY, part: 'snippet', q, maxResults: 6, type: 'video' }
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
  } catch {
    res.status(500).json({ error: 'Search failed' });
  }
});

app.get('/api/formats', async (req, res) => {
  try {
    const info = await ytdl.getInfo(req.query.url);
    const videoFormats = ytdl.filterFormats(info.formats, 'videoandaudio')
      .filter(f => f.qualityLabel && f.hasAudio && f.hasVideo);
    const audioFormats = ytdl.filterFormats(info.formats, 'audioonly');

    res.json({ title: info.videoDetails.title, video: videoFormats, audio: audioFormats });
  } catch (err) {
    res.status(500).json({ error: 'Invalid or restricted URL' });
  }
});

app.get('/api/download', async (req, res) => {
  const { url, itag } = req.query;
  try {
    const info = await ytdl.getInfo(url);
    const format = ytdl.chooseFormat(info.formats, { quality: itag });
    res.setHeader('Content-Disposition', `attachment; filename="${info.videoDetails.title}.mp4"`);
    ytdl(url, { quality: itag }).pipe(res);
  } catch {
    res.status(410).json({ error: "Download failed", message: "Status code: 410" });
  }
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
