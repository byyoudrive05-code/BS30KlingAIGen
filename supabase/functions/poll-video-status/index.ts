import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: processingVideos, error: fetchError } = await supabase
      .from("generation_history")
      .select("id, request_id, user_id, credits_used, api_key_id, model_version, variant, fal_status_url, fal_response_url, fal_endpoint")
      .eq("status", "processing")
      .not("request_id", "is", null)
      .limit(50);

    if (fetchError) {
      console.error("Database error:", fetchError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch processing videos", details: fetchError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!processingVideos || processingVideos.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          total: 0,
          updated: 0,
          failed: 0,
          stillProcessing: 0,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let updated = 0;
    let failed = 0;
    let stillProcessing = 0;

    for (const video of processingVideos) {
      try {
        console.log(`Processing video ${video.id}:`, {
          model_version: video.model_version,
          variant: video.variant,
          request_id: video.request_id
        });

        let apiKeyToUse = null;

        if (video.api_key_id) {
          const { data: apiKeyData, error: apiKeyError } = await supabase
            .from("api_keys")
            .select("api_key")
            .eq("id", video.api_key_id)
            .maybeSingle();

          if (!apiKeyError && apiKeyData && apiKeyData.api_key) {
            apiKeyToUse = apiKeyData.api_key;
          }
        }

        if (!apiKeyToUse) {
          const { data: userData, error: userError } = await supabase
            .from("users")
            .select("api_key")
            .eq("id", video.user_id)
            .maybeSingle();

          if (!userError && userData && userData.api_key) {
            apiKeyToUse = userData.api_key;
          }
        }

        if (!apiKeyToUse) {
          console.error(`No API key found for video ${video.id}`);
          continue;
        }

        let statusUrl: string;
        let resultUrl: string;
        let falEndpoint: string;

        if (video.fal_status_url && video.fal_response_url) {
          statusUrl = video.fal_status_url;
          resultUrl = video.fal_response_url;
          console.log(`Using stored URLs for video ${video.id}`);
        } else {
          falEndpoint = video.fal_endpoint || getFalEndpoint(video.model_version, video.variant);
          statusUrl = `https://queue.fal.run/${falEndpoint}/requests/${video.request_id}/status`;
          resultUrl = `https://queue.fal.run/${falEndpoint}/requests/${video.request_id}`;
          console.log(`Using constructed URLs with endpoint: ${falEndpoint}`);
        }

        console.log(`Status URL: ${statusUrl}`);

        const statusResponse = await fetch(statusUrl, {
          method: "GET",
          headers: {
            "Authorization": `Key ${apiKeyToUse}`,
          },
        });

        if (!statusResponse.ok) {
          console.error(`Failed to check status for ${video.request_id}:`, statusResponse.status, statusResponse.statusText);
          const errorText = await statusResponse.text();
          console.error(`Error response:`, errorText);
          continue;
        }

        const statusData = await statusResponse.json();
        console.log(`Status data for ${video.request_id}:`, statusData);

        if (statusData.status === "COMPLETED") {
          console.log(`Video ${video.request_id} is completed, fetching result...`);
          const resultResponse = await fetch(
            resultUrl,
            {
              method: "GET",
              headers: {
                "Authorization": `Key ${apiKeyToUse}`,
              },
            }
          );

          if (resultResponse.ok) {
            const resultData = await resultResponse.json();
            console.log(`Result data for ${video.request_id}:`, resultData);

            const updateData: any = {
              status: "completed",
              completed_at: new Date().toISOString(),
            };

            if (resultData.video && resultData.video.url) {
              updateData.video_url = resultData.video.url;
            }

            console.log(`Updating database for ${video.id} with:`, updateData);
            const { error: updateError } = await supabase
              .from("generation_history")
              .update(updateData)
              .eq("id", video.id);

            if (updateError) {
              console.error(`Failed to update database for ${video.id}:`, updateError);
            } else {
              console.log(`Successfully updated ${video.id} to completed`);
              updated++;
            }
          } else {
            console.error(`Failed to fetch result for ${video.request_id}:`, resultResponse.status);
          }
        } else if (statusData.status === "FAILED" || statusData.status === "CANCELLED") {
          console.log(`Video ${video.request_id} failed or was cancelled`);
          await supabase
            .from("generation_history")
            .update({ status: "failed" })
            .eq("id", video.id);

          if (video.api_key_id) {
            const { data: currentApiKey } = await supabase
              .from("api_keys")
              .select("credits")
              .eq("id", video.api_key_id)
              .maybeSingle();

            if (currentApiKey) {
              await supabase
                .from("api_keys")
                .update({ credits: currentApiKey.credits + video.credits_used })
                .eq("id", video.api_key_id);
            }
          } else {
            const { data: currentUser } = await supabase
              .from("users")
              .select("credits")
              .eq("id", video.user_id)
              .maybeSingle();

            if (currentUser) {
              await supabase
                .from("users")
                .update({ credits: currentUser.credits + video.credits_used })
                .eq("id", video.user_id);
            }
          }

          failed++;
        } else {
          console.log(`Video ${video.request_id} still processing with status:`, statusData.status);
          stillProcessing++;
        }
      } catch (err) {
        console.error(`Error processing video ${video.id}:`, err);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        total: processingVideos.length,
        updated,
        failed,
        stillProcessing,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

function getFalEndpoint(modelVersion: string, variant: string): string {
  const versionVariantMap: { [key: string]: { [key: string]: string } } = {
    'v2.6': {
      'text-to-video': 'fal-ai/kling-video/v2.6/pro/text-to-video',
      'image-to-video': 'fal-ai/kling-video/v2.6/pro/image-to-video',
      'motion-control-standard': 'fal-ai/kling-video/v2.6/standard/motion-control',
      'motion-control-pro': 'fal-ai/kling-video/v2.6/pro/motion-control',
    },
    'v2.5-turbo': {
      'text-to-video-pro': 'fal-ai/kling-video/v2.5-turbo/pro/text-to-video',
      'image-to-video-standard': 'fal-ai/kling-video/v2.5-turbo/standard/image-to-video',
      'image-to-video-pro': 'fal-ai/kling-video/v2.5-turbo/pro/image-to-video',
    },
    'v2.1': {
      'image-to-video-standard': 'fal-ai/kling-video/v2.1/standard/image-to-video',
      'image-to-video-pro': 'fal-ai/kling-video/v2.1/pro/image-to-video',
    },
  };

  const versionMap = versionVariantMap[modelVersion];
  if (versionMap && versionMap[variant]) {
    return versionMap[variant];
  }

  return 'fal-ai/kling-video/v2.6/pro/text-to-video';
}