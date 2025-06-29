export default async function handler(req, res) {
  const sheetScriptUrl = "https://script.google.com/macros/s/AKfycby6qB2Mi9WFjgHC2rGV8m33ncQyT5npfseuUlKR1vqliPt3DrFCcP_8tsD7Q5slIS7ZJA/exec";

  if (req.method === "GET") {
    try {
      const response = await fetch(sheetScriptUrl);
      const data = await response.json();
      console.log("📥 Sheet data retrieved:", data);
      return res.status(200).json(data);
    } catch (err) {
      console.error("❌ GET proxy error:", err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  if (req.method === "POST") {
    try {
      const payload = req.body;
      console.log("🟡 Incoming payload:", JSON.stringify(payload, null, 2));

      const workouts = payload?.data?.workouts;
      if (!Array.isArray(workouts)) {
        return res.status(400).json({ success: false, error: "Invalid payload format: missing 'data.workouts'" });
      }

      const results = await Promise.all(
        workouts.map(async (workout, index) => {
          const formattedWorkout = {
            date: workout.start || "",
            type: "autoExport",
            exercise: workout.name || "",
            duration: workout.duration || "",
            distance: workout.distance?.qty || "",
            pace: "",
            zone: "",
            notes: "Auto Export sync"
          };

          try {
            const forwardRes = await fetch(sheetScriptUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(formattedWorkout),
            });

            const responseText = await forwardRes.text();
            console.log(`✅ Forwarded workout ${index + 1}:`, responseText);

            return {
              entry: formattedWorkout,
              response: responseText,
            };
          } catch (err) {
            console.error(`❌ Error forwarding workout ${index + 1}:`, err);
            return {
              entry: formattedWorkout,
              error: err.toString(),
            };
          }
        })
      );

      return res.status(200).json({ success: true, forwarded: workouts.length, results });
    } catch (err) {
      console.error("❌ POST proxy handler error:", err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
