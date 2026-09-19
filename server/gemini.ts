import { GoogleGenAI, Type } from "@google/genai";
import type { PatientAssessment, UrgencyLevel } from "../src/types";

let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

export interface IntakeAnalysisInput {
  patientName: string;
  age: number;
  gender: string;
  symptoms: string;
  clinicalNotes?: string;
  vitalSigns?: {
    heartRate?: number;
    bloodPressureSystolic?: number;
    bloodPressureDiastolic?: number;
    oxygenSaturation?: number;
    respiratoryRate?: number;
    temperatureCelsius?: number;
  };
  knownConditions?: string[];
  allergies?: string[];
  documentBase64?: string;
  documentMimeType?: string;
}

export async function analyzePatientIntake(
  input: IntakeAnalysisInput
): Promise<Omit<PatientAssessment, "id" | "patientId" | "createdAt" | "staffConfirmed">> {
  const client = getAiClient();

  // If Gemini API is not configured, fall back safely to clinical rule-based assessment
  if (!client) {
    return fallbackRuleBasedAssessment(input, "Gemini API key not configured. Using rule-based clinical intake protocol.");
  }

  try {
    const promptText = `
You are MedFlow's clinical intake triage assistant.
Evaluate this hospital patient's symptoms, clinical notes, vital signs, and conditions to assess clinical urgency and recommend hospital resource requirements.

CRITICAL INSTRUCTIONS:
1. Do NOT make a definitive diagnosis. This is an AI-assisted triage assessment.
2. The urgency levels are: CRITICAL, HIGH, MODERATE, LOW.
   - CRITICAL: Immediate life threat (e.g., cardiac arrest, respiratory failure, severe trauma, anaphylaxis, SpO2 < 88%, acute stroke).
   - HIGH: Potentially severe or rapidly deteriorating condition (e.g., severe chest pain, high fever with altered mental status, severe fractures, acute abdomen).
   - MODERATE: Serious but stable condition requiring medical attention within 1-2 hours (e.g., moderate lacerations, controlled asthma, kidney stone, persistent vomiting).
   - LOW: Non-urgent, minor symptoms (e.g., mild sprains, superficial rashes, mild upper respiratory cold).
3. Suggest appropriate hospital resources (e.g. ICU_BED, BED, OPERATING_ROOM, DOCTOR, NURSE, VENTILATOR, EQUIPMENT).
4. Identify any clinical red flags.
5. Provide potential WHO ICD-10 suggestions.

Patient Details:
- Name: ${input.patientName}
- Age: ${input.age} | Gender: ${input.gender}
- Chief Symptoms: ${input.symptoms}
- Clinical Notes: ${input.clinicalNotes || "None provided"}
- Known Conditions: ${(input.knownConditions || []).join(", ") || "None recorded"}
- Allergies: ${(input.allergies || []).join(", ") || "None recorded"}
- Vital Signs:
  Heart Rate: ${input.vitalSigns?.heartRate ?? "N/A"} bpm
  Blood Pressure: ${input.vitalSigns?.bloodPressureSystolic ?? "N/A"}/${input.vitalSigns?.bloodPressureDiastolic ?? "N/A"} mmHg
  SpO2: ${input.vitalSigns?.oxygenSaturation ?? "N/A"}%
  Resp Rate: ${input.vitalSigns?.respiratoryRate ?? "N/A"}/min
  Temp: ${input.vitalSigns?.temperatureCelsius ?? "N/A"} °C
`;

    const contents: Array<any> = [];

    if (input.documentBase64 && input.documentMimeType) {
      contents.push({
        inlineData: {
          mimeType: input.documentMimeType,
          data: input.documentBase64,
        },
      });
    }

    contents.push(promptText);

    const response = await client.models.generateContent({
      model: "gemini-3.8-flash",
      contents,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            urgency_level: {
              type: Type.STRING,
              enum: ["CRITICAL", "HIGH", "MODERATE", "LOW"],
            },
            confidence: {
              type: Type.NUMBER,
            },
            red_flags: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            possible_conditions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            recommended_department: {
              type: Type.STRING,
            },
            suggested_resources: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  resource_type: { type: Type.STRING },
                  quantity: { type: Type.INTEGER },
                  reason: { type: Type.STRING },
                },
                required: ["resource_type", "quantity", "reason"],
              },
            },
            icd10_suggestions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  code: { type: Type.STRING },
                  description: { type: Type.STRING },
                },
                required: ["code", "description"],
              },
            },
            requires_human_review: {
              type: Type.BOOLEAN,
            },
            clinical_notes: {
              type: Type.STRING,
            },
          },
          required: [
            "urgency_level",
            "confidence",
            "red_flags",
            "possible_conditions",
            "recommended_department",
            "suggested_resources",
            "requires_human_review",
          ],
        },
      },
    });

    const rawText = response.text || "{}";
    const parsed = JSON.parse(rawText);

    return {
      urgency_level: (parsed.urgency_level || "MODERATE") as UrgencyLevel,
      confidence: Math.min(Math.max(parsed.confidence ?? 0.85, 0.1), 1.0),
      red_flags: Array.isArray(parsed.red_flags) ? parsed.red_flags : [],
      possible_conditions: Array.isArray(parsed.possible_conditions) ? parsed.possible_conditions : [],
      recommended_department: parsed.recommended_department || "Emergency",
      suggested_resources: Array.isArray(parsed.suggested_resources)
        ? parsed.suggested_resources.map((r: any) => ({
            resource_type: String(r.resource_type || "BED"),
            quantity: Number(r.quantity || 1),
            reason: String(r.reason || "Clinical requirement"),
          }))
        : [{ resource_type: "BED", quantity: 1, reason: "Inpatient observation" }],
      icd10_suggestions: Array.isArray(parsed.icd10_suggestions) ? parsed.icd10_suggestions : [],
      requires_human_review: true, // Always true for patient safety!
      clinicalNotes: parsed.clinical_notes || "AI-assisted triage assessment generated.",
    };
  } catch (error) {
    console.error("Gemini triage analysis error:", error);
    return fallbackRuleBasedAssessment(input, "Gemini service temporarily unavailable; standard deterministic triage applied.");
  }
}

