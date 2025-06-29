export default async function handler(req, res) {
  const targetUrl = "https://script.google.com/macros/s/AKfycby6qB2Mi9WFjgHC2rGV8m33ncQyT5npfseuUlKR1vqliPt3DrFCcP_8tsD7Q5slIS7ZJA/exec";

  if (req.method === "GET") {
    // Simple ping for diagnostics
    return res.status(200).json({ success: true, message: "Proxy is alive!" });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST and GET methods are allowed" });
  }

  try {
    const incoming = req.body;
    console.log("🟡 Incoming payload:", JSON.stringify(incoming, null, 2));

    const wrappedPayload = {
      results: [
        {
          entry: incoming,
          response: "{\"success\":true}"
        }
      ],
      success: 1
    };

    console.log("📦 Wrapped payload:", JSON.stringify(wrappedPayload, null, 2));

    const forwardRes = await fetch(targetUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(wrappedPayload)
    });

    const responseText = await forwardRes.text();
    console.log("✅ Response from Google Apps Script:", responseText);

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
