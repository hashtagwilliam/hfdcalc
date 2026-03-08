
export enum HFDClass {
  SUPPRESSION = 'Fire Suppression',
  PREVENTION = 'Fire Prevention',
  ALARM = 'Fire Alarm',
  MAINTENANCE = 'Maintenance'
}

export enum HFDRank {
  PROBATIONARY = 'Firefighter Probationary, II',
  FIREFIGHTER = 'Firefighter, III',
  ENGINEER = 'Engineer/Operator, IV',
  CAPTAIN = 'Captain, V',
  SR_CAPTAIN = 'Senior Captain, VI',
  DISTRICT_CHIEF = 'District Chief, VII',
  DEPUTY_CHIEF = 'Deputy Chief, VIII',
  ASST_CHIEF = 'Assistant Fire Chief, IX',
  EXEC_ASST_CHIEF = 'Executive Assistant Fire Chief, X',
  
  // Prevention specific
  INSPECTOR = 'Inspector/Investigator, V',
  SR_INSPECTOR = 'Senior Inspector/Senior Investigator, VI',
  CHIEF_INSPECTOR = 'Chief Investigator/Chief Inspector, VII',
  ASST_FIRE_MARSHAL = 'Assistant Fire Marshal, VIII',
  
  // Alarm specific
  COMM_CAPTAIN = 'Communications Captain, V',
  COMM_SR_CAPTAIN = 'Communications Senior Captain, VI',
  CHIEF_COMM_OFFICER = 'Chief Communication Officer, VII',
  DEPUTY_CHIEF_COMM_OFFICER = 'Deputy Chief Communications Officer, VIII',
  
  // Maintenance specific
  SHOP_SUPERVISOR = 'Shop Supervisor, VI',
  MASTER_MECHANIC = 'Master Mechanic, VII'
}

export interface BasePayStep {
  minYears: number;
  maxYears: number | null; // null means "and over"
  biweekly: number;
}

