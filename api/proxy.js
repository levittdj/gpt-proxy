export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  const targetUrl = "https://script.google.com/macros/s/AKfycby6qB2Mi9WFjgHC2rGV8m33ncQyT5npfseuUlKR1vqliPt3DrFCcP_8tsD7Q5slIS7ZJA/exec";

  try {
    const payload = req.body;

    // Handle single object or batch array
    const entries = Array.isArray(payload) ? payload : [payload];

    const results = await Promise.all(
      entries.map(async (entry, index) => {
        try {
          const forwardRes = await fetch(targetUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(entry),
          });

          const resultText = await forwardRes.text();
          console.log(`✅ Response for entry ${index + 1}:`, resultText);

          return {
            entry,
            response: resultText,
          };
        } catch (err) {
          console.error(`❌ Error forwarding entry ${index + 1}:`, err);
          return {
            entry,
            error: err.toString(),
          };
        }
      })
    );

    res.status(200).json({ success: true, results });
  } catch (err) {
    console.error("❌ Proxy handler error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
}




