
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { toast } from '@/hooks/use-toast';

type Game = Tables<'games'>;

interface GameState {
  board?: any[];
  currentPlayer?: string;
  gamePhase?: string;
  playerScores?: { [key: string]: number };
  roundData?: any;
  lastMove?: any;
  playerSymbols?: { [key: string]: string };
  winner?: string;
  currentRound?: number;
}

export function useMultiplayerGame(gameId: string | null) {
  const { user } = useAuth();
  const [game, setGame] = useState<Game | null>(null);
  const [gameState, setGameState] = useState<GameState>({});
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch game data
  const fetchGame = useCallback(async () => {
    if (!gameId || !user) return;

    try {
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .eq('id', gameId)
        .single();

      if (error) {
        console.error('Error fetching game:', error);
        return;
      }

      setGame(data);
      if (data?.game_data) {
        const gameData = data.game_data as GameState;
        setGameState(gameData);
        setIsMyTurn(gameData.currentPlayer === user.id);
      } else {
        // Initialize game state if it doesn't exist
        const initialState = getInitialGameState(data, user.id);
        setGameState(initialState);
        setIsMyTurn(initialState.currentPlayer === user.id);
        
        // Update the database with initial state
        await updateGameState(initialState);
      }
    } catch (error) {
      console.error('Error fetching game:', error);
    } finally {
      setLoading(false);
    }
  }, [gameId, user]);

  // Get initial game state based on game type
  const getInitialGameState = (game: Game, userId: string) => {
    const opponentId = game.player1_id === userId ? game.player2_id : game.player1_id;
    
    switch (game.type) {
      case 'tic_tac_toe':
        return {
          board: Array(9).fill(""),
          currentPlayer: game.player1_id,
          gamePhase: 'playing',
          playerSymbols: {
            [game.player1_id]: 'X',
            [opponentId || '']: 'O'
          }
        };
      case 'rock_paper_scissors':
        return {
          gamePhase: 'choosing',
          currentRound: 1,
          playerScores: {
            [game.player1_id]: 0,
            [opponentId || '']: 0
          },
          roundData: {
            choices: {},
            results: []
          }
        };
      case 'number_guessing':
        return {
          gamePhase: 'guessing',
          currentRound: 1,
          playerScores: {
            [game.player1_id]: 0,
            [opponentId || '']: 0
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

  // Update game state
  const updateGameState = async (newState: Partial<GameState>, status?: 'pending' | 'in_progress' | 'completed' | 'cancelled') => {
    if (!game || !user) return;

    const updatedState = { ...gameState, ...newState };

    try {
      const { error } = await supabase
        .from('games')
        .update({
          game_data: updatedState,
          status: status || game.status,
          updated_at: new Date().toISOString()
        })
        .eq('id', game.id);

      if (error) {
        console.error('Error updating game:', error);
        toast({
          title: "Game Update Failed",
          description: "Failed to update game state",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error updating game:', error);
    }
  };

  // Set up realtime subscription
  useEffect(() => {
    if (!gameId) return;

    fetchGame();

    const channel = supabase
      .channel(`game_${gameId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'games',
          filter: `id=eq.${gameId}`
        },
        (payload) => {
          const updatedGame = payload.new as Game;
          setGame(updatedGame);
          
          if (updatedGame.game_data) {
            const newState = updatedGame.game_data as GameState;
            setGameState(newState);
            setIsMyTurn(newState.currentPlayer === user?.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId, user, fetchGame]);

  return {
    game,
    gameState,
    isMyTurn,
    loading,
    updateGameState,
    refetch: fetchGame
  };
}
