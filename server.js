const express = require('express');
const axios = require('axios');
const ytdl = require('ytdl-core');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

const API_KEY = 'AIzaSyAcFTJAfZM23_bxQwVtCyMUkbCeM8jFWhQ';

app.use(express.static('public'));

// Search videos by category
app.get('/api/category', async (req, res) => {
  const { q } = req.query;
  try {
    const search = await axios.get('https://www.googleapis.com/youtube/v3/search', {
      params: {
        key: API_KEY,
        part: 'snippet',
        q,
        maxResults: 3,
        type: 'video'
      }
    });

    const videoIds = search.data.items.map(v => v.id.videoId).join(',');
    const stats = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
      params: {
        key: API_KEY,
        part: 'statistics,snippet',
        id: videoIds
      }
    });

    const data = stats.data.items.map(v => ({
      videoId: v.id,
      title: v.snippet.title,
      thumbnail: v.snippet.thumbnails.medium.url,
      views: v.statistics.viewCount,
      likes: v.statistics.likeCount,
      channel: v.snippet.channelTitle,
      channelId: v.snippet.channelId
    }));

    const subs = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
      params: {
        key: API_KEY,
        part: 'statistics',
        id: data.map(d => d.channelId).join(',')
      }
    });

    data.forEach((d, i) => {
      d.subscribers = subs.data.items[i]?.statistics?.subscriberCount || 'N/A';
    });

    res.json(data);
  } catch (err) {
    console.error('Category fetch failed', err.message);
    res.status(500).json({ error: 'Failed to fetch category videos' });
  }
});

// Get video formats
app.get('/api/formats', async (req, res) => {
  const { url } = req.query;
  try {
    const info = await ytdl.getInfo(url);
    const audio = ytdl.filterFormats(info.formats, 'audioonly')
      .map(f => ({ itag: f.itag, type: 'Audio', bitrate: f.audioBitrate }));

    const video = ytdl.filterFormats(info.formats, 'videoandaudio')
      .filter(f => f.container === 'mp4' && f.qualityLabel)
      .map(f => ({ itag: f.itag, type: 'Video', quality: f.qualityLabel }));

    res.json({ title: info.videoDetails.title, audio, video });
  } catch (err) {
    res.status(500).json({ error: 'Format error' });
  }
});

// Download
app.get('/api/download', (req, res) => {
  const { url, itag } = req.query;
  ytdl(url, { quality: itag })
    .on('error', err => res.status(500).send('Download error'))
    .pipe(res);
});

app.listen(PORT, () => console.log(`Running at http://localhost:${PORT}`));
