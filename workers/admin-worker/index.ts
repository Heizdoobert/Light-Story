export default {
  async fetch(request, env): Promise<Response> {
    // Get the object key from the URL path
    // For example: /images/cat.png → images/cat.png
    const url = new URL(request.url);
    const key = url.pathname.slice(1);

    // PUT: Store the request body in R2
    if (request.method === "PUT") {
      await env.MY_BUCKET.put(key, request.body);
      return new Response(`Put ${key} successfully!`);
    }

    // GET: Retrieve the object from R2
    const object = await env.MY_BUCKET.get(key);
    if (object === null) {
      return new Response("Object not found", { status: 404 });
    }
    return new Response(object.body);
  },
} satisfies ExportedHandler<Env>;
