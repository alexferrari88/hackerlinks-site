export function onRequest(context: {
  request: Request;
  next: () => Promise<Response> | Response;
}): Promise<Response>;
