import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { SignalType } from "@/generated/prisma/enums";

export const signalRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z.object({
        minRelevance: z.number().min(0).max(100).default(0),
        types: z.array(z.nativeEnum(SignalType)).optional(),
        limit: z.number().min(1).max(50).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const now = new Date();
      return ctx.db.signal.findMany({
        where: {
          relevanceScore: { gte: input.minRelevance },
          ...(input.types && { type: { in: input.types } }),
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
        orderBy: { relevanceScore: "desc" },
        take: input.limit,
      });
    }),
});
