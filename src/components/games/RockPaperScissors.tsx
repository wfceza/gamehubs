
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Trophy, User, RotateCcw } from "lucide-react";

const RockPaperScissors = ({ currentUser, stakeAmount, onGameEnd }) => {
  const [playerChoice, setPlayerChoice] = useState(null);
  const [opponentChoice, setOpponentChoice] = useState(null);
  const [roundResult, setRoundResult] = useState(null);
  const [playerScore, setPlayerScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [gameStatus, setGameStatus] = useState("playing");
  const [currentRound, setCurrentRound] = useState(1);
  const [showResult, setShowResult] = useState(false);

  const choices = [
    { id: "rock", name: "Rock", icon: "🪨", emoji: "✊" },
    { id: "paper", name: "Paper", icon: "📄", emoji: "✋" },
    { id: "scissors", name: "Scissors", icon: "✂️", emoji: "✌️" }
  ];

  const getRandomChoice = () => {
    return choices[Math.floor(Math.random() * choices.length)];
  };

  const determineWinner = (player, opponent) => {
    if (player.id === opponent.id) return "tie";
    
    const winConditions = {
      rock: "scissors",
      paper: "rock",
      scissors: "paper"
    };
    
    return winConditions[player.id] === opponent.id ? "player" : "opponent";
  };

  const handleChoice = (choice) => {
    if (gameStatus !== "playing") return;
    
    const opponent = getRandomChoice();
    setPlayerChoice(choice);
    setOpponentChoice(opponent);
    
    const result = determineWinner(choice, opponent);
    setRoundResult(result);
    setShowResult(true);
    
    // Update scores
    let newPlayerScore = playerScore;
    let newOpponentScore = opponentScore;
    
    if (result === "player") {
      newPlayerScore = playerScore + 1;
      setPlayerScore(newPlayerScore);
    } else if (result === "opponent") {
      newOpponentScore = opponentScore + 1;
      setOpponentScore(newOpponentScore);
    }
    
    // Check if game is finished (best of 5)
    setTimeout(() => {
      if (newPlayerScore === 3 || newOpponentScore === 3) {
        setGameStatus("finished");
        const playerWon = newPlayerScore === 3;
        
        toast({
          title: playerWon ? "Congratulations!" : "Game Over!",
          description: playerWon 
            ? `You won ${stakeAmount * 2} Gold!` 
            : `You lost ${stakeAmount} Gold.`,
          variant: playerWon ? "default" : "destructive"
        });
      } else {
        setCurrentRound(currentRound + 1);
        setShowResult(false);
        setPlayerChoice(null);
        setOpponentChoice(null);
        setRoundResult(null);
      }
    }, 2000);
  };

  const resetGame = () => {
    setPlayerChoice(null);
    setOpponentChoice(null);
    setRoundResult(null);
    setPlayerScore(0);
    setOpponentScore(0);
    setGameStatus("playing");
    setCurrentRound(1);
    setShowResult(false);
  };

  const getResultText = () => {
    if (!roundResult) return "";
    if (roundResult === "tie") return "It's a Tie!";
    if (roundResult === "player") return "You Win This Round!";
    return "Computer Wins This Round!";
  };

  const getResultColor = () => {
    if (!roundResult) return "";
    if (roundResult === "tie") return "text-yellow-400";
    if (roundResult === "player") return "text-green-400";
    return "text-red-400";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl">
        <Card className="bg-gray-800/90 border-gray-600 backdrop-blur-lg shadow-2xl">
          <CardHeader className="border-b border-gray-600">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-white text-xl sm:text-2xl">✂️ Rock Paper Scissors</CardTitle>
              <Badge className="bg-yellow-600 hover:bg-yellow-700 text-white">
                <Trophy className="w-4 h-4 mr-1" />
                {stakeAmount * 2} Gold Prize
              </Badge>
            </div>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="text-white text-sm sm:text-base">
                Round {currentRound} - Best of 5
              </div>
              <div className="flex items-center space-x-6">
                <div className="text-center">
                  <div className="text-white text-xs sm:text-sm">You</div>
                  <div className="text-xl sm:text-2xl font-bold text-green-400">{playerScore}</div>
                </div>
                <div className="text-white text-lg sm:text-xl">-</div>
                <div className="text-center">
                  <div className="text-white text-xs sm:text-sm">Computer</div>
                  <div className="text-xl sm:text-2xl font-bold text-red-400">{opponentScore}</div>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            {/* Round Result */}
            {showResult && (
              <div className="text-center mb-6">
                <div className="flex justify-center items-center space-x-4 sm:space-x-8 mb-4">
                  <div className="text-center">
                    <div className="text-4xl sm:text-6xl mb-2">{playerChoice?.emoji}</div>
                    <div className="text-white text-sm sm:text-base">{playerChoice?.name}</div>
                  </div>
                  <div className="text-white text-xl sm:text-2xl">VS</div>
                  <div className="text-center">
                    <div className="text-4xl sm:text-6xl mb-2">{opponentChoice?.emoji}</div>
                    <div className="text-white text-sm sm:text-base">{opponentChoice?.name}</div>
                  </div>
                </div>
                <div className={`text-lg sm:text-xl font-bold ${getResultColor()}`}>
                  {getResultText()}
                </div>
              </div>
            )}

            {/* Choice Buttons */}
            {gameStatus === "playing" && !showResult && (
              <div>
                <div className="text-center mb-6">
                  <h3 className="text-lg sm:text-xl text-white mb-4">Choose your move:</h3>
                </div>
                <div className="grid grid-cols-3 gap-3 sm:gap-4 max-w-md mx-auto mb-6">
                  {choices.map((choice) => (
                    <button
                      key={choice.id}
                      onClick={() => handleChoice(choice)}
                      className="bg-gray-700 border-2 border-gray-600 rounded-lg p-4 sm:p-6 hover:bg-gray-600 transition-all duration-200 transform hover:scale-105"
                    >
                      <div className="text-3xl sm:text-4xl mb-2">{choice.emoji}</div>
                      <div className="text-white text-sm sm:text-base font-medium">{choice.name}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Game Over Screen */}
            {gameStatus === "finished" && (
              <div className="text-center mb-6">
                <div className={`text-2xl sm:text-3xl font-bold mb-4 ${playerScore === 3 ? 'text-green-400' : 'text-red-400'}`}>
                  {playerScore === 3 ? "🎉 You Win!" : "😔 You Lose!"}
                </div>
                <div className="text-white text-base sm:text-lg mb-4">
                  Final Score: {playerScore} - {opponentScore}
                </div>
              </div>
            )}

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
            <div className="mt-6 text-center text-xs sm:text-sm text-gray-300 space-y-1">
              <p>Rock beats Scissors, Scissors beats Paper, Paper beats Rock</p>
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

export default RockPaperScissors;
