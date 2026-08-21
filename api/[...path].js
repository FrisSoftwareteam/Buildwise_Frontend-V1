export default async function handler(req, res) {
  const origin = process.env.API_ORIGIN?.replace(/\/$/, "");
  if (!origin) {
    res.status(502).json({
      error:
        "API_ORIGIN is not set. In the frontend Vercel project, add API_ORIGIN as the backend URL (for example https://your-backend.vercel.app).",
    });
    return;
  }

  const target = new URL(req.url || "/", origin);
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers || {})) {
    if (!value || key === "host" || key === "connection" || key === "content-length") continue;
    headers.set(key, Array.isArray(value) ? value.join(",") : String(value));
  }

  const method = req.method || "GET";
  const init = { method, headers };
  if (method !== "GET" && method !== "HEAD") {
    if (Buffer.isBuffer(req.body) || typeof req.body === "string") {
      init.body = req.body;
    } else if (req.body != null) {
      init.body = JSON.stringify(req.body);
      if (!headers.has("content-type")) {
        headers.set("content-type", "application/json");
      }
    }
  }

  const upstream = await fetch(target, init);
  const buf = Buffer.from(await upstream.arrayBuffer());
  res.status(upstream.status);
  upstream.headers.forEach((value, key) => {
    if (["transfer-encoding", "content-encoding", "connection"].includes(key)) return;
    res.setHeader(key, value);
  });
  res.send(buf);
}
