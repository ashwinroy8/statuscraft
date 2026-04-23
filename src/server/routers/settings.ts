import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const settingsRouter = createTRPCRouter({
  get: protectedProcedure.query(async ({ ctx }) => {
    let settings = await ctx.db.settings.findUnique({
      where: { userId: ctx.user.id },
    });
    if (!settings) {
      settings = await ctx.db.settings.create({
        data: { userId: ctx.user.id },
      });
    }
    return settings;
  }),

  update: protectedProcedure
    .input(
      z.object({
        timezone: z.string().optional(),
        preferredPostTimes: z.array(z.string()).optional(),
        autoApprove: z.boolean().optional(),
        maxPostsPerDay: z.number().min(1).max(10).optional(),
        whatsappConnected: z.boolean().optional(),
        whatsappBusinessPhoneId: z.string().optional(),
        notificationPreferences: z.any().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.settings.upsert({
        where: { userId: ctx.user.id },
        create: { userId: ctx.user.id, ...input },
        update: input,
      });
    }),

  updateWhatsappPhone: protectedProcedure
    .input(z.object({ phone: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.settings.upsert({
        where: { userId: ctx.user.id },
        create: { userId: ctx.user.id, whatsappOwnerPhone: input.phone },
        update: { whatsappOwnerPhone: input.phone },
      });
    }),
});
