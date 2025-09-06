import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Profile, NotificationPrefs } from '@/types';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, userData: { name: string; [key: string]: any }) => Promise<{ error: any; data?: any }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  updateProfileWithCompany: (profileData: Partial<Profile>, companyId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return;
      }

      // Convert database response to Profile type
      const profile: Profile = {
        ...data,
        role: data.role as Profile['role'],
        notification_preferences: (data.notification_preferences as unknown) as NotificationPrefs,
      };
      setProfile(profile);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  // Finalize onboarding after login by linking company and inserting compliances
  const finalizePendingOnboarding = async (userId: string) => {
    const pendingCompanyId = localStorage.getItem('pending_company_id');
    const pendingCompliancesRaw = localStorage.getItem('pending_compliances');
    const pendingPhone = localStorage.getItem('pending_phone');

    if (!pendingCompanyId) return; // nothing to do

    try {
      // 1) Link profile to company and set phone, primary
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          company_id: pendingCompanyId,
          phone: pendingPhone ?? undefined,
          is_primary: true,
        })
        .eq('id', userId);

      if (profileError) throw profileError;

      // 2) Insert compliances if present
      if (pendingCompliancesRaw) {
        const pendingCompliances = JSON.parse(pendingCompliancesRaw) as Array<any>;
        if (Array.isArray(pendingCompliances) && pendingCompliances.length > 0) {
          const withCompany = pendingCompliances.map((c) => ({ ...c, company_id: pendingCompanyId }));
          const { error: cError } = await supabase.from('compliances').insert(withCompany);
          if (cError) throw cError;
        }
      }

      // 3) Cleanup
      localStorage.removeItem('pending_company_id');
      localStorage.removeItem('pending_compliances');
      localStorage.removeItem('pending_phone');

      // Refresh profile in state
      await fetchProfile(userId);

      toast({
        title: 'Setup Complete',
        description: 'Your company has been linked and compliances initialized.',
      });
    } catch (e: any) {
      console.error('Error finalizing onboarding:', e);
      toast({
        title: 'Setup Error',
        description: e.message ?? 'Unable to complete onboarding automatically.',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Defer profile fetch to avoid recursive issues
          setTimeout(() => {
            fetchProfile(session.user.id);
          }, 0);

          // Finalize any pending onboarding work stored pre-auth
          setTimeout(() => {
            finalizePendingOnboarding(session.user!.id).catch((e) => {
              console.error('Finalize onboarding error:', e);
            });
          }, 0);
        } else {
          setProfile(null);
        }

        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        setTimeout(() => {
          fetchProfile(session.user.id);
        }, 0);

        // Also run finalizer on initial load if logged in
        setTimeout(() => {
          finalizePendingOnboarding(session.user!.id).catch((e) => {
            console.error('Finalize onboarding error (initial):', e);
          });
        }, 0);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast({
        title: "Sign In Error",
        description: error.message,
        variant: "destructive",
      });
    }

    return { error };
  };

  const signUp = async (email: string, password: string, userData: { name: string; [key: string]: any }) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error, data } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: userData,
      },
    });

    if (error) {
      toast({
        title: "Sign Up Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Account Created",
        description: "Please check your email to verify your account.",
      });
    }

    return { error, data };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      toast({
        title: "Sign Out Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setUser(null);
      setSession(null);
      setProfile(null);
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return;

    try {
      // Convert Profile updates to database format
      const dbUpdates = {
        ...updates,
        notification_preferences: updates.notification_preferences ? 
          updates.notification_preferences as any : undefined,
      };

      const { error } = await supabase
        .from('profiles')
        .update(dbUpdates)
        .eq('id', user.id);

      if (error) throw error;

      setProfile(prev => prev ? { ...prev, ...updates } : null);
      
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Update Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const updateProfileWithCompany = async (profileData: Partial<Profile>, companyId: string) => {
    if (!user) return;

    try {
      const dbUpdates = {
        ...profileData,
        company_id: companyId,
        notification_preferences: profileData.notification_preferences ? 
          profileData.notification_preferences as any : undefined,
      };

      const { error } = await supabase
        .from('profiles')
        .update(dbUpdates)
        .eq('id', user.id);

      if (error) throw error;

      // Fetch updated profile
      await fetchProfile(user.id);
      
      toast({
        title: "Setup Complete",
        description: "Your company profile has been created successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Setup Error",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const value = {
    user,
    session,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    updateProfile,
    updateProfileWithCompany,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};