export async function GET() {
  try {
    const rawToken = process.env.NAYAX_API_TOKEN ?? "";
    const token = rawToken.trim();

    if (!token) {
      return Response.json({ error: "NAYAX_API_TOKEN not set" }, { status: 500 });
    }

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

    const endpoints = [
      "https://lynx.nayax.com/operational/api/v1/machines?ResultsLimit=1",
      "https://lynx.nayax.com/operational/api/v1/devices?pageSize=1",
      "https://lynx.nayax.com/operational/api/v1/actors",
    ];

    const results = await Promise.all(
      endpoints.map(async (url) => {
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        });
        const body = await res.text();
        return { url: url.split("/api/v1/")[1], status: res.status, body: body.substring(0, 200) };
      })
    );

    return Response.json({ tokenInfo, results });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
