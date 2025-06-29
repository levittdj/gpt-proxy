export default async function handler(req, res) {
  const SHEET_WEBHOOK_URL = "https://script.google.com/macros/s/AKfycby6qB2Mi9WFjgHC2rGV8m33ncQyT5npfseuUlKR1vqliPt3DrFCcP_8tsD7Q5slIS7ZJA/exec";

  if (req.method === "POST") {
    // Forward POST (write) requests to Google Apps Script
    try {
      const forwardRes = await fetch(SHEET_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req.body),
      });
      const data = await forwardRes.json();
      return res.status(200).json(data);
    } catch (err) {
      console.error("POST proxy error:", err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  if (req.method === "GET") {
    try {
      const forwardRes = await fetch(SHEET_WEBHOOK_URL);
      const data = await forwardRes.json();
      return res.status(200).json(data);
    } catch (err) {
      console.error("GET proxy error:", err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  return res.status(405).json({ error: "Only GET and POST methods are allowed." });
}



