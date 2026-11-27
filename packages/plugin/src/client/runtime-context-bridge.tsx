import { PluginTranslationProvider, usePluginTranslationRuntime } from "./translations.js";
import { useCallback, type ReactNode } from "react";
import {
  PluginComposerProvider,
  PluginComposersProvider,
  usePluginComposerValue,
  usePluginComposersSource,
} from "./composer.js";
import { PluginClientStateProvider, usePluginClientStateSource } from "./client-state.js";
import { PluginNewWorkspaceProvider, usePluginNewWorkspaceValue } from "./new-workspace.js";
import { RemioApiProvider, useRemioContextValue } from "./remio-context.js";
import { PluginRpcProvider, usePluginRpcContextValue } from "./rpc-context.js";

export type PluginRuntimeContextBridge = (children: ReactNode) => ReactNode;

/** Rebuilds plugin runtime contexts inside React Native portal hosts. */
export function usePluginRuntimeContextBridge(): PluginRuntimeContextBridge {
  const translations = usePluginTranslationRuntime();
  const remio = useRemioContextValue();
  const rpc = usePluginRpcContextValue();
  const state = usePluginClientStateSource();
  const composer = usePluginComposerValue();
  const composers = usePluginComposersSource();
  const newWorkspace = usePluginNewWorkspaceValue();

  if (!remio || !rpc) {
    throw new Error("Plugin UI must run inside a contributed plugin surface");
  }

  return useCallback(
    (children: ReactNode) => {
      const withState = state ? (
        <PluginClientStateProvider source={state}>{children}</PluginClientStateProvider>
      ) : (
        children
      );
      const withComposers = composers ? (
        <PluginComposersProvider source={composers}>{withState}</PluginComposersProvider>
      ) : (
        withState
      );
      const withNewWorkspace = newWorkspace ? (
        <PluginNewWorkspaceProvider newWorkspace={newWorkspace}>
          {withComposers}
        </PluginNewWorkspaceProvider>
      ) : (
        withComposers
      );
      const content = composer ? (
        <PluginComposerProvider composer={composer}>{withNewWorkspace}</PluginComposerProvider>
      ) : (
        withNewWorkspace
      );
      return (
        <RemioApiProvider remio={remio}>
          <PluginRpcProvider invoke={rpc.invoke} subscribe={rpc.subscribe}>
            <PluginTranslationProvider runtime={translations}>{content}</PluginTranslationProvider>
          </PluginRpcProvider>
        </RemioApiProvider>
      );
    },
    [composer, composers, newWorkspace, remio, rpc, state, translations],
  );
}
