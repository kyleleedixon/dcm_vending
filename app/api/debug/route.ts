export async function GET() {
  try {
  const rawToken = process.env.NAYAX_API_TOKEN ?? "";
  // Strip any accidental whitespace/newlines
  const token = rawToken.trim();

  const tokenInfo = {
    length: token.length,
    prefix: token.substring(0, 10) + "...",
    looksLikeJwt: token.startsWith("eyJ"),
    hasNewlines: rawToken.includes("\n") || rawToken.includes("\r"),
  };

  if (!token) {
    return Response.json({ error: "NAYAX_API_TOKEN not set", tokenInfo });
  }

  const res = await fetch("https://lynx.nayax.com/operational/api/v1/devices?pageSize=1", {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  const body = await res.text();

  return Response.json({
    tokenInfo,
    devicesStatus: res.status,
    devicesBody: body.substring(0, 500),
  });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
