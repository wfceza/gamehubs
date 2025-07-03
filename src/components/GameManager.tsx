
import MultiplayerTicTacToe from "@/components/games/MultiplayerTicTacToe";
import MultiplayerRockPaperScissors from "@/components/games/MultiplayerRockPaperScissors";
import NumberGuessing from "@/components/games/NumberGuessing";
import ConnectFour from "@/components/games/ConnectFour";
import WordGuessing from "@/components/games/WordGuessing";
import GameLobby from "@/components/GameLobby";

interface GameManagerProps {
  currentGame: string | null;
  profile: any;
  gameStake: number;
  gameOpponent: string | null;
  gameId: string | null;
  onGameEnd: () => void;
  onGameStart: (gameType: string, stake: number, opponentId?: string | null, gameId?: string | null) => void;
}

const GameManager = ({ 
  currentGame, 
  profile, 
  gameStake, 
  gameOpponent, 
  gameId, 
  onGameEnd, 
  onGameStart 
}: GameManagerProps) => {
  if (!currentGame) {
    return <GameLobby currentUser={profile} onGameStart={onGameStart} />;
  }

  const gameProps = {
    currentUser: profile,
    stakeAmount: gameStake,
    opponentId: gameOpponent,
    gameId: gameId,
    onGameEnd: onGameEnd
  };

  switch (currentGame) {
    case "tic-tac-toe":
      return <MultiplayerTicTacToe {...gameProps} />;
    case "rock-paper-scissors":
      return <MultiplayerRockPaperScissors {...gameProps} />;
    case "number-guessing":
      return <NumberGuessing {...gameProps} />;
    case "connect-four":
      return <ConnectFour {...gameProps} />;
    case "word-guessing":
      return <WordGuessing {...gameProps} />;
    default:
      return <GameLobby currentUser={profile} onGameStart={onGameStart} />;
  }
};

export default GameManager;
