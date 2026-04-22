import "server-only";

import { createHydrationHelpers } from "@trpc/react-query/rsc";
import { cache } from "react";
import { createCallerFactory, createTRPCContext } from "@/server/trpc";
import { appRouter } from "@/server/root";
import { createQueryClient } from "./query-client";

const createCaller = createCallerFactory(appRouter);

export const getQueryClient = cache(createQueryClient);

const getCaller = cache(async () => {
  const ctx = await createTRPCContext({
    req: new Request("http://internal"),
  } as any);
  return createCaller(ctx);
});

export const { trpc: serverTrpc, HydrateClient } = createHydrationHelpers<
  typeof appRouter
>(getCaller as any, getQueryClient);
