import type {
  Patient,
  Resource,
  ResourceAllocation,
  SystemSettings,
  StaffMember,
  StrategyRun,
  UrgencyLevel,
  ResourceType,
} from "../src/types";

export interface PriorityCalculationResult {
  score: number;
  urgencyPoints: number;
  waitingPoints: number;
  riskPoints: number;
  resourcePoints: number;
  explanation: string;
}

export function calculatePatientPriority(
  patient: Patient,
  settings: SystemSettings
): PriorityCalculationResult {
  const weights = settings.priorityFormulaWeights || {
    urgencyWeight: 1.0,
    waitingWeight: 0.5,
    riskWeight: 0.8,
    resourceWeight: 0.4,
  };

  // 1. Urgency Base Score
  let urgencyBase = 20;
  if (patient.urgencyLevel === "CRITICAL") urgencyBase = 100;
  else if (patient.urgencyLevel === "HIGH") urgencyBase = 70;
  else if (patient.urgencyLevel === "MODERATE") urgencyBase = 40;
  else if (patient.urgencyLevel === "LOW") urgencyBase = 20;

  const urgencyPoints = Math.round(urgencyBase * weights.urgencyWeight);

  // 2. Waiting Time Aging (Fairness Engine)
  const arrival = new Date(patient.arrivalTime).getTime();
  const now = Date.now();
  const waitingMinutes = Math.max(0, Math.floor((now - arrival) / (1000 * 60)));
  const waitingPoints = Math.round(waitingMinutes * weights.waitingWeight);

  // 3. Clinical Risk Score from Vitals & Emergency Status
  let riskBase = 0;
  if (patient.emergencyStatus) riskBase += 25;
  if (patient.vitalSigns) {
    const { oxygenSaturation, heartRate, bloodPressureSystolic } = patient.vitalSigns;
    if (oxygenSaturation !== undefined && oxygenSaturation < 90) riskBase += 30;
    else if (oxygenSaturation !== undefined && oxygenSaturation < 94) riskBase += 15;

    if (heartRate !== undefined && (heartRate > 125 || heartRate < 45)) riskBase += 20;
    if (bloodPressureSystolic !== undefined && (bloodPressureSystolic > 180 || bloodPressureSystolic < 85)) riskBase += 20;
  }
  if (patient.assessment?.red_flags && patient.assessment.red_flags.length > 0) {
    riskBase += Math.min(patient.assessment.red_flags.length * 10, 30);
  }
  const riskPoints = Math.round(riskBase * weights.riskWeight);

  // 4. Resource Criticality Score
  let resourceBase = 10;
  const reqLower = (patient.requiredTreatment || "").toLowerCase();
  const suggested = patient.assessment?.suggested_resources || [];
  const needsIcu = suggested.some((r) => r.resource_type === "ICU_BED") || reqLower.includes("icu");
  const needsOr = suggested.some((r) => r.resource_type === "OPERATING_ROOM") || reqLower.includes("surgery") || reqLower.includes("or");

  if (needsIcu) resourceBase = 35;
  else if (needsOr) resourceBase = 30;
  else if (suggested.some((r) => r.resource_type === "VENTILATOR")) resourceBase = 25;

  const resourcePoints = Math.round(resourceBase * weights.resourceWeight);

  const totalScore = Math.max(1, urgencyPoints + waitingPoints + riskPoints + resourcePoints);

  // Clear plain-language explanation
  const explanationParts: string[] = [];
  explanationParts.push(`${patient.urgencyLevel} urgency (+${urgencyPoints} pts)`);
  if (waitingMinutes > 0) {
    explanationParts.push(`waiting ${waitingMinutes} min (+${waitingPoints} pts aging)`);
  }
  if (riskPoints > 0) {
    explanationParts.push(`clinical risk factor (+${riskPoints} pts)`);
  }
  if (resourcePoints > 0) {
    explanationParts.push(`resource criticality (+${resourcePoints} pts)`);
  }

  const explanation = `Priority score ${totalScore}: ${explanationParts.join(" + ")}.`;

  return {
    score: totalScore,
    urgencyPoints,
    waitingPoints,
    riskPoints,
    resourcePoints,
    explanation,
  };
}

export interface ConflictCheckResult {
  hasConflict: boolean;
  conflictType?: "OCCUPIED" | "MAINTENANCE" | "STAFF_OVERLOAD" | "CAPACITY_EXCEEDED" | "DEPARTMENT_CLOSED" | "INCOMPATIBLE";
  reason?: string;
  alternativeResources: Resource[];
}

