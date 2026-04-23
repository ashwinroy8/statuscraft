import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

const productInput = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().min(0),
  discountPrice: z.number().min(0).optional(),
  inStock: z.boolean().default(true),
});

export const productRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    const brand = await ctx.db.brand.findFirst({
      where: { userId: ctx.user.id, onboardingCompleted: true },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    if (!brand) return [];

    return ctx.db.product.findMany({
      where: { brandId: brand.id },
      orderBy: { createdAt: "desc" },
    });
  }),

  create: protectedProcedure
    .input(productInput)
    .mutation(async ({ ctx, input }) => {
      const brand = await ctx.db.brand.findFirst({
        where: { userId: ctx.user.id, onboardingCompleted: true },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      });
      if (!brand) throw new TRPCError({ code: "NOT_FOUND", message: "Brand not found" });

      return ctx.db.product.create({
        data: {
          brandId: brand.id,
          name: input.name,
          description: input.description,
          price: input.price,
          discountPrice: input.discountPrice,
          inStock: input.inStock,
        },
      });
    }),

  update: protectedProcedure
    .input(z.object({ id: z.string() }).merge(productInput.partial()))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      // Verify ownership via brand
      const product = await ctx.db.product.findFirst({
        where: { id },
        include: { brand: { select: { userId: true } } },
      });
      if (!product || product.brand.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return ctx.db.product.update({ where: { id }, data });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const product = await ctx.db.product.findFirst({
        where: { id: input.id },
        include: { brand: { select: { userId: true } } },
      });
      if (!product || product.brand.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return ctx.db.product.delete({ where: { id: input.id } });
    }),
});
