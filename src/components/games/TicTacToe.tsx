
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Trophy, User, RotateCcw } from "lucide-react";

const TicTacToe = ({ currentUser, stakeAmount, onGameEnd }) => {
  const [board, setBoard] = useState(Array(9).fill(""));
  const [currentPlayer, setCurrentPlayer] = useState("X");
  const [gameStatus, setGameStatus] = useState("playing");
  const [winner, setWinner] = useState(null);

  const winningCombinations = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
    [0, 4, 8], [2, 4, 6] // Diagonals
  ];

  const checkWinner = (board) => {
    for (let combination of winningCombinations) {
      const [a, b, c] = combination;
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return board[a];
      }
    }
    return null;
  };

  const checkDraw = (board) => {
    return board.every(cell => cell !== "") && !checkWinner(board);
  };

  const handleCellClick = (index) => {
    if (board[index] !== "" || gameStatus !== "playing") return;

    const newBoard = [...board];
    newBoard[index] = currentPlayer;
    setBoard(newBoard);

    const gameWinner = checkWinner(newBoard);
    const isDraw = checkDraw(newBoard);

    if (gameWinner) {
      setWinner(gameWinner);
      setGameStatus("finished");
      const isPlayerWin = gameWinner === "X";
      
      toast({
        title: isPlayerWin ? "Congratulations!" : "Game Over!",
        description: isPlayerWin 
          ? `You won ${stakeAmount * 2} Gold!` 
          : `You lost ${stakeAmount} Gold.`,
        variant: isPlayerWin ? "default" : "destructive"
      });
    } else if (isDraw) {
      setGameStatus("draw");
      toast({
        title: "It's a Draw!",
        description: "Your stake has been returned.",
      });
    } else {
      setCurrentPlayer(currentPlayer === "X" ? "O" : "X");
    }
  };

  const resetGame = () => {
    setBoard(Array(9).fill(""));
    setCurrentPlayer("X");
    setGameStatus("playing");
    setWinner(null);
  };

  const getGameStatusText = () => {
    if (gameStatus === "playing") {
      return `${currentPlayer === "X" ? "Your" : "Opponent's"} Turn`;
    } else if (gameStatus === "draw") {
      return "It's a Draw!";
    } else {
      return winner === "X" ? "You Win!" : "You Lose!";
    }
  };

  const getGameStatusColor = () => {
    if (gameStatus === "playing") return "text-blue-400";
    if (gameStatus === "draw") return "text-yellow-400";
    return winner === "X" ? "text-green-400" : "text-red-400";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <Card className="bg-gray-800/90 border-gray-600 backdrop-blur-lg shadow-2xl">
          <CardHeader className="border-b border-gray-600">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-white text-xl sm:text-2xl">⭕ Tic Tac Toe</CardTitle>
              <Badge className="bg-yellow-600 hover:bg-yellow-700 text-white">
                <Trophy className="w-4 h-4 mr-1" />
                {stakeAmount * 2} Gold Prize
              </Badge>
            </div>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className={`text-base sm:text-lg font-bold ${getGameStatusColor()}`}>
                {getGameStatusText()}
              </div>
              <div className="flex items-center space-x-4 text-sm">
                <div className="text-white flex items-center">
                  <User className="w-4 h-4 mr-1" />
                  You (X)
                </div>
                <div className="text-gray-300 flex items-center">
                  <User className="w-4 h-4 mr-1" />
                  Computer (O)
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            {/* Game Board */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-6 max-w-xs sm:max-w-sm mx-auto">
              {board.map((cell, index) => (
                <button
                  key={index}
                  onClick={() => handleCellClick(index)}
                  className="aspect-square bg-gray-700 border-2 border-gray-600 rounded-lg text-2xl sm:text-3xl font-bold text-white hover:bg-gray-600 transition-all duration-200 disabled:cursor-not-allowed hover:scale-105"
                  disabled={cell !== "" || gameStatus !== "playing"}
                >
                  {cell}
                </button>
              ))}
            </div>

            {/* Game Controls */}
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4 justify-center">
              <Button 
                onClick={resetGame}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                New Game
              </Button>
              
              <Button 
                onClick={onGameEnd}
                variant="outline"
                className="border-gray-600 text-white hover:bg-gray-700 bg-gray-800"
              >
                Back to Lobby
              </Button>
            </div>

            {/* Game Info */}
            <div className="mt-6 text-center text-sm text-gray-300 space-y-2">
              <p>Get three of your symbols in a row (horizontal, vertical, or diagonal) to win!</p>
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

export default TicTacToe;
