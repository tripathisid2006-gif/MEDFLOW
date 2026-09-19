import fs from "fs";
import path from "path";
import crypto from "crypto";
import type {
  Patient,
  PatientAssessment,
  Department,
  Resource,
  ResourceAllocation,
  StaffMember,
  Ambulance,
  AuditLog,
  SystemSettings,
  UserRole,
  HospitalAlert,
  HospitalStats,
} from "../src/types";
import { calculatePatientPriority, checkResourceConflict } from "./allocationEngine";
import { broadcastRealtimeEvent } from "./realtime";
import {
  SEED_VERSION,
  SEED_SETTINGS,
  SEED_DEPARTMENTS,
  SEED_RESOURCES,
  SEED_STAFF,
  SEED_AMBULANCES,
  SEED_PATIENTS,
  SEED_ALLOCATIONS,
  SEED_AUDIT_LOGS,
} from "./indianSeedData";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "medflow.json");

interface DatabaseSchema {
  patients: Patient[];
  assessments: PatientAssessment[];
  departments: Department[];
  resources: Resource[];
  allocations: ResourceAllocation[];
  staff: StaffMember[];
  ambulances: Ambulance[];
  auditLogs: AuditLog[];
  settings: SystemSettings;
}

const DEFAULT_SETTINGS: SystemSettings = {
  id: "default-settings",
  hospitalName: "Shantideep Multispeciality Hospital",
  seed_version: SEED_VERSION,
  datasetEnvironment: "Synthetic Hospital Dataset",
  priorityFormulaWeights: {
    urgencyWeight: 1.0,
    waitingWeight: 0.5,
    riskWeight: 0.8,
    resourceWeight: 0.4,
  },
  waitingAgingRatePer10Min: 5,
  emergencySurgeModeActive: false,
  staffShortageModeActive: false,
  doctorShortageCount: 0,
  nurseShortageCount: 0,
  maxWaitingThresholdMinutes: 45,
  updatedAt: new Date().toISOString(),
};

let db: DatabaseSchema = {
  patients: [],
  assessments: [],
  departments: [],
  resources: [],
  allocations: [],
  staff: [],
  ambulances: [],
  auditLogs: [],
  settings: { ...DEFAULT_SETTINGS },
};

function ensureDataDirectory() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function applyIndianSeedData(actor = "Administrator"): void {
  db = {
    patients: JSON.parse(JSON.stringify(SEED_PATIENTS)),
    assessments: [],
    departments: JSON.parse(JSON.stringify(SEED_DEPARTMENTS)),
    resources: JSON.parse(JSON.stringify(SEED_RESOURCES)),
    allocations: JSON.parse(JSON.stringify(SEED_ALLOCATIONS)),
    staff: JSON.parse(JSON.stringify(SEED_STAFF)),
    ambulances: JSON.parse(JSON.stringify(SEED_AMBULANCES)),
    auditLogs: JSON.parse(JSON.stringify(SEED_AUDIT_LOGS)),
    settings: {
      ...SEED_SETTINGS,
      hospitalName: "Shantideep Multispeciality Hospital",
      seed_version: SEED_VERSION,
      datasetEnvironment: "Synthetic Hospital Dataset",
    },
  };

  // Recalculate priority scores deterministically for all patients
  db.patients.forEach((pat) => {
    const calc = calculatePatientPriority(pat, db.settings);
    pat.priorityScore = calc.score;
    pat.priorityExplanation = calc.explanation;
  });

  saveDatabase();
}

