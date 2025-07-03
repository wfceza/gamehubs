
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VERIFY-PAYMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Starting payment verification");
    
    const { sessionId } = await req.json();
    if (!sessionId) {
      throw new Error("Session ID is required");
    }
    logStep("Session ID received", { sessionId });

    // Use service role for secure operations
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("Stripe secret key not configured");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    
    // Check if payment already processed (idempotency check)
    const { data: existingVerification } = await supabaseClient
      .from('payment_verifications')
      .select('*')
      .eq('stripe_session_id', sessionId)
      .single();

    if (existingVerification) {
      logStep("Payment already processed", { sessionId });
      return new Response(JSON.stringify({ 
        success: true, 
        message: "Payment already processed",
        goldAmount: existingVerification.gold_amount
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Retrieve session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    logStep("Retrieved Stripe session", { 
      status: session.payment_status,
      customerEmail: session.customer_email 
    });

    if (session.payment_status !== 'paid') {
      throw new Error("Payment not completed");
    }

    // Get user by email
    const { data: { users }, error: userError } = await supabaseClient.auth.admin.listUsers();
    if (userError) throw userError;

    const user = users?.find(u => u.email === session.customer_email);
    if (!user) {
      throw new Error("User not found");
    }
    logStep("User found", { userId: user.id, email: user.email });

    // Calculate gold amount based on session amount
    const amountInCents = session.amount_total || 0;
    let goldAmount = 0;

    // Validate and calculate gold amount securely
    if (session.metadata?.goldAmount) {
      goldAmount = parseInt(session.metadata.goldAmount);
    } else if (session.metadata?.customAmount) {
      goldAmount = parseInt(session.metadata.customAmount);
    } else {
      // Fallback calculation based on amount (1 cent = 1 gold)
      goldAmount = amountInCents;
    }

    // Security validation
    if (goldAmount <= 0 || goldAmount > 100000) {
      throw new Error("Invalid gold amount");
    }

    // Verify amount matches expected calculation
    const expectedAmount = goldAmount; // 1 gold = 1 cent
    if (amountInCents !== expectedAmount) {
      logStep("Amount mismatch detected", { 
        expected: expectedAmount, 
        actual: amountInCents 
      });
      
      // Log security event
      await supabaseClient.rpc('log_security_event', {
        p_user_id: user.id,
        p_event_type: 'payment_amount_mismatch',
        p_event_data: {
          session_id: sessionId,
          expected_amount: expectedAmount,
          actual_amount: amountInCents,
          gold_amount: goldAmount
        }
      });
    }

    logStep("Calculated gold amount", { goldAmount, amountInCents });

    // Record payment verification (prevents duplicate processing)
    const { error: verificationError } = await supabaseClient
      .from('payment_verifications')
      .insert({
        stripe_session_id: sessionId,
        user_id: user.id,
        gold_amount: goldAmount
      });

    if (verificationError) {
      throw new Error(`Failed to record payment verification: ${verificationError.message}`);
    }

    // Get current gold balance
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('gold')
      .eq('id', user.id)
      .single();

    const currentGold = profile?.gold || 0;
    const newGoldBalance = currentGold + goldAmount;

    // Update user's gold balance
    const { error: updateError } = await supabaseClient
      .from('profiles')
      .update({ gold: newGoldBalance })
      .eq('id', user.id);

    if (updateError) {
      throw new Error(`Failed to update gold balance: ${updateError.message}`);
    }

    // Log successful payment
    await supabaseClient.rpc('log_security_event', {
      p_user_id: user.id,
      p_event_type: 'payment_processed',
      p_event_data: {
        session_id: sessionId,
        gold_amount: goldAmount,
        previous_gold: currentGold,
        new_gold: newGoldBalance,
        amount_paid: amountInCents
      }
    });

    logStep("Payment processed successfully", { 
      goldAmount, 
      newBalance: newGoldBalance 
    });

    return new Response(JSON.stringify({ 
      success: true, 
      goldAmount,
      newBalance: newGoldBalance
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("Payment verification failed", { error: errorMessage });
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
