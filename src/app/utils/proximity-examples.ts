/**
 * Exemples d'utilisation du calculateur de proximité
 * Basé sur les données réelles de votre tableau de comparaison
 */

import { calculateProximity, ProximityResult } from './proximity-calculator';

/**
 * Exemples basés sur votre tableau actuel
 */
export function demonstrateProximityLogic() {
  console.log('🎯 DÉMONSTRATION DE LA LOGIQUE DE PROXIMITÉ\n');
  
  // Besoins utilisateur de votre exemple
  const userNeeds = {
    hospitalisation: '100%',
    honoraires: '100%', 
    orthodontie: '150%',
    forfaitOptique: '190€',
    forfaitDentaire: '130€',
    dentaire: '100%',
    chambreParticuliere: '50€'
  };
  
  // Contrats de votre tableau
  const contracts = [
    {
      name: 'GENERALI - TNS SANTÉ SUP Socle',
      values: {
        hospitalisation: '300%',
        honoraires: '100%',
        orthodontie: '150%', 
        forfaitOptique: '190€',
        forfaitDentaire: '130€',
        dentaire: '100%',
        chambreParticuliere: '51€'
      }
    },
    {
      name: 'APRIL - Santé Pro Start',
      values: {
        hospitalisation: '500%',
        honoraires: '150%',
        orthodontie: '150%',
        forfaitOptique: '250€',
        forfaitDentaire: '50€',
        dentaire: '150%',
        chambreParticuliere: '50€'
      }
    },
    {
      name: 'UTWIN - MULTI Santé',
      values: {
        hospitalisation: '150%',
        honoraires: '150%',
        orthodontie: '150%',
        forfaitOptique: '200€',
        forfaitDentaire: '100€',
        dentaire: '125%',
        chambreParticuliere: '50€'
      }
    }
  ];
  
  // Analyser chaque contrat
  contracts.forEach(contract => {
    console.log(`\n📋 ${contract.name}`);
    console.log('=' .repeat(50));
    
    let totalScore = 0;
    let guaranteeCount = 0;
    
    Object.keys(userNeeds).forEach(guarantee => {
      const userNeed = userNeeds[guarantee as keyof typeof userNeeds];
      const contractValue = contract.values[guarantee as keyof typeof contract.values];
      
      const proximity = calculateProximity(userNeed, contractValue);
      
      console.log(`${guarantee.padEnd(20)} | ${userNeed.padEnd(8)} → ${String(contractValue).padEnd(8)} | ${proximity.cssClass.padEnd(20)} | ${proximity.description}`);
      
      totalScore += proximity.proximityScore;
      guaranteeCount++;
    });
    
    const averageScore = Math.round(totalScore / guaranteeCount);
    console.log(`\n🎯 Score moyen: ${averageScore}%`);
    
    // Déterminer la couleur globale du contrat
    let globalClass = 'coverage-poor';
    if (averageScore >= 95) globalClass = 'coverage-identical';
    else if (averageScore >= 80) globalClass = 'coverage-very-close';
    else if (averageScore >= 70) globalClass = 'coverage-close';
    else if (averageScore >= 50) globalClass = 'coverage-somewhat-far';
    else if (averageScore >= 30) globalClass = 'coverage-far';
    
    console.log(`🎨 Classe CSS globale: ${globalClass}`);
  });
}

/**
 * Fonction pour appliquer les couleurs dans le template Angular
 */
export function getCellColorClass(userNeed: string, contractValue: string): string {
  const proximity = calculateProximity(userNeed, contractValue);
  return proximity.cssClass;
}

/**
 * Fonction pour obtenir une description de la proximité
 */
export function getProximityDescription(userNeed: string, contractValue: string): string {
  const proximity = calculateProximity(userNeed, contractValue);
  return proximity.description;
}

/**
 * Fonction pour calculer le score global d'un contrat
 */
export function calculateContractScore(userNeeds: any, contractValues: any): number {
  let totalScore = 0;
  let guaranteeCount = 0;
  
  Object.keys(userNeeds).forEach(guarantee => {
    if (contractValues[guarantee]) {
      const proximity = calculateProximity(userNeeds[guarantee], contractValues[guarantee]);
      totalScore += proximity.proximityScore;
      guaranteeCount++;
    }
  });
  
  return guaranteeCount > 0 ? Math.round(totalScore / guaranteeCount) : 0;
}

// Exécuter la démonstration si ce fichier est importé
if (typeof window !== 'undefined') {
  // demonstrateProximityLogic();
}
