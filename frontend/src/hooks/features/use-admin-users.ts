"use client";

import { useEffect, useState, useCallback } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { updateUserRole } from "@/lib/actions/user.actions";

export interface UserRow {
  id: string;
  email?: string;
  full_name?: string;
  avatar_url?: string;
  role: string;
  created_at?: string;
}

export function useAdminUsers() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Role Edit Modal
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [newRole, setNewRole] = useState<string>("user");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase
        .from("profiles")
        .select("id, email, full_name, avatar_url, role, created_at")
        .order("created_at", { ascending: false });

      if (data) {
        setUsers(data as UserRow[]);
      }
    } catch (err) {
      console.error("Failed to load admin users:", err);
      toast.error("Không thể tải danh sách người dùng");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleOpenRoleModal = (user: UserRow) => {
    setSelectedUser(user);
    setNewRole(user.role || "user");
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    setIsSubmitting(true);
    try {
      const actionRes = await updateUserRole(selectedUser.id, newRole);
      if (actionRes.success === false) {
        toast.error(actionRes.error || "Không thể cập nhật vai trò");
        return;
      }

      toast.success(`Đã cập nhật vai trò người dùng thành "${newRole}"`);
      setSelectedUser(null);
      loadUsers();
    } catch (err) {
      toast.error((err as Error).message || "Cập nhật vai trò thất bại");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const query = search.toLowerCase();
    return (
      (u.email && u.email.toLowerCase().includes(query)) ||
      (u.full_name && u.full_name.toLowerCase().includes(query)) ||
      u.role.toLowerCase().includes(query)
    );
  });

  return {
    users: filteredUsers,
    loading,
    search,
    setSearch,
    selectedUser,
    setSelectedUser,
    newRole,
    setNewRole,
    isSubmitting,
    handleOpenRoleModal,
    handleSaveRole,
  };
}
