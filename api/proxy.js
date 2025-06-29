export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  const targetUrl = "https://script.google.com/macros/s/AKfycby6qB2Mi9WFjgHC2rGV8m33ncQyT5npfseuUlKR1vqliPt3DrFCcP_8tsD7Q5slIS7ZJA/exec";

  try {
    const payload = req.body;
    console.log("🟡 Incoming payload:", JSON.stringify(req.body, null, 2));
    const resultsArray = [];

    let workouts = [];

    // Case 1: Auto Export format with results array
    if (payload.results && Array.isArray(payload.results)) {
      for (const wrapper of payload.results) {
        const nestedWorkouts = wrapper?.entry?.data?.workouts || [];
        workouts.push(...nestedWorkouts);
      }
    }

    // Case 2: Raw workouts array directly in body
    else if (payload.workouts && Array.isArray(payload.workouts)) {
      workouts = payload.workouts;
    } else {
      return res.status(400).json({ success: false, error: "Invalid data format: missing 'results' or 'workouts'" });
    }

    // Forward each workout
    for (const [index, workout] of workouts.entries()) {
      const transformed = {
        date: workout.start || "",
        type: "auto-export",
        exercise: workout.name || "",
        duration: parseFloat(workout.duration) || "",
        distance: parseFloat(workout.distance?.qty) || "",
        pace: "",
        zone: "",
        notes: "AutoExport sync",
      };

      const forwardRes = await fetch(targetUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(transformed),
      });

      const resultText = await forwardRes.text();
      console.log(`✅ Forwarded workout ${index + 1}: ${resultText}`);

      resultsArray.push({
        entry: transformed,
        response: resultText,
      });
    }

    return res.status(200).json({ success: true, results: resultsArray });
  } catch (err) {
    console.error("❌ Proxy error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
