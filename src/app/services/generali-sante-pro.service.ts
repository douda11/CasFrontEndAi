import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface GeneraliSanteProRequest {
  age: number;
  codePostal: string;
  formule: string;
  compositionAssures: string;
  situationFamiliale: string;
  nombreEnfants: number;
  anneeEffet: number;
  toutesFormules?: boolean;
}

export interface GeneraliSanteProResponse {
  assureur: string;
  produit: string;
  formule: string;
  zone: number;
  zoneDescription: string;
  compositionAssures: string;
  situationFamiliale: string;
  cotisationMensuelle: number;
  cotisationAnnuelle: number;
  details: {
    age: number;
    codePostal: string;
    nombreEnfants: number;
    anneeEffet: number;
  };
  toutesFormules?: GeneraliSanteProResponse[];
}

export interface GeneraliSanteProFormules {
  formules: string[];
  descriptions: {
    [key: string]: string;
  };
}

export interface GeneraliSanteProCompositions {
  compositions: string[];
  descriptions: {
    [key: string]: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class GeneraliSanteProService {
  private apiUrl = 'http://localhost:8081/api/v1/generali/sante-pro';

  constructor(private http: HttpClient) {}

  /**
   * Obtenir une tarification Generali Santé Pro
   */
  getTarification(request: GeneraliSanteProRequest): Observable<GeneraliSanteProResponse> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    return this.http.post<any>(
      `${this.apiUrl}/tarification`,
      request,
      { headers }
    ).pipe(
      map((response: any) => {
        // Mapper snake_case vers camelCase
        return {
          assureur: response.assureur,
          produit: response.produit,
          formule: response.formule,
          zone: response.zone,
          zoneDescription: response.zone_description || response.zoneDescription,
          compositionAssures: response.composition_assures || response.compositionAssures,
          situationFamiliale: response.situation_familiale || response.situationFamiliale,
          cotisationMensuelle: response.cotisation_mensuelle || response.cotisationMensuelle,
          cotisationAnnuelle: response.cotisation_annuelle || response.cotisationAnnuelle,
          details: {
            age: response.details?.age,
            codePostal: response.details?.code_postal || response.details?.codePostal,
            nombreEnfants: response.details?.nombre_enfants || response.details?.nombreEnfants,
            anneeEffet: response.details?.annee_effet || response.details?.anneeEffet
          },
          toutesFormules: response.toutes_formules || response.toutesFormules
        } as GeneraliSanteProResponse;
      })
    );
  }

  /**
   * Obtenir toutes les formules pour une configuration donnée
   */
  getToutesFormules(
    age: number, 
    codePostal: string, 
    compositionAssures: string,
    situationFamiliale: string,
    nombreEnfants: number
  ): Observable<GeneraliSanteProResponse> {
    const request: GeneraliSanteProRequest = {
      age,
      codePostal,
      formule: 'P0', // Formule par défaut
      compositionAssures,
      situationFamiliale,
      nombreEnfants,
      anneeEffet: new Date().getFullYear(),
      toutesFormules: true
    };

    return this.getTarification(request);
  }

  /**
   * Obtenir la liste des formules disponibles
   */
  getFormules(): Observable<GeneraliSanteProFormules> {
    return this.http.get<GeneraliSanteProFormules>(`${this.apiUrl}/formules`);
  }

  /**
   * Obtenir la liste des compositions d'assurés disponibles
   */
  getCompositions(): Observable<GeneraliSanteProCompositions> {
    return this.http.get<GeneraliSanteProCompositions>(`${this.apiUrl}/compositions`);
  }

  /**
   * Valider un code postal pour Generali Santé Pro
   */
  validateCodePostal(codePostal: string): boolean {
    return /^\d{5}$/.test(codePostal);
  }

  /**
   * Obtenir la zone géographique d'un code postal
   */
  getZoneFromCodePostal(codePostal: string): number {
    if (!this.validateCodePostal(codePostal)) {
      return 2; // Zone par défaut
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
    if (['01', '02', '03', '04', '05', '07', '08', '09', '10', '11', '12', '14', '15', '16', '17', '18', '19', '21', '22', '23', '24', '25', '26', '27', '28', '29', '30', '31', '32', '33', '34', '35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46', '47', '48', '49', '50', '51', '52', '53', '54', '55', '56', '57', '58', '60', '61', '63', '64', '65', '66', '67', '68', '70', '71', '72', '73', '74', '76', '79', '80', '81', '82', '83', '84', '85', '86', '87', '88', '89', '90'].includes(dept)) {
      return 3;
    }
    
    // Zone 4 - DOM-TOM
    if (['971', '972', '973', '974', '976'].includes(codePostal.substring(0, 3))) {
      return 4;
    }
    
    return 2; // Zone par défaut
  }

  /**
   * Obtenir la description d'une zone
   */
  getZoneDescription(zone: number): string {
    switch (zone) {
      case 1: return 'Zone 1 - Île de France';
      case 2: return 'Zone 2 - Départements 06/13/59/62/69';
      case 3: return 'Zone 3 - Autres départements France métropolitaine';
      case 4: return 'Zone 4 - DOM-TOM';
      default: return 'Zone inconnue';
    }
  }

  /**
   * Calculer l'âge à partir de la date de naissance
   */
  calculateAge(birthDate: Date): number {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }
}
