const DEFAULT_API_ORIGIN = "https://buildwise-backend-v1-api-server-dnuigdwoq.vercel.app";

function apiPathFromRequest(req) {
  const raw = req.query?.__apiPath;
  const pathPart = Array.isArray(raw) ? raw.filter(Boolean).join("/") : raw;
  if (typeof pathPart === "string" && pathPart.length) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(req.query || {})) {
      if (key === "__apiPath") continue;
      const values = Array.isArray(value) ? value : [value];
      for (const item of values) {
        if (item != null) params.append(key, String(item));
      }
    }
    const qs = params.toString();
    return `/api/${pathPart.replace(/^\/+/, "")}${qs ? `?${qs}` : ""}`;
  }

  const forwarded = req.headers["x-forwarded-uri"] || req.headers["x-invoke-path"];
  if (typeof forwarded === "string" && forwarded.startsWith("/api")) {
    return forwarded;
  }

  return req.url || "/";
}

export default async function handler(req, res) {
  try {
    const origin = (process.env.API_ORIGIN || DEFAULT_API_ORIGIN).replace(/\/$/, "");
    const target = new URL(apiPathFromRequest(req), origin);
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers || {})) {
      if (!value || key === "host" || key === "connection" || key === "content-length") continue;
      headers.set(key, Array.isArray(value) ? value.join(",") : String(value));
    }

    const method = req.method || "GET";
    const init = { method, headers, redirect: "manual" };
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
    const location = upstream.headers.get("location") || "";
    if (/vercel\.com\/(sso|login|protection)/i.test(location)) {
      res.status(502).json({
        error:
          "The backend is locked by Vercel Deployment Protection. In the backend Vercel project, set Deployment Protection to Disabled (or Standard Protection off for Production) so /api/healthz is public JSON.",
      });
      return;
    }

    const contentType = upstream.headers.get("content-type") || "";
    if (
      upstream.headers.get("x-vercel-error") === "FUNCTION_INVOCATION_FAILED" ||
      (upstream.status >= 500 && contentType.includes("text/plain"))
    ) {
      res.status(502).json({
        error:
          "The backend Vercel function crashed. Redeploy the backend from GitHub main, set MONGODB_URI, and set the frontend API_ORIGIN to the backend Production domain from Vercel → Domains (not a unique ...-xxxx.vercel.app URL).",
      });
      return;
    }

    const buf = Buffer.from(await upstream.arrayBuffer());
    res.status(upstream.status);
    upstream.headers.forEach((value, key) => {
      if (["transfer-encoding", "content-encoding", "connection"].includes(key)) return;
      res.setHeader(key, value);
    });
    res.send(buf);
  } catch (err) {
    res.status(502).json({
      error: err instanceof Error ? err.message : "Could not reach the BuildWise API",
    });
  }
}
