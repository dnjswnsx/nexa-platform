// Only server-controlled configuration supplies trusted deployment origins.
// Do not trust Origin, Host or forwarded headers to expand this list.
export function appOrigins(requestUrl: string): string[] {
  const configured = [process.env.APP_URL, process.env.RENDER_EXTERNAL_URL]
    .map(value => value?.trim())
    .filter((value): value is string => Boolean(value));
  return [...new Set((configured.length ? configured : [requestUrl]).map(value => {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Invalid app URL configuration.');
    return url.origin;
  }))];
}
export function isAppOrigin(origin: string | null, requestUrl: string): boolean {
  return origin !== null && appOrigins(requestUrl).includes(origin);
}
