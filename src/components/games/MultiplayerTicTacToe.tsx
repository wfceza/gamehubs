
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Trophy, RotateCcw, User } from "lucide-react";
import { useMultiplayerGame } from "@/hooks/useMultiplayerGame";
import { useAuth } from "@/hooks/useAuth";
import { useGameResult } from "@/hooks/useGameResult";
import { supabase } from "@/integrations/supabase/client";

interface MultiplayerTicTacToeProps {
  currentUser: any;
  stakeAmount: number;
  opponentId: string;
  gameId: string;
  onGameEnd: () => void;
}

const MultiplayerTicTacToe = ({ currentUser, stakeAmount, opponentId, gameId, onGameEnd }: MultiplayerTicTacToeProps) => {
  const { user } = useAuth();
  const { game, gameState, isMyTurn, loading, updateGameState } = useMultiplayerGame(gameId);
  const { processGameResult, processing } = useGameResult();
  const [opponent, setOpponent] = useState<any>(null);
  const [resultProcessed, setResultProcessed] = useState(false);

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

  const checkWinner = (board: string[]) => {
    const winPatterns = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6]
    ];

    for (const pattern of winPatterns) {
      const [a, b, c] = pattern;
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return board[a];
      }
    }

    if (board.every(cell => cell !== "")) {
      return "tie";
    }

    return null;
  };

  const handleCellClick = async (index: number) => {
    if (!game || !user || !isMyTurn || gameState.board[index] !== "" || gameState.gamePhase !== 'playing') {
      return;
    }

    const newBoard = [...gameState.board];
    const mySymbol = gameState.playerSymbols?.[user.id] || 'X';
    newBoard[index] = mySymbol;

    const winner = checkWinner(newBoard);
    const nextPlayer = gameState.currentPlayer === game.player1_id ? game.player2_id : game.player1_id;

    if (winner) {
      let winnerId: string | null = null;
      if (winner !== "tie") {
        winnerId = Object.keys(gameState.playerSymbols || {}).find(
          playerId => gameState.playerSymbols?.[playerId] === winner
        ) || null;
      }

      await updateGameState({
        board: newBoard,
        gamePhase: 'finished',
        winner: winnerId || 'tie',
        currentPlayer: null
      }, 'completed');

      // Use RPC to process game result (stakes already deducted at start)
      await processGameResult(gameId, winnerId, stakeAmount, game.player1_id, game.player2_id);
      setResultProcessed(true);

      if (winnerId === user.id) {
        toast({
          title: "Congratulations!",
          description: `You won ${stakeAmount * 2} Gold!`,
        });
      } else if (winnerId) {
        toast({
          title: "Game Over!",
          description: `You lost ${stakeAmount} Gold.`,
          variant: "destructive"
        });
      } else {
        toast({
          title: "It's a Tie!",
          description: "Stakes have been refunded.",
        });
      }
    } else {
      await updateGameState({
        board: newBoard,
        currentPlayer: nextPlayer,
        lastMove: { player: user.id, position: index }
      });
    }
  };

  // Handle forfeit when clicking "Back to Lobby" during an active game
  const handleBackToLobby = async () => {
    if (game && gameState.gamePhase === 'playing' && user && !resultProcessed) {
      // Forfeit: current player loses, opponent wins
      const { data, error } = await (supabase as any).rpc('handle_game_forfeit', {
        p_game_id: gameId,
        p_forfeit_player_id: user.id
      });

      if (error) {
        console.error('Forfeit error:', error);
      } else {
        toast({
          title: "Game Forfeited",
          description: `You lost ${stakeAmount} Gold.`,
          variant: "destructive"
        });
      }
    }
    onGameEnd();
  };

  const resetGame = async () => {
    if (!game) return;
    setResultProcessed(false);
    const initialState = {
      board: Array(9).fill(""),
      currentPlayer: game.player1_id,
      gamePhase: 'playing',
      playerSymbols: gameState.playerSymbols,
      winner: null
    };
    await updateGameState(initialState, 'in_progress');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <div className="text-white text-xl">Loading multiplayer game...</div>
      </div>
    );
  }

  const mySymbol = gameState.playerSymbols?.[user?.id || ''] || 'X';
  const opponentSymbol = gameState.playerSymbols?.[opponentId] || 'O';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <Card className="bg-gray-800/90 backdrop-blur-lg shadow-2xl">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-white text-xl sm:text-2xl">⭕ Tic Tac Toe</CardTitle>
              <Badge className="bg-yellow-600 hover:bg-yellow-700 text-white">
                <Trophy className="w-4 h-4 mr-1" />
                {stakeAmount * 2} Gold Prize
              </Badge>
            </div>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center space-x-4">
                <div className="text-center">
                  <div className="text-white text-sm">You ({mySymbol})</div>
                  <div className="text-white font-bold">{currentUser.username}</div>
                </div>
                <div className="text-white text-xl">VS</div>
                <div className="text-center">
                  <div className="text-white text-sm">Opponent ({opponentSymbol})</div>
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
                  gameState.winner && gameState.winner !== 'tie' ? `😔 ${opponent?.username || "Opponent"} Wins!` :
                  "🤝 It's a Tie!"
                ) : (
                  isMyTurn ? "Your Turn" : `Waiting for ${opponent?.username || "opponent"}...`
                )}
              </div>
              {gameState.gamePhase === 'finished' && gameState.winner === user?.id && (
                <div className="text-yellow-400 text-lg font-bold mb-4">
                  +{stakeAmount * 2} Gold Added!
                </div>
              )}
            </div>

            {/* Game Board */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4 max-w-sm mx-auto mb-6">
              {gameState.board?.map((cell, index) => (
                <button
                  key={index}
                  onClick={() => handleCellClick(index)}
                  disabled={!isMyTurn || cell !== "" || gameState.gamePhase !== 'playing'}
                  className={`
                    aspect-square bg-gray-700 rounded-lg text-3xl sm:text-4xl font-bold
                    transition-all duration-200 hover:bg-gray-600
                    ${isMyTurn && cell === "" && gameState.gamePhase === 'playing' 
                      ? 'cursor-pointer hover:scale-105' 
                      : 'cursor-not-allowed opacity-70'
                    }
                    ${cell === 'X' ? 'text-blue-400' : cell === 'O' ? 'text-red-400' : 'text-white'}
                  `}
                >
                  {cell}
                </button>
              ))}
            </div>

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
                onClick={handleBackToLobby}
                className="bg-gray-600 hover:bg-gray-700 text-white"
              >
                Back to Lobby
              </Button>
            </div>

            {/* Game Info */}
            <div className="mt-6 text-center text-xs sm:text-sm text-gray-300 space-y-1">
              <p>Get three in a row to win!</p>
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

export default MultiplayerTicTacToe;