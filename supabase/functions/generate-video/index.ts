import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface GenerateVideoRequest {
  userId: string;
  modelType: string;
  modelVersion: string;
  variant: string;
  prompt: string;
  imageUrl?: string;
  imageUrl2?: string;
  videoUrl?: string;
  aspectRatio?: string;
  duration?: number;
  generateAudio?: boolean;
  characterOrientation?: string;
  keepOriginalSound?: boolean;
}

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

    const {
      userId,
      modelType,
      modelVersion,
      variant,
      prompt,
      imageUrl,
      imageUrl2,
      videoUrl,
      aspectRatio,
      duration,
      generateAudio,
      characterOrientation,
      keepOriginalSound,
    }: GenerateVideoRequest = await req.json();

    const { data: user, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "User not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const audioEnabled = generateAudio ?? false;
    const isPerSecondPricing = variant.includes('motion-control');

    let priceQuery = supabase
      .from("credit_pricing")
      .select("price, is_per_second")
      .eq("model_type", modelType)
      .eq("model_version", modelVersion)
      .eq("variant", variant)
      .eq("role", user.role || 'user');

    if (!isPerSecondPricing && duration) {
      priceQuery = priceQuery.eq("duration", duration);
    }

    if (variant === 'text-to-video' || variant === 'image-to-video') {
      priceQuery = priceQuery.eq("audio_enabled", audioEnabled);
    }

    const { data: priceData, error: priceError } = await priceQuery.maybeSingle();

    if (priceError || !priceData) {
      return new Response(
        JSON.stringify({ error: "Invalid configuration or pricing not found" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let creditsNeeded = priceData.price;
    if (priceData.is_per_second && duration) {
      creditsNeeded = priceData.price * duration;
    }

    const { data: apiKeys, error: apiKeysError } = await supabase
      .from("api_keys")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true)
      .gte("credits", creditsNeeded)
      .order("created_at", { ascending: true });

    let selectedApiKey = null;
    let useLegacyCredit = false;
    let apiKeyToUse = null;

    if (!apiKeysError && apiKeys && apiKeys.length > 0) {
      selectedApiKey = apiKeys[0];
      apiKeyToUse = selectedApiKey.api_key;
    } else if (user.api_key) {
      const totalUserCredits = Number(user.credits) || 0;
      if (totalUserCredits >= creditsNeeded) {
        useLegacyCredit = true;
        apiKeyToUse = user.api_key;
      }
    }

    if (!apiKeyToUse) {
      return new Response(
        JSON.stringify({
          error: "Kredit tidak cukup atau API key tidak valid. Silakan cek API key Anda di admin panel atau hubungi admin."
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const falEndpoint = getFalEndpoint(modelVersion, variant);

    const historyData: any = {
      user_id: userId,
      prompt,
      image_url: imageUrl,
      aspect_ratio: aspectRatio || 'default',
      duration: duration || 0,
      credits_used: creditsNeeded,
      status: "processing",
      fal_endpoint: falEndpoint,
      model_type: modelType,
      model_version: modelVersion,
      variant: variant,
      audio_enabled: audioEnabled,
      metadata: {
        imageUrl2,
        videoUrl,
        characterOrientation,
        keepOriginalSound,
      }
    };

    if (selectedApiKey) {
      historyData.api_key_id = selectedApiKey.id;
    }

    const { data: historyEntry, error: historyError } = await supabase
      .from("generation_history")
      .insert(historyData)
      .select()
      .single();

    if (historyError || !historyEntry) {
      return new Response(
        JSON.stringify({ error: "Failed to create history entry" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (selectedApiKey) {
      await supabase
        .from("api_keys")
        .update({ credits: selectedApiKey.credits - creditsNeeded })
        .eq("id", selectedApiKey.id);
    } else if (useLegacyCredit) {
      await supabase
        .from("users")
        .update({ credits: user.credits - creditsNeeded })
        .eq("id", userId);
    }

    const falPayload = buildFalPayload({
      prompt,
      imageUrl,
      imageUrl2,
      videoUrl,
      aspectRatio,
      duration,
      generateAudio: audioEnabled,
      characterOrientation,
      keepOriginalSound,
      variant,
    });

    console.log('FAL Endpoint:', falEndpoint);
    console.log('FAL Payload:', JSON.stringify(falPayload));

    try {
      const response = await fetch(`https://queue.fal.run/${falEndpoint}`, {
        method: "POST",
        headers: {
          "Authorization": `Key ${apiKeyToUse}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(falPayload),
      });

      const falResponse = await response.json();

      if (!response.ok) {
        console.error("FAL API error:", falResponse);

        await supabase
          .from("generation_history")
          .update({ status: "failed" })
          .eq("id", historyEntry.id);

        if (selectedApiKey) {
          await supabase
            .from("api_keys")
            .update({ credits: selectedApiKey.credits + creditsNeeded })
            .eq("id", selectedApiKey.id);
        } else if (useLegacyCredit) {
          await supabase
            .from("users")
            .update({ credits: user.credits + creditsNeeded })
            .eq("id", userId);
        }

        return new Response(
          JSON.stringify({
            error: falResponse?.error || falResponse?.detail || "Gagal memulai generate video"
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      await supabase
        .from("generation_history")
        .update({
          request_id: falResponse.request_id,
          fal_status_url: falResponse.status_url,
          fal_response_url: falResponse.response_url,
          fal_cancel_url: falResponse.cancel_url,
        })
        .eq("id", historyEntry.id);

      return new Response(
        JSON.stringify({
          success: true,
          message: "Video sedang diproses. Silakan tunggu beberapa saat.",
          historyId: historyEntry.id,
          requestId: falResponse.request_id,
          usedApiKeyId: selectedApiKey?.id || null,
          usedLegacyCredit: useLegacyCredit,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    } catch (error) {
      console.error("Failed to call FAL API:", error);

      await supabase
        .from("generation_history")
        .update({ status: "failed" })
        .eq("id", historyEntry.id);

      if (selectedApiKey) {
        await supabase
          .from("api_keys")
          .update({ credits: selectedApiKey.credits + creditsNeeded })
          .eq("id", selectedApiKey.id);
      } else if (useLegacyCredit) {
        await supabase
          .from("users")
          .update({ credits: user.credits + creditsNeeded })
          .eq("id", userId);
      }

      return new Response(
        JSON.stringify({
          error: "Gagal menghubungi FAL API"
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Video sedang diproses. Silakan tunggu beberapa saat.",
        historyId: historyEntry.id,
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
  const versionMap: { [key: string]: string } = {
    'v2.6-text-to-video': 'fal-ai/kling-video/v2.6/pro/text-to-video',
    'v2.6-image-to-video': 'fal-ai/kling-video/v2.6/pro/image-to-video',
    'v2.6-motion-control-standard': 'fal-ai/kling-video/v2.6/standard/motion-control',
    'v2.6-motion-control-pro': 'fal-ai/kling-video/v2.6/pro/motion-control',
    'v2.5-turbo-text-to-video-pro': 'fal-ai/kling-video/v2.5-turbo/pro/text-to-video',
    'v2.5-turbo-image-to-video-standard': 'fal-ai/kling-video/v2.5-turbo/standard/image-to-video',
    'v2.5-turbo-image-to-video-pro': 'fal-ai/kling-video/v2.5-turbo/pro/image-to-video',
    'v2.1-image-to-video-standard': 'fal-ai/kling-video/v2.1/standard/image-to-video',
    'v2.1-image-to-video-pro': 'fal-ai/kling-video/v2.1/pro/image-to-video',
  };

  const key = `${modelVersion}-${variant}`;
  return versionMap[key] || 'fal-ai/kling-video/v2.6/pro/text-to-video';
}

function buildFalPayload(params: {
  prompt: string;
  imageUrl?: string;
  imageUrl2?: string;
  videoUrl?: string;
  aspectRatio?: string;
  duration?: number;
  generateAudio?: boolean;
  characterOrientation?: string;
  keepOriginalSound?: boolean;
  variant: string;
}): any {
  const payload: any = {
    prompt: params.prompt,
  };

  if (params.imageUrl) {
    payload.image_url = params.imageUrl;
  }

  if (params.imageUrl2) {
    payload.tail_image_url = params.imageUrl2;
    console.log('Adding tail_image_url to payload:', params.imageUrl2);
  }
  
  if (params.videoUrl) {
    payload.video_url = params.videoUrl;
  }

  if (params.aspectRatio) {
    payload.aspect_ratio = params.aspectRatio;
  }

  if (params.duration) {
    payload.duration = params.duration.toString();
  }

  if (params.generateAudio !== undefined) {
    payload.generate_audio = params.generateAudio;
  }

  if (params.characterOrientation) {
    payload.character_orientation = params.characterOrientation;
  }

  if (params.keepOriginalSound !== undefined) {
    payload.keep_original_sound = params.keepOriginalSound;
  }

  return payload;
}