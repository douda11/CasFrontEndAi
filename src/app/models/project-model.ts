// Common interfaces for project data shared between UTWIN and APRIL

export interface BorrowerDetails {
  id?: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  postalCode: string;
  profession: string;
  riskFactors: {
    isSmoker: boolean;
    highMileage: boolean;
    workAtHeight: boolean;
    heavyLoadHandling: boolean;
  };
}

export interface LoanDetails {
  id?: string;
  amount: number;
  duration: number;
  interestRate: number;
  type: string;
  loanNumber?: number;
  deferredPeriod?: number;
}

export interface CoverageOption {
  id?: string;
  guaranteeType: string;
  coveragePercentage: number;
  deductiblePeriod?: number;
}

export interface ProjectDetails {
  projectType: string;
  effectiveDate: string;
  periodicity: string;
  location: string;
  paymentType: string;
  courtageAmount?: number;
  additionalInfo?: any;
}

// Base form for all wizards
export interface InsuranceQuoteForm {
  projectUuid?: string;
  projectDetails: ProjectDetails;
  borrowers: BorrowerDetails[];
  loans: LoanDetails[];
  coverageOptions: CoverageOption[];
  productReference?: string;
}

// Response interfaces for API calls
export interface PriceQuote {
  productName?: string; // Add the productName property
  monthlyPayment: number;
  annualPayment: number;
  raw?: any; // To store the original, unprocessed quote data
  coverageDetails?: any;
  additionalInfo?: any;
}

export interface QuoteResponse {
  success: boolean;
  quotes?: PriceQuote[];
  errorMessage?: string;
}

export interface ComparisonResult {
  april: QuoteResponse;
  utwin: QuoteResponse;
  bestOffer?: 'april' | 'utwin';
  savingsAmount?: number;
  savingsPercentage?: number;
}
