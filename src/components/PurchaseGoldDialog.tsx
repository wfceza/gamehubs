
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Coins, CreditCard, Gift } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface PurchaseGoldDialogProps {
  currentUser: any;
  onPurchaseComplete: () => void;
}

const PurchaseGoldDialog = ({ currentUser, onPurchaseComplete }: PurchaseGoldDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const goldPackages = [
    { id: 100, gold: 100, price: 10, bonus: 0, popular: false },
    { id: 500, gold: 500, price: 50, bonus: 50, popular: false },
    { id: 1000, gold: 1000, price: 100, bonus: 150, popular: true },
    { id: 2500, gold: 2500, price: 250, bonus: 500, popular: false },
    { id: 5000, gold: 5000, price: 500, bonus: 1250, popular: false },
  ];

  const handlePackageSelect = (packageId: number) => {
    setSelectedPackage(packageId);
    setCustomAmount("");
  };

  const handleCustomAmountChange = (value: string) => {
    setCustomAmount(value);
    setSelectedPackage(null);
  };

  const handlePurchase = async () => {
    if (!currentUser?.id) {
      toast({
        title: "Authentication Error",
        description: "Please log in to make a purchase",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      let requestData = {};

      if (selectedPackage) {
        requestData = { goldAmount: selectedPackage };
      } else if (customAmount) {
        const customGold = parseInt(customAmount);
        if (isNaN(customGold) || customGold < 10) {
          toast({
            title: "Invalid Amount",
            description: "Please enter a valid amount (minimum 10 Gold)",
            variant: "destructive"
          });
          setLoading(false);
          return;
        }
        requestData = { customAmount: customAmount };
      } else {
        toast({
          title: "No Selection",
          description: "Please select a package or enter a custom amount",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      console.log('Creating payment session with Paystack:', requestData);

      // Create payment session
      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: requestData
      });

      console.log('Payment response:', { data, error });

      if (error) {
        console.error('Payment creation error:', error);
        throw new Error(error.message || 'Failed to create payment session');
      }

      if (!data?.url) {
        throw new Error('No payment URL received');
      }

      // Open Paystack checkout in a new tab
      window.open(data.url, '_blank');
      
      setIsOpen(false);
      setSelectedPackage(null);
      setCustomAmount("");
      
      toast({
        title: "Payment Started",
        description: "Complete your purchase in the new tab to receive your Gold!",
      });

    } catch (error) {
      console.error('Purchase error:', error);
      toast({
        title: "Purchase Failed",
        description: error.message || "There was an error starting your payment. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="bg-yellow-600 hover:bg-yellow-700 text-white">
          <Coins className="w-4 h-4 mr-2" />
          Buy Gold
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white text-2xl flex items-center">
            <Coins className="w-6 h-6 mr-2 text-yellow-400" />
            Purchase Gold
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Current Gold Display */}
          <div className="text-center">
            <div className="text-lg text-gray-300">Current Gold Balance</div>
            <div className="text-3xl font-bold text-yellow-400">{currentUser?.gold || 0}</div>
          </div>

          {/* Gold Packages */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Gold Packages</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {goldPackages.map((package_) => (
                <Card
                  key={package_.id}
                  className={`cursor-pointer transition-all duration-200 ${
                    selectedPackage === package_.id
                      ? 'ring-2 ring-yellow-500 bg-gray-700'
                      : 'bg-gray-750 hover:bg-gray-700'
                  } ${package_.popular ? 'ring-2 ring-blue-500' : ''}`}
                  onClick={() => handlePackageSelect(package_.id)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-white text-lg">
                        {package_.gold.toLocaleString()} Gold
                      </CardTitle>
                      {package_.popular && (
                        <Badge className="bg-blue-600 text-white">
                          Popular
                        </Badge>
                      )}
                    </div>
                    {package_.bonus > 0 && (
                      <div className="text-sm text-green-400">
                        +{package_.bonus} Bonus Gold
                      </div>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-yellow-400 mb-2">
                      ₦{package_.price}
                    </div>
                    <div className="text-sm text-gray-300">
                      Total: {(package_.gold + package_.bonus).toLocaleString()} Gold
                    </div>
                    {package_.bonus > 0 && (
                      <div className="text-xs text-green-400 mt-1">
                        <Gift className="w-3 h-3 inline mr-1" />
                        {Math.round((package_.bonus / package_.gold) * 100)}% Bonus
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Custom Amount */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Custom Amount</h3>
            <Card className={`${!selectedPackage && customAmount ? 'ring-2 ring-yellow-500' : ''} bg-gray-750`}>
              <CardContent className="p-4">
                <div className="space-y-3">
                  <Label className="text-white">Enter Custom Gold Amount</Label>
                  <div className="flex space-x-3">
                    <Input
                      type="number"
                      min="10"
                      value={customAmount}
                      onChange={(e) => handleCustomAmountChange(e.target.value)}
                      placeholder="Minimum 10 Gold"
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                    <div className="flex items-center text-gray-300 min-w-fit">
                      = ₦{customAmount ? (parseInt(customAmount) * 0.1).toFixed(2) : "0.00"}
                    </div>
                  </div>
                  <div className="text-sm text-gray-400">
                    Rate: ₦0.10 per Gold
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Purchase Button */}
          <div className="flex justify-center pt-4">
            <Button
              onClick={handlePurchase}
              disabled={loading || (!selectedPackage && !customAmount)}
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-lg"
            >
              {loading ? (
                <>Processing...</>
              ) : (
                <>
                  <CreditCard className="w-5 h-5 mr-2" />
                  Purchase Gold
                </>
              )}
            </Button>
          </div>

          {/* Disclaimer */}
          <div className="text-xs text-gray-400 text-center border-t border-gray-700 pt-4">
            <p>Payments are processed securely through Paystack.</p>
            <p>Your gold will be added to your account after successful payment.</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PurchaseGoldDialog;
