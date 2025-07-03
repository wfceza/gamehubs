
-- First, let's check and fix the RLS policies for the games table
-- We need to ensure users can create games when they are participants

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view games they participate in" ON public.games;
DROP POLICY IF EXISTS "Users can create games" ON public.games;
DROP POLICY IF EXISTS "Users can update games they participate in" ON public.games;

-- Create proper RLS policies for games table
CREATE POLICY "Users can view games they participate in" 
  ON public.games 
  FOR SELECT 
  USING (auth.uid() = player1_id OR auth.uid() = player2_id);

CREATE POLICY "Users can create games" 
  ON public.games 
  FOR INSERT 
  WITH CHECK (auth.uid() = player1_id OR auth.uid() = player2_id);

CREATE POLICY "Users can update games they participate in" 
  ON public.games 
  FOR UPDATE 
  USING (auth.uid() = player1_id OR auth.uid() = player2_id);

CREATE POLICY "Users can delete games they participate in" 
  ON public.games 
  FOR DELETE 
  USING (auth.uid() = player1_id OR auth.uid() = player2_id);
