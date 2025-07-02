import { Injectable } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { InsuranceQuoteForm, BorrowerDetails, LoanDetails, CoverageOption } from '../models/project-model';

@Injectable({
  providedIn: 'root'
})
export class FormService {
  
  constructor(private fb: FormBuilder) {}

  // Create basic form structure for any wizard
  createInsuranceForm(): FormGroup {
    return this.fb.group({
      projectUuid: [''],
      projectDetails: this.createProjectDetailsForm(),
      borrowers: this.fb.array([this.createBorrowerForm()]),
      loans: this.fb.array([this.createLoanForm()]),
      coverageOptions: this.fb.array([this.createCoverageForm()]),
      productReference: ['', Validators.required]
    });
  }

  // Project details section
  createProjectDetailsForm(): FormGroup {
    return this.fb.group({
      projectType: ['RES1', Validators.required],
      effectiveDate: [new Date(), Validators.required],
      periodicity: ['mensuel', Validators.required],
      location: ['METRO', Validators.required],
      paymentType: ['paiement_en_une_fois', Validators.required],
      courtageAmount: [100],
      additionalInfo: [{}]
    });
  }

  // Borrower form section
  createBorrowerForm(): FormGroup {
    return this.fb.group({
      title: ['MR', Validators.required], // Added for APRIL
      professionalCategory: ['SALARIE', Validators.required], // Added for APRIL
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      birthDate: ['', Validators.required],
      postalCode: ['', [Validators.required, Validators.pattern(/^[0-9]{5}$/)]],
      profession: ['CADRE', Validators.required], // Default to a valid enum value
      riskFactors: this.fb.group({
        isSmoker: [false],
        highMileage: [false],
        workAtHeight: [false],
        heavyLoadHandling: [false]
      })
    });
  }

  // Loan form section
  createLoanForm(): FormGroup {
    return this.fb.group({
      amount: [100000, [Validators.required, Validators.min(1000)]],
      duration: [120, [Validators.required, Validators.min(12)]],
      interestRate: [1.0, [Validators.required, Validators.min(0.1)]],
      type: ['AMORTISSABLE', Validators.required],
      rateType: ['FIXE', Validators.required], // Added for APRIL
      loanNumber: [1],
      deferredPeriod: [0]
    });
  }

  // Coverage options form
  createCoverageForm(): FormGroup {
    return this.fb.group({
      guaranteeType: ['DECES', Validators.required],
      coveragePercentage: [100, [Validators.required, Validators.min(1), Validators.max(100)]],
      deductiblePeriod: [30]
    });
  }

  // Helper methods for form arrays
  getBorrowersArray(form: FormGroup): FormArray {
    return form.get('borrowers') as FormArray;
  }

  getLoansArray(form: FormGroup): FormArray {
    return form.get('loans') as FormArray;
  }

  getCoverageOptionsArray(form: FormGroup): FormArray {
    return form.get('coverageOptions') as FormArray;
  }

  // Add a new borrower
  addBorrower(form: FormGroup): void {
    this.getBorrowersArray(form).push(this.createBorrowerForm());
  }

  // Remove a borrower
  removeBorrower(form: FormGroup, index: number): void {
    const borrowers = this.getBorrowersArray(form);
    if (borrowers.length > 1) {
      borrowers.removeAt(index);
    }
  }

  // Add a new loan
  addLoan(form: FormGroup): void {
    this.getLoansArray(form).push(this.createLoanForm());
  }

  // Remove a loan
  removeLoan(form: FormGroup, index: number): void {
    const loans = this.getLoansArray(form);
    if (loans.length > 1) {
      loans.removeAt(index);
    }
  }

  // Add coverage option
  addCoverageOption(form: FormGroup): void {
    this.getCoverageOptionsArray(form).push(this.createCoverageForm());
  }

  // Remove coverage option
  removeCoverageOption(form: FormGroup, index: number): void {
    const coverages = this.getCoverageOptionsArray(form);
    if (coverages.length > 1) {
      coverages.removeAt(index);
    }
  }

