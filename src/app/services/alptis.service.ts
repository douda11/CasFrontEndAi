import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { retry, catchError } from 'rxjs/operators';

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
  private readonly baseUrl = 'http://localhost:8081/api/v1/tarification';

  constructor(private http: HttpClient) {}

  getTarification(request: AlptisTarificationRequest): Observable<AlptisTarificationResponse> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'X-Alptis-Api-Key': 'YOUR_ALPTIS_API_KEY' // À remplacer par la vraie clé API
    });

    return this.http.post<AlptisTarificationResponse>(`${this.baseUrl}/alptis`, request, { headers }).pipe(
      retry(2),
      catchError(error => {
        console.error('Erreur lors de la tarification Alptis:', error);
        throw error;
      })
    );
  }

  getOffres(): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'X-Alptis-Api-Key': 'YOUR_ALPTIS_API_KEY' // À remplacer par la vraie clé API
    });
    return this.http.get<any>(`${this.baseUrl}/alptis/offres`, { headers }).pipe(
      retry(2),
      catchError(error => {
        console.error('Erreur lors de la récupération des offres Alptis:', error);
        throw error;
      })
    );
  }

  generateDevis(request: any, testMode: boolean = false): Observable<any> {
    const endpoint = testMode ? '/alptis/devis/generer-pdf-test' : '/alptis/devis/generer-pdf';
    const url = `${this.baseUrl}${endpoint}`;
    
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'X-Alptis-Api-Key': 'YOUR_ALPTIS_API_KEY' // À remplacer par la vraie clé API
    });

    return this.http.post<any>(url, request, { headers }).pipe(
      retry(2),
      catchError(error => {
        console.error('Erreur lors de la génération du devis Alptis:', error);
        throw error;
      })
    );
  }

  // Nouvelle méthode pour l'endpoint sante-pro-plus
  getSanteProPlusTarification(request: any): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    const url = 'http://localhost:8081/api/alptis/sante-pro-plus/tarification';
    
    return this.http.post<any>(url, request, { headers }).pipe(
      retry(2),
      catchError(error => {
        console.error('Erreur lors de la tarification Alptis Santé Pro Plus:', error);
        throw error;
      })
    );
  }
}
