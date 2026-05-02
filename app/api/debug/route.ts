export async function GET() {
  try {
  const apiKey = process.env.NAYAX_API_TOKEN;
  const username = process.env.NAYAX_USERNAME;
  const password = process.env.NAYAX_PASSWORD;

  // Step 1: sign in
  const signinRes = await fetch("https://lynx.nayax.com/operational/v1/signin", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ usr: username, pwd: password }),
  });

  const signinBody = await signinRes.text();

  if (!signinRes.ok) {
    return Response.json({
      step: "signin",
      status: signinRes.status,
      responseBody: signinBody.substring(0, 500),
    });
  }

  // Step 2: use session token to hit devices
  let sessionToken: string;
  try {
    const parsed = JSON.parse(signinBody);
    sessionToken = parsed.token ?? parsed.accessToken ?? parsed.access_token ?? signinBody;
  } catch {
    sessionToken = signinBody;
  }

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
