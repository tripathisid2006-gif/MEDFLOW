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
  const [hospitalName, setHospitalName] = useState(settings?.hospitalName || "Shantideep Multispeciality Hospital");
  const [surgeMode, setSurgeMode] = useState(settings?.surgeModeActive || false);
  const [staffShortageMode, setStaffShortageMode] = useState(settings?.staffShortageModeActive || false);
  const [critWeight, setCritWeight] = useState(settings?.urgencyWeights?.CRITICAL || 100);
  const [highWeight, setHighWeight] = useState(settings?.urgencyWeights?.HIGH || 60);
  const [modWeight, setModWeight] = useState(settings?.urgencyWeights?.MODERATE || 30);
  const [lowWeight, setLowWeight] = useState(settings?.urgencyWeights?.LOW || 10);
  const [agingRate, setAgingRate] = useState(settings?.waitingAgingRatePer10Min || 5);
  const [thresholdMinutes, setThresholdMinutes] = useState(settings?.maxWaitingThresholdMinutes || 45);
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
      setSaveSuccessMsg("Settings committed and priority formula re-calibrated across all active queues.");
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
      setSaveSuccessMsg(`Dataset successfully reset: ${res.patientsCount} synthetic patients, ${res.resourcesCount} resources, and ${res.departmentsCount} departments loaded for Shantideep Multispeciality Hospital.`);
      onRefresh();
    } catch (err: any) {
      alert("Failed to reset dataset: " + err.message);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-4xl">
      {/* Header & Subtle Environment Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <Sliders className="w-5 h-5 text-blue-400" />
            <span>System Settings & Operational Modes</span>
          </h2>
          <p className="text-xs text-slate-400">
            Configure deterministic priority scoring weights, surge modes, and facility governance.
          </p>
        </div>

        {/* Subtle Environment Indicator */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300 self-start sm:self-auto">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-slate-400">Environment:</span>
          <span className="text-emerald-300 font-semibold">Synthetic Hospital Dataset</span>
        </div>
      </div>

      {saveSuccessMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-950/50 border border-emerald-800 text-emerald-200 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{saveSuccessMsg}</span>
          </div>
          <button onClick={() => setSaveSuccessMsg(null)} className="text-xs text-emerald-300">
            Dismiss
          </button>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Operational Modes Banner Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Surge Mode */}
          <div
            className={`p-4 rounded-xl border transition ${
              surgeMode
                ? "bg-red-950/40 border-red-700 text-red-200"
                : "bg-slate-900 border-slate-800 text-slate-300"
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className={`p-2 rounded-lg ${
                    surgeMode ? "bg-red-900/60 text-red-300" : "bg-slate-950 text-slate-400"
                  }`}
                >
                  <Flame className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white">Surge Mode</h3>
                  <p className="text-[11px] text-slate-400">Mass casualty / extreme volume</p>
                </div>
              </div>

              <input
                type="checkbox"
                id="surge-mode-toggle"
                checked={surgeMode}
                onChange={(e) => setSurgeMode(e.target.checked)}
                className="w-5 h-5 rounded bg-slate-950 border-slate-800 text-red-600 focus:ring-red-500 cursor-pointer"
              />
            </div>

            <p className="text-xs mt-3 leading-relaxed text-slate-300">
              When activated, Critical case weights receive a 20% priority multiplier, and ICU beds are strictly preserved for life-threatening triage.
            </p>
          </div>

          {/* Staff Shortage Mode */}
          <div
            className={`p-4 rounded-xl border transition ${
              staffShortageMode
                ? "bg-amber-950/40 border-amber-700 text-amber-200"
                : "bg-slate-900 border-slate-800 text-slate-300"
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className={`p-2 rounded-lg ${
                    staffShortageMode ? "bg-amber-900/60 text-amber-300" : "bg-slate-950 text-slate-400"
                  }`}
                >
                  <UserX className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white">Staff Shortage Mode</h3>
                  <p className="text-[11px] text-slate-400">Reduced physician availability</p>
                </div>
              </div>

              <input
                type="checkbox"
                id="staff-shortage-toggle"
                checked={staffShortageMode}
                onChange={(e) => setStaffShortageMode(e.target.checked)}
                className="w-5 h-5 rounded bg-slate-950 border-slate-800 text-amber-600 focus:ring-amber-500 cursor-pointer"
              />
            </div>

            <p className="text-xs mt-3 leading-relaxed text-slate-300">
              Increases concurrent doctor caseload tolerance and dynamically escalates nurse-led stabilization workflows.
            </p>
          </div>
        </div>

        {/* Priority Formula Configuration */}
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="border-b border-slate-800 pb-2 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                Deterministic Priority Scoring Weights
              </h3>
              <p className="text-[11px] text-slate-400">
                Formula: Score = UrgencyWeight + (WaitMinutes/10 * AgingRate) + VitalsRiskFactor
              </p>
            </div>
            <button
              type="button"
              onClick={handleResetDefaults}
              className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Defaults</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-red-400 mb-1">Critical Urgency</label>
              <input
                type="number"
                min="10"
                max="500"
                value={critWeight}
                onChange={(e) => setCritWeight(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-xs font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-orange-400 mb-1">High Urgency</label>
              <input
                type="number"
                min="10"
                max="500"
                value={highWeight}
                onChange={(e) => setHighWeight(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-xs font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-amber-400 mb-1">Moderate Urgency</label>
              <input
                type="number"
                min="0"
                max="500"
                value={modWeight}
                onChange={(e) => setModWeight(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-xs font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-blue-400 mb-1">Low Urgency</label>
              <input
                type="number"
                min="0"
                max="500"
                value={lowWeight}
                onChange={(e) => setLowWeight(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-xs font-mono font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Aging Rate (+pts per 10 min)
              </label>
              <input
                type="number"
                min="1"
                max="50"
                value={agingRate}
                onChange={(e) => setAgingRate(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-xs font-mono"
              />
              <span className="text-[10px] text-slate-400">Anti-starvation fairness increment</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Wait Time Warning Threshold
              </label>
              <input
                type="number"
                min="15"
                max="240"
                value={thresholdMinutes}
                onChange={(e) => setThresholdMinutes(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-xs font-mono"
              />
              <span className="text-[10px] text-slate-400">Minutes before dashboard alarm triggers</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Max Concurrent Doctor Cases
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={maxCases}
                onChange={(e) => setMaxCases(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-xs font-mono"
              />
              <span className="text-[10px] text-slate-400">Enforced during conflict checking</span>
            </div>
          </div>
        </div>

        {/* Facility Details & Dataset Management */}
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="text-xs font-bold uppercase tracking-wider text-white border-b border-slate-800 pb-2 flex items-center justify-between">
            <span>Hospital Facility Identification</span>
            <span className="text-[11px] font-mono text-emerald-400 normal-case font-medium">Bengaluru, Karnataka (IN)</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Facility Name</label>
            <input
              type="text"
              required
              value={hospitalName}
              onChange={(e) => setHospitalName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-xs"
            />
          </div>

          {/* Synthetic Dataset Governance */}
          <div className="pt-2 border-t border-slate-800/80">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3.5 rounded-lg bg-slate-950 border border-slate-800">
              <div className="space-y-0.5">
                <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-blue-400" />
                  <span>Synthetic Hospital Dataset Control</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Resets the facility to the verified synthetic Indian hospital dataset (14 departments, realistic equipment, staff, and active patients).
                </p>
              </div>

              {currentRole === "ADMIN" ? (
                <button
                  type="button"
                  id="reset-synthetic-dataset-btn"
                  onClick={() => setShowResetModal(true)}
                  className="px-3 py-2 rounded-lg bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/60 text-xs font-semibold flex items-center gap-2 transition whitespace-nowrap self-start sm:self-auto"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-rose-400" />
                  <span>Reset Synthetic Hospital Dataset</span>
                </button>
              ) : (
                <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-1 rounded border border-slate-800">
                  Admin privilege required
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={onInitUnits}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold flex items-center gap-2 transition"
          >
            <Database className="w-4 h-4 text-blue-400" />
            <span>Re-initialize Standard Units</span>
          </button>

          <button
            type="submit"
            id="save-settings-btn"
            disabled={isSaving}
            className="px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg transition disabled:opacity-50 flex items-center gap-2"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{isSaving ? "Saving..." : "Commit Settings"}</span>
          </button>
        </div>
      </form>

      {/* Confirmation Modal for Reset Synthetic Dataset */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-lg bg-rose-950/80 border border-rose-800/80 text-rose-400">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white tracking-tight">
                  Reset Synthetic Hospital Dataset?
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  This will purge the current database records and re-seed with the authentic synthetic Indian hospital dataset for{" "}
                  <strong className="text-slate-200">Shantideep Multispeciality Hospital (Bengaluru)</strong>.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-400 space-y-1">
              <div className="text-slate-300 font-semibold">Included in fresh synthetic state:</div>
              <ul className="list-disc pl-4 space-y-0.5">
                <li>14 Clinical departments & realistic bed/equipment units</li>
                <li>Indian synthetic medical staff rosters & ambulance fleet</li>
                <li>Realistic patient case mix (Emergency, ICU, General Wards)</li>
                <li>Dynamic priority scores computed deterministically</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isResetting}
                onClick={() => setShowResetModal(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                id="confirm-reset-dataset-btn"
                disabled={isResetting}
                onClick={handleConfirmResetSyntheticData}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-lg transition disabled:opacity-50 flex items-center gap-2"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isResetting ? "animate-spin" : ""}`} />
                <span>{isResetting ? "Resetting Dataset..." : "Confirm & Reset Dataset"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
