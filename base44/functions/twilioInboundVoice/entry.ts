Deno.serve(async (req) => {
  if (req.method !== "GET" && req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Thanks for calling Monkee Bizz. Please hold while we connect you.</Say>
</Response>`, {
    headers: { "Content-Type": "text/xml" }
  });
});