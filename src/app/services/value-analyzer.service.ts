import { Injectable } from '@angular/core';

export interface ValueAnalysis {
  type: 'percentage' | 'euros' | 'mixed' | 'unknown';
  numericValue: number;
  originalValue: string;
  unit: string;
  isAddition: boolean;
  displayValue: string;
}

export interface SliderConfig {
  id: string;
  category: string;
  guarantee: string;
  label: string;
  type: 'percentage' | 'euros' | 'unknown';
  min: number;
  max: number;
  step: number;
  default: number;
  unit: string;
  suffix: string;
  extractedValue: string;
}

export interface FrontendConfig {
  sliders: SliderConfig[];
  formStructure: { [category: string]: SliderConfig[] };
  validationRules: any;
}

export interface ContractAnalysis {
  contractInfo: {
    insurer: string;
    contractName: string;
    levelName: string;
  };
  analysis: {
    guarantees: any;
    sliderConfigs: any;
    summary: {
      totalGuarantees: number;
      percentageCount: number;
      eurosCount: number;
      unknownCount: number;
    };
  };
  frontendConfig: FrontendConfig;
}

@Injectable({
  providedIn: 'root'
})
export class ValueAnalyzerService {

  private percentagePatterns = [
    /(\d+(?:\.\d+)?)\s*%/i,           // 100%, 125.5%
    /(\d+(?:\.\d+)?)\s*%\s*BR/i,      // 100% BR
    /(\d+(?:\.\d+)?)\s*%\s*BRSS/i,    // 500% BRSS
    /\+(\d+(?:\.\d+)?)\s*%\s*BR/i,    // +100% BR
  ];

  private eurosPatterns = [
    /(\d+(?:\.\d+)?)\s*€/i,           // 100€, 125.50€
    /(\d+(?:\.\d+)?)\s*euros?/i,      // 100 euro, 125 euros
    /\+(\d+(?:\.\d+)?)\s*€/i,         // +30€
  ];

  private defaultSliderConfigs = {
    percentage: {
      min: 0,
      max: 500,
      step: 25,
      unit: '%',
      suffix: '% BR'
    },
    euros: {
      min: 0,
      max: 1000,
      step: 10,
      unit: '€',
      suffix: '€'
    }
  };

  constructor() { }

  /**
   * Analyse une valeur extraite et détermine son type
   */
  analyzeValue(value: string): ValueAnalysis {
    if (!value || value === '-' || value.toLowerCase().includes('non couvert')) {
      return {
        type: 'unknown',
        numericValue: 0,
        originalValue: value,
        unit: '',
        isAddition: false,
        displayValue: value || '-'
      };
    }

    const cleanValue = value.trim();
    const isAddition = cleanValue.startsWith('+');

    // Analyser les pourcentages
    for (const pattern of this.percentagePatterns) {
      const match = cleanValue.match(pattern);
      if (match) {
        const numericValue = parseFloat(match[1]);
        return {
          type: 'percentage',
          numericValue,
          originalValue: value,
          unit: '%',
          isAddition,
          displayValue: `${numericValue}% BR`
        };
      }
    }

    // Analyser les euros
    for (const pattern of this.eurosPatterns) {
      const match = cleanValue.match(pattern);
      if (match) {
        const numericValue = parseFloat(match[1]);
        return {
          type: 'euros',
          numericValue,
          originalValue: value,
          unit: '€',
          isAddition,
          displayValue: `${numericValue}€`
        };
      }
    }

    // Extraire un nombre si aucun pattern ne correspond
    const numberMatch = cleanValue.match(/(\d+(?:\.\d+)?)/);
    if (numberMatch) {
      const numericValue = parseFloat(numberMatch[1]);
      return {
        type: 'unknown',
        numericValue,
        originalValue: value,
        unit: '',
        isAddition,
        displayValue: numericValue.toString()
      };
    }

    return {
      type: 'unknown',
      numericValue: 0,
      originalValue: value,
      unit: '',
      isAddition: false,
      displayValue: value
    };
  }

  /**
   * Analyse toutes les garanties d'un contrat
   */
  analyzeContractBenefits(benefits: any): any {
    const analysis: {
      guarantees: { [category: string]: { [guarantee: string]: ValueAnalysis } };
      sliderConfigs: { [key: string]: SliderConfig };
      summary: {
        totalGuarantees: number;
        percentageCount: number;
        eurosCount: number;
        unknownCount: number;
      };
    } = {
      guarantees: {},
      sliderConfigs: {},
      summary: {
        totalGuarantees: 0,
        percentageCount: 0,
        eurosCount: 0,
        unknownCount: 0
      }
    };

    for (const [category, guarantees] of Object.entries(benefits)) {
      if (typeof guarantees !== 'object' || guarantees === null) {
        continue;
      }

      analysis.guarantees[category] = {};

      for (const [guaranteeName, guaranteeValue] of Object.entries(guarantees as any)) {
        // Analyser la valeur
        const valueAnalysis = this.analyzeValue(guaranteeValue as string);
        analysis.guarantees[category][guaranteeName] = valueAnalysis;

        // Générer la configuration du slider
        const sliderConfig = this.generateSliderConfig(guaranteeName, valueAnalysis);
        analysis.sliderConfigs[`${category}_${guaranteeName}`] = sliderConfig;

        // Mettre à jour le résumé
        analysis.summary.totalGuarantees++;
        switch (valueAnalysis.type) {
          case 'percentage':
            analysis.summary.percentageCount++;
            break;
          case 'euros':
            analysis.summary.eurosCount++;
            break;
          default:
            analysis.summary.unknownCount++;
        }
      }
    }

    return analysis;
  }

