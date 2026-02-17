
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Trophy, User, RotateCcw, Clock } from "lucide-react";
import { useMultiplayerGame } from "@/hooks/useMultiplayerGame";
import { useAuth } from "@/hooks/useAuth";
import { useGameResult } from "@/hooks/useGameResult";
import { supabase } from "@/integrations/supabase/client";

interface MultiplayerRockPaperScissorsProps {
  currentUser: any;
  stakeAmount: number;
  opponentId: string;
  gameId: string;
  onGameEnd: () => void;
}

const MultiplayerRockPaperScissors = ({ currentUser, stakeAmount, opponentId, gameId, onGameEnd }: MultiplayerRockPaperScissorsProps) => {
  const { user } = useAuth();
  const { game, gameState, loading, updateGameState } = useMultiplayerGame(gameId);
  const { processGameResult } = useGameResult();
  const [opponent, setOpponent] = useState<any>(null);
  const [myChoice, setMyChoice] = useState<string | null>(null);
  const [resultProcessed, setResultProcessed] = useState(false);

  const choices = [
    { id: "rock", name: "Rock", icon: "🪨", emoji: "✊" },
    { id: "paper", name: "Paper", icon: "📄", emoji: "✋" },
    { id: "scissors", name: "Scissors", icon: "✂️", emoji: "✌️" }
  ];

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

  useEffect(() => {
    if (gameState.gamePhase === 'choosing') {
      setMyChoice(null);
    }
  }, [gameState.gamePhase]);

  const determineWinner = (choice1: string, choice2: string) => {
    if (choice1 === choice2) return "tie";
    const winConditions = { rock: "scissors", paper: "rock", scissors: "paper" };
    return winConditions[choice1 as keyof typeof winConditions] === choice2 ? "player1" : "player2";
  };

  const handleChoice = async (choiceId: string) => {
    if (!game || !user || myChoice || gameState.gamePhase !== 'choosing') return;

    setMyChoice(choiceId);

    const currentChoices = gameState.roundData?.choices || {};
    const updatedChoices = { ...currentChoices, [user.id]: choiceId };
    const bothPlayersChosen = Object.keys(updatedChoices).length === 2;

    if (bothPlayersChosen) {
      const player1Choice = updatedChoices[game.player1_id];
      const player2Choice = updatedChoices[game.player2_id];
      const result = determineWinner(player1Choice, player2Choice);
      
      let newScores = { ...(gameState.playerScores || {}) };
      if (result === "player1") {
        newScores[game.player1_id] = (newScores[game.player1_id] || 0) + 1;
      } else if (result === "player2") {
        newScores[game.player2_id] = (newScores[game.player2_id] || 0) + 1;
      }

      const roundResults = [...(gameState.roundData?.results || []), {
        round: gameState.currentRound,
        choices: updatedChoices,
        result,
        winner: result === "tie" ? null : (result === "player1" ? game.player1_id : game.player2_id)
      }];

      const maxScore = Math.max(...Object.values(newScores));
      const gameFinished = maxScore >= 3;

      if (gameFinished) {
        const winnerId = Object.keys(newScores).find(id => newScores[id] === maxScore) || null;
        
        await updateGameState({
          gamePhase: 'finished',
          playerScores: newScores,
          roundData: { choices: updatedChoices, results: roundResults },
          winner: winnerId
        }, 'completed');

        // Use RPC - stakes already deducted at game start
        await processGameResult(game.id, winnerId, stakeAmount, game.player1_id, game.player2_id);
        setResultProcessed(true);

        if (winnerId === user.id) {
          toast({ title: "Congratulations!", description: `You won ${stakeAmount * 2} Gold!` });
        } else {
          toast({ title: "Game Over!", description: `You lost ${stakeAmount} Gold.`, variant: "destructive" });
        }
      } else {
        await updateGameState({
          gamePhase: 'showing_result',
          currentRound: (gameState.currentRound || 1) + 1,
          playerScores: newScores,
          roundData: { choices: updatedChoices, results: roundResults }
        });

        setTimeout(async () => {
          await updateGameState({
            gamePhase: 'choosing',
            roundData: { choices: {}, results: roundResults },
            playerScores: newScores
          });
        }, 3000);
      }
    } else {
      await updateGameState({
        roundData: { ...gameState.roundData, choices: updatedChoices }
      });
    }
  };

  const handleBackToLobby = async () => {
    if (game && gameState.gamePhase !== 'finished' && user && !resultProcessed) {
      const { error } = await (supabase as any).rpc('handle_game_forfeit', {
        p_game_id: gameId,
        p_forfeit_player_id: user.id
      });
      if (error) {
        console.error('Forfeit error:', error);
      } else {
        toast({ title: "Game Forfeited", description: `You lost ${stakeAmount} Gold.`, variant: "destructive" });
      }
    }
    onGameEnd();
  };

  const resetGame = async () => {
    if (!game) return;
    setResultProcessed(false);
    await updateGameState({
      gamePhase: 'choosing',
      currentRound: 1,
      playerScores: { [game.player1_id]: 0, [game.player2_id]: 0 },
      roundData: { choices: {}, results: [] }
    }, 'in_progress');
    setMyChoice(null);
  };

  const getGameStatusText = () => {
    if (loading) return "Loading...";
    const opponentChoice = gameState.roundData?.choices?.[opponentId];
    const myChoiceMade = gameState.roundData?.choices?.[user?.id || ''];
    
    if (gameState.gamePhase === "choosing") {
      if (myChoiceMade && !opponentChoice) return `Waiting for ${opponent?.username || "opponent"}...`;
      if (!myChoiceMade) return "Choose your move!";
    } else if (gameState.gamePhase === "showing_result") {
      return "Round Result";
    } else if (gameState.gamePhase === "finished") {
      return gameState.winner === user?.id ? "You Win!" : `${opponent?.username || "Opponent"} Wins!`;
    }
    return "Rock Paper Scissors";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <div className="text-white text-xl">Loading multiplayer game...</div>
      </div>
    );
  }

  const myScore = gameState.playerScores?.[user?.id || ''] || 0;
  const opponentScore = gameState.playerScores?.[opponentId] || 0;
  const currentRound = gameState.currentRound || 1;
  const opponentChoice = gameState.roundData?.choices?.[opponentId];
  const myChoiceMade = gameState.roundData?.choices?.[user?.id || ''];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl">
        <Card className="bg-gray-800/90 backdrop-blur-lg shadow-2xl">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-white text-xl sm:text-2xl">✂️ Rock Paper Scissors</CardTitle>
              <Badge className="bg-yellow-600 hover:bg-yellow-700 text-white">
                <Trophy className="w-4 h-4 mr-1" />
                {stakeAmount * 2} Gold Prize
              </Badge>
            </div>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="text-white text-sm sm:text-base">Round {currentRound} - Best of 5</div>
              <div className="flex items-center space-x-6">
                <div className="text-center">
                  <div className="text-white text-xs sm:text-sm">You</div>
                  <div className="text-xl sm:text-2xl font-bold text-green-400">{myScore}</div>
                </div>
                <div className="text-white text-lg sm:text-xl">-</div>
                <div className="text-center">
                  <div className="text-white text-xs sm:text-sm">{opponent?.username || "Opponent"}</div>
                  <div className="text-xl sm:text-2xl font-bold text-red-400">{opponentScore}</div>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="text-center mb-6">
              <div className="text-lg sm:text-xl font-bold text-blue-400 mb-2 flex items-center justify-center">
                {(myChoiceMade && !opponentChoice) && <Clock className="w-5 h-5 mr-2 animate-spin" />}
                {getGameStatusText()}
              </div>
            </div>

            {gameState.gamePhase === "showing_result" && (
              <div className="text-center mb-6">
                <div className="flex justify-center items-center space-x-4 sm:space-x-8 mb-4">
                  <div className="text-center">
                    <div className="text-4xl sm:text-6xl mb-2">{choices.find(c => c.id === myChoiceMade)?.emoji}</div>
                    <div className="text-white text-sm sm:text-base">You</div>
                  </div>
                  <div className="text-white text-xl sm:text-2xl">VS</div>
                  <div className="text-center">
                    <div className="text-4xl sm:text-6xl mb-2">{choices.find(c => c.id === opponentChoice)?.emoji}</div>
                    <div className="text-white text-sm sm:text-base">{opponent?.username || "Opponent"}</div>
                  </div>
                </div>
              </div>
            )}

            {gameState.gamePhase === "choosing" && !myChoiceMade && (
              <div className="grid grid-cols-3 gap-3 sm:gap-4 max-w-md mx-auto mb-6">
                {choices.map((choice) => (
                  <button
                    key={choice.id}
                    onClick={() => handleChoice(choice.id)}
                    className="bg-gray-700 rounded-lg p-4 sm:p-6 hover:bg-gray-600 transition-all duration-200 transform hover:scale-105"
                  >
                    <div className="text-3xl sm:text-4xl mb-2">{choice.emoji}</div>
                    <div className="text-white text-sm sm:text-base font-medium">{choice.name}</div>
                  </button>
                ))}
              </div>
            )}

            {gameState.gamePhase === "choosing" && myChoiceMade && !opponentChoice && (
              <div className="text-center mb-6">
                <div className="text-white text-lg mb-4">You chose:</div>
                <div className="text-6xl mb-4">{choices.find(c => c.id === myChoiceMade)?.emoji}</div>
                <div className="text-gray-400">Waiting for opponent...</div>
              </div>
            )}

            {gameState.gamePhase === "finished" && (
              <div className="text-center mb-6">
                <div className={`text-2xl sm:text-3xl font-bold mb-4 ${gameState.winner === user?.id ? 'text-green-400' : 'text-red-400'}`}>
                  {gameState.winner === user?.id ? "🎉 You Win!" : "😔 You Lose!"}
                </div>
                <div className="text-white text-base sm:text-lg mb-4">Final Score: {myScore} - {opponentScore}</div>
                {gameState.winner === user?.id && (
                  <div className="text-yellow-400 text-lg font-bold mb-4">+{stakeAmount * 2} Gold Added!</div>
                )}
              </div>
            )}

            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4 justify-center">
              {gameState.gamePhase === "finished" && (
                <Button onClick={resetGame} className="bg-blue-600 hover:bg-blue-700 text-white">
                  <RotateCcw className="w-4 h-4 mr-2" />
                  New Game
                </Button>
              )}
              <Button onClick={handleBackToLobby} className="bg-gray-600 hover:bg-gray-700 text-white">
                Back to Lobby
              </Button>
            </div>

            <div className="mt-6 text-center text-xs sm:text-sm text-gray-300 space-y-1">
              <p>Rock beats Scissors, Scissors beats Paper, Paper beats Rock</p>
              <p><span className="text-yellow-400 font-bold">Stakes:</span> {stakeAmount} Gold each</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MultiplayerRockPaperScissors;