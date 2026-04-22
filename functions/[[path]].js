const CANONICAL_HOST = "hackerlinks.cc";
const WWW_HOST = `www.${CANONICAL_HOST}`;
const PAGES_HOST = "hackerlinks.pages.dev";
const PREVIEW_SUFFIX = ".pages.dev";

function shouldNoindexTextFile(pathname) {
  return pathname.endsWith(".txt") && pathname !== "/llms.txt";
}

function withHeader(response, name, value) {
  const headers = new Headers(response.headers);
  headers.set(name, value);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export async function onRequest(context) {
  const url = new URL(context.request.url);

  if (url.hostname === WWW_HOST || url.hostname === PAGES_HOST) {
    url.hostname = CANONICAL_HOST;
    url.protocol = "https:";
    return Response.redirect(url.toString(), 301);
  }

  const response = await context.next();

  if (shouldNoindexTextFile(url.pathname)) {
    return withHeader(response, "X-Robots-Tag", "noindex, nofollow");
  }

  if (url.hostname !== CANONICAL_HOST && url.hostname.endsWith(PREVIEW_SUFFIX)) {
    return withHeader(response, "X-Robots-Tag", "noindex, nofollow");
  }

  return response;
}
