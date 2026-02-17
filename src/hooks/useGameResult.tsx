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
        
         const { error: winRpcError } = await (supabase as any).rpc('process_game_win', {
          p_user_id: winnerId,
          p_gold_amount: stakeAmount * 2
        });

        if (winRpcError) {
          console.error('Error crediting winner via RPC:', winRpcError);
          throw winRpcError;
        } else {
          console.log('Winner credited via RPC with:', stakeAmount * 2);
        }
        // Update loser's stats only (no gold change - stake already deducted at start)
        const loserId = winnerId === player1Id ? player2Id : player1Id;
        const { error: loserStatsError } = await (supabase as any).rpc('update_loser_stats', {
          p_user_id: loserId
        });

        if (loserStatsError) {
          console.error('Error updating loser stats via RPC:', loserStatsError);
          throw loserStatsError;
        } else {
          console.log('Loser stats updated (no gold refund)');
        }

        console.log('Game result processed successfully via RPC');
      } else {
        // Tie: increment games_played for both via RPC
        const [{ error: tieErr1 }, { error: tieErr2 }] = await Promise.all([
          (supabase as any).rpc('process_game_tie', { p_user_id: player1Id }),
          (supabase as any).rpc('process_game_tie', { p_user_id: player2Id })
        ]);

        if (tieErr1 || tieErr2) {
          console.error('Error processing tie via RPC:', tieErr1, tieErr2);
          throw tieErr1 || tieErr2;
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