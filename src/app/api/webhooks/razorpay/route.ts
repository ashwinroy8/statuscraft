import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("x-razorpay-signature") ?? "";
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET ?? "";

  // Verify Razorpay signature
  if (secret) {
    const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
    if (expected !== signature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }
  }

  const event = JSON.parse(body);

  if (event.event === "payment_link.paid") {
    const entity = event.payload?.payment_link?.entity ?? {};
    const notes = entity.notes ?? {};
    const orderId = notes.orderId as string | undefined;
    if (!orderId) return NextResponse.json({ ok: true });

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        brand: { include: { user: { select: { phone: true } } } },
        product: { select: { name: true } },
      },
    });
    if (!order) return NextResponse.json({ ok: true });

    await prisma.order.update({
      where: { id: orderId },
      data: { paymentStatus: "PAID", status: "CONFIRMED" },
    });

    // Lazy import to avoid circular deps
    const { sendText } = await import("@/lib/whatsapp/client");

    // Notify business owner
    const ownerPhone = order.brand.user.phone;
    if (ownerPhone) {
      await sendText(
        ownerPhone,
        `🎉 *New Order Paid!*\n\n` +
          `Customer: ${order.contactName ?? order.contactPhone}\n` +
          `Product: ${order.product.name}\n` +
          `Amount: ₹${order.amount}\n\n` +
          `Reply CONFIRM to mark as fulfilled.`
      ).catch(() => {});
    }

    // Confirm to customer
    await sendText(
      order.contactPhone,
      `✅ *Payment confirmed!*\n\n` +
        `Thank you for ordering *${order.product.name}* from ${order.brand.name}! 🙏\n` +
        `Amount paid: ₹${order.amount}\n\n` +
        `We'll confirm your order shortly.`
    ).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}

// GET — redirect after Razorpay payment completion
export async function GET(req: NextRequest) {
  const orderId = new URL(req.url).searchParams.get("orderId");
  if (orderId) {
    await prisma.order
      .updateMany({
        where: { id: orderId, paymentStatus: "PENDING" },
        data: { paymentStatus: "PAID", status: "CONFIRMED" },
      })
      .catch(() => {});
  }
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "/";
  return Response.redirect(appUrl);
}
