// src/app/services/insurance.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, EMPTY, of } from 'rxjs';
import { retry, catchError } from 'rxjs/operators';
import { API_CONFIG } from '../config/api.config';
import { QuoteResponse, ComparisonResult, InsuranceQuoteForm, AprilPayload, AprilPerson, AprilAddress, AprilMobilePhone, AprilProduct, AprilInsured, AprilCoverage } from '../models/project-model';
import { formatDate } from '@angular/common';

import { AprilGetTarifResponse } from '../models/april-models';

@Injectable({ providedIn: 'root' })
export class InsuranceService {
  private apiBasePath = 'http://localhost:8081';
  private apiUrl = '/api/v1/tarification';
  private aprilUrl = `${this.apiBasePath}/api/v1/comparisons/april/projects/prices`;
  private healthProtectionUrl = `${this.apiBasePath}/healthProtection/projects/prices`; // New endpoint
  private utwinUrl = `${API_CONFIG.utwin.baseUrl}${API_CONFIG.utwin.endpoints.tarification}`;
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
    // Construction du payload JSON pour le backend selon ApiviaTarificationRequest
    const payload = {
      action: data.action || 'tarification',
      format: data.format || 'json',
      produits: data.produits || '',
      formules: data.formules || '',
      renforts: data.renforts || '',
      options: data.options || '',
      codePostal: data.codePostal,
      dateEffet: data.dateEffet,
      dejaAssurance: data.dejaAssurance || false,
      isResiliationPourCompte: data.isResiliationPourCompte || false,
      typeAffaire: data.typeAffaire || '',
      typeObjectSortie: data.typeObjectSortie || 'v2',
      beneficiaires: data.beneficiaires || []
    };

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });

    const apiUrl = `${API_CONFIG.apivia.baseUrl}${API_CONFIG.apivia.endpoints.tarification}`;
    
    return this.http.post<any>(apiUrl, payload, { headers }).pipe(
      retry(2),
      catchError(error => {
        console.error('Erreur lors de la tarification Apivia:', error);
        throw error;
      })
    );
  }

  generateApiviaDevisPdf(devisRequest: any, test: boolean = false): Observable<any> {
    const params = new HttpParams().set('test', test.toString());
    return this.http.post(this.apiviaDevisUrl, devisRequest, { params }).pipe(
      retry(2),
      catchError(error => {
        console.error('Erreur lors de la génération du devis Apivia:', error);
        throw error;
      })
    );
  }

  sendAprilQuoteByEmail(payload: any): Observable<any> {
    const params = new HttpParams().set('marketingParameters.requestType', 'Quotation');
    return this.http.post(this.aprilQuoteUrl, payload, { params }).pipe(
      retry(2),
      catchError(error => {
        console.error('Erreur lors de l\'envoi du devis April par email:', error);
        throw error;
      })
    );
  }

  generateCommercialProposal(payload: any, action: 'envoiParEmail' | 'telechargement'): Observable<any> {
    const endpoint = `${this.apiBasePath}/healthProtection/projects/commercial-proposal`;
    const params = new HttpParams().set('action', action);
    return this.http.post(endpoint, payload, { params }).pipe(
      retry(2),
      catchError(error => {
        console.error('Erreur lors de la génération de la proposition commerciale:', error);
        throw error;
      })
    );
  }

  downloadApiviaQuotePdf(payload: any): Observable<Blob> {
    return this.http.post(this.apiviaPdfUrl, payload, {
      responseType: 'blob'
    }).pipe(
      retry(2),
      catchError(error => {
        console.error('Erreur lors du téléchargement du PDF Apivia:', error);
        throw error;
      })
    );
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

    // Helper for April regime mapping
    const mapAprilRegime = (regime: string, professionalCategory?: string): string => {
      console.log('🔍 DEBUG: Mapping regime:', regime, 'for profession:', professionalCategory);
      
      // Catégories professionnelles qui forcent le régime Sécurité Sociale (SS)
      const categoriesRequiringSS = [
        'Retraite',
        'ParamedicalNonSalarie', 
        'SansProfession',
        'ParamedicalSalarie',
        'MandataireSocial'
      ];
      
      if (professionalCategory && categoriesRequiringSS.includes(professionalCategory)) {
        console.log('✅ DEBUG: Catégorie', professionalCategory, 'détectée, forçage vers SS');
        return 'SS';
      } else {
        console.log('✅ DEBUG: Catégorie', professionalCategory, 'non spécifique, forçage vers TNS');
        return 'TNS';
      }
    };

    // Helper for April professional category mapping - TRANSMISSION DIRECTE
    const mapAprilProfessionalCategory = (categorie: string): string => {
      console.log('🔍 DEBUG: Valeur reçue du formulaire:', categorie);
      
      // Si la valeur est déjà un code April valide, la retourner directement
      const validAprilCodes = [
        'Retraite', 'ParamedicalNonSalarie', 'SansProfession', 
        'ParamedicalSalarie', 'MandataireSocial', 'ChefEntreprise',
        'ProfessionLiberale', 'Artisan', 'Commercant', 'Agriculteur',
        'Cadre', 'Employe', 'Ouvrier', 'FonctionPublique'
      ];
      
      if (validAprilCodes.includes(categorie)) {
        console.log('✅ DEBUG: Code April valide détecté, transmission directe:', categorie);
        return categorie;
      }
      
      // Gestion des valeurs null, undefined ou vides
      if (!categorie || categorie.trim() === '') {
        console.log('⚠️ DEBUG: Catégorie vide, utilisation de ChefEntreprise par défaut');
        return 'ChefEntreprise';
      }
      
      // Mapping pour les anciennes valeurs si nécessaire
      switch (categorie.toUpperCase()) {
        case 'RETRAITES':
          console.log('✅ DEBUG: Mapping RETRAITES vers Retraite');
          return 'Retraite';
        case 'PROFESSIONS_MEDICALES_ET_PARAMEDICALES_NON_SALARIES':
        case 'PROFESSIONS_MEDICALES_NON_SALARIES': // Variante sans "ET_PARAMEDICALES"
          console.log('✅ DEBUG: Mapping', categorie, 'vers ParamedicalNonSalarie');
          return 'ParamedicalNonSalarie';
        case 'PERSONNES_SANS_ACTIVITE_PROFESSIONNELLE':
        case 'SANS_PROFESSION':
        case 'SANS PROFESSION':
          console.log('✅ DEBUG: Mapping vers SansProfession');
          return 'SansProfession';
        case 'PROFESSIONS_MEDICALES_ET_PARAMEDICALES_SALARIES':
        case 'PROFESSIONS_MEDICALES_SALARIES': // Variante sans "ET_PARAMEDICALES"
          console.log('✅ DEBUG: Mapping', categorie, 'vers ParamedicalSalarie');
          return 'ParamedicalSalarie';
        case 'MANDATAIRE_SOCIAL':
          console.log('✅ DEBUG: Mapping MANDATAIRE_SOCIAL vers MandataireSocial');
          return 'MandataireSocial';
        case 'CHEFS_D_ENTREPRISE':
          return 'ChefEntreprise';
        case 'PROFESSIONS_LIBERALES_ET_ASSIMILES':
          return 'ProfessionLiberale';
        case 'ARTISANS':
          return 'Artisan';
        case 'COMMERCANTS_ET_ASSIMILES':
          return 'Commercant';
        case 'AGRICULTEURS_EXPLOITANTS':
          return 'Agriculteur';
        case 'CADRES':
          return 'Cadre';
        case 'EMPLOYES_AGENTS_DE_MAITRISE':
          return 'Employe';
        case 'OUVRIERS':
          return 'Ouvrier';
        case 'CADRES_ET_EMPLOYES_DE_LA_FONCTION_PUBLIQUE':
          return 'FonctionPublique';
        default:
          console.log('⚠️ DEBUG: Catégorie non reconnue:', categorie, '- Utilisation de ChefEntreprise par défaut');
          return 'ChefEntreprise';
      }
    };

    // Helper for Alptis Luminéis professional category mapping
    const mapAlptisLumineisCategory = (categorie: string): string => {
      console.log('🔍 DEBUG ALPTIS LUMINÉIS: Valeur reçue:', categorie);
      
      if (!categorie || categorie.trim() === '') {
        console.log('⚠️ DEBUG ALPTIS LUMINÉIS: Catégorie vide, utilisation de 420 par défaut');
        return '420'; // Chefs d'entreprise par défaut
      }
      
      switch (categorie.toUpperCase()) {
        case 'ARTISANS':
          console.log('✅ DEBUG ALPTIS LUMINÉIS: Mapping ARTISANS vers 410');
          return '410';
        case 'CHEFS_D_ENTREPRISE':
          console.log('✅ DEBUG ALPTIS LUMINÉIS: Mapping CHEFS_D_ENTREPRISE vers 420');
          return '420';
        case 'COMMERCANTS_ET_ASSIMILES':
          console.log('✅ DEBUG ALPTIS LUMINÉIS: Mapping COMMERCANTS_ET_ASSIMILES vers 430');
          return '430';
        case 'PROFESSIONS_LIBERALES_ET_ASSIMILES':
          console.log('✅ DEBUG ALPTIS LUMINÉIS: Mapping PROFESSIONS_LIBERALES_ET_ASSIMILES vers 450');
          return '450';
        case 'AGRICULTEURS_EXPLOITANTS':
          console.log('✅ DEBUG ALPTIS LUMINÉIS: Mapping AGRICULTEURS_EXPLOITANTS vers 500');
          return '500';
        default:
          console.log('⚠️ DEBUG ALPTIS LUMINÉIS: Catégorie non reconnue:', categorie, '- Utilisation de 420 par défaut');
          return '420'; // Chefs d'entreprise par défaut
      }
    };

    // Helper for Alptis Santé Select professional category mapping
    const mapAlptisSanteSelectCategory = (categorie: string): string => {
      console.log('🔍 DEBUG ALPTIS SANTÉ SELECT: Valeur reçue:', categorie);
      
      if (!categorie || categorie.trim() === '') {
        console.log('⚠️ DEBUG ALPTIS SANTÉ SELECT: Catégorie vide, utilisation de CHEFS_D_ENTREPRISE par défaut');
        return 'CHEFS_D_ENTREPRISE';
      }
      
      switch (categorie.toUpperCase()) {
        case 'CHEFS_D_ENTREPRISE':
          console.log('✅ DEBUG ALPTIS SANTÉ SELECT: Mapping CHEFS_D_ENTREPRISE vers CHEFS_D_ENTREPRISE');
          return 'CHEFS_D_ENTREPRISE';
        case 'PROFESSIONS_LIBERALES_ET_ASSIMILES':
          console.log('✅ DEBUG ALPTIS SANTÉ SELECT: Mapping PROFESSIONS_LIBERALES_ET_ASSIMILES vers PROFESSIONS_LIBERALES_ET_ASSIMILES');
          return 'PROFESSIONS_LIBERALES_ET_ASSIMILES';
        case 'ARTISANS':
          console.log('✅ DEBUG ALPTIS SANTÉ SELECT: Mapping ARTISANS vers ARTISANS');
          return 'ARTISANS';
        case 'COMMERCANTS_ET_ASSIMILES':
          console.log('✅ DEBUG ALPTIS SANTÉ SELECT: Mapping COMMERCANTS_ET_ASSIMILES vers COMMERCANTS_ET_ASSIMILES');
          return 'COMMERCANTS_ET_ASSIMILES';
        default:
          console.log('⚠️ DEBUG ALPTIS SANTÉ SELECT: Catégorie non reconnue:', categorie, '- Utilisation de CHEFS_D_ENTREPRISE par défaut');
          return 'CHEFS_D_ENTREPRISE';
      }
    };

    const persons: AprilPerson[] = form.insuredPersons.map((p, index) => {
      const personId = `i-${index + 1}`;
      
      // Log détaillé des données reçues pour debug
      console.log(`🔍 DEBUG Person ${index + 1}:`, {
        categorieSocioProfessionnelle: p.categorieSocioProfessionnelle,
        regime: p.regime,
        situation: p.situation,
        rawPersonData: p
      });
      
      console.log('🔍 DEBUG: Valeur brute categorieSocioProfessionnelle:', JSON.stringify(p.categorieSocioProfessionnelle));
      console.log('🔍 DEBUG: Type de la valeur:', typeof p.categorieSocioProfessionnelle);
      
      const professionalCategory = mapAprilProfessionalCategory(p.categorieSocioProfessionnelle || '');
      
      return {
        $id: personId,
        birthDate: formatDate(p.birthDate, 'yyyy-MM-dd', 'en-US'),
        title: p.gender === 'M' ? 'Monsieur' : 'Madame',
        lastName: p.lastName,
        firstName: p.firstName,
        mandatoryScheme: mapAprilRegime(p.regime || 'TNS', professionalCategory),
        professionalCategory: professionalCategory,
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

    // Générer les coverages pour tous les assurés
    const allCoverages: AprilCoverage[] = [];
    insureds.forEach((insured, index) => {
      const insuredRef = `a-${index + 1}`;
      const insuredCoverages = this.getGuaranteeCoverages(productCode, insuredRef, levelCode);
      allCoverages.push(...insuredCoverages);
    });
    
    console.log(`✅ Coverages générées pour ${insureds.length} assurés:`, allCoverages);

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
          coverages: allCoverages
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

    // Headers selon l'ancienne version qui fonctionne
    const projectUuid = this.generateRandomUuid();
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Cache-Control': 'no-cache',
      'x-projectUuid': projectUuid,
      'x-api-version': '1.0',
      'Authorization': 'Bearer YOUR_APRIL_OAUTH_TOKEN' // À remplacer par le vrai token OAuth
    });
    
    return this.http.post(url, payload, { headers, params }).pipe(
      retry(2),
      catchError(error => {
        console.error('Erreur lors de la tarification April Health:', error);
        throw error;
      })
    );
  }

  private generateRandomUuid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  getUtwinTarif(form: InsuranceQuoteForm, formule: string): Observable<any> {
    // Helper function to format date to ISO string format
    const formatDate = (date: Date): string => {
      return date.toISOString();
    };

    // Helper for regime mapping based on user requirements
    const mapRegime = (regime: string): string => {
      switch (regime.toUpperCase()) {
        case 'TNS':
          return 'SSI'; // 'TNS' in form becomes 'SSI' for Utwin
        case 'REGIME_GENERAL':
          return 'RG'; // 'REGIME_GENERAL' in form becomes 'RG' for Utwin
        case 'PROF_LIBE':
          return 'SSI'; // Profession libérale mapped to SSI for Utwin
        case 'PROF_MED_NON_MED_NON_SAL':
          return 'SSI'; // Professions médicales et non médicales non salariées mapped to SSI
        case 'SS':
          return 'RG'; // Sécurité Sociale mapped to RG for Utwin
        default:
          return 'RG'; // Default fallback
      }
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

    // Correction: Utiliser les headers Utwin corrects selon l'ancienne version
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-U-Licence': API_CONFIG.utwin.licence,
      'X-Utwin-Contexte-Vendeur': API_CONFIG.utwin.contexteVendeur
    });
    
    return this.http.post(this.utwinUrl, payload, { headers }).pipe(
      retry(2),
      catchError((error: HttpErrorResponse) => {
        // Check if the error is a 400 Bad Request and has a response body
        if (error.status === 400 && error.error) {
          // Treat it as a successful response by returning the error body
          console.warn('Backend returned 400, but treating as success:', error.error);
          return of(error.error);
        }
        // For all other errors, propagate the error
        console.error('Erreur lors de la tarification Utwin:', error);
        return throwError(() => error);
      })
    );
  }  
}