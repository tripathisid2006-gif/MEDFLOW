import type {
  Patient,
  PatientAssessment,
  Resource,
  ResourceAllocation,
  Department,
  StaffMember,
  Ambulance,
  AuditLog,
  SystemSettings,
  HospitalStats,
  HospitalAlert,
  StrategyRun,
  UserRole,
} from "./types";

const BASE_URL = "/api";

export async function fetchStats(): Promise<HospitalStats> {
  const res = await fetch(`${BASE_URL}/stats`);
  if (!res.ok) throw new Error("Failed to fetch stats");
  return res.json();
}

export async function fetchAlerts(): Promise<HospitalAlert[]> {
  const res = await fetch(`${BASE_URL}/alerts`);
  if (!res.ok) throw new Error("Failed to fetch alerts");
  return res.json();
}

export async function fetchPatients(): Promise<Patient[]> {
  const res = await fetch(`${BASE_URL}/patients`);
  if (!res.ok) throw new Error("Failed to fetch patients");
  return res.json();
}

export async function createPatientApi(patientData: Partial<Patient>): Promise<Patient> {
  const res = await fetch(`${BASE_URL}/patients`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patientData),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to create patient");
  }
  return res.json();
}

export async function updatePatientApi(id: string, updates: Partial<Patient>, updatedBy?: string): Promise<Patient> {
  const res = await fetch(`${BASE_URL}/patients/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...updates, updatedBy }),
  });
  if (!res.ok) throw new Error("Failed to update patient");
  return res.json();
}

export async function analyzePatientAi(data: any): Promise<any> {
  const res = await fetch(`${BASE_URL}/patients/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "AI intake triage failed");
  }
  return res.json();
}

export async function confirmAssessmentApi(assessmentId: string, confirmedBy: string, role: UserRole): Promise<PatientAssessment> {
  const res = await fetch(`${BASE_URL}/assessments/${assessmentId}/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ confirmedBy, role }),
  });
  if (!res.ok) throw new Error("Failed to confirm assessment");
  return res.json();
}

export async function fetchResources(): Promise<Resource[]> {
  const res = await fetch(`${BASE_URL}/resources`);
  if (!res.ok) throw new Error("Failed to fetch resources");
  return res.json();
}

export async function createResourceApi(data: Partial<Resource>): Promise<Resource> {
  const res = await fetch(`${BASE_URL}/resources`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create resource");
  return res.json();
}

export async function updateResourceApi(id: string, data: Partial<Resource>, updatedBy?: string): Promise<Resource> {
  const res = await fetch(`${BASE_URL}/resources/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...data, updatedBy }),
  });
  if (!res.ok) throw new Error("Failed to update resource");
  return res.json();
}

export async function fetchAllocations(): Promise<ResourceAllocation[]> {
  const res = await fetch(`${BASE_URL}/allocations`);
  if (!res.ok) throw new Error("Failed to fetch allocations");
  return res.json();
}

export async function createAllocationApi(data: {
  patientId: string;
  resourceId: string;
  allocatedBy: string;
  reason: string;
  userRole?: UserRole;
}): Promise<ResourceAllocation> {
  const res = await fetch(`${BASE_URL}/allocations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to allocate resource");
  }
  return res.json();
}

export async function releaseAllocationApi(
  allocationId: string,
  releasedBy: string,
  releaseReason: string,
  userRole: UserRole = "OPERATOR",
  dischargePatient = false
): Promise<void> {
  const res = await fetch(`${BASE_URL}/allocations/${allocationId}/release`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ releasedBy, releaseReason, userRole, dischargePatient }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to release allocation");
  }
}

export async function computeSmartAllocationApi(): Promise<{
  feasibleAllocations: any[];
  unallocatedPatients: any[];
  summary: string;
}> {
  const res = await fetch(`${BASE_URL}/allocations/smart-calculate`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to compute smart allocation");
  return res.json();
}

export async function executeSmartAllocationsApi(
  items: any[],
  allocatedBy: string,
  userRole: UserRole = "OPERATOR"
): Promise<{ executed: any[]; errors: any[]; summary: string }> {
  const res = await fetch(`${BASE_URL}/allocations/smart-execute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items, allocatedBy, userRole }),
  });
  if (!res.ok) throw new Error("Failed to execute smart allocations");
  return res.json();
}

export async function fetchDepartments(): Promise<Department[]> {
  const res = await fetch(`${BASE_URL}/departments`);
  if (!res.ok) throw new Error("Failed to fetch departments");
  return res.json();
}

export async function fetchStaff(): Promise<StaffMember[]> {
  const res = await fetch(`${BASE_URL}/staff`);
  if (!res.ok) throw new Error("Failed to fetch staff");
  return res.json();
}

export async function fetchAmbulances(): Promise<Ambulance[]> {
  const res = await fetch(`${BASE_URL}/ambulances`);
  if (!res.ok) throw new Error("Failed to fetch ambulances");
  return res.json();
}