function fallbackRuleBasedAssessment(
  input: IntakeAnalysisInput,
  noticeReason: string
): Omit<PatientAssessment, "id" | "patientId" | "createdAt" | "staffConfirmed"> {
  const lowerSymptoms = (input.symptoms + " " + (input.clinicalNotes || "")).toLowerCase();
  const spo2 = input.vitalSigns?.oxygenSaturation;
  const hr = input.vitalSigns?.heartRate;
  const sbp = input.vitalSigns?.bloodPressureSystolic;

  let urgency: UrgencyLevel = "MODERATE";
  const redFlags: string[] = [];
  const suggestedResources: any[] = [];
  const possibleConditions: string[] = [];
  let department = "Emergency";

  if (
    lowerSymptoms.includes("cardiac arrest") ||
    lowerSymptoms.includes("unresponsive") ||
    lowerSymptoms.includes("stroke") ||
    lowerSymptoms.includes("anaphylaxis") ||
    (spo2 !== undefined && spo2 < 88) ||
    (sbp !== undefined && sbp < 80)
  ) {
    urgency = "CRITICAL";
    redFlags.push("Vital signs or acute presentation indicates immediate life threat.");
    suggestedResources.push({ resource_type: "ICU_BED", quantity: 1, reason: "Continuous vital monitoring and intensive care" });
    suggestedResources.push({ resource_type: "DOCTOR", quantity: 1, reason: "Immediate resuscitation / emergency intervention" });
    department = "ICU";
    possibleConditions.push("Acute Hemodynamic or Respiratory Instability");
  } else if (
    lowerSymptoms.includes("chest pain") ||
    lowerSymptoms.includes("shortness of breath") ||
    lowerSymptoms.includes("severe fracture") ||
    lowerSymptoms.includes("acute abdomen") ||
    (spo2 !== undefined && spo2 < 93) ||
    (hr !== undefined && (hr > 130 || hr < 45))
  ) {
    urgency = "HIGH";
    redFlags.push("Potential for rapid clinical deterioration.");
    suggestedResources.push({ resource_type: "BED", quantity: 1, reason: "Dedicated emergency observation bed" });
    suggestedResources.push({ resource_type: "DOCTOR", quantity: 1, reason: "Specialist evaluation within 30 minutes" });
    department = "Emergency";
    possibleConditions.push("Cardiopulmonary or Acute Surgical Condition");
  } else if (lowerSymptoms.includes("cold") || lowerSymptoms.includes("minor") || lowerSymptoms.includes("rash") || lowerSymptoms.includes("mild sprain")) {
    urgency = "LOW";
    suggestedResources.push({ resource_type: "DOCTOR", quantity: 1, reason: "Outpatient clinical consultation" });
    department = "General Medicine";
    possibleConditions.push("Minor Outpatient Ailment");
  } else {
    urgency = "MODERATE";
    suggestedResources.push({ resource_type: "BED", quantity: 1, reason: "Standard clinical evaluation bed" });
    suggestedResources.push({ resource_type: "NURSE", quantity: 1, reason: "Triage and baseline nursing assessment" });
    department = "General Medicine";
    possibleConditions.push("Acute Non-Life-Threatening Condition");
  }

  return {
    urgency_level: urgency,
    confidence: 0.8,
    red_flags: redFlags,
    possible_conditions: possibleConditions,
    recommended_department: department,
    suggested_resources: suggestedResources,
    icd10_suggestions: [
      { code: urgency === "CRITICAL" ? "I21.9" : urgency === "HIGH" ? "I20.0" : "R57.2", description: "Provisional clinical category" },
    ],
    requires_human_review: true,
    clinicalNotes: noticeReason,
  };
}
