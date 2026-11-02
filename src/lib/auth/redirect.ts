const DEFAULT_PATH = "/dashboard";

/** Only allows paths inside this app, so a crafted link can't redirect people elsewhere. */
export function safeRedirectPath(path: unknown): string {
  if (typeof path !== "string" || !path.startsWith("/") || path.startsWith("//") || path.includes("\\")) {
    return DEFAULT_PATH;
  }
  return path;
}
