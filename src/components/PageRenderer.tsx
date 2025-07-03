
import GameLobby from "@/components/GameLobby";
import FriendsPage from "@/components/FriendsPage";
import ChatInterface from "@/components/ChatInterface";
import ProfilePage from "@/components/ProfilePage";
import LeaderboardPage from "@/components/LeaderboardPage";

interface PageRendererProps {
  currentPage: string;
  profile: any;
  onGameStart: (gameType: string, stake: number, opponentId?: string | null, gameId?: string | null) => void;
}

const PageRenderer = ({ currentPage, profile, onGameStart }: PageRendererProps) => {
  switch (currentPage) {
    case "lobby":
      return <GameLobby currentUser={profile} onGameStart={onGameStart} />;
    case "friends":
      return <FriendsPage currentUser={profile} onGameStart={onGameStart} />;
    case "chat":
      return <ChatInterface currentUser={profile} />;
    case "profile":
      return <ProfilePage currentUser={profile} />;
    case "leaderboard":
      return <LeaderboardPage currentUser={profile} />;
    default:
      return <GameLobby currentUser={profile} onGameStart={onGameStart} />;
  }
};

export default PageRenderer;