  /**
   * Génère la configuration d'un slider basée sur l'analyse de la valeur
   */
  generateSliderConfig(guaranteeName: string, valueAnalysis: ValueAnalysis): SliderConfig {
    const valueType = valueAnalysis.type;
    const numericValue = valueAnalysis.numericValue;

    // Configuration de base selon le type
    let config: any;
    if (valueType === 'percentage') {
      config = { ...this.defaultSliderConfigs.percentage };
      // Ajuster le max selon la valeur extraite
      if (numericValue > 300) {
        config.max = Math.max(500, Math.floor(numericValue * 1.2));
      }
    } else if (valueType === 'euros') {
      config = { ...this.defaultSliderConfigs.euros };
      // Ajuster le max selon la valeur extraite
      if (numericValue > 500) {
        config.max = Math.max(1000, Math.floor(numericValue * 1.5));
      }
    } else {
      // Configuration par défaut pour les valeurs inconnues
      config = {
        min: 0,
        max: numericValue > 0 ? Math.max(100, Math.floor(numericValue * 2)) : 100,
        step: 1,
        unit: '',
        suffix: ''
      };
    }

    // Personnalisations spécifiques par garantie
    const specificConfig = this.getGuaranteeSpecificConfig(guaranteeName, valueType);
    Object.assign(config, specificConfig);

    return {
      id: `${guaranteeName}_slider`,
      category: '',
      guarantee: guaranteeName,
      label: this.formatGuaranteeLabel(guaranteeName),
      type: valueType as any,
      min: config.min,
      max: config.max,
      step: config.step,
      default: numericValue,
      unit: config.unit,
      suffix: config.suffix,
      extractedValue: valueAnalysis.displayValue
    };
  }

  /**
   * Configurations spécifiques par type de garantie
   */
  private getGuaranteeSpecificConfig(guaranteeName: string, valueType: string): any {
    const specificConfigs: { [key: string]: { [key: string]: any } } = {
      'chambre_particuliere': {
        'euros': { max: 200, step: 5 }
      },
      'honoraires_chirurgien_optam': {
        'percentage': { max: 600, step: 25 }
      },
      'consultation_generaliste_optam': {
        'percentage': { max: 400, step: 25 }
      },
      'implantologie': {
        'euros': { max: 2000, step: 50 }
      },
      'orthodontie': {
        'percentage': { max: 300, step: 25 },
        'euros': { max: 1500, step: 50 }
      },
      'verres_complexes': {
        'euros': { max: 800, step: 25 }
      }
    };

    return specificConfigs[guaranteeName]?.[valueType] || {};
  }

  /**
   * Génère la configuration pour le frontend Angular
   */
  generateFrontendConfig(analysis: any): FrontendConfig {
    const frontendConfig: FrontendConfig = {
      sliders: [],
      formStructure: {},
      validationRules: {}
    };

    for (const [sliderKey, sliderConfig] of Object.entries(analysis.sliderConfigs)) {
      const [category, guarantee] = sliderKey.split('_', 2);
      const config = sliderConfig as any;

      const sliderInfo: SliderConfig = {
        id: sliderKey,
        category: category,
        guarantee: guarantee,
        label: this.formatGuaranteeLabel(guarantee),
        type: config.type || 'unknown',
        min: config.min || 0,
        max: config.max || 100,
        step: config.step || 1,
        default: config.default || 0,
        unit: config.unit || '',
        suffix: config.suffix || '',
        extractedValue: config.extractedValue || ''
      };

      frontendConfig.sliders.push(sliderInfo);

      // Structure du formulaire
      if (!frontendConfig.formStructure[category]) {
        frontendConfig.formStructure[category] = [];
      }
      frontendConfig.formStructure[category].push(sliderInfo);
    }

    return frontendConfig;
  }

  /**
   * Formate le nom de la garantie pour l'affichage
   */
  formatGuaranteeLabel(guaranteeName: string): string {
    const labelMapping: { [key: string]: string } = {
      'honoraires_chirurgien_optam': 'Honoraires Chirurgien OPTAM',
      'chambre_particuliere': 'Chambre Particulière',
      'consultation_generaliste_optam': 'Consultation Généraliste OPTAM',
      'soins_dentaires': 'Soins Dentaires',
      'implantologie': 'Implantologie',
      'orthodontie': 'Orthodontie',
      'verres_complexes': 'Verres Complexes'
    };

    return labelMapping[guaranteeName] || guaranteeName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  /**
   * Analyse un contrat extrait complet
   */
  analyzeExtractedContract(contractData: any): ContractAnalysis {
    if (!contractData.benefits) {
      throw new Error('Aucune garantie trouvée dans le contrat');
    }

    const analysis = this.analyzeContractBenefits(contractData.benefits);
    const frontendConfig = this.generateFrontendConfig(analysis);

    return {
      contractInfo: {
        insurer: contractData.insurer || '',
        contractName: contractData.contract_name || '',
        levelName: contractData.level_name || ''
      },
      analysis,
      frontendConfig
    };
  }

  /**
   * Convertit les sliders en format de besoins utilisateur pour la comparaison
   */
  convertSlidersToUserNeeds(sliders: SliderConfig[], values: { [key: string]: number }): any {
    const userNeeds: any = {};

    sliders.forEach(slider => {
      const value = values[slider.id] || slider.default;
      const formattedValue = slider.type === 'percentage' 
        ? `${value}%` 
        : slider.type === 'euros' 
          ? `${value}€` 
          : value.toString();
      
      userNeeds[slider.guarantee] = formattedValue;
    });

    return userNeeds;
  }
}
