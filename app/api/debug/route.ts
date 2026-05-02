export async function GET() {
  try {
  const apiKey = process.env.NAYAX_API_TOKEN;
  const username = process.env.NAYAX_USERNAME;
  const password = process.env.NAYAX_PASSWORD;

  // Step 1: sign in (no API key header — just credentials)
  const signinRes = await fetch("https://lynx.nayax.com/operational/v1/signin", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ usr: username, pwd: password }),
  });

  const signinBody = await signinRes.text();
  let signinData: Record<string, unknown> = {};
  try { signinData = JSON.parse(signinBody); } catch { /* not JSON */ }

  // Nayax returns 200 even for failed logins — check body.ok
  if (!signinRes.ok || signinData.ok === false) {
    return Response.json({
      step: "signin_failed",
      httpStatus: signinRes.status,
      responseBody: signinBody.substring(0, 500),
      hint: "Check NAYAX_USERNAME and NAYAX_PASSWORD are correct",
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