export function checkResourceConflict(
  resource: Resource,
  patient: Patient,
  allResources: Resource[],
  allStaff: StaffMember[],
  activeAllocations: ResourceAllocation[]
): ConflictCheckResult {
  // 1. Check physical status
  if (resource.status === "IN_USE") {
    const existing = activeAllocations.find((a) => a.resourceId === resource.id && a.status === "ACTIVE");
    const alts = allResources.filter(
      (r) => r.id !== resource.id && r.type === resource.type && r.status === "AVAILABLE"
    );
    return {
      hasConflict: true,
      conflictType: "OCCUPIED",
      reason: `${resource.name} (${resource.resourceNumber}) is currently occupied by patient ${existing?.patientName || "another patient"}.`,
      alternativeResources: alts,
    };
  }

  if (resource.status === "MAINTENANCE" || resource.status === "UNAVAILABLE") {
    const alts = allResources.filter(
      (r) => r.id !== resource.id && r.type === resource.type && r.status === "AVAILABLE"
    );
    return {
      hasConflict: true,
      conflictType: "MAINTENANCE",
      reason: `${resource.name} (${resource.resourceNumber}) is currently in maintenance: ${resource.maintenanceReason || "Offline"}.`,
      alternativeResources: alts,
    };
  }

  // 2. Staff overload check
  if (resource.type === "DOCTOR" || resource.type === "NURSE") {
    const staff = allStaff.find((s) => s.id === resource.id || s.name === resource.name);
    if (staff && staff.activeAllocationsCount >= staff.maxConcurrentCases) {
      const altStaff = allResources.filter(
        (r) => r.id !== resource.id && r.type === resource.type && r.status === "AVAILABLE"
      );
      return {
        hasConflict: true,
        conflictType: "STAFF_OVERLOAD",
        reason: `${resource.name} has reached maximum concurrent case capacity (${staff.maxConcurrentCases} cases).`,
        alternativeResources: altStaff,
      };
    }
  }

  // 3. Clinical compatibility check
  if (patient.urgencyLevel === "CRITICAL" && resource.type === "BED" && !resource.name.includes("ICU")) {
    const icuAvailable = allResources.filter((r) => r.type === "ICU_BED" && r.status === "AVAILABLE");
    if (icuAvailable.length > 0) {
      return {
        hasConflict: false, // Feasible, but ICU is superior
        alternativeResources: icuAvailable,
      };
    }
  }

  return {
    hasConflict: false,
    alternativeResources: [],
  };
}

export interface SmartAllocationPlanItem {
  patientId: string;
  patientName: string;
  urgencyLevel: UrgencyLevel;
  priorityScore: number;
  resourceId: string;
  resourceNumber: string;
  resourceName: string;
  resourceType: ResourceType;
  justification: string;
}

export interface SmartAllocationResult {
  feasibleAllocations: SmartAllocationPlanItem[];
  unallocatedPatients: Array<{
    patientId: string;
    patientName: string;
    urgencyLevel: UrgencyLevel;
    reason: string;
  }>;
  summary: string;
}

export function computeSmartAllocation(
  patients: Patient[],
  resources: Resource[],
  staff: StaffMember[],
  allocations: ResourceAllocation[],
  settings: SystemSettings
): SmartAllocationResult {
  // Only consider patients in WAITING or TRIAGED status
  const waitingPatients = patients
    .filter((p) => p.status === "WAITING" || p.status === "TRIAGED")
    .sort((a, b) => b.priorityScore - a.priorityScore);

  const availableResources = [...resources.filter((r) => r.status === "AVAILABLE")];
  const feasibleAllocations: SmartAllocationPlanItem[] = [];
  const unallocatedPatients: SmartAllocationResult["unallocatedPatients"] = [];

  for (const patient of waitingPatients) {
    // Determine needed resource type
    let neededType: ResourceType = "BED";
    if (patient.urgencyLevel === "CRITICAL") {
      neededType = "ICU_BED";
    } else if ((patient.requiredTreatment || "").toLowerCase().includes("surgery")) {
      neededType = "OPERATING_ROOM";
    }

    // Try finding exact resource type
    let candidateIndex = availableResources.findIndex(
      (r) => r.type === neededType && r.status === "AVAILABLE"
    );

    // Fallback: if ICU_BED needed but none available, check if general BED is available with alert
    if (candidateIndex === -1 && neededType === "ICU_BED") {
      candidateIndex = availableResources.findIndex(
        (r) => r.type === "BED" && r.status === "AVAILABLE"
      );
    }

    if (candidateIndex !== -1) {
      const resource = availableResources[candidateIndex];
      // Check conflict
      const conflict = checkResourceConflict(resource, patient, resources, staff, allocations);
      if (!conflict.hasConflict) {
        // Reserve resource in this simulation pass
        availableResources.splice(candidateIndex, 1);

        const justification = `${resource.name} (${resource.resourceNumber}) assigned to ${patient.name} because: Priority ${patient.urgencyLevel} (${patient.priorityScore} pts), waiting ${patient.waitingMinutes} min, required resource type available, and no scheduling conflict.`;

        feasibleAllocations.push({
          patientId: patient.id,
          patientName: patient.name,
          urgencyLevel: patient.urgencyLevel,
          priorityScore: patient.priorityScore,
          resourceId: resource.id,
          resourceNumber: resource.resourceNumber,
          resourceName: resource.name,
          resourceType: resource.type,
          justification,
        });
      } else {
        unallocatedPatients.push({
          patientId: patient.id,
          patientName: patient.name,
          urgencyLevel: patient.urgencyLevel,
          reason: conflict.reason || "Resource conflict detected",
        });
      }
    } else {
      unallocatedPatients.push({
        patientId: patient.id,
        patientName: patient.name,
        urgencyLevel: patient.urgencyLevel,
        reason: `No available ${neededType} currently in hospital inventory.`,
      });
    }
  }

  const summary = `Evaluated ${waitingPatients.length} waiting patients: ${feasibleAllocations.length} feasible allocations identified, ${unallocatedPatients.length} require additional resources or reassessment.`;

  return {
    feasibleAllocations,
    unallocatedPatients,
    summary,
  };
}

