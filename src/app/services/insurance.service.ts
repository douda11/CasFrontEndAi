// src/app/services/insurance.service.ts

import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BorrowerForm } from '../models/borrower-form.model';
import { Observable } from 'rxjs';
import { QuoteResponse, ComparisonResult, InsuranceQuoteForm } from '../models/project-model';
import { FormService } from './form.service';
import { AprilGetTarifResponse } from '../models/april-models';

@Injectable({ providedIn: 'root' })
export class InsuranceService {
  private apiBasePath = 'http://localhost:8081';
  private aprilUrl = `${this.apiBasePath}/api/v1/comparisons/april/projects/prices`;
  private healthProtectionUrl = `${this.apiBasePath}/healthProtection/projects/prices`; // New endpoint
  private utwinUrl = `${this.apiBasePath}/api/v1/comparisons/utwin/get-tarif`;
  private compareUrl = `${this.apiBasePath}/api/v1/comparisons/compare`;

  constructor(
    private http: HttpClient,
    private formService: FormService
  ) {}

  // src/app/services/insurance.service.ts
getAprilTarif(formValue: BorrowerForm): Observable<AprilGetTarifResponse> {
    // 1) Build the x-projectUuid header (if empty, generate one)
    const projectUuid = formValue.projectUuid || crypto.randomUUID();

    // 2) Build the JSON payload exactly as the fastapi expects:
    //    AprilGettarifRequest schema:
    //
    //    {
    //      "$type": "Emprunteur",
    //      "properties": { ... },
    //      "persons": [ ... ],
    //      "loans": [ ... ],
    //      "lenders": [ ... ],
    //      "products": [ ... ]
    //    }
    //
    //    We will populate from our form model.

    const payload: any = {
      $type: 'PrevPro',
      properties: {
        addresses: [
          {
            $id: 'adr-1',
            type: formValue.properties?.addresses?.[0]?.type || 'Actuelle',
            postCode: formValue.properties?.addresses?.[0]?.postCode || '',
            city: formValue.properties?.addresses?.[0]?.city || '',
            addressLine1: formValue.properties?.addresses?.[0]?.addressLine1 || '',
            addressLine2: formValue.properties?.addresses?.[0]?.addressLine2 || '',
            addressLine3: formValue.properties?.addresses?.[0]?.addressLine3 || '',
            addressLine4: formValue.properties?.addresses?.[0]?.addressLine4 || '',
            countryCode: formValue.properties?.addresses?.[0]?.countryCode || 'FR',
          },
        ],
        email: formValue.properties?.email || '',
        commission: formValue.properties?.commission || '',
        moralSubscriber: formValue.properties?.moralSubscriber || false,
        effectiveDate: formValue.properties?.effectiveDate || '', // "YYYY-MM-DD"
        cancellation: formValue.properties?.cancellation || false,
        projectType: formValue.properties?.projectType || '',
      },
      persons: (formValue.persons || []).map((p: any, index: number) => ({
        $id: `i-${index + 1}`,
        title: p.title || '',
        lastName: p.lastName || '',
        firstName: p.firstName || '',
        birthDate: p.birthDate || '', // "YYYY-MM-DD"
        birthDepartment: p.birthDepartment || '',
        birthCity: p.birthCity || '',
        nationality: p.nationality || '',
        birthCountry: p.birthCountry || '',
        professionalCategory: p.professionalCategory || '',
        profession: p.profession || '',
        abroadTravel: p.abroadTravel || false,
        aerialOrLandSport: p.aerialOrLandSport || false,
        highMileage: p.highMileage || false,
        workAtHeight: p.workAtHeight || false,
        heavyLoadHandling: p.heavyLoadHandling || false,
        openEndedContractHolder: p.openEndedContractHolder || false,
        noticeOfTermination: p.noticeOfTermination || false,
        remainingAccountLemoine: p.remainingAccountLemoine || 0,
        smoker: p.smoker || false,
        politicallyExposedPerson: p.politicallyExposedPerson || false,
        politicallyExposedRelatives: p.politicallyExposedRelatives || false,
      })),
      loans: (formValue.loans || []).map((l: any, index: number) => ({
        $id: `pr-${index + 1}`,
        loanType: l.loanType || '',
        borrowedAmount: l.borrowedAmount || 0,
        interestRate: l.interestRate || 0,
        loanDuration: l.loanDuration || 0,
        rateType: l.rateType || '',
        repaymentSchedule: l.repaymentSchedule || '',
      })),
      lenders: (formValue.lenders || []).map((ln: any) => ({
        companyName: ln.companyName || '',
        address: {
          addressLine1: ln.address?.addressLine1 || '',
          postCode: ln.address?.postCode || '',
          city: ln.address?.city || '',
        },
        loans: (ln.loans || []).map((ref: any) => ({ $ref: ref?.$ref || '' })),
      })),
      products: (formValue.products || []).map((prod: any) => ({
        $id: prod.$id || '',
        productCode: prod.productCode || '',
        contributionType: prod.contributionType || '',
        insured: {
          role: prod.insured?.role || '',
          person: { $ref: prod.insured?.person?.$ref || '' },
        },
        coverages: (prod.coverages || []).map((cov: any) => {
          const covObj: any = {
            loan: { $ref: cov.loan?.$ref || '' },
            guaranteeCode: cov.guaranteeCode || '',
          };
          if (cov.coveragePercentage !== undefined) {
            covObj.coveragePercentage = cov.coveragePercentage;
          }
          if (cov.deductibleCode !== undefined) {
            covObj.deductibleCode = cov.deductibleCode;
          }
          if (cov.levelCode !== undefined) {
            covObj.levelCode = cov.levelCode;
          }
          if (cov.compensationMode !== undefined) {
            covObj.compensationMode = cov.compensationMode;
          }
          return covObj;
        }),
      }))
    };

    // 3) HTTP headers
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'x-projectUuid': projectUuid,
    });

    // 4) HTTP query parameters
    const params = new HttpParams()
      .set('pricingType', 'Simple')
      .set('withSchedule', 'false');

    // 5) Fire the POST request to FastAPI
    return this.http.post<AprilGetTarifResponse>(this.aprilUrl, payload, { headers, params });
  }



  getUtwinTarif(form: BorrowerForm): Observable<any> {
    // Build UTWIN payload exactly as their doc
    const payload = {
      ref_produit: form.ref_produit,
      projet: {
        Adresse: '',
        Banque: '',
        DatePrevisionDeblocage: form.datePrevisionDeblocage,
        Emprunteurs: {
          EmprunteurWSModel: form.emprunteur
        },
        FraisCourtage: form.fraisCourtage,
        LocalisationBien: form.localisationBien,
        Options: {
          OptionsWSModel: form.options
        },
        Periodicite: form.periodicite,
        PrelevementFraisCourtage: form.prelevementFraisCourtage,
        Prets: {
          PretWSModel: form.pret
        },
        Type: form.type,
        TypeReprise: form.typeReprise
      }
    };

    // user/password are now handled by backend via environment variables
    return this.http.post(this.utwinUrl, payload);
  }
  // Helper method to fill form with example data for UTWIN
  fillUtwinExample(form: BorrowerForm): BorrowerForm {
    // Create a copy to avoid direct mutation
    const exampleData = { ...form };
    
    // Fill main fields
    exampleData.datePrevisionDeblocage = '01/10/2025';
    exampleData.fraisCourtage = 100;
    exampleData.localisationBien = 'METRO';
    exampleData.periodicite = 'mensuel';
    exampleData.prelevementFraisCourtage = 'paiement_en_une_fois';
    exampleData.type = 'RES1';
    exampleData.typeReprise = 'NouveauPret';
    exampleData.ref_produit = 'PRET PREVOIR-PARTNER CRD';
    
    // Emprunteur data
    exampleData.emprunteur = {
      CodePostal: '75001',
      DateNaissance: '01/01/1985',
      DeplacementProSuperieur20: false,
      EnCoursTotalAssure: 'INFERIEUR_OU_EGAL_200K',
      EstCoEmprunteur: false,
      EstExpatrie: false,
      EstFumeurDepuisDeuxAns: false,
      PortCharge: false,
      Profession: 'CADRE_ADMIN_COM',
      RisquePhysique: false,
      SituationExercice: 'AUTRES',
      TravailleEnHauteur: false
    };
    
    // Prêt data
    exampleData.pret = {
      Differe: 0,
      Duree: 240,
      Montant: 250000,
      Numero: 1,
      Taux: 1.25,
      Type: 'AMORTISSABLE',
      TypeTaux: 'Fixe'
    };
    
    // Options data
    exampleData.options = {
      AgeLimiteITT: 65,
      Couverture: 'SaProfession',
      ExonerationCotisation: false,
      FranchiseITT: 30,
      MauxDos: 'oui_sans_cnd_hospi',
      MiTempsTherapeutique: true,
      NumeroPret: 1,
      PourCoEmprunteur: false,
      Psy: 'oui_sans_cnd_hospi',
      QuotiteDC: 100,
      QuotiteIPP: 100,
      QuotiteIPPRO: 0,
      QuotiteITT: 100,
      RemboursementInvalidite: 'CRD',
      TypeCouverture: 'Forfaitaire'
    };
    
    return exampleData;
  }

  // For the new wizard-based forms
  
  // Get comparison quotes from both providers
  getComparisonQuotes(formValue: InsuranceQuoteForm): Observable<ComparisonResult> {
    const aprilPayload = this.formService.transformToAprilFormat(formValue);
    const utwinPayload = this.formService.transformToUtwinFormat(formValue);
    
    const payload = {
      april: aprilPayload,
      utwin: utwinPayload
    };

    console.log('Sending Comparison payload:', JSON.stringify(payload, null, 2));
    
    return this.http.post<ComparisonResult>(this.compareUrl, payload);
  }

  // Get APRIL tarif with new format
  getAprilTarifNew(formValue: InsuranceQuoteForm): Observable<QuoteResponse> {
    // Generate a project UUID if none provided
    const projectUuid = formValue.projectUuid || crypto.randomUUID();
    
    // Transform form data to APRIL format
    const payload = this.formService.transformToAprilFormat(formValue);

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'x-projectUuid': projectUuid
    });

    const params = new HttpParams()
      .set('pricingType', 'Simple')
      .set('withSchedule', 'false');

    console.log('Sending APRIL payload:', JSON.stringify(payload, null, 2));
    
    return this.http.post<QuoteResponse>(this.aprilUrl, payload, { headers, params });
  }

  // Get UTWIN tarif with new format
  getUtwinTarifNew(formValue: InsuranceQuoteForm): Observable<QuoteResponse> {
    // Transform form data to UTWIN format
    const payload = this.formService.transformToUtwinFormat(formValue);

    console.log('Sending UTWIN payload:', JSON.stringify(payload, null, 2));
    
    return this.http.post<QuoteResponse>(this.utwinUrl, payload);
  }

  // New method for Health Protection API
  getAprilHealthTarif(formValue: InsuranceQuoteForm): Observable<any> {
    const payload = this.transformToHealthProtectionFormat(formValue);

    const params = new HttpParams()
      .set('pricingType', 'Simple')
      .set('withSchedule', 'false');

    console.log('Sending Health Protection payload:', JSON.stringify(payload, null, 2));

    return this.http.post<any>(this.healthProtectionUrl, payload, { params });
  }

  private transformToHealthProtectionFormat(formValue: InsuranceQuoteForm): any {
    const borrower = formValue.borrowers[0]; // Assuming one borrower for simplicity

    const payload = {
      $type: 'PrevPro',
      properties: {
        addresses: [
          {
            $id: 'adr-1',
            type: 'Actuelle',
            addressLine1: '114 Boulevard Marius Vivier Merle',
            postCode: borrower.postalCode || '69003',
            city: 'LYON',
          },
        ],
        email: 'damien.valcarcel@april.com',
      },
      persons: [
        {
          $id: 'i-1',
          birthDate: borrower.birthDate, // 'YYYY-MM-DD'
          title: 'Monsieur',
          lastName: borrower.lastName,
          birthName: borrower.lastName,
          firstName: borrower.firstName,
          birthDepartment: '69',
          birthCity: 'LYON',
          nationality: '64',
          politicallyExposedPerson: false,
          birthCountry: 'FR',
          mandatoryScheme: 'Général',
          professionalCategory: 'Salarié',
          familyStatus: 'Célibataire',
          profession: borrower.profession,
          acceptanceRequestPartnersAPRIL: false,
          acreBeneficiary: false,
          companyCreationDate: null,
          swissCrossBorderWorker: false,
          businessCreator: false,
          microEntrepreneur: false,
          socialSecurityNumber: '1850169123456',
          landlinePhone: '0400000000',
          mobilePhone: '0600000000',
          email: 'damien.valcarcel@april.com',
        },
      ],
      products: [
        {
          $id: 'p-1',
          productCode: 'SanteZen',
          effectiveDate: formValue.projectDetails.effectiveDate, // 'YYYY-MM-DD'
          commission: 0,
          termination: {
            terminationDate: null,
            terminationReason: '',
            otherReason: '',
            contractNumber: '',
            insuranceCompany: '',
          },
          insureds: [
            {
              $id: 'a-1',
              role: 'AssurePrincipal',
              person: {
                $ref: 'i-1',
              },
            },
          ],
          coverages: [
            {
              guaranteeCode: 'HOSP',
              levelCode: '04',
              eligibleMadelinLaw: true,
            },
            {
              guaranteeCode: 'CS',
              levelCode: '04',
              eligibleMadelinLaw: true,
            },
            {
              guaranteeCode: 'OPTI',
              levelCode: '04',
              eligibleMadelinLaw: true,
            },
            {
              guaranteeCode: 'DENT',
              levelCode: '04',
              eligibleMadelinLaw: true,
            },
            {
              guaranteeCode: 'AC',
              levelCode: '04',
              eligibleMadelinLaw: true,
            },
            {
              guaranteeCode: 'BE',
              levelCode: '04',
              eligibleMadelinLaw: true,
            },
          ],
        },
      ],
    };

    return payload;
  }

  // Helper methods for populating example values in the form
  getAprilExampleFormValues(): InsuranceQuoteForm {
    return {
      projectUuid: crypto.randomUUID(),
      projectDetails: {
        projectType: 'RES1',
        effectiveDate: new Date().toISOString().split('T')[0],
        periodicity: 'mensuel',
        location: 'METRO',
        paymentType: 'paiement_en_une_fois',
        courtageAmount: 100
      },
      borrowers: [
        {
          firstName: 'John',
          lastName: 'Doe',
          birthDate: '01/01/1985',
          postalCode: '75001',
          profession: 'CADRE_ADMIN_COM',
          riskFactors: {
            isSmoker: false,
            highMileage: false,
            workAtHeight: false,
            heavyLoadHandling: false
          }
        }
      ],
      loans: [
        {
          amount: 250000,
          duration: 240,
          interestRate: 1.25,
          type: 'AMORTISSABLE',
          loanNumber: 1,
          deferredPeriod: 0
        }
      ],
      coverageOptions: [
        {
          guaranteeType: 'DECES',
          coveragePercentage: 100,
          deductiblePeriod: 30
        },
        {
          guaranteeType: 'INVALIDITE_PERMANENTE_TOTALE',
          coveragePercentage: 100,
          deductiblePeriod: 30
        },
        {
          guaranteeType: 'INCAPACITE_TEMPORAIRE_TOTALE',
          coveragePercentage: 100,
          deductiblePeriod: 30
        }
      ],
      productReference: 'ADPv5'
    };
  }

  getUtwinExampleFormValues(): InsuranceQuoteForm {
    return {
      projectDetails: {
        projectType: 'RES1',
        effectiveDate: '01/10/2025',
        periodicity: 'mensuel',
        location: 'METRO',
        paymentType: 'paiement_en_une_fois',
        courtageAmount: 100
      },
      borrowers: [
        {
          firstName: 'Jane',
          lastName: 'Doe',
          birthDate: '01/01/1985',
          postalCode: '75001',
          profession: 'CADRE_ADMIN_COM',
          riskFactors: {
            isSmoker: false,
            highMileage: false,
            workAtHeight: false,
            heavyLoadHandling: false
          }
        }
      ],
      loans: [
        {
          amount: 250000,
          duration: 240,
          interestRate: 1.25,
          type: 'AMORTISSABLE',
          loanNumber: 1,
          deferredPeriod: 0
        }
      ],
      coverageOptions: [
        {
          guaranteeType: 'DC',
          coveragePercentage: 100,
          deductiblePeriod: 30
        }
      ],
      productReference: 'PRET PREVOIR-PARTNER CRD'
    };
  }
}
