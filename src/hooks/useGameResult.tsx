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
        const loserId = winnerId === player1Id ? player2Id : player1Id;
        console.log('Winner ID:', winnerId, 'Loser ID:', loserId);
        
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

        // Deduct loser (stake)
        const { error: lossRpcError } = await (supabase as any).rpc('process_game_loss', {
          p_user_id: loserId,
          p_gold_amount: stakeAmount
        });

        if (lossRpcError) {
          console.error('Error deducting loser via RPC:', lossRpcError);
          throw lossRpcError;
        } else {
          console.log('Loser deducted via RPC with:', stakeAmount);
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