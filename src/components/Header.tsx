import React, { useState, useEffect } from "react";
import {
  Bell,
  Search,
  ChevronDown,
  AlertTriangle,
  UserCheck,
  Stethoscope,
  Activity,
  Shield,
  X,
  Globe,
  HeartPulse,
} from "lucide-react";
import type { UserRole, SystemSettings, HospitalAlert } from "../types";

interface HeaderProps {
  currentRole: UserRole;
  currentUserName: string;
  onRoleChange: (role: UserRole, name?: string) => void;
  settings: SystemSettings | null;
  alerts: HospitalAlert[];
  realtimeConnected: boolean;
  onNavigateToTab?: (tab: string) => void;
  onOpenLanding?: () => void;
  pageTitle?: string;
}

export const ROLES_CONFIG: Record<
  UserRole,
  { label: string; defaultName: string; icon: any; description: string }
> = {
  ADMIN: {
    label: "Medical Superintendent",
    defaultName: "Dr. K. S. Venkatesh, MD, MHA",
    icon: Shield,
    description: "Hospital administrative control, capacity policies, and staff quotas",
  },
  DOCTOR: {
    label: "Attending Physician",
    defaultName: "Dr. Arvind Swaminathan, MD, DM",
    icon: Stethoscope,
    description: "Clinical diagnoses, order overrides, and ICU/OR admission decisions",
  },
  NURSE: {
    label: "Charge Nurse",
    defaultName: "Nurse Deepa Nair, BSc RN",
    icon: Activity,
    description: "Ward allocations, patient tracking, and medication schedules",
  },
  COORDINATOR: {
    label: "Operations Coordinator",
    defaultName: "Kavya Shetty",
    icon: Activity,
    description: "Emergency unit dispatch, capacity, and bed coordination",
  },
  OPERATOR: {
    label: "System Operator",
    defaultName: "Kavya Shetty",
    icon: Activity,
    description: "Emergency unit dispatch, capacity, and bed coordination",
  },
  TRIAGE_NURSE: {
    label: "Triage Nurse",
    defaultName: "Nurse Anitha Rao, GNM RN",
    icon: UserCheck,
    description: "Rapid intake, vital signs assessment, and triage scoring",
  },
};

