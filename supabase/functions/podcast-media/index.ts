// Streams the "יודעת" podcast episodes (compressed video / audio-only) through
// our own first-party functions endpoint.
//
// Why: the files live on the achotikala.com CDN, and that domain is blocked for
// NetFree users — while this endpoint (the same one the offline folder already
// uses for updates) is reachable. Range requests are forwarded so seeking and
// progressive playback keep working.
//   GET ?ep=1&type=video   -> 480p mp4
//   GET ?ep=1&type=audio   -> mp3

const HOST = "https://achotikala.com";

const MEDIA: Record<string, { video: string; audio: string }> = {
  "1": {
    video: "/__l5e/assets-v1/e663b471-2167-453f-9d3a-c20d253f547b/yodaat-1.mp4",
    audio: "/__l5e/assets-v1/a948343c-2ce9-4ccb-8547-9d0a8686670a/yodaat-1.mp3",
  },
  "2": {
    video: "/__l5e/assets-v1/f6f0f618-d281-4e25-80c3-b46f8e7ae763/yodaat-2.mp4",
    audio: "/__l5e/assets-v1/cbb08463-3ff4-47f7-afd4-512f1830028f/yodaat-2.mp3",
  },
  "3": {
    video: "/__l5e/assets-v1/361d3187-9e8f-4c7f-80a7-79d1145d766b/yodaat-3.mp4",
    audio: "/__l5e/assets-v1/548f13d0-4239-4a33-ba66-c9dd597f565f/yodaat-3.mp3",
  },
  "4": {
    video: "/__l5e/assets-v1/8fa60482-ffc0-4146-9750-b63c4544e1c6/yodaat-4.mp4",
    audio: "/__l5e/assets-v1/f715f001-242c-4e2e-af54-157f75fa4a7e/yodaat-4.mp3",
  },
  "5": {
    video: "/__l5e/assets-v1/39f4c2eb-1e8c-4151-86b2-853a7848e56d/yodaat-5.mp4",
    audio: "/__l5e/assets-v1/e7b5942b-884f-4a5d-aff7-942e79009b23/yodaat-5.mp3",
  },
};

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, range",
  "Access-Control-Expose-Headers": "content-length, content-range, accept-ranges",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const params = new URL(req.url).searchParams;
  const ep = String(Number(params.get("ep") ?? ""));
  const type = params.get("type") === "audio" ? "audio" : "video";
  const entry = MEDIA[ep];
  if (!entry) {
    return new Response(JSON.stringify({ error: "unknown_episode" }), {
      status: 404,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
  try {
    const range = req.headers.get("range");
    const upstream = await fetch(HOST + entry[type], {
      headers: range ? { Range: range } : {},
    });
    if (!upstream.ok && upstream.status !== 206) {
      return new Response(JSON.stringify({ error: "upstream", status: upstream.status }), {
        status: 502,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    const headers = new Headers(cors);
    headers.set("Content-Type", type === "audio" ? "audio/mpeg" : "video/mp4");
    headers.set("Accept-Ranges", "bytes");
    headers.set("Cache-Control", "public, max-age=86400");
    for (const h of ["content-length", "content-range"]) {
      const v = upstream.headers.get(h);
      if (v) headers.set(h, v);
    }
    return new Response(upstream.body, { status: upstream.status, headers });
  } catch (e) {
    console.error("podcast-media failed:", e);
    return new Response(JSON.stringify({ error: "unavailable" }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
