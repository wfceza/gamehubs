
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import Navigation from "@/components/Navigation";
import SidebarNavigation from "@/components/SidebarNavigation";
import GameManager from "@/components/GameManager";
import PageRenderer from "@/components/PageRenderer";
import ProfileLoader from "@/components/ProfileLoader";
import GameInvitePopup from "@/components/GameInvitePopup";

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile, loading, refetch } = useProfile();
  const [currentPage, setCurrentPage] = useState("lobby");
  const [currentGame, setCurrentGame] = useState<string | null>(null);
  const [gameStake, setGameStake] = useState(5);
  const [gameOpponent, setGameOpponent] = useState<string | null>(null);
  const [gameId, setGameId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Redirect to auth page if user is not authenticated
  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  const handleGameStart = (gameType: string, stake: number, opponentId: string | null = null, gameId: string | null = null) => {
    setCurrentGame(gameType);
    setGameStake(stake);
    setGameOpponent(opponentId);
    setGameId(gameId);
  };

  const handleGameEnd = () => {
    setCurrentGame(null);
    setGameOpponent(null);
    setGameId(null);
    setCurrentPage("lobby");
    // Refresh profile to get updated stats and gold
    refetch();
  };

  const { signOut } = useAuth();
  const handleSignOut = async () => {
    await signOut();
  };

  const handlePageChange = (page: string) => {
    setCurrentPage(page);
    setSidebarOpen(false);
  };

  const handlePurchaseComplete = () => {
    // Refresh profile to get updated gold balance
    refetch();
  };

  // Show loading or error states using ProfileLoader component
  if (loading || !profile) {
    return <ProfileLoader loading={loading} profile={profile} onRetry={refetch} />;
  }

  // If in a game, show the game component
  if (currentGame) {
    return (
      <GameManager
        currentGame={currentGame}
        profile={profile}
        gameStake={gameStake}
        gameOpponent={gameOpponent}
        gameId={gameId}
        onGameEnd={handleGameEnd}
        onGameStart={handleGameStart}
      />
    );
  }

  const SidebarContent = () => (
    <SidebarNavigation 
      currentPage={currentPage} 
      onPageChange={handlePageChange} 
    />
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col">
      {/* Global Game Invite Popup */}
      <GameInvitePopup currentUser={profile} onGameStart={handleGameStart} />

      {/* Navigation Header */}
      <Navigation
        profile={profile}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        onSignOut={handleSignOut}
        onPurchaseComplete={handlePurchaseComplete}
        SidebarContent={SidebarContent}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar Navigation */}
        <div className="hidden lg:block w-64 bg-gray-800/60 backdrop-blur-lg flex-shrink-0">
          <SidebarContent />
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          <PageRenderer
            currentPage={currentPage}
            profile={profile}
            onGameStart={handleGameStart}
          />
        </div>
      </div>
    </div>
  );
};

export default Index;