export interface PaymentLinkResult {
  url: string;
  id: string;
}

export async function generatePaymentLink(params: {
  amount: number;
  productName: string;
  brandName: string;
  customerPhone: string;
  orderId: string;
}): Promise<PaymentLinkResult> {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    // Fallback to UPI deep link
    const upiId = process.env.BRAND_UPI_ID ?? "";
    const url = generateUPILink({
      upiId,
      amount: params.amount,
      productName: params.productName,
      orderId: params.orderId,
    });
    return { url, id: params.orderId };
  }

  const body = {
    amount: Math.round(params.amount * 100), // paise
    currency: "INR",
    description: `${params.productName} — ${params.brandName}`,
    customer: { contact: params.customerPhone },
    notify: { sms: true, email: false },
    callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/razorpay?orderId=${params.orderId}`,
    callback_method: "get",
    options: { checkout: { name: params.brandName } },
  };

  const credentials = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  const res = await fetch("https://api.razorpay.com/v1/payment_links", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`Razorpay API error: ${await res.text()}`);

  const data = await res.json();
  return { url: data.short_url, id: data.id };
}

export function generateUPILink(params: {
  upiId: string;
  amount: number;
  productName: string;
  orderId: string;
}): string {
  return (
    `upi://pay?pa=${encodeURIComponent(params.upiId)}` +
    `&pn=${encodeURIComponent(params.productName)}` +
    `&am=${params.amount}` +
    `&tn=Order-${params.orderId}` +
    `&cu=INR`
  );
}
