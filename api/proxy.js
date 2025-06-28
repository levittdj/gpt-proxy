export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  try {
    const forwardRes = await fetch(
      "https://script.google.com/macros/s/AKfycbw_0RdjGZX4dL4P9f13ATOeeNOvHMH3bIM-mQd426TRIl8GBnqSnOaWcP4FVIwu8QVv6Q/exec",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req.body),
      }
    );

    const responseJson = await forwardRes.json();
    res.status(200).json(responseJson);
  } catch (err) {
    console.error("Proxy error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
}