// Grades III - VIII use "Year of Service Beginning" (Total Years)
// Grades IX - X use "Year in Grade Beginning" (Years in Rank)
export const BASE_PAY_STRUCTURE: Record<HFDRank, { steps: BasePayStep[], type: 'total' | 'grade' }> = {
  [HFDRank.PROBATIONARY]: {
    type: 'total',
    steps: [{ minYears: 0, maxYears: 1, biweekly: 1840.15 }] // FY25 2024.16 / 1.1
  },
  [HFDRank.FIREFIGHTER]: {
    type: 'total',
    steps: [
      { minYears: 0, maxYears: 1, biweekly: 1993.95 },
      { minYears: 1, maxYears: 2, biweekly: 2097.63 },
      { minYears: 2, maxYears: 4, biweekly: 2207.49 },
      { minYears: 4, maxYears: 7, biweekly: 2345.12 },
      { minYears: 7, maxYears: 10, biweekly: 2411.55 },
      { minYears: 10, maxYears: 13, biweekly: 2539.47 },
      { minYears: 13, maxYears: 16, biweekly: 2648.40 },
      { minYears: 16, maxYears: null, biweekly: 2804.67 }
    ]
  },
  [HFDRank.ENGINEER]: {
    type: 'total',
    steps: [
      { minYears: 2, maxYears: 4, biweekly: 2808.53 }, // 3rd-4th
      { minYears: 4, maxYears: 9, biweekly: 2836.50 }, // 5th-9th
      { minYears: 9, maxYears: 16, biweekly: 2864.86 }, // 10th-16th
      { minYears: 16, maxYears: null, biweekly: 2893.52 } // 17th+
    ]
  },
  [HFDRank.CAPTAIN]: {
    type: 'total',
    steps: [
      { minYears: 4, maxYears: 9, biweekly: 2962.60 }, // 5th-9th
      { minYears: 9, maxYears: 16, biweekly: 3066.29 }, // 10th-16th
      { minYears: 16, maxYears: null, biweekly: 3234.94 } // 17th+
    ]
  },
  [HFDRank.SR_CAPTAIN]: {
    type: 'total',
    steps: [
      { minYears: 6, maxYears: 9, biweekly: 3287.15 }, // 7th-9th
      { minYears: 9, maxYears: 16, biweekly: 3402.19 }, // 10th-16th
      { minYears: 16, maxYears: null, biweekly: 3589.32 } // 17th+
    ]
  },
  [HFDRank.DISTRICT_CHIEF]: {
    type: 'total',
    steps: [
      { minYears: 8, maxYears: 9, biweekly: 3763.27 }, // 9th
      { minYears: 9, maxYears: 16, biweekly: 3893.48 }, // 10th-16th
      { minYears: 16, maxYears: null, biweekly: 4103.97 } // 17th+
    ]
  },
  [HFDRank.DEPUTY_CHIEF]: {
    type: 'total',
    steps: [
      { minYears: 10, maxYears: 11, biweekly: 4339.15 }, // 11th
      { minYears: 11, maxYears: 16, biweekly: 4446.69 }, // 12th-16th
      { minYears: 16, maxYears: null, biweekly: 4557.02 } // 17th+
    ]
  },
  [HFDRank.ASST_CHIEF]: {
    type: 'grade',
    steps: [
      { minYears: 0, maxYears: 2, biweekly: 5306.25 }, // 1st & 2nd
      { minYears: 2, maxYears: 5, biweekly: 5438.07 }, // 3rd - 5th
      { minYears: 5, maxYears: null, biweekly: 5572.95 } // 6th+
    ]
  },
  [HFDRank.EXEC_ASST_CHIEF]: {
    type: 'grade',
    steps: [
      { minYears: 0, maxYears: 2, biweekly: 5836.86 }, // 1st & 2nd
      { minYears: 2, maxYears: 5, biweekly: 5981.88 }, // 3rd - 5th
      { minYears: 5, maxYears: null, biweekly: 6130.25 } // 6th+
    ]
  },
  
  // Prevention mappings
  [HFDRank.INSPECTOR]: { type: 'total', steps: [
    { minYears: 4, maxYears: 9, biweekly: 2962.60 },
    { minYears: 9, maxYears: 16, biweekly: 3066.29 },
    { minYears: 16, maxYears: null, biweekly: 3234.94 }
  ]},
  [HFDRank.SR_INSPECTOR]: { type: 'total', steps: [
    { minYears: 6, maxYears: 9, biweekly: 3287.15 },
    { minYears: 9, maxYears: 16, biweekly: 3402.19 },
    { minYears: 16, maxYears: null, biweekly: 3589.32 }
  ]},
  [HFDRank.CHIEF_INSPECTOR]: { type: 'total', steps: [
    { minYears: 8, maxYears: 9, biweekly: 3763.27 },
    { minYears: 9, maxYears: 16, biweekly: 3893.48 },
    { minYears: 16, maxYears: null, biweekly: 4103.97 }
  ]},
  [HFDRank.ASST_FIRE_MARSHAL]: { type: 'total', steps: [
    { minYears: 10, maxYears: 11, biweekly: 4339.15 },
    { minYears: 11, maxYears: 16, biweekly: 4446.69 },
    { minYears: 16, maxYears: null, biweekly: 4557.02 }
  ]},
  
  // Alarm mappings
  [HFDRank.COMM_CAPTAIN]: { type: 'total', steps: [
    { minYears: 4, maxYears: 9, biweekly: 2962.60 },
    { minYears: 9, maxYears: 16, biweekly: 3066.29 },
    { minYears: 16, maxYears: null, biweekly: 3234.94 }
  ]},
  [HFDRank.COMM_SR_CAPTAIN]: { type: 'total', steps: [
    { minYears: 6, maxYears: 9, biweekly: 3287.15 },
    { minYears: 9, maxYears: 16, biweekly: 3402.19 },
    { minYears: 16, maxYears: null, biweekly: 3589.32 }
  ]},
  [HFDRank.CHIEF_COMM_OFFICER]: { type: 'total', steps: [
    { minYears: 8, maxYears: 9, biweekly: 3763.27 },
    { minYears: 9, maxYears: 16, biweekly: 3893.48 },
    { minYears: 16, maxYears: null, biweekly: 4103.97 }
  ]},
  [HFDRank.DEPUTY_CHIEF_COMM_OFFICER]: { type: 'total', steps: [
    { minYears: 10, maxYears: 11, biweekly: 4339.15 },
    { minYears: 11, maxYears: 16, biweekly: 4446.69 },
    { minYears: 16, maxYears: null, biweekly: 4557.02 }
  ]},
  
  // Maintenance mappings
  [HFDRank.SHOP_SUPERVISOR]: { type: 'total', steps: [
    { minYears: 6, maxYears: 9, biweekly: 3287.15 },
    { minYears: 9, maxYears: 16, biweekly: 3402.19 },
    { minYears: 16, maxYears: null, biweekly: 3589.32 }
  ]},
  [HFDRank.MASTER_MECHANIC]: { type: 'total', steps: [
    { minYears: 8, maxYears: 9, biweekly: 3763.27 },
    { minYears: 9, maxYears: 16, biweekly: 3893.48 },
    { minYears: 16, maxYears: null, biweekly: 4103.97 }
  ]}
};

export const REFERENCE_DATE = new Date('2023-07-01'); // FY24 Base

