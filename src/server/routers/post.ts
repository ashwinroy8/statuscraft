import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { PostStatus, Tonality } from "@/generated/prisma/enums";
import { TRPCError } from "@trpc/server";

export const postRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z.object({
        brandId: z.string(),
        status: z.nativeEnum(PostStatus).optional(),
        limit: z.number().min(1).max(100).default(20),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { brandId, status, limit, cursor } = input;

      // Verify brand ownership
      const brand = await ctx.db.brand.findFirst({
        where: { id: brandId, userId: ctx.user.id },
      });
      if (!brand) throw new TRPCError({ code: "NOT_FOUND" });

      const posts = await ctx.db.post.findMany({
        where: { brandId, ...(status && { status }) },
        include: { analytics: true, signal: true },
        orderBy: { createdAt: "desc" },
        take: limit + 1,
        ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      });

      let nextCursor: string | undefined;
      if (posts.length > limit) {
        const nextItem = posts.pop();
        nextCursor = nextItem!.id;
      }

      return { posts, nextCursor };
    }),

  today: protectedProcedure
    .input(z.object({ brandId: z.string() }))
    .query(async ({ ctx, input }) => {
      const brand = await ctx.db.brand.findFirst({
        where: { id: input.brandId, userId: ctx.user.id },
      });
      if (!brand) throw new TRPCError({ code: "NOT_FOUND" });

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      return ctx.db.post.findMany({
        where: {
          brandId: input.brandId,
          scheduledAt: { gte: today, lt: tomorrow },
        },
        include: { analytics: true, signal: true },
        orderBy: { scheduledAt: "asc" },
      });
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const post = await ctx.db.post.findUnique({
        where: { id: input.id },
        include: {
          brand: true,
          analytics: true,
          signal: true,
          campaign: true,
        },
      });
      if (!post) throw new TRPCError({ code: "NOT_FOUND" });
      if (post.brand.userId !== ctx.user.id)
        throw new TRPCError({ code: "FORBIDDEN" });
      return post;
    }),

  approve: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        scheduledAt: z.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const post = await ctx.db.post.findUnique({
        where: { id: input.id },
        include: { brand: true },
      });
      if (!post || post.brand.userId !== ctx.user.id)
        throw new TRPCError({ code: "NOT_FOUND" });

      return ctx.db.post.update({
        where: { id: input.id },
        data: {
          status: "SCHEDULED",
          scheduledAt: input.scheduledAt ?? post.scheduledAt,
        },
      });
    }),

  reject: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const post = await ctx.db.post.findUnique({
        where: { id: input.id },
        include: { brand: true },
      });
      if (!post || post.brand.userId !== ctx.user.id)
        throw new TRPCError({ code: "NOT_FOUND" });

      return ctx.db.post.delete({ where: { id: input.id } });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        headline: z.string().optional(),
        bodyText: z.string().optional(),
        ctaText: z.string().optional(),
        tonality: z.nativeEnum(Tonality).optional(),
        scheduledAt: z.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const post = await ctx.db.post.findUnique({
        where: { id },
        include: { brand: true },
      });
      if (!post || post.brand.userId !== ctx.user.id)
        throw new TRPCError({ code: "NOT_FOUND" });

      return ctx.db.post.update({ where: { id }, data });
    }),

  analyticsOverview: protectedProcedure
    .input(
      z.object({
        brandId: z.string(),
        days: z.number().min(7).max(90).default(30),
      })
    )
    .query(async ({ ctx, input }) => {
      const brand = await ctx.db.brand.findFirst({
        where: { id: input.brandId, userId: ctx.user.id },
      });
      if (!brand) throw new TRPCError({ code: "NOT_FOUND" });

      const since = new Date();
      since.setDate(since.getDate() - input.days);

      const posts = await ctx.db.post.findMany({
        where: { brandId: input.brandId, createdAt: { gte: since } },
        include: { analytics: true },
        orderBy: { createdAt: "asc" },
      });

      return posts;
    }),
});
