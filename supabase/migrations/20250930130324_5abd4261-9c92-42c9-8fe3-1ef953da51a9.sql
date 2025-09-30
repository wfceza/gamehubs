-- Create RPC function to process game tie with refund (return stakes to both players)
CREATE OR REPLACE FUNCTION public.process_game_tie_with_refund(p_player1_id uuid, p_player2_id uuid, p_stake_amount integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Refund stake to player 1
    UPDATE public.profiles
    SET
        gold = gold + p_stake_amount,
        games_played = games_played + 1,
        updated_at = NOW()
    WHERE
        id = p_player1_id;

    -- Refund stake to player 2
    UPDATE public.profiles
    SET
        gold = gold + p_stake_amount,
        games_played = games_played + 1,
        updated_at = NOW()
    WHERE
        id = p_player2_id;

    -- Log the tie event
    INSERT INTO public.security_logs (user_id, event_type, event_data)
    VALUES (p_player1_id, 'game_tie_refund', jsonb_build_object(
        'player1_id', p_player1_id,
        'player2_id', p_player2_id,
        'stake_refunded', p_stake_amount
    ));
END;
$$;

-- Create RPC function to deduct stakes from both players at game start
CREATE OR REPLACE FUNCTION public.deduct_game_stakes(p_player1_id uuid, p_player2_id uuid, p_stake_amount integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    player1_gold INTEGER;
    player2_gold INTEGER;
BEGIN
    -- Get current gold balances
    SELECT gold INTO player1_gold FROM public.profiles WHERE id = p_player1_id;
    SELECT gold INTO player2_gold FROM public.profiles WHERE id = p_player2_id;

    -- Check if both players have enough gold
    IF player1_gold < p_stake_amount THEN
        RETURN jsonb_build_object('success', false, 'error', 'Player 1 has insufficient gold');
    END IF;

    IF player2_gold < p_stake_amount THEN
        RETURN jsonb_build_object('success', false, 'error', 'Player 2 has insufficient gold');
    END IF;

    -- Deduct stakes from both players
    UPDATE public.profiles
    SET
        gold = gold - p_stake_amount,
        updated_at = NOW()
    WHERE
        id IN (p_player1_id, p_player2_id);

    -- Log the stake deduction
    INSERT INTO public.security_logs (user_id, event_type, event_data)
    VALUES (p_player1_id, 'game_stakes_deducted', jsonb_build_object(
        'player1_id', p_player1_id,
        'player2_id', p_player2_id,
        'stake_amount', p_stake_amount
    ));

    RETURN jsonb_build_object('success', true);
END;
$$;