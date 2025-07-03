
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

  // Get initial game state based on game type
  const getInitialGameState = useCallback((game: Game, userId: string) => {
    const opponentId = game.player1_id === userId ? game.player2_id : game.player1_id;
    
    console.log('Initializing game state for:', game.type, 'with players:', game.player1_id, game.player2_id);
    
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
          currentPlayer: game.player1_id,
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
          currentPlayer: game.player1_id,
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
  }, []);

  // Fetch game data
  const fetchGame = useCallback(async () => {
    if (!gameId || !user) {
      setLoading(false);
      return;
    }

    try {
      console.log('Fetching game with ID:', gameId);
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .eq('id', gameId)
        .single();

      if (error) {
        console.error('Error fetching game:', error);
        setLoading(false);
        return;
      }

      console.log('Game fetched:', data);
      setGame(data);
      
      // Check if game_data exists and is not empty
      if (data?.game_data && Object.keys(data.game_data).length > 0) {
        const gameData = data.game_data as GameState;
        console.log('Using existing game data:', gameData);
        setGameState(gameData);
        setIsMyTurn(gameData.currentPlayer === user.id);
      } else {
        // Initialize game state if it doesn't exist or is empty
        console.log('Initializing new game state for empty game_data');
        const initialState = getInitialGameState(data, user.id);
        console.log('Initial state created:', initialState);
        setGameState(initialState);
        setIsMyTurn(initialState.currentPlayer === user.id);
        
        // Update the database with initial state
        await updateGameStateInDB(data.id, initialState);
      }
    } catch (error) {
      console.error('Error fetching game:', error);
    } finally {
      setLoading(false);
    }
  }, [gameId, user, getInitialGameState]);

  // Update game state in database
  const updateGameStateInDB = async (gameId: string, newState: Partial<GameState>) => {
    try {
      console.log('Updating game state in DB:', gameId, newState);
      const { error } = await supabase
        .from('games')
        .update({
          game_data: newState,
          updated_at: new Date().toISOString()
        })
        .eq('id', gameId);

      if (error) {
        console.error('Error updating game state in DB:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error updating game state:', error);
      throw error;
    }
  };

  // Update game state
  const updateGameState = async (newState: Partial<GameState>, status?: 'pending' | 'in_progress' | 'completed' | 'cancelled') => {
    if (!game || !user) return;

    const updatedState = { ...gameState, ...newState };
    console.log('Updating game state:', updatedState);

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
        throw error;
      }
    } catch (error) {
      console.error('Error updating game:', error);
      throw error;
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
          console.log('Realtime game update received:', payload);
          const updatedGame = payload.new as Game;
          setGame(updatedGame);
          
          if (updatedGame.game_data && Object.keys(updatedGame.game_data).length > 0) {
            const newState = updatedGame.game_data as GameState;
            console.log('Setting new state from realtime:', newState);
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
