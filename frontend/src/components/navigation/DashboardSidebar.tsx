import React from "react";
import { motion } from "motion/react";
import { useAuth } from "../../modules/auth/AuthContext";

interface SidebarItem {
  id: string;
  label: string;
  icon: string;
  roles: string[];
}

const menuItems: SidebarItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: "📊",
    roles: ["superadmin", "admin", "employee"],
  },
  { id: "users", label: "User Management", icon: "👥", roles: ["superadmin", "admin"] },
  {
    id: "stories",
    label: "Story Management",
    icon: "📚",
    roles: ["superadmin", "admin", "employee"],
  },
  {
    id: "create_story",
    label: "Create New Story",
    icon: "✍️",
    roles: ["superadmin", "admin", "employee"],
  },
  {
    id: "create_chapter",
    label: "Add Chapter",
    icon: "📝",
    roles: ["superadmin", "admin", "employee"],
  },
  {
    id: "ads",
    label: "Ad Network",
    icon: "💰",
    roles: ["superadmin", "admin"],
  },
  { id: "settings", label: "Site Settings", icon: "⚙️", roles: ["superadmin"] },
];

export const DashboardSidebar: React.FC<{
  activeTab: string;
  onTabChange: (id: string) => void;
}> = ({ activeTab, onTabChange }) => {
  const { role } = useAuth();

  const bounceClick = {
    whileTap: { scale: 0.95 },
    whileHover: { scale: 1.02 },
  };

  const filteredMenu = menuItems.filter(
    (item) => role && item.roles.includes(role),
  );

  return (
    <aside className="w-72 glass-panel flex flex-col p-6 border-r border-white/40">
      <div className="font-extrabold text-2xl text-primary tracking-tight mb-10 px-3">
        LightStory
      </div>

      <nav className="space-y-6 flex-1">
        <div>
          <div className="text-[11px] uppercase font-bold text-text-muted mb-4 px-3 tracking-widest">
            Platform
          </div>
          <div className="space-y-1">
            {filteredMenu.map((item) => (
              <motion.button
                key={item.id}
                {...bounceClick}
                onClick={() => onTabChange(item.id)}
                className={`flex items-center w-full px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === item.id
                    ? "bg-slate-900 text-slate-50 shadow-lg shadow-slate-950/20 dark:bg-slate-800 dark:text-white dark:shadow-black/25"
                    : "text-text-main dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-800"
                }`}
              >
                <span className="mr-3 text-lg">{item.icon}</span>
                {item.label}
              </motion.button>
            ))}
          </div>
        </div>

        {["superadmin", "admin", "employee"].includes(role || "") && (
          <div className="pt-6 border-t border-white/40">
            <motion.button
              {...bounceClick}
              onClick={() => onTabChange("create_chapter")}
              className="w-full bg-text-main text-white py-4 rounded-2xl font-bold text-sm shadow-xl shadow-black/10 flex items-center justify-center gap-2"
            >
              <span className="text-xl">+</span>
              Add Chapter
            </motion.button>
          </div>
        )}
      </nav>
    </aside>
  );
};
