
import { useState } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export function useGameResult() {
  const { user } = useAuth();
  const [processing, setProcessing] = useState(false);

  const processGameResult = async (gameId: string, winnerId: string | null, stakeAmount: number, player1Id: string, player2Id: string) => {
    if (!user || processing) return;
    
    setProcessing(true);
    
    try {
      console.log('Processing game result:', { gameId, winnerId, stakeAmount, player1Id, player2Id });
      
      // Update game status to completed
      const { error: gameUpdateError } = await supabase
        .from('games')
        .update({
          status: 'completed',
          winner_id: winnerId,
          updated_at: new Date().toISOString()
        })
        .eq('id', gameId);

      if (gameUpdateError) {
        console.error('Error updating game:', gameUpdateError);
        throw gameUpdateError;
      }

      // Process gold transactions
      if (winnerId && winnerId !== 'tie') {
        // Get current profiles to update gold properly
        const { data: winnerProfile } = await supabase
          .from('profiles')
          .select('gold, wins, games_played')
          .eq('id', winnerId)
          .single();

        const { data: loserProfile } = await supabase
          .from('profiles')
          .select('gold, losses, games_played')
          .eq('id', winnerId === player1Id ? player2Id : player1Id)
          .single();

        if (winnerProfile) {
          // Update winner: add double stake, increment wins and games
          const { error: winnerError } = await supabase
            .from('profiles')
            .update({
              gold: winnerProfile.gold + (stakeAmount * 2),
              wins: winnerProfile.wins + 1,
              games_played: winnerProfile.games_played + 1,
              updated_at: new Date().toISOString()
            })
            .eq('id', winnerId);

          if (winnerError) {
            console.error('Error processing winner:', winnerError);
            throw winnerError;
          }
        }

        if (loserProfile) {
          // Update loser: deduct stake, increment losses and games
          const loserId = winnerId === player1Id ? player2Id : player1Id;
          const { error: loserError } = await supabase
            .from('profiles')
            .update({
              gold: Math.max(loserProfile.gold - stakeAmount, 0),
              losses: loserProfile.losses + 1,
              games_played: loserProfile.games_played + 1,
              updated_at: new Date().toISOString()
            })
            .eq('id', loserId);

          if (loserError) {
            console.error('Error processing loser:', loserError);
            throw loserError;
          }
        }

        console.log('Game result processed successfully');
      } else {
        // Handle tie - just update games played for both players
         const { data: player1Profile } = await supabase
          .from('profiles')
          .select('games_played')
          .eq('id', player1Id)
          .single();

        const { data: player2Profile } = await supabase
          .from('profiles')
          .select('games_played')
          .eq('id', player2Id)
          .single();

        if (player1Profile) {
          await supabase
            .from('profiles')
            .update({
              games_played: player1Profile.games_played + 1,
              updated_at: new Date().toISOString()
            })
            .eq('id', player1Id);
        }

        if (player2Profile) {
          await supabase
            .from('profiles')
            .update({
              games_played: player2Profile.games_played + 1,
              updated_at: new Date().toISOString()
            })
            .eq('id', player2Id);
        }
      }

    } catch (error) {
      console.error('Error processing game result:', error);
      toast({
        title: "Error",
        description: "Failed to process game result",
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  return { processGameResult, processing };
}
