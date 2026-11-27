import type { PluginRemioApi } from "./reference-api.js";
import { createContext, useContext, type ReactNode } from "react";

const RemioApiContext = createContext<PluginRemioApi | null>(null);

export function useRemioContextValue(): PluginRemioApi | null {
  return useContext(RemioApiContext);
}

export function RemioApiProvider({
  children,
  remio,
}: {
  children: ReactNode;
  remio: PluginRemioApi;
}) {
  return <RemioApiContext.Provider value={remio}>{children}</RemioApiContext.Provider>;
}

export function useRemio(): PluginRemioApi {
  const remio = useRemioContextValue();
  if (!remio) throw new Error("useRemio must run inside a contributed plugin surface");
  return remio;
}
