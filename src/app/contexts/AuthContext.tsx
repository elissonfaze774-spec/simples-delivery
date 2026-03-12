import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  users: Array<User & { password?: string }>;
  authLoading: boolean;
  login: (email: string, password: string) => Promise<User | null>;
  logout: () => Promise<void>;
  createUser: (email: string, password: string, storeId: string) => Promise<boolean>;
  resetPassword: (email: string, newPassword: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

type AppRole = 'admin' | 'super-admin';

async function withTimeout<T>(fn: () => Promise<T>, ms = 15000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Tempo esgotado na requisição')), ms);

    fn()
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

function normalizeEmail(email?: string | null) {
  return (email ?? '').trim().toLowerCase();
}

function isMissingColumnError(error: any, columnName: string) {
  const msg = String(error?.message || error?.details || error?.hint || '');
  return msg.toLowerCase().includes(columnName.toLowerCase());
}

function isAbortLikeError(error: any) {
  const msg = String(error?.message || error?.details || error?.hint || '').toLowerCase();

  return (
    msg.includes('aborterror') ||
    msg.includes('lock broken') ||
    msg.includes('aborted') ||
    msg.includes('tempo esgotado')
  );
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const superAdminEmail = normalizeEmail('elissonfaze774@gmail.com');

  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<Array<User & { password?: string }>>([]);
  const [authLoading, setAuthLoading] = useState<boolean>(true);

  const isMounted = useRef<boolean>(true);
  const mountedRef = useRef<boolean>(false);
  const loadSessionInFlight = useRef<boolean>(false);

  const USER_CACHE_KEY = 'saas:user';

  const getCachedUser = (): User | null => {
    try {
      if (typeof window === 'undefined') return null;
      const raw = localStorage.getItem(USER_CACHE_KEY);
      return raw ? (JSON.parse(raw) as User) : null;
    } catch {
      return null;
    }
  };

  const setCachedUser = (u: User | null) => {
    try {
      if (typeof window === 'undefined') return;
      if (!u) {
        localStorage.removeItem(USER_CACHE_KEY);
        return;
      }
      localStorage.setItem(USER_CACHE_KEY, JSON.stringify(u));
    } catch {
      //
    }
  };

  const resolveUserRole = async (authUser: any): Promise<AppRole> => {
    const normalizedEmail = normalizeEmail(authUser?.email);

    if (!authUser || !normalizedEmail) {
      return 'admin';
    }

    if (normalizedEmail === superAdminEmail) {
      return 'super-admin';
    }

    try {
      const { data: profile, error } = await withTimeout(
        async () =>
          await supabase
            .from('profiles')
            .select('role, email')
            .eq('id', authUser.id)
            .maybeSingle(),
        12000
      );

      if (error) {
        if (!isAbortLikeError(error) && !isMissingColumnError(error, 'role')) {
          console.error('Erro ao buscar role em profiles:', error);
        }
        return 'admin';
      }

      const dbRole = String(profile?.role ?? '').trim().toLowerCase();

      if (dbRole === 'super_admin' || dbRole === 'super-admin') {
        return 'super-admin';
      }

      return 'admin';
    } catch (error) {
      if (!isAbortLikeError(error)) {
        console.error('Erro inesperado ao resolver role do usuário:', error);
      }
      return 'admin';
    }
  };

  const buildUserFromSession = async (authUser: any): Promise<User | null> => {
    if (!authUser) return null;

    const normalizedEmail = normalizeEmail(authUser.email);
    let storeId: string | undefined;

    const role = await resolveUserRole(authUser);

    try {
      if (role === 'admin') {
        try {
          const { data: storeByOwner, error: ownerError } = await withTimeout(
            async () =>
              await supabase
                .from('stores')
                .select('id, admin_email, owner_user_id')
                .eq('owner_user_id', authUser.id)
                .maybeSingle(),
            12000
          );

          if (ownerError) {
            if (!isAbortLikeError(ownerError) && !isMissingColumnError(ownerError, 'owner_user_id')) {
              console.error('Erro ao buscar loja por owner_user_id:', ownerError);
            }
          } else if (storeByOwner) {
            storeId = String(storeByOwner.id);
          }
        } catch (error) {
          if (!isAbortLikeError(error) && !isMissingColumnError(error, 'owner_user_id')) {
            console.error('Erro inesperado ao buscar owner_user_id:', error);
          }
        }

        if (!storeId && normalizedEmail) {
          try {
            const { data: emailStore, error: emailError } = await withTimeout(
              async () =>
                await supabase
                  .from('stores')
                  .select('id, admin_email')
                  .ilike('admin_email', normalizedEmail)
                  .maybeSingle(),
              12000
            );

            if (emailError) {
              if (!isAbortLikeError(emailError)) {
                console.error('Erro ao buscar loja por admin_email:', emailError);
              }
            } else if (emailStore) {
              storeId = String(emailStore.id);
            }
          } catch (error) {
            if (!isAbortLikeError(error)) {
              console.error('Erro ao buscar loja por admin_email:', error);
            }
          }
        }
      }
    } catch (error) {
      if (!isAbortLikeError(error)) {
        console.error('Erro ao montar usuário pela sessão:', error);
      }
    }

    return {
      id: String(authUser.id),
      email: normalizedEmail,
      role,
      storeId,
    };
  };

  const loadUsersList = async () => {
    try {
      const { data, error } = await withTimeout(
        async () =>
          await supabase
            .from('stores')
            .select('id, admin_email')
            .order('created_at', { ascending: true }),
        12000
      );

      if (error) {
        if (!isAbortLikeError(error)) {
          console.error('Erro ao carregar lista de admins:', error);
        }
        if (isMounted.current) setUsers([]);
        return;
      }

      const mappedUsers: Array<User & { password?: string }> = (data ?? []).map((row: any) => ({
        id: String(row.id),
        email: normalizeEmail(row.admin_email),
        role: 'admin',
        storeId: String(row.id),
      }));

      const hasSuperAdmin = mappedUsers.some((u) => u.email === superAdminEmail);

      if (!hasSuperAdmin) {
        mappedUsers.unshift({
          id: 'super-admin-local',
          email: superAdminEmail,
          role: 'super-admin',
        });
      }

      if (isMounted.current) setUsers(mappedUsers);
    } catch (error) {
      if (!isAbortLikeError(error)) {
        console.error('Timeout/erro ao carregar lista de admins:', error);
      }
      if (isMounted.current) setUsers([]);
    }
  };

  const loadSession = async (opts?: { showLoading?: boolean }) => {
    const showLoading = opts?.showLoading ?? true;

    if (loadSessionInFlight.current) {
      return;
    }

    loadSessionInFlight.current = true;

    if (showLoading && isMounted.current) {
      setAuthLoading(true);
    }

    try {
      const { data, error } = await withTimeout(async () => await supabase.auth.getSession(), 12000);

      if (error) {
        if (!isAbortLikeError(error)) {
          console.error('Erro ao carregar sessão:', error);
        }

        if (isMounted.current) {
          const cached = getCachedUser();
          if (!cached) {
            setUser(null);
            setCachedUser(null);
          }
        }
        return;
      }

      const sessionUser = data.session?.user ?? null;

      if (!sessionUser) {
        if (isMounted.current) {
          setUser(null);
          setCachedUser(null);
        }
        return;
      }

      const appUser = await buildUserFromSession(sessionUser);

      if (isMounted.current) {
        setUser(appUser);
        setCachedUser(appUser);
      }
    } catch (error) {
      if (!isAbortLikeError(error)) {
        console.error('Timeout/erro ao carregar sessão:', error);
      }

      if (isMounted.current) {
        const cached = getCachedUser();
        if (!cached) {
          setUser(null);
          setCachedUser(null);
        }
      }
    } finally {
      loadSessionInFlight.current = false;

      if (showLoading && isMounted.current) {
        setAuthLoading(false);
      }
    }
  };

  useEffect(() => {
    if (!isMounted.current) return;
    if (!authLoading) return;

    const timer = setTimeout(() => {
      if (isMounted.current) {
        setAuthLoading(false);
      }
    }, 15000);

    return () => clearTimeout(timer);
  }, [authLoading]);

  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;

    isMounted.current = true;

    const cached = getCachedUser();
    if (cached) {
      setUser(cached);
      setAuthLoading(false);
    }

    void loadSession({ showLoading: !cached });
    void loadUsersList();

    const authListener = supabase.auth.onAuthStateChange(
      (_event: any, session: any) => {
        void (async () => {
          try {
            if (!session?.user) {
              if (isMounted.current) {
                setUser(null);
                setCachedUser(null);
              }
              return;
            }

            const appUser = await buildUserFromSession(session.user);

            if (isMounted.current) {
              setUser(appUser);
              setCachedUser(appUser);
            }

            void loadUsersList();
          } catch (error) {
            if (!isAbortLikeError(error)) {
              console.error('Erro no onAuthStateChange:', error);
            }
          } finally {
            if (isMounted.current) {
              setAuthLoading(false);
            }
          }
        })();
      }
    );

    const handleVisibility = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        void loadSession({ showLoading: false });
      }
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibility);
    }

    return () => {
      isMounted.current = false;
      authListener.data.subscription.unsubscribe();

      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibility);
      }
    };
  }, []);

  const login = async (email: string, password: string): Promise<User | null> => {
    setAuthLoading(true);

    try {
      const normalizedEmail = normalizeEmail(email);

      const { data, error } = await withTimeout(
        async () =>
          await supabase.auth.signInWithPassword({
            email: normalizedEmail,
            password,
          }),
        12000
      );

      if (error) {
        console.error('Erro no login:', error.message);
        return null;
      }

      const sessionUser = data.user ?? data.session?.user;

      if (!sessionUser) {
        return null;
      }

      const appUser = await buildUserFromSession(sessionUser);

      if (!appUser) {
        return null;
      }

      if (isMounted.current) {
        setUser(appUser);
        setCachedUser(appUser);
      }

      void loadUsersList();
      return appUser;
    } catch (error) {
      console.error('Erro no login:', error);
      return null;
    } finally {
      if (isMounted.current) {
        setAuthLoading(false);
      }
    }
  };

  const createUser = async (
    email: string,
    _password: string,
    storeId: string
  ): Promise<boolean> => {
    try {
      const normalizedEmail = normalizeEmail(email);

      const { error: updateStoreError } = await withTimeout(
        async () =>
          await supabase
            .from('stores')
            .update({
              admin_email: normalizedEmail,
            })
            .eq('id', storeId),
        12000
      );

      if (updateStoreError) {
        console.error('Erro ao vincular email do admin à loja:', updateStoreError);
        return false;
      }

      void loadUsersList();
      return true;
    } catch (error) {
      console.error('Erro ao preparar vínculo do admin:', error);
      return false;
    }
  };

  const logout = async () => {
    if (isMounted.current) {
      setAuthLoading(true);
    }

    try {
      const { error } = await withTimeout(async () => await supabase.auth.signOut(), 12000);

      if (error) {
        console.error('Erro ao sair:', error.message);
      }
    } catch (error) {
      console.error('Erro ao sair:', error);
    } finally {
      if (isMounted.current) {
        setUser(null);
        setCachedUser(null);
        setAuthLoading(false);
      }
    }
  };

  const resetPassword = async (email: string, _newPassword: string): Promise<boolean> => {
    try {
      const redirectTo =
        typeof window !== 'undefined' ? window.location.origin : undefined;

      const { error } = await withTimeout(
        async () =>
          await supabase.auth.resetPasswordForEmail(normalizeEmail(email), {
            redirectTo,
          }),
        12000
      );

      if (error) {
        console.error('Erro ao enviar reset de senha:', error.message);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Erro ao enviar reset de senha:', error);
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        users,
        authLoading,
        login,
        logout,
        createUser,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
} 