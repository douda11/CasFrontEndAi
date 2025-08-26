import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface AlptisTarificationRequest {
  date_effet: string;
  assures: {
    adherent: {
      cadre_exercice: string;
      categorie_socioprofessionnelle: string;
      code_postal: string;
      date_naissance: string;
      micro_entrepreneur: boolean;
      regime_obligatoire: string;
      statut_professionnel: string;
    };
    conjoint?: {
      categorie_socioprofessionnelle: string;
      date_naissance: string;
      regime_obligatoire: string;
    };
    enfants?: Array<{
      date_naissance: string;
      regime_obligatoire: string;
    }>;
  };
  combinaisons: Array<{
    numero: number;
    offre: {
      niveau: string;
      sur_complementaire: boolean;
    };
    ayants_droit: {
      conjoint?: boolean;
      enfants?: number;
    };
    commissionnement: string;
  }>;
}

export interface AlptisTarificationResponse {
  resultatsTarification: Array<{
    tarifs: {
      cotisationMensuelle: number;
      cotisationAnnuelle: number;
      fraisGestion: number;
      taxeAttentat: number;
      tarifTTC: number;
    };
    generationTarif: string;
    numeroCombinaison: number;
  }>;
}

@Injectable({
  providedIn: 'root'
})
export class AlptisService {
  private readonly baseUrl = 'http://localhost:8081/api/v1/tarification/alptis';

  constructor(private http: HttpClient) {}

  getTarification(request: AlptisTarificationRequest): Observable<AlptisTarificationResponse> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    return this.http.post<AlptisTarificationResponse>(this.baseUrl, request, { headers });
  }

  getOffres(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/offres`);
  }

  generateDevis(request: any, testMode: boolean = false): Observable<any> {
    const url = testMode ? 
      'http://localhost:8081/api/alptis/generate-devis?testMode=true' : 
      'http://localhost:8081/api/alptis/generate-devis';
    
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    return this.http.post<any>(url, request, { headers });
  }
}
