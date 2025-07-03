
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Users, UserPlus } from "lucide-react";

interface Friend {
  id: string;
  username: string;
  gold: number;
}

interface FriendsSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUser: any;
  gameType: string;
  stakeAmount: number;
  onFriendSelected: (friendId: string) => void;
}

const FriendsSelectorDialog = ({ 
  open, 
  onOpenChange, 
  currentUser, 
  gameType, 
  stakeAmount,
  onFriendSelected 
}: FriendsSelectorDialogProps) => {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && currentUser) {
      fetchFriends();
    }
  }, [open, currentUser]);

  const fetchFriends = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('friendships')
        .select(`
          user1_id,
          user2_id,
          user1:profiles!friendships_user1_id_fkey(id, username, gold),
          user2:profiles!friendships_user2_id_fkey(id, username, gold)
        `)
        .or(`user1_id.eq.${currentUser.id},user2_id.eq.${currentUser.id}`);

      if (error) {
        console.error('Error fetching friends:', error);
        return;
      }

      const friendsList = data?.map(friendship => {
        const friend = friendship.user1_id === currentUser.id 
          ? friendship.user2 
          : friendship.user1;
        return {
          id: friend.id,
          username: friend.username,
          gold: friend.gold
        };
      }) || [];

      setFriends(friendsList);
    } catch (error) {
      console.error('Error fetching friends:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatGameType = (gameType: string) => {
    const gameNames = {
      'tic-tac-toe': 'Tic Tac Toe',
      'rock-paper-scissors': 'Rock Paper Scissors',
      'number-guessing': 'Number Guessing'
    };
    return gameNames[gameType] || gameType;
  };

  const getGameIcon = (gameType: string) => {
    const gameIcons = {
      'tic-tac-toe': '⭕',
      'rock-paper-scissors': '✂️',
      'number-guessing': '🔢'
    };
    return gameIcons[gameType] || '🎮';
  };

  const handleSelectFriend = (friendId: string) => {
    onFriendSelected(friendId);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-800 border-gray-600 mx-4 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center">
            <span className="mr-2">{getGameIcon(gameType)}</span>
            Invite Friend to {formatGameType(gameType)}
          </DialogTitle>
          <DialogDescription className="text-gray-300">
            Choose a friend to invite for {stakeAmount} Gold
          </DialogDescription>
        </DialogHeader>
        
        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <div className="text-center text-gray-400 py-8">
              Loading friends...
            </div>
          ) : friends.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No friends yet</p>
              <p className="text-sm">Add friends to invite them to games!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {friends.map((friend) => (
                <Card key={friend.id} className="bg-gray-700/60 border-gray-600 hover:bg-gray-700/80 transition-colors">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs font-bold">
                            {friend.username.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-white font-medium text-sm">{friend.username}</p>
                          <p className="text-yellow-400 text-xs">{friend.gold} Gold</p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleSelectFriend(friend.id)}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3"
                      >
                        <UserPlus className="w-3 h-3 mr-1" />
                        Invite
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4">
          <Button 
            onClick={() => onOpenChange(false)}
            className="border-gray-600 text-white hover:bg-gray-700 bg-gray-700 text-sm"
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FriendsSelectorDialog;
