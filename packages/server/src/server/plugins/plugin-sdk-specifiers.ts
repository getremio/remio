// These entries are supplied by the host and remain external in author bundles.
export const PLUGIN_CLIENT_ONLY_SDK_SPECIFIERS = [
  "@getremio/plugin/client",
  "@getremio/plugin/client/ui",
  // COMPAT(pluginReactNativeEntrypoint): added in v0.13.0, remove after 2027-04-20
  "@getremio/plugin/client/react-native",
] as const;

const PLUGIN_SERVER_ONLY_SDK_SPECIFIERS = [
  "@getremio/plugin/server",
  "@getremio/plugin/server/provider",
  "@getremio/plugin/server/usage",
  "@getremio/plugin/server/acp",
] as const;

export const PLUGIN_SDK_SPECIFIERS = [
  "@getremio/plugin",
  ...PLUGIN_SERVER_ONLY_SDK_SPECIFIERS,
  ...PLUGIN_CLIENT_ONLY_SDK_SPECIFIERS,
] as const;

export function isPluginClientOnlySdkSpecifier(name: string): boolean {
  return (PLUGIN_CLIENT_ONLY_SDK_SPECIFIERS as readonly string[]).includes(name);
}

export function isPluginServerOnlySdkSpecifier(name: string): boolean {
  return (PLUGIN_SERVER_ONLY_SDK_SPECIFIERS as readonly string[]).includes(name);
}
