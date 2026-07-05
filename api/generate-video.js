// File: /api/generate-video.js
// Generates a video using Stability AI's API based on a text prompt

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { prompt, style, duration } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: "Missing prompt" });
  }

  const API_KEY = process.env.STABILITY_API_KEY;
  if (!API_KEY) {
    return res.status(500).json({ error: "Video API not configured" });
  }

  try {
    // Use Stability AI's image-to-video or text-to-image + video endpoint
    const response = await fetch(
      "https://api.stability.ai/v2beta/stable-video-diffusion",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          text_prompts: [
            {
              text: `${prompt}. ${style || "Cinematic, professional commercial style, high quality, 4K, studio lighting"}`,
              weight: 1,
            },
            {
              text: "blurry, low quality, amateur, shaky, watermark, text overlay",
              weight: -1,
            },
          ],
          cfg_scale: 2.5,
          motion_bucket_id: 40,
          seed: 0,
        }),
      }
    );

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.message || "Video generation failed");
    }

    const data = await response.json();

    // Return the generation ID so frontend can poll for completion
    res.status(200).json({
      id: data.id,
      status: data.status || "in-progress",
      videoUrl: data.video_url || null,
    });
  } catch (err) {
    console.error("Video generation error:", err);
    res.status(500).json({ error: err.message || "Failed to generate video" });
  }
}
