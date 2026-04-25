import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    let toNumber = "+16232822252"; // default test number

    try {
      const body = await req.json();
      if (body?.phone) {
        toNumber = body.phone;
      }
    } catch (e) {
      // ignore JSON parsing errors and use default number
    }

    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const fromNumber = Deno.env.get("TWILIO_NUMBER");
    const baseUrl = Deno.env.get("BASE_URL");

    if (!accountSid || !authToken || !fromNumber || !baseUrl) {
      return Response.json({ success: false, error: "Missing Twilio env vars" }, { status: 500 });
    }

    const credentials = btoa(`${accountSid}:${authToken}`);

    const params = new URLSearchParams({
      To: toNumber,
      From: fromNumber,
      Url: `${baseUrl}/functions/voiceScript`,
      Method: "POST",
    });

    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      console.error("[voiceOutbound] Twilio error:", JSON.stringify(data));
      return Response.json({ success: false, error: data.message || "Twilio call failed" }, { status: 500 });
    }

    console.log("[voiceOutbound] Call initiated:", data.sid);
    return Response.json({ success: true, callSid: data.sid, status: data.status });

  } catch (error) {
    console.error("[voiceOutbound] ERROR:", error.message);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});