export function runStrategyComparison(
  patients: Patient[],
  resources: Resource[],
  staff: StaffMember[],
  allocations: ResourceAllocation[],
  currentSettings: SystemSettings
): StrategyRun[] {
  const strategies: Array<{
    id: "A" | "B" | "C" | "D";
    name: string;
    description: string;
    weights: SystemSettings["priorityFormulaWeights"];
  }> = [
    {
      id: "A",
      name: "Strategy A: Urgency Only",
      description: "Allocates strictly by clinical triage severity without waiting-time aging.",
      weights: { urgencyWeight: 1.0, waitingWeight: 0.0, riskWeight: 0.5, resourceWeight: 0.0 },
    },
    {
      id: "B",
      name: "Strategy B: Urgency + Waiting Time",
      description: "Balances clinical urgency with progressive aging points to prevent starvation.",
      weights: { urgencyWeight: 1.0, waitingWeight: 0.8, riskWeight: 0.5, resourceWeight: 0.0 },
    },
    {
      id: "C",
      name: "Strategy C: Urgency + Waiting Time + Resource Utilization",
      description: "Optimizes for rapid patient turnaround and balanced departmental resource utilization.",
      weights: { urgencyWeight: 0.9, waitingWeight: 0.6, riskWeight: 0.6, resourceWeight: 0.8 },
    },
    {
      id: "D",
      name: "Strategy D: Configurable Weighted Strategy",
      description: "Current operational weights configured by the hospital administration.",
      weights: currentSettings.priorityFormulaWeights,
    },
  ];

  return strategies.map((s) => {
    const mockSettings: SystemSettings = {
      ...currentSettings,
      priorityFormulaWeights: s.weights,
    };

    // Re-score patients under this strategy
    const scoredPatients = patients.map((p) => {
      const calc = calculatePatientPriority(p, mockSettings);
      return { ...p, priorityScore: calc.score };
    });

    const allocResult = computeSmartAllocation(
      scoredPatients,
      resources,
      staff,
      allocations,
      mockSettings
    );

    const waitingPatients = scoredPatients.filter((p) => p.status === "WAITING" || p.status === "TRIAGED");
    const totalWaiting = waitingPatients.reduce((sum, p) => sum + p.waitingMinutes, 0);
    const avgWaiting = waitingPatients.length > 0 ? Math.round(totalWaiting / waitingPatients.length) : 0;

    const criticalPatients = waitingPatients.filter((p) => p.urgencyLevel === "CRITICAL");
    const critWaiting = criticalPatients.reduce((sum, p) => sum + p.waitingMinutes, 0);
    const avgCritWaiting = criticalPatients.length > 0 ? Math.round(critWaiting / criticalPatients.length) : 0;

    const totalRes = resources.length;
    const occupied = resources.filter((r) => r.status === "IN_USE").length + allocResult.feasibleAllocations.length;
    const utilPct = totalRes > 0 ? Math.min(100, Math.round((occupied / totalRes) * 100)) : 0;

    // Starvation metric: patients waiting > 45 mins who got unallocated
    const starvedCount = allocResult.unallocatedPatients.filter((up) => {
      const pat = waitingPatients.find((p) => p.id === up.patientId);
      return pat && pat.waitingMinutes > 45 && pat.urgencyLevel !== "CRITICAL";
    }).length;

    return {
      strategyId: s.id,
      strategyName: s.name,
      description: s.description,
      simulatedAt: new Date().toISOString(),
      avgWaitingTimeMinutes: avgWaiting,
      criticalWaitingTimeMinutes: avgCritWaiting,
      resourceUtilizationPct: utilPct,
      conflictsCount: 0,
      patientsServed: allocResult.feasibleAllocations.length,
      patientsStarved: starvedCount,
      unresolvedAllocations: allocResult.unallocatedPatients.length,
      notes: `${allocResult.feasibleAllocations.length} feasible allocations. ${starvedCount} potential patient starvations flagged.`,
    };
  });
}
