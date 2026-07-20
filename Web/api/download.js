// api/download.js - بۆ Vercel یان Netlify Functions
export default async function handler(req, res) {
  const allowedOrigins = [
    'https://krddown.vercel.app',
    'http://localhost:3000',
    'http://localhost:5500'
  ];
  
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  const { url, quality = '720p', type = 'video' } = req.query;
  
  if (!url) {
    return res.status(400).json({ 
      success: false, 
      error: 'URL parameter is required' 
    });
  }
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`);
    }
    
    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'video/mp4';
    
    const qualityLabel = quality === '4K' ? '4K_HDR' : quality;
    const fileExtension = type === 'audio' ? 'mp3' : 'mp4';
    const filename = `KrdDown_${qualityLabel}_${Date.now()}.${fileExtension}`;
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.byteLength);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    
    res.status(200).send(Buffer.from(buffer));
    
  } catch (error) {
    console.error('Download error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to download media' 
    });
  }
}
