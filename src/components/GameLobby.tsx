import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { useGameInvitations } from "@/hooks/useGameInvitations";
import FriendsSelectorDialog from "./FriendsSelectorDialog";
import GameInvitations from "./GameInvitations";
import { Gamepad, Users, Trophy, Star, UserPlus } from "lucide-react";

interface GameLobbyProps {
  currentUser: any;
  onGameStart: (gameType: string, stake: number) => void;
}

const GameLobby = ({ currentUser, onGameStart }: GameLobbyProps) => {
  const [stakeAmount, setStakeAmount] = useState(5);
  const [gameDialogOpen, setGameDialogOpen] = useState(false);
  const [friendsSelectorOpen, setFriendsSelectorOpen] = useState(false);
  const [selectedGameForDialog, setSelectedGameForDialog] = useState(null);
  const { sendInvitation } = useGameInvitations();

  const games = [
    {
      id: "tic-tac-toe",
      name: "Tic Tac Toe",
      description: "Classic 3x3 grid game. Get three in a row to win!",
      minPlayers: 2,
      maxPlayers: 2,
      minStake: 5,
      icon: "⭕",
      difficulty: "Easy"
    },
    {
      id: "rock-paper-scissors",
      name: "Rock Paper Scissors",
      description: "The timeless hand game. Best of 3 rounds!",
      minPlayers: 2,
      maxPlayers: 2,
      minStake: 5,
      icon: "✂️",
      difficulty: "Easy"
    },
    {
      id: "number-guessing",
      name: "Number Guessing",
      description: "Guess the secret number. Closest guess wins!",
      minPlayers: 2,
      maxPlayers: 4,
      minStake: 5,
      icon: "🔢",
      difficulty: "Medium"
    }
  ];

  const handlePlayGame = (game) => {
    if (currentUser.gold < stakeAmount) {
      toast({
        title: "Insufficient Gold",
        description: `You need at least ${stakeAmount} Gold to play this game.`,
        variant: "destructive"
      });
      return;
    }

    onGameStart(game.id, stakeAmount);
    setGameDialogOpen(false);
    toast({
      title: "Game Starting!",
      description: `${stakeAmount} Gold has been staked for ${game.name}`,
    });
  };

  const handleInviteFriend = async (friendId: string) => {
    if (!selectedGameForDialog) return;

    if (currentUser.gold < stakeAmount) {
      toast({
        title: "Insufficient Gold",
        description: `You need at least ${stakeAmount} Gold to send this invitation.`,
        variant: "destructive"
      });
      return;
    }

    // Convert frontend game type to database format
    const gameTypeMap = {
      'tic-tac-toe': 'tic_tac_toe',
      'rock-paper-scissors': 'rock_paper_scissors',
      'number-guessing': 'number_guessing'
    };

    const dbGameType = gameTypeMap[selectedGameForDialog.id] || selectedGameForDialog.id;
    const { error } = await sendInvitation(friendId, dbGameType, stakeAmount);

    if (error) {
      toast({
        title: "Failed to Send Invitation",
        description: error,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Invitation Sent!",
        description: `Game invitation sent successfully`,
      });
      setGameDialogOpen(false);
    }
  };

  const openGameDialog = (game) => {
    setSelectedGameForDialog(game);
    setGameDialogOpen(true);
  };

  const openFriendsSelector = () => {
    setFriendsSelectorOpen(true);
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Game Invitations Section */}
      <div className="mb-6 sm:mb-8">
        <GameInvitations currentUser={currentUser} onGameStart={onGameStart} />
      </div>

      <div className="mb-6 sm:mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Game Lobby</h2>
        <p className="text-blue-200 text-sm sm:text-base">Choose your game and stake your Gold!</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <Card className="bg-white/10 border-white/20 backdrop-blur-lg">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-blue-200 truncate">Your Gold</p>
                <p className="text-lg sm:text-2xl font-bold text-yellow-400 truncate">{currentUser.gold}</p>
              </div>
              <Trophy className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-400 flex-shrink-0 ml-2" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white/10 border-white/20 backdrop-blur-lg">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-blue-200 truncate">Games Played</p>
                <p className="text-lg sm:text-2xl font-bold text-white truncate">{currentUser.games_played}</p>
              </div>
              <Gamepad className="w-6 h-6 sm:w-8 sm:h-8 text-blue-400 flex-shrink-0 ml-2" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white/10 border-white/20 backdrop-blur-lg">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-blue-200 truncate">Wins</p>
                <p className="text-lg sm:text-2xl font-bold text-green-400 truncate">{currentUser.wins}</p>
              </div>
              <Star className="w-6 h-6 sm:w-8 sm:h-8 text-green-400 flex-shrink-0 ml-2" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white/10 border-white/20 backdrop-blur-lg">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-blue-200 truncate">Win Rate</p>
                <p className="text-lg sm:text-2xl font-bold text-white truncate">
                  {currentUser.games_played > 0 ? Math.round((currentUser.wins / currentUser.games_played) * 100) : 0}%
                </p>
              </div>
              <Trophy className="w-6 h-6 sm:w-8 sm:h-8 text-purple-400 flex-shrink-0 ml-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Available Games */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
        {games.map((game) => (
          <Card key={game.id} className="bg-white/10 border-white/20 backdrop-blur-lg hover:bg-white/15 transition-all duration-300 transform hover:scale-105 flex flex-col h-full">
            <CardHeader className="pb-3 sm:pb-4 flex-shrink-0">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-white flex items-center text-base sm:text-lg min-w-0 flex-1">
                  <span className="text-xl sm:text-2xl mr-2 flex-shrink-0">{game.icon}</span>
                  <span className="truncate">{game.name}</span>
                </CardTitle>
                <Badge 
                  variant={game.difficulty === "Easy" ? "default" : "secondary"} 
                  className="text-xs flex-shrink-0"
                >
                  {game.difficulty}
                </Badge>
              </div>
              <CardDescription className="text-blue-200 text-sm leading-relaxed">
                {game.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0 flex-1 flex flex-col justify-end">
              <div className="space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-blue-200">Players:</span>
                    <span className="text-white font-medium">{game.minPlayers}-{game.maxPlayers}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-blue-200">Min Stake:</span>
                    <span className="text-yellow-400 font-bold">{game.minStake} Gold</span>
                  </div>
                </div>
                
                <Button 
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-sm py-2"
                  onClick={() => openGameDialog(game)}
                >
                  <Users className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                  Play Now
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Game Dialog */}
      <Dialog open={gameDialogOpen} onOpenChange={setGameDialogOpen}>
        <DialogContent className="bg-gray-900 border-gray-700 mx-4 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white text-lg">
              {selectedGameForDialog?.icon} {selectedGameForDialog?.name}
            </DialogTitle>
            <DialogDescription className="text-gray-300 text-sm">
              Set your stake amount and choose how to play!
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="stake" className="text-white text-sm">Stake Amount (Gold)</Label>
              <Input
                id="stake"
                type="number"
                min={selectedGameForDialog?.minStake || 5}
                max={currentUser.gold}
                value={stakeAmount}
                onChange={(e) => setStakeAmount(parseInt(e.target.value))}
                className="bg-gray-800 border-gray-600 text-white mt-1"
              />
              <p className="text-xs text-gray-400 mt-1">
                Minimum: {selectedGameForDialog?.minStake} Gold | Available: {currentUser.gold} Gold
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Button 
                onClick={() => handlePlayGame(selectedGameForDialog)}
                className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-sm"
                disabled={stakeAmount < (selectedGameForDialog?.minStake || 5) || stakeAmount > currentUser.gold}
              >
                <Gamepad className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                Quick Play
              </Button>
              <Button 
                onClick={openFriendsSelector}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-sm"
                disabled={stakeAmount < (selectedGameForDialog?.minStake || 5) || stakeAmount > currentUser.gold}
              >
                <UserPlus className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                Invite Friend
              </Button>
            </div>
            <Button 
              variant="outline" 
              onClick={() => setGameDialogOpen(false)}
              className="w-full border-gray-600 text-white hover:bg-gray-800 text-sm"
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Friends Selector Dialog */}
      <FriendsSelectorDialog
        open={friendsSelectorOpen}
        onOpenChange={setFriendsSelectorOpen}
        currentUser={currentUser}
        gameType={selectedGameForDialog?.id || ''}
        stakeAmount={stakeAmount}
        onFriendSelected={handleInviteFriend}
      />
    </div>
  );
};

export default GameLobby;
