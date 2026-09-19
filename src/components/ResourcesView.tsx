import React, { useState } from "react";
import {
  Server,
  Plus,
  Wrench,
  CheckCircle,
  AlertOctagon,
  Bed,
  HeartPulse,
  Syringe,
  Stethoscope,
  Activity,
  Ambulance as AmbulanceIcon,
  ShieldCheck,
  X,
  Building2,
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

const TYPE_ICONS: Record<string, any> = {
  BED: Bed,
  ICU_BED: HeartPulse,
  OPERATING_ROOM: Syringe,
  DOCTOR: Stethoscope,
  NURSE: Activity,
  AMBULANCE: AmbulanceIcon,
  VENTILATOR: Server,
  EQUIPMENT: Server,
};

const STATUS_BADGES: Record<
  ResourceState,
  { label: string; bg: string; text: string; border: string }
> = {
  AVAILABLE: {
    label: "AVAILABLE",
    bg: "bg-emerald-950/80",
    text: "text-emerald-300",
    border: "border-emerald-800",
  },
  IN_USE: {
    label: "IN USE",
    bg: "bg-blue-950/80",
    text: "text-blue-300",
    border: "border-blue-800",
  },
  RESERVED: {
    label: "RESERVED",
    bg: "bg-purple-950/80",
    text: "text-purple-300",
    border: "border-purple-800",
  },
  MAINTENANCE: {
    label: "MAINTENANCE",
    bg: "bg-amber-950/80",
    text: "text-amber-300",
    border: "border-amber-800",
  },
  UNAVAILABLE: {
    label: "UNAVAILABLE",
    bg: "bg-red-950/80",
    text: "text-red-300",
    border: "border-red-800",
  },
};

export const ResourcesView: React.FC<ResourcesViewProps> = ({
  resources,
  departments,
  currentRole,
  currentUserName,
  onRefresh,
  onInitUnits,
}) => {
  const [activeTypeFilter, setActiveTypeFilter] = useState<string>("ALL");
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

  // Filtered resources
  const filtered = resources.filter((res) => {
    const matchesType = activeTypeFilter === "ALL" || res.type === activeTypeFilter;
    const matchesSearch =
      res.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      res.resourceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (res.assignedPatientName && res.assignedPatientName.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesType && matchesSearch;
  });

  // Handle Add Resource
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

  // Handle Status Update / Maintenance Toggle
  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingResource) return;
    setIsUpdatingStatus(true);
    try {
      await updateResourceApi(
        editingResource.id,
        {
          status: editStatus,
          maintenanceReason: editStatus === "MAINTENANCE" || editStatus === "UNAVAILABLE" ? maintenanceReason : undefined,
          lastMaintainedAt: editStatus === "AVAILABLE" ? new Date().toISOString() : editingResource.lastMaintainedAt,
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

  const typeTabs = [
    { id: "ALL", label: "All Units" },
    { id: "BED", label: "General Beds" },
    { id: "ICU_BED", label: "ICU Beds" },
    { id: "OPERATING_ROOM", label: "Operating Rooms" },
    { id: "DOCTOR", label: "Physicians" },
    { id: "NURSE", label: "Nurses" },
    { id: "AMBULANCE", label: "Ambulances" },
    { id: "VENTILATOR", label: "Ventilators" },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <Server className="w-5 h-5 text-blue-400" />
            <span>Hospital Resource Inventory</span>
          </h2>
          <p className="text-xs text-slate-400">
            Real-time physical asset tracking, occupancy status, and maintenance governance.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {resources.length === 0 && (
            <button
              onClick={onInitUnits}
              className="px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold shadow-sm flex items-center gap-2 transition"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Initialize Hospital Units</span>
            </button>
          )}

          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md flex items-center gap-2 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Resource</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {typeTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTypeFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                activeTypeFilter === tab.id
                  ? "bg-blue-600 text-white font-semibold shadow-xs"
                  : "bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder="Filter by ID, name, patient..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs w-60"
        />
      </div>

      {/* Empty State */}
      {resources.length === 0 ? (
        <div className="p-12 text-center text-xs text-slate-400 bg-slate-900 border border-slate-800 rounded-xl space-y-4 max-w-xl mx-auto">
          <Server className="w-10 h-10 text-slate-400 mx-auto" />
          <div>
            <h3 className="text-sm font-bold text-slate-200">No resources configured</h3>
            <p className="mt-1 text-slate-400">
              Add hospital resources manually or initialize standard physical units to begin deterministic scheduling.
            </p>
          </div>
          <div className="pt-2 flex items-center justify-center gap-3">
            <button
              onClick={onInitUnits}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md transition"
            >
              Initialize Hospital Units
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition"
            >
              Add Single Resource
            </button>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center text-xs text-slate-400">
          No resources found matching the specified filter.
        </div>
      ) : (
        /* Resource Cards Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
          {filtered.map((res) => {
            const Icon = TYPE_ICONS[res.type] || Server;
            const badge = STATUS_BADGES[res.status] || STATUS_BADGES.AVAILABLE;
            return (
              <div
                key={res.id}
                className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition space-y-3"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-blue-400">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-semibold text-xs text-slate-100">{res.name}</div>
                        <div className="font-mono text-[11px] text-blue-400">{res.resourceNumber}</div>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border ${badge.bg} ${badge.text} ${badge.border}`}
                    >
                      {badge.label}
                    </span>
                  </div>

                  <div className="mt-3 space-y-1 text-xs text-slate-400">
                    <div className="flex items-center justify-between">
                      <span>Department:</span>
                      <span className="text-slate-300 font-medium">{res.departmentName || "Hospital Core"}</span>
                    </div>

                    {res.location && (
                      <div className="flex items-center justify-between">
                        <span>Location:</span>
                        <span className="text-slate-300">{res.location}</span>
                      </div>
                    )}

                    {res.status === "IN_USE" && (
                      <div className="mt-2 p-2 rounded bg-blue-950/40 border border-blue-900/50 text-[11px] text-blue-200">
                        Assigned to: <span className="font-semibold">{res.assignedPatientName || "Active Case"}</span>
                      </div>
                    )}

                    {res.status === "MAINTENANCE" && res.maintenanceReason && (
                      <div className="mt-2 p-2 rounded bg-amber-950/40 border border-amber-900/50 text-[11px] text-amber-200">
                        Maintenance: {res.maintenanceReason}
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-850 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-mono">Cap: {res.capacity}</span>
                  <button
                    onClick={() => {
                      setEditingResource(res);
                      setEditStatus(res.status);
                      setMaintenanceReason(res.maintenanceReason || "");
                    }}
                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition"
                  >
                    <Wrench className="w-3 h-3 text-slate-400" />
                    <span>Status / Maintenance</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Resource Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleAddResource}
            className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-5 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white">Add New Hospital Resource</h3>
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
                <label className="block font-semibold text-slate-300 mb-1">Resource ID / Number *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ICU-05, OR-03, BED-201"
                  value={newNumber}
                  onChange={(e) => setNewNumber(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Display Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Intensive Care Bed 05"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Resource Type</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as ResourceType)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-xs"
                  >
                    <option value="BED">General Bed</option>
                    <option value="ICU_BED">ICU Bed</option>
                    <option value="OPERATING_ROOM">Operating Room</option>
                    <option value="DOCTOR">Doctor</option>
                    <option value="NURSE">Nurse</option>
                    <option value="AMBULANCE">Ambulance</option>
                    <option value="VENTILATOR">Ventilator</option>
                    <option value="EQUIPMENT">Equipment</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Department</label>
                  <select
                    value={newDeptId}
                    onChange={(e) => setNewDeptId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-xs"
                  >
                    <option value="">Hospital Core</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Capacity</label>
                  <input
                    type="number"
                    min="1"
                    value={newCapacity}
                    onChange={(e) => setNewCapacity(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Location / Ward</label>
                  <input
                    type="text"
                    placeholder="e.g. Floor 3, Wing B"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-xs"
                  />
                </div>
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
                {isSubmitting ? "Creating..." : "Save Resource"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Status / Maintenance Modal */}
      {editingResource && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleUpdateStatus}
            className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-5 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-white">
                  Update Status: {editingResource.name} ({editingResource.resourceNumber})
                </h3>
                <p className="text-xs text-slate-400">Current status: {editingResource.status}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingResource(null)}
                className="p-1 text-slate-400 hover:text-slate-200 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Select Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as ResourceState)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-xs"
                >
                  <option value="AVAILABLE">AVAILABLE (Ready for assignment)</option>
                  <option value="MAINTENANCE">MAINTENANCE (Offline for sanitization / repair)</option>
                  <option value="UNAVAILABLE">UNAVAILABLE (Equipment failure or outage)</option>
                  <option value="RESERVED">RESERVED (Staged for incoming trauma)</option>
                </select>
              </div>

              {(editStatus === "MAINTENANCE" || editStatus === "UNAVAILABLE") && (
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Maintenance / Outage Reason *
                  </label>
                  <textarea
                    rows={2}
                    required
                    placeholder="e.g. Scheduled HEPA filter decontamination and calibration."
                    value={maintenanceReason}
                    onChange={(e) => setMaintenanceReason(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-xs"
                  />
                  <p className="mt-1 text-[11px] text-amber-400">
                    Warning: Marking this resource offline will immediately flag any active patient allocations for clinical review.
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setEditingResource(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isUpdatingStatus}
                className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md transition disabled:opacity-50"
              >
                {isUpdatingStatus ? "Saving..." : "Commit Status Change"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
