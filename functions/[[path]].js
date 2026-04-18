const CANONICAL_HOST = "hackerlinks.cc";
const WWW_HOST = `www.${CANONICAL_HOST}`;

export async function onRequest(context) {
  const url = new URL(context.request.url);

  if (url.hostname === WWW_HOST) {
    url.hostname = CANONICAL_HOST;
    url.protocol = "https:";
    return Response.redirect(url.toString(), 301);
  }

  return context.next();
}
