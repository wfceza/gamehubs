-- Create RPC function to update loser stats (no gold change, stakes already deducted at start)
CREATE OR REPLACE FUNCTION public.update_loser_stats(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Update loser's stats only (gold already deducted at game start)
    UPDATE public.profiles
    SET
        losses = losses + 1,
        games_played = games_played + 1,
        updated_at = NOW()
    WHERE
        id = p_user_id;

    -- Log the loss event
    INSERT INTO public.security_logs (user_id, event_type, event_data)
    VALUES (p_user_id, 'game_loss_stats_update', jsonb_build_object(
        'user_id', p_user_id
    ));
END;
$$;