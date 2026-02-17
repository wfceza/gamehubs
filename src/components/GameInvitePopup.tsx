
import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useGameInvitations } from "@/hooks/useGameInvitations";
import { Check, X, Gamepad2 } from "lucide-react";

interface GameInvitePopupProps {
  currentUser: any;
  onGameStart: (gameType: string, stake: number, opponentId?: string, gameId?: string) => void;
}

const formatGameType = (gameType: string) => {
  const gameNames: Record<string, string> = {
    'tic_tac_toe': 'Tic Tac Toe',
    'rock_paper_scissors': 'Rock Paper Scissors',
    'number_guessing': 'Number Guessing'
  };
  return gameNames[gameType] || gameType;
};

const getGameIcon = (gameType: string) => {
  const gameIcons: Record<string, string> = {
    'tic_tac_toe': '⭕',
    'rock_paper_scissors': '✂️',
    'number_guessing': '🔢'
  };
  return gameIcons[gameType] || '🎮';
};

const GameInvitePopup = ({ currentUser, onGameStart }: GameInvitePopupProps) => {
  const [pendingInvite, setPendingInvite] = useState<any>(null);
  const [responding, setResponding] = useState(false);
  const { respondToInvitation } = useGameInvitations();

  useEffect(() => {
    if (!currentUser?.id) return;

    // Listen for new game invitations in realtime
    const channel = supabase
      .channel('global_game_invite_popup')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'game_invitations',
          filter: `receiver_id=eq.${currentUser.id}`
        },
        async (payload) => {
          const invitation = payload.new;
          console.log('Real-time game invite received:', invitation);

          // Fetch sender info
          const { data: sender } = await supabase
            .from('profiles')
            .select('username, id')
            .eq('id', invitation.sender_id)
            .single();

          setPendingInvite({
            ...invitation,
            sender: sender || { username: 'Unknown', id: invitation.sender_id }
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser?.id]);

  // Also listen for game creation to redirect both players
  useEffect(() => {
    if (!currentUser?.id) return;

    const channel = supabase
      .channel('global_game_creation')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'games'
        },
        (payload) => {
          const game = payload.new;
          if (game.player1_id === currentUser.id || game.player2_id === currentUser.id) {
            const gameTypeMap: Record<string, string> = {
              'tic_tac_toe': 'tic-tac-toe',
              'rock_paper_scissors': 'rock-paper-scissors',
              'number_guessing': 'number-guessing'
            };
            const frontendGameType = gameTypeMap[game.type] || game.type;
            const opponentId = game.player1_id === currentUser.id ? game.player2_id : game.player1_id;

            setPendingInvite(null);
            toast({
              title: "Game Started!",
              description: "Redirecting to game...",
            });
            setTimeout(() => {
              onGameStart(frontendGameType, game.stake_amount, opponentId, game.id);
            }, 500);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser?.id, onGameStart]);

  const handleAccept = async () => {
    if (!pendingInvite) return;
    if (currentUser.gold < pendingInvite.stake_amount) {
      toast({
        title: "Insufficient Gold",
        description: `You need at least ${pendingInvite.stake_amount} Gold.`,
        variant: "destructive"
      });
      return;
    }

    setResponding(true);
    const { error } = await respondToInvitation(pendingInvite.id, 'accepted');
    setResponding(false);

    if (error) {
      toast({ title: "Failed to Accept", description: error, variant: "destructive" });
    } else {
      toast({ title: "Invitation Accepted!", description: "Game will start shortly..." });
      setPendingInvite(null);
    }
  };

  const handleReject = async () => {
    if (!pendingInvite) return;
    setResponding(true);
    const { error } = await respondToInvitation(pendingInvite.id, 'rejected');
    setResponding(false);

    if (error) {
      toast({ title: "Failed to Reject", description: error, variant: "destructive" });
    } else {
      toast({ title: "Invitation Rejected" });
      setPendingInvite(null);
    }
  };

  return (
    <Dialog open={!!pendingInvite} onOpenChange={(open) => { if (!open) setPendingInvite(null); }}>
      <DialogContent className="bg-gray-800 border-gray-600 mx-4 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Gamepad2 className="w-5 h-5" />
            Game Invitation!
          </DialogTitle>
          <DialogDescription className="text-gray-300">
            You've received a game challenge
          </DialogDescription>
        </DialogHeader>

        {pendingInvite && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-gray-700/60 rounded-lg">
              <span className="text-3xl">{getGameIcon(pendingInvite.game_type)}</span>
              <div>
                <p className="text-white font-semibold text-lg">
                  {pendingInvite.sender?.username} challenges you!
                </p>
                <p className="text-blue-200 text-sm">
                  {formatGameType(pendingInvite.game_type)} • {pendingInvite.stake_amount} Gold
                </p>
              </div>
            </div>

            {currentUser.gold < pendingInvite.stake_amount && (
              <p className="text-red-400 text-sm text-center">
                You don't have enough Gold ({currentUser.gold}/{pendingInvite.stake_amount})
              </p>
            )}

            <div className="flex gap-3">
              <Button
                onClick={handleAccept}
                disabled={responding || currentUser.gold < pendingInvite.stake_amount}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white border-0"
              >
                <Check className="w-4 h-4 mr-1" />
                Accept
              </Button>
              <Button
                onClick={handleReject}
                disabled={responding}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white border-0"
              >
                <X className="w-4 h-4 mr-1" />
                Reject
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default GameInvitePopup;