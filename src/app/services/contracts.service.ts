import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';

export interface ContractBenefits {
  HOSPITALISATION?: {
    honoraires_chirurgien_optam?: string;
    chambre_particuliere?: string;
  };
  SOINS_COURANTS?: {
    consultation_generaliste_optam?: string;
  };
  DENTAIRE?: {
    soins_dentaires?: string;
    implantologie?: string;
    orthodontie?: string;
  };
  OPTIQUE?: {
    verres_complexes?: string;
  };
}

export interface Contract {
  insurer?: string;
  contract_name?: string;
  contract_type?: string;
  level_id?: string;
  level_name?: string;
  benefits?: ContractBenefits;
  source?: {
    pdf_name?: string;
    page_range?: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class ContractsService {
  private contracts: Contract[] = [];
  private contractsLoaded = false;
  private readonly FLASK_API_URL = 'http://127.0.0.1:5000/api/contracts';

  constructor(private http: HttpClient) {}


  /**
   * 📋 Charge les contrats depuis l'API Flask
   */
  loadContracts(): Observable<Contract[]> {
    if (this.contractsLoaded) {
      return of(this.contracts);
    }

    console.log('📋 Chargement des contrats depuis l\'API Flask');
    
    return this.http.get<Contract[]>(this.FLASK_API_URL).pipe(
      tap(contracts => {
        this.contracts = contracts;
        this.contractsLoaded = true;
        console.log(`✅ ${contracts.length} contrats chargés depuis l'API Flask`);
      }),
      catchError(error => {
        console.error('❌ Erreur lors du chargement depuis Flask:', error);
        console.log('🔄 Utilisation des contrats de fallback');
        
        this.contracts = this.getFallbackContracts();
        this.contractsLoaded = true;
        console.log(`✅ ${this.contracts.length} contrats de fallback chargés`);
        return of(this.contracts);
      })
    );
  }

  /**
   * 🎯 Nouvel algorithme de matching intelligent multi-niveaux
   */
  findContractByAssureurAndFormule(assureur: string, formule: string): Contract | undefined {
    console.log(`[MATCHING] Recherche pour assureur: "${assureur}", formule: "${formule}"`);

    const searchAssureurNorm = this.normalizeText(assureur, true);
    const insurerContracts = this.contracts.filter(c => this.normalizeText(c.insurer || '', true).includes(searchAssureurNorm));

    if (insurerContracts.length === 0) {
      console.log(`[MATCHING] ❌ Aucun contrat trouvé pour l'assureur normalisé: ${searchAssureurNorm}`);
      return undefined;
    }
    console.log(`[MATCHING] 📋 ${insurerContracts.length} contrats trouvés pour ${searchAssureurNorm}`);

    const searchFormuleNorm = this.normalizeText(formule);
    const searchLevel = this.extractLevel(searchFormuleNorm);
    const searchProductNorm = this.extractProductName(searchFormuleNorm);

    console.log(`[MATCHING] Recherche produit: "${searchProductNorm}", niveau: "${searchLevel}"`);

    // Niveau 1: Correspondance Parfaite (Produit + Niveau)
    let bestMatch = insurerContracts.find(c => 
        this.normalizeText(c.contract_name || '') === searchProductNorm &&
        this.extractLevel(this.normalizeText(c.level_name || '')) === searchLevel
    );
    if (bestMatch) {
        console.log(`[MATCHING] ✅ Niveau 1 (Match Parfait): ${bestMatch.contract_name} - ${bestMatch.level_name}`);
        return bestMatch;
    }

    // Niveau 2: Correspondance Produit Exact + Niveau Similaire (pour gérer les alias comme 'formule 1' vs 'niveau 1')
    bestMatch = insurerContracts.find(c => 
        this.normalizeText(c.contract_name || '') === searchProductNorm &&
        this.extractLevel(this.normalizeText(c.level_name || ''), true) === searchLevel
    );
    if (bestMatch) {
        console.log(`[MATCHING] ✅ Niveau 2 (Produit Exact + Niveau Similaire): ${bestMatch.contract_name} - ${bestMatch.level_name}`);
        return bestMatch;
    }

    // Niveau 3: Correspondance par Inclusion (le nom du produit de recherche inclut le nom du contrat ou vice-versa)
    let candidates = insurerContracts.filter(c => {
        const contractNameNorm = this.normalizeText(c.contract_name || '');
        return searchProductNorm.includes(contractNameNorm) || contractNameNorm.includes(searchProductNorm);
    });

    if (candidates.length > 0) {
        bestMatch = candidates.find(c => this.extractLevel(this.normalizeText(c.level_name || '')) === searchLevel);
        if (bestMatch) {
            console.log(`[MATCHING] ✅ Niveau 3 (Inclusion Produit + Niveau): ${bestMatch.contract_name} - ${bestMatch.level_name}`);
            return bestMatch;
        }
    }

    // Niveau 3.5: Correspondance par mots-clés communs (pour les noms de produits complexes)
    if (searchLevel > 0) {
        const searchWords = searchProductNorm.split(/\s+/).filter(w => w.length > 2);
        const scoredCandidates = insurerContracts.map(c => {
            const contractNameNorm = this.normalizeText(c.contract_name || '');
            const contractWords = contractNameNorm.split(/\s+/).filter(w => w.length > 2);
            const commonWords = searchWords.filter(w => contractWords.includes(w));
            const score = commonWords.length / Math.max(searchWords.length, contractWords.length);
            return { contract: c, score };
        }).filter(item => item.score > 0.4); // Au moins 40% de similarité

        if (scoredCandidates.length > 0) {
            // Trier par score décroissant
            scoredCandidates.sort((a, b) => b.score - a.score);
            
            // Chercher le meilleur match avec le bon niveau
            bestMatch = scoredCandidates.find(item => 
                this.extractLevel(this.normalizeText(item.contract.level_name || '')) === searchLevel
            )?.contract;
            
            if (bestMatch) {
                console.log(`[MATCHING] ✅ Niveau 3.5 (Mots-clés + Niveau): ${bestMatch.contract_name} - ${bestMatch.level_name}`);
                return bestMatch;
            }
        }
    }

    // Niveau 4: Fallback - Choisir le contrat le plus probable si aucun match de nom
    // On privilégie les niveaux moyens qui sont les plus courants
    const fallbackOrder = [4, 3, 5, 2, 1, 6, 7];
    for (const level of fallbackOrder) {
        bestMatch = insurerContracts.find(c => this.extractLevel(this.normalizeText(c.level_name || ''), true) === level);
        if (bestMatch) {
            console.log(`[MATCHING] 🔄 Niveau 4 (Fallback Intelligent): Sélection du niveau ${level}. Contrat: ${bestMatch.contract_name} - ${bestMatch.level_name}`);
            return bestMatch;
        }
    }
    
    // Ultime Fallback: retourner le premier contrat de la liste
    if (insurerContracts.length > 0) {
        console.log(`[MATCHING] 🚨 Niveau 5 (Fallback Final): Sélection du premier contrat disponible.`);
        return insurerContracts[0];
    }

    return undefined;
  }

  /**
   * Normalise le texte pour la comparaison: minuscule, sans accents, sans mots parasites.
   */
  private normalizeText(text: string, isAssureur = false): string {
    if (!text) return '';
    let normalized = text.toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Enlève les accents
      .replace(/<br>/g, ' ') // Enlève les <br>
      .replace(/\/|\*+/g, ' ') // Enlève les slashs et astérisques
      .replace(/'/g, ' '); // Enlève les apostrophes

    if (isAssureur) {
        // Mappings spécifiques pour assureurs - Normalisation complète
        const insurerMappings: { [key: string]: string } = {
            // AÉSIO et variantes
            'aesio mutuelle': 'aesio',
            'aesio': 'aesio',
            
            // Alptis et variantes
            'alptis assurances': 'alptis',
            'alptis': 'alptis',
            
            // Apivia et variantes
            'apivia mutuelle': 'apivia',
            'apivia': 'apivia',
            
            // April et variantes
            'april sante prevoyance': 'april',
            'april': 'april',
            
            // ASAF et variantes
            'asaf afps': 'asaf',
            'asaf': 'asaf',
            
            // AXA et variantes
            'axa': 'axa',
            
            // Entoria et variantes
            'entoria': 'entoria',
            
            // Generali et variantes
            'generali france': 'generali',
            'generali': 'generali',
            
            // Harmonie et variantes
            'harmonie mutuelle': 'harmonie',
            'harmonie': 'harmonie',
            
            // Henner et variantes
            'henner': 'henner',
            
            // Malakoff et variantes
            'malakoff humanis': 'malakoff',
            'malakoff': 'malakoff',
            
            // SPVIE et toutes ses variantes (Mutualia)
            'mutualia alliance sante': 'spvie',
            'mutualia': 'spvie',
            'spvie assurances': 'spvie',
            'spvie': 'spvie',
            
            // Solly Azar et variantes
            'solly azar': 'sollyazar',
            'sollyazar': 'sollyazar',
            'solly': 'sollyazar',
            
            // SwissLife et variantes
            'swiss life': 'swisslife',
            'swisslife': 'swisslife',
            
            // Utwin et variantes
            'utwin': 'utwin'
        };
        
        // Appliquer les mappings dans l'ordre (les plus spécifiques en premier)
        for (const key in insurerMappings) {
            if (normalized.includes(key)) {
                normalized = insurerMappings[key];
                break; // Arrêter après le premier match
            }
        }
    } else {
        // Mots parasites à enlever pour les formules
        // La liste de mots parasites est trop agressive. On la désactive pour le moment.
        // const stopWords = ['mutuelle', 'sante', 'tns', 'formule', 'niveau', 'pro', 'solutions', 'independants', 'complementaire'];
        // normalized = stopWords.reduce((acc, word) => acc.replace(new RegExp(`\\b${word}\\b`, 'g'), ''), normalized);
    }

    return normalized.replace(/\s+/g, ' ').trim();
  }

  /**
   * Extrait le niveau numérique d'une formule.
   */
  private extractLevel(text: string, acceptAnyDigit = false): number {
    const cleanedText = this.normalizeText(text);
    // Mappings textuels vers numériques (PRIORITÉ 1)
    const levelMap: { [key: string]: number } = {
        'serenite': 6, 'liberte': 7, 'flexibilite': 4, 'agilite': 3, 'securite': 2, 'tranquillite': 1, 'confort': 5, // ASAF MCCI
        'essentiel 1': 1, 'essentiel 2': 2, 'essentiel 3': 3, // ASAF Osalys
        'un': 1, 'deux': 2, 'trois': 3, 'quatre': 4, 'cinq': 5, 'six': 6, 'sept': 7, 'huit': 8, 'neuf': 9
    };
    for (const key in levelMap) {
        if (cleanedText.includes(key)) {
            return levelMap[key];
        }
    }

    // Recherche de chiffres (PRIORITÉ 2)
    const match = cleanedText.match(/(\d+)/);
    if (match) {
      return parseInt(match[1], 10);
    }
    if (acceptAnyDigit) {
        const anyDigitMatch = text.match(/(\d)/);
        if (anyDigitMatch) return parseInt(anyDigitMatch[1], 10);
    }
    return 0; // Retourne 0 si aucun niveau n'est trouvé
  }

  /**
   * Extrait le nom normalisé du produit.
   */
  private extractProductName(text: string): string {
    return this.normalizeText(text).replace(/\d+/g, '').trim();
  }

  /**
   * Trouve tous les contrats d'un assureur
   */
  findContractsByAssureur(assureur: string): Contract[] {
    return this.contracts.filter(contract => 
      contract.insurer?.toLowerCase().includes(assureur.toLowerCase()) ||
      assureur.toLowerCase().includes(contract.insurer?.toLowerCase() || '')
    );
  }

  /**
   * Affiche un résumé des contrats disponibles
   */
  getContractsSummary(): void {
    console.log('📊 RÉSUMÉ DES CONTRATS DISPONIBLES');
    console.log('================================');
    
    const insurers = [...new Set(this.contracts.map(c => c.insurer).filter(name => name))];
    
    for (const insurer of insurers) {
      const contracts = this.contracts.filter(c => c.insurer === insurer);
      console.log(`\n🏢 ${insurer} (${contracts.length} contrats):`);
      
      const products = [...new Set(contracts.map(c => c.contract_name))];
      for (const product of products) {
        const productContracts = contracts.filter(c => c.contract_name === product);
        const levels = productContracts.map(c => c.level_name).join(', ');
        console.log(`  📋 ${product}: ${levels}`);
      }
    }
  }

  /**
   * Contrats de fallback étendus en cas d'erreur
   */
  private getFallbackContracts(): Contract[] {
    return [
      // Apivia
      {
        insurer: "Apivia",
        contract_name: "Vitamin3 Pro",
        level_name: "Niveau 4",
        benefits: {
          HOSPITALISATION: { honoraires_chirurgien_optam: "250%", chambre_particuliere: "80 €/jour" },
          SOINS_COURANTS: { consultation_generaliste_optam: "275%" },
          DENTAIRE: { soins_dentaires: "150%", implantologie: "400 €", orthodontie: "275%" },
          OPTIQUE: { verres_complexes: "350 €" }
        }
      },
      // ASAF
      {
        insurer: "ASAF",
        contract_name: "MCCI Proévidence 2",
        level_name: "Agilité",
        benefits: {
          HOSPITALISATION: { honoraires_chirurgien_optam: "175%", chambre_particuliere: "60 €" },
          SOINS_COURANTS: { consultation_generaliste_optam: "150%" },
          DENTAIRE: { soins_dentaires: "225%", implantologie: "200 €", orthodontie: "200%" },
          OPTIQUE: { verres_complexes: "320 €" }
        }
      },
      // Henner
      {
        insurer: "Henner",
        contract_name: "TNS+ Santé",
        level_name: "Niveau 3",
        benefits: {
          HOSPITALISATION: { honoraires_chirurgien_optam: "400%", chambre_particuliere: "120 €/jour" },
          SOINS_COURANTS: { consultation_generaliste_optam: "400%" },
          DENTAIRE: { soins_dentaires: "400%", implantologie: "550 €", orthodontie: "450 €" },
          OPTIQUE: { verres_complexes: "700 €" }
        }
      },
      {
        insurer: "Henner",
        contract_name: "Solutions Indépendants Santé",
        level_name: "Niveau 5",
        benefits: {
          HOSPITALISATION: { honoraires_chirurgien_optam: "350%", chambre_particuliere: "100 €/jour" },
          SOINS_COURANTS: { consultation_generaliste_optam: "350%" },
          DENTAIRE: { soins_dentaires: "350%", implantologie: "500 €", orthodontie: "400%" },
          OPTIQUE: { verres_complexes: "650 €" }
        }
      },
      // Alptis
      {
        insurer: "Alptis",
        contract_name: "Santé Pro+",
        level_name: "Niveau 4",
        benefits: {
          HOSPITALISATION: { honoraires_chirurgien_optam: "500%", chambre_particuliere: "120 €/jour" },
          SOINS_COURANTS: { consultation_generaliste_optam: "400%" },
          DENTAIRE: { soins_dentaires: "500%", implantologie: "1000 €", orthodontie: "450 €" },
          OPTIQUE: { verres_complexes: "700 €" }
        }
      },
      // April
      {
        insurer: "APRIL",
        contract_name: "Santé Mix Proximité",
        level_name: "Niveau 4",
        benefits: {
          HOSPITALISATION: { honoraires_chirurgien_optam: "300%", chambre_particuliere: "90 €/jour" },
          SOINS_COURANTS: { consultation_generaliste_optam: "300%" },
          DENTAIRE: { soins_dentaires: "300%", implantologie: "450 €", orthodontie: "300%" },
          OPTIQUE: { verres_complexes: "400 €" }
        }
      },
      // SwissLife
      {
        insurer: "SwissLife",
        contract_name: "Santé Madelin",
        level_name: "Niveau 8",
        benefits: {
          HOSPITALISATION: { honoraires_chirurgien_optam: "400%", chambre_particuliere: "150 €/jour" },
          SOINS_COURANTS: { consultation_generaliste_optam: "400%" },
          DENTAIRE: { soins_dentaires: "400%", implantologie: "800 €", orthodontie: "500%" },
          OPTIQUE: { verres_complexes: "800 €" }
        }
      },
      // Solly Azar
      {
        insurer: "Solly Azar",
        contract_name: "Complémentaire Santé TNS",
        level_name: "Formule 5",
        benefits: {
          HOSPITALISATION: { honoraires_chirurgien_optam: "350%", chambre_particuliere: "100 €/jour" },
          SOINS_COURANTS: { consultation_generaliste_optam: "350%" },
          DENTAIRE: { soins_dentaires: "350%", implantologie: "600 €", orthodontie: "400%" },
          OPTIQUE: { verres_complexes: "500 €" }
        }
      },
      // Entoria
      {
        insurer: "Entoria",
        contract_name: "Sécurité Pro",
        level_name: "Complémentaire santé",
        benefits: {
          HOSPITALISATION: { honoraires_chirurgien_optam: "300%", chambre_particuliere: "80 €/jour" },
          SOINS_COURANTS: { consultation_generaliste_optam: "300%" },
          DENTAIRE: { soins_dentaires: "300%", implantologie: "400 €", orthodontie: "350%" },
          OPTIQUE: { verres_complexes: "450 €" }
        }
      },
      // Utwin
      {
        insurer: "Utwin",
        contract_name: "MULTI' Santé",
        level_name: "Niveau 6",
        benefits: {
          HOSPITALISATION: { honoraires_chirurgien_optam: "400%", chambre_particuliere: "120 €/jour" },
          SOINS_COURANTS: { consultation_generaliste_optam: "400%" },
          DENTAIRE: { soins_dentaires: "400%", implantologie: "700 €", orthodontie: "450%" },
          OPTIQUE: { verres_complexes: "600 €" }
        }
      },
      // Harmonie
      {
        insurer: "Harmonie",
        contract_name: "Perform' Santé TNS",
        level_name: "Formule 3",
        benefits: {
          HOSPITALISATION: { honoraires_chirurgien_optam: "300%", chambre_particuliere: "80 €/jour" },
          SOINS_COURANTS: { consultation_generaliste_optam: "300%" },
          DENTAIRE: { soins_dentaires: "300%", implantologie: "400 €", orthodontie: "300%" },
          OPTIQUE: { verres_complexes: "200 €" }
        }
      },
      // Malakoff
      {
        insurer: "Malakoff",
        contract_name: "ATOUT+ TNS",
        level_name: "Formule 3",
        benefits: {
          HOSPITALISATION: { honoraires_chirurgien_optam: "300%", chambre_particuliere: "80 €/jour" },
          SOINS_COURANTS: { consultation_generaliste_optam: "300%" },
          DENTAIRE: { soins_dentaires: "250%", implantologie: "1000 €", orthodontie: "400%" },
          OPTIQUE: { verres_complexes: "220 €" }
        }
      },
      // AÉSIO
      {
        insurer: "AÉSIO",
        contract_name: "TNS Pro",
        level_name: "Niveau 4",
        benefits: {
          HOSPITALISATION: { honoraires_chirurgien_optam: "300%", chambre_particuliere: "100 €/jour" },
          SOINS_COURANTS: { consultation_generaliste_optam: "300%" },
          DENTAIRE: { soins_dentaires: "200%", implantologie: "600 €", orthodontie: "300%" },
          OPTIQUE: { verres_complexes: "500 €" }
        }
      }
    ];
  }
}
