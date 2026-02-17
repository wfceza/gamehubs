
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Gamepad2, Users, MessageCircle, User, Trophy } from "lucide-react";
import { useChat } from "@/hooks/useChat";

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface SidebarNavigationProps {
  currentPage: string;
  onPageChange: (page: string) => void;
}

const SidebarNavigation = ({ currentPage, onPageChange }: SidebarNavigationProps) => {
  const { totalUnreadCount } = useChat();

  const navigationItems: NavigationItem[] = [
    { id: "lobby", label: "Game Lobby", icon: Gamepad2 },
    { id: "friends", label: "Friends", icon: Users },
    { id: "chat", label: "Chat", icon: MessageCircle },
    { id: "profile", label: "Profile", icon: User },
    { id: "leaderboard", label: "Leaderboard", icon: Trophy }
  ];

  return (
    <div className="space-y-2 p-4">
      {navigationItems.map((item) => {
        const Icon = item.icon;
        return (
          <Button
            key={item.id}
            onClick={() => onPageChange(item.id)}
            variant={currentPage === item.id ? "default" : "ghost"}
            className={`w-full justify-start text-white hover:bg-white/10 ${
              currentPage === item.id 
                ? "bg-blue-600 hover:bg-blue-700" 
                : "bg-transparent hover:bg-gray-700"
            }`}
          >
            <Icon className="w-4 h-4 mr-2" />
            {item.label}
            {item.id === "chat" && totalUnreadCount > 0 && (
              <Badge className="bg-red-500 text-white text-xs ml-auto px-1.5 py-0.5 min-w-[20px] flex items-center justify-center">
                {totalUnreadCount}
              </Badge>
            )}
          </Button>
        );
      })}
    </div>
  );
};

export default SidebarNavigation;