const SONG_ID = "1330935435";
const PLAYER_URL = `https://music.163.com/outchain/player?type=2&id=${SONG_ID}&auto=0&height=32`;
const AUDIO_URL = `https://music.163.com/api/song/enhance/player/url?ids=%5B${SONG_ID}%5D&br=128000`;

module.exports = async function handler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return response.status(405).json({ error: "Method not allowed" });
  }

  const headers = {
    "User-Agent": "Mozilla/5.0",
    Referer: "https://music.163.com/"
  };

  try {
    const playerResponse = await fetch(PLAYER_URL, { headers });
    const cookie = (playerResponse.headers.get("set-cookie") || "").split(";")[0];
    const audioResponse = await fetch(AUDIO_URL, {
      headers: { ...headers, ...(cookie ? { Cookie: cookie } : {}) }
    });
    const payload = await audioResponse.json();
    const track = payload?.data?.[0];

    if (!track?.url) throw new Error("Track URL unavailable");

    response.setHeader("Cache-Control", "public, s-maxage=600, stale-while-revalidate=300");
    return response.status(200).json({
      id: SONG_ID,
      title: "Falling into Presence",
      artist: "Borrtex",
      duration: Number(track.time) || 256182,
      url: track.url.replace(/^http:/, "https:")
    });
  } catch (error) {
    return response.status(502).json({ error: "Music source temporarily unavailable" });
  }
};
