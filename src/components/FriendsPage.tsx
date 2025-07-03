
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Users, UserPlus, Check, X, Search, Gamepad2 } from "lucide-react";
import GameInviteDialog from "./GameInviteDialog";
import GameInvitations from "./GameInvitations";

interface FriendsPageProps {
  currentUser: any;
  onGameStart?: (gameType: string, stake: number, opponentId?: string) => void;
}

const FriendsPage = ({ currentUser, onGameStart }: FriendsPageProps) => {
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [searchEmail, setSearchEmail] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [gameDialogOpen, setGameDialogOpen] = useState(false);

  useEffect(() => {
    fetchFriends();
    fetchFriendRequests();
    setupRealtimeSubscriptions();
  }, [currentUser]);

  const setupRealtimeSubscriptions = () => {
    const friendRequestsChannel = supabase
      .channel('friend_requests_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friend_requests'
        },
        () => {
          fetchFriendRequests();
        }
      )
      .subscribe();

    const friendshipsChannel = supabase
      .channel('friendships_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friendships'
        },
        () => {
          fetchFriends();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(friendRequestsChannel);
      supabase.removeChannel(friendshipsChannel);
    };
  };

  const fetchFriends = async () => {
    try {
      const { data, error } = await supabase
        .from('friendships')
        .select(`
          *,
          user1:profiles!friendships_user1_id_fkey(*),
          user2:profiles!friendships_user2_id_fkey(*)
        `)
        .or(`user1_id.eq.${currentUser.id},user2_id.eq.${currentUser.id}`);

      if (error) {
        console.error('Error fetching friends:', error);
      } else {
        const friendsList = data?.map(friendship => {
          const friend = friendship.user1_id === currentUser.id 
            ? friendship.user2 
            : friendship.user1;
          return friend;
        }) || [];
        setFriends(friendsList);
      }
    } catch (error) {
      console.error('Error fetching friends:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFriendRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('friend_requests')
        .select(`
          *,
          sender:profiles!friend_requests_sender_id_fkey(*),
          receiver:profiles!friend_requests_receiver_id_fkey(*)
        `)
        .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`)
        .eq('status', 'pending');

      if (error) {
        console.error('Error fetching friend requests:', error);
      } else {
        const requests = data?.map(request => ({
          id: request.id,
          senderId: request.sender_id,
          receiverId: request.receiver_id,
          status: request.status,
          sender: request.sender,
          receiver: request.receiver,
          type: request.sender_id === currentUser.id ? 'sent' : 'received'
        })) || [];
        setFriendRequests(requests);
      }
    } catch (error) {
      console.error('Error fetching friend requests:', error);
    }
  };

  const searchUsers = async () => {
    if (!searchEmail.trim()) return;
    
    setSearchLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .ilike('email', `%${searchEmail}%`)
        .neq('id', currentUser.id)
        .limit(10);

      if (error) {
        console.error('Error searching users:', error);
        toast({
          title: "Search Failed",
          description: "Failed to search for users. Please try again.",
          variant: "destructive"
        });
      } else {
        setSearchResults(data || []);
      }
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  const sendFriendRequest = async (receiverId: string) => {
    try {
      const { error } = await supabase
        .from('friend_requests')
        .insert({
          sender_id: currentUser.id,
          receiver_id: receiverId,
          status: 'pending'
        });

      if (error) {
        if (error.code === '23505') {
          toast({
            title: "Request Already Sent",
            description: "You have already sent a friend request to this user.",
            variant: "destructive"
          });
        } else {
          console.error('Error sending friend request:', error);
          toast({
            title: "Failed to Send Request",
            description: "Could not send friend request. Please try again.",
            variant: "destructive"
          });
        }
      } else {
        toast({
          title: "Friend Request Sent!",
          description: "Your friend request has been sent successfully.",
        });
        setSearchResults([]);
        setSearchEmail("");
        setDialogOpen(false);
      }
    } catch (error) {
      console.error('Error sending friend request:', error);
    }
  };

  const handleAcceptRequest = async (request) => {
    try {
      // Create friendship - ensure we're using string UUIDs and consistent ordering
      const { error: friendshipError } = await supabase
        .from('friendships')
        .insert({
          user1_id: request.senderId < request.receiverId ? request.senderId : request.receiverId,
          user2_id: request.senderId < request.receiverId ? request.receiverId : request.senderId
        });

      if (friendshipError) {
        console.error('Friendship creation error:', friendshipError);
        toast({
          title: "Failed to Accept",
          description: "Could not create friendship. Please try again.",
          variant: "destructive"
        });
        return;
      }

      // Update friend request status
      const { error: updateError } = await supabase
        .from('friend_requests')
        .update({ status: 'accepted' })
        .eq('id', request.id);

      if (updateError) {
        console.error('Request update error:', updateError);
      }

      toast({
        title: "Friend Request Accepted!",
        description: `You are now friends with ${request.sender.username}`,
      });

    } catch (error) {
      console.error('Error accepting friend request:', error);
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleRejectRequest = async (request) => {
    try {
      const { error } = await supabase
        .from('friend_requests')
        .update({ status: 'rejected' })
        .eq('id', request.id);

      if (error) {
        console.error('Error rejecting friend request:', error);
        toast({
          title: "Failed to Reject",
          description: "Could not reject friend request. Please try again.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Friend Request Rejected",
          description: "The friend request has been rejected.",
        });
      }
    } catch (error) {
      console.error('Error rejecting friend request:', error);
    }
  };

  const openGameInviteDialog = (friend) => {
    setSelectedFriend(friend);
    setGameDialogOpen(true);
  };

  const receivedRequests = friendRequests.filter(req => req.type === 'received');
  const sentRequests = friendRequests.filter(req => req.type === 'sent');

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading friends...</div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl sm:text-3xl font-bold text-white">Friends</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white">
              <UserPlus className="w-4 h-4 mr-2" />
              Add Friend
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-gray-900 border-gray-700 mx-4 max-w-md">
            <DialogHeader>
              <DialogTitle className="text-white">Add Friend</DialogTitle>
              <DialogDescription className="text-gray-300">
                Search for users by email to send friend requests.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex space-x-2">
                <Input
                  placeholder="Enter email address..."
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  className="bg-gray-800 border-gray-600 text-white"
                  onKeyDown={(e) => e.key === 'Enter' && searchUsers()}
                />
                <Button 
                  onClick={searchUsers} 
                  disabled={searchLoading || !searchEmail.trim()}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Search className="w-4 h-4" />
                </Button>
              </div>
              
              {searchResults.length > 0 && (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {searchResults.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-3 bg-gray-800 rounded">
                      <div>
                        <p className="text-white font-medium">{user.username}</p>
                        <p className="text-gray-400 text-sm">{user.email}</p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => sendFriendRequest(user.id)}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <UserPlus className="w-4 h-4 mr-1" />
                        Add
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Game Invitations Section */}
      {onGameStart && (
        <GameInvitations 
          currentUser={currentUser} 
          onGameStart={onGameStart}
        />
      )}

      {/* Friend Requests */}
      {receivedRequests.length > 0 && (
        <div>
          <h3 className="text-xl font-bold text-white mb-4">Friend Requests</h3>
          <div className="space-y-3">
            {receivedRequests.map((request) => (
              <Card key={request.id} className="bg-white/10 border-white/20 backdrop-blur-lg">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium">{request.sender.username}</p>
                      <p className="text-blue-200 text-sm">{request.sender.email}</p>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        onClick={() => handleAcceptRequest(request)}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRejectRequest(request)}
                        className="border-red-500 text-red-400 hover:bg-red-500 hover:text-white"
                      >
                        <X className="w-4 h-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Sent Requests */}
      {sentRequests.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-white mb-4">Pending Requests</h3>
          <div className="space-y-3">
            {sentRequests.map((request) => (
              <Card key={request.id} className="bg-white/5 border-white/10 backdrop-blur-lg">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white text-sm">{request.receiver.username}</p>
                      <p className="text-blue-200 text-xs">{request.receiver.email}</p>
                    </div>
                    <Badge variant="secondary" className="text-xs">Pending</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Friends List */}
      <div>
        <h3 className="text-xl font-bold text-white mb-4 flex items-center">
          <Users className="w-5 h-5 mr-2" />
          My Friends ({friends.length})
        </h3>
        
        {friends.length === 0 ? (
          <Card className="bg-white/5 border-white/10 backdrop-blur-lg">
            <CardContent className="p-8 text-center">
              <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-400 mb-2">No friends yet</p>
              <p className="text-gray-500 text-sm">Add friends to start playing games together!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {friends.map((friend) => (
              <Card key={friend.id} className="bg-white/10 border-white/20 backdrop-blur-lg hover:bg-white/15 transition-all">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white text-lg">{friend.username}</CardTitle>
                  <CardDescription className="text-blue-200 text-sm">
                    {friend.email}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-blue-200">Gold:</span>
                      <span className="text-yellow-400 font-bold">{friend.gold}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-blue-200">Games Won:</span>
                      <span className="text-green-400">{friend.wins}</span>
                    </div>
                    {onGameStart && (
                      <Button
                        onClick={() => openGameInviteDialog(friend)}
                        className="w-full mt-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                        size="sm"
                      >
                        <Gamepad2 className="w-4 h-4 mr-2" />
                        Invite to Game
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Game Invite Dialog */}
      <GameInviteDialog
        open={gameDialogOpen}
        onOpenChange={setGameDialogOpen}
        friend={selectedFriend}
        currentUser={currentUser}
      />
    </div>
  );
};

export default FriendsPage;
