
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import GameLobby from "@/components/GameLobby";
import FriendsPage from "@/components/FriendsPage";
import ChatInterface from "@/components/ChatInterface";
import ProfilePage from "@/components/ProfilePage";
import LeaderboardPage from "@/components/LeaderboardPage";
import MultiplayerTicTacToe from "@/components/games/MultiplayerTicTacToe";
import MultiplayerRockPaperScissors from "@/components/games/MultiplayerRockPaperScissors";
import NumberGuessing from "@/components/games/NumberGuessing";
import PurchaseGoldDialog from "@/components/PurchaseGoldDialog";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Gamepad2, Users, MessageCircle, User, Trophy, LogOut, Menu } from "lucide-react";

const Index = () => {
  const { signOut } = useAuth();
  const { profile, loading, refetch } = useProfile();
  const [currentPage, setCurrentPage] = useState("lobby");
  const [currentGame, setCurrentGame] = useState(null);
  const [gameStake, setGameStake] = useState(5);
  const [gameOpponent, setGameOpponent] = useState(null);
  const [gameId, setGameId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
          <Button 
            onClick={() => window.location.reload()} 
            className="bg-blue-600 hover:bg-blue-700"
          >
            Refresh Page
          </Button>
        </div>
      </div>
    );
  }

  const handleGameStart = (gameType, stake, opponentId = null, gameId = null) => {
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

  const handleSignOut = async () => {
    await signOut();
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    setSidebarOpen(false);
  };

  const handlePurchaseComplete = () => {
    // Refresh profile to get updated gold balance
    refetch();
  };

  const navigationItems = [
    { id: "lobby", label: "Game Lobby", icon: Gamepad2 },
    { id: "friends", label: "Friends", icon: Users },
    { id: "chat", label: "Chat", icon: MessageCircle },
    { id: "profile", label: "Profile", icon: User },
    { id: "leaderboard", label: "Leaderboard", icon: Trophy }
  ];

  // If in a game, show the game component
  if (currentGame) {
    const gameProps = {
      currentUser: profile,
      stakeAmount: gameStake,
      opponentId: gameOpponent,
      gameId: gameId,
      onGameEnd: handleGameEnd
    };

    switch (currentGame) {
      case "tic-tac-toe":
        return <MultiplayerTicTacToe {...gameProps} />;
      case "rock-paper-scissors":
        return <MultiplayerRockPaperScissors {...gameProps} />;
      case "number-guessing":
        return <NumberGuessing {...gameProps} />;
      default:
        return <GameLobby currentUser={profile} onGameStart={handleGameStart} />;
    }
  }

  const SidebarContent = () => (
    <div className="space-y-2 p-4">
      {navigationItems.map((item) => {
        const Icon = item.icon;
        return (
          <Button
            key={item.id}
            onClick={() => handlePageChange(item.id)}
            variant={currentPage === item.id ? "default" : "ghost"}
            className={`w-full justify-start text-white hover:bg-white/10 ${
              currentPage === item.id 
                ? "bg-blue-600 hover:bg-blue-700" 
                : "bg-transparent hover:bg-gray-700"
            }`}
          >
            <Icon className="w-4 h-4 mr-2" />
            {item.label}
          </Button>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col">
      {/* Navigation Header */}
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
              onPurchaseComplete={handlePurchaseComplete}
            />
            <div className="text-white text-sm sm:text-base hidden sm:block">
              Welcome, {profile.username}!
            </div>
            <Button
              onClick={handleSignOut}
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

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar Navigation */}
        <div className="hidden lg:block w-64 bg-gray-800/60 backdrop-blur-lg flex-shrink-0">
          <SidebarContent />
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          {currentPage === "lobby" && (
            <GameLobby currentUser={profile} onGameStart={handleGameStart} />
          )}
          {currentPage === "friends" && (
            <FriendsPage currentUser={profile} onGameStart={handleGameStart} />
          )}
          {currentPage === "chat" && (
            <ChatInterface currentUser={profile} />
          )}
          {currentPage === "profile" && (
            <ProfilePage currentUser={profile} />
          )}
          {currentPage === "leaderboard" && (
            <LeaderboardPage currentUser={profile} />
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;
