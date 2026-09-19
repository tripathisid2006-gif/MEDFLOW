import React, { useState } from "react";
import {
  ListOrdered,
  Sparkles,
  CheckCircle2,
  Clock,
  AlertCircle,
  Layers,
  Info,
  ShieldCheck,
  X,
  ExternalLink,
} from "lucide-react";
import type {
  Patient,
  Resource,
  ResourceAllocation,
  StaffMember,
  SystemSettings,
  UserRole,
} from "../types";
import {
  computeSmartAllocationApi,
  executeSmartAllocationsApi,
  createAllocationApi,
} from "../api";

interface PriorityQueueViewProps {
  patients: Patient[];
  resources: Resource[];
  staff: StaffMember[];
  allocations: ResourceAllocation[];
  settings: SystemSettings | null;
  currentRole: UserRole;
  currentUserName: string;
  onRefresh: () => void;
  onNavigate: (tab: string) => void;
}

export const PriorityQueueView: React.FC<PriorityQueueViewProps> = ({
  patients,
  resources,
  allocations,
  settings,
  currentRole,
  currentUserName,
  onRefresh,
  onNavigate,
}) => {
  // Only queue patients who are in WAITING or TRIAGED status
  const queuePatients = patients
    .filter((p) => p.status === "WAITING" || p.status === "TRIAGED")
    .sort((a, b) => b.priorityScore - a.priorityScore);

  // Smart Allocation Modal State
  const [smartPlan, setSmartPlan] = useState<{
    feasibleAllocations: any[];
    unallocatedPatients: any[];
    summary: string;
  } | null>(null);
  const [isCalculatingSmart, setIsCalculatingSmart] = useState(false);
  const [isExecutingSmart, setIsExecutingSmart] = useState(false);
  const [smartSuccessMsg, setSmartSuccessMsg] = useState<string | null>(null);

  // Manual Allocate Modal State
  const [manualPatient, setManualPatient] = useState<Patient | null>(null);
  const [selectedResourceId, setSelectedResourceId] = useState<string>("");
  const [manualReason, setManualReason] = useState<string>("");
  const [manualError, setManualError] = useState<string | null>(null);
  const [isAllocatingManual, setIsAllocatingManual] = useState(false);

  // Priority formula explanation tooltip state
  const [activeExplanation, setActiveExplanation] = useState<string | null>(null);

  // Trigger Smart Allocation Calculation
  const handleCalculateSmart = async () => {
    setIsCalculatingSmart(true);
    setSmartSuccessMsg(null);
    try {
      const plan = await computeSmartAllocationApi();
      setSmartPlan(plan);
    } catch (err: any) {
      alert("Failed to compute smart allocation: " + err.message);
    } finally {
      setIsCalculatingSmart(false);
    }
  };

  // Execute Smart Allocations
  const handleExecuteSmart = async () => {
    if (!smartPlan || smartPlan.feasibleAllocations.length === 0) return;
    setIsExecutingSmart(true);
    try {
      const res = await executeSmartAllocationsApi(
        smartPlan.feasibleAllocations,
        `${currentUserName} (${currentRole})`,
        currentRole
      );
      setSmartSuccessMsg(res.summary);
      setSmartPlan(null);
      onRefresh();
    } catch (err: any) {
      alert("Error executing allocations: " + err.message);
    } finally {
      setIsExecutingSmart(false);
    }
  };

  // Submit Manual Allocation
  const handleManualAllocate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualPatient || !selectedResourceId) return;
    setIsAllocatingManual(true);
    setManualError(null);
    try {
      await createAllocationApi({
        patientId: manualPatient.id,
        resourceId: selectedResourceId,
        allocatedBy: `${currentUserName} (${currentRole})`,
        reason: manualReason || "Direct clinical assignment from Priority Queue",
        userRole: currentRole,
      });
      setManualPatient(null);
      setSelectedResourceId("");
      setManualReason("");
      onRefresh();
    } catch (err: any) {
      setManualError(err.message || "Failed to allocate resource");
    } finally {
      setIsAllocatingManual(false);
    }
  };

  const availableResources = resources.filter((r) => r.status === "AVAILABLE");

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <ListOrdered className="w-5 h-5 text-blue-400" />
            <span>Live Patient Priority Queue</span>
          </h2>
          <p className="text-xs text-slate-400">
            Automatically ordered by the deterministic priority engine. Features waiting-time aging to prevent starvation.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            id="smart-allocate-btn"
            onClick={handleCalculateSmart}
            disabled={isCalculatingSmart || queuePatients.length === 0}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md flex items-center gap-2 transition disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4 text-indigo-200" />
            <span>{isCalculatingSmart ? "Optimizing..." : "Smart Allocate"}</span>
          </button>

          <button
            onClick={() => onNavigate("patients")}
            className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition"
          >
            Register Patient
          </button>
        </div>
      </div>

      {smartSuccessMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-950/50 border border-emerald-800 text-emerald-200 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{smartSuccessMsg}</span>
          </div>
          <button
            onClick={() => setSmartSuccessMsg(null)}
            className="text-xs px-2 py-0.5 rounded bg-emerald-900 text-emerald-100"
          >
            Close
          </button>
        </div>
      )}

      {/* Queue Table */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-400 px-1">
          <span>{queuePatients.length} patients currently awaiting clinical resource allocation</span>
          <span className="text-[11px] font-mono">Real-time dynamic sort: Priority Score (Desc)</span>
        </div>

        {queuePatients.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-400 space-y-2">
            <Clock className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="font-semibold text-slate-300">Priority Queue is clear</p>
            <p className="text-slate-400">All registered patients have been allocated resources or discharged.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase font-semibold text-[11px] border-b border-slate-800">
                <tr>
                  <th className="px-3 py-2.5">Rank</th>
                  <th className="px-3 py-2.5">MRN / Name</th>
                  <th className="px-3 py-2.5">Urgency</th>
                  <th className="px-3 py-2.5">Wait Time</th>
                  <th className="px-3 py-2.5">Dept</th>
                  <th className="px-3 py-2.5">Required Treatment</th>
                  <th className="px-3 py-2.5">Priority Score</th>
                  <th className="px-3 py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {queuePatients.map((patient, index) => {
                  const isCritical = patient.urgencyLevel === "CRITICAL";
                  return (
                    <tr
                      key={patient.id}
                      className={`hover:bg-slate-850/60 transition ${
                        isCritical ? "bg-red-950/20" : ""
                      }`}
                    >
                      <td className="px-3 py-3 font-mono font-bold text-slate-400">
                        #{index + 1}
                      </td>

                      <td className="px-3 py-3">
                        <div className="font-semibold text-slate-100">{patient.name}</div>
                        <div className="font-mono text-[11px] text-blue-400">{patient.mrn}</div>
                      </td>

                      <td className="px-3 py-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            patient.urgencyLevel === "CRITICAL"
                              ? "bg-red-950 text-red-300 border border-red-800"
                              : patient.urgencyLevel === "HIGH"
                              ? "bg-orange-950 text-orange-300 border border-orange-800"
                              : patient.urgencyLevel === "MODERATE"
                              ? "bg-amber-950 text-amber-300 border border-amber-800"
                              : "bg-blue-950 text-blue-300 border border-blue-800"
                          }`}
                        >
                          {patient.urgencyLevel}
                        </span>
                      </td>

                      <td className="px-3 py-3 font-mono">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span
                            className={
                              patient.waitingMinutes > (settings?.maxWaitingThresholdMinutes || 45)
                                ? "text-red-400 font-bold"
                                : "text-slate-200"
                            }
                          >
                            {patient.waitingMinutes} min
                          </span>
                        </div>
                      </td>

                      <td className="px-3 py-3 text-slate-300">
                        {patient.departmentName || "General"}
                      </td>

                      <td className="px-3 py-3 text-slate-300 max-w-xs truncate">
                        {patient.requiredTreatment}
                      </td>

                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-sm text-blue-300">
                            {patient.priorityScore}
                          </span>
                          <button
                            onClick={() =>
                              setActiveExplanation(
                                activeExplanation === patient.id ? null : patient.id
                              )
                            }
                            className="text-slate-400 hover:text-slate-200"
                            title="View mathematical score breakdown"
                          >
                            <Info className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        {activeExplanation === patient.id && (
                          <div className="mt-1.5 p-2 rounded bg-slate-950 border border-slate-800 text-[11px] text-slate-300 leading-normal max-w-xs shadow-lg">
                            {patient.priorityExplanation}
                          </div>
                        )}
                      </td>

                      <td className="px-3 py-3 text-right">
                        <button
                          onClick={() => {
                            setManualPatient(patient);
                            setSelectedResourceId("");
                            setManualReason("");
                            setManualError(null);
                          }}
                          className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-sm transition"
                        >
                          Allocate
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Smart Allocation Modal Preview */}
      {smartPlan && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-3xl w-full p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-bold text-white">
                  Smart Allocation Engine Recommendation
                </h3>
              </div>
              <button
                onClick={() => setSmartPlan(null)}
                className="p-1 text-slate-400 hover:text-slate-200 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-slate-300 leading-relaxed p-3 rounded-lg bg-indigo-950/30 border border-indigo-900/60">
              <div className="font-semibold text-indigo-300 mb-0.5">Algorithm Optimization Summary:</div>
              {smartPlan.summary}
            </div>

            {/* Feasible Allocations */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Feasible Allocations ({smartPlan.feasibleAllocations.length})
              </h4>
              {smartPlan.feasibleAllocations.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400 bg-slate-950 rounded-lg">
                  No feasible allocations found with currently available resources.
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {smartPlan.feasibleAllocations.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between font-semibold">
                        <span className="text-blue-300">
                          {item.resourceName} ({item.resourceNumber}) → {item.patientName}
                        </span>
                        <span className="font-mono text-slate-400 text-[11px]">
                          Priority: {item.priorityScore} pts ({item.urgencyLevel})
                        </span>
                      </div>
                      <p className="text-slate-400 text-[11px] leading-relaxed">
                        {item.justification}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Unallocated Patients */}
            {smartPlan.unallocatedPatients.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400">
                  Unresolved Waiting Patients ({smartPlan.unallocatedPatients.length})
                </h4>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {smartPlan.unallocatedPatients.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded-lg bg-amber-950/20 border border-amber-900/40 text-[11px] flex items-center justify-between"
                    >
                      <span className="font-semibold text-amber-200">{item.patientName}</span>
                      <span className="text-slate-400">{item.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Confirmation Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setSmartPlan(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteSmart}
                disabled={isExecutingSmart || smartPlan.feasibleAllocations.length === 0}
                className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg transition disabled:opacity-50"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>
                  {isExecutingSmart
                    ? "Executing Allocations..."
                    : `Confirm & Commit (${smartPlan.feasibleAllocations.length}) Allocations`}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Allocation Modal */}
      {manualPatient && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleManualAllocate}
            className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-5 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-white">
                  Allocate Resource: {manualPatient.name}
                </h3>
                <p className="text-xs text-slate-400">
                  MRN: {manualPatient.mrn} • Urgency: {manualPatient.urgencyLevel} (
                  {manualPatient.priorityScore} pts)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setManualPatient(null)}
                className="p-1 text-slate-400 hover:text-slate-200 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {manualError && (
              <div className="p-3 rounded-lg bg-red-950/40 border border-red-900 text-red-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{manualError}</span>
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Select Available Resource *
                </label>
                {availableResources.length === 0 ? (
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 text-xs">
                    No resources currently available. Release in-use resources or add new ones in the Resources tab.
                  </div>
                ) : (
                  <select
                    required
                    value={selectedResourceId}
                    onChange={(e) => setSelectedResourceId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-hidden focus:border-blue-500"
                  >
                    <option value="">-- Choose available hospital resource --</option>
                    {availableResources.map((res) => (
                      <option key={res.id} value={res.id}>
                        {res.name} ({res.resourceNumber}) — {res.type} [{res.departmentName || "General"}]
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Clinical Allocation Reason
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Admitted to acute bed for cardiac enzyme series and telemetry monitoring."
                  value={manualReason}
                  onChange={(e) => setManualReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 text-[11px]">
                Deterministic Guard: System checks double-booking, doctor concurrent limits, and maintenance status before committing.
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setManualPatient(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isAllocatingManual || !selectedResourceId}
                className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md transition disabled:opacity-50"
              >
                {isAllocatingManual ? "Allocating..." : "Confirm Allocation"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
