import React, { useState } from "react";
import {
  Sliders,
  AlertTriangle,
  Flame,
  UserX,
  ShieldCheck,
  RotateCcw,
  CheckCircle2,
  Database,
  RefreshCw,
  Info,
  ShieldAlert,
  Building,
} from "lucide-react";
import type { SystemSettings, UserRole } from "../types";
import { updateSettingsApi, initHospitalUnitsApi, resetSyntheticDataApi } from "../api";

interface SettingsViewProps {
  settings: SystemSettings | null;
  currentRole: UserRole;
  currentUserName: string;
  onRefresh: () => void;
  onInitUnits: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  currentRole,
  currentUserName,
  onRefresh,
  onInitUnits,
}) => {
  const [hospitalName, setHospitalName] = useState(
    settings?.hospitalName || "Shantideep Multispeciality Hospital"
  );
  const [surgeMode, setSurgeMode] = useState(settings?.surgeModeActive || false);
  const [staffShortageMode, setStaffShortageMode] = useState(
    settings?.staffShortageModeActive || false
  );
  const [critWeight, setCritWeight] = useState(settings?.urgencyWeights?.CRITICAL || 100);
  const [highWeight, setHighWeight] = useState(settings?.urgencyWeights?.HIGH || 60);
  const [modWeight, setModWeight] = useState(settings?.urgencyWeights?.MODERATE || 30);
  const [lowWeight, setLowWeight] = useState(settings?.urgencyWeights?.LOW || 10);
  const [agingRate, setAgingRate] = useState(settings?.waitingAgingRatePer10Min || 5);
  const [thresholdMinutes, setThresholdMinutes] = useState(
    settings?.maxWaitingThresholdMinutes || 45
  );
  const [maxCases, setMaxCases] = useState(settings?.maxConcurrentCasesPerDoctor || 3);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Admin Reset Synthetic Data Dialog
  const [showResetModal, setShowResetModal] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccessMsg(null);
    try {
      await updateSettingsApi(
        {
          hospitalName,
          surgeModeActive: surgeMode,
          staffShortageModeActive: staffShortageMode,
          urgencyWeights: {
            CRITICAL: Number(critWeight),
            HIGH: Number(highWeight),
            MODERATE: Number(modWeight),
            LOW: Number(lowWeight),
          },
          waitingAgingRatePer10Min: Number(agingRate),
          maxWaitingThresholdMinutes: Number(thresholdMinutes),
          maxConcurrentCasesPerDoctor: Number(maxCases),
        },
        `${currentUserName} (${currentRole})`,
        currentRole
      );
      setSaveSuccessMsg(
        "Settings committed and priority formula re-calibrated across all active queues."
      );
      onRefresh();
    } catch (err: any) {
      alert("Failed to update settings: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefaults = () => {
    setCritWeight(100);
    setHighWeight(60);
    setModWeight(30);
    setLowWeight(10);
    setAgingRate(5);
    setThresholdMinutes(45);
    setMaxCases(3);
    setSurgeMode(false);
    setStaffShortageMode(false);
  };

  const handleConfirmResetSyntheticData = async () => {
    setIsResetting(true);
    try {
      const res = await resetSyntheticDataApi(currentUserName);
      setShowResetModal(false);
      setSaveSuccessMsg(
        `Dataset successfully reset: ${res.patientsCount} synthetic patients, ${res.resourcesCount} resources, and ${res.departmentsCount} departments loaded for Shantideep Multispeciality Hospital.`
      );
      onRefresh();
    } catch (err: any) {
      alert("Failed to reset synthetic data: " + err.message);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E8F0] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-[#243447] tracking-tight font-heading">
              System Configuration & Policies
            </h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[#EAF4FF] text-[#1976D2]">
              Clinical Operations
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-0.5">
            Calibrate priority scoring weights, surge modes, physician case limits, and realistic synthetic demo data.
          </p>
        </div>

        <button
          onClick={handleResetDefaults}
          className="px-3.5 py-1.5 rounded-lg bg-white border border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#243447] text-xs font-semibold flex items-center gap-1.5 transition"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Defaults</span>
        </button>
      </div>

      {saveSuccessMsg && (
        <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{saveSuccessMsg}</span>
          </div>
          <button
            onClick={() => setSaveSuccessMsg(null)}
            className="text-xs font-semibold text-emerald-800 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Hospital Profile & Surge Modes */}
        <div className="medical-card p-5 space-y-4">
          <h2 className="text-sm font-bold text-[#243447]">Hospital Profile & Incident Protocols</h2>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-[#243447] mb-1">
                Hospital Facility Name
              </label>
              <input
                type="text"
                value={hospitalName}
                onChange={(e) => setHospitalName(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-2.5 text-xs text-[#243447] focus:outline-none focus:border-[#1976D2]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <label
                className={`p-3.5 rounded-lg border text-xs flex items-start gap-3 cursor-pointer transition ${
                  surgeMode
                    ? "bg-amber-50 border-amber-300 text-amber-900"
                    : "bg-[#F8FAFC] border-[#E2E8F0] text-[#243447]"
                }`}
              >
                <input
                  type="checkbox"
                  checked={surgeMode}
                  onChange={(e) => setSurgeMode(e.target.checked)}
                  className="mt-0.5 rounded text-[#1976D2]"
                />
                <div>
                  <div className="font-bold flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-amber-600" />
                    <span>Emergency Surge Mode</span>
                  </div>
                  <p className="text-[11px] text-[#64748B] mt-1 leading-normal">
                    Increases critical triage weights and triggers multi-casualty incident intake protocol.
                  </p>
                </div>
              </label>

              <label
                className={`p-3.5 rounded-lg border text-xs flex items-start gap-3 cursor-pointer transition ${
                  staffShortageMode
                    ? "bg-red-50 border-red-300 text-red-900"
                    : "bg-[#F8FAFC] border-[#E2E8F0] text-[#243447]"
                }`}
              >
                <input
                  type="checkbox"
                  checked={staffShortageMode}
                  onChange={(e) => setStaffShortageMode(e.target.checked)}
                  className="mt-0.5 rounded text-[#1976D2]"
                />
                <div>
                  <div className="font-bold flex items-center gap-1.5">
                    <UserX className="w-3.5 h-3.5 text-red-600" />
                    <span>Staff Shortage Protocol</span>
                  </div>
                  <p className="text-[11px] text-[#64748B] mt-1 leading-normal">
                    Re-allocates nursing staff automatically and increases physician concurrent case limits.
                  </p>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Priority Engine Weights */}
        <div className="medical-card p-5 space-y-4">
          <h2 className="text-sm font-bold text-[#243447]">Priority Engine Urgency Weights</h2>
          <p className="text-xs text-[#64748B]">
            Base points attributed to incoming patients based on validated clinical triage level.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1">
            <div>
              <label className="block text-[11px] font-semibold text-[#DC2626] mb-1">
                CRITICAL (Level 1)
              </label>
              <input
                type="number"
                value={critWeight}
                onChange={(e) => setCritWeight(Number(e.target.value))}
                className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-2 text-xs font-mono text-[#243447]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#F59E0B] mb-1">
                HIGH (Level 2)
              </label>
              <input
                type="number"
                value={highWeight}
                onChange={(e) => setHighWeight(Number(e.target.value))}
                className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-2 text-xs font-mono text-[#243447]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#1976D2] mb-1">
                MODERATE (Level 3)
              </label>
              <input
                type="number"
                value={modWeight}
                onChange={(e) => setModWeight(Number(e.target.value))}
                className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-2 text-xs font-mono text-[#243447]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#16A34A] mb-1">
                LOW (Level 4)
              </label>
              <input
                type="number"
                value={lowWeight}
                onChange={(e) => setLowWeight(Number(e.target.value))}
                className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-2 text-xs font-mono text-[#243447]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-[#E2E8F0]">
            <div>
              <label className="block text-xs font-semibold text-[#243447] mb-1">
                Waiting Aging (+pts / 10m)
              </label>
              <input
                type="number"
                value={agingRate}
                onChange={(e) => setAgingRate(Number(e.target.value))}
                className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-2 text-xs font-mono text-[#243447]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#243447] mb-1">
                Max Wait Target (Minutes)
              </label>
              <input
                type="number"
                value={thresholdMinutes}
                onChange={(e) => setThresholdMinutes(Number(e.target.value))}
                className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-2 text-xs font-mono text-[#243447]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#243447] mb-1">
                Physician Max Cases
              </label>
              <input
                type="number"
                value={maxCases}
                onChange={(e) => setMaxCases(Number(e.target.value))}
                className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-2 text-xs font-mono text-[#243447]"
              />
            </div>
          </div>
        </div>

        {/* Save Bar */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="px-5 py-2 rounded-lg bg-[#1976D2] hover:bg-[#1565C0] text-white text-xs font-semibold shadow-xs disabled:opacity-50 transition"
          >
            {isSaving ? "Saving Configuration..." : "Save Settings & Recalibrate"}
          </button>
        </div>
      </form>

      {/* Synthetic Demo Dataset Management */}
      <div className="medical-card p-5 space-y-4 border-[#CBD5E1]">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-sm font-bold text-[#243447] flex items-center gap-2">
              <Database className="w-4 h-4 text-[#1976D2]" />
              <span>Synthetic Indian Hospital Dataset</span>
            </h2>
            <p className="text-xs text-[#64748B] mt-1">
              Shantideep Multispeciality Hospital synthetic operational dataset (realistic Indian patient profiles, NABH clinical codes, ICUs, OT, ambulance fleet).
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowResetModal(true)}
            className="px-3.5 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset Demo Dataset</span>
          </button>
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E8F0] rounded-xl max-w-md w-full p-5 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#243447]">Reset to Synthetic Indian Hospital Data?</h3>
                <p className="text-xs text-[#64748B] mt-0.5">
                  This will reload the realistic 20-patient Indian hospital census, resources, and trauma units.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E2E8F0]">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="px-4 py-2 rounded-lg bg-white border border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#243447] text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isResetting}
                onClick={handleConfirmResetSyntheticData}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50"
              >
                {isResetting ? "Resetting..." : "Confirm & Reload Data"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