export const Header: React.FC<HeaderProps> = ({
  currentRole,
  currentUserName,
  onRoleChange,
  settings,
  alerts,
  realtimeConnected,
  onNavigateToTab,
  onOpenLanding,
  pageTitle = "Hospital Operations",
}) => {
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showAlertsModal, setShowAlertsModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const roleMeta = ROLES_CONFIG[currentRole] || ROLES_CONFIG.TRIAGE_NURSE;
  const criticalAlertsCount = alerts.filter((a) => a.severity === "CRITICAL").length;

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-[#E2E8F0] shadow-xs">
      {settings?.emergencySurgeModeActive && (
        <div className="bg-red-50 border-b border-red-200 text-red-800 px-4 py-1.5 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>
              EMERGENCY SURGE PROTOCOL ACTIVE — Activated by {settings.surgeActivatedBy || "Command"}. Priority calculations expedited.
            </span>
          </div>
          {onNavigateToTab && (
            <button
              onClick={() => onNavigateToTab("settings")}
              className="text-xs bg-red-600 hover:bg-red-700 text-white px-2.5 py-0.5 rounded font-medium transition"
            >
              Surge Settings
            </button>
          )}
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Left: Brand / Title */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#1976D2] flex items-center justify-center text-white shadow-xs">
              <HeartPulse className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-bold text-[#243447] tracking-tight font-heading">
                  MEDFLOW
                </span>
                <span className="hidden sm:inline-block text-[10px] uppercase font-semibold text-[#1976D2] bg-[#EAF4FF] px-1.5 py-0.5 rounded">
                  Clinical OS
                </span>
              </div>
              <p className="text-[11px] text-[#64748B] leading-none hidden md:block">
                {settings?.hospitalName || "Shantideep Multispeciality Hospital"} • Bengaluru
              </p>
            </div>
          </div>
        </div>

        {/* Middle: Search Input */}
        <div className="flex-1 max-w-md mx-4 hidden md:block">
          <div className="relative">
            <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              id="header-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search patients by name, MRN, diagnosis or bed..."
              className="w-full bg-[#F7FAFC] border border-[#E2E8F0] rounded-lg pl-9 pr-4 py-1.5 text-xs text-[#243447] placeholder-[#94A3B8] focus:outline-none focus:border-[#1976D2] focus:bg-white transition"
            />
          </div>
        </div>

        {/* Right: Status Indicator, Public Portal, Notifications, User Profile */}
        <div className="flex items-center gap-3">
          {/* System Operational Badge */}
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#E8F7F4] border border-[#0F9D8A]/20 text-[#0F9D8A] text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-[#0F9D8A] animate-pulse" />
            <span>System Operational</span>
          </div>

          {/* Hospital Website / Public Portal link */}
          {onOpenLanding && (
            <button
              id="header-hospital-website-btn"
              onClick={onOpenLanding}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#64748B] hover:text-[#1976D2] hover:bg-[#F1F5F9] border border-[#E2E8F0] transition"
              title="View Public Hospital Website"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Hospital Website</span>
            </button>
          )}

          {/* Notifications / Alerts Button */}
          <button
            id="alerts-button"
            onClick={() => setShowAlertsModal(!showAlertsModal)}
            className="relative p-2 rounded-lg bg-[#F7FAFC] hover:bg-[#F1F5F9] text-[#64748B] hover:text-[#243447] border border-[#E2E8F0] transition"
            title="Operational Alerts"
          >
            <Bell className="w-4 h-4" />
            {alerts.length > 0 && (
              <span
                className={`absolute -top-1 -right-1 text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                  criticalAlertsCount > 0 ? "bg-[#DC2626] text-white" : "bg-[#F59E0B] text-white"
                }`}
              >
                {alerts.length}
              </span>
            )}
          </button>

          {/* User Profile / Role Switcher */}
          <div className="relative">
            <button
              id="role-selector-button"
              onClick={() => setShowRoleMenu(!showRoleMenu)}
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-[#F7FAFC] hover:bg-[#F1F5F9] border border-[#E2E8F0] text-left transition"
            >
              <div className="w-7 h-7 rounded-full bg-[#EAF4FF] text-[#1976D2] flex items-center justify-center font-bold">
                <roleMeta.icon className="w-4 h-4" />
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-xs font-semibold text-[#243447] leading-tight">
                  {currentUserName}
                </div>
                <div className="text-[11px] text-[#64748B] leading-none">
                  {roleMeta.label}
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-[#64748B]" />
            </button>

            {showRoleMenu && (
              <div className="absolute right-0 mt-2 w-72 bg-white border border-[#E2E8F0] rounded-xl shadow-lg z-50 p-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] px-3 py-1.5">
                  Simulate Clinical Role
                </div>
                {(Object.keys(ROLES_CONFIG) as UserRole[]).map((roleKey) => {
                  const item = ROLES_CONFIG[roleKey];
                  const Icon = item.icon;
                  const isSelected = currentRole === roleKey;
                  return (
                    <button
                      key={roleKey}
                      onClick={() => {
                        onRoleChange(roleKey, item.defaultName);
                        setShowRoleMenu(false);
                      }}
                      className={`w-full text-left p-2.5 rounded-lg flex items-start gap-3 transition ${
                        isSelected
                          ? "bg-[#EAF4FF] text-[#1976D2] font-semibold"
                          : "hover:bg-[#F8FAFC] text-[#243447]"
                      }`}
                    >
                      <div className="p-1.5 rounded-md bg-white border border-[#E2E8F0] text-[#1976D2] mt-0.5">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold">{item.label}</span>
                          {isSelected && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1976D2] text-white font-medium">
                              ACTIVE
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-[#64748B]">{item.defaultName}</div>
                        <div className="text-[10px] text-[#94A3B8] mt-0.5 line-clamp-1">{item.description}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Operational Alerts Modal */}
      {showAlertsModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-2xs flex items-start justify-center pt-20 px-4">
          <div className="bg-white border border-[#E2E8F0] rounded-xl max-w-lg w-full p-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#F59E0B]" />
                <h3 className="text-sm font-bold text-[#243447]">Live Operational Alerts</h3>
              </div>
              <button
                onClick={() => setShowAlertsModal(false)}
                className="p-1 text-[#64748B] hover:text-[#243447] rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-3 space-y-2 max-h-96 overflow-y-auto pr-1">
              {alerts.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#64748B]">
                  Zero active operational alerts. Hospital resources are running within normal parameters.
                </div>
              ) : (
                alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-3 rounded-lg border text-xs ${
                      alert.severity === "CRITICAL"
                        ? "bg-red-50 border-red-200 text-red-900"
                        : "bg-amber-50 border-amber-200 text-amber-900"
                    }`}
                  >
                    <div className="flex items-center justify-between font-semibold">
                      <span className="flex items-center gap-1.5">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            alert.severity === "CRITICAL" ? "bg-red-600" : "bg-amber-600"
                          }`}
                        />
                        {alert.title}
                      </span>
                      <span className="text-[10px] text-[#64748B] font-mono">
                        {new Date(alert.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="mt-1 text-[#243447] leading-relaxed">{alert.message}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
