/**
 * Sample Adult Census dataset (subset) for demo purposes.
 * Based on the UCI Adult Census dataset — a classic bias benchmark.
 * This demonstrates gender and race bias in income prediction.
 */

export const SAMPLE_DATA_NAME = "Adult Census Income (Demo)";
export const SAMPLE_DATA_DESCRIPTION = "A subset of the UCI Adult Census dataset. Demonstrates gender and race bias in income prediction (>50K vs <=50K).";

export const SAMPLE_COLUMNS = ["age", "workclass", "education", "marital_status", "occupation", "race", "gender", "hours_per_week", "native_country", "income"];

export const SAMPLE_SENSITIVE_COL = "gender";
export const SAMPLE_TARGET_COL = "income";
export const SAMPLE_FAVORABLE_VALUE = ">50K";
export const SAMPLE_PRIVILEGED_VALUE = "Male";

export const SAMPLE_CSV_DATA = [
  { age: 39, workclass: "State-gov", education: "Bachelors", marital_status: "Never-married", occupation: "Adm-clerical", race: "White", gender: "Male", hours_per_week: 40, native_country: "United-States", income: ">50K" },
  { age: 50, workclass: "Self-emp-not-inc", education: "Bachelors", marital_status: "Married-civ-spouse", occupation: "Exec-managerial", race: "White", gender: "Male", hours_per_week: 13, native_country: "United-States", income: ">50K" },
  { age: 38, workclass: "Private", education: "HS-grad", marital_status: "Divorced", occupation: "Handlers-cleaners", race: "White", gender: "Male", hours_per_week: 40, native_country: "United-States", income: "<=50K" },
  { age: 53, workclass: "Private", education: "11th", marital_status: "Married-civ-spouse", occupation: "Handlers-cleaners", race: "Black", gender: "Male", hours_per_week: 40, native_country: "United-States", income: "<=50K" },
  { age: 28, workclass: "Private", education: "Bachelors", marital_status: "Married-civ-spouse", occupation: "Prof-specialty", race: "Black", gender: "Female", hours_per_week: 40, native_country: "Cuba", income: "<=50K" },
  { age: 37, workclass: "Private", education: "Masters", marital_status: "Married-civ-spouse", occupation: "Exec-managerial", race: "White", gender: "Female", hours_per_week: 40, native_country: "United-States", income: "<=50K" },
  { age: 49, workclass: "Private", education: "9th", marital_status: "Married-spouse-absent", occupation: "Other-service", race: "Black", gender: "Female", hours_per_week: 16, native_country: "Jamaica", income: "<=50K" },
  { age: 52, workclass: "Self-emp-not-inc", education: "HS-grad", marital_status: "Married-civ-spouse", occupation: "Exec-managerial", race: "White", gender: "Male", hours_per_week: 45, native_country: "United-States", income: ">50K" },
  { age: 31, workclass: "Private", education: "Masters", marital_status: "Never-married", occupation: "Prof-specialty", race: "White", gender: "Female", hours_per_week: 50, native_country: "United-States", income: ">50K" },
  { age: 42, workclass: "Private", education: "Bachelors", marital_status: "Married-civ-spouse", occupation: "Exec-managerial", race: "White", gender: "Male", hours_per_week: 40, native_country: "United-States", income: ">50K" },
  { age: 37, workclass: "Private", education: "Some-college", marital_status: "Married-civ-spouse", occupation: "Craft-repair", race: "Black", gender: "Male", hours_per_week: 80, native_country: "United-States", income: ">50K" },
  { age: 30, workclass: "State-gov", education: "Bachelors", marital_status: "Married-civ-spouse", occupation: "Prof-specialty", race: "Asian-Pac-Islander", gender: "Male", hours_per_week: 40, native_country: "India", income: ">50K" },
  { age: 23, workclass: "Private", education: "Bachelors", marital_status: "Never-married", occupation: "Adm-clerical", race: "White", gender: "Female", hours_per_week: 30, native_country: "United-States", income: "<=50K" },
  { age: 32, workclass: "Private", education: "Assoc-acdm", marital_status: "Never-married", occupation: "Sales", race: "Black", gender: "Male", hours_per_week: 50, native_country: "United-States", income: "<=50K" },
  { age: 40, workclass: "Private", education: "Assoc-voc", marital_status: "Married-civ-spouse", occupation: "Craft-repair", race: "Asian-Pac-Islander", gender: "Male", hours_per_week: 40, native_country: "Philippines", income: ">50K" },
  { age: 34, workclass: "Private", education: "7th-8th", marital_status: "Married-civ-spouse", occupation: "Transport-moving", race: "Amer-Indian-Eskimo", gender: "Male", hours_per_week: 45, native_country: "Mexico", income: "<=50K" },
  { age: 25, workclass: "Self-emp-not-inc", education: "HS-grad", marital_status: "Never-married", occupation: "Farming-fishing", race: "White", gender: "Male", hours_per_week: 35, native_country: "United-States", income: "<=50K" },
  { age: 32, workclass: "Private", education: "HS-grad", marital_status: "Never-married", occupation: "Machine-op-inspct", race: "White", gender: "Male", hours_per_week: 40, native_country: "United-States", income: "<=50K" },
  { age: 38, workclass: "Private", education: "11th", marital_status: "Married-civ-spouse", occupation: "Sales", race: "White", gender: "Male", hours_per_week: 50, native_country: "United-States", income: "<=50K" },
  { age: 43, workclass: "Self-emp-not-inc", education: "Masters", marital_status: "Married-civ-spouse", occupation: "Exec-managerial", race: "White", gender: "Male", hours_per_week: 45, native_country: "United-States", income: ">50K" },
  { age: 40, workclass: "Private", education: "Doctorate", marital_status: "Married-civ-spouse", occupation: "Prof-specialty", race: "White", gender: "Male", hours_per_week: 60, native_country: "United-States", income: ">50K" },
  { age: 54, workclass: "Private", education: "HS-grad", marital_status: "Separated", occupation: "Other-service", race: "Black", gender: "Female", hours_per_week: 20, native_country: "United-States", income: "<=50K" },
  { age: 35, workclass: "Federal-gov", education: "9th", marital_status: "Married-civ-spouse", occupation: "Farming-fishing", race: "Black", gender: "Male", hours_per_week: 40, native_country: "United-States", income: "<=50K" },
  { age: 43, workclass: "Private", education: "11th", marital_status: "Married-civ-spouse", occupation: "Transport-moving", race: "White", gender: "Male", hours_per_week: 40, native_country: "United-States", income: "<=50K" },
  { age: 59, workclass: "Private", education: "HS-grad", marital_status: "Divorced", occupation: "Tech-support", race: "White", gender: "Female", hours_per_week: 40, native_country: "United-States", income: "<=50K" },
  { age: 56, workclass: "Local-gov", education: "Bachelors", marital_status: "Married-civ-spouse", occupation: "Tech-support", race: "White", gender: "Male", hours_per_week: 40, native_country: "United-States", income: ">50K" },
  { age: 19, workclass: "Private", education: "HS-grad", marital_status: "Never-married", occupation: "Craft-repair", race: "White", gender: "Male", hours_per_week: 40, native_country: "United-States", income: "<=50K" },
  { age: 54, workclass: "Private", education: "HS-grad", marital_status: "Married-civ-spouse", occupation: "Machine-op-inspct", race: "White", gender: "Female", hours_per_week: 40, native_country: "United-States", income: "<=50K" },
  { age: 39, workclass: "Private", education: "HS-grad", marital_status: "Divorced", occupation: "Adm-clerical", race: "White", gender: "Female", hours_per_week: 36, native_country: "United-States", income: "<=50K" },
  { age: 49, workclass: "Private", education: "HS-grad", marital_status: "Married-civ-spouse", occupation: "Craft-repair", race: "White", gender: "Male", hours_per_week: 40, native_country: "United-States", income: "<=50K" },
  { age: 23, workclass: "Local-gov", education: "Assoc-acdm", marital_status: "Never-married", occupation: "Protective-serv", race: "White", gender: "Male", hours_per_week: 52, native_country: "United-States", income: "<=50K" },
  { age: 20, workclass: "Private", education: "Some-college", marital_status: "Never-married", occupation: "Sales", race: "Black", gender: "Male", hours_per_week: 44, native_country: "United-States", income: "<=50K" },
  { age: 45, workclass: "Private", education: "Bachelors", marital_status: "Divorced", occupation: "Exec-managerial", race: "White", gender: "Female", hours_per_week: 48, native_country: "United-States", income: ">50K" },
  { age: 30, workclass: "Federal-gov", education: "Some-college", marital_status: "Married-civ-spouse", occupation: "Adm-clerical", race: "White", gender: "Male", hours_per_week: 40, native_country: "United-States", income: "<=50K" },
  { age: 22, workclass: "State-gov", education: "Some-college", marital_status: "Never-married", occupation: "Other-service", race: "Asian-Pac-Islander", gender: "Female", hours_per_week: 15, native_country: "Taiwan", income: "<=50K" },
  { age: 48, workclass: "Private", education: "HS-grad", marital_status: "Married-civ-spouse", occupation: "Machine-op-inspct", race: "White", gender: "Male", hours_per_week: 40, native_country: "United-States", income: "<=50K" },
  { age: 21, workclass: "Private", education: "Some-college", marital_status: "Never-married", occupation: "Machine-op-inspct", race: "White", gender: "Male", hours_per_week: 40, native_country: "United-States", income: "<=50K" },
  { age: 31, workclass: "Private", education: "Bachelors", marital_status: "Married-civ-spouse", occupation: "Sales", race: "White", gender: "Male", hours_per_week: 50, native_country: "United-States", income: ">50K" },
  { age: 48, workclass: "Self-emp-inc", education: "Bachelors", marital_status: "Married-civ-spouse", occupation: "Exec-managerial", race: "White", gender: "Male", hours_per_week: 40, native_country: "United-States", income: ">50K" },
  { age: 31, workclass: "Private", education: "Masters", marital_status: "Never-married", occupation: "Prof-specialty", race: "White", gender: "Female", hours_per_week: 38, native_country: "United-States", income: "<=50K" },
  { age: 53, workclass: "Private", education: "9th", marital_status: "Married-civ-spouse", occupation: "Handlers-cleaners", race: "White", gender: "Male", hours_per_week: 38, native_country: "Poland", income: "<=50K" },
  { age: 24, workclass: "Private", education: "Masters", marital_status: "Never-married", occupation: "Prof-specialty", race: "White", gender: "Female", hours_per_week: 50, native_country: "United-States", income: "<=50K" },
  { age: 49, workclass: "Local-gov", education: "HS-grad", marital_status: "Married-civ-spouse", occupation: "Craft-repair", race: "White", gender: "Male", hours_per_week: 40, native_country: "United-States", income: "<=50K" },
  { age: 25, workclass: "Private", education: "HS-grad", marital_status: "Never-married", occupation: "Adm-clerical", race: "White", gender: "Female", hours_per_week: 40, native_country: "United-States", income: "<=50K" },
  { age: 57, workclass: "Federal-gov", education: "Bachelors", marital_status: "Never-married", occupation: "Prof-specialty", race: "White", gender: "Female", hours_per_week: 40, native_country: "United-States", income: ">50K" },
  { age: 53, workclass: "Private", education: "Bachelors", marital_status: "Married-civ-spouse", occupation: "Exec-managerial", race: "White", gender: "Male", hours_per_week: 40, native_country: "United-States", income: ">50K" },
  { age: 44, workclass: "Private", education: "Masters", marital_status: "Divorced", occupation: "Exec-managerial", race: "White", gender: "Male", hours_per_week: 40, native_country: "United-States", income: ">50K" },
  { age: 41, workclass: "State-gov", education: "Assoc-voc", marital_status: "Married-civ-spouse", occupation: "Craft-repair", race: "White", gender: "Male", hours_per_week: 40, native_country: "United-States", income: "<=50K" },
  { age: 29, workclass: "Private", education: "HS-grad", marital_status: "Never-married", occupation: "Sales", race: "White", gender: "Female", hours_per_week: 43, native_country: "United-States", income: "<=50K" },
  { age: 18, workclass: "Private", education: "Some-college", marital_status: "Never-married", occupation: "Other-service", race: "White", gender: "Female", hours_per_week: 30, native_country: "United-States", income: "<=50K" },
];
