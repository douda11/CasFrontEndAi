// src/app/services/insurance.service.ts

import { HttpClient, HttpHeaders, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BorrowerForm } from '../models/borrower-form.model';
import { Observable, throwError, EMPTY, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { QuoteResponse, ComparisonResult, InsuranceQuoteForm, AprilPayload, AprilPerson, AprilAddress, AprilMobilePhone, AprilProduct, AprilInsured, AprilCoverage } from '../models/project-model';
import { formatDate } from '@angular/common';

import { AprilGetTarifResponse } from '../models/april-models';

@Injectable({ providedIn: 'root' })
export class InsuranceService {
  private apiBasePath = '';
  private apiUrl = '/api/v1/tarification';
  private aprilUrl = `${this.apiBasePath}/api/v1/comparisons/april/projects/prices`;
  private healthProtectionUrl = `${this.apiBasePath}/healthProtection/projects/prices`; // New endpoint
  private utwinUrl = `${this.apiBasePath}/api/Sante/v1/Tarifs`;
  private compareUrl = `${this.apiBasePath}/api/v1/comparisons/compare`;
  private apiviaDevisUrl = `${this.apiBasePath}/api/apivia/generate-devis`;
  private aprilQuoteUrl = `${this.apiBasePath}/healthProtection/projects`;
  private apiviaPdfUrl = `${this.apiBasePath}/api/apivia/generate-devis`;

  private aprilProductCodeMap: { [key: string]: string } = {
    'Santé Pro Start': 'SanteProStart', // Plus spécifique en premier
    'Santé PRO Start APRIL': 'SanteProStart', // Ancien format
    'Santé Mix': 'SanteMix',
    'Santé Pro': 'SantePro',
  };

  constructor(
    private http: HttpClient
  ) {}

  getApiviaTarif(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/apivia`, data);
  }

  generateApiviaDevisPdf(devisRequest: any, test: boolean = false): Observable<any> {
    const params = new HttpParams().set('test', test.toString());
    return this.http.post(this.apiviaDevisUrl, devisRequest, { params });
  }

  sendAprilQuoteByEmail(payload: any): Observable<any> {
    const params = new HttpParams().set('marketingParameters.requestType', 'Quotation');
    return this.http.post(this.aprilQuoteUrl, payload, { params });
  }

  generateCommercialProposal(payload: any, action: 'envoiParEmail' | 'telechargement'): Observable<any> {
    const endpoint = `${this.apiBasePath}/healthProtection/projects/commercial-proposal`;
    const params = new HttpParams().set('action', action);
    return this.http.post(endpoint, payload, { params });
  }

  downloadApiviaQuotePdf(payload: any): Observable<Blob> {
    return this.http.post(this.apiviaPdfUrl, payload, {
      responseType: 'blob'
    });
  }

  // New method for Health Protection API


  private getGuaranteeCoverages(productCode: string, insuredRef: string, levelCode: string): AprilCoverage[] {
    const coverages: AprilCoverage[] = [];

    const guaranteeMap: { [key: string]: string[] } = {
      'SantePro': ['MaladieChirurgie', 'Surcomplementaire'],
      'SanteProStart': ['MaladieChirurgie', 'Surcomplementaire'],
      'SanteSolution': ['MaladieChirurgie', 'Surcomplementaire'],
      'SanteMix': ['GarantieHospitalisation', 'GarantieFraisDeSante']
    };

    const guarantees = guaranteeMap[productCode] || [];

    guarantees.forEach(guaranteeCode => {
      const coverage: AprilCoverage = {
        insured: { $ref: insuredRef },
        guaranteeCode: guaranteeCode,
        eligibleMadelinLaw: true
      };

      // Appliquer le levelCode selon les règles
      if (productCode === 'SantePro' || productCode === 'SanteProStart' || productCode === 'SanteSolution') {
        if (guaranteeCode !== 'Surcomplementaire') {
          coverage.levelCode = levelCode;
        }
      } else if (productCode === 'SanteMix') {
        coverage.levelCode = levelCode;
      }
      
      coverages.push(coverage);
    });

    return coverages;
  }

  private transformToAprilPayload(form: InsuranceQuoteForm, productCode: string, levelCode: string): AprilPayload {
    const mainPersonInfo = form.insuredPersons[0];

    const persons: AprilPerson[] = form.insuredPersons.map((p, index) => {
      const personId = `i-${index + 1}`;
      return {
        $id: personId,
        birthDate: formatDate(p.birthDate, 'yyyy-MM-dd', 'en-US'),
        title: p.gender === 'M' ? 'Monsieur' : 'Madame',
        lastName: p.lastName,
        firstName: p.firstName,
        mandatoryScheme: p.regime || 'TNS',
        familyStatus: p.situation || 'Celibataire',
        mobilePhone: {
          prefix: '+33',
          number: (p.phoneNumber?.replace(/\s|\(|\)/g, '') || '').replace(/^(\+33|33)/, '0') // Normalise le numéro (ex: +336... -> 06...)
        },
        email: p.email || ''
      };
    });

    const insureds: AprilInsured[] = form.insuredPersons.map((p, index) => {
      const insuredId = `a-${index + 1}`;
      let role: 'AssurePrincipal' | 'Conjoint' | 'Enfant' = 'Enfant';
      if (index === 0) {
        role = 'AssurePrincipal';
      } else if (index === 1 && form.insuredPersons.length > 1 && p.situation) { // crude check for spouse
        role = 'Conjoint';
      }
      return {
        $id: insuredId,
        role: role,
        person: { $ref: `i-${index + 1}` }
      };
    });

    const coverages = this.getGuaranteeCoverages(productCode, 'a-1', levelCode);

    const payload: AprilPayload = {
      $type: 'PrevPro',
      properties: {
        addresses: [
          {
            $id: 'adr-1',
            type: 'Actuelle',
            addressLine1: mainPersonInfo.address.street,
            postCode: mainPersonInfo.address.postalCode,
            city: mainPersonInfo.address.city
          }
        ],
        email: mainPersonInfo.email
      },
      persons: persons,
      products: [
        {
          $id: 'p-1',
          productCode: productCode,
          effectiveDate: formatDate(form.effectDate, 'yyyy-MM-dd', 'en-US'),
          insureds: insureds,
          coverages: coverages
        }
      ]
    };

    return payload;
  }

  getAprilHealthTarif(form: InsuranceQuoteForm, productReference: string, formule: string): Observable<any> {
    // Extraire le levelCode de la formule (ex: "Formule 3" -> "03")
    const levelMatch = formule.match(/\d+/);
    const levelCode = levelMatch ? levelMatch[0].padStart(2, '0') : '01'; // Default à '01' si non trouvé

    // Déterminer le productCode en cherchant une correspondance partielle
    let productCode: string | null = null;
    for (const key in this.aprilProductCodeMap) {
      if (productReference.toLowerCase().includes(key.toLowerCase())) {
        productCode = this.aprilProductCodeMap[key];
        break; // Arrêter dès qu'une correspondance est trouvée
      }
    }

    // Si aucun productCode n'est trouvé pour un produit April, retourner une erreur
    if (!productCode) {
      // Ne pas traiter comme une erreur si ce n'est pas un produit April, retourner simplement un observable vide.
      if (!productReference.toLowerCase().includes('april')) {
        return EMPTY;
      }
      console.error('Aucun productCode APRIL correspondant trouvé pour la référence:', productReference);
      return throwError(() => new Error(`Aucun produit APRIL correspondant trouvé pour "${productReference}"`));
    }

    const payload = this.transformToAprilPayload(form, productCode, levelCode);

    console.log('Sending April Payload:', JSON.stringify(payload, null, 2));

    const url = this.healthProtectionUrl; // Utiliser l'URL correcte du backend

    // Ajout des paramètres de requête attendus par le backend
    const params = new HttpParams()
      .set('pricingType', 'Simple') // Valeur par défaut
      .set('withSchedule', 'true');   // Valeur par défaut

    // Exécution de l'appel POST avec le payload et les paramètres
    return this.http.post(url, payload, { params });
  }

  getUtwinTarif(form: InsuranceQuoteForm, formule: string): Observable<any> {
    // Helper function to format date to ISO string format
    const formatDate = (date: Date): string => {
      return date.toISOString();
    };

    // Helper for regime mapping based on user requirements
    const mapRegime = (regime: string): string => {
      if (regime.toUpperCase() === 'TNS') {
        return 'SSI'; // 'TNS' in form becomes 'SSI' for Utwin
      }
      return 'RG'; // Default or 'GENERAL' becomes 'RG'
    };

    const payload = {
      souscripteur: {
        adresse: {
          codePostal: form.contact?.address?.postalCode || '69000',
          ville: form.contact?.address?.city || 'Lyon'
        }
      },
      besoin: {
        dateEffet: formatDate(form.effectDate || new Date())
      },
      assures: form.insuredPersons?.map((person, index) => {
        let codeTypeRole = 'Enfant';
        if (index === 0) {
          codeTypeRole = 'AssurePrincipal';
        } else if (index === 1) {
          codeTypeRole = 'Conjoint';
        }

        return {
          codeRegimeObligatoire: mapRegime(person.regime || 'TNS'),
          codeTypeRole: codeTypeRole,
          dateDeNaissance: formatDate(person.birthDate || new Date())
        };
      }) || []
    };

    console.log('Sending Utwin Payload:', JSON.stringify(payload, null, 2));

    return this.http.post(this.utwinUrl, payload).pipe(
      catchError((error: HttpErrorResponse) => {
        // Check if the error is a 400 Bad Request and has a response body
        if (error.status === 400 && error.error) {
          // Treat it as a successful response by returning the error body
          console.warn('Backend returned 400, but treating as success:', error.error);
          return of(error.error);
        }
        // For all other errors, propagate the error
        return throwError(() => error);
      })
    );
  }  
}
