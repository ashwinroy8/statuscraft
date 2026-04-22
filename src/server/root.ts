import { createTRPCRouter } from "./trpc";
import { brandRouter } from "./routers/brand";
import { postRouter } from "./routers/post";
import { signalRouter } from "./routers/signal";
import { campaignRouter } from "./routers/campaign";
import { settingsRouter } from "./routers/settings";

export const appRouter = createTRPCRouter({
  brand: brandRouter,
  post: postRouter,
  signal: signalRouter,
  campaign: campaignRouter,
  settings: settingsRouter,
});

export type AppRouter = typeof appRouter;
