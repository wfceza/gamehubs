// supabase/functions/verify-payment/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createHmac } from 'https://deno.land/std@0.177.0/node/crypto.ts';

console.log(`[VERIFY-PAYMENT] Function starting up`);

serve(async (req) => {
  console.log(`[VERIFY-PAYMENT] Received request`);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  try {
    // Initialize Supabase client with service role key for database operations
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', // Ensure this key has full database access
      {
        auth: {
          persistSession: false, // Important for server-side functions
        },
      }
    );

    // Retrieve Paystack secret key from environment variables
    const paystackSecretKey = Deno.env.get('PAYSTACK_SECRET_KEY');
    if (!paystackSecretKey) {
      console.error('[VERIFY-PAYMENT] PAYSTACK_SECRET_KEY is not set in environment variables.');
      return new Response(
        JSON.stringify({ success: false, error: 'Server configuration error: Paystack secret key missing.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Parse the incoming request body as JSON (this is the Paystack webhook payload)
   const rawBody = await req.text(); // Get the raw request body
  const event = JSON.parse(rawBody); // Then parse it as JSON
    console.log(`[VERIFY-PAYMENT] Received webhook event type: ${event.event}`);

    // --- Webhook Signature Verification (Highly Recommended for Production) ---
    // In a production environment, you would verify the x-paystack-signature header
    // to ensure the webhook genuinely came from Paystack and not a malicious actor.
    // This typically involves hashing the raw request body with your Paystack secret key
    // and comparing it to the signature header.
    // For example:
    // --- Webhook Signature Verification (Highly Recommended for Production) ---
const signature = req.headers.get('x-paystack-signature');
if (!signature) {
    console.warn('[VERIFY-PAYMENT] Missing x-paystack-signature header. Rejecting request.');
    return new Response(JSON.stringify({ success: false, error: 'Missing signature header' }), { status: 400 });
}

const hash = createHmac('sha512', paystackSecretKey).update(rawBody).digest('hex');
if (hash !== signature) {
    console.warn('[VERIFY-PAYMENT] Webhook signature mismatch. Possible tampering. Rejecting request.');
    return new Response(JSON.stringify({ success: false, error: 'Invalid signature' }), { status: 401 });
}
console.log('[VERIFY-PAYMENT] Webhook signature verified successfully.');
// -------------------------------------------------------------------------
    // For now, we proceed without signature verification for debugging simplicity.
    // -------------------------------------------------------------------------

    // Only process 'charge.success' events
    if (event.event === 'charge.success') {
      // Destructure relevant data from the Paystack event payload
      const { reference, amount, metadata, customer } = event.data;

      // Log extracted values for debugging
      console.log(`[VERIFY-PAYMENT] Extracted reference: ${reference}`);
      console.log(`[VERIFY-PAYMENT] Extracted amount: ${amount}`);
      console.log(`[VERIFY-PAYMENT] Extracted metadata: ${JSON.stringify(metadata)}`);
      console.log(`[VERIFY-PAYMENT] Extracted customer email: ${customer.email}`);

      // Ensure critical metadata fields exist
      const userId = metadata?.userId;
      const goldAmountString = metadata?.goldAmount; // Keep as string initially

      if (!userId || !goldAmountString || !customer.email) {
        console.error(`[VERIFY-PAYMENT] Missing critical data in metadata or customer: userId=${userId}, goldAmount=${goldAmountString}, email=${customer.email}`);
        return new Response(
          JSON.stringify({ success: false, error: 'Missing required data in webhook payload metadata.' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Parse goldAmount to a number
      const goldAmount = parseInt(goldAmountString, 10);
      if (isNaN(goldAmount)) {
        console.error(`[VERIFY-PAYMENT] Invalid goldAmount in metadata: ${goldAmountString}`);
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid gold amount in webhook metadata.' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      console.log(`[VERIFY-PAYMENT] Processing charge.success for reference: ${reference}, amount: ${amount}, user: ${customer.email}, userId: ${userId}, goldAmount: ${goldAmount}`);

      // Verify the payment with Paystack's API
      const paystackVerifyUrl = `https://api.paystack.co/transaction/verify/${reference}`;
      console.log(`[VERIFY-PAYMENT] Verifying payment with Paystack URL: ${paystackVerifyUrl}`);

      const paystackResponse = await fetch(paystackVerifyUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${paystackSecretKey}`,
          'Content-Type': 'application/json',
        },
      });

      const paystackData = await paystackResponse.json();
      console.log(`[VERIFY-PAYMENT] Full Paystack verification response: ${JSON.stringify(paystackData)}`);

      // Check if Paystack verification was successful and amounts match
      if (
        paystackData.status &&
        paystackData.data && // Ensure data object exists
        paystackData.data.status === 'success' &&
        paystackData.data.amount === amount // Compare amounts (Paystack amount is in kobo/cents)
      ) {
        console.log(`[VERIFY-PAYMENT] Paystack verification successful for reference: ${reference}`);

        // Fetch current user's gold balance from Supabase
        const { data: userProfile, error: userError } = await supabaseClient
          .from('profiles')
          .select('gold')
          .eq('id', userId)
          .single();

        if (userError) {
          console.error(`[VERIFY-PAYMENT] Error fetching user profile for ID ${userId}: ${userError.message}`);
          return new Response(
            JSON.stringify({ success: false, error: `Error fetching user profile: ${userError.message}` }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
          );
        }

        // Calculate new gold balance
        const currentGold = userProfile?.gold || 0; // Default to 0 if user has no gold field yet
        const newGoldBalance = currentGold + goldAmount;

        // Update user's gold balance in Supabase
        const { error: updateError } = await supabaseClient
          .from('profiles')
          .update({ gold: newGoldBalance })
          .eq('id', userId);

        if (updateError) {
          console.error(`[VERIFY-PAYMENT] Error updating gold for user ${userId}: ${updateError.message}`);
          return new Response(
            JSON.stringify({ success: false, error: `Error updating gold: ${updateError.message}` }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
          );
        }

        console.log(`[VERIFY-PAYMENT] Gold updated for user ${userId}. Old balance: ${currentGold}, Added: ${goldAmount}, New balance: ${newGoldBalance}`);
        return new Response(
          JSON.stringify({ success: true, goldAmount, newGoldBalance }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );

      } else {
        // Paystack verification failed (e.g., status is not 'success' or amounts don't match)
        console.error(`[VERIFY-PAYMENT] Paystack verification failed for reference ${reference}. Paystack response: ${JSON.stringify(paystackData)}`);
        return new Response(
          JSON.stringify({ success: false, error: 'Paystack verification failed', details: paystackData }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    } else {
      // Ignore other event types (e.g., 'charge.failed', 'transfer.success')
      console.log(`[VERIFY-PAYMENT] Received non-charge.success event: ${event.event}. Ignoring.`);
      return new Response(
        JSON.stringify({ success: true, message: 'Event type not handled' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    // Catch any unexpected errors during function execution
    console.error(`[VERIFY-PAYMENT] Uncaught error during execution: ${error.message}`);
    // Log the full error object if possible for more details
    if (error instanceof Error) {
      console.error(`[VERIFY-PAYMENT] Error stack: ${error.stack}`);
    }
    return new Response(
      JSON.stringify({ success: false, error: `Internal server error: ${error.message}` }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
