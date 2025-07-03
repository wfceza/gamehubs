
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMultiplayerGame } from "@/hooks/useMultiplayerGame";
import { useGameResult } from "@/hooks/useGameResult";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Trophy, User, Coins } from "lucide-react";

interface ConnectFourProps {
  currentUser: any;
  stakeAmount: number;
  opponentId: string | null;
  gameId: string | null;
  onGameEnd: () => void;
}

const ConnectFour = ({ currentUser, stakeAmount, opponentId, gameId, onGameEnd }: ConnectFourProps) => {
  const { game, gameState, isMyTurn, loading, updateGameState } = useMultiplayerGame(gameId);
  const { processGameResult } = useGameResult();
  const [gameEnded, setGameEnded] = useState(false);

  const board = gameState.board || Array(6).fill(null).map(() => Array(7).fill(""));
  const currentPlayer = gameState.currentPlayer;
  const playerSymbols = gameState.playerSymbols || {};
  const winner = gameState.winner;

  const mySymbol = playerSymbols[currentUser?.id] || 'R';
  const opponentSymbol = mySymbol === 'R' ? 'Y' : 'R';

  const checkWinner = (board: string[][], row: number, col: number, symbol: string) => {
    const directions = [
      [0, 1], [1, 0], [1, 1], [1, -1] // horizontal, vertical, diagonal
    ];

    for (const [dx, dy] of directions) {
      let count = 1;
      
      // Check positive direction
      for (let i = 1; i < 4; i++) {
        const newRow = row + dx * i;
        const newCol = col + dy * i;
        if (newRow >= 0 && newRow < 6 && newCol >= 0 && newCol < 7 && board[newRow][newCol] === symbol) {
          count++;
        } else {
          break;
        }
      }
      
      // Check negative direction
      for (let i = 1; i < 4; i++) {
        const newRow = row - dx * i;
        const newCol = col - dy * i;
        if (newRow >= 0 && newRow < 6 && newCol >= 0 && newCol < 7 && board[newRow][newCol] === symbol) {
          count++;
        } else {
          break;
        }
      }
      
      if (count >= 4) return true;
    }
    return false;
  };

  const makeMove = async (col: number) => {
    if (!isMyTurn || gameEnded || winner) return;

    // Find the lowest empty row in the column
    let row = -1;
    for (let r = 5; r >= 0; r--) {
      if (board[r][col] === "") {
        row = r;
        break;
      }
    }

    if (row === -1) {
      toast({
        title: "Invalid Move",
        description: "Column is full!",
        variant: "destructive"
      });
      return;
    }

    const newBoard = board.map(row => [...row]);
    newBoard[row][col] = mySymbol;

    const hasWon = checkWinner(newBoard, row, col, mySymbol);
    const isBoardFull = newBoard.every(row => row.every(cell => cell !== ""));

    const nextPlayer = currentPlayer === currentUser.id ? opponentId : currentUser.id;

    const newState = {
      board: newBoard,
      currentPlayer: hasWon || isBoardFull ? currentPlayer : nextPlayer,
      winner: hasWon ? currentUser.id : (isBoardFull ? 'tie' : null),
      gamePhase: hasWon || isBoardFull ? 'finished' : 'playing'
    };

    await updateGameState(newState, hasWon || isBoardFull ? 'completed' : 'in_progress');

    if (hasWon) {
      setGameEnded(true);
      toast({
        title: "Congratulations!",
        description: `You won ${stakeAmount} Gold!`,
      });
      
      if (game) {
        await processGameResult(game.id, currentUser.id, stakeAmount, game.player1_id, game.player2_id || '');
      }
    } else if (isBoardFull) {
      setGameEnded(true);
      toast({
        title: "Game Over",
        description: "It's a tie!",
      });
      
      if (game) {
        await processGameResult(game.id, null, stakeAmount, game.player1_id, game.player2_id || '');
      }
    }
  };

  useEffect(() => {
    if (winner && winner !== 'tie' && !gameEnded) {
      setGameEnded(true);
      if (winner === currentUser.id) {
        toast({
          title: "Congratulations!",
          description: `You won ${stakeAmount} Gold!`,
        });
      } else {
        toast({
          title: "Game Over",
          description: `You lost ${stakeAmount} Gold!`,
          variant: "destructive"
        });
      }
    }
  }, [winner, gameEnded, currentUser.id, stakeAmount]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading game...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Button
            onClick={onGameEnd}
            variant="outline"
            className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Lobby
          </Button>
          
          <div className="flex items-center space-x-4 text-white">
            <div className="flex items-center">
              <Coins className="w-5 h-5 mr-2 text-yellow-400" />
              <span className="font-bold">{stakeAmount} Gold</span>
            </div>
          </div>
        </div>

        <Card className="bg-gray-800/90 backdrop-blur-lg border-gray-700">
          <CardHeader>
            <CardTitle className="text-white text-center text-2xl">
              Connect Four
              {winner && (
                <div className="flex items-center justify-center mt-2">
                  <Trophy className="w-6 h-6 mr-2 text-yellow-400" />
                  {winner === 'tie' ? "It's a Tie!" : winner === currentUser.id ? "You Win!" : "You Lose!"}
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Game Status */}
            <div className="text-center">
              {!winner && (
                <div className="flex items-center justify-center space-x-2">
                  <User className="w-5 h-5 text-white" />
                  <span className="text-white">
                    {isMyTurn ? "Your turn" : "Opponent's turn"}
                  </span>
                  <div className={`w-4 h-4 rounded-full ${isMyTurn ? (mySymbol === 'R' ? 'bg-red-500' : 'bg-yellow-500') : (opponentSymbol === 'R' ? 'bg-red-500' : 'bg-yellow-500')}`} />
                </div>
              )}
            </div>

            {/* Game Board */}
            <div className="bg-blue-600 p-4 rounded-lg mx-auto w-fit">
              <div className="grid grid-cols-7 gap-2">
                {/* Column buttons */}
                {Array.from({ length: 7 }, (_, col) => (
                  <Button
                    key={`btn-${col}`}
                    onClick={() => makeMove(col)}
                    disabled={!isMyTurn || gameEnded || winner !== null}
                    className="w-12 h-8 bg-blue-500 hover:bg-blue-400 text-white text-sm"
                  >
                    ↓
                  </Button>
                ))}
                
                {/* Board cells */}
                {board.map((row, rowIndex) =>
                  row.map((cell, colIndex) => (
                    <div
                      key={`${rowIndex}-${colIndex}`}
                      className={`w-12 h-12 rounded-full border-2 border-blue-300 flex items-center justify-center ${
                        cell === 'R' ? 'bg-red-500' : cell === 'Y' ? 'bg-yellow-500' : 'bg-white'
                      }`}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Game Controls */}
            {gameEnded && (
              <div className="text-center">
                <Button
                  onClick={onGameEnd}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Return to Lobby
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ConnectFour;
