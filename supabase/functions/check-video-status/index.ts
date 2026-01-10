import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { request_id, api_key, endpoint } = await req.json();

    if (!request_id || !api_key || !endpoint) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: request_id, api_key, endpoint" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    console.log(`Checking status for request: ${request_id}`);
    console.log(`Endpoint: ${endpoint}`);

    const statusUrl = `https://queue.fal.run/${endpoint}/requests/${request_id}/status`;
    console.log(`Status URL: ${statusUrl}`);

    const statusResponse = await fetch(statusUrl, {
      method: "GET",
      headers: {
        Authorization: `Key ${api_key}`,
      },
    });

    console.log(`Status response: ${statusResponse.status}`);

    if (!statusResponse.ok) {
      const errorText = await statusResponse.text();
      console.error(`Status check failed: ${errorText}`);
      return new Response(
        JSON.stringify({
          error: `Status check failed: ${statusResponse.status}`,
          details: errorText,
        }),
        {
          status: statusResponse.status,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const statusData = await statusResponse.json();
    console.log(`Status data:`, JSON.stringify(statusData));

    if (statusData.status === "COMPLETED") {
      const resultUrl = `https://queue.fal.run/${endpoint}/requests/${request_id}`;
      console.log(`Fetching result from: ${resultUrl}`);

      const resultResponse = await fetch(resultUrl, {
        method: "GET",
        headers: {
          Authorization: `Key ${api_key}`,
        },
      });

      if (resultResponse.ok) {
        const resultData = await resultResponse.json();
        console.log(`Result data:`, JSON.stringify(resultData));

        return new Response(
          JSON.stringify({
            status: "COMPLETED",
            video_url: resultData.video?.url || null,
            full_response: resultData,
          }),
          {
            status: 200,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        );
      } else {
        const errorText = await resultResponse.text();
        console.error(`Failed to fetch result: ${errorText}`);
        return new Response(
          JSON.stringify({
            status: "COMPLETED",
            error: `Failed to fetch result: ${resultResponse.status}`,
            details: errorText,
          }),
          {
            status: 200,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        );
      }
    }

    return new Response(
      JSON.stringify({
        status: statusData.status,
        queue_position: statusData.queue_position,
        message: JSON.stringify(statusData, null, 2),
        full_response: statusData,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (err: any) {
    console.error("Error in check-video-status:", err);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: err.message,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});