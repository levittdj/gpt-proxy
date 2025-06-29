export default async function handler(req, res) {
  const targetUrl =
    "https://script.google.com/macros/s/AKfycby6qB2Mi9WFjgHC2rGV8m33ncQyT5npfseuUlKR1vqliPt3DrFCcP_8tsD7Q5slIS7ZJA/exec";

  // 🔹 GET request – fetch data from Google Apps Script
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

  // 🔹 POST request – sync workouts
  if (req.method === "POST") {
    try {
      const incoming = req.body;

      const workouts =
        incoming?.data?.workouts ||
        incoming?.results?.[0]?.entry?.data?.workouts ||
        [];

      if (!Array.isArray(workouts)) {
        return res.status(400).json({
          success: false,
          error: "Invalid data format: missing 'workouts' array",
        });
      }

      // Format each workout for the sheet
      const formattedWorkouts = workouts.map((w, i) => {
        let parsedDate = "";
        try {
          if (w.start) {
            const iso = new Date(w.start);
            if (!isNaN(iso)) {
              parsedDate = iso.toISOString().split("T")[0];
            }
          }
        } catch (e) {
          console.warn(`⚠️ Invalid start date in workout #${i + 1}:`, w.start);
        }

        return {
          date: parsedDate,
          type: "autoExport",
          exercise: w.name || "", // ← from the schema you gave
          sets: "",
          reps: "",
          weight: "",
          duration: w.duration || "",
          distance: w.distance?.qty || "",
          pace: "",
          zone: "",
          notes: "Auto Export sync",
        };
      });

      // Wrap for Google Apps Script
      const wrappedPayload = {
        results: [
          {
            entry: {
              data: {
                workouts: formattedWorkouts,
              },
            },
            response: JSON.stringify({ success: true }),
          },
        ],
        success: 1,
      };

      const forwardRes = await fetch(targetUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(wrappedPayload),
      });

      const responseText = await forwardRes.text();

      res.status(200).json({
        success: true,
        forwarded: formattedWorkouts.length,
        rawResponse: responseText,
      });

    } catch (err) {
      console.error("❌ POST proxy error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  } else {
    return res.status(405).json({ error: "Method not allowed" });
  }
}

