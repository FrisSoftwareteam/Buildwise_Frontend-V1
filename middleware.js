export const config = {
  matcher: "/api/:path*",
};

export default async function middleware(request) {
  const incoming = new URL(request.url);
  if (incoming.pathname === "/api/proxy") {
    return;
  }

  const origin = process.env.API_ORIGIN?.replace(/\/$/, "");
  if (!origin) {
    return Response.json(
      {
        error:
          "API_ORIGIN is not set. In the frontend Vercel project, add API_ORIGIN as the backend URL (for example https://your-backend.vercel.app).",
      },
      { status: 502 },
    );
  }

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
  const responseHeaders = new Headers(upstream.headers);
  responseHeaders.delete("content-encoding");
  responseHeaders.delete("transfer-encoding");

  return new Response(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}
