export default async function handler(req, res) {
  const targetUrl = "https://script.google.com/macros/s/AKfycby6qB2Mi9WFjgHC2rGV8m33ncQyT5npfseuUlKR1vqliPt3DrFCcP_8tsD7Q5slIS7ZJA/exec";

  if (req.method === "GET") {
    try {
      const response = await fetch(targetUrl);
      const data = await response.json();
      console.log("📥 Retrieved sheet data:", data);
      return res.status(200).json(data);
    } catch (err) {
      console.error("❌ GET error:", err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  if (req.method === "POST") {
    try {
      const body = req.body;

      // ✅ Expecting: { results: [ { entry: { data: { workouts: [...] } } } ] }
      const workouts = body?.results?.[0]?.entry?.data?.workouts;

      if (!Array.isArray(workouts)) {
        return res.status(400).json({
          success: false,
          error: "Invalid data format: missing 'results' or 'workouts'",
        });
      }

      const results = await Promise.all(
        workouts.map(async (w, i) => {
          const formatted = {
            date: w.start || "",
            type: "autoExport",
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

          try {
            const forwardRes = await fetch(targetUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(formatted),
            });

            const text = await forwardRes.text();
            console.log(`✅ Workout ${i + 1} forwarded:`, text);

            return { entry: formatted, response: text };
          } catch (err) {
            console.error(`❌ Error with workout ${i + 1}:`, err);
            return { entry: formatted, error: err.toString() };
          }
        })
      );

      return res.status(200).json({ success: true, forwarded: workouts.length, results });
    } catch (err) {
      console.error("❌ POST handler error:", err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
