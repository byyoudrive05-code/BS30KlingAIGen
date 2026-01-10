import { useState, useEffect } from 'react';
import { X, Plus, Edit2, Trash2, Save, Coins, DollarSign, Eye, EyeOff, Video } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { User, CreditPricing, ApiKey } from '../types';

interface ModelAccess {
  id: string;
  user_id: string;
  model_version: string;
  variant: string;
  is_enabled: boolean;
}

interface AdminPanelProps {
  onClose: () => void;
  currentUser: User;
}

interface UserWithTotalCredits extends User {
  totalCredits: number;
}

export default function AdminPanel({ onClose, currentUser }: AdminPanelProps) {
  const [users, setUsers] = useState<UserWithTotalCredits[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<Partial<User> | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editingCredit, setEditingCredit] = useState<{ userId: string; amount: number } | null>(null);
  const [pricing, setPricing] = useState<CreditPricing[]>([]);
  const [editingPrice, setEditingPrice] = useState<{ id: string; price: number } | null>(null);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [showApiKey, setShowApiKey] = useState<string | null>(null);
  const [newApiKey, setNewApiKey] = useState<Partial<ApiKey> | null>(null);
  const [editingApiKey, setEditingApiKey] = useState<ApiKey | null>(null);
  const [modelAccess, setModelAccess] = useState<ModelAccess[]>([]);
  const [selectedPricingRole, setSelectedPricingRole] = useState<'user' | 'premium' | 'admin'>('user');

  const availableModels = [
    { version: 'v2.6', variant: 'text-to-video' },
    { version: 'v2.6', variant: 'image-to-video' },
    { version: 'v2.6', variant: 'motion-control-standard' },
    { version: 'v2.6', variant: 'motion-control-pro' },
    { version: 'v2.5-turbo', variant: 'text-to-video-pro' },
    { version: 'v2.5-turbo', variant: 'image-to-video-standard' },
    { version: 'v2.5-turbo', variant: 'image-to-video-pro' },
    { version: 'v2.1', variant: 'image-to-video-standard' },
    { version: 'v2.1', variant: 'image-to-video-pro' },
  ];

  useEffect(() => {
    checkAuthStatus();
    loadUsers();
    loadPricing();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        alert('Sesi autentikasi tidak ditemukan. Silakan login ulang.');
        return;
      }

      const { data: appUser } = await supabase
        .from('users')
        .select('auth_id, is_admin')
        .eq('auth_id', authUser.id)
        .maybeSingle();

      if (!appUser) {
        alert('User tidak memiliki auth_id yang valid. Silakan logout dan login ulang untuk mendapatkan akses penuh.');
      }
    } catch (err) {
      console.error('Error checking auth status:', err);
    }
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (usersError) {
        console.error('Error loading users:', usersError);
        setUsers([]);
        setLoading(false);
        return;
      }

      if (!usersData) {
        console.error('No users data returned');
        setUsers([]);
        setLoading(false);
        return;
      }

      const usersWithTotalCredits = await Promise.all(
        usersData.map(async (user) => {
          try {
            const { data: apiKeysData } = await supabase
              .from('api_keys')
              .select('credits')
              .eq('user_id', user.id)
              .eq('is_active', true);

            const apiKeysCredits = apiKeysData?.reduce((sum, key) => sum + Number(key.credits), 0) || 0;
            const totalCredits = Number(user.credits) + apiKeysCredits;

            return {
              ...user,
              totalCredits,
            };
          } catch (err) {
            console.error('Error loading API keys for user:', user.id, err);
            return {
              ...user,
              totalCredits: Number(user.credits),
            };
          }
        })
      );

      setUsers(usersWithTotalCredits);
    } catch (err) {
      console.error('Error loading users:', err);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const loadPricing = async () => {
    try {
      const { data, error } = await supabase
        .from('credit_pricing')
        .select('*, role')
        .order('model_version', { ascending: false });

      if (error) {
        console.error('Error loading pricing:', error);
        setPricing([]);
      } else if (data) {
        setPricing(data);
      }
    } catch (err) {
      console.error('Error loading pricing:', err);
      setPricing([]);
    }
  };

  const loadApiKeys = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('api_keys')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setApiKeys(data);
      }
    } catch (err) {
      console.error('Error loading API keys:', err);
    }
  };

  const handleCreate = () => {
    setIsCreating(true);
    setEditingUser({
      username: '',
      api_key: '',
      is_admin: false,
      credits: 0,
      role: 'user',
    });
    setApiKeys([]);
    setModelAccess([]);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setIsCreating(false);
    loadApiKeys(user.id);
    loadModelAccess(user.id);
  };

  const loadModelAccess = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('model_access')
        .select('*')
        .eq('user_id', userId);

      if (!error && data) {
        setModelAccess(data);
      } else {
        setModelAccess([]);
      }
    } catch (err) {
      console.error('Error loading model access:', err);
      setModelAccess([]);
    }
  };

  const handleSave = async () => {
    if (!editingUser) return;

    try {
      if (isCreating) {
        const { error } = await supabase
          .from('users')
          .insert({
            username: editingUser.username,
            api_key: editingUser.api_key,
            is_admin: editingUser.role === 'admin',
            credits: editingUser.credits || 0,
            role: editingUser.role || 'user',
          });

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('users')
          .update({
            username: editingUser.username,
            api_key: editingUser.api_key,
            is_admin: editingUser.role === 'admin',
            credits: editingUser.credits,
            role: editingUser.role,
          })
          .eq('id', editingUser.id);

        if (error) throw error;
      }

      await loadUsers();
      setEditingUser(null);
      setIsCreating(false);
      setApiKeys([]);
      setModelAccess([]);
    } catch (err) {
      console.error('Error saving user:', err);
      alert('Gagal menyimpan user');
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('Yakin ingin menghapus user ini?')) return;

    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (error) throw error;
      await loadUsers();
    } catch (err) {
      console.error('Error deleting user:', err);
      alert('Gagal menghapus user');
    }
  };

  const handleQuickCreditEdit = async (userId: string, newAmount: number) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ credits: newAmount })
        .eq('id', userId);

      if (error) throw error;
      await loadUsers();
      setEditingCredit(null);
    } catch (err) {
      console.error('Error updating credits:', err);
      alert('Gagal mengubah kredit');
    }
  };

  const handlePriceUpdate = async (id: string, newPrice: number) => {
    try {
      const { error } = await supabase
        .from('credit_pricing')
        .update({ price: newPrice, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      await loadPricing();
      setEditingPrice(null);
    } catch (err) {
      console.error('Error updating price:', err);
      alert('Gagal mengubah harga');
    }
  };

  const handleAddApiKey = () => {
    setNewApiKey({
      api_key: '',
      credits: 0,
      is_active: true,
    });
  };

  const handleSaveApiKey = async () => {
    if (!newApiKey || !editingUser?.id || !newApiKey.api_key) return;

    try {
      const { error } = await supabase
        .from('api_keys')
        .insert({
          user_id: editingUser.id,
          api_key: newApiKey.api_key,
          credits: newApiKey.credits || 0,
          is_active: newApiKey.is_active ?? true,
        });

      if (error) throw error;
      await loadApiKeys(editingUser.id);
      await loadUsers();
      setNewApiKey(null);
    } catch (err) {
      console.error('Error saving API key:', err);
      alert('Gagal menyimpan API key');
    }
  };

  const handleUpdateApiKeyCredits = async (keyId: string, newCredits: number) => {
    try {
      const { error } = await supabase
        .from('api_keys')
        .update({ credits: newCredits })
        .eq('id', keyId);

      if (error) throw error;
      if (editingUser?.id) {
        await loadApiKeys(editingUser.id);
        await loadUsers();
      }
    } catch (err) {
      console.error('Error updating API key credits:', err);
      alert('Gagal mengubah kredit API key');
    }
  };

  const handleToggleApiKeyStatus = async (keyId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('api_keys')
        .update({ is_active: !isActive })
        .eq('id', keyId);

      if (error) throw error;
      if (editingUser?.id) {
        await loadApiKeys(editingUser.id);
        await loadUsers();
      }
    } catch (err) {
      console.error('Error toggling API key status:', err);
      alert('Gagal mengubah status API key');
    }
  };

  const handleDeleteApiKey = async (keyId: string) => {
    if (!confirm('Yakin ingin menghapus API key ini?')) return;

    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      console.log('Current auth user:', authUser?.id);

      const { error } = await supabase
        .from('api_keys')
        .delete()
        .eq('id', keyId);

      if (error) {
        console.error('Delete error details:', error);
        alert(`Gagal menghapus API key: ${error.message}\n\nSilakan logout dan login ulang jika masalah berlanjut.`);
        return;
      }

      if (editingUser?.id) {
        await loadApiKeys(editingUser.id);
        await loadUsers();
      }
    } catch (err) {
      console.error('Error deleting API key:', err);
      alert('Gagal menghapus API key');
    }
  };

  const handleEditApiKey = (key: ApiKey) => {
    setEditingApiKey({ ...key });
  };

  const handleUpdateApiKey = async () => {
    if (!editingApiKey) return;

    try {
      const { error } = await supabase
        .from('api_keys')
        .update({
          api_key: editingApiKey.api_key,
          credits: editingApiKey.credits,
          is_active: editingApiKey.is_active,
        })
        .eq('id', editingApiKey.id);

      if (error) {
        console.error('Update error details:', error);
        alert(`Gagal mengubah API key: ${error.message}\n\nSilakan logout dan login ulang jika masalah berlanjut.`);
        return;
      }

      if (editingUser?.id) {
        await loadApiKeys(editingUser.id);
        await loadUsers();
      }
      setEditingApiKey(null);
    } catch (err) {
      console.error('Error updating API key:', err);
      alert('Gagal mengubah API key');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-slate-800 to-slate-700 p-4 sm:p-6 flex justify-between items-center">
          <h2 className="text-lg sm:text-2xl font-bold text-white">Admin Panel</h2>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-full transition-colors"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        <div className="p-3 sm:p-6 overflow-y-auto flex-1">
          <div className="mb-4 sm:mb-6 bg-yellow-50 border border-yellow-200 rounded-xl p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="w-5 h-5 text-yellow-600" />
              <h3 className="text-base sm:text-lg font-semibold text-gray-800">Harga Kredit Kling AI</h3>
            </div>
            <div className="flex gap-2 mb-4">
              {['user', 'premium', 'admin'].map((role) => (
                <button
                  key={role}
                  onClick={() => setSelectedPricingRole(role as 'user' | 'premium' | 'admin')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    selectedPricingRole === role
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {role.charAt(0).toUpperCase() + role.slice(1)}
                </button>
              ))}
            </div>
            <div className="max-h-96 overflow-y-auto space-y-3">
              {pricing.filter(item => item.role === selectedPricingRole).map((item) => (
                <div key={item.id} className="bg-white border border-yellow-300 rounded-lg p-3">
                  <div className="text-xs text-gray-600 mb-1">
                    {item.model_version} - {item.variant}
                    {!item.is_per_second && ` - ${item.duration} detik`}
                    {item.audio_enabled !== null && ` - Audio: ${item.audio_enabled ? 'On' : 'Off'}`}
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ml-2 ${
                      item.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                      item.role === 'premium' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {item.role}
                    </span>
                  </div>
                  {editingPrice?.id === item.id ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step="0.001"
                        value={editingPrice.price}
                        onChange={(e) => setEditingPrice({ id: item.id, price: parseFloat(e.target.value) || 0 })}
                        className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                        autoFocus
                      />
                      <span className="text-xs">{item.is_per_second ? 'credits/sec' : 'credits'}</span>
                      <button
                        onClick={() => handlePriceUpdate(item.id, editingPrice.price)}
                        className="text-green-600 hover:text-green-800 ml-1"
                        title="Simpan"
                      >
                        <Save className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEditingPrice(null)}
                        className="text-red-600 hover:text-red-800"
                        title="Batal"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-gray-800">{item.price}</span>
                      <span className="text-xs text-gray-600">{item.is_per_second ? 'credits/sec' : 'credits'}</span>
                      <button
                        onClick={() => setEditingPrice({ id: item.id, price: item.price })}
                        className="text-blue-600 hover:text-blue-800 ml-auto"
                        title="Edit Harga"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="mb-4 sm:mb-6">
            <button
              onClick={handleCreate}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm sm:text-base"
            >
              <Plus className="w-4 h-4" />
              Tambah User
            </button>
          </div>

          {editingUser && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 sm:p-6 mb-4 sm:mb-6">
              <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">
                {isCreating ? 'Buat User Baru' : 'Edit User'}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                    Username
                  </label>
                  <input
                    type="text"
                    value={editingUser.username || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                    API Key
                  </label>
                  <input
                    type="text"
                    value={editingUser.api_key || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, api_key: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                    Credits
                  </label>
                  <input
                    type="number"
                    value={editingUser.credits || 0}
                    onChange={(e) => setEditingUser({ ...editingUser, credits: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                    Role
                  </label>
                  <select
                    value={editingUser.role || 'user'}
                    onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="user">User</option>
                    <option value="premium">Premium User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>

              {!isCreating && editingUser.id && editingUser.role === 'user' && (
                <div className="mt-6 border-t border-blue-200 pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-base font-semibold text-gray-800">Model Access Control</h4>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 mb-6">
                    <p className="text-xs text-gray-600 mb-3">
                      Enable/Disable model akses untuk user ini. Model yang dinonaktifkan tidak akan muncul di dashboard user.
                    </p>
                    <div className="grid grid-cols-1 gap-2">
                      {availableModels.map((model) => {
                        const access = modelAccess.find(
                          (a) => a.model_version === model.version && a.variant === model.variant
                        );
                        const isEnabled = access ? access.is_enabled : true;

                        return (
                          <div
                            key={`${model.version}-${model.variant}`}
                            className={`flex items-center justify-between p-3 rounded-lg border ${
                              isEnabled ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <Video className="w-4 h-4 text-gray-600" />
                              <span className="text-sm font-medium">
                                {model.version} - {model.variant}
                              </span>
                            </div>
                            <button
                              onClick={async () => {
                                try {
                                  if (access) {
                                    await supabase
                                      .from('model_access')
                                      .update({ is_enabled: !isEnabled })
                                      .eq('id', access.id);
                                  } else {
                                    await supabase
                                      .from('model_access')
                                      .insert({
                                        user_id: editingUser.id,
                                        model_version: model.version,
                                        variant: model.variant,
                                        is_enabled: false,
                                      });
                                  }
                                  await loadModelAccess(editingUser.id!);
                                } catch (err) {
                                  console.error('Error toggling model access:', err);
                                  alert('Gagal mengubah akses model');
                                }
                              }}
                              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                                isEnabled
                                  ? 'bg-red-600 hover:bg-red-700 text-white'
                                  : 'bg-green-600 hover:bg-green-700 text-white'
                              }`}
                            >
                              {isEnabled ? 'Disable' : 'Enable'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {!isCreating && editingUser.id && (
                <div className="mt-6 border-t border-blue-200 pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-base font-semibold text-gray-800">API Keys</h4>
                    <button
                      onClick={handleAddApiKey}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg flex items-center gap-2 transition-colors text-sm"
                    >
                      <Plus className="w-4 h-4" />
                      Tambah API Key
                    </button>
                  </div>

                  {newApiKey && (
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
                      <h5 className="text-sm font-semibold mb-3">Tambah API Key Baru</h5>
                      <div className="grid grid-cols-1 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            API Key
                          </label>
                          <input
                            type="text"
                            value={newApiKey.api_key || ''}
                            onChange={(e) => setNewApiKey({ ...newApiKey, api_key: e.target.value })}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                            placeholder="Paste API key here..."
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Credits
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            value={newApiKey.credits || 0}
                            onChange={(e) => setNewApiKey({ ...newApiKey, credits: parseFloat(e.target.value) || 0 })}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                        <div className="flex items-center">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={newApiKey.is_active ?? true}
                              onChange={(e) => setNewApiKey({ ...newApiKey, is_active: e.target.checked })}
                              className="w-4 h-4 text-purple-600 focus:ring-purple-500 rounded"
                            />
                            <span className="text-xs font-medium text-gray-700">Active</span>
                          </label>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={handleSaveApiKey}
                          className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg flex items-center gap-2 transition-colors text-sm"
                        >
                          <Save className="w-4 h-4" />
                          Simpan
                        </button>
                        <button
                          onClick={() => setNewApiKey(null)}
                          className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-3 py-1.5 rounded-lg transition-colors text-sm"
                        >
                          Batal
                        </button>
                      </div>
                    </div>
                  )}

                  {apiKeys.length === 0 ? (
                    <div className="text-center py-6 text-gray-500 text-sm">
                      Belum ada API key untuk user ini
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {apiKeys.map((key) => (
                        <div key={key.id}>
                          {editingApiKey?.id === key.id ? (
                            <div className="border border-blue-300 bg-blue-50 rounded-lg p-4">
                              <h5 className="text-sm font-semibold mb-3">Edit API Key</h5>
                              <div className="grid grid-cols-1 gap-3">
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">
                                    API Key
                                  </label>
                                  <input
                                    type="text"
                                    value={editingApiKey.api_key}
                                    onChange={(e) => setEditingApiKey({ ...editingApiKey, api_key: e.target.value })}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Credits
                                  </label>
                                  <input
                                    type="number"
                                    step="0.1"
                                    value={editingApiKey.credits}
                                    onChange={(e) => setEditingApiKey({ ...editingApiKey, credits: parseFloat(e.target.value) || 0 })}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                  />
                                </div>
                                <div className="flex items-center">
                                  <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={editingApiKey.is_active}
                                      onChange={(e) => setEditingApiKey({ ...editingApiKey, is_active: e.target.checked })}
                                      className="w-4 h-4 text-blue-600 focus:ring-blue-500 rounded"
                                    />
                                    <span className="text-xs font-medium text-gray-700">Active</span>
                                  </label>
                                </div>
                              </div>
                              <div className="flex gap-2 mt-3">
                                <button
                                  onClick={handleUpdateApiKey}
                                  className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg flex items-center gap-2 transition-colors text-sm"
                                >
                                  <Save className="w-4 h-4" />
                                  Update
                                </button>
                                <button
                                  onClick={() => setEditingApiKey(null)}
                                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-3 py-1.5 rounded-lg transition-colors text-sm"
                                >
                                  Batal
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div
                              className={`border rounded-lg p-3 ${
                                key.is_active ? 'border-green-300 bg-green-50' : 'border-gray-300 bg-gray-50'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                      key.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                    }`}>
                                      {key.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 mb-2">
                                    <code className="text-xs font-mono bg-white px-2 py-1 rounded border border-gray-300 truncate max-w-[200px]">
                                      {showApiKey === key.id ? key.api_key : `${key.api_key.substring(0, 20)}...`}
                                    </code>
                                    <button
                                      onClick={() => setShowApiKey(showApiKey === key.id ? null : key.id)}
                                      className="text-gray-600 hover:text-gray-800"
                                      title={showApiKey === key.id ? 'Hide' : 'Show'}
                                    >
                                      {showApiKey === key.id ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                    </button>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-700">Credits: {key.credits.toFixed(1)}</span>
                                  </div>
                                </div>
                                <div className="flex flex-col gap-1">
                                  <button
                                    onClick={() => handleEditApiKey(key)}
                                    className="text-blue-600 hover:text-blue-800 transition-colors p-1"
                                    title="Edit"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => handleToggleApiKeyStatus(key.id, key.is_active)}
                                    className={`px-2 py-1 rounded text-xs font-semibold transition-colors whitespace-nowrap ${
                                      key.is_active
                                        ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                                        : 'bg-green-600 hover:bg-green-700 text-white'
                                    }`}
                                    title={key.is_active ? 'Disable' : 'Enable'}
                                  >
                                    {key.is_active ? 'Disable' : 'Enable'}
                                  </button>
                                  <button
                                    onClick={() => handleDeleteApiKey(key.id)}
                                    className="text-red-600 hover:text-red-800 transition-colors p-1"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                              <div className="text-xs text-gray-500 mt-2">
                                Dibuat: {new Date(key.created_at).toLocaleString('id-ID')}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2 mt-4">
                <button
                  onClick={handleSave}
                  className="bg-green-600 hover:bg-green-700 text-white px-3 sm:px-4 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm"
                >
                  <Save className="w-4 h-4" />
                  Simpan
                </button>
                <button
                  onClick={() => {
                    setEditingUser(null);
                    setIsCreating(false);
                    setApiKeys([]);
                    setNewApiKey(null);
                    setEditingApiKey(null);
                    setModelAccess([]);
                  }}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-3 sm:px-4 py-2 rounded-lg transition-colors text-sm"
                >
                  Batal
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="text-center py-8 text-sm">Loading...</div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">Username</th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">API Key</th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">Credits</th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">Role</th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm">{user.username}</td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs font-mono">
                        {user.api_key.substring(0, 15)}...
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm">
                        {editingCredit?.userId === user.id ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              step="0.1"
                              value={editingCredit.amount}
                              onChange={(e) => setEditingCredit({ userId: user.id, amount: parseFloat(e.target.value) || 0 })}
                              className="w-16 px-1 py-0.5 border border-gray-300 rounded text-xs"
                              autoFocus
                            />
                            <button
                              onClick={() => handleQuickCreditEdit(user.id, editingCredit.amount)}
                              className="text-green-600 hover:text-green-800"
                              title="Simpan"
                            >
                              <Save className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => setEditingCredit(null)}
                              className="text-red-600 hover:text-red-800"
                              title="Batal"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-1">
                              <span className="font-semibold">{user.totalCredits.toFixed(1)}</span>
                              <button
                                onClick={() => setEditingCredit({ userId: user.id, amount: user.credits })}
                                className="text-blue-600 hover:text-blue-800"
                                title="Edit Kredit User"
                              >
                                <Coins className="w-3 h-3" />
                              </button>
                            </div>
                            <div className="text-xs text-gray-500">
                              User: {user.credits.toFixed(1)} | API Keys: {(user.totalCredits - user.credits).toFixed(1)}
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm">
                        {user.role === 'admin' ? (
                          <span className="bg-red-100 text-red-800 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-xs font-semibold">
                            Admin
                          </span>
                        ) : user.role === 'premium' ? (
                          <span className="bg-purple-100 text-purple-800 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-xs font-semibold">
                            Premium
                          </span>
                        ) : (
                          <span className="bg-gray-100 text-gray-800 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-xs font-semibold">
                            User
                          </span>
                        )}
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm">
                        <div className="flex gap-1 sm:gap-2">
                          <button
                            onClick={() => handleEdit(user)}
                            className="text-blue-600 hover:text-blue-800 transition-colors"
                            title="Edit User"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(user.id)}
                            disabled={user.id === currentUser.id}
                            className="text-red-600 hover:text-red-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Delete User"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
