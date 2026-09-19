import React, { useState } from "react";
import {
  Building2,
  Users,
  Bed,
  Plus,
  Stethoscope,
  Activity,
  X,
} from "lucide-react";
import type {
  Department,
  Patient,
  Resource,
  UserRole,
} from "../types";
import { createDepartmentApi } from "../api";

interface DepartmentsViewProps {
  departments: Department[];
  patients: Patient[];
  resources: Resource[];
  currentRole: UserRole;
  currentUserName: string;
  onRefresh: () => void;
  onNavigate: (tab: string) => void;
}

export const DepartmentsView: React.FC<DepartmentsViewProps> = ({
  departments,
  patients,
  resources,
  onRefresh,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [floor, setFloor] = useState("");
  const [head, setHead] = useState("");
  const [capacity, setCapacity] = useState(20);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Compute departmental live metrics
  const getDeptMetrics = (dept: Department) => {
    const deptPatients = patients.filter(
      (p) => p.departmentId === dept.id || p.departmentName === dept.name
    );
    const activePatients = deptPatients.filter((p) => p.status !== "DISCHARGED");
    const waitingPatients = deptPatients.filter((p) => p.status === "WAITING" || p.status === "TRIAGED");

    const deptResources = resources.filter(
      (r) => r.departmentId === dept.id || r.departmentName === dept.name
    );
    const beds = deptResources.filter((r) => r.type === "BED" || r.type === "ICU_BED");
    const occupiedBeds = beds.filter((b) => b.status === "IN_USE").length;
    const totalBeds = beds.length || dept.bedCapacity || dept.maxCapacity || 0;
    const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

    const doctors = deptResources.filter((r) => r.type === "DOCTOR");
    const nurses = deptResources.filter((r) => r.type === "NURSE");

    return {
      activePatientsCount: activePatients.length,
      waitingPatientsCount: waitingPatients.length,
      occupiedBeds,
      totalBeds,
      occupancyRate,
      doctorsCount: doctors.length,
      nursesCount: nurses.length,
    };
  };

  const handleAddDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) return;
    setIsSubmitting(true);
    try {
      await createDepartmentApi({
        name: name.trim(),
        code: code.trim().toUpperCase(),
        floor: floor.trim() || "Floor 1",
        headOfDepartment: head.trim() || "Attending Physician",
        bedCapacity: Number(capacity) || 20,
      });
      setShowAddModal(false);
      setName("");
      setCode("");
      setFloor("");
      setHead("");
      onRefresh();
    } catch (err: any) {
      alert("Failed to add department: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-400" />
            <span>Hospital Departments & Clinical Units</span>
          </h2>
          <p className="text-xs text-slate-400">
            Unit-level capacity tracking, clinical occupancy, and staffing distribution.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md flex items-center gap-2 transition"
        >
          <Plus className="w-4 h-4" />
          <span>Add Department</span>
        </button>
      </div>

      {/* Departments Grid */}
      {departments.length === 0 ? (
        <div className="p-12 text-center text-xs text-slate-400 bg-slate-900 border border-slate-800 rounded-xl">
          No clinical departments registered. Click &ldquo;Add Department&rdquo; to configure units.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {departments.map((dept) => {
            const m = getDeptMetrics(dept);
            return (
              <div
                key={dept.id}
                className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-4 hover:border-slate-700 transition"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-blue-950 border border-blue-800 text-blue-400">
                        {dept.code}
                      </span>
                      <h3 className="text-sm font-bold text-white">{dept.name}</h3>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      {dept.floor} • Head: {dept.headOfDepartment}
                    </div>
                  </div>
                </div>

                {/* Occupancy bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Bed Occupancy:</span>
                    <span className="font-mono font-semibold text-slate-200">
                      {m.occupiedBeds} / {m.totalBeds} ({m.occupancyRate}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        m.occupancyRate > 90
                          ? "bg-red-500"
                          : m.occupancyRate > 70
                          ? "bg-amber-500"
                          : "bg-blue-500"
                      }`}
                      style={{ width: `${Math.min(m.occupancyRate, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Metrics 3-Col Box */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80 text-center">
                  <div className="p-2 rounded-lg bg-slate-950 border border-slate-800/80">
                    <div className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
                      <Users className="w-3 h-3" />
                      <span>Active</span>
                    </div>
                    <div className="mt-1 font-mono font-bold text-sm text-white">{m.activePatientsCount}</div>
                  </div>

                  <div className="p-2 rounded-lg bg-slate-950 border border-slate-800/80">
                    <div className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
                      <Users className="w-3 h-3 text-amber-400" />
                      <span>Waiting</span>
                    </div>
                    <div className="mt-1 font-mono font-bold text-sm text-amber-400">{m.waitingPatientsCount}</div>
                  </div>

                  <div className="p-2 rounded-lg bg-slate-950 border border-slate-800/80">
                    <div className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
                      <Stethoscope className="w-3 h-3 text-blue-400" />
                      <span>Staff</span>
                    </div>
                    <div className="mt-1 font-mono font-bold text-sm text-blue-300">
                      {m.doctorsCount + m.nursesCount}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Department Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleAddDept}
            className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-5 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white">Add Hospital Department</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 text-slate-400 hover:text-slate-200 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Department Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cardiology & Cath Lab"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Department Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CARD"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-xs uppercase"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Floor / Wing</label>
                  <input
                    type="text"
                    placeholder="e.g. Floor 3, North Wing"
                    value={floor}
                    onChange={(e) => setFloor(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Head of Department / Lead</label>
                <input
                  type="text"
                  placeholder="e.g. Dr. Elena Vance, MD"
                  value={head}
                  onChange={(e) => setHead(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Bed Capacity Target</label>
                <input
                  type="number"
                  min="1"
                  value={capacity}
                  onChange={(e) => setCapacity(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md transition disabled:opacity-50"
              >
                {isSubmitting ? "Creating..." : "Save Department"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
