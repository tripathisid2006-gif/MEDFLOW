import React, { useState } from "react";
import {
  Layers,
  AlertTriangle,
  CheckCircle,
  Clock,
  UserMinus,
  RefreshCw,
  Search,
  ShieldAlert,
  X,
} from "lucide-react";
import type {
  ResourceAllocation,
  Resource,
  Patient,
  UserRole,
} from "../types";
import { releaseAllocationApi } from "../api";

interface AllocationsViewProps {
  allocations: ResourceAllocation[];
  resources: Resource[];
  patients: Patient[];
  currentRole: UserRole;
  currentUserName: string;
  onRefresh: () => void;
  onNavigate: (tab: string) => void;
}

export const AllocationsView: React.FC<AllocationsViewProps> = ({
  allocations,
  resources,
  patients,
  currentRole,
  currentUserName,
  onRefresh,
  onNavigate,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("ACTIVE");

  // Release Modal State
  const [releasingAllocation, setReleasingAllocation] = useState<ResourceAllocation | null>(null);
  const [releaseReason, setReleaseReason] = useState("");
  const [dischargePatient, setDischargePatient] = useState(false);
  const [isReleasing, setIsReleasing] = useState(false);

  // Active allocations
  const activeAllocations = allocations.filter((a) => a.status === "ACTIVE" || a.status === "FLAGGED_REVIEW");

  // Identify Conflicts & Flagged Allocations
  const flaggedAllocations = allocations.filter((a) => {
    if (a.status === "FLAGGED_REVIEW") return true;
    const res = resources.find((r) => r.id === a.resourceId);
    return res && (res.status === "MAINTENANCE" || res.status === "UNAVAILABLE");
  });

  // Resource Efficiency Detection: allocations active for > 60 mins
  const prolongedAllocations = activeAllocations.filter((a) => {
    const start = new Date(a.startTime).getTime();
    const elapsedMinutes = Math.floor((Date.now() - start) / (1000 * 60));
    return elapsedMinutes > 60;
  });

  // Filtered list
  const filtered = allocations.filter((a) => {
    const matchesStatus = filterStatus === "ALL" || a.status === filterStatus;
    const matchesSearch =
      a.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.resourceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.resourceNumber.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Handle Release
  const handleConfirmRelease = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!releasingAllocation) return;
    setIsReleasing(true);
    try {
      await releaseAllocationApi(
        releasingAllocation.id,
        `${currentUserName} (${currentRole})`,
        releaseReason || "Procedure completed, resource released.",
        currentRole,
        dischargePatient
      );
      setReleasingAllocation(null);
      setReleaseReason("");
      setDischargePatient(false);
      onRefresh();
    } catch (err: any) {
      alert("Failed to release allocation: " + err.message);
    } finally {
      setIsReleasing(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <Layers className="w-5 h-5 text-purple-400" />
            <span>Resource Allocations & Conflict Governance</span>
          </h2>
          <p className="text-xs text-slate-400">
            Audit trail of active clinical assignments, conflict alarms, and discharge releases.
          </p>
        </div>

        <button
          onClick={() => onNavigate("queue")}
          className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md transition"
        >
          View Priority Queue
        </button>
      </div>

      {/* Conflict & Efficiency Alert Panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Flagged / Maintenance Conflicts */}
        <div
          className={`p-4 rounded-xl border text-xs space-y-2 ${
            flaggedAllocations.length > 0
              ? "bg-red-950/40 border-red-800/80 text-red-200"
              : "bg-slate-900 border-slate-800 text-slate-400"
          }`}
        >
          <div className="flex items-center justify-between font-bold">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-400" />
              <span>Resource Conflict Detection ({flaggedAllocations.length})</span>
            </div>
            {flaggedAllocations.length > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded bg-red-900 text-red-100 font-mono">
                ACTION REQUIRED
              </span>
            )}
          </div>

          {flaggedAllocations.length === 0 ? (
            <p className="text-slate-400 text-xs">
              Zero active resource conflicts. All allocated physical assets and staff are within valid operating constraints.
            </p>
          ) : (
            <div className="space-y-2 pt-1">
              {flaggedAllocations.map((alloc) => (
                <div
                  key={alloc.id}
                  className="p-2.5 rounded-lg bg-slate-950 border border-red-900/60 text-[11px] flex items-center justify-between"
                >
                  <div>
                    <div className="font-semibold text-red-200">
                      {alloc.resourceName} ({alloc.resourceNumber}) is offline/in maintenance
                    </div>
                    <div className="text-slate-400">
                      Patient: <span className="text-slate-200">{alloc.patientName}</span> • Requires reassessment.
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setReleasingAllocation(alloc);
                      setReleaseReason("Releasing due to resource maintenance/failure.");
                    }}
                    className="px-2.5 py-1 rounded bg-red-900 hover:bg-red-800 text-red-100 text-xs font-semibold"
                  >
                    Resolve
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Resource Efficiency Review */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-2">
          <div className="flex items-center justify-between font-bold text-slate-200">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>Resource Efficiency Review ({prolongedAllocations.length})</span>
            </div>
            <span className="text-[10px] text-slate-400">Target &gt; 60 min</span>
          </div>

          {prolongedAllocations.length === 0 ? (
            <p className="text-slate-400 text-xs">
              All active allocations are within standard initial duration thresholds.
            </p>
          ) : (
            <div className="space-y-1.5 pt-1 max-h-36 overflow-y-auto pr-1">
              {prolongedAllocations.map((alloc) => {
                const elapsed = Math.floor(
                  (Date.now() - new Date(alloc.startTime).getTime()) / (1000 * 60)
                );
                return (
                  <div
                    key={alloc.id}
                    className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-[11px] flex items-center justify-between"
                  >
                    <div>
                      <span className="font-semibold text-slate-200">{alloc.patientName}</span> in{" "}
                      <span className="text-blue-300">{alloc.resourceName}</span> ({elapsed} min active)
                    </div>
                    <button
                      onClick={() => {
                        setReleasingAllocation(alloc);
                        setReleaseReason("Routine clinical discharge / transfer after procedure.");
                      }}
                      className="text-[11px] font-semibold text-amber-400 hover:text-amber-300"
                    >
                      Review allocation
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Main Allocations Table */}
      <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-white">Live Allocations Directory</h3>
            <p className="text-xs text-slate-400">Total recorded allocation events: {allocations.length}</p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Search patient, resource..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs w-56"
            />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs"
            >
              <option value="ACTIVE">Active Allocations</option>
              <option value="FLAGGED_REVIEW">Flagged for Review</option>
              <option value="COMPLETED">Completed / Released</option>
              <option value="ALL">All Records</option>
            </select>
          </div>
        </div>

        {allocations.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-400 space-y-2">
            <Layers className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="font-semibold text-slate-300">No allocations on record yet</p>
            <p className="text-slate-400">
              Assign resources to waiting patients in the Priority Queue to establish active clinical allocations.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No allocation records match your filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase font-semibold text-[11px] border-b border-slate-800">
                <tr>
                  <th className="px-3 py-2.5">Patient</th>
                  <th className="px-3 py-2.5">Resource</th>
                  <th className="px-3 py-2.5">Type</th>
                  <th className="px-3 py-2.5">Assigned Time</th>
                  <th className="px-3 py-2.5">Allocated By</th>
                  <th className="px-3 py-2.5">Reason</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filtered.map((alloc) => (
                  <tr key={alloc.id} className="hover:bg-slate-850/50 transition">
                    <td className="px-3 py-3">
                      <div className="font-semibold text-slate-100">{alloc.patientName}</div>
                      <div className="text-[10px] text-slate-400">
                        Priority: {alloc.priorityAtAllocation} pts ({alloc.patientUrgency})
                      </div>
                    </td>

                    <td className="px-3 py-3">
                      <div className="font-semibold text-blue-300">{alloc.resourceName}</div>
                      <div className="font-mono text-[10px] text-slate-400">{alloc.resourceNumber}</div>
                    </td>

                    <td className="px-3 py-3 text-slate-400 font-mono text-[11px]">
                      {alloc.resourceType}
                    </td>

                    <td className="px-3 py-3 text-slate-300 font-mono">
                      {new Date(alloc.startTime).toLocaleTimeString()}
                    </td>

                    <td className="px-3 py-3 text-slate-300">{alloc.allocatedBy}</td>

                    <td className="px-3 py-3 text-slate-400 max-w-xs truncate" title={alloc.allocationReason}>
                      {alloc.allocationReason}
                    </td>

                    <td className="px-3 py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          alloc.status === "ACTIVE"
                            ? "bg-blue-950 text-blue-300 border border-blue-800"
                            : alloc.status === "FLAGGED_REVIEW"
                            ? "bg-red-950 text-red-300 border border-red-800 animate-pulse"
                            : "bg-slate-950 text-slate-400 border border-slate-800"
                        }`}
                      >
                        {alloc.status}
                      </span>
                    </td>

                    <td className="px-3 py-3 text-right">
                      {alloc.status === "ACTIVE" || alloc.status === "FLAGGED_REVIEW" ? (
                        <button
                          onClick={() => {
                            setReleasingAllocation(alloc);
                            setReleaseReason("");
                            setDischargePatient(false);
                          }}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
                        >
                          Release Resource
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">Released</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Release Resource Modal */}
      {releasingAllocation && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleConfirmRelease}
            className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-5 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white">
                Release Resource: {releasingAllocation.resourceName}
              </h3>
              <button
                type="button"
                onClick={() => setReleasingAllocation(null)}
                className="p-1 text-slate-400 hover:text-slate-200 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-300 leading-relaxed">
                You are releasing <span className="font-semibold text-white">{releasingAllocation.resourceName}</span> ({releasingAllocation.resourceNumber}) from patient{" "}
                <span className="font-semibold text-white">{releasingAllocation.patientName}</span>.
              </p>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Reason for Release / Clinical Disposition *
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. Procedure complete, patient stable, transferred to general ward."
                  value={releaseReason}
                  onChange={(e) => setReleaseReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="discharge-patient-checkbox"
                  checked={dischargePatient}
                  onChange={(e) => setDischargePatient(e.target.checked)}
                  className="w-4 h-4 rounded bg-slate-950 border-slate-800 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="discharge-patient-checkbox" className="text-xs text-slate-300 cursor-pointer font-medium">
                  Fully discharge patient from hospital (sets status to DISCHARGED)
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setReleasingAllocation(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isReleasing}
                className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md transition disabled:opacity-50"
              >
                {isReleasing ? "Releasing..." : "Confirm & Release"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
