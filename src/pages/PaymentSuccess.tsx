
import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Coins, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [processing, setProcessing] = useState(true);
  const [goldAdded, setGoldAdded] = useState(0);
  const [newBalance, setNewBalance] = useState(0);

  useEffect(() => {
    const verifyPayment = async () => {
      const sessionId = searchParams.get('session_id');
      const goldAmount = searchParams.get('gold');

      if (!sessionId) {
        toast({
          title: "Invalid Payment",
          description: "No payment session found",
          variant: "destructive"
        });
        navigate('/');
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke('verify-payment', {
          body: { sessionId }
        });

        if (error) throw error;

        setGoldAdded(data.goldAdded);
        setNewBalance(data.newBalance);
        
        toast({
          title: "Payment Successful!",
          description: `${data.goldAdded} Gold has been added to your account!`,
        });

      } catch (error) {
        console.error('Payment verification error:', error);
        toast({
          title: "Payment Verification Failed",
          description: "There was an issue verifying your payment. Please contact support.",
          variant: "destructive"
        });
      } finally {
        setProcessing(false);
      }
    };

    verifyPayment();
  }, [searchParams, navigate]);

  if (processing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <Card className="bg-gray-800/90 backdrop-blur-lg shadow-2xl max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
            <h2 className="text-white text-xl mb-2">Processing Payment...</h2>
            <p className="text-gray-300">Please wait while we verify your purchase.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <Card className="bg-gray-800/90 backdrop-blur-lg shadow-2xl max-w-md w-full">
        <CardHeader className="text-center">
          <CheckCircle className="h-16 w-16 text-green-400 mx-auto mb-4" />
          <CardTitle className="text-white text-2xl">Payment Successful!</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="bg-gradient-to-r from-yellow-600/20 to-yellow-400/20 border border-yellow-500/30 rounded-lg p-4">
            <Coins className="h-8 w-8 text-yellow-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-yellow-400">+{goldAdded} Gold</div>
            <div className="text-gray-300 text-sm">Added to your account</div>
          </div>
          
          <div className="text-white">
            <div className="text-sm text-gray-300">New Balance:</div>
            <div className="text-xl font-bold text-yellow-400">{newBalance} Gold</div>
          </div>

          <Button 
            onClick={() => navigate('/')}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Return to Game
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentSuccess;
