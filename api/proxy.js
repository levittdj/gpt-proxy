export default async function handler(req, res) {
  const targetUrl = "https://script.google.com/macros/s/AKfycby6qB2Mi9WFjgHC2rGV8m33ncQyT5npfseuUlKR1vqliPt3DrFCcP_8tsD7Q5slIS7ZJA/exec";

  if (req.method === "GET") {
    try {
      const forwardRes = await fetch(targetUrl);
      const data = await forwardRes.json();
      return res.status(200).json(data);
    } catch (err) {
      console.error("❌ GET proxy error:", err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST and GET methods are allowed" });
  }

  try {
    const incoming = req.body;

    const wrappedPayload = {
      results: [
        {
          entry: incoming,
          response: "{\"success\":true}"
        }
      ],
      success: 1
    };

    const forwardRes = await fetch(targetUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(wrappedPayload)
    });

    const responseText = await forwardRes.text();

    res.status(200).json({
      success: true,
      forwarded: true,
      rawResponse: responseText
    });

  } catch (err) {
    console.error("❌ Proxy error:", err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
}