import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { CampaignType, CampaignFrequency, Tonality } from "@/generated/prisma/enums";
import { TRPCError } from "@trpc/server";

export const campaignRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({ brandId: z.string() }))
    .query(async ({ ctx, input }) => {
      const brand = await ctx.db.brand.findFirst({
        where: { id: input.brandId, userId: ctx.user.id },
      });
      if (!brand) throw new TRPCError({ code: "NOT_FOUND" });

      return ctx.db.campaign.findMany({
        where: { brandId: input.brandId },
        include: { _count: { select: { posts: true } } },
        orderBy: { createdAt: "desc" },
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        brandId: z.string(),
        name: z.string().min(1),
        description: z.string().optional(),
        type: z.nativeEnum(CampaignType),
        frequency: z.nativeEnum(CampaignFrequency),
        cronExpression: z.string().optional(),
        tonality: z.nativeEnum(Tonality),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const brand = await ctx.db.brand.findFirst({
        where: { id: input.brandId, userId: ctx.user.id },
      });
      if (!brand) throw new TRPCError({ code: "NOT_FOUND" });

      return ctx.db.campaign.create({ data: input });
    }),

  toggle: protectedProcedure
    .input(z.object({ id: z.string(), isActive: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const campaign = await ctx.db.campaign.findFirst({
        where: { id: input.id },
        include: { brand: true },
      });
      if (!campaign || campaign.brand.userId !== ctx.user.id)
        throw new TRPCError({ code: "NOT_FOUND" });

      return ctx.db.campaign.update({
        where: { id: input.id },
        data: { isActive: input.isActive },
      });
    }),
});
