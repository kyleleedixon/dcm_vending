export async function GET() {
  const token = process.env.NAYAX_API_TOKEN;

  if (!token) {
    return Response.json({ error: "NAYAX_API_TOKEN is not set" }, { status: 500 });
  }

  const res = await fetch("https://lynx.nayax.com/operational/api/v1/devices?pageSize=1", {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  const body = await res.text();

  return Response.json({
    status: res.status,
    tokenLength: token.length,
    tokenPrefix: token.substring(0, 8) + "...",
    responseBody: body.substring(0, 500),
  });
}
