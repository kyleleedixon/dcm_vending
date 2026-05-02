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

  // Step 1: exchange identity token for Lynx session token
  const signinRes = await fetch("https://lynx.nayax.com/operational/v1/signin", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  const signinBody = await signinRes.text();
  let signinData: Record<string, unknown> = {};
  try { signinData = JSON.parse(signinBody); } catch { /* not JSON */ }

  if (!signinRes.ok || signinData.ok === false) {
    return Response.json({
      tokenInfo,
      step: "signin_failed",
      signinStatus: signinRes.status,
      signinBody: signinBody.substring(0, 500),
    });
  }

  // Step 2: use returned session token for devices
  const sessionToken = (signinData.token ?? signinData.accessToken ?? signinData.access_token ?? signinBody) as string;

  const devicesRes = await fetch("https://lynx.nayax.com/operational/api/v1/devices?pageSize=1", {
    headers: {
      Authorization: `Bearer ${sessionToken}`,
      "Content-Type": "application/json",
    },
  });
  const devicesBody = await devicesRes.text();

  return Response.json({
    tokenInfo,
    signinStatus: signinRes.status,
    signinResponse: signinBody.substring(0, 200),
    sessionTokenPrefix: sessionToken.substring(0, 12) + "...",
    devicesStatus: devicesRes.status,
    devicesBody: devicesBody.substring(0, 500),
  });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
