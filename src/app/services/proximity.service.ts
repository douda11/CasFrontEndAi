import { Injectable } from '@angular/core';
import { calculateProximity, ProximityResult } from '../utils/proximity-calculator';

@Injectable({
  providedIn: 'root'
})
export class ProximityService {

  constructor() { }

  /**
   * Calcule la classe CSS pour une cellule du tableau de comparaison
   * @param userNeed - Besoin de l'utilisateur
   * @param contractValue - Valeur du contrat
   * @returns Classe CSS à appliquer
   */
  getCellClass(userNeed: string | number, contractValue: string | number): string {
    const proximity = calculateProximity(userNeed, contractValue);
    return proximity.cssClass;
  }

  /**
   * Obtient les informations complètes de proximité
   * @param userNeed - Besoin de l'utilisateur
   * @param contractValue - Valeur du contrat
   * @returns Objet ProximityResult complet
   */
  getProximityInfo(userNeed: string | number, contractValue: string | number): ProximityResult {
    return calculateProximity(userNeed, contractValue);
  }

  /**
   * Calcule le score global d'un contrat
   * @param userNeeds - Objet contenant tous les besoins utilisateur
   * @param contractBenefits - Objet contenant toutes les garanties du contrat
   * @returns Score global en pourcentage (0-100)
   */
  calculateContractScore(userNeeds: any, contractBenefits: any): number {
    let totalScore = 0;
    let guaranteeCount = 0;

    // Mapping des garanties pour faire correspondre les noms
    const guaranteeMapping = {
      'hospitalisation': ['honoraires_chirurgien_optam', 'hospitalisation'],
      'honoraires': ['honoraires_chirurgien_optam', 'consultation_generaliste_optam'],
      'orthodontie': ['orthodontie'],
      'forfaitOptique': ['verres_complexes', 'forfait_optique'],
      'forfaitDentaire': ['implantologie', 'forfait_dentaire'],
      'dentaire': ['soins_dentaires', 'dentaire'],
      'chambreParticuliere': ['chambre_particuliere', 'chambre']
    };

    Object.keys(userNeeds).forEach(userNeedKey => {
      const userNeedValue = userNeeds[userNeedKey];
      
      // Chercher la garantie correspondante dans le contrat
      const possibleKeys = guaranteeMapping[userNeedKey as keyof typeof guaranteeMapping] || [userNeedKey];
      
      for (const category of Object.keys(contractBenefits)) {
        for (const guarantee of Object.keys(contractBenefits[category])) {
          if (possibleKeys.some(key => guarantee.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(guarantee.toLowerCase()))) {
            const contractValue = contractBenefits[category][guarantee];
            const proximity = calculateProximity(userNeedValue, contractValue);
            totalScore += proximity.proximityScore;
            guaranteeCount++;
            break;
          }
        }
      }
    });

    return guaranteeCount > 0 ? Math.round(totalScore / guaranteeCount) : 0;
  }

  /**
   * Applique les couleurs de proximité à un tableau de contrats
   * @param userNeeds - Besoins de l'utilisateur
   * @param contracts - Array des contrats
   * @returns Contrats avec informations de proximité ajoutées
   */
  applyProximityColors(userNeeds: any, contracts: any[]): any[] {
    return contracts.map(contract => {
      const enhancedContract = { ...contract };
      
      // Calculer le score global
      enhancedContract.globalScore = this.calculateContractScore(userNeeds, contract.benefits);
      
      // Déterminer la classe CSS globale
      enhancedContract.globalCssClass = this.getGlobalCssClass(enhancedContract.globalScore);
      
      // Ajouter les informations de proximité pour chaque garantie
      enhancedContract.proximityDetails = {};
      
      if (contract.benefits) {
        Object.keys(contract.benefits).forEach(category => {
          enhancedContract.proximityDetails[category] = {};
          
          Object.keys(contract.benefits[category]).forEach(guarantee => {
            const userNeed = this.findMatchingUserNeed(userNeeds, guarantee);
            const contractValue = contract.benefits[category][guarantee];
            
            enhancedContract.proximityDetails[category][guarantee] = 
              this.getProximityInfo(userNeed || 0, contractValue);
          });
        });
      }
      
      return enhancedContract;
    });
  }

  /**
   * Trouve le besoin utilisateur correspondant à une garantie
   * @param userNeeds - Besoins utilisateur
   * @param guarantee - Nom de la garantie
   * @returns Valeur du besoin ou null
   */
  private findMatchingUserNeed(userNeeds: any, guarantee: string): string | number | null {
    const guaranteeMapping: { [key: string]: string } = {
      'honoraires_chirurgien_optam': 'honoraires',
      'consultation_generaliste_optam': 'honoraires',
      'chambre_particuliere': 'chambreParticuliere',
      'soins_dentaires': 'dentaire',
      'verres_complexes': 'forfaitOptique',
      'implantologie': 'forfaitDentaire',
      'orthodontie': 'orthodontie'
    };

    // Chercher avec le mapping
    const mappedKey = guaranteeMapping[guarantee];
    if (mappedKey && userNeeds[mappedKey]) {
      return userNeeds[mappedKey];
    }

    // Chercher par nom direct
    if (userNeeds[guarantee]) {
      return userNeeds[guarantee];
    }

    // Chercher par similarité
    const lowerGuarantee = guarantee.toLowerCase();
    for (const key of Object.keys(userNeeds)) {
      if (lowerGuarantee.includes(key.toLowerCase()) || key.toLowerCase().includes(lowerGuarantee)) {
        return userNeeds[key];
      }
    }

    return null;
  }

  /**
   * Détermine la classe CSS globale selon le score
   * @param score - Score global (0-100)
   * @returns Classe CSS globale
   */
  private getGlobalCssClass(score: number): string {
    if (score >= 95) return 'coverage-identical';
    if (score >= 80) return 'coverage-very-close';
    if (score >= 70) return 'coverage-close';
    if (score >= 50) return 'coverage-somewhat-far';
    if (score >= 30) return 'coverage-far';
    return 'coverage-very-far';
  }

  /**
   * Obtient la couleur d'arrière-plan pour une valeur de proximité
   * @param cssClass - Classe CSS de proximité
   * @returns Couleur hexadécimale
   */
  getBackgroundColor(cssClass: string): string {
    const colorMap: { [key: string]: string } = {
      'coverage-identical': '#059669',
      'coverage-very-close': '#10B981',
      'coverage-close': '#22C55E',
      'coverage-somewhat-far': '#F59E0B',
      'coverage-far': '#EA580C',
      'coverage-very-far': '#EF4444',
      'coverage-none': '#DC2626'
    };

    return colorMap[cssClass] || '#6B7280';
  }
}
