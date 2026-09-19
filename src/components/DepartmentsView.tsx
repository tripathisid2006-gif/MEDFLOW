import React, { useState } from "react";
import {
  Building2,
  Users,
  Bed,
  Plus,
  Stethoscope,
  Activity,
  X,
  Clock,
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
  onNavigate,
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
    const waitingPatients = deptPatients.filter(
      (p) => p.status === "WAITING" || p.status === "TRIAGED"
    );

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E8F0] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-[#243447] tracking-tight font-heading">
              Clinical Departments & Wards
            </h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[#EAF4FF] text-[#1976D2]">
              {departments.length} Units
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-0.5">
            Ward layout, capacity allocation, unit heads, and live patient distribution.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 rounded-lg bg-[#1976D2] hover:bg-[#1565C0] text-white text-xs font-semibold shadow-xs flex items-center gap-2 transition"
        >
          <Plus className="w-4 h-4" />
          <span>Add Department</span>
        </button>
      </div>

      {/* Departments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {departments.map((dept) => {
          const metrics = getDeptMetrics(dept);
          const isHighOccupancy = metrics.occupancyRate >= 85;

          return (
            <div
              key={dept.id}
              className="medical-card p-5 flex flex-col justify-between space-y-4 hover:border-[#CBD5E1] transition"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#F1F5F9] text-[#475569]">
                      {dept.code}
                    </span>
                    <h2 className="text-base font-bold text-[#243447] mt-1">{dept.name}</h2>
                    <p className="text-xs text-[#64748B]">{dept.floor || "Main Building"}</p>
                  </div>

                  <div className="text-right">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        isHighOccupancy
                          ? "bg-red-50 text-red-700 border border-red-200"
                          : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      }`}
                    >
                      {metrics.occupancyRate}% Occupancy
                    </span>
                  </div>
                </div>

                <div className="mt-3 text-xs text-[#64748B]">
                  <span className="text-[#243447] font-semibold">Head of Unit: </span>
                  {dept.headOfDepartment || "Attending Consultant"}
                </div>

                {/* Bed Utilization Bar */}
                <div className="mt-3 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#64748B]">Bed Capacity</span>
                    <span className="font-mono font-bold text-[#243447]">
                      {metrics.occupiedBeds} / {metrics.totalBeds} beds
                    </span>
                  </div>
                  <div className="w-full bg-[#E2E8F0] h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        isHighOccupancy ? "bg-[#DC2626]" : "bg-[#1976D2]"
                      }`}
                      style={{ width: `${Math.min(metrics.occupancyRate, 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Bottom Metrics: Waiting, Staff, Inspect */}
              <div className="pt-3 border-t border-[#E2E8F0] flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 text-[#64748B]">
                    <Clock className="w-3.5 h-3.5 text-[#F59E0B]" />
                    <span>{metrics.waitingPatientsCount} waiting</span>
                  </span>
                  <span className="flex items-center gap-1 text-[#64748B]">
                    <Users className="w-3.5 h-3.5 text-[#1976D2]" />
                    <span>{metrics.activePatientsCount} active</span>
                  </span>
                </div>

                <button
                  onClick={() => onNavigate("patients")}
                  className="text-xs font-semibold text-[#1976D2] hover:underline"
                >
                  View Ward →
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Department Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <form
            onSubmit={handleAddDept}
            className="bg-white border border-[#E2E8F0] rounded-xl max-w-md w-full p-5 shadow-xl space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <h3 className="text-sm font-bold text-[#243447]">Add Clinical Department</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 text-[#64748B] hover:text-[#243447] rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-[#243447] mb-1">Department Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Oncology & Chemotherapy Unit"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-2 text-xs text-[#243447] focus:outline-none focus:border-[#1976D2]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#243447] mb-1">Code / Prefix *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ONCO"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-2 text-xs text-[#243447]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#243447] mb-1">Bed Capacity</label>
                  <input
                    type="number"
                    value={capacity}
                    onChange={(e) => setCapacity(Number(e.target.value))}
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-2 text-xs text-[#243447]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#243447] mb-1">Floor / Wing Location</label>
                <input
                  type="text"
                  placeholder="e.g. 4th Floor, Block C"
                  value={floor}
                  onChange={(e) => setFloor(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-2 text-xs text-[#243447]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#243447] mb-1">Head of Department</label>
                <input
                  type="text"
                  placeholder="e.g. Dr. Sudhir Shenoy, MD, DM"
                  value={head}
                  onChange={(e) => setHead(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-2 text-xs text-[#243447]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E2E8F0]">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-lg bg-white border border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#243447] text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 rounded-lg bg-[#1976D2] hover:bg-[#1565C0] text-white text-xs font-semibold shadow-xs disabled:opacity-50"
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
