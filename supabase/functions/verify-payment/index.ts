// supabase/functions/verify_payment/index.ts

// Import necessary modules for Deno and Supabase client
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// Define CORS headers to allow requests from any origin (adjust for production)
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper function for consistent logging
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VERIFY-PAYMENT] ${step}${detailsStr}`);
};

// Main entry point for the Edge Function
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 }); // 204 No Content for OPTIONS
  }

  try {
    logStep("Function execution started.");

    // Ensure the request method is POST, as webhooks are typically POST requests
    if (req.method !== "POST") {
      logStep("Invalid request method", { method: req.method });
      return new Response(JSON.stringify({ success: false, error: "Method Not Allowed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 405, // Method Not Allowed
      });
    }

    // Read the entire request body as JSON.
    // Paystack sends a full event object in the webhook payload.
    const eventBody = await req.json();
    logStep("Received webhook event body", { event: eventBody.event, reference: eventBody.data?.reference });

    // --- IMPORTANT SECURITY STEP (FOR PRODUCTION) ---
    // Implement Paystack webhook signature verification here.
    // This ensures the webhook truly originated from Paystack and hasn't been tampered with.
    // Deno doesn't have a built-in crypto.createHmac like Node.js, so you'd need to
    // import a compatible crypto library or implement it manually.
    // For example:
    // import { createHmac } from "https://deno.land/std@0.190.0/node/crypto.ts"; // Or a more suitable Deno crypto lib
    // const signature = req.headers.get('x-paystack-signature');
    // const paystackSecret = Deno.env.get("PAYSTACK_SECRET_KEY");
    // const expectedSignature = createHmac('sha512', paystackSecret).update(JSON.stringify(eventBody)).digest('hex');
    // if (!signature || signature !== expectedSignature) {
    //   logStep("Webhook signature verification failed.");
    //   return new Response(JSON.stringify({ success: false, error: "Unauthorized: Invalid signature" }), {
    //     headers: { ...corsHeaders, "Content-Type": "application/json" },
    //     status: 401, // Unauthorized
    //   });
    // }
    // -------------------------------------------------

    // Check the event type. We are only interested in successful payment events.
    if (eventBody.event !== 'charge.success' && eventBody.event !== 'transfer.success') {
      logStep("Ignoring non-success or irrelevant event type", { event: eventBody.event });
      // Return 200 OK for irrelevant events to prevent Paystack from retrying them.
      return new Response(JSON.stringify({ message: `Event type '${eventBody.event}' not processed by this function.` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Extract the transaction reference from the nested 'data' object
    const reference = eventBody.data?.reference;
    if (!reference) {
      throw new Error("Payment reference not found in webhook data.");
    }
    logStep("Payment reference extracted from webhook", { reference });

    // Initialize Supabase client with the service role key for backend operations
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );
    logStep("Supabase client initialized.");

    // Retrieve Paystack secret key from environment variables
    const paystackKey = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!paystackKey) {
      throw new Error("Paystack secret key not configured in environment variables.");
    }
    logStep("Paystack secret key loaded.");

    // Idempotency check: Check if this payment reference has already been processed
    // NOTE: Consider renaming 'stripe_session_id' in your 'payment_verifications' table
    // to 'paystack_reference' or 'transaction_reference' for better clarity.
    const { data: existingVerification, error: existingVerificationError } = await supabaseClient
      .from('payment_verifications')
      .select('*')
      .eq('stripe_session_id', reference) // Using existing field for now
      .single();

    if (existingVerificationError && existingVerificationError.code !== 'PGRST116') { // PGRST116 means "no rows found"
        logStep("Error checking existing verification", { error: existingVerificationError.message });
        throw existingVerificationError;
    }

    if (existingVerification) {
      logStep("Payment already processed (idempotent check passed).", { reference });
      return new Response(JSON.stringify({ 
        success: true, 
        message: "Payment already processed",
        goldAmount: existingVerification.gold_amount
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
    logStep("Payment not previously processed, proceeding with verification.");

    // Verify transaction with Paystack's API for definitive status
    // This step is a good practice for double-checking, even if the webhook says "success".
    const paystackResponse = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${paystackKey}`,
        "Content-Type": "application/json",
      },
    });

    const paystackData = await paystackResponse.json();
    logStep("Paystack API verification response", { 
      apiStatus: paystackData.status,
      transactionStatus: paystackData.data?.status,
      customerEmail: paystackData.data?.customer?.email 
    });

    // Check if Paystack's API also confirms success
    if (!paystackData.status || paystackData.data?.status !== 'success') {
      throw new Error(`Payment not confirmed as successful by Paystack API. Status: ${paystackData.data?.status || 'N/A'}`);
    }

    // Extract necessary data from the verified Paystack response
    const amountInKobo = paystackData.data.amount || 0;
    const customerEmail = paystackData.data.customer?.email;

    if (!customerEmail) {
        throw new Error("Customer email not found in Paystack transaction data.");
    }

    // Find the user in your Supabase auth.users table by email
    const { data: { users }, error: userListError } = await supabaseClient.auth.admin.listUsers();
    if (userListError) {
        logStep("Error listing users from Supabase Auth", { error: userListError.message });
        throw userListError;
    }

    const user = users?.find(u => u.email === customerEmail);
    if (!user) {
      logStep("User not found in Supabase Auth for email", { email: customerEmail });
      throw new Error(`User with email ${customerEmail} not found in your application.`);
    }
    logStep("User found in Supabase Auth", { userId: user.id, email: user.email });

    // Calculate gold amount. Prioritize metadata if available, otherwise use a fallback calculation.
    let goldAmount = 0;
    if (paystackData.data.metadata?.goldAmount) {
      goldAmount = parseInt(paystackData.data.metadata.goldAmount);
      logStep("Gold amount from metadata", { goldAmount });
    } else {
      // Fallback calculation: 10 kobo = 1 gold (adjust this logic as per your business rules)
      goldAmount = Math.floor(amountInKobo / 10);
      logStep("Gold amount calculated from amount", { goldAmount, amountInKobo });
    }

    // Basic security validation for gold amount
    if (goldAmount <= 0 || goldAmount > 1000000) { // Max gold amount limit
      throw new Error(`Invalid or suspicious gold amount: ${goldAmount}`);
    }

    // Record the payment verification in your 'payment_verifications' table
    const { error: verificationInsertError } = await supabaseClient
      .from('payment_verifications')
      .insert({
        stripe_session_id: reference, // Remember to rename this column if possible
        user_id: user.id,
        gold_amount: goldAmount,
        // Add more relevant fields like amount_paid, currency, payment_provider etc.
        amount_paid: amountInKobo,
        currency: paystackData.data.currency,
        payment_provider: 'paystack',
        status: 'success'
      });

    if (verificationInsertError) {
      logStep("Failed to record payment verification in DB", { error: verificationInsertError.message });
      throw new Error(`Failed to record payment verification: ${verificationInsertError.message}`);
    }
    logStep("Payment verification recorded in database.");

    // Get current gold balance from the user's profile
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('gold')
      .eq('id', user.id)
      .single();

    if (profileError) {
        logStep("Error fetching user profile for gold update", { error: profileError.message });
        throw profileError;
    }

    const currentGold = profile?.gold || 0;
    const newGoldBalance = currentGold + goldAmount;
    logStep("Updating user gold balance", { currentGold, goldAmount, newGoldBalance });

    // Update user's gold balance in the 'profiles' table
    const { error: updateGoldError } = await supabaseClient
      .from('profiles')
      .update({ gold: newGoldBalance })
      .eq('id', user.id);

    if (updateGoldError) {
      logStep("Failed to update gold balance in DB", { error: updateGoldError.message });
      throw new Error(`Failed to update gold balance: ${updateGoldError.message}`);
    }
    logStep("User gold balance updated successfully.");

    // Log a security event for the successful payment processing
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
    logStep("Security event logged for successful payment.");

    logStep("Payment verification and gold award completed successfully!");

    // Return a 200 OK response to Paystack to acknowledge successful webhook processing
    return new Response(JSON.stringify({ 
      success: true, 
      message: "Payment processed and gold awarded.",
      goldAmount,
      newBalance: newGoldBalance
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("Payment verification failed in catch block", { error: errorMessage });
    
    // Return a 500 status for errors so Paystack retries the webhook
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