function loadDatabase() {
  try {
    ensureDataDirectory();
    let shouldSeed = false;
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, "utf-8");
      const parsed = JSON.parse(data);
      // Check if dataset is obsolete or from old version
      if (!parsed.settings || parsed.settings.seed_version !== SEED_VERSION) {
        shouldSeed = true;
      } else {
        db = {
          patients: Array.isArray(parsed.patients) ? parsed.patients : [],
          assessments: Array.isArray(parsed.assessments) ? parsed.assessments : [],
          departments: Array.isArray(parsed.departments) ? parsed.departments : [],
          resources: Array.isArray(parsed.resources) ? parsed.resources : [],
          allocations: Array.isArray(parsed.allocations) ? parsed.allocations : [],
          staff: Array.isArray(parsed.staff) ? parsed.staff : [],
          ambulances: Array.isArray(parsed.ambulances) ? parsed.ambulances : [],
          auditLogs: Array.isArray(parsed.auditLogs) ? parsed.auditLogs : [],
          settings: parsed.settings ? { ...DEFAULT_SETTINGS, ...parsed.settings } : { ...DEFAULT_SETTINGS },
        };
      }
    } else {
      shouldSeed = true;
    }

    if (shouldSeed) {
      applyIndianSeedData("System Auto-Initialization");
    }
  } catch (err) {
    console.error("Failed to load database file, initializing with fresh synthetic dataset:", err);
    applyIndianSeedData("System Recovery");
  }
}

function saveDatabase() {
  try {
    ensureDataDirectory();
    fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to save database to disk:", err);
  }
}

// Initial load
loadDatabase();

export function getDatabase(): DatabaseSchema {
  return db;
}

export function createAuditLog(
  userId: string,
  userName: string,
  userRole: UserRole,
  action: string,
  entityType: string,
  entityId: string,
  reason: string,
  previousValue?: string,
  newValue?: string
): AuditLog {
  const log: AuditLog = {
    id: crypto.randomUUID(),
    userId,
    userName,
    userRole,
    action,
    timestamp: new Date().toISOString(),
    entityType,
    entityId,
    reason,
    previousValue,
    newValue,
  };
  db.auditLogs.unshift(log);
  if (db.auditLogs.length > 500) {
    db.auditLogs = db.auditLogs.slice(0, 500);
  }
  saveDatabase();
  broadcastRealtimeEvent("AUDIT_LOG_ADDED", log);
  return log;
}

export function refreshAllPatientPriorities(): Patient[] {
  const now = Date.now();
  db.patients = db.patients.map((patient) => {
    if (patient.status === "DISCHARGED") return patient;
    const arrival = new Date(patient.arrivalTime).getTime();
    const waitingMinutes = Math.max(0, Math.floor((now - arrival) / (1000 * 60)));
    const patientWithWait = { ...patient, waitingMinutes };
    const calc = calculatePatientPriority(patientWithWait, db.settings);
    return {
      ...patientWithWait,
      priorityScore: calc.score,
      priorityExplanation: calc.explanation,
      updatedAt: new Date().toISOString(),
    };
  });
  saveDatabase();
  return db.patients;
}

export function getPatients(): Patient[] {
  refreshAllPatientPriorities();
  return db.patients;
}

export function getPatientById(id: string): Patient | undefined {
  return db.patients.find((p) => p.id === id);
}

export function createPatient(patientData: Omit<Patient, "id" | "mrn" | "priorityScore" | "priorityExplanation" | "waitingMinutes" | "createdAt" | "updatedAt"> & { id?: string }): Patient {
  const count = db.patients.length + 1;
  const mrn = `MRN-${String(1000 + count)}`;
  const id = patientData.id || crypto.randomUUID();
  const now = new Date().toISOString();

  const tempPatient: Patient = {
    ...patientData,
    id,
    mrn,
    priorityScore: 0,
    priorityExplanation: "",
    waitingMinutes: 0,
    status: patientData.status || "WAITING",
    createdAt: now,
    updatedAt: now,
  };

  const calc = calculatePatientPriority(tempPatient, db.settings);
  tempPatient.priorityScore = calc.score;
  tempPatient.priorityExplanation = calc.explanation;

  db.patients.push(tempPatient);
  saveDatabase();

  createAuditLog(
    "system",
    "Registration Staff",
    "OPERATOR",
    "PATIENT_REGISTERED",
    "Patient",
    id,
    `Registered patient ${tempPatient.name} with urgency ${tempPatient.urgencyLevel}`,
    undefined,
    JSON.stringify({ name: tempPatient.name, urgency: tempPatient.urgencyLevel })
  );

  broadcastRealtimeEvent("PATIENT_CREATED", tempPatient);
  return tempPatient;
}

