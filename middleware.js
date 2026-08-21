const DEFAULT_API_ORIGIN = "https://buildwise-backend-v1-api-server-dnuigdwoq.vercel.app";

export const config = {
  matcher: "/api/:path*",
};

function vercelProtectionResponse(location) {
  if (!location || !/vercel\.com\/(sso|login|protection)/i.test(location)) return null;
  return Response.json(
    {
      error:
        "The backend is locked by Vercel Deployment Protection. In the backend Vercel project, set Deployment Protection to Disabled (or Standard Protection off for Production) so /api/healthz is public JSON.",
    },
    { status: 502 },
  );
}

export default async function middleware(request) {
  const incoming = new URL(request.url);
  if (incoming.pathname === "/api/proxy") {
    return;
  }

  const origin = (process.env.API_ORIGIN || DEFAULT_API_ORIGIN).replace(/\/$/, "");
  const target = new URL(incoming.pathname + incoming.search, origin);
  const headers = new Headers(request.headers);
  headers.delete("host");

  const init = {
    method: request.method,
    headers,
    redirect: "manual",
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = request.body;
    init.duplex = "half";
  }

  const upstream = await fetch(target, init);
  const blocked = vercelProtectionResponse(upstream.headers.get("location") || "");
  if (blocked) return blocked;

  const responseHeaders = new Headers(upstream.headers);
  responseHeaders.delete("content-encoding");
  responseHeaders.delete("transfer-encoding");

  return new Response(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}
