
import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, username: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

// Security utility functions
const cleanupAuthState = () => {
  // Remove all Supabase auth keys from localStorage
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
      localStorage.removeItem(key);
    }
  });
  
  // Remove from sessionStorage if available
  if (typeof sessionStorage !== 'undefined') {
    Object.keys(sessionStorage).forEach((key) => {
      if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
        sessionStorage.removeItem(key);
      }
    });
  }
};

const validatePassword = (password: string): string | null => {
  if (password.length < 8) {
    return "Password must be at least 8 characters long";
  }
  if (!/(?=.*[a-z])/.test(password)) {
    return "Password must contain at least one lowercase letter";
  }
  if (!/(?=.*[A-Z])/.test(password)) {
    return "Password must contain at least one uppercase letter";
  }
  if (!/(?=.*\d)/.test(password)) {
    return "Password must contain at least one number";
  }
  return null;
};

const validateUsername = (username: string): string | null => {
  if (username.length < 3 || username.length > 20) {
    return "Username must be between 3 and 20 characters";
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    return "Username can only contain letters, numbers, underscores, and hyphens";
  }
  return null;
};

const logSecurityEvent = async (eventType: string, eventData: any = {}) => {
  try {
    // Log security events for monitoring
    console.log(`[SECURITY] ${eventType}:`, eventData);
    
    // In a production environment, you might want to send this to your security logging endpoint
    // await supabase.rpc('log_security_event', {
    //   p_user_id: user?.id,
    //   p_event_type: eventType,
    //   p_event_data: eventData
    // });
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Log security events for monitoring
        if (event === 'SIGNED_IN' && session?.user) {
          await logSecurityEvent('user_login', {
            userId: session.user.id,
            email: session.user.email,
            loginMethod: 'password'
          });
        } else if (event === 'SIGNED_OUT') {
          await logSecurityEvent('user_logout', {
            userId: user?.id
          });
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, username: string) => {
    try {
      // Validate inputs
      const passwordError = validatePassword(password);
      if (passwordError) {
        return { error: { message: passwordError } };
      }

      const usernameError = validateUsername(username);
      if (usernameError) {
        return { error: { message: usernameError } };
      }

      // Clean up any existing auth state
      cleanupAuthState();

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username },
          emailRedirectTo: `${window.location.origin}/`
        }
      });

      if (error) {
        await logSecurityEvent('signup_failed', {
          email,
          error: error.message
        });
      } else {
        await logSecurityEvent('signup_success', {
          email,
          username
        });
      }

      return { error };
    } catch (error) {
      await logSecurityEvent('signup_error', {
        email,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return { error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      // Clean up any existing auth state
      cleanupAuthState();
      
      // Attempt global sign out first
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        // Continue even if this fails
        console.log('Global signout failed, continuing...');
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        await logSecurityEvent('login_failed', {
          email,
          error: error.message
        });
      }

      return { error };
    } catch (error) {
      await logSecurityEvent('login_error', {
        email,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return { error };
    }
  };

  const signOut = async () => {
    try {
      const currentUserId = user?.id;
      
      // Clean up auth state
      cleanupAuthState();
      
      // Attempt global sign out
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        console.log('Global signout failed, continuing...');
      }

      if (currentUserId) {
        await logSecurityEvent('logout_success', {
          userId: currentUserId
        });
      }

      // Force page reload for clean state
      setTimeout(() => {
        window.location.href = '/auth';
      }, 100);
    } catch (error) {
      console.error('Signout error:', error);
      // Force page reload even if signout fails
      window.location.href = '/auth';
    }
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
