export default async function handler(req, res) {
  const targetUrl =
    "https://script.google.com/macros/s/AKfycby6qB2Mi9WFjgHC2rGV8m33ncQyT5npfseuUlKR1vqliPt3DrFCcP_8tsD7Q5slIS7ZJA/exec";

  // 📅 Safe date parser for "YYYY-MM-DD HH:mm:ss ±hhmm"
  function parseDate(raw) {
    try {
      const match = raw.match(/^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}) ([+-]\d{4})$/);
      if (!match) return "";
      const [_, date, time, offset] = match;
      const formattedOffset = `${offset.slice(0, 3)}:${offset.slice(3)}`; // "-0400" → "-04:00"
      const iso = `${date}T${time}${formattedOffset}`;
      const d = new Date(iso);
      return isNaN(d) ? "" : d.toISOString().split("T")[0];
    } catch {
      return "";
    }
  }

  // 🔹 GET — Retrieve sheet data
  if (req.method === "GET") {
    try {
      const response = await fetch(targetUrl);
      const data = await response.json();
      return res.status(200).json(data);
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // 🔹 POST — Send workouts to sheet
  if (req.method === "POST") {
    try {
      const body = req.body;
      let workouts = null;

      // 🧠 Detect input shape
      if (body?.results?.[0]?.entry?.data?.workouts) {
        workouts = body.results[0].entry.data.workouts;
      } else if (body?.data?.workouts) {
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
            date: w.start ? parseDate(w.start) : "",
            type: "cardio", // optional: replace with custom logic if needed
            exercise: w.name || "",
            sets: "",
            reps: "",
            weight: "",
            duration: w.duration || "",
            distance: w.distance?.qty || "",
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

            const text = await forwardRes.text();
            return { entry: formatted, response: text };
          } catch (err) {
            return { entry: formatted, error: err.toString() };
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
