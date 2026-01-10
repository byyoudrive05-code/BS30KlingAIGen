import { useState } from 'react';
import { LogIn } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { User } from '../types';

interface LoginProps {
  onLogin: (user: User) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      console.log('Starting login for username:', username);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/auth-login`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ username }),
        }
      );

      const result = await response.json();
      console.log('Auth-login response:', { ok: response.ok, status: response.status });

      if (!response.ok) {
        setError(result.error || 'Username tidak ditemukan');
        setLoading(false);
        return;
      }

      console.log('Attempting signInWithPassword with email:', result.email);

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: result.email,
        password: result.password,
      });

      if (authError) {
        console.error('SignIn error:', authError);
        setError(`Gagal melakukan autentikasi: ${authError.message}`);
        setLoading(false);
        return;
      }

      console.log('Auth successful, user:', authData.user?.id);

      // Fetch updated user data with auth_id
      const { data: updatedUser, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .maybeSingle();

      if (fetchError || !updatedUser) {
        console.error('Error fetching updated user:', fetchError);
        onLogin(result.user);
      } else {
        console.log('Using updated user data with auth_id:', updatedUser.auth_id);
        onLogin(updatedUser);
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Terjadi kesalahan, silakan coba lagi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="flex justify-center mb-6">
          <div className="bg-blue-600 p-4 rounded-full">
            <LogIn className="w-8 h-8 text-white" />
          </div>
        </div>

        <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">
          Kling AI Generator
        </h1>
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">
          - BS30 -
        </h1>
        <p className="text-center text-gray-600 mb-8">
          Masukkan username untuk melanjutkan
        </p>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Masukkan username"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Memuat...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}