  // Transform form data to APRIL API format
  transformToAprilFormat(formValue: InsuranceQuoteForm): any {
    const projectUuid = formValue.projectUuid || crypto.randomUUID();
    
    // Process date formats
    const effectiveDate = this.formatDateToYYYYMMDD(formValue.projectDetails.effectiveDate);
    
    // Process borrower details
    const persons = formValue.borrowers.map((borrower, index) => {
      const birthDateParts = this.formatDateParts(borrower.birthDate);
      return {
        $id: `person${index + 1}`,
        title: 'Monsieur', // Default, could be dynamic
        lastName: borrower.lastName,
        firstName: borrower.firstName,
        birthDate: this.formatDateToYYYYMMDD(borrower.birthDate),
        birthDepartment: borrower.postalCode.substring(0, 2),        birthCity: 'Paris', // Default, could be dynamic
        nationality: 'FR',
        birthCountry: 'FR',
        professionalCategory: 'Salarié cadre, ingénieur, assimilé-cadre',
        profession: borrower.profession,
        abroadTravel: false,
        aerialOrLandSport: false,
        highMileage: borrower.riskFactors.highMileage,
        workAtHeight: borrower.riskFactors.workAtHeight,
        heavyLoadHandling: borrower.riskFactors.heavyLoadHandling,
        openEndedContractHolder: true,
        noticeOfTermination: false,
        smoker: borrower.riskFactors.isSmoker,
        politicallyExposedPerson: false,
        politicallyExposedRelatives: false
      };
    });
    
    // Process loan details
    const loans = formValue.loans.map((loan, index) => {
      return {
        $id: `loan${index + 1}`,
        loanType: loan.type === 'AMORTISSABLE' ? 'Classique' : loan.type,
        borrowedAmount: loan.amount,
        interestRate: loan.interestRate,
        loanDuration: loan.duration
      };
    });
    
    // Create the loan references
    const loanRefs = loans.map((_, index) => {
      return { $ref: `loan${index + 1}` };
    });
    
    // Create coverages
    const coverages: Array<{
      loan: { $ref: string },
      guaranteeCode: string,
      coveragePercentage: number,
      deductibleCode: string
    }> = [];
    formValue.loans.forEach((_, loanIndex) => {
      formValue.coverageOptions.forEach(coverage => {
        coverages.push({
          loan: { $ref: `loan${loanIndex + 1}` },
          guaranteeCode: this.mapGuaranteeTypeToAprilCode(coverage.guaranteeType),
          coveragePercentage: coverage.coveragePercentage,
          deductibleCode: coverage.deductiblePeriod ? coverage.deductiblePeriod.toString() : '30'
        });
      });
    });
    
    return {
      $type: 'Emprunteur',
      projet: {
        type: this.mapProjectTypeToAprilType(formValue.projectDetails.projectType),
        name: 'Projet Assurance Emprunteur',
        reference: crypto.randomUUID().substring(0, 8)
      },
      properties: {
        addresses: [
          {
            $id: "address1",
            type: 'Actuelle',
            postCode: formValue.borrowers[0]?.postalCode || '75000',
            city: 'Paris',
            addressLine1: '1 rue Example',
            countryCode: 'FR'
          }
        ],
        email: 'test@example.com',
        commission: formValue.projectDetails.courtageAmount?.toString() || '0',
        moralSubscriber: false,
        effectiveDate: effectiveDate,
        cancellation: false,
        projectType: this.mapProjectTypeToAprilType(formValue.projectDetails.projectType)
      },
      persons: persons,
      loans: loans,
      lenders: [
        {
          companyName: 'Banque Example',
          address: {
            addressLine1: '1 rue Example',
            postCode: '75000',
            city: 'Paris'
          },
          loans: loanRefs
        }
      ],      products: [
        {
          $id: 'product1',
          productCode: formValue.productReference || 'ADPv5',
          contributionType: 'constante',
          insured: {
            role: 'AssurePrincipal',
            person: { $ref: 'person1' }
          },
          coverages: coverages
        }
      ]
    };
  }

