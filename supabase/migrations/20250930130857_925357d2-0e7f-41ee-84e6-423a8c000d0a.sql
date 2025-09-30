-- Fix security warnings by setting search_path on all functions

-- Update process_game_win
CREATE OR REPLACE FUNCTION public.process_game_win(p_user_id uuid, p_gold_amount integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.profiles
    SET
        gold = gold + p_gold_amount,
        wins = wins + 1,
        games_played = games_played + 1,
        updated_at = NOW()
    WHERE
        id = p_user_id;

    INSERT INTO public.security_logs (user_id, event_type, event_data)
    VALUES (p_user_id, 'game_win', jsonb_build_object(
        'gold_credited', p_gold_amount,
        'user_id', p_user_id
    ));
END;
$$;

-- Update process_game_loss
CREATE OR REPLACE FUNCTION public.process_game_loss(p_user_id uuid, p_gold_amount integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_gold INTEGER;
BEGIN
    SELECT gold INTO current_gold
    FROM public.profiles
    WHERE id = p_user_id;

    IF current_gold IS NULL THEN
        RAISE WARNING 'Profile not found for user ID: % during game loss deduction.', p_user_id;
        INSERT INTO public.security_logs (user_id, event_type, event_data)
        VALUES (p_user_id, 'game_loss_profile_not_found', jsonb_build_object(
            'attempted_deduction', p_gold_amount,
            'user_id', p_user_id
        ));
        RETURN;
    END IF;

    IF current_gold < p_gold_amount THEN
        UPDATE public.profiles
        SET
            gold = 0,
            losses = losses + 1,
            games_played = games_played + 1,
            updated_at = NOW()
        WHERE
            id = p_user_id;
        RAISE WARNING 'User % does not have enough gold (current: %, needed: %) for full deduction. Gold set to 0.', p_user_id, current_gold, p_gold_amount;
        INSERT INTO public.security_logs (user_id, event_type, event_data)
        VALUES (p_user_id, 'game_loss_insufficient_gold', jsonb_build_object(
            'attempted_deduction', p_gold_amount,
            'actual_deduction', current_gold,
            'current_gold_before', current_gold,
            'new_gold_after', 0,
            'user_id', p_user_id
        ));
    ELSE
        UPDATE public.profiles
        SET
            gold = gold - p_gold_amount,
            losses = losses + 1,
            games_played = games_played + 1,
            updated_at = NOW()
        WHERE
            id = p_user_id;

        INSERT INTO public.security_logs (user_id, event_type, event_data)
        VALUES (p_user_id, 'game_loss', jsonb_build_object(
            'gold_deducted', p_gold_amount,
            'user_id', p_user_id
        ));
    END IF;
END;
$$;

-- Update process_game_tie
CREATE OR REPLACE FUNCTION public.process_game_tie(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.profiles
    SET
        games_played = games_played + 1,
        updated_at = NOW()
    WHERE
        id = p_user_id;

    INSERT INTO public.security_logs (user_id, event_type, event_data)
    VALUES (p_user_id, 'game_tie', jsonb_build_object(
        'user_id', p_user_id
    ));
END;
$$;

-- Update log_security_event
CREATE OR REPLACE FUNCTION public.log_security_event(p_user_id uuid, p_event_type text, p_event_data jsonb DEFAULT '{}'::jsonb, p_ip_address inet DEFAULT NULL::inet, p_user_agent text DEFAULT NULL::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.security_logs (user_id, event_type, event_data, ip_address, user_agent)
  VALUES (p_user_id, p_event_type, p_event_data, p_ip_address, p_user_agent);
END;
$$;

-- Update update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Update handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NEW.email
  );
  RETURN NEW;
END;
$$;