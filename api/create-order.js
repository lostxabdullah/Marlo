// File: /api/create-order.js
// Creates a Razorpay order when a user wants to upgrade to Pro

import crypto from "crypto";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const KEY_ID = process.env.RAZORPAY_KEY_ID;
  const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

  if (!KEY_ID || !KEY_SECRET) {
    return res.status(500).json({ error: "Payment not configured" });
  }

  try {
    const { plan } = req.body; // "pro" or "agency"
    const amount = plan === "agency" ? 799900 : 249900; // in paise (₹2499 or ₹7999)
    const currency = "INR";

    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString("base64")}`,
      },
      body: JSON.stringify({
        amount,
        currency,
        receipt: `marlo_${plan}_${Date.now()}`,
        notes: { plan },
      }),
    });

    const order = await response.json();
    if (order.error) throw new Error(order.error.description);

    res.status(200).json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: KEY_ID,
    });
  } catch (err) {
    console.error("Order creation error:", err);
    res.status(500).json({ error: err.message || "Failed to create order" });
  }
}
