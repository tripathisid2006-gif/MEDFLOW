import React, { useState } from "react";
import {
  ListOrdered,
  Sparkles,
  CheckCircle2,
  Clock,
  AlertCircle,
  Info,
  ShieldCheck,
  X,
  User,
  HeartPulse,
  Activity,
  ArrowRight,
  Layers,
  ChevronRight,
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
  // Only queue patients who are in WAITING or TRIAGED status, sorted by priorityScore descending
  const queuePatients = patients
    .filter((p) => p.status === "WAITING" || p.status === "TRIAGED")
    .sort((a, b) => b.priorityScore - a.priorityScore);

  // Selected Patient for Clean Side Panel
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(
    queuePatients.length > 0 ? queuePatients[0] : null
  );

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

  // Trigger Smart Allocation Calculation
  const handleCalculateSmart = async () => {
    setIsCalculatingSmart(true);
    setSmartSuccessMsg(null);
    try {
      const plan = await computeSmartAllocationApi();
      setSmartPlan(plan);
    } catch (err: any) {
      alert("Failed to compute allocation: " + err.message);
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

  // Determine timeline step for selected patient
  const getTimelineStep = (p: Patient) => {
    if (p.status === "DISCHARGED") return 5;
    if (p.status === "ALLOCATED") return 4;
    if (p.priorityScore > 0) return 3;
    if (p.assessment || p.vitalSigns) return 2;
    return 1;
  };

  // Find allocation for selected patient if any
  const patientAllocation = selectedPatient
    ? allocations.find((a) => a.patientId === selectedPatient.id && a.status === "ACTIVE")
    : null;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header & Operational Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E8F0] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-[#243447] tracking-tight font-heading">
              Priority Queue
            </h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[#EAF4FF] text-[#1976D2]">
              {queuePatients.length} Waiting
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-0.5">
            Deterministic triage order with waiting-time fairness. Urgent cases prioritized safely.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            id="smart-allocate-btn"
            onClick={handleCalculateSmart}
            disabled={isCalculatingSmart || queuePatients.length === 0}
            className="px-4 py-2 rounded-lg bg-[#1976D2] hover:bg-[#1565C0] text-white text-xs font-semibold shadow-xs flex items-center gap-2 transition disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4 text-blue-100" />
            <span>{isCalculatingSmart ? "Calculating..." : "Smart Allocation"}</span>
          </button>

          <button
            onClick={() => onNavigate("patients")}
            className="px-3.5 py-2 rounded-lg bg-white border border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#243447] text-xs font-semibold transition"
          >
            Register Patient
          </button>
        </div>
      </div>

      {smartSuccessMsg && (
        <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{smartSuccessMsg}</span>
          </div>
          <button
            onClick={() => setSmartSuccessMsg(null)}
            className="text-xs font-semibold text-emerald-800 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Content Layout: Clean Table (Left) + Patient Details Side Panel (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Priority Table Container */}
        <div className="lg:col-span-7 medical-card overflow-hidden">
          <div className="p-4 border-b border-[#E2E8F0] flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
              Ordered Clinical Queue
            </h2>
            <span className="text-[11px] text-[#64748B]">Click row to view record</span>
          </div>

          {queuePatients.length === 0 ? (
            <div className="p-12 text-center text-xs text-[#64748B] space-y-2">
              <CheckCircle2 className="w-8 h-8 text-[#16A34A] mx-auto" />
              <p className="font-semibold text-[#243447]">No patients waiting</p>
              <p>All admitted patients have been allocated resources or discharged.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#F8FAFC] text-[#64748B] text-[11px] uppercase font-semibold border-b border-[#E2E8F0]">
                    <th className="px-3 py-2.5">Rank</th>
                    <th className="px-3 py-2.5">Patient / MRN</th>
                    <th className="px-3 py-2.5">Urgency</th>
                    <th className="px-3 py-2.5">Wait Time</th>
                    <th className="px-3 py-2.5">Department</th>
                    <th className="px-3 py-2.5 text-right">Score</th>
                    <th className="px-3 py-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {queuePatients.map((patient, index) => {
                    const isSelected = selectedPatient?.id === patient.id;
                    return (
                      <tr
                        key={patient.id}
                        onClick={() => setSelectedPatient(patient)}
                        className={`transition cursor-pointer ${
                          isSelected
                            ? "bg-[#EAF4FF]"
                            : "hover:bg-[#F8FAFC]"
                        }`}
                      >
                        <td className="px-3 py-3 font-mono font-bold text-[#64748B]">
                          #{index + 1}
                        </td>

                        <td className="px-3 py-3">
                          <div className="font-semibold text-[#243447]">{patient.name}</div>
                          <div className="font-mono text-[10px] text-[#64748B]">{patient.mrn}</div>
                        </td>

                        <td className="px-3 py-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                              patient.urgencyLevel === "CRITICAL"
                                ? "bg-red-50 text-red-700 border border-red-200"
                                : patient.urgencyLevel === "HIGH"
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : patient.urgencyLevel === "MODERATE"
                                ? "bg-blue-50 text-blue-700 border border-blue-200"
                                : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            }`}
                          >
                            {patient.urgencyLevel}
                          </span>
                        </td>

                        <td className="px-3 py-3 font-mono text-[#64748B]">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-[#94A3B8]" />
                            <span
                              className={
                                patient.waitingMinutes > (settings?.maxWaitingThresholdMinutes || 45)
                                  ? "text-[#DC2626] font-bold"
                                  : "text-[#243447]"
                              }
                            >
                              {patient.waitingMinutes}m
                            </span>
                          </div>
                        </td>

                        <td className="px-3 py-3 text-[#64748B]">
                          {patient.departmentName || "General"}
                        </td>

                        <td className="px-3 py-3 text-right font-mono font-bold text-[#1976D2]">
                          {patient.priorityScore}
                        </td>

                        <td className="px-3 py-3 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setManualPatient(patient);
                              setSelectedResourceId("");
                              setManualReason("");
                              setManualError(null);
                            }}
                            className="px-2.5 py-1 rounded bg-[#1976D2] hover:bg-[#1565C0] text-white text-[11px] font-semibold transition"
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

        {/* Clean Patient Details Side Panel */}
        <div className="lg:col-span-5 medical-card p-5 space-y-5">
          {selectedPatient ? (
            <>
              {/* Section 1: Patient Overview */}
              <div className="flex items-start justify-between border-b border-[#E2E8F0] pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-[#243447]">{selectedPatient.name}</h2>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        selectedPatient.urgencyLevel === "CRITICAL"
                          ? "bg-red-50 text-red-700 border border-red-200"
                          : selectedPatient.urgencyLevel === "HIGH"
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : selectedPatient.urgencyLevel === "MODERATE"
                          ? "bg-blue-50 text-blue-700 border border-blue-200"
                          : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      }`}
                    >
                      {selectedPatient.urgencyLevel}
                    </span>
                  </div>
                  <div className="text-xs text-[#64748B] mt-0.5 font-mono">
                    {selectedPatient.mrn} • {selectedPatient.age} yrs • {selectedPatient.gender}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] uppercase font-bold text-[#64748B]">Priority Score</div>
                  <div className="text-xl font-bold font-mono text-[#1976D2]">
                    {selectedPatient.priorityScore} pts
                  </div>
                </div>
              </div>

              {/* Section: Horizontal Timeline */}
              <div>
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] mb-2">
                  Clinical Timeline
                </h3>
                <div className="grid grid-cols-5 gap-1 text-center">
                  {[
                    { label: "Arrival", step: 1 },
                    { label: "Assessment", step: 2 },
                    { label: "Prioritization", step: 3 },
                    { label: "Allocation", step: 4 },
                    { label: "Treatment", step: 5 },
                  ].map((item) => {
                    const currentStep = getTimelineStep(selectedPatient);
                    const isDone = currentStep >= item.step;
                    const isCurrent = currentStep === item.step;
                    return (
                      <div key={item.label} className="space-y-1">
                        <div
                          className={`h-1.5 rounded-full transition ${
                            isDone ? "bg-[#1976D2]" : "bg-[#E2E8F0]"
                          }`}
                        />
                        <span
                          className={`text-[10px] block leading-tight ${
                            isCurrent
                              ? "font-bold text-[#1976D2]"
                              : isDone
                              ? "text-[#243447]"
                              : "text-[#94A3B8]"
                          }`}
                        >
                          {item.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Section 2: Current Assessment */}
              <div className="p-3.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-[#243447]">
                  <span className="flex items-center gap-1.5">
                    <HeartPulse className="w-3.5 h-3.5 text-[#1976D2]" />
                    <span>Current Clinical Assessment</span>
                  </span>
                  <span className="text-[10px] font-normal text-[#64748B]">
                    Wait: {selectedPatient.waitingMinutes}m
                  </span>
                </div>

                <p className="text-xs text-[#243447] leading-relaxed">
                  {selectedPatient.symptoms || "Admitted for clinical evaluation."}
                </p>

                {/* Vitals Summary */}
                {selectedPatient.vitalSigns && (
                  <div className="grid grid-cols-4 gap-2 pt-1 border-t border-[#E2E8F0] text-[11px]">
                    <div>
                      <span className="text-[#64748B] block text-[10px]">BP</span>
                      <strong className="text-[#243447]">
                        {selectedPatient.vitalSigns.bloodPressureSystolic && selectedPatient.vitalSigns.bloodPressureDiastolic
                          ? `${selectedPatient.vitalSigns.bloodPressureSystolic}/${selectedPatient.vitalSigns.bloodPressureDiastolic}`
                          : "—"}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[#64748B] block text-[10px]">Heart Rate</span>
                      <strong className="text-[#243447]">
                        {selectedPatient.vitalSigns.heartRate ? `${selectedPatient.vitalSigns.heartRate} bpm` : "—"}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[#64748B] block text-[10px]">SpO2</span>
                      <strong
                        className={
                          selectedPatient.vitalSigns.oxygenSaturation &&
                          selectedPatient.vitalSigns.oxygenSaturation < 92
                            ? "text-[#DC2626]"
                            : "text-[#243447]"
                        }
                      >
                        {selectedPatient.vitalSigns.oxygenSaturation
                          ? `${selectedPatient.vitalSigns.oxygenSaturation}%`
                          : "—"}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[#64748B] block text-[10px]">Temp</span>
                      <strong className="text-[#243447]">
                        {selectedPatient.vitalSigns.temperatureCelsius
                          ? `${selectedPatient.vitalSigns.temperatureCelsius}°C`
                          : "—"}
                      </strong>
                    </div>
                  </div>
                )}

                {/* Quiet AI Notice */}
                <div className="text-[10px] text-[#64748B] pt-1 italic">
                  AI-assisted assessment requires clinical review.
                </div>
              </div>

              {/* Section 3: Priority Explanation */}
              <div className="space-y-1">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                  Priority Explanation
                </h4>
                <p className="text-xs text-[#243447] leading-relaxed p-2.5 rounded-lg bg-white border border-[#E2E8F0]">
                  {selectedPatient.priorityExplanation || "Calculated using baseline urgency tier and waiting-time aging."}
                </p>
              </div>

              {/* Section 4: Required Resources & Allocation */}
              <div className="space-y-2">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                  Required Resources & Allocation
                </h4>
                <div className="p-3 rounded-lg bg-white border border-[#E2E8F0] space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[#64748B]">Required Treatment:</span>
                    <strong className="text-[#243447]">{selectedPatient.requiredTreatment}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#64748B]">Department:</span>
                    <strong className="text-[#243447]">{selectedPatient.departmentName || "General"}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#64748B]">Current Status:</span>
                    <strong className="text-[#1976D2]">{selectedPatient.status}</strong>
                  </div>
                  {patientAllocation && (
                    <div className="flex items-center justify-between pt-1 border-t border-[#E2E8F0] text-emerald-800">
                      <span>Allocated Resource:</span>
                      <strong>{patientAllocation.resourceName}</strong>
                    </div>
                  )}
                </div>
              </div>

              {/* Section 5: Actions */}
              <div className="pt-2 flex items-center gap-3">
                <button
                  onClick={() => {
                    setManualPatient(selectedPatient);
                    setSelectedResourceId("");
                    setManualReason("");
                    setManualError(null);
                  }}
                  className="flex-1 py-2 rounded-lg bg-[#1976D2] hover:bg-[#1565C0] text-white text-xs font-semibold shadow-xs transition text-center"
                >
                  Allocate Resource
                </button>
                <button
                  onClick={() => onNavigate("patients")}
                  className="px-4 py-2 rounded-lg bg-white border border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#243447] text-xs font-semibold transition"
                >
                  Edit Patient
                </button>
              </div>
            </>
          ) : (
            <div className="py-16 text-center text-xs text-[#64748B]">
              Select a patient from the queue to inspect clinical assessment and allocation status.
            </div>
          )}
        </div>
      </div>

      {/* ==================================================
          Requirement 18: SMART ALLOCATION CONFIRMATION PANEL
          ================================================== */}
      {smartPlan && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E8F0] rounded-xl max-w-2xl w-full p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#1976D2]" />
                <h3 className="text-base font-bold text-[#243447] font-heading">
                  SMART ALLOCATION
                </h3>
              </div>
              <button
                onClick={() => setSmartPlan(null)}
                className="p-1 text-[#64748B] hover:text-[#243447] rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-lg bg-[#EAF4FF] text-xs text-[#1976D2] leading-relaxed">
              <span className="font-bold">System Recommendation: </span>
              {smartPlan.summary}
            </div>

            {/* List of recommended allocations in Requirement 18 style */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
                Proposed Assignments ({smartPlan.feasibleAllocations.length})
              </h4>
              {smartPlan.feasibleAllocations.length === 0 ? (
                <div className="p-4 text-center text-xs text-[#64748B] bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
                  No feasible allocations found with currently available resources.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                  {smartPlan.feasibleAllocations.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[11px] text-[#64748B]">Patient: </span>
                          <strong className="text-[#243447]">{item.patientName}</strong>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                          {item.urgencyLevel}
                        </span>
                      </div>

                      <div className="text-xs">
                        <span className="text-[#64748B]">Recommended: </span>
                        <strong className="text-[#1976D2]">{item.resourceName} ({item.resourceNumber})</strong>
                      </div>

                      <div className="text-[11px] text-[#64748B] space-y-0.5 pt-1 border-t border-[#E2E8F0]">
                        <div className="font-semibold text-[#243447]">Why:</div>
                        <div>• Priority score: {item.priorityScore} points confirmed</div>
                        <div>• Clinical resource requirement verified</div>
                        <div>• Resource is currently available with zero scheduling conflict</div>
                        <div>• {item.justification}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Unallocated Patients if any */}
            {smartPlan.unallocatedPatients.length > 0 && (
              <div className="pt-2 border-t border-[#E2E8F0] space-y-1.5">
                <h4 className="text-xs font-bold text-[#F59E0B]">
                  Unallocated Waiting Cases ({smartPlan.unallocatedPatients.length})
                </h4>
                <div className="space-y-1 text-xs text-[#64748B] max-h-24 overflow-y-auto">
                  {smartPlan.unallocatedPatients.map((u, i) => (
                    <div key={i} className="flex items-center justify-between p-1.5 bg-[#FFFBEB] rounded">
                      <span className="font-medium text-[#243447]">{u.patientName}</span>
                      <span className="text-[11px] text-[#92400E]">{u.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Modal Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E2E8F0]">
              <button
                onClick={() => setSmartPlan(null)}
                className="px-4 py-2 rounded-lg bg-white border border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#243447] text-xs font-semibold transition"
              >
                Review Allocation
              </button>
              <button
                onClick={handleExecuteSmart}
                disabled={isExecutingSmart || smartPlan.feasibleAllocations.length === 0}
                className="px-5 py-2 rounded-lg bg-[#1976D2] hover:bg-[#1565C0] text-white text-xs font-semibold shadow-xs transition disabled:opacity-50"
              >
                {isExecutingSmart ? "Confirming..." : "Confirm Allocation"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Allocation Modal */}
      {manualPatient && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <form
            onSubmit={handleManualAllocate}
            className="bg-white border border-[#E2E8F0] rounded-xl max-w-lg w-full p-5 shadow-xl space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <div>
                <h3 className="text-sm font-bold text-[#243447]">
                  Allocate Resource: {manualPatient.name}
                </h3>
                <p className="text-xs text-[#64748B]">
                  MRN: {manualPatient.mrn} • {manualPatient.urgencyLevel} ({manualPatient.priorityScore} pts)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setManualPatient(null)}
                className="p-1 text-[#64748B] hover:text-[#243447] rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {manualError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{manualError}</span>
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-[#243447] mb-1">Select Available Resource</label>
                <select
                  value={selectedResourceId}
                  onChange={(e) => setSelectedResourceId(e.target.value)}
                  required
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-2 text-xs text-[#243447] focus:outline-none focus:border-[#1976D2] focus:bg-white"
                >
                  <option value="">-- Choose an available resource --</option>
                  {availableResources.map((res) => (
                    <option key={res.id} value={res.id}>
                      {res.name} ({res.resourceNumber}) • {res.type} • {res.departmentName || "Facility"}
                    </option>
                  ))}
                </select>
                {availableResources.length === 0 && (
                  <p className="text-[11px] text-[#DC2626] mt-1">
                    No resources are currently marked as available.
                  </p>
                )}
              </div>

              <div>
                <label className="block font-semibold text-[#243447] mb-1">Clinical Justification</label>
                <input
                  type="text"
                  value={manualReason}
                  onChange={(e) => setManualReason(e.target.value)}
                  placeholder="e.g. Urgent ICU bed allocation per physician order"
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-2 text-xs text-[#243447] focus:outline-none focus:border-[#1976D2] focus:bg-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E2E8F0]">
              <button
                type="button"
                onClick={() => setManualPatient(null)}
                className="px-4 py-2 rounded-lg bg-white border border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#243447] text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isAllocatingManual || !selectedResourceId}
                className="px-4 py-2 rounded-lg bg-[#1976D2] hover:bg-[#1565C0] text-white text-xs font-semibold shadow-xs disabled:opacity-50"
              >
                {isAllocatingManual ? "Allocating..." : "Confirm Assignment"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
