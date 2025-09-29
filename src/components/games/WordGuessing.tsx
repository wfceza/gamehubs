
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMultiplayerGame } from "@/hooks/useMultiplayerGame";
import { useGameResult } from "@/hooks/useGameResult";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Trophy, User, Coins, Clock } from "lucide-react";

interface WordGuessingProps {
  currentUser: any;
  stakeAmount: number;
  opponentId: string | null;
  gameId: string | null;
  onGameEnd: () => void;
}

const WordGuessing = ({ currentUser, stakeAmount, opponentId, gameId, onGameEnd }: WordGuessingProps) => {
  const { game, gameState, isMyTurn, loading, updateGameState } = useMultiplayerGame(gameId);
  const { processGameResult } = useGameResult();
  const [guess, setGuess] = useState("");
  const [gameEnded, setGameEnded] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);

  const gamePhase = gameState.gamePhase || 'playing';
  const currentRound = gameState.currentRound || 1;
  const playerScores = gameState.playerScores || {};
  const roundData = gameState.roundData || { word: "", guesses: {}, guesser: null };
  const winner = gameState.winner;

  const words = [
    "javascript", "computer", "elephant", "rainbow", "adventure", "chocolate", "mountain", "butterfly",
    "symphony", "universe", "treasure", "diamond", "hurricane", "telescope", "wonderful", "fantastic"
  ];

  // Timer effect
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (gamePhase === 'guessing' && isMyTurn && timeLeft > 0 && !gameEnded) {
      timer = setTimeout(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isMyTurn && gamePhase === 'guessing') {
      handleTimeUp();
    }
    return () => clearTimeout(timer);
  }, [timeLeft, isMyTurn, gamePhase, gameEnded]);

  const handleTimeUp = async () => {
    if (gamePhase === 'guessing' && isMyTurn) {
      toast({
        title: "Time's Up!",
        description: "You ran out of time!",
        variant: "destructive"
      });
      await submitGuess("");
    }
  };

  const startNewRound = async () => {
    if (!isMyTurn) return;

    const randomWord = words[Math.floor(Math.random() * words.length)];
    const newRoundData = {
      word: randomWord,
      guesses: {},
      guesser: opponentId // The other player guesses
    };

    const newState = {
      gamePhase: 'guessing',
      currentPlayer: opponentId,
      roundData: newRoundData,
      currentRound: currentRound
    };

    await updateGameState(newState);
    setTimeLeft(30);
  };

  const submitGuess = async (guessValue: string = guess) => {
    if (!isMyTurn || gamePhase !== 'guessing') return;

    const isCorrect = guessValue.toLowerCase() === roundData.word?.toLowerCase();
    const newGuesses = { ...roundData.guesses, [currentUser.id]: guessValue };
    
    let newScores = { ...playerScores };
    if (isCorrect) {
      newScores[currentUser.id] = (newScores[currentUser.id] || 0) + 1;
    }

    // Check if game should end (after 5 rounds or someone reaches 3 points)
    const shouldEndGame = currentRound >= 5 || Math.max(...Object.values(newScores)) >= 3;
    
    let winnerId = null;
    if (shouldEndGame) {
      const myScore = newScores[currentUser.id] || 0;
      const opponentScore = newScores[opponentId || ''] || 0;
      
      if (myScore > opponentScore) {
        winnerId = currentUser.id;
      } else if (opponentScore > myScore) {
        winnerId = opponentId;
      } else {
        winnerId = 'tie';
      }
    }

    const newState = {
      gamePhase: shouldEndGame ? 'finished' : 'waiting',
      currentPlayer: shouldEndGame ? currentPlayer : (currentRound % 2 === 0 ? currentUser.id : opponentId),
      currentPlayer: shouldEndGame ? null : (currentRound % 2 === 0 ? currentUser.id : opponentId),
      playerScores: newScores,
      roundData: {
        ...roundData,
        guesses: newGuesses
      },
      currentRound: shouldEndGame ? currentRound : currentRound + 1,
      winner: winnerId
    };

    await updateGameState(newState, shouldEndGame ? 'completed' : 'in_progress');

    if (isCorrect) {
      toast({
        title: "Correct!",
        description: `You guessed "${roundData.word}" correctly!`,
      });
    } else {
      toast({
        title: "Wrong!",
        description: `The word was "${roundData.word}"`,
        variant: "destructive"
      });
    }

    if (shouldEndGame) {
      setGameEnded(true);
      if (game) {
        await processGameResult(game.id, winnerId === 'tie' ? null : winnerId, stakeAmount, game.player1_id, game.player2_id || '');
      }
    }

    setGuess("");
    setTimeLeft(30);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (guess.trim()) {
      submitGuess();
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
              Word Guessing Game
              {winner && (
                <div className="flex items-center justify-center mt-2">
                  <Trophy className="w-6 h-6 mr-2 text-yellow-400" />
                  {winner === 'tie' ? "It's a Tie!" : winner === currentUser.id ? "You Win!" : "You Lose!"}
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Scores */}
            <div className="flex justify-between items-center bg-gray-700 p-4 rounded-lg">
              <div className="text-white">
                <div className="text-sm text-gray-300">Your Score</div>
                <div className="text-xl font-bold">{playerScores[currentUser.id] || 0}</div>
              </div>
              <div className="text-white text-center">
                <div className="text-sm text-gray-300">Round</div>
                <div className="text-xl font-bold">{currentRound}/5</div>
              </div>
              <div className="text-white text-right">
                <div className="text-sm text-gray-300">Opponent Score</div>
                <div className="text-xl font-bold">{playerScores[opponentId || ''] || 0}</div>
              </div>
            </div>

            {/* Game Status */}
            <div className="text-center">
              {gamePhase === 'waiting' && (
                <div className="text-white">
                  {isMyTurn ? (
                    <Button onClick={startNewRound} className="bg-blue-600 hover:bg-blue-700">
                      Start Round {currentRound}
                    </Button>
                  ) : (
                    <span>Waiting for opponent to start the round...</span>
                  )}
                </div>
              )}

              {gamePhase === 'guessing' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-center space-x-4">
                    <User className="w-5 h-5 text-white" />
                    <span className="text-white">
                      {isMyTurn ? "Your turn to guess!" : "Opponent is guessing..."}
                    </span>
                    {isMyTurn && (
                      <div className="flex items-center space-x-2">
                        <Clock className="w-5 h-5 text-red-400" />
                        <span className="text-red-400 font-bold">{timeLeft}s</span>
                      </div>
                    )}
                  </div>

                  {isMyTurn && (
                    <div className="max-w-md mx-auto">
                      <div className="text-white mb-4">
                        <div className="text-lg font-bold">Word Length: {roundData.word?.length || 0} letters</div>
                        <div className="text-sm text-gray-300">
                          Hint: {roundData.word?.charAt(0)}***
                        </div>
                      </div>
                      
                      <form onSubmit={handleSubmit} className="space-y-4">
                        <Input
                          value={guess}
                          onChange={(e) => setGuess(e.target.value)}
                          placeholder="Enter your guess..."
                          className="bg-gray-700 border-gray-600 text-white"
                          maxLength={20}
                        />
                        <Button
                          type="submit"
                          disabled={!guess.trim()}
                          className="w-full bg-green-600 hover:bg-green-700"
                        >
                          Submit Guess
                        </Button>
                      </form>
                    </div>
                  )}
                </div>
              )}
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

export default WordGuessing;
