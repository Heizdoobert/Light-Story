import React, { useEffect, useState } from 'react';
import { supabase } from '../core/supabase';
import { toast } from 'sonner';
import { motion } from 'motion/react';
import { rejectDbChangeToast, resolveDbChangeToast, startDbChangeToast } from '../lib/dbChangeToast';

interface Profile {
  id: string;
  email: string;
  role: string;
  full_name: string;
}

export const AdminUserManagement: React.FC = () => {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase!
        .from('profiles')
        .select('*')
        .order('role', { ascending: true });
      
      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      toast.error('Error fetching users: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async (userId: string, newRole: string) => {
    const toastId = startDbChangeToast(`Updating role to ${newRole}...`);
    try {
      const { error } = await supabase!
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);
      
      if (error) throw error;
      resolveDbChangeToast(toastId, 'Role updated successfully');
      fetchUsers();
    } catch (error: any) {
      rejectDbChangeToast(toastId, error);
    }
  };

  if (loading) return <div>Loading users...</div>;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">User Management</h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">Manage system roles and permissions</p>
      </header>

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
                  <div className="font-bold text-slate-900 dark:text-slate-200">{user.full_name || 'No Name'}</div>
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
                  <select 
                    className="bg-white dark:bg-slate-800 border border-glass-border dark:border-slate-700 rounded-lg px-3 py-1 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-900 dark:text-slate-200"
                    value={user.role}
                    onChange={(e) => handleRoleChange(user.id, e.target.value)}
                  >
                    <option value="user">User</option>
                    <option value="employee">Employee</option>
                    <option value="admin">Admin</option>
                    <option value="superadmin">SuperAdmin</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
