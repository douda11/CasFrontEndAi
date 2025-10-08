// Unified Project Models

// Represents a single person to be insured, used in forms.
export interface InsuredPerson {
  id?: number;
  lastName: string;
  firstName: string;
  birthDate: Date;
  gender: 'M' | 'F'; // 'M' for Monsieur, 'F' for Madame
  address: {
    street: string;
    postalCode: string;
    city: string;
  };
  email: string;
  phoneNumber: string;
  socialSecurityNumber?: string;
  regime: string; // e.g., 'TNS', 'GENERAL'
  situation: string; // e.g., 'Celibataire', 'Marie'
  addressType: 'Actuelle' | 'Future';
  categorieSocioProfessionnelle?: string; // Catégorie socio-professionnelle
}

// Represents a guarantee/coverage option selected in the form.
export interface CoverageOption {
  id?: string;
  guaranteeType: string;
  coveragePercentage: number;
  deductiblePeriod?: number;
  levelCode?: string;
}

// Represents the complete form data for an insurance quote.
export interface InsuranceQuoteForm {
  productReference?: string;
  insuredPersons: InsuredPerson[];
  contact: {
    email: string;
    phoneNumber: string;
    address: {
      street: string;
      postalCode: string;
      city: string;
    };
  };
  effectDate: Date;
  garanties: any[];
  coverageOptions?: CoverageOption[];
}


// --- APRIL API Specific Payload Models ---

export interface AprilAddress {
  $id: string;
  type: 'Actuelle' | 'Future';
  addressLine1: string;
  postCode: string;
  city: string;
}

export interface AprilMobilePhone {
  prefix: string;
  number: string;
}

export interface AprilPerson {
  $id: string;
  birthDate: string; // Format: YYYY-MM-DD
  title: 'Monsieur' | 'Madame';
  lastName: string;
  firstName: string;
  mandatoryScheme: string; // e.g., 'TNS'
  familyStatus: string;
  mobilePhone: AprilMobilePhone;
  email: string;
}

export interface AprilInsured {
  $id: string;
  role: 'AssurePrincipal' | 'Conjoint' | 'Enfant';
  person: { $ref: string };
}

export interface AprilCoverage {
  insured: { $ref: string };
  guaranteeCode: string;
  levelCode?: string;
  eligibleMadelinLaw: boolean;
}

export interface AprilProduct {
  $id: string;
  productCode: string; // 'SantePro', 'SanteSolution', 'SanteMix'
  effectiveDate: string; // Format: YYYY-MM-DD
  insureds: AprilInsured[];
  coverages: AprilCoverage[];
}

export interface AprilPayload {
  $type: 'PrevPro';
  properties: {
    addresses: AprilAddress[];
    email: string;
  };
  persons: AprilPerson[];
  products: AprilProduct[];
}


// --- API Response Models ---

export interface ComparisonResult {
  assurance: string;
  formule: string;
  logo: string;
  prix: number | string;
  correspondencePercentage: number;
  weakPoint: string;
  pointsForts: string;
  garanties: any; 
  isPricingLoading: boolean;
  tarifGlobal?: number;
}


export interface PriceQuote {
  provider: string;
  productName?: string;
  monthlyPayment: number;
  annualPayment: number;
  raw?: any;
  coverageDetails?: any;
  additionalInfo?: any;
}

export interface QuoteResponse {
  success: boolean;
  quotes?: PriceQuote[];
  errorMessage?: string;
}