export const CBA_INCREASES = [
  { id: 'FY10', date: new Date('2009-07-01'), base: 0.04 }, // Variable, handled by helper
  { id: 'FY11', date: new Date('2010-07-01'), base: 0.0375 },
  { id: 'FY12_Jan', date: new Date('2011-01-01'), base: 0.02 }, // Jan 2011 raise
  { id: 'FY14', date: new Date('2013-07-01'), base: 0.01 },
  { id: 'FY15', date: new Date('2014-07-01'), base: 0.02 },
  { id: 'FY22', date: new Date('2021-07-01'), base: 0.06 },
  { id: 'FY23', date: new Date('2022-07-01'), base: 0.06, baseGradeV: 0.0633 },
  { id: 'FY24', date: new Date('2023-07-01'), base: 0.06, baseGradeV: 0.0633 },
  { id: 'FY25', date: new Date('2024-07-01'), base: 0.10 },
  { id: 'FY26', date: new Date('2025-07-01'), base: 0.06 },
  { id: 'FY27', date: new Date('2026-07-01'), base: 0.03 },
  { id: 'FY28', date: new Date('2027-07-01'), base: 0.04 },
  { id: 'FY29', date: new Date('2028-07-01'), base: 0.04 },
];

export const getFY10Increase = (rank: HFDRank, stepIndex: number): number => {
  // Grade IV (Engineer)
  if (rank === HFDRank.ENGINEER) {
    const rates = [0.0325, 0.0339, 0.0443, 0.0547];
    return rates[stepIndex] ?? 0.0547;
  }
  
  // Grade V (Captain, Inspector, Comm Captain)
  if (rank.endsWith(', V')) {
    const rates = [0.0553, 0.0558, 0.0568];
    return rates[stepIndex] ?? 0.0568;
  }

  // Grade VI (Sr Captain, Sr Inspector, Comm Sr Captain, Shop Supervisor)
  if (rank.endsWith(', VI')) {
    const rates = [0.0403, 0.0407, 0.0417];
    return rates[stepIndex] ?? 0.0417;
  }

  // Grade VII (District Chief, Chief Inspector, Chief Comm Officer, Master Mechanic)
  if (rank.endsWith(', VII')) {
    return 0.04;
  }

  // Grade VIII (Deputy Chief, Asst Fire Marshal, Deputy Chief Comm Officer)
  if (rank.endsWith(', VIII')) {
    return 0.045;
  }

  // Grade IX (Asst Chief)
  if (rank.endsWith(', IX')) {
    return 0.045;
  }

  // Grade X (Exec Asst Chief)
  if (rank.endsWith(', X')) {
    return 0.045;
  }

  // Grade III (Firefighter) and Probationary
  return 0.04;
};

export const INCENTIVES = {
  LONGEVITY_PER_YEAR: 2.00, // bi-weekly
  MAX_LONGEVITY_YEARS: 25,
  
  HAZMAT: 125.00,
  DTO: 125.00,
  FTO: 92.00,
  PRECEPTOR: 90.00,
  
  PARAMEDIC_EMS: 414.88,
  PARAMEDIC_POP: 140.38,
  PARAMEDIC_RESTRICTED: 150.00,
  EMT_SUPPRESSION: 120.00,
  
  BILINGUAL: 69.23,
  
  CERT_LEVEL_1: 53.85, // 0-5 years
  CERT_LEVEL_2: 92.08, // 6-11 years
  CERT_LEVEL_3: 115.08, // 12+ years
  
  DEGREE_BACHELOR: 140.00,
  DEGREE_MASTER: 240.00,
  DEGREE_DOCTORATE: 340.00,
  
  ARSON_STEP_1: 84.62,
  ARSON_STEP_2: 130.77,
  ARSON_STEP_3: 153.85,

  INSPECTOR_ASSIGNMENT: 75.00,
  RESCUE_ARFF: 125.00
};

export const CLASS_RANKS: Record<HFDClass, HFDRank[]> = {
  [HFDClass.SUPPRESSION]: [
    HFDRank.PROBATIONARY,
    HFDRank.FIREFIGHTER,
    HFDRank.ENGINEER,
    HFDRank.CAPTAIN,
    HFDRank.SR_CAPTAIN,
    HFDRank.DISTRICT_CHIEF,
    HFDRank.DEPUTY_CHIEF,
    HFDRank.ASST_CHIEF,
    HFDRank.EXEC_ASST_CHIEF
  ],
  [HFDClass.PREVENTION]: [
    HFDRank.INSPECTOR,
    HFDRank.SR_INSPECTOR,
    HFDRank.CHIEF_INSPECTOR,
    HFDRank.ASST_FIRE_MARSHAL,
    HFDRank.ASST_CHIEF
  ],
  [HFDClass.ALARM]: [
    HFDRank.COMM_CAPTAIN,
    HFDRank.COMM_SR_CAPTAIN,
    HFDRank.CHIEF_COMM_OFFICER,
    HFDRank.DEPUTY_CHIEF_COMM_OFFICER
  ],
  [HFDClass.MAINTENANCE]: [
    HFDRank.SHOP_SUPERVISOR,
    HFDRank.MASTER_MECHANIC
  ]
};
