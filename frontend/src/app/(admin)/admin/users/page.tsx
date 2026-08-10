"use client";

import { Users, Search, ShieldCheck, UserCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAdminUsers } from "@/hooks/features/use-admin-users";
import { useUser } from "@/hooks/features/use-user";
import { useModalA11y } from "@/hooks/common/use-modal-a11y";

export default function AdminUsersPage() {
  const { role } = useUser();
  const {
    users,
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
  } = useAdminUsers();
  const closeModalRef = useModalA11y(!!selectedUser, () => setSelectedUser(null));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Users className="text-orange-500" size={28} />
            Quản Lý Người Dùng & Vai Trò
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Phân quyền vai trò (Superadmin, Admin, Employee, User) và quản lý tài khoản người dùng
          </p>
        </div>
      </div>

      {/* Search Input */}
      <div className="flex items-center gap-3 bg-slate-900 p-4 rounded-2xl border border-slate-800">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm kiếm người dùng theo email, tên, vai trò..."
            aria-label="Tìm kiếm người dùng"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="p-4">Người Dùng</th>
                <th className="p-4">Email</th>
                <th className="p-4">Vai Trò (Role)</th>
                <th className="p-4">Ngày Tham Gia</th>
                <th className="p-4 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {users.length > 0 ? (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-4 font-bold text-white flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-orange-500/20 text-orange-400 font-bold flex items-center justify-center border border-orange-500/30">
                        {u.full_name ? u.full_name[0].toUpperCase() : u.email ? u.email[0].toUpperCase() : "U"}
                      </div>
                      <span>{u.full_name || "Chưa cập nhật tên"}</span>
                    </td>
                    <td className="p-4 font-mono text-slate-300">{u.email || "-"}</td>
                    <td className="p-4">
                      <Badge
                        variant={
                          u.role === "superadmin"
                            ? "danger"
                            : u.role === "admin"
                            ? "warning"
                            : u.role === "employee"
                            ? "success"
                            : "default"
                        }
                      >
                        {u.role || "user"}
                      </Badge>
                    </td>
                    <td className="p-4 text-slate-400">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString("vi-VN") : "-"}
                    </td>
                    <td className="p-4 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenRoleModal(u)}
                        className="gap-1 text-xs"
                      >
                        <UserCheck size={14} /> Phân Quyền
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">
                    {loading ? "Đang tải danh sách người dùng..." : "Không tìm thấy người dùng phù hợp."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Change Role Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <ShieldCheck size={20} className="text-orange-500" />
                Phân Quyền Cho Người Dùng
              </h2>
              <button ref={closeModalRef} onClick={() => setSelectedUser(null)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveRole} className="space-y-4">
              <div>
                <p className="text-xs text-slate-400">Tài khoản:</p>
                <p className="text-sm font-bold text-white mt-0.5">{selectedUser.email || selectedUser.full_name}</p>
              </div>

              <div>
                <label htmlFor="user-role" className="block text-xs font-semibold text-slate-300 mb-1">Chọn Vai Trò Mới *</label>
                <select
                  id="user-role"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-orange-500"
                >
                  <option value="user">Người dùng (User)</option>
                  <option value="employee">Nhân viên (Employee)</option>
                  <option value="admin">Quản trị viên (Admin)</option>
                  {role === "superadmin" && <option value="superadmin">Super Admin</option>}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setSelectedUser(null)}>
                  Hủy
                </Button>
                <Button type="submit" disabled={isSubmitting} className="bg-orange-500 hover:bg-orange-600 font-bold">
                  {isSubmitting ? "Đang lưu..." : "Cập Nhật Vai Trò"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
