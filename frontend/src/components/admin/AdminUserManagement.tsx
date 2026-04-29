import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { rejectDbChangeToast, resolveDbChangeToast, startDbChangeToast } from '../../lib/dbChangeToast';
import { useAuth, UserRole } from '../../modules/auth/AuthContext';

interface Profile {
  id: string;
  email: string;
  role: UserRole;
  full_name: string;
}

const ROLE_OPTIONS: UserRole[] = ['user', 'employee', 'admin', 'superadmin'];
const CREATE_ROLE_OPTIONS: UserRole[] = ['user', 'employee', 'admin'];

const canManageTargetRole = (actorRole: UserRole | null): boolean => {
  if (actorRole === 'superadmin') return true;
  return false;
};

const canAssignRole = (actorRole: UserRole | null, nextRole: UserRole): boolean => {
  if (actorRole === 'superadmin' && nextRole !== 'superadmin') return true;
  return false;
};

export const AdminUserManagement: React.FC = () => {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingNameUserId, setEditingNameUserId] = useState<string | null>(null);
  const [editingNameValue, setEditingNameValue] = useState('');
  const [savingNameId, setSavingNameId] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserFullName, setNewUserFullName] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('user');
  const [creatingUser, setCreatingUser] = useState(false);
  const { user: currentUser, role: currentRole, loading: authLoading } = useAuth();
  const canAccessUserManagement = currentRole === 'superadmin';

  const getSupabaseClient = () => {
    if (!supabase) {
      throw new Error('Supabase client is unavailable');
    }
    return supabase;
  };

  const invokeManageUser = async (body: Record<string, unknown>) => {
    if (!supabase) {
      throw new Error('Supabase client is unavailable');
    }

    const { error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;

    const accessToken = sessionData.session?.access_token;
    if (!accessToken) {
      throw new Error('Your session has expired. Please sign in again.');
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials are not configured.');
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/manage-user`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: supabaseKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const rawResponse = await response.text().catch(() => '');
    const data = rawResponse ? (() => {
      try {
        return JSON.parse(rawResponse);
      } catch {
        return { raw: rawResponse };
      }
    })() : null;

    if (!response.ok) {
      console.error('manage-user failed', {
        status: response.status,
        statusText: response.statusText,
        rawResponse,
        data,
      });
      return {
        data,
        error: new Error(data?.error ?? `Request failed with status ${response.status}`),
      };
    }

    return { data, error: null };
  };

  const fetchUsers = useCallback(async () => {
    if (!canAccessUserManagement) {
      setUsers([]);
      setLoading(false);
      return;
    }

    try {
      const client = getSupabaseClient();
      const { data, error } = await client
        .from('profiles')
        .select('id,email,role,full_name')
        .order('role', { ascending: true });
      
      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      toast.error('Error fetching users: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, [canAccessUserManagement]);

  useEffect(() => {
    if (authLoading) return;

    if (!canAccessUserManagement) {
      setUsers([]);
      setLoading(false);
      return;
    }

    void fetchUsers();
  }, [authLoading, canAccessUserManagement, fetchUsers]);

  const handleRoleChange = async (targetUser: Profile, newRole: UserRole) => {
    if (targetUser.id === currentUser?.id) {
      toast.error('You cannot change your own role while signed in.');
      return;
    }

    if (!canManageTargetRole(currentRole)) {
      toast.error('You do not have permission to modify this user.');
      return;
    }

    if (!canAssignRole(currentRole, newRole)) {
      toast.error('You do not have permission to assign this role.');
      return;
    }

    const toastId = startDbChangeToast(`Updating role to ${newRole}...`);
    try {
      const client = getSupabaseClient();
      const { error } = await client
        .from('profiles')
        .update({ role: newRole })
        .eq('id', targetUser.id);
      
      if (error) throw error;
      resolveDbChangeToast(toastId, 'Role updated successfully');
      void fetchUsers();
    } catch (error: any) {
      rejectDbChangeToast(toastId, error);
    }
  };

  const startNameEdit = (targetUser: Profile) => {
    setEditingNameUserId(targetUser.id);
    setEditingNameValue(targetUser.full_name || '');
  };

  const cancelNameEdit = () => {
    setEditingNameUserId(null);
    setEditingNameValue('');
  };

  const handleNameSave = async (targetUser: Profile) => {
    if (currentRole !== 'superadmin') {
      toast.error('Only superadmin can update user profiles.');
      return;
    }

    setSavingNameId(targetUser.id);
    const toastId = startDbChangeToast('Updating user profile...');
    try {
      const client = getSupabaseClient();
      const { error } = await client
        .from('profiles')
        .update({ full_name: editingNameValue.trim() || null })
        .eq('id', targetUser.id);

      if (error) throw error;
      resolveDbChangeToast(toastId, 'User profile updated successfully');
      cancelNameEdit();
      void fetchUsers();
    } catch (error: any) {
      rejectDbChangeToast(toastId, error);
    } finally {
      setSavingNameId(null);
    }
  };

  const handleDeleteUser = async (targetUser: Profile) => {
    if (currentRole !== 'superadmin') {
      toast.error('Only superadmin can delete users.');
      return;
    }

    if (targetUser.id === currentUser?.id) {
      toast.error('You cannot delete your current account.');
      return;
    }

    const confirmed = window.confirm(`Delete user ${targetUser.email}? This removes the auth account and profile.`);
    if (!confirmed) return;

    setDeletingUserId(targetUser.id);
    const toastId = startDbChangeToast('Deleting user profile...');
    try {
      const { data, error } = await invokeManageUser({
        action: 'delete',
        userId: targetUser.id,
        targetEmail: targetUser.email,
      });

      if (error) throw error;
      if (data?.error) throw new Error(String(data.error));

      resolveDbChangeToast(toastId, 'User deleted successfully');
      void fetchUsers();
    } catch (error: any) {
      rejectDbChangeToast(toastId, error);
    } finally {
      setDeletingUserId(null);
    }
  };

  const handleCreateUser = async () => {
    if (currentRole !== 'superadmin') {
      toast.error('Only superadmin can create users.');
      return;
    }

    const email = newUserEmail.trim();
    const password = newUserPassword.trim();
    if (!email || !password) {
      toast.error('Email and password are required.');
      return;
    }

    setCreatingUser(true);
    const toastId = startDbChangeToast(`Creating user ${email}...`);
    try {
      const { data, error } = await invokeManageUser({
        action: 'create',
        email,
        password,
        fullName: newUserFullName.trim() || null,
        role: newUserRole,
      });

      if (error) throw error;
      if (data?.error) throw new Error(String(data.error));

      resolveDbChangeToast(toastId, 'User created successfully');
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserFullName('');
      setNewUserRole('user');
      void fetchUsers();
    } catch (error: any) {
      rejectDbChangeToast(toastId, error);
    } finally {
      setCreatingUser(false);
    }
  };

  if (authLoading || (loading && canAccessUserManagement)) {
    return <div>Loading users...</div>;
  }

  if (!canAccessUserManagement) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
        <h1 className="text-xl font-black">Access restricted</h1>
        <p className="mt-2 text-sm font-medium">
          User management is available to superadmin accounts only.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">User Management</h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">Manage user profiles and roles (superadmin only).</p>
      </header>

      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-6 space-y-4">
        <h2 className="text-xs font-black uppercase tracking-widest text-slate-500">Create User</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            type="email"
            value={newUserEmail}
            onChange={(e) => setNewUserEmail(e.target.value)}
            placeholder="Email"
            className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-2.5 text-sm font-bold"
          />
          <input
            type="password"
            value={newUserPassword}
            onChange={(e) => setNewUserPassword(e.target.value)}
            placeholder="Password"
            className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-2.5 text-sm font-bold"
          />
          <input
            type="text"
            value={newUserFullName}
            onChange={(e) => setNewUserFullName(e.target.value)}
            placeholder="Full name (optional)"
            className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-2.5 text-sm font-bold"
          />
          <select
            value={newUserRole}
            onChange={(e) => setNewUserRole(e.target.value as UserRole)}
            className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-2.5 text-sm font-bold"
          >
            {CREATE_ROLE_OPTIONS.map((roleOption) => (
              <option key={roleOption} value={roleOption}>
                {roleOption === 'superadmin' ? 'SuperAdmin' : roleOption.charAt(0).toUpperCase() + roleOption.slice(1)}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={handleCreateUser}
          disabled={currentRole !== 'superadmin' || creatingUser || !newUserEmail.trim() || !newUserPassword.trim()}
          className="rounded-xl bg-slate-900 dark:bg-cyan-400 text-white dark:text-slate-950 px-4 py-2.5 text-sm font-bold disabled:opacity-50"
        >
          {creatingUser ? 'Creating...' : 'Create User'}
        </button>
      </div>

      <div className="glass-panel rounded-3xl overflow-hidden shadow-sm dark:bg-slate-900/40 dark:border-slate-800">
        <table className="w-full text-sm text-left border-separate border-spacing-y-2 px-4">
          <thead>
            <tr>
              <th className="px-6 py-4 font-black text-slate-400 dark:text-slate-500 text-[11px] uppercase tracking-widest">User</th>
              <th className="px-6 py-4 font-black text-slate-400 dark:text-slate-500 text-[11px] uppercase tracking-widest">Current Role</th>
              <th className="px-6 py-4 font-black text-slate-400 dark:text-slate-500 text-[11px] uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="bg-white/40 dark:bg-slate-800/40 hover:bg-white/60 dark:hover:bg-slate-800/60 transition-colors">
                <td className="px-6 py-4 rounded-l-2xl">
                  {editingNameUserId === user.id ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={editingNameValue}
                        onChange={(e) => setEditingNameValue(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm font-bold text-slate-900 dark:text-slate-200"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleNameSave(user)}
                          disabled={savingNameId === user.id || currentRole !== 'superadmin'}
                          className="rounded-lg bg-slate-900 dark:bg-cyan-400 text-white dark:text-slate-950 px-3 py-1 text-xs font-bold disabled:opacity-50"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={cancelNameEdit}
                          disabled={savingNameId === user.id}
                          className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1 text-xs font-bold"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="font-bold text-slate-900 dark:text-slate-200">{user.full_name || 'No Name'}</div>
                  )}
                  <div className="text-xs text-slate-400 dark:text-slate-500">{user.email}</div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                    user.role === 'superadmin' ? 'bg-red-100 text-red-700' :
                    user.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                    user.role === 'employee' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4 rounded-r-2xl text-right">
                  {user.id === currentUser?.id && (
                    <div className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-2">
                      Current account
                    </div>
                  )}
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => startNameEdit(user)}
                      disabled={currentRole !== 'superadmin' || editingNameUserId === user.id}
                      className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1 text-xs font-bold disabled:opacity-50"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteUser(user)}
                      disabled={
                        currentRole !== 'superadmin' ||
                        user.id === currentUser?.id ||
                        deletingUserId === user.id
                      }
                      className="rounded-lg border border-red-300 text-red-600 dark:border-red-700 dark:text-red-300 px-3 py-1 text-xs font-bold disabled:opacity-50"
                    >
                      Delete
                    </button>
                    <select
                      className="bg-white dark:bg-slate-800 border border-glass-border dark:border-slate-700 rounded-lg px-3 py-1 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-900 dark:text-slate-200"
                      value={user.role}
                      onChange={(e) => handleRoleChange(user, e.target.value as UserRole)}
                      disabled={
                        user.id === currentUser?.id ||
                        !canManageTargetRole(currentRole)
                      }
                    >
                      {ROLE_OPTIONS.map((roleOption) => (
                        <option
                          key={roleOption}
                          value={roleOption}
                          disabled={roleOption === 'superadmin' || !canAssignRole(currentRole, roleOption)}
                        >
                          {roleOption === 'superadmin' ? 'SuperAdmin' : roleOption.charAt(0).toUpperCase() + roleOption.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

