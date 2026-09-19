import React, { useState } from "react";
import {
  LayoutDashboard,
  Users,
  ListOrdered,
  Server,
  Layers,
  Building2,
  Ambulance as AmbulanceIcon,
  LineChart,
  GitCompare,
  FileText,
  Sliders,
  HelpCircle,
  X,
  HeartPulse,
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
  currentUserName?: string;
  onOpenLanding?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  waitingCount,
  criticalCount,
  activeAllocationsCount,
  currentRole,
  currentUserName = "Nurse Anitha Rao, GNM RN",
  onOpenLanding,
}) => {
  const [showHelp, setShowHelp] = useState(false);

  const navItems: NavItem[] = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    {
      id: "queue",
      label: "Priority Queue",
      icon: ListOrdered,
      badge: waitingCount > 0 ? waitingCount : undefined,
      badgeColor: criticalCount > 0 ? "bg-[#DC2626] text-white" : "bg-[#1976D2] text-white",
    },
    { id: "patients", label: "Patients", icon: Users },
    { id: "resources", label: "Resources", icon: Server },
    {
      id: "allocations",
      label: "Allocations",
      icon: Layers,
      badge: activeAllocationsCount > 0 ? activeAllocationsCount : undefined,
      badgeColor: "bg-[#64748B] text-white",
    },
    { id: "departments", label: "Departments", icon: Building2 },
    { id: "ambulances", label: "Ambulances", icon: AmbulanceIcon },
    { id: "analytics", label: "Analytics", icon: LineChart },
    { id: "strategies", label: "Strategy Comparison", icon: GitCompare },
    { id: "audit", label: "Audit Log", icon: FileText },
  ];

  return (
    <aside className="w-64 bg-white border-r border-[#E2E8F0] text-[#243447] flex flex-col shrink-0">
      {/* Top Sidebar Header with MEDFLOW Logo & Tagline */}
      <div className="p-4 border-b border-[#E2E8F0]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#1976D2] text-white flex items-center justify-center font-bold shadow-xs">
            <HeartPulse className="w-4 h-4" />
          </div>
          <div>
            <div className="text-base font-bold tracking-tight text-[#1976D2] font-heading leading-tight">
              MEDFLOW
            </div>
            <div className="text-[11px] text-[#64748B] font-medium leading-none">
              Hospital Operations
            </div>
          </div>
        </div>
        <div className="mt-2 text-[10px] text-[#64748B] font-medium uppercase tracking-wider">
          Prioritize Patients • Optimize Resources
        </div>
      </div>

      {/* Navigation Links */}
      <div className="px-3 pt-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-[#94A3B8]">
        Hospital Navigation
      </div>

      <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto">
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
                  ? "bg-[#EAF4FF] text-[#1976D2] font-semibold"
                  : "text-[#64748B] hover:text-[#243447] hover:bg-[#F8FAFC]"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon
                  className={`w-4 h-4 ${isActive ? "text-[#1976D2]" : "text-[#64748B]"}`}
                />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    item.badgeColor || "bg-[#E2E8F0] text-[#475569]"
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom Controls: Settings, Help, User Profile */}
      <div className="p-2 border-t border-[#E2E8F0] space-y-0.5 bg-[#F8FAFC]">
        <button
          id="nav-settings"
          onClick={() => onSelectTab("settings")}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition ${
            activeTab === "settings"
              ? "bg-[#EAF4FF] text-[#1976D2] font-semibold"
              : "text-[#64748B] hover:text-[#243447] hover:bg-white"
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Settings</span>
        </button>

        <button
          id="nav-help"
          onClick={() => setShowHelp(true)}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-[#64748B] hover:text-[#243447] hover:bg-white transition"
        >
          <HelpCircle className="w-4 h-4" />
          <span>Help & Guidelines</span>
        </button>

        {/* User Profile Mini Block */}
        <div className="mt-2 p-2.5 rounded-lg bg-white border border-[#E2E8F0] flex items-center justify-between">
          <div className="min-w-0 pr-2">
            <div className="text-xs font-semibold text-[#243447] truncate">
              {currentUserName}
            </div>
            <div className="text-[10px] text-[#64748B] truncate capitalize">
              {currentRole.toLowerCase().replace("_", " ")}
            </div>
          </div>
          <div className="w-2 h-2 rounded-full bg-[#16A34A] shrink-0" title="Active on duty" />
        </div>
      </div>

      {/* Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E8F0] rounded-xl max-w-lg w-full p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-2">
                <HeartPulse className="w-5 h-5 text-[#1976D2]" />
                <h3 className="text-sm font-bold text-[#243447]">MEDFLOW Operations Guide</h3>
              </div>
              <button
                onClick={() => setShowHelp(false)}
                className="p-1 text-[#64748B] hover:text-[#243447] rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-[#64748B]">
              <div className="p-3 rounded-lg bg-[#EAF4FF] text-[#1976D2]">
                <span className="font-bold">Core Principle:</span> A hospital staff member should understand the entire dashboard in under 10 seconds without training.
              </div>

              <div>
                <h4 className="font-bold text-[#243447] mb-1">1. Priority Queue</h4>
                <p>Patients are ordered using deterministic scoring (urgency tier + vital signs + age + waiting time aging). Starvation prevention ensures moderate patients are never forgotten.</p>
              </div>

              <div>
                <h4 className="font-bold text-[#243447] mb-1">2. Resource Allocation</h4>
                <p>Match beds, ICUs, operating rooms, and specialists without scheduling conflicts. Smart Allocation computes feasible assignments with clear clinical rationale.</p>
              </div>

              <div>
                <h4 className="font-bold text-[#243447] mb-1">3. AI-Assisted Assessment</h4>
                <p>AI assists the intake triage workflow quietly. All clinical decisions require physician confirmation.</p>
              </div>
            </div>

            <div className="pt-2 border-t border-[#E2E8F0] flex justify-end">
              <button
                onClick={() => setShowHelp(false)}
                className="px-4 py-2 rounded-lg bg-[#1976D2] hover:bg-[#1565C0] text-white text-xs font-semibold"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
