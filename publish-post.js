// File: /api/publish-post.js
// Actually publishes a post to Instagram or Facebook using a connected account's token.
// Requires: accessToken, pageOrIgId, caption, and imageUrl (Instagram requires an image).

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { platform, accessToken, targetId, caption, imageUrl } = req.body;

  if (!accessToken || !targetId || !caption) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    if (platform === "instagram") {
      // Instagram requires a two-step publish: create a media container, then publish it
      const containerRes = await fetch(
        `https://graph.facebook.com/v19.0/${targetId}/media`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image_url: imageUrl,
            caption,
            access_token: accessToken,
          }),
        }
      );
      const containerData = await containerRes.json();
      if (containerData.error) throw new Error(containerData.error.message);

      const publishRes = await fetch(
        `https://graph.facebook.com/v19.0/${targetId}/media_publish`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            creation_id: containerData.id,
            access_token: accessToken,
          }),
        }
      );
      const publishData = await publishRes.json();
      if (publishData.error) throw new Error(publishData.error.message);

      return res.status(200).json({ success: true, postId: publishData.id });
    }

    if (platform === "facebook") {
      const postRes = await fetch(
        `https://graph.facebook.com/v19.0/${targetId}/feed`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: caption,
            access_token: accessToken,
          }),
        }
      );
      const postData = await postRes.json();
      if (postData.error) throw new Error(postData.error.message);

      return res.status(200).json({ success: true, postId: postData.id });
    }

    return res.status(400).json({ error: "Unsupported platform" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
