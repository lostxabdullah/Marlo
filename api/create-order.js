// File: /api/create-order.js
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const KEY_ID = process.env.RAZORPAY_KEY_ID;
  const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

  if (!KEY_ID) return res.status(500).json({ error: "RAZORPAY_KEY_ID missing" });
  if (!KEY_SECRET) return res.status(500).json({ error: "RAZORPAY_KEY_SECRET missing" });

  try {
    const { plan } = req.body;
    const amount = plan === "agency" ? 799900 : 249900;

    const credentials = Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString("base64");

    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${credentials}`,
      },
      body: JSON.stringify({
        amount,
        currency: "INR",
        receipt: `marlo_${plan}_${Date.now()}`,
      }),
    });

    const text = await response.text();
    let order;
    try {
      order = JSON.parse(text);
    } catch {
      return res.status(500).json({ error: "Razorpay returned invalid response", raw: text.slice(0, 200) });
    }

    if (!response.ok) {
      return res.status(500).json({ error: order?.error?.description || "Razorpay error", details: order });
    }

    return res.status(200).json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: KEY_ID,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Unknown error" });
  }
}
