function parseWorkoutDate(dateString) {
  try {
    const parts = dateString.split(" ");
    const iso = `${parts[0]}T${parts[1]}${getOffset(parts[2])}`;
    const d = new Date(iso);
    return !isNaN(d) ? d.toISOString().split("T")[0] : "";
  } catch {
    return "";
  }
}

function getOffset(offsetStr) {
  // Convert "-0400" to "-04:00"
  return offsetStr?.length === 5
    ? `${offsetStr.slice(0, 3)}:${offsetStr.slice(3)}`
    : "";
}

export default async function handler(req, res) {
  const targetUrl =
    "https://script.google.com/macros/s/AKfycby6qB2Mi9WFjgHC2rGV8m33ncQyT5npfseuUlKR1vqliPt3DrFCcP_8tsD7Q5slIS7ZJA/exec";

  // 🔹 GET request – fetch data from Google Apps Script
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

  // 🔹 POST request – sync workouts
  if (req.method === "POST") {
    try {
      const body = req.body;
      let workouts = null;

      // ✅ Wrapped format (e.g. from GPT)
      if (body?.results?.[0]?.entry?.data?.workouts) {
        workouts = body.results[0].entry.data.workouts;
        console.log("🧠 Received wrapped format");
      }
      // ✅ Auto Export direct format
      else if (body?.data?.workouts) {
        workouts = body.data.workouts;
        console.log("🧠 Received unwrapped Auto Export format");
      }

      if (!Array.isArray(workouts)) {
        return res.status(400).json({
          success: false,
          error: "Invalid data format: missing 'results' or 'workouts'",
        });
      }

      console.log(`🔄 Forwarding ${workouts.length} workout(s) to Google Apps Script...`);

      const results = await Promise.all(
        workouts.map(async (w, i) => {
          const parsedDate = w.start ? parseWorkoutDate(w.start) : "";

          const formatted = {
            date: parsedDate,
            type:
              w.name?.toLowerCase().includes("run") ||
              w.name?.toLowerCase().includes("ride") ||
              w.name?.toLowerCase().includes("cycling")
                ? "cardio"
                : "strength",
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
            console.log(`✅ Sent workout #${i + 1}:`, formatted);
            console.log(`📬 Response #${i + 1}:`, text);

            return { entry: formatted, response: text };
          } catch (err) {
            console.error(`❌ Error sending workout #${i + 1}:`, err);
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
      console.error("❌ POST handler error:", err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // 🔴 Unsupported HTTP methods
  return res.status(405).json({ error: "Method not allowed" });
}

