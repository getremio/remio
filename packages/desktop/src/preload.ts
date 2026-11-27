import { contextBridge, ipcRenderer, webUtils } from "electron";
import type { BrowserKeyboardPolicy } from "./features/browser-keyboard/index.js";
import type { DesktopWindowChromeMode } from "./window/chrome.js";

// This preload runs in Electron's sandbox and is tsc-compiled (not bundled), so it MUST
// NOT emit any runtime module load other than "electron" — a require() of a local or
// third-party module throws and aborts the preload before exposeInMainWorld runs, leaving
// window.remioDesktop undefined (the 0.1.108 regression, #2103). Keep this literal in sync
// with REMIO_BROWSER_PROFILE_PARTITION in features/browser-profile.ts; preload-sandbox.test.ts
// guards both the no-local-import rule and this drift. Type-only imports are fine (erased at emit).
const REMIO_BROWSER_PROFILE_PARTITION = "persist:remio-browser";

type EventHandler = (payload: unknown) => void;

function readArgValue(prefix: string): string | undefined {
  return process.argv.find((argument) => argument.startsWith(prefix))?.slice(prefix.length);
}

function readWindowChromeMode(): DesktopWindowChromeMode {
  const prefix = "--remio-window-chrome-mode=";
  const value = process.argv.find((argument) => argument.startsWith(prefix))?.slice(prefix.length);
  if (value === "native-mac" || value === "custom-windows" || value === "custom-linux") {
    return value;
  }
  // COMPAT(windowChromeMode): added in v0.5.3; remove after 2026-11-25.
  if (process.platform === "darwin") return "native-mac";
  return process.platform === "linux" ? "custom-linux" : "custom-windows";
}

interface AttachedBrowserRegistration {
  browserId: string;
  workspaceId: string;
  webContentsId: number;
}

contextBridge.exposeInMainWorld("remioDesktop", {
  platform: process.platform,
  windowChromeMode: readWindowChromeMode(),
  browserHostLabel: readArgValue("--remio-browser-host-label="),
  browserHostInstanceId: readArgValue("--remio-browser-host-instance-id="),
  invoke: (command: string, args?: Record<string, unknown>) =>
    ipcRenderer.invoke("remio:invoke", command, args),
  getPendingOpenProject: () =>
    ipcRenderer.invoke("remio:get-pending-open-project") as Promise<string | null>,
  agentNavigation: {
    ready: () =>
      ipcRenderer.invoke("remio:agent-navigation:ready") as Promise<{
        serverId: string;
        agentId: string;
      } | null>,
  },
  events: {
    on: (event: string, handler: EventHandler): Promise<() => void> => {
      const listener = (_ipcEvent: Electron.IpcRendererEvent, payload: unknown) => {
        handler(payload);
      };
      ipcRenderer.on(`remio:event:${event}`, listener);
      return Promise.resolve(() => {
        ipcRenderer.removeListener(`remio:event:${event}`, listener);
      });
    },
  },
  window: {
    openNew: (options?: { pendingOpenProjectPath?: string | null }) =>
      ipcRenderer.invoke("remio:window:openNew", options),
    getCurrentWindow: () => ({
      minimize: () => ipcRenderer.invoke("remio:window:minimize"),
      close: () => ipcRenderer.invoke("remio:window:close"),
      toggleMaximize: () => ipcRenderer.invoke("remio:window:toggleMaximize"),
      isMaximized: () => ipcRenderer.invoke("remio:window:isMaximized"),
      setFullscreen: (fullscreen: boolean) =>
        ipcRenderer.invoke("remio:window:setFullscreen", fullscreen),
      isFullscreen: () => ipcRenderer.invoke("remio:window:isFullscreen"),
      updateChrome: (update: { backgroundColor?: string; trafficLightOffsetY?: number }) =>
        ipcRenderer.invoke("remio:window:updateChrome", update),
      onResized: (handler: EventHandler): (() => void) => {
        const listener = (_ipcEvent: Electron.IpcRendererEvent, payload: unknown) => {
          handler(payload);
        };
        ipcRenderer.on("remio:window:resized", listener);
        return () => {
          ipcRenderer.removeListener("remio:window:resized", listener);
        };
      },
      setBadgeCount: (count?: number) => ipcRenderer.invoke("remio:window:setBadgeCount", count),
    }),
  },
  dialog: {
    ask: (message: string, options?: Record<string, unknown>) =>
      ipcRenderer.invoke("remio:dialog:ask", message, options),
    askWithCheckbox: (message: string, options: Record<string, unknown>) =>
      ipcRenderer.invoke("remio:dialog:askWithCheckbox", message, options),
    open: (options?: Record<string, unknown>) => ipcRenderer.invoke("remio:dialog:open", options),
  },
  notification: {
    isSupported: () => ipcRenderer.invoke("remio:notification:isSupported"),
    sendNotification: (payload: { title: string; body?: string; data?: Record<string, unknown> }) =>
      ipcRenderer.invoke("remio:notification:send", payload),
  },
  opener: {
    openUrl: (url: string) => ipcRenderer.invoke("remio:opener:openUrl", url),
  },
  editor: {
    listTargets: (input?: { workspacePath?: string }) =>
      ipcRenderer.invoke("remio:editor:listTargets", input),
    openTarget: (input: {
      editorId: string;
      workspacePath: string;
      filePath?: string;
      line?: number;
      column?: number;
    }) => ipcRenderer.invoke("remio:editor:openTarget", input),
  },
  webUtils: {
    getPathForFile: (file: File) => webUtils.getPathForFile(file),
  },
  menu: {
    showContextMenu: (input?: Record<string, unknown>) =>
      ipcRenderer.invoke("remio:menu:showContextMenu", input),
    setCapturingShortcut: (capturing: boolean) =>
      ipcRenderer.invoke("remio:menu:set-capturing-shortcut", capturing),
  },
  browser: {
    setShortcutPolicy: (input: BrowserKeyboardPolicy) =>
      ipcRenderer.invoke("remio:browser:set-shortcut-policy", input),
    profilePartition: REMIO_BROWSER_PROFILE_PARTITION,
    registerAttachedBrowser: (input: AttachedBrowserRegistration) =>
      ipcRenderer.invoke("remio:browser:register-attached", input),
    unregisterWorkspaceBrowser: (browserId: string) =>
      ipcRenderer.invoke("remio:browser:unregister-workspace-browser", browserId),
    setWorkspaceActiveBrowser: (input: { workspaceId: string; browserId: string | null }) =>
      ipcRenderer.invoke("remio:browser:set-workspace-active-browser", input),
    focus: (browserId: string) => ipcRenderer.invoke("remio:browser:focus", browserId),
    openDevTools: (browserId: string) =>
      ipcRenderer.invoke("remio:browser:open-devtools", browserId),
    clearProfile: (legacyBrowserIds: string[]) =>
      ipcRenderer.invoke("remio:browser:clear-profile", legacyBrowserIds),
    executeAutomationCommand: (request: Record<string, unknown>) =>
      ipcRenderer.invoke("remio:browser:execute-automation-command", request),
    captureElement: (
      browserId: string,
      rect: { x: number; y: number; width: number; height: number },
    ) => ipcRenderer.invoke("remio:browser:capture-element", browserId, rect),
    copyElement: (payload: { text?: string; imageDataUrl?: string }) =>
      ipcRenderer.invoke("remio:browser:copy-element", payload),
  },
});
