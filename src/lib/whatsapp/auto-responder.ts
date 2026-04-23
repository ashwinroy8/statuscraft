import { prisma } from "@/lib/prisma";
import { sendText, sendButtons } from "./client";
import { classifyReply } from "@/lib/ai/reply-classifier";

export async function handleStatusReply(
  fromPhone: string,
  fromName: string | undefined,
  replyText: string,
  brandId: string
): Promise<void> {
  const brand = await prisma.brand.findUniqueOrThrow({ where: { id: brandId } });

  // Find most recent SENT post for this brand
  const recentPost = await prisma.post.findFirst({
    where: { brandId, status: "SENT" },
    include: { postProducts: { include: { product: true } } },
    orderBy: { sentAt: "desc" },
  });

  if (!recentPost) {
    await sendText(
      fromPhone,
      `Thanks for reaching out to ${brand.name}! 😊 We'll get back to you soon.` +
        (brand.ctaPhone ? `\n\n📞 Call us: ${brand.ctaPhone}` : "")
    );
    return;
  }

  const classification = classifyReply(replyText, recentPost.type);

  // Save the reply record
  await prisma.statusReply.create({
    data: {
      postId: recentPost.id,
      contactPhone: fromPhone,
      contactName: fromName,
      replyText,
      replyType: classification.type,
      autoReplySent: true,
    },
  });

  // Increment reply analytics
  await prisma.postAnalytics.upsert({
    where: { postId: recentPost.id },
    create: { postId: recentPost.id, replies: 1 },
    update: { replies: { increment: 1 } },
  });

  const products = recentPost.postProducts.map((pp) => pp.product);

  switch (classification.type) {
    case "PURCHASE_INTENT":
    case "REACTION":
      await handlePurchaseIntent(fromPhone, fromName, brand, products);
      break;
    case "QUESTION":
      await handleQuestion(fromPhone, brand);
      break;
    case "QUIZ_ANSWER":
      await handleQuizAnswer(fromPhone, recentPost, classification.answer ?? "");
      break;
    case "POLL_VOTE":
      await handlePollVote(fromPhone, classification.vote ?? "");
      break;
    default:
      await sendText(
        fromPhone,
        `Thanks for reaching out to ${brand.name}! 🙏 We'll get back to you shortly.`
      );
  }
}

async function handlePurchaseIntent(
  fromPhone: string,
  fromName: string | undefined,
  brand: any,
  products: any[]
): Promise<void> {
  if (products.length === 0) {
    // No products linked — collect interest + share contact
    const lines = [
      `Hi${fromName ? ` ${fromName}` : ""}! Thanks for your interest in *${brand.name}*! 🎉`,
      `We've noted your enquiry and will contact you shortly.`,
    ];
    if (brand.ctaPhone) lines.push(`\n📞 Call us directly: ${brand.ctaPhone}`);
    if (brand.websiteUrl) lines.push(`🌐 Visit: ${brand.websiteUrl}`);
    await sendText(fromPhone, lines.join("\n"));
    return;
  }

  if (products.length === 1) {
    const p = products[0];
    const price = p.discountPrice ?? p.price;
    const hasDiscount = p.discountPrice && p.discountPrice < p.price;

    await sendButtons(
      fromPhone,
      `${p.name} — ${brand.name}`,
      [
        p.description ?? "",
        `\n💰 Price: ₹${price}` + (hasDiscount ? ` (was ₹${p.price})` : ""),
        p.inStock ? "✅ In stock & ready to ship" : "⚠️ Limited stock",
      ]
        .filter(Boolean)
        .join("\n"),
      [
        { id: `order:${p.id}`, title: "🛒 Place Order" },
        { id: `info:${p.id}`, title: "ℹ️ More Info" },
      ]
    );
  } else {
    const list = products
      .slice(0, 5)
      .map((p, i) => `${i + 1}. *${p.name}* — ₹${p.discountPrice ?? p.price}`)
      .join("\n");

    await sendText(
      fromPhone,
      `Hi${fromName ? ` ${fromName}` : ""}! Here's what we have at *${brand.name}*:\n\n${list}\n\n` +
        `Reply with the number to order, or contact us:\n` +
        (brand.ctaPhone ? `📞 ${brand.ctaPhone}\n` : "") +
        (brand.websiteUrl ? `🌐 ${brand.websiteUrl}` : "")
    );
  }
}

async function handleQuestion(fromPhone: string, brand: any): Promise<void> {
  await sendText(
    fromPhone,
    `Great question! 💡 Our team will get back to you with details shortly.\n\n` +
      (brand.ctaPhone ? `📞 For immediate help, call: ${brand.ctaPhone}\n` : "") +
      (brand.websiteUrl ? `🌐 Or visit: ${brand.websiteUrl}` : "")
  );
}

async function handleQuizAnswer(
  fromPhone: string,
  post: any,
  answer: string
): Promise<void> {
  const meta = (post.metadata as any) ?? {};
  const correct = (meta.correctAnswer ?? "").toString();
  const isCorrect = correct && answer.toLowerCase().trim() === correct.toLowerCase().trim();

  if (isCorrect) {
    await sendText(
      fromPhone,
      `🎉 *Correct!* The answer is: *${correct}*\n${meta.explanation ?? ""}\n\nStay tuned for your reward! 🎁`
    );
  } else if (correct) {
    await sendText(
      fromPhone,
      `Almost! The correct answer is: *${correct}* 💡\n${meta.explanation ?? ""}\n\nBetter luck next time! 🧠`
    );
  } else {
    await sendText(fromPhone, `Thanks for participating! 🎯 Results coming soon.`);
  }
}

async function handlePollVote(fromPhone: string, vote: string): Promise<void> {
  await sendText(fromPhone, `Your vote for *"${vote}"* is recorded! 📊 Thanks for sharing your opinion!`);
}
