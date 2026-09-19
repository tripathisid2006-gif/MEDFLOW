import React, { useState, useEffect } from "react";
import {
  Activity,
  AlertTriangle,
  Radio,
  UserCheck,
  Shield,
  Stethoscope,
  Clock,
  ChevronDown,
  Bell,
  X,
} from "lucide-react";
import type { UserRole, HospitalAlert, SystemSettings } from "../types";

interface HeaderProps {
  currentRole: UserRole;
  currentUserName: string;
  onRoleChange: (role: UserRole, name: string) => void;
  settings: SystemSettings | null;
  alerts: HospitalAlert[];
  realtimeConnected: boolean;
  onNavigateToTab?: (tab: string) => void;
}

const ROLES_CONFIG: Record<
  UserRole,
  { label: string; defaultName: string; icon: any; badgeColor: string; description: string }
> = {
  ADMIN: {
    label: "Medical Superintendent / Admin",
    defaultName: "Dr. Arvind Reddy",
    icon: Shield,
    badgeColor: "bg-purple-950/80 text-purple-300 border-purple-800/60",
    description: "Full hospital configuration, capacity, and clinical governance",
  },
  DOCTOR: {
    label: "Attending Physician",
    defaultName: "Dr. Kavitha Menon, MD",
    icon: Stethoscope,
    badgeColor: "bg-blue-950/80 text-blue-300 border-blue-800/60",
    description: "Clinical evaluation, AI triage review, diagnostic confirmation",
  },
  NURSE: {
    label: "Charge Nurse",
    defaultName: "Deepa Nair, BSc RN",
    icon: UserCheck,
    badgeColor: "bg-emerald-950/80 text-emerald-300 border-emerald-800/60",
    description: "Bedside status, patient vitals, intake monitoring",
  },
  OPERATOR: {
    label: "Operations Coordinator",
    defaultName: "Sanjay Patil",
    icon: Activity,
    badgeColor: "bg-amber-950/80 text-amber-300 border-amber-800/60",
    description: "Resource scheduling, allocation dispatch, queue management",
  },
  COORDINATOR: {
    label: "ED Coordinator",
    defaultName: "Kavya Shetty",
    icon: Activity,
    badgeColor: "bg-amber-950/80 text-amber-300 border-amber-800/60",
    description: "Emergency unit dispatch, capacity, and bed coordination",
  },
  TRIAGE_NURSE: {
    label: "Triage Nurse",
    defaultName: "Nurse Anitha Rao, GNM RN",
    icon: UserCheck,
    badgeColor: "bg-teal-950/80 text-teal-300 border-teal-800/60",
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
}) => {
  const [currentTime, setCurrentTime] = useState<string>("");
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showAlertsModal, setShowAlertsModal] = useState(false);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        }) + " " + now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      );
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);

  const roleMeta = ROLES_CONFIG[currentRole];
  const criticalAlertsCount = alerts.filter((a) => a.severity === "CRITICAL").length;

  return (
    <header className="sticky top-0 z-40 bg-slate-950 border-b border-slate-800 text-slate-100 shadow-md">
      {settings?.emergencySurgeModeActive && (
        <div className="bg-red-950 border-b border-red-800/80 text-red-200 px-4 py-1.5 text-xs font-semibold flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>
              EMERGENCY SURGE PROTOCOL ACTIVE — Activated by {settings.surgeActivatedBy || "Command"} at{" "}
              {settings.surgeActivatedAt ? new Date(settings.surgeActivatedAt).toLocaleTimeString() : "Recent"}. Priority calculations expedited.
            </span>
          </div>
          {onNavigateToTab && (
            <button
              onClick={() => onNavigateToTab("settings")}
              className="text-xs bg-red-900/60 hover:bg-red-800 text-red-100 px-2.5 py-0.5 rounded border border-red-700/60 transition"
            >
              Surge Settings
            </button>
          )}
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand & Tagline */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold tracking-tight text-white">MEDFLOW</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-blue-900/40 text-blue-300 border border-blue-700/50">
                Hospital OS
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              {settings?.hospitalName || "Shantideep Multispeciality Hospital"} • Bengaluru
            </p>
          </div>
        </div>

        {/* Live Clock & Connection */}
        <div className="hidden md:flex items-center gap-4 text-xs font-mono text-slate-400 bg-slate-900/80 px-3 py-1.5 rounded-md border border-slate-800">
          <div className="flex items-center gap-1.5 text-slate-300">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{currentTime || "Loading..."}</span>
          </div>
          <div className="h-3 w-px bg-slate-800" />
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                realtimeConnected ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
              }`}
            />
            <span className={realtimeConnected ? "text-emerald-400" : "text-amber-400"}>
              {realtimeConnected ? "Live Realtime Stream" : "Connecting..."}
            </span>
          </div>
        </div>

        {/* Right side controls: Alerts & Role Selector */}
        <div className="flex items-center gap-3">
          {/* Alerts Trigger */}
          <button
            id="alerts-button"
            onClick={() => setShowAlertsModal(!showAlertsModal)}
            className="relative p-2 rounded-md bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition"
            title="Hospital Operations Alerts"
          >
            <Bell className="w-4 h-4" />
            {alerts.length > 0 && (
              <span
                className={`absolute -top-1 -right-1 text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                  criticalAlertsCount > 0 ? "bg-red-600 text-white" : "bg-amber-600 text-white"
                }`}
              >
                {alerts.length}
              </span>
            )}
          </button>

          {/* Role Switcher */}
          <div className="relative">
            <button
              id="role-selector-button"
              onClick={() => setShowRoleMenu(!showRoleMenu)}
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-800 text-left transition"
            >
              <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-slate-300">
                <roleMeta.icon className="w-4 h-4" />
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-xs font-semibold text-slate-200 leading-tight">{currentUserName}</div>
                <div className="text-[11px] text-slate-400 leading-none">{roleMeta.label}</div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {showRoleMenu && (
              <div className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 p-2">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-3 py-1.5">
                  Simulate Authorized Role
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
                          ? "bg-slate-800 text-white border border-slate-700"
                          : "hover:bg-slate-800/60 text-slate-300"
                      }`}
                    >
                      <div className="p-1.5 rounded-md bg-slate-950 text-slate-300 mt-0.5">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-100">{item.label}</span>
                          {isSelected && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-900/60 text-blue-300 font-mono">
                              ACTIVE
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-300">{item.defaultName}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{item.description}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Alerts Dropdown Modal */}
      {showAlertsModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-start justify-center pt-20 px-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-semibold text-slate-100">Live Hospital Operational Alerts</h3>
              </div>
              <button
                onClick={() => setShowAlertsModal(false)}
                className="p-1 text-slate-400 hover:text-slate-200 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-3 space-y-2 max-h-96 overflow-y-auto pr-1">
              {alerts.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  Zero active operational alerts. Hospital resources running within standard thresholds.
                </div>
              ) : (
                alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-3 rounded-lg border text-xs ${
                      alert.severity === "CRITICAL"
                        ? "bg-red-950/40 border-red-900/60 text-red-200"
                        : "bg-amber-950/40 border-amber-900/60 text-amber-200"
                    }`}
                  >
                    <div className="flex items-center justify-between font-semibold">
                      <span className="flex items-center gap-1.5">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            alert.severity === "CRITICAL" ? "bg-red-400" : "bg-amber-400"
                          }`}
                        />
                        {alert.title}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(alert.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="mt-1 text-slate-300 leading-relaxed">{alert.message}</p>
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
