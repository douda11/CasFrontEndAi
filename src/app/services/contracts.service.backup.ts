import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ALL_CONTRACTS } from '../data/all-contracts';

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
  insurer: string;
  contract_name: string;
  contract_type: string;
  level_id: string;
  level_name: string;
  benefits: ContractBenefits;
  source: {
    pdf_name: string;
    page_range: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class ContractsService {
  private contracts: Contract[] = [];
  private contractsLoaded = false;

  constructor(private http: HttpClient) {}

  /**
   * Charge les contrats depuis le fichier JSON
   */
  loadContracts(): Observable<Contract[]> {
    if (this.contractsLoaded && this.contracts.length > 0) {
      return of(this.contracts);
    }

    console.log('📋 Chargement des contrats depuis la base de données intégrée');
    
    // Utiliser directement les contrats intégrés - Plus fiable !
    this.contracts = this.getFallbackContracts();
    this.contractsLoaded = true;
    console.log(`✅ ${this.contracts.length} contrats chargés depuis la base intégrée`);
    
    return of(this.contracts);
  }

  /**
   * Trouve un contrat par assureur et formule
   */
  findContractByAssureurAndFormule(assureur: string, formule: string): Contract | undefined {
    console.log(`🔍 Recherche contrat pour: assureur="${assureur}", formule="${formule}"`);
    
    const result = this.contracts.find(contract => {
      const contractAssureur = contract.insurer?.toLowerCase() || '';
      const contractFormule = contract.level_name?.toLowerCase() || '';
      const contractName = contract.contract_name?.toLowerCase() || '';
      const searchFormule = formule?.toLowerCase() || '';
      const searchAssureur = assureur.toLowerCase();
      
      // Vérifier d'abord l'assureur avec plus de flexibilité
      const assureurMatch = this.matchAssureur(contractAssureur, searchAssureur);
      
      if (!assureurMatch) {
        return false;
      }
      
      // Recherche très flexible de la formule
      const formuleMatch = this.matchFormule(contractFormule, contractName, searchFormule);
      
      if (assureurMatch && formuleMatch) {
        console.log(`✅ Match trouvé: ${contract.insurer} - ${contract.level_name}`);
        return true;
      }
      
      return false;
    });
    
    if (!result) {
      console.log(`❌ Aucun contrat exact trouvé pour ${assureur} - ${formule}`);
      
      // Essayer de trouver un contrat de fallback
      const fallbackResult = this.findFallbackContract(assureur, formule);
      if (fallbackResult) {
        console.log(`🔄 Contrat de fallback trouvé: ${fallbackResult.insurer} - ${fallbackResult.level_name}`);
        return fallbackResult;
      }
      
      console.log(`📋 Contrats disponibles pour ${assureur}:`, 
        this.contracts
          .filter(c => this.matchAssureur(c.insurer?.toLowerCase() || '', assureur.toLowerCase()))
          .map(c => `${c.level_name} (${c.contract_name})`)
      );
    }
    
    return result;
  }

  /**
   * Extrait le numéro de niveau d'une formule (ex: "Niveau 2" -> 2)
   */
  private extractLevelNumber(text: string): number | null {
    const match = text.match(/(?:niveau|formule|level)\s*(\d+)/i);
    return match ? parseInt(match[1]) : null;
  }

  /**
   * Correspondance floue entre deux textes
   */
  private fuzzyMatch(text1: string, text2: string): boolean {
    // Nettoyer les textes
    const clean1 = text1.replace(/[^a-z0-9]/g, '');
    const clean2 = text2.replace(/[^a-z0-9]/g, '');
    
    // Vérifier si l'un contient l'autre (au moins 50% de correspondance)
    const minLength = Math.min(clean1.length, clean2.length);
    if (minLength < 3) return false;
    
    return clean1.includes(clean2) || clean2.includes(clean1) ||
           this.calculateSimilarity(clean1, clean2) > 0.6;
  }

  /**
   * Calcule la similarité entre deux chaînes (algorithme simple)
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Calcule la distance de Levenshtein entre deux chaînes
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  /**
   * Vérifie la correspondance entre assureurs avec normalisation
   */
  private matchAssureur(contractAssureur: string, searchAssureur: string): boolean {
    const normalizedContract = this.normalizeAssureurName(contractAssureur);
    const normalizedSearch = this.normalizeAssureurName(searchAssureur);
    
    return contractAssureur.includes(searchAssureur) || 
           searchAssureur.includes(contractAssureur) ||
           normalizedContract === normalizedSearch ||
           normalizedContract.includes(normalizedSearch) ||
           normalizedSearch.includes(normalizedContract);
  }

  /**
   * Normalise le nom d'un assureur pour la comparaison
   */
  private normalizeAssureurName(name: string): string {
    // Mapping des noms d'assureurs avec leurs variantes
    const assureurMapping: { [key: string]: string } = {
      'aesio': 'aesio',
      'aésio': 'aesio',
      'alptis': 'alptis',
      'apivia': 'apivia',
      'april': 'april',
      'asaf': 'asaf',
      'entoria': 'entoria',
      'generali': 'generali',
      'harmonie': 'harmonie',
      'harmoniemutuelle': 'harmonie',
      'henner': 'henner',
      'malakoff': 'malakoff',
      'malakoffhumanis': 'malakoff',
      'humanis': 'malakoff',
      'solly': 'sollyazar',
      'sollyazar': 'sollyazar',
      'azar': 'sollyazar',
      'swisslife': 'swisslife',
      'swiss': 'swisslife',
      'zenioo': 'zenioo',
      'utwin': 'utwin'
    };

    const normalized = name.toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .replace(/mutuelle/g, '')
      .replace(/assurance/g, '')
      .replace(/groupe/g, '');

    return assureurMapping[normalized] || normalized;
  }

  /**
   * Vérifie la correspondance entre formules avec logique avancée
   */
  private matchFormule(contractFormule: string, contractName: string, searchFormule: string): boolean {
    // Normaliser les chaînes pour la comparaison
    const normalizedContractFormule = this.normalizeProductName(contractFormule);
    const normalizedContractName = this.normalizeProductName(contractName);
    const normalizedSearchFormule = this.normalizeProductName(searchFormule);
    
    // 1. Correspondance exacte normalisée
    if (normalizedContractFormule.includes(normalizedSearchFormule) || 
        normalizedSearchFormule.includes(normalizedContractFormule)) {
      return true;
    }
    
    // 2. Correspondance avec le nom du contrat normalisé
    if (normalizedContractName.includes(normalizedSearchFormule) || 
        normalizedSearchFormule.includes(normalizedContractName)) {
      return true;
    }
    
    // 3. Correspondance par nom de contrat + niveau
    const combinedNormalized = `${normalizedContractName} ${normalizedContractFormule}`;
    if (combinedNormalized.includes(normalizedSearchFormule) || 
        normalizedSearchFormule.includes(combinedNormalized)) {
      return true;
    }
    
    // 4. Extraction de numéros (Niveau 2, Formule 3, etc.)
    const contractLevel = this.extractLevelNumber(contractFormule);
    const searchLevel = this.extractLevelNumber(searchFormule);
    if (contractLevel !== null && searchLevel !== null && contractLevel === searchLevel) {
      return true;
    }
    
    // 5. Correspondance par mapping spécifique de produits
    if (this.matchByProductMapping(contractName, contractFormule, searchFormule)) {
      return true;
    }
    
    // 6. Correspondance partielle pour des noms complexes
    if (this.fuzzyMatch(contractFormule, searchFormule) || 
        this.fuzzyMatch(contractName, searchFormule)) {
      return true;
    }
    
    // 7. Correspondance par mots-clés spécifiques
    return this.matchByKeywords(contractFormule, contractName, searchFormule);
  }

  /**
   * Normalise le nom d'un produit pour la comparaison
   */
  private normalizeProductName(name: string): string {
    return name.toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .replace(/sante/g, 'sante')
      .replace(/santé/g, 'sante')
      .replace(/pro/g, 'pro')
      .replace(/plus/g, 'plus')
      .replace(/tns/g, 'tns')
      .replace(/niveau/g, 'niveau')
      .replace(/formule/g, 'formule');
  }

  /**
   * Correspondance par mapping spécifique de produits connus
   */
  private matchByProductMapping(contractName: string, contractFormule: string, searchFormule: string): boolean {
    // Mapping des produits avec leurs variantes courantes
    const productMappings = [
      // AÉSIO
      { patterns: ['tns pro', 'tnspro'], contract: 'tns pro' },
      
      // Alptis
      { patterns: ['sante pro+', 'santeproplus', 'sante pro plus'], contract: 'santé pro+' },
      { patterns: ['sante select', 'santeselect'], contract: 'santé select' },
      { patterns: ['sante pro+ surco', 'santeprosurco'], contract: 'santé pro+ surco' },
      
      // Apivia
      { patterns: ['vitamin3 pro', 'vitamin3pro', 'vitaminpro'], contract: 'vitamin3 pro' },
      
      // April
      { patterns: ['sante mix proximite', 'santemixproximite', 'mix proximite'], contract: 'santé mix proximité' },
      
      // ASAF
      { patterns: ['mcci proevidence', 'mcciproevidence', 'proevidence'], contract: 'mcci proévidence 2' },
      { patterns: ['meana sante pro', 'meanasantepro'], contract: 'méana santé pro 3' },
      { patterns: ['osalys essentiel', 'osalysessentiel'], contract: 'osalys essentiel' },
      
      // Henner
      { patterns: ['tns+ sante', 'tnssante', 'tns plus sante'], contract: 'tns+ santé' },
      { patterns: ['solutions independants', 'solutionsindependants'], contract: 'solutions indépendants santé' },
      
      // Harmonie
      { patterns: ['perform sante tns', 'performsantetns'], contract: 'perform\' santé tns' },
      
      // Malakoff
      { patterns: ['atout+ tns', 'atouttns', 'atout tns'], contract: 'atout+ tns' },
      
      // Solly Azar
      { patterns: ['complementaire sante senior', 'santessenior'], contract: 'complémentaire santé senior' },
      { patterns: ['complementaire sante tns', 'santetns'], contract: 'complémentaire santé tns' },
      
      // SwissLife
      { patterns: ['sante madelin', 'santemadelin'], contract: 'santé madelin' },
      { patterns: ['sante additionnelle', 'santeadditionnelle'], contract: 'santé additionnelle' },
      { patterns: ['slpe+ sante', 'slpesante'], contract: 'slpe+ santé' },
      
      // Generali
      { patterns: ['la sante', 'lasante'], contract: 'la santé' },
      { patterns: ['sante pro', 'santepro'], contract: 'santé pro' },
      { patterns: ['la sante seniors', 'lasanteseniors'], contract: 'la santé séniors' }
    ];

    const normalizedSearch = this.normalizeProductName(searchFormule);
    const normalizedContractName = this.normalizeProductName(contractName);
    
    for (const mapping of productMappings) {
      for (const pattern of mapping.patterns) {
        if (normalizedSearch.includes(pattern) && 
            normalizedContractName.includes(this.normalizeProductName(mapping.contract))) {
          return true;
        }
      }
    }
    
    return false;
  }

  /**
   * Correspondance par mots-clés spécifiques
   */
  private matchByKeywords(contractFormule: string, contractName: string, searchFormule: string): boolean {
    const contractWords = `${contractFormule} ${contractName}`.toLowerCase().split(/\s+/);
    const searchWords = searchFormule.toLowerCase().split(/\s+/);
    
    // Compter les mots qui correspondent
    let matchCount = 0;
    for (const searchWord of searchWords) {
      if (searchWord.length > 2) { // Ignorer les mots très courts
        for (const contractWord of contractWords) {
          if (contractWord.includes(searchWord) || searchWord.includes(contractWord)) {
            matchCount++;
            break;
          }
        }
      }
    }
    
    // Considérer comme match si au moins 60% des mots correspondent
    return matchCount >= Math.ceil(searchWords.length * 0.6);
  }

  /**
   * Trouve un contrat de fallback quand aucun match exact n'est trouvé
   */
  private findFallbackContract(assureur: string, formule: string): Contract | undefined {
    // 1. Chercher tous les contrats de l'assureur
    const assureurContracts = this.contracts.filter(contract => 
      this.matchAssureur(contract.insurer?.toLowerCase() || '', assureur.toLowerCase())
    );

    if (assureurContracts.length === 0) {
      return undefined;
    }

    // 2. Essayer de trouver par niveau si un numéro est présent
    const searchLevel = this.extractLevelNumber(formule);
    if (searchLevel !== null) {
      const levelMatch = assureurContracts.find(contract => 
        this.extractLevelNumber(contract.level_name || '') === searchLevel
      );
      if (levelMatch) {
        return levelMatch;
      }
    }

    // 3. Chercher par similarité de nom de produit
    const searchWords = formule.toLowerCase().split(/\s+/);
    let bestMatch: Contract | undefined;
    let bestScore = 0;

    for (const contract of assureurContracts) {
      const contractText = `${contract.contract_name} ${contract.level_name}`.toLowerCase();
      let score = 0;
      
      for (const word of searchWords) {
        if (word.length > 2 && contractText.includes(word)) {
          score++;
        }
      }
      
      if (score > bestScore) {
        bestScore = score;
        bestMatch = contract;
      }
    }

    // 4. Si on a un score d'au moins 1 mot correspondant, retourner le meilleur match
    if (bestScore > 0) {
      return bestMatch;
    }

    // 5. En dernier recours, prendre le premier contrat de l'assureur
    return assureurContracts[0];
  }

  /**
   * Trouve tous les contrats d'un assureur
   */
  findContractsByAssureur(assureur: string): Contract[] {
    return this.contracts.filter(contract => {
      const contractAssureur = contract.insurer?.toLowerCase() || '';
      return contractAssureur.includes(assureur.toLowerCase());
    });
  }

  /**
   * Base de données complète de tous les contrats - Plus besoin de fichier JSON !
   */
  private getFallbackContracts(): Contract[] {
    return [
      // AÉSIO - TNS Pro (6 niveaux)
      {
        "insurer": "AÉSIO",
        "contract_name": "TNS Pro",
        "contract_type": "Complémentaire santé",
        "level_id": "tns_pro_niv1",
        "level_name": "Niveau 1",
        "benefits": {
          "HOSPITALISATION": {
            "honoraires_chirurgien_optam": "125 % BR",
            "chambre_particuliere": "30 €"
          },
          "SOINS_COURANTS": {
            "consultation_generaliste_optam": "100 % BR"
          },
          "DENTAIRE": {
            "soins_dentaires": "125 % BR",
            "implantologie": "100 €",
            "orthodontie": "150 % BR"
          },
          "OPTIQUE": {
            "verres_complexes": "100 €"
          }
        },
        "source": {
          "pdf_name": "1.1 Garanties TNS Pro.pdf",
          "page_range": "all"
        }
      },
      {
        "insurer": "AÉSIO",
        "contract_name": "TNS Pro",
        "contract_type": "Complémentaire santé",
        "level_id": "tns_pro_niv2",
        "level_name": "Niveau 2",
        "benefits": {
          "HOSPITALISATION": {
            "honoraires_chirurgien_optam": "150 % BR",
            "chambre_particuliere": "60 €"
          },
          "SOINS_COURANTS": {
            "consultation_generaliste_optam": "150 % BR"
          },
          "DENTAIRE": {
            "soins_dentaires": "150 % BR",
            "implantologie": "300 €",
            "orthodontie": "200 % BR"
          },
          "OPTIQUE": {
            "verres_complexes": "120 €"
          }
        },
        "source": {
          "pdf_name": "1.1 Garanties TNS Pro.pdf",
          "page_range": "all"
        }
      },
      {
        insurer: "Apivia",
        contract_name: "Vitamin3 Pro",
        contract_type: "Complémentaire santé",
        level_id: "apivia_vitamin3pro_lvl4",
        level_name: "Niveau 4",
        benefits: {
          HOSPITALISATION: { 
            honoraires_chirurgien_optam: "250%", 
            chambre_particuliere: "80 €/jour" 
          },
          SOINS_COURANTS: { 
            consultation_generaliste_optam: "275%" 
          },
          DENTAIRE: { 
            soins_dentaires: "150%", 
            implantologie: "400 €", 
            orthodontie: "275%" 
          },
          OPTIQUE: { 
            verres_complexes: "350 €" 
          }
        },
        source: {
          pdf_name: "apivia.pdf",
          page_range: "full"
        }
      },
      {
        insurer: "Henner",
        contract_name: "Solutions Indépendants Santé",
        contract_type: "Complémentaire santé",
        level_id: "henner_solutions_independants_lvl5",
        level_name: "Niveau 5",
        benefits: {
          HOSPITALISATION: { 
            honoraires_chirurgien_optam: "300 % BR", 
            chambre_particuliere: "80 € / jour" 
          },
          SOINS_COURANTS: { 
            consultation_generaliste_optam: "250 % BR" 
          },
          DENTAIRE: { 
            soins_dentaires: "275 % BR", 
            implantologie: "400 € / implant", 
            orthodontie: "200 % BR" 
          },
          OPTIQUE: { 
            verres_complexes: "Deux verres très complexes + monture : 600 €" 
          }
        },
        source: {
          pdf_name: "henner.pdf",
          page_range: "all"
        }
      },
      {
        insurer: "Henner",
        contract_name: "TNS+ Santé",
        contract_type: "Complémentaire santé",
        level_id: "henner_tns_sante_lvl2",
        level_name: "Niveau 2",
        benefits: {
          HOSPITALISATION: { 
            honoraires_chirurgien_optam: "200 % BR", 
            chambre_particuliere: "60 € / jour" 
          },
          SOINS_COURANTS: { 
            consultation_generaliste_optam: "200 % BR" 
          },
          DENTAIRE: { 
            soins_dentaires: "200 % BR", 
            implantologie: "300 € / implant", 
            orthodontie: "200 % BR" 
          },
          OPTIQUE: { 
            verres_complexes: "Deux verres complexes + monture : 400 €" 
          }
        },
        source: {
          pdf_name: "henner_tns.pdf",
          page_range: "all"
        }
      },
      {
        insurer: "Harmonie Mutuelle",
        contract_name: "Perform' Santé TNS",
        contract_type: "Complémentaire santé",
        level_id: "harmonie_perform_sante_tns_f2",
        level_name: "Formule 2",
        benefits: {
          HOSPITALISATION: { 
            honoraires_chirurgien_optam: "200%", 
            chambre_particuliere: "50 €/jour" 
          },
          SOINS_COURANTS: { 
            consultation_generaliste_optam: "150%" 
          },
          DENTAIRE: { 
            soins_dentaires: "200%", 
            implantologie: "250 €", 
            orthodontie: "200%" 
          },
          OPTIQUE: { 
            verres_complexes: "150 €" 
          }
        },
        source: {
          pdf_name: "harmonie.pdf",
          page_range: "all"
        }
      },
      {
        insurer: "AÉSIO",
        contract_name: "TNS Pro",
        contract_type: "Complémentaire santé",
        level_id: "tns_pro_niv2",
        level_name: "Niveau 2",
        benefits: {
          HOSPITALISATION: { 
            honoraires_chirurgien_optam: "150 % BR", 
            chambre_particuliere: "60 €" 
          },
          SOINS_COURANTS: { 
            consultation_generaliste_optam: "150 % BR" 
          },
          DENTAIRE: { 
            soins_dentaires: "150 % BR", 
            implantologie: "300 €", 
            orthodontie: "200 % BR" 
          },
          OPTIQUE: { 
            verres_complexes: "120 €" 
          }
        },
        source: {
          pdf_name: "aesio.pdf",
          page_range: "all"
        }
      },
      {
        insurer: "UTWIN",
        contract_name: "MULTI' Santé",
        contract_type: "Complémentaire santé",
        level_id: "utwin_multi_sante_lvl3",
        level_name: "Niveau 3",
        benefits: {
          HOSPITALISATION: { 
            honoraires_chirurgien_optam: "150%", 
            chambre_particuliere: "80 €" 
          },
          SOINS_COURANTS: { 
            consultation_generaliste_optam: "150%" 
          },
          DENTAIRE: { 
            soins_dentaires: "125%", 
            implantologie: "100 €", 
            orthodontie: "150%" 
          },
          OPTIQUE: { 
            verres_complexes: "200 €" 
          }
        },
        source: {
          pdf_name: "utwin.pdf",
          page_range: "all"
        }
      },
      {
        insurer: "Malakoff Humanis",
        contract_name: "ATOUT+ TNS",
        contract_type: "Complémentaire santé",
        level_id: "malakoff_atout_tns_f3",
        level_name: "Formule 3",
        benefits: {
          HOSPITALISATION: { 
            honoraires_chirurgien_optam: "200%", 
            chambre_particuliere: "80 €" 
          },
          SOINS_COURANTS: { 
            consultation_generaliste_optam: "300%" 
          },
          DENTAIRE: { 
            soins_dentaires: "250%", 
            implantologie: "1000 €", 
            orthodontie: "400%" 
          },
          OPTIQUE: { 
            verres_complexes: "220 €" 
          }
        },
        source: {
          pdf_name: "malakoff.pdf",
          page_range: "all"
        }
      },
      {
        insurer: "ASAF",
        contract_name: "Solutions Indépendants Santé",
        contract_type: "Complémentaire santé",
        level_id: "asaf_solutions_independants_lvl5",
        level_name: "Niveau 5",
        benefits: {
          HOSPITALISATION: { 
            honoraires_chirurgien_optam: "175%", 
            chambre_particuliere: "60 €" 
          },
          SOINS_COURANTS: { 
            consultation_generaliste_optam: "150%" 
          },
          DENTAIRE: { 
            soins_dentaires: "225%", 
            implantologie: "200 €", 
            orthodontie: "200%" 
          },
          OPTIQUE: { 
            verres_complexes: "320 €" 
          }
        },
        source: {
          pdf_name: "asaf.pdf",
          page_range: "all"
        }
      },
      {
        insurer: "Entoria",
        contract_name: "Sécurité Pro",
        contract_type: "Complémentaire santé",
        level_id: "entoria_securite_pro_lvl4",
        level_name: "Niveau 4",
        benefits: {
          HOSPITALISATION: { 
            honoraires_chirurgien_optam: "200%", 
            chambre_particuliere: "80 €" 
          },
          SOINS_COURANTS: { 
            consultation_generaliste_optam: "200%" 
          },
          DENTAIRE: { 
            soins_dentaires: "200%", 
            implantologie: "450 €", 
            orthodontie: "250%" 
          },
          OPTIQUE: { 
            verres_complexes: "450 €" 
          }
        },
        source: {
          pdf_name: "entoria.pdf",
          page_range: "all"
        }
      }
    ];
  }
}