export function updatePatient(id: string, updates: Partial<Patient>, updatedBy = "Authorized Staff"): Patient | null {
  const index = db.patients.findIndex((p) => p.id === id);
  if (index === -1) return null;

  const previous = db.patients[index];
  const updated: Patient = {
    ...previous,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  const calc = calculatePatientPriority(updated, db.settings);
  updated.priorityScore = calc.score;
  updated.priorityExplanation = calc.explanation;

  db.patients[index] = updated;
  saveDatabase();

  createAuditLog(
    "system",
    updatedBy,
    "DOCTOR",
    "PATIENT_UPDATED",
    "Patient",
    id,
    `Updated clinical/intake status for ${updated.name}`,
    previous.urgencyLevel,
    updated.urgencyLevel
  );

  broadcastRealtimeEvent("PATIENT_UPDATED", updated);
  return updated;
}

export function savePatientAssessment(assessment: Omit<PatientAssessment, "id" | "createdAt">): PatientAssessment {
  const id = crypto.randomUUID();
  const newAssessment: PatientAssessment = {
    ...assessment,
    id,
    createdAt: new Date().toISOString(),
  };

  db.assessments.push(newAssessment);

  // Link to patient
  const patient = db.patients.find((p) => p.id === assessment.patientId);
  if (patient) {
    patient.assessmentId = id;
    patient.assessment = newAssessment;
    patient.urgencyLevel = newAssessment.urgency_level;
    const calc = calculatePatientPriority(patient, db.settings);
    patient.priorityScore = calc.score;
    patient.priorityExplanation = calc.explanation;
    saveDatabase();
    broadcastRealtimeEvent("PATIENT_UPDATED", patient);
  }

  saveDatabase();
  return newAssessment;
}

export function confirmAssessment(assessmentId: string, confirmedBy: string, role: UserRole): PatientAssessment | null {
  const assess = db.assessments.find((a) => a.id === assessmentId);
  if (!assess) return null;

  assess.staffConfirmed = true;
  assess.confirmedBy = confirmedBy;
  assess.confirmedAt = new Date().toISOString();

  // Update associated patient status to WAITING in priority queue
  const patient = db.patients.find((p) => p.id === assess.patientId);
  if (patient && patient.status === "TRIAGED") {
    patient.status = "WAITING";
    const calc = calculatePatientPriority(patient, db.settings);
    patient.priorityScore = calc.score;
    patient.priorityExplanation = calc.explanation;
  }

  saveDatabase();

  createAuditLog(
    "system",
    confirmedBy,
    role,
    "ASSESSMENT_CONFIRMED",
    "PatientAssessment",
    assessmentId,
    `Authorized clinician confirmed triage assessment for ${patient?.name || "patient"}`,
    "Unconfirmed",
    "Confirmed"
  );

  broadcastRealtimeEvent("ASSESSMENT_CONFIRMED", assess);
  if (patient) broadcastRealtimeEvent("PATIENT_UPDATED", patient);
  return assess;
}

export function getResources(): Resource[] {
  return db.resources;
}

export function createResource(resourceData: Omit<Resource, "id" | "updatedAt">): Resource {
  const id = crypto.randomUUID();
  const newRes: Resource = {
    ...resourceData,
    id,
    status: resourceData.status || "AVAILABLE",
    updatedAt: new Date().toISOString(),
  };
  db.resources.push(newRes);
  saveDatabase();

  createAuditLog(
    "system",
    "Administrator",
    "ADMIN",
    "RESOURCE_CREATED",
    "Resource",
    id,
    `Added resource ${newRes.name} (${newRes.resourceNumber}) to ${newRes.departmentName || "hospital"}`,
    undefined,
    newRes.name
  );

  broadcastRealtimeEvent("RESOURCE_CREATED", newRes);
  return newRes;
}

export function updateResource(id: string, updates: Partial<Resource>, updatedBy = "Authorized Staff"): Resource | null {
  const index = db.resources.findIndex((r) => r.id === id);
  if (index === -1) return null;

  const prev = db.resources[index];
  const updated: Resource = {
    ...prev,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  db.resources[index] = updated;

  // If resource status changed to MAINTENANCE or UNAVAILABLE, flag active allocations!
  if (
    (updated.status === "MAINTENANCE" || updated.status === "UNAVAILABLE") &&
    prev.status !== updated.status
  ) {
    const affected = db.allocations.filter((a) => a.resourceId === id && a.status === "ACTIVE");
    for (const alloc of affected) {
      alloc.status = "FLAGGED_REVIEW";
      createAuditLog(
        "system",
        updatedBy,
        "ADMIN",
        "ALLOCATION_FLAGGED",
        "ResourceAllocation",
        alloc.id,
        `Resource ${updated.name} entered ${updated.status}. Patient ${alloc.patientName}'s allocation requires immediate review.`,
        "ACTIVE",
        "FLAGGED_REVIEW"
      );
      broadcastRealtimeEvent("ALLOCATION_FLAGGED", alloc);
    }
  }

  saveDatabase();

  createAuditLog(
    "system",
    updatedBy,
    "ADMIN",
    "RESOURCE_UPDATED",
    "Resource",
    id,
    `Updated status of ${updated.name} to ${updated.status}`,
    prev.status,
    updated.status
  );

  broadcastRealtimeEvent("RESOURCE_UPDATED", updated);
  return updated;
}

export function getAllocations(): ResourceAllocation[] {
  return db.allocations;
}

export function createAllocation(
  patientId: string,
  resourceId: string,
  allocatedBy: string,
  reason: string,
  userRole: UserRole = "OPERATOR"
): { success: boolean; allocation?: ResourceAllocation; error?: string } {
  const patient = db.patients.find((p) => p.id === patientId);
  const resource = db.resources.find((r) => r.id === resourceId);

  if (!patient) return { success: false, error: "Patient not found." };
  if (!resource) return { success: false, error: "Resource not found." };

  // Deterministic conflict check
  const conflict = checkResourceConflict(
    resource,
    patient,
    db.resources,
    db.staff,
    db.allocations
  );

  if (conflict.hasConflict) {
    return {
      success: false,
      error: `Resource Conflict: ${conflict.reason}`,
    };
  }

  // Create allocation record
  const allocationId = crypto.randomUUID();
  const allocation: ResourceAllocation = {
    id: allocationId,
    patientId: patient.id,
    patientName: patient.name,
    patientUrgency: patient.urgencyLevel,
    resourceId: resource.id,
    resourceNumber: resource.resourceNumber,
    resourceName: resource.name,
    resourceType: resource.type,
    quantity: 1,
    startTime: new Date().toISOString(),
    allocatedBy,
    allocationReason: reason,
    priorityAtAllocation: patient.priorityScore,
    status: "ACTIVE",
  };

  db.allocations.push(allocation);

  // Update resource status immediately
  resource.status = "IN_USE";
  resource.assignedPatientId = patient.id;
  resource.assignedPatientName = patient.name;
  resource.updatedAt = new Date().toISOString();

  // Update patient status
  patient.status = "ALLOCATED";
  patient.updatedAt = new Date().toISOString();

  // Update staff count if resource is staff
  if (resource.type === "DOCTOR" || resource.type === "NURSE") {
    const staffMember = db.staff.find((s) => s.id === resource.id || s.name === resource.name);
    if (staffMember) {
      staffMember.activeAllocationsCount = (staffMember.activeAllocationsCount || 0) + 1;
    }
  }

  saveDatabase();

  createAuditLog(
    "system",
    allocatedBy,
    userRole,
    "RESOURCE_ALLOCATED",
    "ResourceAllocation",
    allocationId,
    reason,
    "AVAILABLE",
    `Allocated ${resource.name} to ${patient.name}`
  );

  broadcastRealtimeEvent("ALLOCATION_CREATED", allocation);
  broadcastRealtimeEvent("RESOURCE_UPDATED", resource);
  broadcastRealtimeEvent("PATIENT_UPDATED", patient);

  return { success: true, allocation };
}

export function releaseAllocation(
  allocationId: string,
  releasedBy: string,
  releaseReason: string,
  userRole: UserRole = "OPERATOR",
  dischargePatient = false
): { success: boolean; error?: string } {
  const allocation = db.allocations.find((a) => a.id === allocationId);
  if (!allocation) return { success: false, error: "Allocation not found." };

  allocation.status = "COMPLETED";
  allocation.releasedAt = new Date().toISOString();
  allocation.releaseReason = releaseReason;

  // Release the resource
  const resource = db.resources.find((r) => r.id === allocation.resourceId);
  if (resource) {
    resource.status = "AVAILABLE";
    resource.assignedPatientId = undefined;
    resource.assignedPatientName = undefined;
    resource.updatedAt = new Date().toISOString();
  }

  // Update staff allocation count if applicable
  if (resource && (resource.type === "DOCTOR" || resource.type === "NURSE")) {
    const staffMember = db.staff.find((s) => s.id === resource.id || s.name === resource.name);
    if (staffMember && staffMember.activeAllocationsCount > 0) {
      staffMember.activeAllocationsCount -= 1;
    }
  }

  // Update patient status
  const patient = db.patients.find((p) => p.id === allocation.patientId);
  if (patient) {
    if (dischargePatient) {
      patient.status = "DISCHARGED";
    } else {
      // Check if patient has any remaining active allocations
      const remaining = db.allocations.some(
        (a) => a.patientId === patient.id && a.id !== allocationId && a.status === "ACTIVE"
      );
      if (!remaining) {
        patient.status = "WAITING";
      }
    }
    patient.updatedAt = new Date().toISOString();
  }

  saveDatabase();

  createAuditLog(
    "system",
    releasedBy,
    userRole,
    "RESOURCE_RELEASED",
    "ResourceAllocation",
    allocationId,
    `Released ${allocation.resourceName} from ${allocation.patientName}: ${releaseReason}`,
    "IN_USE",
    "AVAILABLE"
  );

  broadcastRealtimeEvent("ALLOCATION_RELEASED", allocation);
  if (resource) broadcastRealtimeEvent("RESOURCE_UPDATED", resource);
  if (patient) broadcastRealtimeEvent("PATIENT_UPDATED", patient);

  return { success: true };
}

export function getDepartments(): Department[] {
  return db.departments;
}

export function createDepartment(data: Partial<Department>): Department {
  const id = crypto.randomUUID();
  const newDept: Department = {
    id,
    name: data.name || "Department",
    code: data.code || "DEPT",
    description: data.description || "Hospital clinical unit",
    maxCapacity: data.maxCapacity || data.bedCapacity || 20,
    isClosed: false,
    floor: data.floor || "Floor 1",
    headOfDepartment: data.headOfDepartment || "Lead Physician",
    bedCapacity: data.bedCapacity || 20,
    currentOccupancy: 0,
    activeStaffCount: 0,
    color: data.color || "#3b82f6",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.departments.push(newDept);
  saveDatabase();
  broadcastRealtimeEvent("DEPARTMENT_CREATED", newDept);
  return newDept;
}

export function getStaff(): StaffMember[] {
  return db.staff;
}

export function getAmbulances(): Ambulance[] {
  return db.ambulances;
}

export function createAmbulance(data: any): Ambulance {
  const id = crypto.randomUUID();
  const num = data.vehicleNumber || data.unitNumber || `AMB-${db.ambulances.length + 1}`;
  const newAmb: Ambulance = {
    id,
    vehicleNumber: num,
    unitNumber: num,
    licensePlate: data.licensePlate || "MED-AMB",
    vehicleModel: data.vehicleModel || "Type II Mobile ICU",
    baseStation: data.baseStation || "ED Trauma Bay",
    crewOnBoard: data.crewOnBoard || ["EMT-P Lead"],
    status: data.status || "AVAILABLE",
    currentPatientId: data.currentPatientId,
    currentPatientName: data.currentPatientName,
    currentLocation: data.currentLocation,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.ambulances.push(newAmb);
  saveDatabase();
  broadcastRealtimeEvent("AMBULANCE_CREATED", newAmb);
  return newAmb;
}

export function updateAmbulance(
  id: string,
  updates: Partial<Ambulance>,
  updatedBy = "Dispatcher"
): Ambulance | null {
  const index = db.ambulances.findIndex((a) => a.id === id);
  if (index === -1) return null;

  const prev = db.ambulances[index];
  const updated: Ambulance = {
    ...prev,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  db.ambulances[index] = updated;
  saveDatabase();

  createAuditLog(
    "system",
    updatedBy,
    "OPERATOR",
    "AMBULANCE_STATUS_UPDATED",
    "Ambulance",
    id,
    `Ambulance ${updated.vehicleNumber} status updated to ${updated.status}`,
    prev.status,
    updated.status
  );

  broadcastRealtimeEvent("AMBULANCE_UPDATED", updated);
  return updated;
}

export function getAuditLogs(): AuditLog[] {
  return db.auditLogs;
}

export function getSettings(): SystemSettings {
  return db.settings;
}

export function updateSettings(
  updates: Partial<SystemSettings>,
  updatedBy = "Administrator",
  userRole: UserRole = "ADMIN"
): SystemSettings {
  const prev = db.settings;
  const updated: SystemSettings = {
    ...prev,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  db.settings = updated;
  saveDatabase();

  createAuditLog(
    "system",
    updatedBy,
    userRole,
    "SYSTEM_SETTINGS_UPDATED",
    "SystemSettings",
    updated.id,
    "Updated operational prioritization weights or system mode configuration"
  );

  refreshAllPatientPriorities();
  broadcastRealtimeEvent("SETTINGS_UPDATED", updated);
  return updated;
}

export function setSurgeMode(
  active: boolean,
  activatedBy = "Administrator",
  userRole: UserRole = "ADMIN"
): SystemSettings {
  db.settings.emergencySurgeModeActive = active;
  db.settings.surgeActivatedAt = active ? new Date().toISOString() : undefined;
  db.settings.surgeActivatedBy = active ? activatedBy : undefined;
  db.settings.updatedAt = new Date().toISOString();

  saveDatabase();

  createAuditLog(
    "system",
    activatedBy,
    userRole,
    active ? "EMERGENCY_SURGE_ACTIVATED" : "EMERGENCY_SURGE_DEACTIVATED",
    "SystemSettings",
    db.settings.id,
    active
      ? "EMERGENCY SURGE MODE ACTIVATED. Priority calculations accelerated, ICU alarms armed."
      : "Emergency surge mode stood down to standard hospital operations."
  );

  refreshAllPatientPriorities();
  broadcastRealtimeEvent("SURGE_MODE_CHANGED", db.settings);
  return db.settings;
}

export function setStaffShortageMode(
  active: boolean,
  doctorShortage = 0,
  nurseShortage = 0,
  configuredBy = "Administrator",
  userRole: UserRole = "ADMIN"
): SystemSettings {
  db.settings.staffShortageModeActive = active;
  db.settings.doctorShortageCount = doctorShortage;
  db.settings.nurseShortageCount = nurseShortage;
  db.settings.updatedAt = new Date().toISOString();

  saveDatabase();

  createAuditLog(
    "system",
    configuredBy,
    userRole,
    "STAFF_SHORTAGE_CONFIGURED",
    "SystemSettings",
    db.settings.id,
    active
      ? `Staff shortage mode active: ${doctorShortage} doctors, ${nurseShortage} nurses deficit.`
      : "Staff shortage mode cleared."
  );

  broadcastRealtimeEvent("STAFF_SHORTAGE_CHANGED", db.settings);
  return db.settings;
}

export function getHospitalStats(): HospitalStats {
  const patients = db.patients.filter((p) => p.status !== "DISCHARGED");
  const totalPatients = patients.length;
  const criticalPatients = patients.filter((p) => p.urgencyLevel === "CRITICAL").length;
  const highPriorityPatients = patients.filter((p) => p.urgencyLevel === "HIGH").length;
  const patientsWaiting = patients.filter((p) => p.status === "WAITING" || p.status === "TRIAGED").length;

  const beds = db.resources.filter((r) => r.type === "BED");
  const availableBeds = beds.filter((r) => r.status === "AVAILABLE").length;

  const icuBeds = db.resources.filter((r) => r.type === "ICU_BED");
  const icuAvailable = icuBeds.filter((r) => r.status === "AVAILABLE").length;

  const ors = db.resources.filter((r) => r.type === "OPERATING_ROOM");
  const operatingRoomsAvailable = ors.filter((r) => r.status === "AVAILABLE").length;

  const docs = db.resources.filter((r) => r.type === "DOCTOR");
  const doctorsAvailable = docs.filter((r) => r.status === "AVAILABLE").length;

  const nurses = db.resources.filter((r) => r.type === "NURSE");
  const nursesAvailable = nurses.filter((r) => r.status === "AVAILABLE").length;

  const activeAllocations = db.allocations.filter((a) => a.status === "ACTIVE").length;

  const amb = db.ambulances;
  const ambulancesAvailable = amb.filter((a) => a.status === "AVAILABLE").length;

  return {
    totalPatients,
    criticalPatients,
    highPriorityPatients,
    patientsWaiting,
    availableBeds,
    totalBeds: beds.length,
    icuAvailable,
    totalIcu: icuBeds.length,
    operatingRoomsAvailable,
    totalOperatingRooms: ors.length,
    doctorsAvailable,
    totalDoctors: docs.length,
    nursesAvailable,
    totalNurses: nurses.length,
    activeAllocations,
    ambulancesAvailable,
    totalAmbulances: amb.length,
  };
}

export function getHospitalAlerts(): HospitalAlert[] {
  const alerts: HospitalAlert[] = [];

  // 1. Critical patients waiting
  const criticalWaiting = db.patients.filter(
    (p) => p.urgencyLevel === "CRITICAL" && (p.status === "WAITING" || p.status === "TRIAGED")
  );
  if (criticalWaiting.length > 0) {
    alerts.push({
      id: "alert-critical-waiting",
      severity: "CRITICAL",
      title: "Critical Patients Awaiting Allocation",
      message: `${criticalWaiting.length} critical patient${criticalWaiting.length > 1 ? "s are" : " is"} waiting for urgent clinical resource allocation.`,
      timestamp: new Date().toISOString(),
      alertType: "CRITICAL_PATIENT",
    });
  }

  // 2. ICU capacity full
  const icuBeds = db.resources.filter((r) => r.type === "ICU_BED");
  if (icuBeds.length > 0) {
    const icuAvail = icuBeds.filter((r) => r.status === "AVAILABLE").length;
    if (icuAvail === 0) {
      alerts.push({
        id: "alert-icu-full",
        severity: "CRITICAL",
        title: "ICU Capacity Reached",
        message: "All ICU beds are currently occupied or in maintenance. Zero available.",
        timestamp: new Date().toISOString(),
        alertType: "RESOURCE_SHORTAGE",
      });
    }
  }

  // 3. Excessive wait time
  const threshold = db.settings.maxWaitingThresholdMinutes || 45;
  const longWaiters = db.patients.filter(
    (p) => (p.status === "WAITING" || p.status === "TRIAGED") && p.waitingMinutes > threshold
  );
  if (longWaiters.length > 0) {
    alerts.push({
      id: "alert-long-wait",
      severity: "WARNING",
      title: "Wait Time Threshold Exceeded",
      message: `${longWaiters.length} patient${longWaiters.length > 1 ? "s have" : " has"} waited past the configured ${threshold}-minute threshold.`,
      timestamp: new Date().toISOString(),
      alertType: "LONG_WAIT",
    });
  }

  // 4. Flagged allocations (e.g. from resource failure/maintenance)
  const flagged = db.allocations.filter((a) => a.status === "FLAGGED_REVIEW");
  if (flagged.length > 0) {
    alerts.push({
      id: "alert-flagged-alloc",
      severity: "CRITICAL",
      title: "Allocations Require Immediate Review",
      message: `${flagged.length} allocation${flagged.length > 1 ? "s are" : " is"} flagged due to resource maintenance or failure.`,
      timestamp: new Date().toISOString(),
      alertType: "CONFLICT",
    });
  }

  // 5. Emergency surge mode
  if (db.settings.emergencySurgeModeActive) {
    alerts.push({
      id: "alert-surge-active",
      severity: "WARNING",
      title: "Emergency Surge Mode Active",
      message: "Hospital is operating under emergency surge protocols.",
      timestamp: db.settings.surgeActivatedAt || new Date().toISOString(),
      alertType: "SYSTEM",
    });
  }

  return alerts;
}

export function initializeHospitalUnits(adminName = "Dr. Arvind Reddy"): { message: string } {
  db.departments = JSON.parse(JSON.stringify(SEED_DEPARTMENTS));
  db.resources = JSON.parse(JSON.stringify(SEED_RESOURCES));
  db.staff = JSON.parse(JSON.stringify(SEED_STAFF));
  db.ambulances = JSON.parse(JSON.stringify(SEED_AMBULANCES));

  saveDatabase();

  createAuditLog(
    "system",
    adminName,
    "ADMIN",
    "HOSPITAL_UNITS_INITIALIZED",
    "SystemConfiguration",
    "hospital-core",
    `Initialized standard Shantideep hospital units: ${db.departments.length} departments, ${db.resources.length} resources, ${db.staff.length} staff, and ${db.ambulances.length} ambulances.`
  );

  broadcastRealtimeEvent("HOSPITAL_UNITS_INITIALIZED", {
    departmentsCount: db.departments.length,
    resourcesCount: db.resources.length,
    staffCount: db.staff.length,
    ambulancesCount: db.ambulances.length,
  });

  return { message: "Hospital units initialized successfully." };
}

export function resetSyntheticHospitalDataset(adminName = "Dr. Arvind Reddy"): {
  message: string;
  patientsCount: number;
  resourcesCount: number;
  departmentsCount: number;
} {
  applyIndianSeedData(adminName);

  createAuditLog(
    "admin-reset",
    adminName,
    "ADMIN",
    "DATASET_RESET",
    "SystemDatabase",
    "dataset-shantideep",
    "Admin performed reset of synthetic hospital dataset for Shantideep Multispeciality Hospital."
  );

  broadcastRealtimeEvent("DATASET_RESET", {
    patientsCount: db.patients.length,
    resourcesCount: db.resources.length,
    departmentsCount: db.departments.length,
    timestamp: new Date().toISOString(),
  });

  return {
    message: "Synthetic hospital dataset successfully reset to Shantideep Multispeciality Hospital standards.",
    patientsCount: db.patients.length,
    resourcesCount: db.resources.length,
    departmentsCount: db.departments.length,
  };
}

