'use client';

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { User } from '@supabase/supabase-js';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { normalizeAuthEmail } from './utils';
export { normalizeAuthEmail } from './utils';

export interface UserProfile {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string;
  isGuest: boolean;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile;
  isLoading: boolean;
  isConfigured: boolean;
  signUp: (identifier: string, password: string, displayName: string) => Promise<void>;
  signIn: (identifier: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  setGuestName: (name: string) => void;
}

const GUEST_NAME_KEY = 'blockade_guest_name';
const GUEST_ID_KEY = 'blockade_guest_id';


const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [guestName, setGuestNameState] = useState<string>('Player 1');
  const [guestId, setGuestId] = useState<string>('');

  const isConfigured = isSupabaseConfigured();

  // Initialize guest identity from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedName = localStorage.getItem(GUEST_NAME_KEY);
      if (storedName) {
        setGuestNameState(storedName);
      }

      let storedId = localStorage.getItem(GUEST_ID_KEY);
      if (!storedId) {
        storedId = `guest_${Math.random().toString(36).substring(2, 9)}`;
        localStorage.setItem(GUEST_ID_KEY, storedId);
      }
      setGuestId(storedId);
    }
  }, []);

  // Listen to Supabase auth state
  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    // Get current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    // Listen to changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const setGuestName = (name: string) => {
    const trimmed = name.trim() || 'Player 1';
    setGuestNameState(trimmed);
    if (typeof window !== 'undefined') {
      localStorage.setItem(GUEST_NAME_KEY, trimmed);
    }
  };

  const signUp = async (identifier: string, password: string, displayName: string) => {
    const cleanName = displayName.trim() || identifier.trim() || 'Player';
    const username = identifier.trim();

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        password,
        displayName: cleanName,
      }),
    });

    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error || 'Failed to create account.');
    }

    // Automatically sign in with credentials to initialize the client session
    await signIn(username, password);
  };

  const signIn = async (identifier: string, password: string) => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error('Database is not configured yet. Please check .env settings.');
    }

    const email = normalizeAuthEmail(identifier);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('Sign In Error:', error);
      throw error;
    }

    if (data?.user) {
      setUser(data.user);
      const name =
        data.user.user_metadata?.display_name ||
        data.user.user_metadata?.name ||
        identifier;
      setGuestName(name);
    }
  };

  const signOut = async () => {
    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase.auth.signOut();
      setUser(null);
    }
  };

  const profile: UserProfile = useMemo(() => {
    if (user) {
      const meta = user.user_metadata || {};
      const displayName =
        meta.display_name ||
        meta.full_name ||
        meta.name ||
        user.email?.split('@')[0] ||
        'Blockade Player';

      return {
        id: user.id,
        name: displayName,
        email: user.email,
        avatarUrl: meta.avatar_url || meta.picture,
        isGuest: false,
      };
    }

    return {
      id: guestId || 'guest_local',
      name: guestName,
      isGuest: true,
    };
  }, [user, guestName, guestId]);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isLoading,
        isConfigured,
        signUp,
        signIn,
        signOut,
        setGuestName,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
