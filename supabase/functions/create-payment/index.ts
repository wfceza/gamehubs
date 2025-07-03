
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
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
    logStep("Starting payment creation");

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

    // Validate and calculate amounts
    if (goldAmount) {
      // Predefined package
      const validAmounts = [100, 500, 1000, 2500, 5000];
      if (!validAmounts.includes(goldAmount)) {
        throw new Error("Invalid gold package selected");
      }
      finalGoldAmount = goldAmount;
      finalPrice = goldAmount; // 1 gold = 1 cent
    } else if (customAmount) {
      const customGold = parseInt(customAmount);
      if (isNaN(customGold) || customGold < 10 || customGold > 100000) {
        throw new Error("Custom amount must be between 10 and 100,000 gold");
      }
      finalGoldAmount = customGold;
      finalPrice = customGold; // 1 gold = 1 cent
    } else {
      throw new Error("No valid amount specified");
    }

    logStep("Amount validated", { finalGoldAmount, finalPrice });

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("Stripe secret key not configured");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Check for existing customer
    const customers = await stripe.customers.list({
      email: user.email,
      limit: 1
    });

    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing customer found", { customerId });
    } else {
      logStep("No existing customer found, will create new one");
    }

    // Create checkout session with enhanced security
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `${finalGoldAmount} Gold`,
              description: `Purchase ${finalGoldAmount} gold for GameHub`
            },
            unit_amount: finalPrice,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/`,
      metadata: {
        userId: user.id,
        goldAmount: finalGoldAmount.toString(),
        userEmail: user.email
      },
      expires_at: Math.floor(Date.now() / 1000) + (30 * 60), // 30 minutes
    });

    logStep("Checkout session created", { 
      sessionId: session.id, 
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
        session_id: session.id,
        gold_amount: finalGoldAmount,
        price_cents: finalPrice,
        customer_id: customerId
      }
    });

    return new Response(JSON.stringify({ url: session.url }), {
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
