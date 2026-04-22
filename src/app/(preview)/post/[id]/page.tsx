import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import PostPreviewClient from "./preview-client";

export default async function PostPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const post = await prisma.post.findUnique({
    where: { id },
    include: {
      brand: true,
      analytics: true,
      signal: true,
      campaign: true,
    },
  });

  if (!post || post.brand.userId !== user.id) notFound();

  return <PostPreviewClient post={JSON.parse(JSON.stringify(post))} />;
}
