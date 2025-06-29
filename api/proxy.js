export default async function handler(req, res) {
  const targetUrl =
    "https://script.google.com/macros/s/AKfycby6qB2Mi9WFjgHC2rGV8m33ncQyT5npfseuUlKR1vqliPt3DrFCcP_8tsD7Q5slIS7ZJA/exec";

  function parseDate(raw) {
    if (!raw || typeof raw !== "string") return "";
    try {
      // Convert "2025-06-28 16:14:13 -0400" → "2025-06-28T16:14:13-04:00"
      const match = raw.match(/^(.+?) (.+?) ([\+\-]\d{4})$/);
      if (!match) return "";
      const [_, date, time, offset] = match;
      const formattedOffset = `${offset.slice(0, 3)}:${offset.slice(3)}`;
      const isoString = `${date}T${time}${formattedOffset}`;
      const d = new Date(isoString);
      return isNaN(d) ? "" : d.toISOString().split("T")[0];
    } catch (err) {
      console.warn("⚠️ Date parse error:", err);
      return "";
    }
  }

  if (req.method === "GET") {
    try {
      const response = await fetch(targetUrl);
      const data = await response.json();
      return res.status(200).json(data);
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  if (req.method === "POST") {
    try {
      const body = req.body;
      let workouts = null;

      // Wrapped format (from GPT or manually constructed)
      if (body?.results?.[0]?.entry?.data?.workouts) {
        workouts = body.results[0].entry.data.workouts;
      }
      // Auto Export format
      else if (body?.data?.workouts) {
        workouts = body.data.workouts;
      }

      if (!Array.isArray(workouts)) {
        return res.status(400).json({
          success: false,
          error: "Invalid data format: missing 'results' or 'workouts'",
        });
      }

      const results = await Promise.all(
        workouts.map(async (w, i) => {
          const formatted = {
            date: w.date,
            type: "cardio",
            exercise: w.exercise || "(no name)",
            sets: "",
            reps: "",
            weight: "",
            duration: w.duration ? Number(w.duration).toFixed(1) : "",
            distance: w.distance?.qty ? Number(w.distance.qty).toFixed(2) : "",
            pace: "",
            zone: "",
            notes: "Auto Export sync",
          };

          const wrappedPayload = {
            results: [
              {
                entry: {
                  data: {
                    workouts: [formatted],
                  },
                },
                response: JSON.stringify({ success: true }),
              },
            ],
            success: 1,
          };

          try {
            const forwardRes = await fetch(targetUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(wrappedPayload),
            });

            const responseText = await forwardRes.text();
            console.log(`✅ Sent workout #${i + 1}:`, formatted);
            console.log(`📬 Response #${i + 1}:`, responseText);

            return { entry: formatted, response: responseText };
          } catch (err) {
            console.error(`❌ Failed to send workout #${i + 1}:`, err);
            return { entry: formatted, error: err.message };
          }
        })
      );

      return res.status(200).json({
        success: true,
        forwarded: workouts.length,
        results,
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