  // Transform form data to UTWIN API format
  transformToUtwinFormat(formValue: InsuranceQuoteForm): any {
    // Extract the primary borrower and loan
    const emprunteur = {
      CodePostal: formValue.borrowers[0]?.postalCode || '75001',
      DateNaissance: this.formatDateToDDMMYYYY(formValue.borrowers[0]?.birthDate),
      DeplacementProSuperieur20: formValue.borrowers[0]?.riskFactors.highMileage || false,
      EnCoursTotalAssure: 'INFERIEUR_OU_EGAL_200K',
      EstCoEmprunteur: false,
      EstExpatrie: false,
      EstFumeurDepuisDeuxAns: formValue.borrowers[0]?.riskFactors.isSmoker || false,
      PortCharge: formValue.borrowers[0]?.riskFactors.heavyLoadHandling || false,
      Profession: formValue.borrowers[0]?.profession || 'CADRE_ADMIN_COM',
      RisquePhysique: false,
      SituationExercice: 'AUTRES',
      TravailleEnHauteur: formValue.borrowers[0]?.riskFactors.workAtHeight || false
    };
    
    // Get the primary loan
    const pret = {
      Differe: formValue.loans[0]?.deferredPeriod || 0,
      Duree: formValue.loans[0]?.duration || 240,
      Montant: formValue.loans[0]?.amount || 250000,
      Numero: formValue.loans[0]?.loanNumber || 1,
      Taux: formValue.loans[0]?.interestRate || 1.25,
      Type: formValue.loans[0]?.type || 'AMORTISSABLE',
      TypeTaux: 'Fixe'
    };
    
    // Map coverage options
    const coverageOptions = formValue.coverageOptions[0] || { 
      coveragePercentage: 100,
      deductiblePeriod: 30
    };
    
    const options = {
      AgeLimiteITT: 65,
      Couverture: 'SaProfession',
      ExonerationCotisation: false,
      FranchiseITT: coverageOptions.deductiblePeriod || 30,
      MauxDos: 'oui_sans_cnd_hospi',
      MiTempsTherapeutique: true,
      NumeroPret: 1,
      PourCoEmprunteur: false,
      Psy: 'oui_sans_cnd_hospi',
      QuotiteDC: coverageOptions.coveragePercentage || 100,
      QuotiteIPP: coverageOptions.coveragePercentage || 100,
      QuotiteIPPRO: 0,
      QuotiteITT: coverageOptions.coveragePercentage || 100,
      RemboursementInvalidite: 'CRD',
      TypeCouverture: 'Forfaitaire'
    };
    
    return {
      ref_produit: formValue.productReference || 'PRET PREVOIR-PARTNER CRD',
      projet: {
        Adresse: '',
        Banque: '',
        DatePrevisionDeblocage: this.formatDateToDDMMYYYY(formValue.projectDetails.effectiveDate),
        Emprunteurs: {
          EmprunteurWSModel: emprunteur
        },
        FraisCourtage: formValue.projectDetails.courtageAmount || 100,
        LocalisationBien: formValue.projectDetails.location || 'METRO',
        Options: {
          OptionsWSModel: options
        },
        Periodicite: formValue.projectDetails.periodicity || 'mensuel',
        PrelevementFraisCourtage: formValue.projectDetails.paymentType || 'paiement_en_une_fois',
        Prets: {
          PretWSModel: pret
        },
        Type: formValue.projectDetails.projectType || 'RES1',
        TypeReprise: 'NouveauPret'
      }
    };
  }

  // Helper methods
  formatDateToYYYYMMDD(date: string | Date): string {
    if (!date) return new Date().toISOString().split('T')[0];
    
    if (typeof date === 'string') {
      // Check if format is DD/MM/YYYY
      if (date.includes('/')) {
        const parts = date.split('/');
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
      return date;
    }
    
    return new Date(date).toISOString().split('T')[0];
  }

  formatDateToDDMMYYYY(date: string | Date): string {
    if (!date) return '01/01/1990';
    
    if (typeof date === 'string') {
      // Check if format is YYYY-MM-DD
      if (date.includes('-')) {
        const parts = date.split('-');
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return date;
    }
    
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    
    return `${day}/${month}/${year}`;
  }

  formatDateParts(date: string | Date): { day: string, month: string, year: string } {
    if (!date) return { day: '01', month: '01', year: '1990' };
    
    if (typeof date === 'string') {
      if (date.includes('/')) {
        const parts = date.split('/');
        return { day: parts[0], month: parts[1], year: parts[2] };
      }
      if (date.includes('-')) {
        const parts = date.split('-');
        return { day: parts[2], month: parts[1], year: parts[0] };
      }
    }
    
    const d = new Date(date);
    return { 
      day: String(d.getDate()).padStart(2, '0'),
      month: String(d.getMonth() + 1).padStart(2, '0'),
      year: String(d.getFullYear())
    };
  }

  mapGuaranteeTypeToAprilCode(type: string): string {
    const guaranteeMap: Record<string, string> = {
      'DC': 'DECES',
      'IPT': 'INVALIDITE_PERMANENTE_TOTALE',
      'ITT': 'INCAPACITE_TEMPORAIRE_TOTALE',
      'DECES': 'DECES',
      'INVALIDITE': 'INVALIDITE_PERMANENTE_TOTALE',
      'INCAPACITE': 'INCAPACITE_TEMPORAIRE_TOTALE'
    };
    
    return guaranteeMap[type] || type;
  }

  mapProjectTypeToAprilType(type: string): string {
    const projectTypeMap: Record<string, string> = {
      'RES1': 'ResidencePrincipale',
      'RES2': 'ResidenceSecondaire',
      'INVEST': 'InvestissementLocatif',
      'AUTRE': 'Autres'
    };
    
    return projectTypeMap[type] || 'Autres';
  }
}
