import React from "react";
import {
  LayoutDashboard,
  Users,
  ListOrdered,
  Server,
  Layers,
  Building2,
  Ambulance as AmbulanceIcon,
  GitCompare,
  FileText,
  Sliders,
} from "lucide-react";
import type { UserRole } from "../types";

export interface NavItem {
  id: string;
  label: string;
  icon: any;
  badge?: string | number;
  badgeColor?: string;
  allowedRoles?: UserRole[];
}

interface SidebarProps {
  activeTab: string;
  onSelectTab: (tabId: string) => void;
  waitingCount: number;
  criticalCount: number;
  activeAllocationsCount: number;
  currentRole: UserRole;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  waitingCount,
  criticalCount,
  activeAllocationsCount,
}) => {
  const navItems: NavItem[] = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    {
      id: "queue",
      label: "Priority Queue",
      icon: ListOrdered,
      badge: waitingCount > 0 ? waitingCount : undefined,
      badgeColor: criticalCount > 0 ? "bg-red-500 text-white" : "bg-blue-600 text-white",
    },
    { id: "patients", label: "Patient Intake & AI", icon: Users },
    { id: "resources", label: "Hospital Resources", icon: Server },
    {
      id: "allocations",
      label: "Allocations & Conflicts",
      icon: Layers,
      badge: activeAllocationsCount > 0 ? activeAllocationsCount : undefined,
      badgeColor: "bg-slate-700 text-slate-200",
    },
    { id: "departments", label: "Departments", icon: Building2 },
    { id: "ambulances", label: "Ambulance Fleet", icon: AmbulanceIcon },
    { id: "strategies", label: "Strategy Comparison", icon: GitCompare },
    { id: "audit", label: "Audit Log", icon: FileText },
    { id: "settings", label: "Settings & Modes", icon: Sliders },
  ];

  return (
    <aside className="w-64 bg-slate-950 border-r border-slate-800 text-slate-300 flex flex-col shrink-0">
      <div className="p-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
        Clinical Operations
      </div>

      <nav className="flex-1 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              id={`nav-${item.id}`}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition ${
                isActive
                  ? "bg-blue-600 text-white shadow-sm font-semibold"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-400"}`} />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    item.badgeColor || "bg-slate-800 text-slate-300"
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="p-3 border-t border-slate-900 text-[11px] text-slate-400">
        <div className="font-semibold text-slate-300">Deterministic Engine</div>
        <div className="mt-0.5 text-[10px] text-slate-400">
          Transparent clinical scoring with anti-starvation aging.
        </div>
      </div>
    </aside>
  );
};
