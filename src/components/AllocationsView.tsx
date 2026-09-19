import React, { useState } from "react";
import {
  Layers,
  AlertTriangle,
  CheckCircle,
  Clock,
  Search,
  ShieldAlert,
  X,
  CheckCircle2,
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
  const activeAllocations = allocations.filter(
    (a) => a.status === "ACTIVE" || a.status === "FLAGGED_REVIEW"
  );

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E8F0] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-[#243447] tracking-tight font-heading">
              Resource Allocations & Utilization
            </h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[#EAF4FF] text-[#1976D2]">
              {activeAllocations.length} Active Assignments
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-0.5">
            Audit trail of active clinical assignments, conflict alarms, and discharge releases.
          </p>
        </div>

        <button
          onClick={() => onNavigate("queue")}
          className="px-4 py-2 rounded-lg bg-[#1976D2] hover:bg-[#1565C0] text-white text-xs font-semibold shadow-xs transition"
        >
          View Priority Queue
        </button>
      </div>

      {/* Conflict & Efficiency Alert Panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Conflict Detection */}
        <div
          className={`medical-card p-4 text-xs space-y-2 ${
            flaggedAllocations.length > 0 ? "border-red-200 bg-red-50/50" : ""
          }`}
        >
          <div className="flex items-center justify-between font-bold">
            <div className="flex items-center gap-2">
              <ShieldAlert
                className={`w-4 h-4 ${
                  flaggedAllocations.length > 0 ? "text-red-600" : "text-[#0F9D8A]"
                }`}
              />
              <span className="text-[#243447]">
                Resource Conflict Detection ({flaggedAllocations.length})
              </span>
            </div>
            {flaggedAllocations.length > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded bg-red-600 text-white font-semibold">
                ACTION REQUIRED
              </span>
            )}
          </div>

          {flaggedAllocations.length === 0 ? (
            <p className="text-[#64748B] text-xs">
              Zero active resource conflicts. All allocated assets and staff are operating within normal parameters.
            </p>
          ) : (
            <div className="space-y-2 pt-1">
              {flaggedAllocations.map((alloc) => (
                <div
                  key={alloc.id}
                  className="p-2.5 rounded-lg bg-white border border-red-200 text-[11px] flex items-center justify-between"
                >
                  <div>
                    <div className="font-semibold text-red-800">
                      {alloc.resourceName} ({alloc.resourceNumber}) is offline/in maintenance
                    </div>
                    <div className="text-[#64748B]">
                      Patient: <strong className="text-[#243447]">{alloc.patientName}</strong> • Requires reassessment.
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setReleasingAllocation(alloc);
                      setReleaseReason("Releasing due to resource maintenance/failure.");
                    }}
                    className="px-2.5 py-1 rounded bg-red-600 hover:bg-red-700 text-white text-xs font-semibold"
                  >
                    Resolve
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Resource Efficiency Review */}
        <div className="medical-card p-4 text-xs space-y-2">
          <div className="flex items-center justify-between font-bold text-[#243447]">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#F59E0B]" />
              <span>Resource Duration Review ({prolongedAllocations.length})</span>
            </div>
            <span className="text-[10px] text-[#64748B]">Target: &gt; 60 min</span>
          </div>

          {prolongedAllocations.length === 0 ? (
            <p className="text-[#64748B] text-xs">
              All active allocations are within standard initial duration expectations.
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
                    className="p-2 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-[11px] flex items-center justify-between"
                  >
                    <div>
                      <strong className="text-[#243447]">{alloc.patientName}</strong> in{" "}
                      <span className="text-[#1976D2]">{alloc.resourceName}</span> ({elapsed} min active)
                    </div>
                    <button
                      onClick={() => {
                        setReleasingAllocation(alloc);
                        setReleaseReason("Routine clinical discharge / transfer after procedure.");
                      }}
                      className="text-[11px] font-semibold text-[#1976D2] hover:underline"
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
      <div className="medical-card overflow-hidden">
        <div className="p-4 border-b border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-[#243447]">Live Allocations Directory</h2>
            <p className="text-xs text-[#64748B]">Total recorded allocation events: {allocations.length}</p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search patient, resource..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-[#243447] focus:outline-none focus:border-[#1976D2] w-52"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-[#243447]"
            >
              <option value="ACTIVE">Active Allocations</option>
              <option value="FLAGGED_REVIEW">Flagged for Review</option>
              <option value="COMPLETED">Completed / Released</option>
              <option value="ALL">All Records</option>
            </select>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#64748B]">
            No allocations found matching the selected filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-[#F8FAFC] text-[#64748B] text-[11px] uppercase font-semibold border-b border-[#E2E8F0]">
                  <th className="px-4 py-3">Patient</th>
                  <th className="px-4 py-3">Allocated Resource</th>
                  <th className="px-4 py-3">Assigned By</th>
                  <th className="px-4 py-3">Start Time</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {filtered.map((alloc) => {
                  const isActive = alloc.status === "ACTIVE";
                  return (
                    <tr key={alloc.id} className="hover:bg-[#F8FAFC] transition">
                      <td className="px-4 py-3 font-semibold text-[#243447]">
                        {alloc.patientName}
                      </td>

                      <td className="px-4 py-3">
                        <div className="font-semibold text-[#1976D2]">
                          {alloc.resourceName}
                        </div>
                        <div className="text-[10px] text-[#64748B] font-mono">
                          {alloc.resourceNumber}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-[#64748B]">
                        {alloc.allocatedBy}
                      </td>

                      <td className="px-4 py-3 font-mono text-[#64748B]">
                        {new Date(alloc.startTime).toLocaleTimeString()}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                            isActive
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : alloc.status === "FLAGGED_REVIEW"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-slate-100 text-slate-700 border border-slate-200"
                          }`}
                        >
                          {alloc.status}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-right">
                        {isActive && (
                          <button
                            onClick={() => {
                              setReleasingAllocation(alloc);
                              setReleaseReason("");
                              setDischargePatient(false);
                            }}
                            className="px-2.5 py-1 rounded bg-white border border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#243447] text-[11px] font-semibold transition"
                          >
                            Release
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Release Modal */}
      {releasingAllocation && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <form
            onSubmit={handleConfirmRelease}
            className="bg-white border border-[#E2E8F0] rounded-xl max-w-md w-full p-5 shadow-xl space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <h3 className="text-sm font-bold text-[#243447]">Release Allocated Resource</h3>
              <button
                type="button"
                onClick={() => setReleasingAllocation(null)}
                className="p-1 text-[#64748B] hover:text-[#243447] rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] space-y-1">
                <div>
                  <span className="text-[#64748B]">Patient:</span>{" "}
                  <strong className="text-[#243447]">{releasingAllocation.patientName}</strong>
                </div>
                <div>
                  <span className="text-[#64748B]">Resource:</span>{" "}
                  <strong className="text-[#1976D2]">
                    {releasingAllocation.resourceName} ({releasingAllocation.resourceNumber})
                  </strong>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#243447] mb-1">Release Reason / Discharge Notes</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Procedure complete, patient moved to recovery"
                  value={releaseReason}
                  onChange={(e) => setReleaseReason(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-2 text-xs text-[#243447] focus:outline-none focus:border-[#1976D2]"
                />
              </div>

              <label className="flex items-center gap-2 font-medium text-[#243447] pt-1">
                <input
                  type="checkbox"
                  checked={dischargePatient}
                  onChange={(e) => setDischargePatient(e.target.checked)}
                  className="rounded text-[#1976D2] border-[#E2E8F0]"
                />
                <span>Also mark patient as discharged from hospital</span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E2E8F0]">
              <button
                type="button"
                onClick={() => setReleasingAllocation(null)}
                className="px-4 py-2 rounded-lg bg-white border border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#243447] text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isReleasing}
                className="px-4 py-2 rounded-lg bg-[#1976D2] hover:bg-[#1565C0] text-white text-xs font-semibold shadow-xs disabled:opacity-50"
              >
                {isReleasing ? "Releasing..." : "Confirm Release"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
