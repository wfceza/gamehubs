
import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export function useGameInvitations() {
  const { user } = useAuth();
  const [invitations, setInvitations] = useState([]);
  const [sentInvitations, setSentInvitations] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchInvitations = async () => {
    if (!user) return;

    try {
      // Fetch received invitations
      const { data: receivedData, error: receivedError } = await supabase
        .from('game_invitations')
        .select(`
          *,
          sender:profiles!game_invitations_sender_id_fkey(username, id)
        `)
        .eq('receiver_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (receivedError) {
        console.error('Error fetching received invitations:', receivedError);
      } else {
        setInvitations(receivedData || []);
      }

      // Fetch sent invitations
      const { data: sentData, error: sentError } = await supabase
        .from('game_invitations')
        .select(`
          *,
          receiver:profiles!game_invitations_receiver_id_fkey(username, id)
        `)
        .eq('sender_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (sentError) {
        console.error('Error fetching sent invitations:', sentError);
      } else {
        setSentInvitations(sentData || []);
      }
    } catch (error) {
      console.error('Error fetching invitations:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendInvitation = async (receiverId: string, gameType: string, stakeAmount: number) => {
    try {
      const { error } = await supabase
        .from('game_invitations')
        .insert({
          sender_id: user.id,
          receiver_id: receiverId,
          game_type: gameType as 'tic_tac_toe' | 'rock_paper_scissors' | 'number_guessing',
          stake_amount: stakeAmount,
          status: 'pending'
        });

      if (error) throw error;

      // Refresh invitations
      await fetchInvitations();

      return { error: null };
    } catch (error) {
      console.error('Error sending invitation:', error);
      return { error: error.message };
    }
  };

  const respondToInvitation = async (invitationId: string, response: 'accepted' | 'rejected') => {
    try {
      // Update invitation status
      const { error: updateError } = await supabase
        .from('game_invitations')
        .update({ status: response })
        .eq('id', invitationId);

      if (updateError) throw updateError;

      if (response === 'accepted') {
        // Get invitation details for game creation
        const { data: invitationData, error: fetchError } = await supabase
          .from('game_invitations')
          .select('*')
          .eq('id', invitationId)
          .single();

        if (fetchError) throw fetchError;

        console.log('Creating game from invitation:', invitationData);

        // Get initial game state based on game type
        const getInitialGameState = (gameType: string, player1Id: string, player2Id: string) => {
          switch (gameType) {
            case 'tic_tac_toe':
              return {
                board: Array(9).fill(""),
                currentPlayer: player1Id,
                gamePhase: 'playing',
                playerSymbols: {
                  [player1Id]: 'X',
                  [player2Id]: 'O'
                }
              };
            case 'rock_paper_scissors':
              return {
                gamePhase: 'choosing',
                currentPlayer: player1Id,
                currentRound: 1,
                playerScores: {
                  [player1Id]: 0,
                  [player2Id]: 0
                },
                roundData: {
                  choices: {},
                  results: []
                }
              };
            case 'number_guessing':
              return {
                gamePhase: 'guessing',
                currentPlayer: player1Id,
                currentRound: 1,
                playerScores: {
                  [player1Id]: 0,
                  [player2Id]: 0
                },
                roundData: {
                  guesses: {},
                  targetNumber: Math.floor(Math.random() * 100) + 1
                }
              };
            default:
              return {};
          }
        };

        const initialGameData = getInitialGameState(
          invitationData.game_type,
          invitationData.sender_id,
          invitationData.receiver_id
        );

        console.log('Initial game data:', initialGameData);

        // Create a new game with initial state
        const { data: gameData, error: gameError } = await supabase
          .from('games')
          .insert({
            type: invitationData.game_type,
            player1_id: invitationData.sender_id,
            player2_id: invitationData.receiver_id,
            stake_amount: invitationData.stake_amount,
            status: 'in_progress',
            game_data: initialGameData
          })
          .select()
          .single();

        if (gameError) throw gameError;

        console.log('Game created successfully:', gameData);

        // Remove from local state immediately
        setInvitations(prev => prev.filter(inv => inv.id !== invitationId));

        return { error: null, gameId: gameData.id };
      } else {
        // Remove from local state immediately
        setInvitations(prev => prev.filter(inv => inv.id !== invitationId));
        return { error: null };
      }
    } catch (error) {
      console.error('Error responding to invitation:', error);
      return { error: error.message };
    }
  };

  const acceptInvitation = async (invitationId: string, gameType: string, stakeAmount: number, senderId: string) => {
    const result = await respondToInvitation(invitationId, 'accepted');
    if (result.error) {
      return null;
    }
    return result.gameId;
  };

  const rejectInvitation = async (invitationId: string) => {
    await respondToInvitation(invitationId, 'rejected');
  };

  const cancelSentInvitation = async (invitationId: string) => {
    try {
      const { error } = await supabase
        .from('game_invitations')
        .update({ status: 'rejected' })
        .eq('id', invitationId);

      if (error) throw error;

      // Remove from local state immediately
      setSentInvitations(prev => prev.filter(inv => inv.id !== invitationId));

      toast({
        title: "Invitation Cancelled",
        description: "Your game invitation has been cancelled"
      });
    } catch (error) {
      console.error('Error cancelling invitation:', error);
      toast({
        title: "Error",
        description: "Failed to cancel invitation",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchInvitations();

    if (!user) return;

    // Set up real-time subscription
    const channel = supabase
      .channel('game_invitations_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_invitations',
          filter: `receiver_id=eq.${user.id}`
        },
        () => {
          fetchInvitations();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_invitations',
          filter: `sender_id=eq.${user.id}`
        },
        () => {
          fetchInvitations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return {
    invitations,
    sentInvitations,
    loading,
    sendInvitation,
    respondToInvitation,
    acceptInvitation,
    rejectInvitation,
    cancelSentInvitation,
    refetch: fetchInvitations
  };
}
