/**
 * Calculateur de proximité pour les garanties d'assurance
 * Détermine la classe CSS à appliquer selon la proximité entre besoin et garantie
 */

export interface ProximityResult {
  cssClass: string;
  description: string;
  proximityScore: number;
}

/**
 * Calcule la proximité entre un besoin utilisateur et une garantie de contrat
 * @param userNeed - Besoin de l'utilisateur (ex: "100%", "150€", "200")
 * @param contractValue - Valeur du contrat (ex: "300%", "180€", "250", "-")
 * @returns ProximityResult - Objet contenant la classe CSS et la description
 */
export function calculateProximity(userNeed: string | number, contractValue: string | number): ProximityResult {
  // Cas spéciaux - Pas de couverture
  if (!contractValue || contractValue === '-' || contractValue === 'Non couvert' || contractValue === '0') {
    return {
      cssClass: 'coverage-none',
      description: 'Pas de couverture',
      proximityScore: 0
    };
  }
  
  // Si pas de besoin spécifique, toute couverture est bonne
  if (!userNeed || userNeed === '-' || userNeed === '0') {
    return {
      cssClass: 'coverage-identical',
      description: 'Couverture disponible',
      proximityScore: 100
    };
  }
  
  // Extraction des valeurs numériques
  const needValue = extractNumericValue(userNeed);
  const contractVal = extractNumericValue(contractValue);
  
  if (needValue === 0 || contractVal === 0) {
    return {
      cssClass: 'coverage-none',
      description: 'Valeur invalide',
      proximityScore: 0
    };
  }
  
  // Calcul de l'écart en pourcentage
  const difference = Math.abs(contractVal - needValue);
  const percentageDifference = (difference / needValue) * 100;
  
  // Score de proximité (100 = parfait, 0 = très éloigné)
  const proximityScore = Math.max(0, 100 - percentageDifference);
  
  // Logique de classification selon la proximité
  if (percentageDifference <= 5) {
    return {
      cssClass: 'coverage-identical',
      description: 'Identique ou très proche',
      proximityScore: Math.round(proximityScore)
    };
  } else if (percentageDifference <= 20) {
    return {
      cssClass: 'coverage-very-close',
      description: 'Très proche',
      proximityScore: Math.round(proximityScore)
    };
  } else if (percentageDifference <= 50) {
    return {
      cssClass: 'coverage-close',
      description: 'Proche',
      proximityScore: Math.round(proximityScore)
    };
  } else if (percentageDifference <= 100) {
    return {
      cssClass: 'coverage-somewhat-far',
      description: 'Un peu loin',
      proximityScore: Math.round(proximityScore)
    };
  } else if (percentageDifference <= 200) {
    return {
      cssClass: 'coverage-far',
      description: 'Loin',
      proximityScore: Math.round(proximityScore)
    };
  } else {
    return {
      cssClass: 'coverage-very-far',
      description: 'Très loin',
      proximityScore: Math.round(proximityScore)
    };
  }
}

/**
 * Extrait la valeur numérique d'une chaîne
 * @param value - Valeur à traiter
 * @returns Valeur numérique extraite
 */
function extractNumericValue(value: string | number): number {
  if (typeof value === 'number') {
    return value;
  }
  
  if (typeof value === 'string') {
    // Supprime tous les caractères non numériques sauf le point décimal
    const numericString = value.replace(/[^\d.]/g, '');
    const parsed = parseFloat(numericString);
    return isNaN(parsed) ? 0 : parsed;
  }
  
  return 0;
}

/**
 * Fonction utilitaire pour appliquer les couleurs à un tableau de comparaison
 * @param userNeeds - Objet contenant les besoins de l'utilisateur
 * @param contracts - Array des contrats avec leurs garanties
 * @returns Array des contrats avec les classes CSS appliquées
 */
export function applyProximityColors(userNeeds: any, contracts: any[]): any[] {
  return contracts.map(contract => {
    const coloredContract = { ...contract };
    
    // Parcourir chaque garantie et appliquer la couleur
    if (contract.benefits) {
      Object.keys(contract.benefits).forEach(category => {
        Object.keys(contract.benefits[category]).forEach(guarantee => {
          const userNeed = getUserNeedValue(userNeeds, category, guarantee);
          const contractValue = contract.benefits[category][guarantee];
          
          // Utiliser une valeur par défaut si userNeed est null
          const needValue = userNeed !== null ? userNeed : 0;
          const proximity = calculateProximity(needValue, contractValue);
          
          // Ajouter les informations de proximité
          if (!coloredContract.proximityInfo) {
            coloredContract.proximityInfo = {};
          }
          if (!coloredContract.proximityInfo[category]) {
            coloredContract.proximityInfo[category] = {};
          }
          
          coloredContract.proximityInfo[category][guarantee] = proximity;
        });
      });
    }
    
    return coloredContract;
  });
}

/**
 * Récupère la valeur du besoin utilisateur pour une garantie spécifique
 * @param userNeeds - Besoins de l'utilisateur
 * @param category - Catégorie de garantie
 * @param guarantee - Garantie spécifique
 * @returns Valeur du besoin ou null si non trouvé
 */
function getUserNeedValue(userNeeds: any, category: string, guarantee: string): string | number | null {
  if (!userNeeds) return null;
  
  // Mapping des garanties communes
  const guaranteeMapping: { [key: string]: string } = {
    'honoraires_chirurgien_optam': 'honoraires',
    'consultation_generaliste_optam': 'consultation',
    'chambre_particuliere': 'chambre',
    'soins_dentaires': 'dentaire',
    'verres_complexes': 'optique'
  };
  
  // Chercher d'abord avec le nom exact
  if (userNeeds[guarantee]) {
    return userNeeds[guarantee];
  }
  
  // Chercher avec le mapping
  const mappedName = guaranteeMapping[guarantee];
  if (mappedName && userNeeds[mappedName]) {
    return userNeeds[mappedName];
  }
  
  // Chercher par catégorie
  if (userNeeds[category] && userNeeds[category][guarantee]) {
    return userNeeds[category][guarantee];
  }
  
  return null;
}

/**
 * Exemples d'utilisation basés sur votre tableau
 */
export const proximityExamples = [
  {
    userNeed: "100%",
    contractValue: "100%",
    expected: "coverage-identical",
    description: "Correspondance parfaite"
  },
  {
    userNeed: "150%",
    contractValue: "150%",
    expected: "coverage-identical", 
    description: "Orthodontie - correspondance exacte"
  },
  {
    userNeed: "190€",
    contractValue: "190€",
    expected: "coverage-identical",
    description: "Forfait optique - correspondance exacte"
  },
  {
    userNeed: "100%",
    contractValue: "300%",
    expected: "coverage-very-far",
    description: "Hospitalisation - dépassement important"
  },
  {
    userNeed: "50€",
    contractValue: "51€",
    expected: "coverage-identical",
    description: "Chambre particulière - très proche"
  },
  {
    userNeed: "130€",
    contractValue: "-",
    expected: "coverage-none",
    description: "Forfait dentaire - pas de couverture"
  }
];
