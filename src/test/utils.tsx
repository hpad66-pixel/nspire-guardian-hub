/**
 * G5 · renderWithQueryClient helper.
 *
 * Wraps renderHook / render in a fresh QueryClientProvider so
 * tests don't share cache state. Retries are disabled so
 * mutation rejections surface immediately.
 */
import { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, renderHook } from "@testing-library/react";

export function makeClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });
}

export function withClient(client = makeClient()) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

export function renderWithQueryClient(ui: React.ReactElement) {
  return render(ui, { wrapper: withClient() });
}

export function renderHookWithClient<TProps, TResult>(
  hook: (props: TProps) => TResult,
  initialProps?: TProps,
) {
  return renderHook(hook, { wrapper: withClient(), initialProps });
}
