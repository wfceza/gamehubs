
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { useGameInvitations } from "@/hooks/useGameInvitations";
import { Check, X, Clock, Gamepad2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface GameInvitationsProps {
  currentUser: any;
  onGameStart: (gameType: string, stake: number, opponentId?: string, gameId?: string) => void;
}

const GameInvitations = ({ currentUser, onGameStart }: GameInvitationsProps) => {
  const { invitations, sentInvitations, loading, respondToInvitation } = useGameInvitations();

  // Game creation redirect is now handled globally by GameInvitePopup

  const formatGameType = (gameType: string) => {
    const gameNames = {
      'tic_tac_toe': 'Tic Tac Toe',
      'rock_paper_scissors': 'Rock Paper Scissors',
      'number_guessing': 'Number Guessing'
    };
    return gameNames[gameType] || gameType;
  };

  const getGameIcon = (gameType: string) => {
    const gameIcons = {
      'tic_tac_toe': '⭕',
      'rock_paper_scissors': '✂️',
      'number_guessing': '🔢'
    };
    return gameIcons[gameType] || '🎮';
  };

  const handleAcceptInvitation = async (invitation: any) => {
    if (currentUser.gold < invitation.stake_amount) {
      toast({
        title: "Insufficient Gold",
        description: `You need at least ${invitation.stake_amount} Gold to accept this invitation.`,
        variant: "destructive"
      });
      return;
    }

    console.log('Accepting invitation:', invitation);
    const { error, gameId } = await respondToInvitation(invitation.id, 'accepted');

    if (error) {
      toast({
        title: "Failed to Accept",
        description: error,
        variant: "destructive"
      });
    } else {
      console.log('Invitation accepted, game created with ID:', gameId);
      toast({
        title: "Invitation Accepted!",
        description: "Game will start shortly...",
      });
    }
  };

  const handleRejectInvitation = async (invitation: any) => {
    const { error } = await respondToInvitation(invitation.id, 'rejected');

    if (error) {
      toast({
        title: "Failed to Reject",
        description: error,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Invitation Rejected",
        description: "The invitation has been declined.",
      });
    }
  };

  const receivedInvitations = invitations.filter(inv => 
    inv.receiver_id === currentUser.id && inv.status === 'pending'
  );

  const filteredSentInvitations = sentInvitations.filter(inv => 
    inv.sender_id === currentUser.id
  );

  if (loading) {
    return (
      <div className="p-4">
        <div className="text-white text-center">Loading invitations...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      {/* Received Invitations */}
      {receivedInvitations.length > 0 && (
        <div>
          <h3 className="text-lg sm:text-xl font-bold text-white mb-4 flex items-center">
            <Gamepad2 className="w-5 h-5 mr-2" />
            Game Invitations ({receivedInvitations.length})
          </h3>
          <div className="space-y-3">
            {receivedInvitations.map((invitation) => (
              <Card key={invitation.id} className="bg-gray-800/80 backdrop-blur-lg border-0">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center space-x-3">
                      <span className="text-xl sm:text-2xl">{getGameIcon(invitation.game_type)}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-white font-medium text-sm sm:text-base">
                          {invitation.sender.username} invited you to play
                        </p>
                        <p className="text-blue-200 text-xs sm:text-sm">
                          {formatGameType(invitation.game_type)} • {invitation.stake_amount} Gold
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
                      <Button
                        size="sm"
                        onClick={() => handleAcceptInvitation(invitation)}
                        className="bg-green-600 hover:bg-green-700 text-white text-xs sm:text-sm px-2 sm:px-3 border-0"
                        disabled={currentUser.gold < invitation.stake_amount}
                      >
                        <Check className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleRejectInvitation(invitation)}
                        className="bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm px-2 sm:px-3 border-0"
                      >
                        <X className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
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

      {/* Sent Invitations */}
      {filteredSentInvitations.length > 0 && (
        <div>
          <h3 className="text-base sm:text-lg font-bold text-white mb-4 flex items-center">
            <Clock className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
            Sent Invitations
          </h3>
          <div className="space-y-3">
            {filteredSentInvitations.map((invitation) => (
              <Card key={invitation.id} className="bg-gray-700/60 backdrop-blur-lg border-0">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center space-x-3">
                      <span className="text-lg sm:text-xl">{getGameIcon(invitation.game_type)}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-white text-sm">
                          Invited {invitation.receiver.username} to play
                        </p>
                        <p className="text-blue-200 text-xs">
                          {formatGameType(invitation.game_type)} • {invitation.stake_amount} Gold
                        </p>
                      </div>
                    </div>
                    <Badge 
                      variant={
                        invitation.status === 'accepted' ? 'default' : 
                        invitation.status === 'rejected' ? 'destructive' : 'secondary'
                      }
                      className="text-xs flex-shrink-0"
                    >
                      {invitation.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {receivedInvitations.length === 0 && filteredSentInvitations.length === 0 && (
        <div className="text-center text-gray-400 py-8">
          <Gamepad2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No game invitations yet</p>
          <p className="text-sm">Invite friends to play games together!</p>
        </div>
      )}
    </div>
  );
};

export default GameInvitations;