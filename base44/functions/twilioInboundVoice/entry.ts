Deno.serve(() => {
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Monkee Bizz AI system is now live. Please hold while we connect you.</Say>
</Response>`, {
    headers: { "Content-Type": "text/xml" }
  });
});