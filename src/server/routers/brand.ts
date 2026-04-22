import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

export const brandRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.brand.findMany({
      where: { userId: ctx.user.id },
      orderBy: { createdAt: "desc" },
    });
  }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const brand = await ctx.db.brand.findFirst({
        where: { id: input.id, userId: ctx.user.id },
        include: { brochures: true, templates: true },
      });
      if (!brand) throw new TRPCError({ code: "NOT_FOUND" });
      return brand;
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        category: z.string().min(1),
        subcategory: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Ensure user row exists in DB (Supabase Auth user may not have a DB row yet)
      await ctx.db.user.upsert({
        where: { id: ctx.user.id },
        create: {
          id: ctx.user.id,
          email: ctx.user.email ?? "",
        },
        update: {},
      });

      return ctx.db.brand.create({
        data: {
          userId: ctx.user.id,
          name: input.name,
          category: input.category,
          subcategory: input.subcategory,
        },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        category: z.string().optional(),
        subcategory: z.string().optional(),
        websiteUrl: z.string().optional(),
        description: z.string().optional(),
        tagline: z.string().optional(),
        targetAudience: z.any().optional(),
        usp: z.string().optional(),
        competitors: z.array(z.string()).optional(),
        voicePersonality: z.any().optional(),
        colors: z.any().optional(),
        fonts: z.any().optional(),
        logoUrl: z.string().optional(),
        brandImagesUrls: z.array(z.string()).optional(),
        onboardingCompleted: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const brand = await ctx.db.brand.findFirst({
        where: { id, userId: ctx.user.id },
      });
      if (!brand) throw new TRPCError({ code: "NOT_FOUND" });
      return ctx.db.brand.update({ where: { id }, data });
    }),
});
