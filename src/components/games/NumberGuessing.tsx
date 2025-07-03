
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Trophy, Target, RotateCcw, Clock } from "lucide-react";
import { useMultiplayerGame } from "@/hooks/useMultiplayerGame";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface NumberGuessingProps {
  currentUser: any;
  stakeAmount: number;
  opponentId: string;
  gameId: string;
  onGameEnd: () => void;
}

const NumberGuessing = ({ currentUser, stakeAmount, opponentId, gameId, onGameEnd }: NumberGuessingProps) => {
  const { user } = useAuth();
  const { game, gameState, loading, updateGameState } = useMultiplayerGame(gameId);
  const [opponent, setOpponent] = useState<any>(null);
  const [guess, setGuess] = useState("");
  const [myGuess, setMyGuess] = useState<number | null>(null);

  // Fetch opponent data
  useEffect(() => {
    const fetchOpponent = async () => {
      if (!opponentId) return;
      
      const { data: opponentData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', opponentId)
        .single();
      
      setOpponent(opponentData);
    };

    fetchOpponent();
  }, [opponentId]);

  const updatePlayerStats = async (winnerId: string) => {
    try {
      // Update current user stats
      const { error: currentUserError } = await supabase
        .from('profiles')
        .update({
          wins: currentUser.id === winnerId ? currentUser.wins + 1 : currentUser.wins,
          games_played: currentUser.games_played + 1,
          gold: currentUser.id === winnerId ? currentUser.gold + (stakeAmount * 2) : currentUser.gold - stakeAmount
        })
        .eq('id', currentUser.id);

      if (currentUserError) {
        console.error('Error updating current user stats:', currentUserError);
      }

      // Update opponent stats
      const opponentStats = {
        wins: opponentId === winnerId ? (opponent?.wins || 0) + 1 : (opponent?.wins || 0),
        games_played: (opponent?.games_played || 0) + 1,
        gold: opponentId === winnerId ? (opponent?.gold || 0) + (stakeAmount * 2) : (opponent?.gold || 0) - stakeAmount
      };

      const { error: opponentError } = await supabase
        .from('profiles')
        .update(opponentStats)
        .eq('id', opponentId);

      if (opponentError) {
        console.error('Error updating opponent stats:', opponentError);
      }
    } catch (error) {
      console.error('Error updating player stats:', error);
    }
  };

  const handleGuessSubmit = async () => {
    if (!game || !user || !guess.trim() || myGuess !== null) return;

    const guessNumber = parseInt(guess);
    if (isNaN(guessNumber) || guessNumber < 1 || guessNumber > 100) {
      toast({
        title: "Invalid Guess",
        description: "Please enter a number between 1 and 100",
        variant: "destructive"
      });
      return;
    }

    setMyGuess(guessNumber);
    
    const currentGuesses = gameState.roundData?.guesses || {};
    const updatedGuesses = {
      ...currentGuesses,
      [user.id]: guessNumber
    };

    // Check if both players have guessed
    const bothPlayersGuessed = Object.keys(updatedGuesses).length === 2;

    if (bothPlayersGuessed) {
      // Calculate results
      const targetNumber = gameState.roundData?.targetNumber || 50;
      const player1Guess = updatedGuesses[game.player1_id];
      const player2Guess = updatedGuesses[game.player2_id];
      
      const player1Distance = Math.abs(targetNumber - player1Guess);
      const player2Distance = Math.abs(targetNumber - player2Guess);
      
      let winnerId = null;
      if (player1Distance < player2Distance) {
        winnerId = game.player1_id;
      } else if (player2Distance < player1Distance) {
        winnerId = game.player2_id;
      }
      // If distances are equal, it's a tie (winnerId remains null)

      // Update game state
      await updateGameState({
        gamePhase: 'finished',
        roundData: {
          ...gameState.roundData,
          guesses: updatedGuesses,
          results: {
            targetNumber,
            player1Guess,
            player2Guess,
            player1Distance,
            player2Distance,
            winner: winnerId
          }
        },
        winner: winnerId
      }, 'completed');

      // Update player stats and gold
      if (winnerId) {
        await updatePlayerStats(winnerId);
      }

      if (winnerId === user.id) {
        toast({
          title: "Congratulations!",
          description: `You won ${stakeAmount * 2} Gold! Your guess was closest to ${targetNumber}.`,
        });
      } else if (winnerId) {
        toast({
          title: "Game Over!",
          description: `You lost ${stakeAmount} Gold. The target was ${targetNumber}.`,
          variant: "destructive"
        });
      } else {
        toast({
          title: "It's a Tie!",
          description: `Both players were equally close to ${targetNumber}.`,
        });
      }
    } else {
      // Wait for other player
      await updateGameState({
        roundData: {
          ...gameState.roundData,
          guesses: updatedGuesses
        }
      });
    }
  };

  const resetGame = async () => {
    if (!game) return;

    await updateGameState({
      gamePhase: 'guessing',
      currentRound: 1,
      playerScores: {
        [game.player1_id]: 0,
        [game.player2_id]: 0
      },
      roundData: {
        guesses: {},
        targetNumber: Math.floor(Math.random() * 100) + 1
      },
      winner: null
    }, 'in_progress');

    setGuess("");
    setMyGuess(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <div className="text-white text-xl">Loading multiplayer game...</div>
      </div>
    );
  }

  const targetNumber = gameState.roundData?.targetNumber;
  const opponentGuess = gameState.roundData?.guesses?.[opponentId];
  const gameResults = gameState.roundData?.results;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <Card className="bg-gray-800/90 backdrop-blur-lg shadow-2xl">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-white text-xl sm:text-2xl flex items-center">
                <Target className="w-6 h-6 mr-2" />
                Number Guessing Game
              </CardTitle>
              <Badge className="bg-yellow-600 hover:bg-yellow-700 text-white">
                <Trophy className="w-4 h-4 mr-1" />
                {stakeAmount * 2} Gold Prize
              </Badge>
            </div>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center space-x-4">
                <div className="text-center">
                  <div className="text-white text-sm">You</div>
                  <div className="text-white font-bold">{currentUser.username}</div>
                </div>
                <div className="text-white text-xl">VS</div>
                <div className="text-center">
                  <div className="text-white text-sm">Opponent</div>
                  <div className="text-white font-bold">{opponent?.username || "Loading..."}</div>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            {/* Game Status */}
            <div className="text-center mb-6">
              <div className="text-lg sm:text-xl font-bold text-blue-400 mb-2">
                {gameState.gamePhase === 'finished' ? (
                  gameState.winner === user?.id ? "🎉 You Win!" :
                  gameState.winner ? `😔 ${opponent?.username || "Opponent"} Wins!` :
                  "🤝 It's a Tie!"
                ) : (
                  myGuess !== null && !opponentGuess ? (
                    <div className="flex items-center justify-center">
                      <Clock className="w-5 h-5 mr-2 animate-spin" />
                      Waiting for {opponent?.username || "opponent"}...
                    </div>
                  ) : (
                    "Guess the number between 1 and 100!"
                  )
                )}
              </div>
              {gameState.gamePhase === 'finished' && gameState.winner === user?.id && (
                <div className="text-yellow-400 text-lg font-bold mb-4">
                  +{stakeAmount * 2} Gold Added!
                </div>
              )}
            </div>

            {/* Guessing Interface */}
            {gameState.gamePhase === 'guessing' && myGuess === null && (
              <div className="max-w-md mx-auto mb-6">
                <div className="flex space-x-4">
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    value={guess}
                    onChange={(e) => setGuess(e.target.value)}
                    placeholder="Enter your guess (1-100)"
                    className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                  />
                  <Button
                    onClick={handleGuessSubmit}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Submit
                  </Button>
                </div>
              </div>
            )}

            {/* Waiting State */}
            {gameState.gamePhase === 'guessing' && myGuess !== null && !opponentGuess && (
              <div className="text-center mb-6">
                <div className="text-white text-lg mb-4">Your guess: <span className="font-bold text-blue-400">{myGuess}</span></div>
                <div className="text-gray-400">Waiting for opponent to guess...</div>
              </div>
            )}

            {/* Game Results */}
            {gameState.gamePhase === 'finished' && gameResults && (
              <div className="text-center mb-6">
                <div className="bg-gray-700 rounded-lg p-6 mb-4">
                  <div className="text-white text-xl mb-4">
                    Target Number: <span className="font-bold text-yellow-400">{gameResults.targetNumber}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-white text-sm mb-2">Your Guess</div>
                      <div className="text-2xl font-bold text-blue-400">{gameResults.player1Guess === myGuess ? myGuess : gameResults.player2Guess}</div>
                      <div className="text-sm text-gray-300">
                        Distance: {gameResults.player1Guess === myGuess ? gameResults.player1Distance : gameResults.player2Distance}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-white text-sm mb-2">Opponent's Guess</div>
                      <div className="text-2xl font-bold text-red-400">{gameResults.player1Guess === myGuess ? gameResults.player2Guess : gameResults.player1Guess}</div>
                      <div className="text-sm text-gray-300">
                        Distance: {gameResults.player1Guess === myGuess ? gameResults.player2Distance : gameResults.player1Distance}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Game Controls */}
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4 justify-center">
              {gameState.gamePhase === 'finished' && (
                <Button 
                  onClick={resetGame}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  New Game
                </Button>
              )}
              
              <Button 
                onClick={onGameEnd}
                className="bg-gray-600 hover:bg-gray-700 text-white"
              >
                Back to Lobby
              </Button>
            </div>

            {/* Game Info */}
            <div className="mt-6 text-center text-xs sm:text-sm text-gray-300 space-y-1">
              <p>Closest guess to the target number wins!</p>
              <p>
                <span className="text-yellow-400 font-bold">Stakes:</span> {stakeAmount} Gold each
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default NumberGuessing;
