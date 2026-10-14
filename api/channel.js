// Live channel data for the site: latest uploads from the public RSS feed plus the channel's logo and banner.
const CHANNEL_ID = "UC7MOSSNwWJWGnAg0auxzziw";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36";

const decode = s => s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
const pick = (s, re) => { const m = s.match(re); return m ? decode(m[1]) : ""; };

async function feed() {
  const r = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`, { headers: { "User-Agent": UA } });
  const xml = await r.text();
  return [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(([, e]) => ({
    id: pick(e, /<yt:videoId>([^<]+)</),
    title: pick(e, /<title>([^<]*)</),
    published: pick(e, /<published>([^<]+)</),
    description: pick(e, /<media:description>([\s\S]*?)<\/media:description>/),
    views: Number(pick(e, /views="(\d+)"/) || 0),
    short: /\/shorts\//.test(pick(e, /<link rel="alternate" href="([^"]+)"/)),
  }));
}

async function uploads() {
  // the RSS feed caps at 15, so also read every id from the uploads playlist page
  const r = await fetch(`https://www.youtube.com/playlist?list=UU${CHANNEL_ID.slice(2)}&hl=en`, { headers: { "User-Agent": UA, "Accept-Language": "en-US" } });
  const html = await r.text();
  const out = [], seen = new Set();
  for (const m of html.matchAll(/"playlistVideoRenderer":\{"videoId":"([\w-]{11})"[\s\S]*?"title":\{"runs":\[\{"text":"((?:[^"\\]|\\.)*)"/g)) {
    if (!seen.has(m[1])) { seen.add(m[1]); out.push({ id: m[1], title: JSON.parse(`"${m[2]}"`) }); }
  }
  return out;
}

async function profile() {
  const r = await fetch(`https://www.youtube.com/channel/${CHANNEL_ID}?hl=en`, { headers: { "User-Agent": UA, "Accept-Language": "en-US" } });
  const html = await r.text();
  const avatar = pick(html, /<meta property="og:image" content="([^"]+)"/);
  const banner = pick(html, /"banner":\{"imageBannerViewModel":\{"image":\{"sources":\[\{"url":"([^"]+)"/) ||
                 pick(html, /"tvBanner":\{"thumbnails":\[(?:\{[^}]*\},)*\{"url":"([^"]+)","width":2120/) ||
                 pick(html, /"(https:\/\/yt3\.googleusercontent\.com\/[^"]+=w2120[^"]*)"/);
  const subs = pick(html, /"(\d[\d.,KMk]* subscribers)"/);
  const description = pick(html, /<meta property="og:description" content="([^"]*)"/);
  return { avatar, banner, subs, description };
}

export default async function handler(req, res) {
  try {
    const [f, u, p] = await Promise.all([feed().catch(() => []), uploads().catch(() => []), profile().catch(() => ({}))]);
    const byId = new Map(f.map(v => [v.id, v]));
    const list = (u.length ? u : f).map(v => ({ ...byId.get(v.id), ...v, ...(byId.get(v.id) ? { title: byId.get(v.id).title } : {}) }));
    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(200).json({ channel: { id: CHANNEL_ID, ...p }, videos: list });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
}
