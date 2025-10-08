export interface ComparisonHistory {
  id: string;
  date: Date;
  userName: string;
  userEmail: string;
  
  // Informations de l'assuré principal
  principalName: string;
  principalFirstName: string;
  principalBirthDate: string;
  principalAge: number;
  
  // Informations du conjoint (optionnel)
  conjoint?: {
    name: string;
    firstName: string;
    birthDate: string;
    age: number;
  };
  
  // Informations des enfants (optionnel)
  enfants?: {
    count: number;
    details: Array<{
      birthDate: string;
      age: number;
    }>;
  };
  
  // Détails de la comparaison
  regimeObligatoire: string;
  codePostal: string;
  dateEffet: string;
  situationFamiliale: string;
  
  // Résultats de la comparaison
  results: ComparisonResult[];
  
  // Nombre total de résultats
  totalResults: number;
}

export interface ComparisonResult {
  assureur: string;
  formule: string;
  prix: number;
  garanties: {
    [key: string]: any;
  };
}
