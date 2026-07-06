// File: /api/verify-payment.js
// Verifies Razorpay payment signature and unlocks Pro for the user

import crypto from "crypto";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ error: "Missing payment details" });
  }

  try {
    // Verify the payment signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ error: "Invalid payment signature" });
    }

    // Payment is verified — return success with pro status
    // In a full system, you'd save this to a database tied to the user's account
    res.status(200).json({
      success: true,
      plan: plan || "pro",
      paymentId: razorpay_payment_id,
      message: "Payment verified — Pro unlocked!",
    });
  } catch (err) {
    console.error("Verification error:", err);
    res.status(500).json({ error: "Payment verification failed" });
  }
}
