// src/app/services/insurance.service.ts

import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BorrowerForm } from '../models/borrower-form.model';
import { Observable } from 'rxjs';
import { QuoteResponse, ComparisonResult, InsuranceQuoteForm, AprilPayload, AprilPerson, AprilAddress, AprilMobilePhone, AprilProduct, AprilInsured, AprilCoverage } from '../models/project-model';
import { formatDate } from '@angular/common';

import { AprilGetTarifResponse } from '../models/april-models';

@Injectable({ providedIn: 'root' })
export class InsuranceService {
  private apiBasePath = '';
  private aprilUrl = `${this.apiBasePath}/api/v1/comparisons/april/projects/prices`;
  private healthProtectionUrl = `${this.apiBasePath}/healthProtection/projects/prices`; // New endpoint
  private utwinUrl = `${this.apiBasePath}/api/v1/comparisons/utwin/get-tarif`;
  private compareUrl = `${this.apiBasePath}/api/v1/comparisons/compare`;

  private aprilProductCodeMap: { [key: string]: string } = {
    'APRIL Santé Mix Proximité': 'SanteMix',
    'SANTE PRO APRIL': 'SantePro',
    'Santé PRO Solution': 'SanteSolution',
  };

  constructor(
    private http: HttpClient
  ) {}

  // For the new wizard-based forms
  




 

  // New method for Health Protection API


  private getGuaranteeCoverages(productCode: string, insuredRef: string): AprilCoverage[] {
    const coverages: AprilCoverage[] = [];
    const levelCode = '04'; // This seems to be constant in the examples

    const guaranteeMap: { [key: string]: string[] } = {
      'SantePro': ['MaladieChirurgie', 'Surcomplementaire'],
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
      // Only add levelCode if it's not a 'Surcomplementaire'
      if (guaranteeCode !== 'Surcomplementaire') {
        coverage.levelCode = levelCode;
      }
      coverages.push(coverage);
    });

    return coverages;
  }

  private transformToAprilPayload(form: InsuranceQuoteForm, productCode: string): AprilPayload {
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

    const coverages = this.getGuaranteeCoverages(productCode, 'a-1');

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

  getAprilHealthTarif(form: InsuranceQuoteForm): Observable<any> {
    // Utiliser la référence produit du formulaire
    const productCode = this.aprilProductCodeMap[form.productReference || ''] || 'SantePro';
    const payload = this.transformToAprilPayload(form, productCode);

    console.log('Sending April Payload:', JSON.stringify(payload, null, 2));

    const url = `${this.apiBasePath}/april/prices`; // Endpoint du backend

    // Ajout des paramètres de requête attendus par le backend
    const params = new HttpParams()
      .set('pricingType', 'Simple') // Valeur par défaut
      .set('withSchedule', 'true');   // Valeur par défaut

    // Exécution de l'appel POST avec le payload et les paramètres
    return this.http.post(url, payload, { params });
  }

  
  }

