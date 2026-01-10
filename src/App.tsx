import { useState, useEffect, useCallback } from 'react';
import Login from './components/Login';
import KlingDashboard from './components/KlingDashboard';
import { User } from './types';
import { supabase } from './lib/supabase';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        const savedUser = localStorage.getItem('sora_user');
        if (savedUser) {
          const parsedUser = JSON.parse(savedUser);

          if (!parsedUser.role) {
            const { data: freshUser } = await supabase
              .from('users')
              .select('*')
              .eq('id', parsedUser.id)
              .maybeSingle();

            if (freshUser) {
              setUser(freshUser);
              localStorage.setItem('sora_user', JSON.stringify(freshUser));
            } else {
              setUser(parsedUser);
            }
          } else {
            setUser(parsedUser);
          }
        } else {
          await supabase.auth.signOut();
          setUser(null);
        }
      } else {
        setUser(null);
        localStorage.removeItem('sora_user');
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        setUser(null);
        localStorage.removeItem('sora_user');
        setIsLoggingOut(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = (userData: User) => {
    setUser(userData);
    localStorage.setItem('sora_user', JSON.stringify(userData));
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      localStorage.removeItem('sora_user');
      await supabase.auth.signOut({ scope: 'local' });
      setUser(null);
    } catch (err) {
      console.error('Error during logout:', err);
      setUser(null);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleUserUpdate = useCallback((updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem('sora_user', JSON.stringify(updatedUser));
  }, []);

  if (!user || isLoggingOut) {
    return <Login onLogin={handleLogin} />;
  }

  return <KlingDashboard user={user} onLogout={handleLogout} onUserUpdate={handleUserUpdate} />;
}

export default App;
