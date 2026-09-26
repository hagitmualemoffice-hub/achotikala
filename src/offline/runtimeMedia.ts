/** Media that arrived with a content update (CDN path -> data URL). */
let runtime: Record<string, string> = {};

export const setRuntimeMedia = (media?: Record<string, string> | null) => {
  runtime = media ?? {};
};

export const getRuntimeMedia = () => runtime;
