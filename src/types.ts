export type UserRole =
  | "ADMIN"
  | "DOCTOR"
  | "NURSE"
  | "OPERATOR"
  | "TRIAGE_NURSE"
  | "COORDINATOR";

export type UrgencyLevel = "CRITICAL" | "HIGH" | "MODERATE" | "LOW";

export type ResourceState = "AVAILABLE" | "RESERVED" | "IN_USE" | "MAINTENANCE" | "UNAVAILABLE";

export type ResourceType =
  | "BED"
  | "ICU_BED"
  | "OPERATING_ROOM"
  | "DOCTOR"
  | "NURSE"
  | "AMBULANCE"
  | "VENTILATOR"
  | "EQUIPMENT";

export type PatientStatus = "REGISTERED" | "TRIAGED" | "WAITING" | "ALLOCATED" | "DISCHARGED";

export type AllocationStrategy =
  | "PRIORITY_FIRST"
  | "RESOURCE_BALANCED"
  | "MINIMIZE_WAIT_TIME"
  | "SURGE_CRITICAL_FIRST"
  | "FIRST_COME_FIRST_SERVED"
  | "SHORTEST_TREATMENT_FIRST"
  | "BALANCED_HYBRID";

export interface VitalSigns {
  heartRate?: number;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  oxygenSaturation?: number;
  respiratoryRate?: number;
  temperatureCelsius?: number;
}

export interface SuggestedResource {
  resource_type: ResourceType | string;
  quantity: number;
  reason: string;
}

export interface IcdSuggestion {
  code: string;
  description: string;
}

export interface PatientAssessment {
  id: string;
  patientId: string;
  urgency_level: UrgencyLevel;
  confidence: number;
  red_flags: string[];
  possible_conditions: string[];
  recommended_department: string;
  suggested_resources: SuggestedResource[];
  icd10_suggestions?: IcdSuggestion[];
  requires_human_review: boolean;
  staffConfirmed: boolean;
  confirmedBy?: string;
  confirmedAt?: string;
  clinicalNotes?: string;
  createdAt: string;
}

