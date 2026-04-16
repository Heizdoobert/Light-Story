// This file manages the global authentication state and Role-Based Access Control (RBAC)
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../../core/supabase';
import { User } from '@supabase/supabase-js';

export type UserRole = 'superadmin' | 'admin' | 'employee' | 'user';

interface AuthContextType {
  user: User | null;
  profile: any | null;
  role: UserRole | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async () => {
    if (!supabase) return;
    
    // Attempting to use a more universal sign-in method if Google is not enabled.
    // In a real production app, you should enable Google in Supabase Dashboard.
    // For now, let's provide a prompt for email if Google fails, or just use a placeholder for demo.
    const email = window.prompt('Enter your email for Magic Link login:');
    if (!email) return;

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
      console.error('Login error:', error.message);
      alert(`Login failed: ${error.message}. Make sure the provider is enabled in Supabase Dashboard.`);
    } else {
      alert('Check your email for the login link!');
    }
  };

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      role: profile?.role || null, 
      loading, 
      signIn, 
      signOut 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
