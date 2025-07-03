
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

interface ProfileLoaderProps {
  loading: boolean;
  profile: any;
  onRetry: () => void;
}

const ProfileLoader = ({ loading, profile, onRetry }: ProfileLoaderProps) => {
  console.log('ProfileLoader rendered with:', { loading, profile: !!profile });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading your profile...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-white text-xl mb-4">Unable to load your profile</div>
          <div className="flex space-x-4">
            <Button 
              onClick={onRetry} 
              className="bg-blue-600 hover:bg-blue-700"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
            <Button 
              onClick={() => window.location.reload()} 
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10"
            >
              Refresh Page
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default ProfileLoader;
