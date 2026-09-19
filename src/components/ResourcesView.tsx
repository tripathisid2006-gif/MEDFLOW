import React, { useState } from "react";
import {
  Server,
  Plus,
  Wrench,
  Bed,
  HeartPulse,
  Syringe,
  Users,
  Ambulance as AmbulanceIcon,
  ShieldCheck,
  X,
  Search,
  CheckCircle2,
} from "lucide-react";
import type {
  Resource,
  ResourceType,
  ResourceState,
  Department,
  UserRole,
} from "../types";
import { createResourceApi, updateResourceApi } from "../api";

interface ResourcesViewProps {
  resources: Resource[];
  departments: Department[];
  currentRole: UserRole;
  currentUserName: string;
  onRefresh: () => void;
  onInitUnits: () => void;
}

export const ResourcesView: React.FC<ResourcesViewProps> = ({
  resources,
  departments,
  currentRole,
  currentUserName,
  onRefresh,
  onInitUnits,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Add Resource Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newNumber, setNewNumber] = useState("");
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<ResourceType>("BED");
  const [newDeptId, setNewDeptId] = useState("");
  const [newCapacity, setNewCapacity] = useState(1);
  const [newLocation, setNewLocation] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Status/Maintenance Modal State
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [editStatus, setEditStatus] = useState<ResourceState>("AVAILABLE");
  const [maintenanceReason, setMaintenanceReason] = useState("");
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Requirement 17: Clean Categories with Dynamic Calculations
  // Beds, ICU, Operating Rooms, Staff, Ambulances, Equipment
  const categories = [
    {
      id: "BED",
      label: "Beds",
      icon: Bed,
      types: ["BED"],
    },
    {
      id: "ICU",
      label: "ICU",
      icon: HeartPulse,
      types: ["ICU_BED"],
    },
    {
      id: "OR",
      label: "Operating Rooms",
      icon: Syringe,
      types: ["OPERATING_ROOM"],
    },
    {
      id: "STAFF",
      label: "Staff",
      icon: Users,
      types: ["DOCTOR", "NURSE"],
    },
    {
      id: "AMBULANCES",
      label: "Ambulances",
      icon: AmbulanceIcon,
      types: ["AMBULANCE"],
    },
    {
      id: "EQUIPMENT",
      label: "Equipment",
      icon: Server,
      types: ["VENTILATOR", "EQUIPMENT"],
    },
  ];

  // Helper to calculate statistics for a given set of types
  const getCategoryStats = (types: string[]) => {
    const list = resources.filter((r) => types.includes(r.type));
    const total = list.length;
    const inUse = list.filter((r) => r.status === "IN_USE").length;
    const available = list.filter((r) => r.status === "AVAILABLE").length;
    const reserved = list.filter((r) => r.status === "RESERVED").length;
    const maintenance = list.filter((r) => r.status === "MAINTENANCE" || r.status === "UNAVAILABLE").length;
    const utilizationPct = total > 0 ? Math.round((inUse / total) * 100) : 0;

    return {
      total,
      inUse,
      available,
      reserved,
      maintenance,
      utilizationPct,
    };
  };

  // Filtered resources list
  const filteredResources = resources.filter((res) => {
    let matchesCategory = true;
    if (activeCategory !== "ALL") {
      const selectedCat = categories.find((c) => c.id === activeCategory);
      if (selectedCat) {
        matchesCategory = selectedCat.types.includes(res.type);
      }
    }

    const matchesSearch =
      res.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      res.resourceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (res.departmentName && res.departmentName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (res.assignedPatientName && res.assignedPatientName.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesCategory && matchesSearch;
  });

  // Add Resource Handler
  const handleAddResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNumber.trim() || !newName.trim()) return;
    setIsSubmitting(true);
    try {
      const dept = departments.find((d) => d.id === newDeptId);
      await createResourceApi({
        resourceNumber: newNumber.trim(),
        name: newName.trim(),
        type: newType,
        departmentId: newDeptId,
        departmentName: dept?.name,
        capacity: Number(newCapacity) || 1,
        location: newLocation,
        status: "AVAILABLE",
      });
      setShowAddModal(false);
      setNewNumber("");
      setNewName("");
      setNewLocation("");
      onRefresh();
    } catch (err: any) {
      alert("Failed to create resource: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update Status Handler
  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingResource) return;
    setIsUpdatingStatus(true);
    try {
      await updateResourceApi(
        editingResource.id,
        {
          status: editStatus,
          maintenanceReason:
            editStatus === "MAINTENANCE" || editStatus === "UNAVAILABLE"
              ? maintenanceReason
              : undefined,
          lastMaintainedAt:
            editStatus === "AVAILABLE" ? new Date().toISOString() : editingResource.lastMaintainedAt,
        },
        `${currentUserName} (${currentRole})`
      );
      setEditingResource(null);
      onRefresh();
    } catch (err: any) {
      alert("Failed to update resource status: " + err.message);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E8F0] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-[#243447] tracking-tight font-heading">
              Hospital Resources
            </h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[#EAF4FF] text-[#1976D2]">
              {resources.length} Total Units
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-0.5">
            Operational capacity, bed management, clinical equipment, and staff availability.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {resources.length === 0 && (
            <button
              onClick={onInitUnits}
              className="px-3.5 py-2 rounded-lg bg-[#0F9D8A] hover:bg-[#0c8575] text-white text-xs font-semibold shadow-xs flex items-center gap-2 transition"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Initialize Standard Units</span>
            </button>
          )}

          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 rounded-lg bg-[#1976D2] hover:bg-[#1565C0] text-white text-xs font-semibold shadow-xs flex items-center gap-2 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Resource</span>
          </button>
        </div>
      </div>

      {/* ==================================================
          Requirement 17: CATEGORY CARDS WITH PROGRESS INDICATORS
          Beds | ICU | Operating Rooms | Staff | Ambulances | Equipment
          ================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((cat) => {
          const stats = getCategoryStats(cat.types);
          const Icon = cat.icon;
          const isSelected = activeCategory === cat.id;

          return (
            <div
              key={cat.id}
              onClick={() => setActiveCategory(activeCategory === cat.id ? "ALL" : cat.id)}
              className={`medical-card p-4.5 cursor-pointer transition flex flex-col justify-between ${
                isSelected
                  ? "border-[#1976D2] ring-1 ring-[#1976D2] bg-[#F7FAFC]"
                  : "hover:border-[#CBD5E1]"
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[#EAF4FF] text-[#1976D2] flex items-center justify-center">
                      <Icon className="w-4 h-4" />
                    </div>
                    <h2 className="text-sm font-bold text-[#243447]">{cat.label}</h2>
                  </div>
                  <span className="text-xs font-mono font-bold text-[#1976D2]">
                    {stats.available} available
                  </span>
                </div>

                {/* Occupancy & Utilization sentence */}
                <div className="mt-3 text-xs text-[#243447] flex items-center justify-between font-medium">
                  <span>
                    <strong>{stats.inUse}</strong> / {stats.total} occupied
                  </span>
                  <span className="text-[#64748B] font-mono">{stats.utilizationPct}% utilization</span>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-[#E2E8F0] h-2 rounded-full overflow-hidden mt-1.5">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      stats.utilizationPct > 85
                        ? "bg-[#DC2626]"
                        : stats.utilizationPct > 65
                        ? "bg-[#F59E0B]"
                        : "bg-[#1976D2]"
                    }`}
                    style={{ width: `${Math.min(stats.utilizationPct, 100)}%` }}
                  />
                </div>
              </div>

              {/* Status Breakdown Pills */}
              <div className="grid grid-cols-4 gap-1 text-center pt-3 mt-3 border-t border-[#E2E8F0] text-[10px]">
                <div className="bg-[#E8F7F4] text-[#0F9D8A] p-1 rounded font-semibold">
                  <div>{stats.available}</div>
                  <div className="text-[9px] font-normal">Available</div>
                </div>
                <div className="bg-[#EAF4FF] text-[#1976D2] p-1 rounded font-semibold">
                  <div>{stats.inUse}</div>
                  <div className="text-[9px] font-normal">In Use</div>
                </div>
                <div className="bg-[#F1F5F9] text-[#64748B] p-1 rounded font-semibold">
                  <div>{stats.reserved}</div>
                  <div className="text-[9px] font-normal">Reserved</div>
                </div>
                <div className="bg-[#FEF2F2] text-[#DC2626] p-1 rounded font-semibold">
                  <div>{stats.maintenance}</div>
                  <div className="text-[9px] font-normal">Maint.</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveCategory("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeCategory === "ALL"
                ? "bg-[#1976D2] text-white shadow-xs"
                : "bg-white text-[#64748B] border border-[#E2E8F0] hover:bg-[#F8FAFC]"
            }`}
          >
            All Resources ({resources.length})
          </button>
          {activeCategory !== "ALL" && (
            <span className="text-xs text-[#64748B]">
              Filtered by: <strong>{activeCategory}</strong>
            </span>
          )}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by ID, name, ward, patient..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-[#E2E8F0] rounded-lg pl-9 pr-3 py-1.5 text-xs text-[#243447] placeholder-[#94A3B8] focus:outline-none focus:border-[#1976D2]"
          />
        </div>
      </div>

      {/* Resources Table */}
      <div className="medical-card overflow-hidden">
        {filteredResources.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#64748B] space-y-2">
            <Server className="w-8 h-8 text-[#94A3B8] mx-auto" />
            <p className="font-semibold text-[#243447]">No resources found</p>
            <p>No inventory matches your active filter or search criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-[#F8FAFC] text-[#64748B] text-[11px] uppercase font-semibold border-b border-[#E2E8F0]">
                  <th className="px-4 py-3">ID / Code</th>
                  <th className="px-4 py-3">Resource Name</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Department & Location</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Assigned Patient</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {filteredResources.map((res) => {
                  const isAvailable = res.status === "AVAILABLE";
                  const isInUse = res.status === "IN_USE";
                  const isMaintenance = res.status === "MAINTENANCE" || res.status === "UNAVAILABLE";

                  return (
                    <tr key={res.id} className="hover:bg-[#F8FAFC] transition">
                      <td className="px-4 py-3 font-mono font-bold text-[#1976D2]">
                        {res.resourceNumber}
                      </td>

                      <td className="px-4 py-3 font-semibold text-[#243447]">
                        {res.name}
                      </td>

                      <td className="px-4 py-3 text-[#64748B]">
                        <span className="px-2 py-0.5 rounded bg-[#F1F5F9] text-[#475569] text-[11px] font-medium">
                          {res.type.replace("_", " ")}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-[#64748B]">
                        <div>{res.departmentName || "General Facility"}</div>
                        {res.location && (
                          <div className="text-[10px] text-[#94A3B8]">{res.location}</div>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                            isAvailable
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : isInUse
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : isMaintenance
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-slate-100 text-slate-700 border border-slate-200"
                          }`}
                        >
                          {res.status}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-[#243447]">
                        {res.assignedPatientName ? (
                          <span className="font-medium text-[#1976D2]">
                            {res.assignedPatientName}
                          </span>
                        ) : (
                          <span className="text-[#94A3B8] italic">None</span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => {
                            setEditingResource(res);
                            setEditStatus(res.status);
                            setMaintenanceReason(res.maintenanceReason || "");
                          }}
                          className="px-2.5 py-1 rounded bg-white border border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#243447] text-[11px] font-semibold transition"
                        >
                          Manage Status
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

      {/* Add Resource Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <form
            onSubmit={handleAddResource}
            className="bg-white border border-[#E2E8F0] rounded-xl max-w-md w-full p-5 shadow-xl space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <h3 className="text-sm font-bold text-[#243447]">Register Hospital Resource</h3>
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
                <label className="block font-semibold text-[#243447] mb-1">Resource Code / Number *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ICU-05, WARD-12, OR-02"
                  value={newNumber}
                  onChange={(e) => setNewNumber(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-2 text-xs text-[#243447] focus:outline-none focus:border-[#1976D2]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#243447] mb-1">Resource Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Critical Care Bed 5"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-2 text-xs text-[#243447] focus:outline-none focus:border-[#1976D2]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#243447] mb-1">Category Type</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as ResourceType)}
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-2 text-xs text-[#243447]"
                  >
                    <option value="BED">General Bed</option>
                    <option value="ICU_BED">ICU Bed</option>
                    <option value="OPERATING_ROOM">Operating Room</option>
                    <option value="VENTILATOR">Ventilator / Equipment</option>
                    <option value="AMBULANCE">Ambulance</option>
                    <option value="DOCTOR">Physician</option>
                    <option value="NURSE">Nurse</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-[#243447] mb-1">Department</label>
                  <select
                    value={newDeptId}
                    onChange={(e) => setNewDeptId(e.target.value)}
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-2 text-xs text-[#243447]"
                  >
                    <option value="">General Facility</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#243447] mb-1">Physical Location</label>
                <input
                  type="text"
                  placeholder="e.g. Wing B, 2nd Floor, Room 204"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
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
                {isSubmitting ? "Creating..." : "Save Resource"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Status Modal */}
      {editingResource && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <form
            onSubmit={handleUpdateStatus}
            className="bg-white border border-[#E2E8F0] rounded-xl max-w-md w-full p-5 shadow-xl space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <div>
                <h3 className="text-sm font-bold text-[#243447]">Manage Resource Status</h3>
                <p className="text-xs text-[#64748B]">
                  {editingResource.name} ({editingResource.resourceNumber})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingResource(null)}
                className="p-1 text-[#64748B] hover:text-[#243447] rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-[#243447] mb-1">Update Status To</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as ResourceState)}
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-2 text-xs text-[#243447]"
                >
                  <option value="AVAILABLE">Available (Ready for allocation)</option>
                  <option value="MAINTENANCE">Maintenance / Servicing</option>
                  <option value="RESERVED">Reserved (Pre-booked for emergency)</option>
                  <option value="UNAVAILABLE">Unavailable / Out of service</option>
                </select>
              </div>

              {(editStatus === "MAINTENANCE" || editStatus === "UNAVAILABLE") && (
                <div>
                  <label className="block font-semibold text-[#243447] mb-1">Reason / Notes</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Scheduled sanitization, oxygen line check"
                    value={maintenanceReason}
                    onChange={(e) => setMaintenanceReason(e.target.value)}
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-2 text-xs text-[#243447]"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E2E8F0]">
              <button
                type="button"
                onClick={() => setEditingResource(null)}
                className="px-4 py-2 rounded-lg bg-white border border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#243447] text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isUpdatingStatus}
                className="px-4 py-2 rounded-lg bg-[#1976D2] hover:bg-[#1565C0] text-white text-xs font-semibold shadow-xs disabled:opacity-50"
              >
                {isUpdatingStatus ? "Updating..." : "Confirm Status"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
