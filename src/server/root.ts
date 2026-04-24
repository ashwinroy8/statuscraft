import { createTRPCRouter } from "./trpc";
import { brandRouter } from "./routers/brand";
import { postRouter } from "./routers/post";
import { signalRouter } from "./routers/signal";
import { campaignRouter } from "./routers/campaign";
import { settingsRouter } from "./routers/settings";
import { productRouter } from "./routers/product";
import { festivalRouter } from "./routers/festival";

export const appRouter = createTRPCRouter({
  brand: brandRouter,
  post: postRouter,
  signal: signalRouter,
  campaign: campaignRouter,
  settings: settingsRouter,
  product: productRouter,
  festival: festivalRouter,
});

export type AppRouter = typeof appRouter;
