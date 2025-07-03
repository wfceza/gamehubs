
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
      if (winnerId) {
        // Update winner's gold and stats
        const { error: winnerError } = await supabase.rpc('process_game_win', {
          p_user_id: winnerId,
          p_gold_amount: stakeAmount
        });

        if (winnerError) {
          console.error('Error processing winner:', winnerError);
          throw winnerError;
        }

        // Update loser's gold and stats
        const loserId = winnerId === player1Id ? player2Id : player1Id;
        const { error: loserError } = await supabase.rpc('process_game_loss', {
          p_user_id: loserId,
          p_gold_amount: stakeAmount
        });

        if (loserError) {
          console.error('Error processing loser:', loserError);
          throw loserError;
        }

        console.log('Game result processed successfully');
      } else {
        // Handle tie - just update games played for both players
        const { error: tieError1 } = await supabase.rpc('process_game_tie', {
          p_user_id: player1Id
        });
        
        const { error: tieError2 } = await supabase.rpc('process_game_tie', {
          p_user_id: player2Id
        });

        if (tieError1 || tieError2) {
          console.error('Error processing tie:', tieError1 || tieError2);
          throw tieError1 || tieError2;
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
