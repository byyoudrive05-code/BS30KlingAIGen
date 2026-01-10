import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

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
    const { username } = await req.json();

    if (!username) {
      return new Response(
        JSON.stringify({ error: "Username is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("username", username)
      .maybeSingle();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Username tidak ditemukan" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const email = `${username}@internal.app`;
    const password = "default123456";

    if (!user.auth_id) {
      const { data: signUpData, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          username: username,
          app_user_id: user.id,
        },
      });

      if (signUpError) {
        return new Response(
          JSON.stringify({ error: "Failed to create auth user: " + signUpError.message }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const { error: updateError } = await supabaseAdmin
        .from("users")
        .update({ auth_id: signUpData.user.id })
        .eq("id", user.id);

      if (updateError) {
        console.error("Failed to update user with auth_id:", updateError);
      }

      user.auth_id = signUpData.user.id;
    }

    return new Response(
      JSON.stringify({
        user: user,
        email: email,
        password: password,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Error in auth-login:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});