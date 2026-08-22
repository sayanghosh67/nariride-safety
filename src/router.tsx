import { QueryClient } from "@tanstack/react-query";
import { createHashHistory, createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

// Capacitor serves the app via the file:// or capacitor:// protocol with no
// HTTP server, so normal browser-history routing fails (the "server" can't
// resolve /book → index.html). Using a hash-based history (#/book) means
// the router never asks the native layer to resolve paths — it works offline.
const isCapacitor =
  typeof window !== "undefined" &&
  (window.location.protocol === "capacitor:" ||
    window.location.protocol === "file:");

const history = isCapacitor ? createHashHistory() : undefined;

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    history,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
