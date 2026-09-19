export interface IcdRecord {
  code: string;
  title: string;
  chapter: string;
  category: string;
}

export const WHO_ICD_DATASET: IcdRecord[] = [
  { code: "I21.9", title: "Acute myocardial infarction, unspecified", chapter: "Diseases of the circulatory system", category: "Cardiology / Emergency" },
  { code: "I20.0", title: "Unstable angina", chapter: "Diseases of the circulatory system", category: "Cardiology" },
  { code: "I50.9", title: "Heart failure, unspecified", chapter: "Diseases of the circulatory system", category: "Cardiology / Critical Care" },
  { code: "I63.9", title: "Cerebral infarction, unspecified (Ischemic Stroke)", chapter: "Diseases of the circulatory system", category: "Neurology / Emergency" },
  { code: "I61.9", title: "Intracerebral hemorrhage, unspecified", chapter: "Diseases of the circulatory system", category: "Neurology / Critical Care" },
  { code: "J96.00", title: "Acute respiratory failure, unspecified with hypoxia", chapter: "Diseases of the respiratory system", category: "Pulmonology / ICU" },
  { code: "J44.1", title: "Chronic obstructive pulmonary disease with acute exacerbation", chapter: "Diseases of the respiratory system", category: "Pulmonology" },
  { code: "J18.9", title: "Pneumonia, unspecified organism", chapter: "Diseases of the respiratory system", category: "Infectious / Inpatient" },
  { code: "J45.901", title: "Unspecified asthma with acute exacerbation", chapter: "Diseases of the respiratory system", category: "Emergency / Pulmonology" },
  { code: "A41.9", title: "Sepsis, unspecified organism", chapter: "Certain infectious and parasitic diseases", category: "Critical Care / Infectious" },
  { code: "R57.2", title: "Septic shock", chapter: "Symptoms, signs and abnormal clinical findings", category: "ICU / Emergency" },
  { code: "K35.80", title: "Unspecified acute appendicitis", chapter: "Diseases of the digestive system", category: "General Surgery" },
  { code: "K80.00", title: "Calculus of gallbladder with acute cholecystitis", chapter: "Diseases of the digestive system", category: "General Surgery" },
  { code: "K92.2", title: "Gastrointestinal hemorrhage, unspecified", chapter: "Diseases of the digestive system", category: "Gastroenterology / Emergency" },
  { code: "S06.0X0A", title: "Concussion without loss of consciousness, initial encounter", chapter: "Injury, poisoning and certain other consequences", category: "Trauma / Neurology" },
  { code: "S06.5X9A", title: "Traumatic subdural hemorrhage without loss of consciousness", chapter: "Injury, poisoning and certain other consequences", category: "Neurosurgery / Trauma" },
  { code: "S72.001A", title: "Fracture of head and neck of femur, initial encounter", chapter: "Injury, poisoning and certain other consequences", category: "Orthopedics / Surgery" },
  { code: "T07.XXXA", title: "Unspecified multiple injuries (Polytrauma)", chapter: "Injury, poisoning and certain other consequences", category: "Trauma / Critical Care" },
  { code: "E11.10", title: "Type 2 diabetes mellitus with ketoacidosis without coma", chapter: "Endocrine, nutritional and metabolic diseases", category: "Endocrinology / Emergency" },
  { code: "N17.9", title: "Acute kidney failure, unspecified", chapter: "Diseases of the genitourinary system", category: "Nephrology / Inpatient" },
  { code: "G40.909", title: "Epilepsy, unspecified, not intractable, without status epilepticus", chapter: "Diseases of the nervous system", category: "Neurology" },
  { code: "G41.9", title: "Status epilepticus, unspecified", chapter: "Diseases of the nervous system", category: "Neurology / Critical Care" },
  { code: "I16.0", title: "Hypertensive urgency", chapter: "Diseases of the circulatory system", category: "Cardiology / Emergency" },
  { code: "I16.1", title: "Hypertensive emergency", chapter: "Diseases of the circulatory system", category: "Cardiology / ICU" },
  { code: "T78.2XXA", title: "Anaphylactic shock, unspecified, initial encounter", chapter: "Injury, poisoning and certain other consequences", category: "Emergency / Critical Care" }
];

export function searchIcdDataset(query: string): IcdRecord[] {
  if (!query || query.trim() === "") {
    return WHO_ICD_DATASET.slice(0, 10);
  }
  const clean = query.toLowerCase().trim();
  return WHO_ICD_DATASET.filter(
    (item) =>
      item.code.toLowerCase().includes(clean) ||
      item.title.toLowerCase().includes(clean) ||
      item.category.toLowerCase().includes(clean)
  );
}
