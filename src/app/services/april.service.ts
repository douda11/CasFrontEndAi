// src/app/services/april.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface AprilGettarifRequest {
  $type: string;
  properties: {
    addresses: Array<{
      $id: string;
      type: string;
      postCode: string;
      city: string;
      addressLine1?: string;
      addressLine2?: string;
      addressLine3?: string;
      addressLine4?: string;
      countryCode?: string;
    }>;
    email: string;
    commission: string;
    moralSubscriber: boolean;
    effectiveDate: string; // "YYYY-MM-DD"
    cancellation: boolean;
    projectType: string;
  };
  persons: Array<{
    $id: string;
    title: string;
    lastName: string;
    firstName: string;
    birthDate: string; // "YYYY-MM-DD"
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
  }>;
  loans: Array<{
    $id: string;
    loanType: string;
    borrowedAmount: number;
    interestRate: number;
    loanDuration: number;
  }>;
  lenders: Array<{
    companyName: string;
    address: {
      addressLine1: string;
      postCode: string;
      city: string;
    };
    loans: Array<{ $ref: string }>;
  }>;
  products: Array<{
    $id: string;
    productCode: string;
    contributionType: string;
    insured: {
      role: 'AssurePrincipal';
      person: { $ref: string };
    };
    coverages: Array<{
      loan: { $ref: string };
      guaranteeCode: string;
      coveragePercentage?: number;
      deductibleCode?: string;
      levelCode?: string;
      compensationMode?: string;
    }>;
  }>;
}

@Injectable({
  providedIn: 'root'
})
export class AprilService {
  private baseUrl = 'http://localhost:8000/api/v1/comparisons/april';

  constructor(private http: HttpClient) {}

  /**
   * POST to /projects/prices
   * - payload must follow AprilGettarifRequest schema
   * - pricingType & withSchedule as query params
   * - x-projectUuid in header
   */
  getTarif(
    payload: AprilGettarifRequest,
    pricingType: 'Simple' | 'Complete' = 'Simple',
    withSchedule: 'true' | 'false' = 'false',
    projectUuid: string
  ): Observable<any> {
    const url = `${this.baseUrl}/projects/prices`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'x-projectUuid': projectUuid
    });
    const params = new HttpParams()
      .set('pricingType', pricingType)
      .set('withSchedule', withSchedule);

    return this.http.post(url, payload, { headers, params });
  }
}
