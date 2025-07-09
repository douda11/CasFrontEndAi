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
      addressLine1: string;
      postCode: string;
      city: string;
    }>;
    email: string;
  };
  persons: Array<{
    $id: string;
    birthDate: string; // "YYYY-MM-DD"
    title: string;
    lastName: string;
    birthName: string;
    firstName: string;
    birthDepartment: string;
    birthCity: string;
    nationality: string;
    politicallyExposedPerson: boolean;
    birthCountry: string;
    mandatoryScheme: string;
    professionalCategory: string;
    familyStatus: string;
    profession: string;
    acceptanceRequestPartnersAPRIL: boolean;
    acreBeneficiary: boolean;
    companyCreationDate: string; // "YYYY-MM-DD"
    swissCrossBorderWorker: boolean;
    businessCreator: boolean;
    microEntrepreneur: boolean;
    socialSecurityNumber: string;
    landlinePhone?: {
      prefix: string;
      number: string;
    };
    mobilePhone?: {
      prefix: string;
      number: string;
    };
    email: string;
  }>;
  products: Array<{
    $id: string;
    productCode: string;
    effectiveDate: string; // "YYYY-MM-DD"
    commission: string;
    termination?: {
      insurer: string;
      formerContractReference: string;
    };
    insureds: Array<{
      $id: string;
      role: string;
      person: { $ref: string };
    }>;
    coverages: Array<{
      insured: { $ref: string };
      guaranteeCode: string;
      levelCode: string;
      eligibleMadelinLaw: boolean;
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
