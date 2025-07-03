
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GameAction {
  gameId: string;
  action: string;
  data: any;
}

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VALIDATE-GAME-ACTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Starting game action validation");

    // Use service role for secure game state validation
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header provided");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw userError;
    
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");

    const { gameId, action, data }: GameAction = await req.json();
    logStep("Received game action", { gameId, action, userId: user.id });

    // Fetch game state
    const { data: game, error: gameError } = await supabaseClient
      .from('games')
      .select('*')
      .eq('id', gameId)
      .single();

    if (gameError || !game) {
      throw new Error("Game not found");
    }

    // Verify user is a participant
    if (game.player1_id !== user.id && game.player2_id !== user.id) {
      throw new Error("User not authorized for this game");
    }

    // Validate game state and action
    const gameData = game.game_data as any;
    let isValidAction = false;
    let updatedGameData = { ...gameData };

    switch (game.type) {
      case 'tic_tac_toe':
        isValidAction = validateTicTacToeAction(game, gameData, action, data, user.id);
        if (isValidAction) {
          updatedGameData = applyTicTacToeAction(gameData, action, data, user.id);
        }
        break;
      
      case 'rock_paper_scissors':
        isValidAction = validateRockPaperScissorsAction(game, gameData, action, data, user.id);
        if (isValidAction) {
          updatedGameData = applyRockPaperScissorsAction(gameData, action, data, user.id);
        }
        break;
      
      case 'number_guessing':
        isValidAction = validateNumberGuessingAction(game, gameData, action, data, user.id);
        if (isValidAction) {
          updatedGameData = applyNumberGuessingAction(gameData, action, data, user.id);
        }
        break;
      
      default:
        throw new Error("Unsupported game type");
    }

    if (!isValidAction) {
      // Log suspicious activity
      await supabaseClient.rpc('log_security_event', {
        p_user_id: user.id,
        p_event_type: 'invalid_game_action',
        p_event_data: {
          game_id: gameId,
          game_type: game.type,
          action,
          data,
          current_state: gameData
        }
      });
      
      throw new Error("Invalid game action");
    }

    // Update game state
    const { error: updateError } = await supabaseClient
      .from('games')
      .update({
        game_data: updatedGameData,
        updated_at: new Date().toISOString()
      })
      .eq('id', gameId);

    if (updateError) {
      throw new Error(`Failed to update game: ${updateError.message}`);
    }

    logStep("Game action validated and applied", { gameId, action });

    return new Response(JSON.stringify({ 
      success: true, 
      gameData: updatedGameData 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("Game validation failed", { error: errorMessage });
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

// Game-specific validation functions
function validateTicTacToeAction(game: any, gameData: any, action: string, data: any, userId: string): boolean {
  if (action !== 'make_move') return false;
  
  const { position } = data;
  if (typeof position !== 'number' || position < 0 || position > 8) return false;
  
  // Check if it's the player's turn
  if (gameData.currentPlayer !== userId) return false;
  
  // Check if position is empty
  if (gameData.board[position] !== '') return false;
  
  return true;
}

function applyTicTacToeAction(gameData: any, action: string, data: any, userId: string): any {
  const { position } = data;
  const newGameData = { ...gameData };
  
  // Apply move
  newGameData.board[position] = newGameData.playerSymbols[userId];
  
  // Switch turns
  const opponentId = Object.keys(newGameData.playerSymbols).find(id => id !== userId);
  newGameData.currentPlayer = opponentId;
  
  // Check for win/draw conditions
  // (Implementation would check for winning conditions)
  
  return newGameData;
}

function validateRockPaperScissorsAction(game: any, gameData: any, action: string, data: any, userId: string): boolean {
  if (action !== 'make_choice') return false;
  
  const { choice } = data;
  if (!['rock', 'paper', 'scissors'].includes(choice)) return false;
  
  // Check if player hasn't already chosen for this round
  if (gameData.roundData?.choices?.[userId]) return false;
  
  return true;
}

function applyRockPaperScissorsAction(gameData: any, action: string, data: any, userId: string): any {
  const { choice } = data;
  const newGameData = { ...gameData };
  
  if (!newGameData.roundData) {
    newGameData.roundData = { choices: {}, results: [] };
  }
  
  newGameData.roundData.choices[userId] = choice;
  
  // If both players have chosen, resolve round
  const choices = newGameData.roundData.choices;
  if (Object.keys(choices).length === 2) {
    // Resolve round logic would go here
    // Reset choices for next round
    newGameData.roundData.choices = {};
    newGameData.currentRound = (newGameData.currentRound || 1) + 1;
  }
  
  return newGameData;
}

function validateNumberGuessingAction(game: any, gameData: any, action: string, data: any, userId: string): boolean {
  if (action !== 'make_guess') return false;
  
  const { guess } = data;
  if (typeof guess !== 'number' || guess < 1 || guess > 100) return false;
  
  return true;
}

function applyNumberGuessingAction(gameData: any, action: string, data: any, userId: string): any {
  const { guess } = data;
  const newGameData = { ...gameData };
  
  if (!newGameData.roundData) {
    newGameData.roundData = { 
      guesses: {}, 
      targetNumber: Math.floor(Math.random() * 100) + 1 
    };
  }
  
  newGameData.roundData.guesses[userId] = guess;
  
  // Check if guess is correct or close
  const target = newGameData.roundData.targetNumber;
  const distance = Math.abs(guess - target);
  
  if (distance === 0) {
    // Exact match - player wins
    newGameData.winner = userId;
    newGameData.gamePhase = 'completed';
  }
  
  return newGameData;
}
