import { createServerFn } from "@tanstack/react-start";
import { getWebsiteCacheContext } from "./cloudflare-cache";
import { EMPTY_RELEASE_CHANNELS, getReleaseChannels } from "./latest-release";

export const getLatestRelease = createServerFn({ method: "GET" }).handler(async () => {
  try {
    return await getReleaseChannels(getWebsiteCacheContext());
  } catch {
    return EMPTY_RELEASE_CHANNELS;
  }
});