export interface Patient {
  id: string;
  mrn: string; // Medical Record Number
  name: string;
  age: number;
  gender: "Male" | "Female" | "Other";
  contact: string;
  arrivalTime: string;
  symptoms: string;
  clinicalNotes: string;
  departmentId?: string;
  departmentName?: string;
  vitalSigns?: VitalSigns;
  knownConditions: string[];
  allergies: string[];
  requiredTreatment: string;
  emergencyStatus: boolean;
  urgencyLevel: UrgencyLevel;
  priorityScore: number;
  priorityExplanation: string;
  waitingMinutes: number;
  status: PatientStatus;
  assessmentId?: string;
  assessment?: PatientAssessment;
  documentName?: string;
  documentType?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  description: string;
  maxCapacity: number;
  isClosed: boolean;
  floor?: string;
  headOfDepartment?: string;
  bedCapacity?: number;
  currentOccupancy?: number;
  activeStaffCount?: number;
  color?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Resource {
  id: string;
  resourceNumber: string;
  name: string;
  type: ResourceType;
  departmentId: string;
  departmentName?: string;
  capacity: number;
  status: ResourceState;
  assignedPatientId?: string;
  assignedPatientName?: string;
  maintenanceReason?: string;
  location?: string;
  lastMaintainedAt?: string;
  updatedAt: string;
}

export interface ResourceAllocation {
  id: string;
  patientId: string;
  patientName: string;
  patientUrgency: UrgencyLevel;
  resourceId: string;
  resourceNumber: string;
  resourceName: string;
  resourceType: ResourceType;
  quantity: number;
  startTime: string;
  expectedEndTime?: string;
  allocatedBy: string;
  allocationReason: string;
  priorityAtAllocation: number;
  status: "ACTIVE" | "COMPLETED" | "CANCELLED" | "FLAGGED_REVIEW";
  releasedAt?: string;
  releaseReason?: string;
}

export interface StaffMember {
  id: string;
  name: string;
  role: "DOCTOR" | "NURSE" | "SPECIALIST";
  departmentId: string;
  departmentName?: string;
  specialty: string;
  shiftStatus: "ON_DUTY" | "OFF_DUTY" | "ON_CALL";
  activeAllocationsCount: number;
  maxConcurrentCases: number;
}

export interface Ambulance {
  id: string;
  vehicleNumber: string;
  unitNumber?: string;
  licensePlate?: string;
  vehicleModel?: string;
  baseStation?: string;
  crewOnBoard?: string[];
  status: "AVAILABLE" | "DISPATCHED" | "EN_ROUTE" | "AT_HOSPITAL" | "MAINTENANCE";
  driverName?: string;
  paramedicName?: string;
  equipmentSummary?: string;
  currentPatientId?: string;
  currentPatientName?: string;
  latitude?: number;
  longitude?: number;
  locationAddress?: string;
  currentLocation?: string;
  estimatedArrivalMinutes?: number;
  createdAt?: string;
  updatedAt: string;
}

export interface AuditEvent {
  id: string;
  userId?: string;
  userName?: string;
  performedBy?: string;
  userRole?: string;
  action: string;
  timestamp: string;
  entityType: string;
  entityId: string;
  previousValue?: string;
  previousState?: any;
  newValue?: string;
  newState?: any;
  reason: string;
}

export type AuditLog = AuditEvent;

export interface PriorityFormulaWeights {
  urgencyWeight: number; // e.g. 1.0
  waitingWeight: number; // e.g. 0.5 per min
  riskWeight: number; // e.g. 0.8
  resourceWeight: number; // e.g. 0.4
}

export interface SystemSettings {
  id: string;
  hospitalName?: string;
  seed_version?: string;
  datasetEnvironment?: string;
  priorityFormulaWeights?: PriorityFormulaWeights;
  urgencyWeights?: {
    CRITICAL: number;
    HIGH: number;
    MODERATE: number;
    LOW: number;
  };
  waitingAgingRatePer10Min?: number;
  emergencySurgeModeActive?: boolean;
  surgeModeActive?: boolean;
  surgeActivatedAt?: string;
  surgeActivatedBy?: string;
  staffShortageModeActive?: boolean;
  doctorShortageCount?: number;
  nurseShortageCount?: number;
  maxWaitingThresholdMinutes?: number;
  maxConcurrentCasesPerDoctor?: number;
  activeStrategy?: AllocationStrategy | string;
  updatedAt: string;
}

export interface StrategyRun {
  strategyId: "A" | "B" | "C" | "D" | string;
  strategyName: string;
  description: string;
  simulatedAt: string;
  avgWaitingTimeMinutes: number;
  criticalWaitingTimeMinutes: number;
  resourceUtilizationPct: number;
  conflictsCount: number;
  patientsServed: number;
  patientsStarved: number;
  unresolvedAllocations: number;
  notes: string;
}

export interface HospitalAlert {
  id: string;
  severity: "CRITICAL" | "WARNING" | "INFO";
  title: string;
  message: string;
  timestamp: string;
  entityId?: string;
  alertType: "CRITICAL_PATIENT" | "RESOURCE_SHORTAGE" | "CONFLICT" | "LONG_WAIT" | "SYSTEM";
}

export interface HospitalStats {
  totalPatients: number;
  criticalPatients: number;
  highPriorityPatients: number;
  patientsWaiting: number;
  availableBeds: number;
  totalBeds: number;
  icuAvailable: number;
  totalIcu: number;
  operatingRoomsAvailable: number;
  totalOperatingRooms: number;
  doctorsAvailable: number;
  totalDoctors: number;
  nursesAvailable: number;
  totalNurses: number;
  activeAllocations: number;
  ambulancesAvailable: number;
  totalAmbulances: number;
}
