export async function GET() {
  try {
  const apiKey = process.env.NAYAX_API_TOKEN;
  const username = process.env.NAYAX_USERNAME;
  const password = process.env.NAYAX_PASSWORD;

  // Try both sign-in URL variants
  const signinUrls = [
    "https://lynx.nayax.com/operational/v1/signin",
    "https://lynx.nayax.com/operational/api/v1/signin",
  ];

  let signinData: Record<string, unknown> = {};
  let signinBody = "";
  let successUrl = "";

  for (const url of signinUrls) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usr: username, pwd: password }),
    });
    signinBody = await res.text();
    try { signinData = JSON.parse(signinBody); } catch { signinData = {}; }
    if (res.ok && signinData.ok !== false) { successUrl = url; break; }
  }

  if (!successUrl) {
    return Response.json({
      step: "signin_failed",
      usernamePrefix: (username ?? "").substring(0, 5) + "...",
      responseBody: signinBody.substring(0, 500),
    });
  }

  // Step 2: use session token to hit devices
  const sessionToken: string = (signinData.token ?? signinData.accessToken ?? signinData.access_token ?? signinBody) as string;

  const devicesRes = await fetch("https://lynx.nayax.com/operational/api/v1/devices?pageSize=1", {
    headers: {
      Authorization: `Bearer ${sessionToken}`,
      "Content-Type": "application/json",
    },
  });

  const devicesBody = await devicesRes.text();

  return Response.json({
    step: "devices",
    signinStatus: signinRes.status,
    sessionTokenPrefix: sessionToken.substring(0, 12) + "...",
    devicesStatus: devicesRes.status,
    devicesBody: devicesBody.substring(0, 500),
  });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
