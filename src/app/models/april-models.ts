// src/app/models/april-models.ts

export type BorrowerType = 'Emprunteur'; // literal

// --- Core Enums ---
export type AddressType = 'Actuelle' | 'Future';
export type PhoneType = 'Fixe' | 'Portable';
export type PersonCategory =
  | 'assure'
  | 'souscripteur'
  | 'representantlegal'
  | 'enfant'
  | 'payeur';
export type Civilite = 'Monsieur' | 'Madame' | 'Mademoiselle';
export type LoanType =
  | 'Classique'
  | 'Differe'
  | 'TauxZero'
  | 'InFine'
  | 'PretRelais'
  | 'PretAPaliers'
  | 'CreditBail';
export type RateType = 'Fixe' | 'Variable';
export type Periodicite =
  | 'Mensuelle'
  | 'Trimestrielle'
  | 'Semestrielle'
  | 'Annuelle'
  | 'Unique';
export type DeferredType = 'Total' | 'Partiel';
export type ContributionType = 'constante' | 'variable';
export type ProjetAFinancer =
  | 'ResidencePrincipale'
  | 'ResidenceSecondaire'
  | 'TravauxResidencePrincipale'
  | 'TravauxResidenceSecondaire'
  | 'InvestissementLocatif'
  | 'PretProfessionnel'
  | 'PretConsommation'
  | 'Autres';

// --- Shared sub‐models ---
export interface Address {
  $id?: string;
  type: AddressType;
  postCode: string;
  city: string;
  addressLine1?: string;
  addressLine2?: string;
  addressLine3?: string;
  addressLine4?: string;
  countryCode?: string;
}

export interface Phone {
  type: PhoneType;
  prefix: string;
  number: string;
}

export interface LoanReference {
  $ref: string;
}

// --- Leaf models for request payload ---

export interface ProjectProperties {
  addresses: Address[];
  email: string;
  commission: string;
  moralSubscriber: boolean;
  effectiveDate: string; // “YYYY-MM-DD”
  cancellation: boolean;
  projectType: ProjetAFinancer;
}

export interface Person {
  $id: string;
  title: Civilite;
  lastName: string;
  firstName: string;
  birthDate: string; // “YYYY-MM-DD”
  birthDepartment: string;
  birthCity: string;
  nationality: string;
  birthCountry: string;
  professionalCategory: string;
  profession: string;
  abroadTravel: boolean;
  aerialOrLandSport: boolean;
  highMileage: boolean;
  workAtHeight: boolean;
  heavyLoadHandling: boolean;
  openEndedContractHolder: boolean;
  noticeOfTermination: boolean;
  remainingAccountLemoine?: number;
  smoker: boolean;
  politicallyExposedPerson: boolean;
  politicallyExposedRelatives: boolean;
}

export interface Loan {
  $id: string;
  loanType: LoanType;
  borrowedAmount: number;
  interestRate: number;
  loanDuration: number;
  rateType: RateType;
  repaymentSchedule: Periodicite;
}

export interface LenderAddress {
  addressLine1: string;
  postCode: string;
  city: string;
}

export interface Lender {
  companyName: string;
  address: LenderAddress;
  loans: LoanReference[];
}

export interface Insured {
  role: 'AssurePrincipal';
  person: { $ref: string };
}

export interface Coverage {
  loan: { $ref: string };
  guaranteeCode: string;
  coveragePercentage?: number;
  deductibleCode?: string;
  levelCode?: string;
  compensationMode?: string;
}

export interface Product {
  $id: string;
  productCode: string;
  contributionType: ContributionType;
  insured: Insured;
  coverages: Coverage[];
}

// --- Top‐level request model for APRIL ---  
export interface BorrowerForm {
  projectUuid?: string; // optional, will be used in x-projectUuid
  properties: ProjectProperties;
  persons: Person[];
  loans: Loan[];
  lenders: Lender[];
  products: Product[];
}

// --- Example of the response type from APRIL (shapes can vary) ---  
// Adjust as needed based on actual API response structure  
export interface AprilGetTarifResponse {
  // Example shape—update with real data types returned by APRIL
  message: string;
  success: boolean;
  data?: any;
  businessMessages?: Array<{
    messageType: string;
    messageTitle: string;
    messageReference: string;
  }>;
}
