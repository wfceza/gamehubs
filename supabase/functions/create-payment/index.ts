import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-PAYMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Starting payment creation with Paystack");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;

    if (!user?.email) {
      throw new Error("User not authenticated");
    }
    logStep("User authenticated", { userId: user.id, email: user.email });

    const requestData = await req.json();
    const { goldAmount, customAmount } = requestData;

    let finalGoldAmount = 0;
    let finalPrice = 0;

    // Validate and calculate amounts (in kobo for Paystack - 1 Naira = 100 kobo)
    if (goldAmount) {
      const validAmounts = [100, 500, 1000, 2500, 5000];
      if (!validAmounts.includes(goldAmount)) {
        throw new Error("Invalid gold package selected");
      }
      finalGoldAmount = goldAmount;
      finalPrice = goldAmount * 10; // 1 gold = 10 kobo (0.1 Naira)
    } else if (customAmount) {
      const customGold = parseInt(customAmount);
      if (isNaN(customGold) || customGold < 10 || customGold > 100000) {
        throw new Error("Custom amount must be between 10 and 100,000 gold");
      }
      finalGoldAmount = customGold;
      finalPrice = customGold * 10; // 1 gold = 10 kobo
    } else {
      throw new Error("No valid amount specified");
    }

    logStep("Amount validated", { finalGoldAmount, finalPrice });

    const paystackKey = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!paystackKey) {
      throw new Error("Paystack secret key not configured");
    }

    // Create Paystack transaction
    const paystackResponse = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${paystackKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: user.email,
        amount: finalPrice, // Amount in kobo
        currency: "NGN",
        reference: `gold_${user.id}_${Date.now()}`,
        callback_url: `${req.headers.get("origin")}/payment-success`,
        metadata: {
          userId: user.id,
          goldAmount: finalGoldAmount,
          userEmail: user.email
        }
      }),
    });

    const paystackData = await paystackResponse.json();

    if (!paystackData.status) {
      throw new Error(`Paystack error: ${paystackData.message}`);
    }

    logStep("Paystack transaction created", { 
      reference: paystackData.data.reference,
      goldAmount: finalGoldAmount 
    });

    // Log payment initiation for security tracking
    const serviceRoleClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    await serviceRoleClient.rpc('log_security_event', {
      p_user_id: user.id,
      p_event_type: 'payment_initiated',
      p_event_data: {
        reference: paystackData.data.reference,
        gold_amount: finalGoldAmount,
        price_kobo: finalPrice,
        payment_provider: 'paystack'
      }
    });

    return new Response(JSON.stringify({ 
      url: paystackData.data.authorization_url,
      reference: paystackData.data.reference
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("Payment creation failed", { error: errorMessage });
    
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});