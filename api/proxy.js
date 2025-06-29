export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  const targetUrl = "https://script.google.com/macros/s/AKfycby6qB2Mi9WFjgHC2rGV8m33ncQyT5npfseuUlKR1vqliPt3DrFCcP_8tsD7Q5slIS7ZJA/exec";

  try {
    const payload = req.body;
    const resultsArray = [];

    // Detect if this is a batch from Auto Export
    if (payload.results && Array.isArray(payload.results)) {
      for (const [index, resultWrapper] of payload.results.entries()) {
        const workouts = resultWrapper?.entry?.data?.workouts || [];

        for (const workout of workouts) {
          const transformedWorkout = {
            date: workout.start || "",
            type: "auto-export",
            exercise: workout.name || "",
            duration: parseFloat(workout.duration) || "",
            distance: parseFloat(workout.distance?.qty) || "",
            pace: "", // You could calculate pace later
            zone: "",
            notes: `AutoExport log`,
          };

          const forwardRes = await fetch(targetUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(transformedWorkout),
          });

          const resultText = await forwardRes.text();
          console.log(`✅ AutoExport workout ${index + 1}: ${resultText}`);

          resultsArray.push({
            entry: transformedWorkout,
            response: resultText,
          });
        }
      }

      return res.status(200).json({ success: true, results: resultsArray });
    }

    // Fallback: treat as single or batch object(s)
    const entries = Array.isArray(payload) ? payload : [payload];

    const manualResults = await Promise.all(
      entries.map(async (entry, index) => {
        try {
          const forwardRes = await fetch(targetUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(entry),
          });

          const resultText = await forwardRes.text();
          console.log(`✅ Manual entry ${index + 1}:`, resultText);

          return {
            entry,
            response: resultText,
          };
        } catch (err) {
          console.error(`❌ Error forwarding manual entry ${index + 1}:`, err);
          return {
            entry,
            error: err.toString(),
          };
        }
      })
    );

    return res.status(200).json({ success: true, results: manualResults });
  } catch (err) {
    console.error("❌ Proxy handler error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
