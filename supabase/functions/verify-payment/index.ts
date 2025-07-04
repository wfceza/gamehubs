
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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
    logStep("Starting payment verification with Paystack");
    
    const { reference } = await req.json();
    if (!reference) {
      throw new Error("Payment reference is required");
    }
    logStep("Payment reference received", { reference });

    // Use service role for secure operations
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const paystackKey = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!paystackKey) {
      throw new Error("Paystack secret key not configured");
    }

    // Check if payment already processed (idempotency check)
    const { data: existingVerification } = await supabaseClient
      .from('payment_verifications')
      .select('*')
      .eq('stripe_session_id', reference) // Reusing this field for Paystack reference
      .single();

    if (existingVerification) {
      logStep("Payment already processed", { reference });
      return new Response(JSON.stringify({ 
        success: true, 
        message: "Payment already processed",
        goldAmount: existingVerification.gold_amount
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Verify transaction with Paystack
    const paystackResponse = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${paystackKey}`,
        "Content-Type": "application/json",
      },
    });

    const paystackData = await paystackResponse.json();
    logStep("Retrieved Paystack transaction", { 
      status: paystackData.data?.status,
      customerEmail: paystackData.data?.customer?.email 
    });

    if (!paystackData.status || paystackData.data.status !== 'success') {
      throw new Error("Payment not completed or failed");
    }

    // Get user by email
    const { data: { users }, error: userError } = await supabaseClient.auth.admin.listUsers();
    if (userError) throw userError;

    const user = users?.find(u => u.email === paystackData.data.customer.email);
    if (!user) {
      throw new Error("User not found");
    }
    logStep("User found", { userId: user.id, email: user.email });

    // Calculate gold amount from metadata or amount
    const amountInKobo = paystackData.data.amount || 0;
    let goldAmount = 0;

    if (paystackData.data.metadata?.goldAmount) {
      goldAmount = parseInt(paystackData.data.metadata.goldAmount);
    } else {
      // Fallback calculation (10 kobo = 1 gold)
      goldAmount = Math.floor(amountInKobo / 10);
    }

    // Security validation
    if (goldAmount <= 0 || goldAmount > 100000) {
      throw new Error("Invalid gold amount");
    }

    logStep("Calculated gold amount", { goldAmount, amountInKobo });

    // Record payment verification
    const { error: verificationError } = await supabaseClient
      .from('payment_verifications')
      .insert({
        stripe_session_id: reference, // Reusing this field for Paystack reference
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
        reference: reference,
        gold_amount: goldAmount,
        previous_gold: currentGold,
        new_gold: newGoldBalance,
        amount_paid: amountInKobo,
        payment_provider: 'paystack'
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