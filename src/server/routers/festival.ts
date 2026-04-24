import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { getUpcomingFestivals } from "@/data/festivals";
import { generateFestivalPostsForBrand } from "@/lib/ai/festival-generator";
import { TRPCError } from "@trpc/server";

export const festivalRouter = createTRPCRouter({
  upcoming: protectedProcedure.query(async ({ ctx }) => {
    // Get the user's brand to check preferences
    const brand = await ctx.db.brand.findFirst({
      where: { userId: ctx.user.id, onboardingCompleted: true },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });

    const prefs = brand
      ? await ctx.db.festivalPreferences.findUnique({
          where: { userId: ctx.user.id },
        })
      : null;

    const festivals = getUpcomingFestivals(60);

    // Filter by preferences if set
    return festivals.filter((f) => {
      if (prefs?.religions?.length) {
        if (f.religion && !prefs.religions.includes(f.religion) && !prefs.religions.includes("ALL")) {
          return false;
        }
      }
      if (prefs?.regions?.length && !prefs.regions.includes("ALL")) {
        const hasRegion = f.regions.some(
          (r) => r === "ALL" || prefs.regions.includes(r)
        );
        if (!hasRegion) return false;
      }
      return true;
    });
  }),

  generate: protectedProcedure
    .input(z.object({ festivalId: z.string() }))
    .mutation(async ({ ctx }) => {
      const brand = await ctx.db.brand.findFirst({
        where: { userId: ctx.user.id, onboardingCompleted: true },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      });

      if (!brand) {
        throw new TRPCError({ code: "NOT_FOUND", message: "No brand found" });
      }

      await generateFestivalPostsForBrand(brand.id);

      // Count posts created today (rough estimate)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const postsToday = await ctx.db.post.count({
        where: {
          brandId: brand.id,
          createdAt: { gte: today, lt: tomorrow },
        },
      });

      return { postsGenerated: Math.min(postsToday, 3) };
    }),

  updatePreferences: protectedProcedure
    .input(
      z.object({
        religions: z.array(z.string()).optional(),
        regions: z.array(z.string()).optional(),
        autoPost: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.festivalPreferences.upsert({
        where: { userId: ctx.user.id },
        create: {
          userId: ctx.user.id,
          religions: input.religions ?? [],
          regions: input.regions ?? [],
          autoPost: input.autoPost ?? false,
        },
        update: {
          ...(input.religions !== undefined && { religions: input.religions }),
          ...(input.regions !== undefined && { regions: input.regions }),
          ...(input.autoPost !== undefined && { autoPost: input.autoPost }),
        },
      });
    }),

  getPreferences: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.festivalPreferences.findUnique({
      where: { userId: ctx.user.id },
    });
  }),
});
