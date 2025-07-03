
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Gamepad2, LogOut, Menu } from "lucide-react";
import PurchaseGoldDialog from "@/components/PurchaseGoldDialog";

interface NavigationProps {
  profile: any;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  onSignOut: () => void;
  onPurchaseComplete: () => void;
  SidebarContent: React.ComponentType;
}

const Navigation = ({ 
  profile, 
  sidebarOpen, 
  setSidebarOpen, 
  onSignOut, 
  onPurchaseComplete,
  SidebarContent 
}: NavigationProps) => {
  return (
    <nav className="bg-gray-800/80 backdrop-blur-lg p-3 sm:p-4 flex-shrink-0">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {/* Mobile menu button */}
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="lg:hidden text-white hover:bg-gray-700 p-2"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="bg-gray-800/95 backdrop-blur-lg w-64 border-0">
              <div className="flex items-center space-x-2 mb-6 pt-4">
                <Gamepad2 className="h-6 w-6 text-yellow-400" />
                <h1 className="text-xl font-bold text-white">GameHub</h1>
              </div>
              <SidebarContent />
            </SheetContent>
          </Sheet>
          
          <Gamepad2 className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-400" />
          <h1 className="text-lg sm:text-2xl font-bold text-white">GameHub</h1>
        </div>
        
        <div className="flex items-center space-x-2 sm:space-x-4">
          <div className="text-yellow-400 font-bold text-sm sm:text-base">
            {profile.gold || 0} Gold
          </div>
          <PurchaseGoldDialog 
            currentUser={profile} 
            onPurchaseComplete={onPurchaseComplete}
          />
          <div className="text-white text-sm sm:text-base hidden sm:block">
            Welcome, {profile.username}!
          </div>
          <Button
            onClick={onSignOut}
            variant="outline"
            size="sm"
            className="text-white hover:bg-gray-700 bg-gray-800 text-xs sm:text-sm p-2 sm:px-3 border-0"
          >
            <LogOut className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
            <span className="hidden sm:inline">Sign Out</span>
          </Button>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
