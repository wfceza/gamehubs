
import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

type Profile = Tables<'profiles'>;

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('useProfile: user changed:', user);
    if (user) {
      fetchProfile();
    } else {
      console.log('useProfile: no user, setting profile to null');
      setProfile(null);
      setLoading(false);
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) {
      console.log('fetchProfile: no user available');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('Fetching profile for user:', user.id);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        // If profile doesn't exist, try to create one
        console.log('Profile not found, creating new profile...');
        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            username: user.user_metadata?.username || user.email?.split('@')[0] || 'User',
            email: user.email || '',
            gold: 100
          })
          .select()
          .single();

        if (insertError) {
          console.error('Error creating profile:', insertError);
          setProfile(null);
        } else {
          console.log('Profile created successfully:', newProfile);
          setProfile(newProfile);
        }
      } else if (data) {
        console.log('Profile fetched successfully:', data);
        setProfile(data);
      } else {
        console.log('No profile found, creating new profile...');
        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            username: user.user_metadata?.username || user.email?.split('@')[0] || 'User',
            email: user.email || '',
            gold: 100
          })
          .select()
          .single();

        if (insertError) {
          console.error('Error creating profile:', insertError);
          setProfile(null);
        } else {
          console.log('Profile created successfully:', newProfile);
          setProfile(newProfile);
        }
      }
    } catch (error) {
      console.error('Error in fetchProfile:', error);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user || !profile) return { error: 'No user or profile found' };

    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) {
        console.error('Error updating profile:', error);
        return { error: error.message };
      } else {
        setProfile({ ...profile, ...updates });
        return { error: null };
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      return { error: 'An unexpected error occurred' };
    }
  };

  return { profile, loading, updateProfile, refetch: fetchProfile };
}