export async function updateAmbulanceApi(id: string, updates: Partial<Ambulance>, updatedBy?: string): Promise<Ambulance> {
  const res = await fetch(`${BASE_URL}/ambulances/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...updates, updatedBy }),
  });
  if (!res.ok) throw new Error("Failed to update ambulance");
  return res.json();
}

export async function fetchAuditLogs(): Promise<AuditLog[]> {
  const res = await fetch(`${BASE_URL}/audit-logs`);
  if (!res.ok) throw new Error("Failed to fetch audit logs");
  return res.json();
}

export async function fetchSettings(): Promise<SystemSettings> {
  const res = await fetch(`${BASE_URL}/settings`);
  if (!res.ok) throw new Error("Failed to fetch settings");
  return res.json();
}

export async function updateSettingsApi(settings: Partial<SystemSettings>, updatedBy?: string, userRole?: UserRole): Promise<SystemSettings> {
  const res = await fetch(`${BASE_URL}/settings`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...settings, updatedBy, userRole }),
  });
  if (!res.ok) throw new Error("Failed to update settings");
  return res.json();
}

export async function setSurgeModeApi(active: boolean, activatedBy?: string, userRole?: UserRole): Promise<SystemSettings> {
  const res = await fetch(`${BASE_URL}/settings/surge-mode`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ active, activatedBy, userRole }),
  });
  if (!res.ok) throw new Error("Failed to toggle surge mode");
  return res.json();
}

export async function setStaffShortageApi(
  active: boolean,
  doctorShortage: number,
  nurseShortage: number,
  configuredBy?: string,
  userRole?: UserRole
): Promise<SystemSettings> {
  const res = await fetch(`${BASE_URL}/settings/staff-shortage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ active, doctorShortage, nurseShortage, configuredBy, userRole }),
  });
  if (!res.ok) throw new Error("Failed to configure staff shortage");
  return res.json();
}

export async function initHospitalUnitsApi(adminName?: string): Promise<{ message: string }> {
  const res = await fetch(`${BASE_URL}/settings/init-hospital-units`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ adminName }),
  });
  if (!res.ok) throw new Error("Failed to initialize hospital units");
  return res.json();
}

export async function resetSyntheticDataApi(adminName?: string): Promise<{
  message: string;
  patientsCount: number;
  resourcesCount: number;
  departmentsCount: number;
}> {
  const res = await fetch(`${BASE_URL}/admin/reset-synthetic-data`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ adminName }),
  });
  if (!res.ok) throw new Error("Failed to reset synthetic hospital dataset");
  return res.json();
}

export async function fetchStrategyComparison(): Promise<StrategyRun[]> {
  const res = await fetch(`${BASE_URL}/strategies/compare`);
  if (!res.ok) throw new Error("Failed to run strategy comparison");
  return res.json();
}

export async function searchIcdApi(query: string): Promise<any[]> {
  const res = await fetch(`${BASE_URL}/icd/search?q=${encodeURIComponent(query)}`);
  if (!res.ok) return [];
  return res.json();
}

export function subscribeToRealtime(onMessage: (event: { type: string; payload: any }) => void): () => void {
  const eventSource = new EventSource(`${BASE_URL}/realtime`);

  eventSource.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data);
      onMessage(data);
    } catch {
      // ignore parse error
    }
  };

  eventSource.onerror = () => {
    // will auto-reconnect
  };

  return () => {
    eventSource.close();
  };
}

export async function createDepartmentApi(data: Partial<Department>): Promise<Department> {
  const res = await fetch(`${BASE_URL}/departments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create department");
  return res.json();
}

export async function createAmbulanceApi(data: Partial<Ambulance>): Promise<Ambulance> {
  const res = await fetch(`${BASE_URL}/ambulances`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create ambulance");
  return res.json();
}

export async function updateAmbulanceStatusApi(
  id: string,
  status: string,
  currentPatientId?: string,
  currentPatientName?: string,
  currentLocation?: string
): Promise<Ambulance> {
  const res = await fetch(`${BASE_URL}/ambulances/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      status,
      currentPatientId,
      currentPatientName,
      currentLocation,
    }),
  });
  if (!res.ok) throw new Error("Failed to update ambulance status");
  return res.json();
}

// Aliases for unified imports across UI components
export const fetchHospitalStatsApi = fetchStats;
export const fetchAlertsApi = fetchAlerts;
export const fetchPatientsApi = fetchPatients;
export const fetchResourcesApi = fetchResources;
export const fetchDepartmentsApi = fetchDepartments;
export const fetchAmbulancesApi = fetchAmbulances;
export const fetchStaffApi = fetchStaff;
export const fetchAllocationsApi = fetchAllocations;
export const fetchAuditEventsApi = fetchAuditLogs;
export const fetchSettingsApi = fetchSettings;
export const initUnitsApi = initHospitalUnitsApi;
export const compareStrategiesApi = fetchStrategyComparison;

