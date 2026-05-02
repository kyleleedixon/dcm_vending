export async function GET() {
  try {
  const rawToken = process.env.NAYAX_API_TOKEN ?? "";
  // Strip any accidental whitespace/newlines
  const token = rawToken.trim();

  let jwtPayload: Record<string, unknown> = {};
  if (token.startsWith("eyJ")) {
    try {
      const parts = token.split(".");
      jwtPayload = JSON.parse(Buffer.from(parts[1], "base64url").toString());
    } catch { /* ignore */ }
  }

  const now = Math.floor(Date.now() / 1000);
  const exp = jwtPayload.exp as number | undefined;

  const tokenInfo = {
    length: token.length,
    prefix: token.substring(0, 10) + "...",
    looksLikeJwt: token.startsWith("eyJ"),
    hasNewlines: rawToken.includes("\n") || rawToken.includes("\r"),
    issuer: jwtPayload.iss,
    audience: jwtPayload.aud,
    subject: jwtPayload.sub,
    expiry: exp ? new Date(exp * 1000).toISOString() : "none",
    expired: exp ? exp < now : "no exp claim",
  };

  if (!token) {
    return Response.json({ error: "NAYAX_API_TOKEN not set", tokenInfo });
  }

  const endpoints = [
    "https://lynx.nayax.com/operational/v1/devices?pageSize=1",
    "https://lynx.nayax.com/operational/v1/machines?pageSize=1",
    "https://lynx.nayax.com/operational/v1/actors",
    "https://lynx.nayax.com/operational/v1/users/me",
    "https://lynx.nayax.com/operational/v1/operators",
  ];

  const results = await Promise.all(
    endpoints.map(async (url) => {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      const body = await res.text();
      return { url: url.split("/v1/")[1], status: res.status, body: body.substring(0, 150) };
    })
  );

  return Response.json({ tokenInfo, results });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
