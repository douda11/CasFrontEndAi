import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

export interface GeneraliTarificationRequest {
  age: number;
  codePostal: string;
  compositionFamiliale: 'isolé' | 'duo' | 'famille';
  formule?: string;
  toutesFormules?: boolean;
}

export interface GeneraliTarificationResponse {
  assureur: string;
  produit: string;
  formule: string;
  zone: number;
  zoneDescription: string;
  ageBracket: string;
  compositionFamiliale: string;
  tarifMensuel: number;
  tarifAnnuel: number;
  details: {
    age: number;
    codePostal: string;
  };
  toutesFormules?: GeneraliTarificationResponse[];
}

export interface GeneraliCompositionsResponse {
  compositions: string[];
  descriptions: {
    [key: string]: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class GeneraliService {
  private apiUrl = 'http://localhost:8081/api/v1/generali';

  constructor(private http: HttpClient) {}

  /**
   * Obtenir une tarification Generali
   */
  getTarification(request: GeneraliTarificationRequest): Observable<GeneraliTarificationResponse> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    return this.http.post<GeneraliTarificationResponse>(
      `${this.apiUrl}/tarification`,
      request,
      { headers }
    );
  }

  /**
   * Obtenir toutes les formules pour une configuration donnée
   */
  getToutesFormules(age: number, codePostal: string, compositionFamiliale: string): Observable<GeneraliTarificationResponse> {
    const request: GeneraliTarificationRequest = {
      age,
      codePostal,
      compositionFamiliale: compositionFamiliale as 'isolé' | 'duo' | 'famille',
      toutesFormules: true
    };

    return this.getTarification(request);
  }

  /**
   * Obtenir la liste des compositions familiales disponibles
   */
  getCompositions(): Observable<GeneraliCompositionsResponse> {
    return this.http.get<GeneraliCompositionsResponse>(`${this.apiUrl}/compositions`);
  }

  /**
   * Obtenir la liste des formules disponibles
   */
  getFormules(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/formules`);
  }

  /**
   * Valider un code postal pour Generali
   */
  validateCodePostal(codePostal: string): boolean {
    return /^\d{5}$/.test(codePostal);
  }

  /**
   * Obtenir la zone géographique d'un code postal
   */
  getZoneFromCodePostal(codePostal: string): number {
    if (!this.validateCodePostal(codePostal)) {
      return 3; // Zone par défaut
    }

    const dept = codePostal.substring(0, 2);
    
    // Zone 1 - Île de France
    if (['75', '77', '78', '91', '92', '93', '94', '95'].includes(dept)) {
      return 1;
    }
    
    // Zone 2 - Départements spécifiques
    if (['06', '13', '59', '62', '69'].includes(dept)) {
      return 2;
    }
    
    // Zone 3 - Autres départements
    return 3;
  }

  /**
   * Obtenir la description d'une zone
   */
  getZoneDescription(zone: number): string {
    switch (zone) {
      case 1: return 'Zone 1 - Île de France';
      case 2: return 'Zone 2 - Départements 06/13/59/62/69';
      case 3: return 'Zone 3 - Autres départements France métropolitaine';
      default: return 'Zone inconnue';
    }
  }
}
