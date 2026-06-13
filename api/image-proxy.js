import https from 'https';

export default async function handler(req, res) {
  const { name } = req.query; // e.g. ?name=banners/xyz.jpg
  if (!name) {
    res.status(400).json({ error: 'Missing name query parameter' });
    return;
  }

  const bucket = 'eventra-598f6.appspot.com';
  const url = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(name)}?alt=media`;

  // Stream the remote file straight back to the client
  https.get(url, (stream) => {
    // Forward status code & most headers (content-type, cache-control, etc.)
    res.statusCode = stream.statusCode || 200;
    for (const [k, v] of Object.entries(stream.headers)) {
      if (v) res.setHeader(k, v);
    }
    stream.pipe(res);
  }).on('error', (e) => {
    console.error('Image-proxy error:', e);
    res.status(502).json({ error: 'Failed to fetch image from storage' });
  });
}
