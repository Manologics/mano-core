Deno.serve(async (_req) => {
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Monkee Bizz AI is online.</Say>
  <Hangup/>
</Response>`,
    {
      status: 200,
      headers: {
        "Content-Type": "text/xml"
      }
    }
  );
});