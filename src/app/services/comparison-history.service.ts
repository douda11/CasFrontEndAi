import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ComparisonHistory, ComparisonResult } from '../models/comparison-history.model';

@Injectable({
  providedIn: 'root'
})
export class ComparisonHistoryService {
  private readonly STORAGE_KEY = 'cashedi_comparison_history';
  private historySubject = new BehaviorSubject<ComparisonHistory[]>([]);
  
  constructor() {
    this.loadHistory();
  }

  /**
   * Obtenir l'historique des comparaisons
   */
  getHistory(): Observable<ComparisonHistory[]> {
    return this.historySubject.asObservable();
  }

  /**
   * Ajouter une nouvelle comparaison à l'historique
   */
  addComparison(comparisonData: {
    userName: string;
    userEmail: string;
    formData: any;
    results: any[];
  }): void {
    const history = this.historySubject.value;
    
    const newComparison: ComparisonHistory = {
      id: this.generateId(),
      date: new Date(),
      userName: comparisonData.userName,
      userEmail: comparisonData.userEmail,
      
      // Informations de l'assuré principal
      principalName: comparisonData.formData.nomPrincipal || 'Non renseigné',
      principalFirstName: comparisonData.formData.prenomPrincipal || 'Non renseigné',
      principalBirthDate: comparisonData.formData.dateNaissancePrincipal || '',
      principalAge: this.calculateAge(comparisonData.formData.dateNaissancePrincipal),
      
      // Informations du conjoint
      conjoint: comparisonData.formData.situationFamiliale === 'marie' || 
                comparisonData.formData.situationFamiliale === 'pacs' ||
                comparisonData.formData.situationFamiliale === 'concubin' ? {
        name: comparisonData.formData.nomConjoint || 'Non renseigné',
        firstName: comparisonData.formData.prenomConjoint || 'Non renseigné',
        birthDate: comparisonData.formData.dateNaissanceConjoint || '',
        age: this.calculateAge(comparisonData.formData.dateNaissanceConjoint)
      } : undefined,
      
      // Informations des enfants
      enfants: comparisonData.formData.nombreEnfants > 0 ? {
        count: comparisonData.formData.nombreEnfants,
        details: this.extractEnfantsDetails(comparisonData.formData)
      } : undefined,
      
      // Détails de la comparaison
      regimeObligatoire: comparisonData.formData.regimeObligatoire || '',
      codePostal: comparisonData.formData.codePostal || '',
      dateEffet: comparisonData.formData.dateEffet || '',
      situationFamiliale: comparisonData.formData.situationFamiliale || '',
      
      // Résultats
      results: this.formatResults(comparisonData.results),
      totalResults: comparisonData.results.length
    };

    history.unshift(newComparison); // Ajouter au début
    
    // Limiter à 100 comparaisons maximum
    if (history.length > 100) {
      history.splice(100);
    }
    
    this.historySubject.next(history);
    this.saveHistory();
  }

  /**
   * Supprimer une comparaison de l'historique
   */
  deleteComparison(id: string): void {
    const history = this.historySubject.value.filter(item => item.id !== id);
    this.historySubject.next(history);
    this.saveHistory();
  }

  /**
   * Vider tout l'historique
   */
  clearHistory(): void {
    this.historySubject.next([]);
    this.saveHistory();
  }

  /**
   * Obtenir une comparaison par ID
   */
  getComparisonById(id: string): ComparisonHistory | undefined {
    return this.historySubject.value.find(item => item.id === id);
  }

  /**
   * Filtrer l'historique par utilisateur
   */
  getHistoryByUser(userEmail: string): ComparisonHistory[] {
    return this.historySubject.value.filter(item => item.userEmail === userEmail);
  }

  /**
   * Obtenir les statistiques de l'historique
   */
  getStatistics(): {
    totalComparisons: number;
    uniqueUsers: number;
    mostActiveUser: string;
    averageResultsPerComparison: number;
  } {
    const history = this.historySubject.value;
    const userCounts: { [email: string]: number } = {};
    
    history.forEach(item => {
      userCounts[item.userEmail] = (userCounts[item.userEmail] || 0) + 1;
    });
    
    const mostActiveUser = Object.keys(userCounts).reduce((a, b) => 
      userCounts[a] > userCounts[b] ? a : b, ''
    );
    
    const totalResults = history.reduce((sum, item) => sum + item.totalResults, 0);
    
    return {
      totalComparisons: history.length,
      uniqueUsers: Object.keys(userCounts).length,
      mostActiveUser,
      averageResultsPerComparison: history.length > 0 ? totalResults / history.length : 0
    };
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private calculateAge(birthDate: string): number {
    if (!birthDate) return 0;
    
    let birth: Date;
    
    // Gérer les différents formats de date
    if (birthDate.includes('/')) {
      // Format français JJ/MM/AAAA
      const parts = birthDate.split('/');
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // Les mois commencent à 0 en JavaScript
        const year = parseInt(parts[2], 10);
        birth = new Date(year, month, day);
      } else {
        return 0;
      }
    } else {
      // Format ISO ou autre
      birth = new Date(birthDate);
    }
    
    // Vérifier si la date est valide
    if (isNaN(birth.getTime())) {
      console.warn('Date de naissance invalide:', birthDate);
      return 0;
    }
    
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  }

  private extractEnfantsDetails(formData: any): Array<{ birthDate: string; age: number }> {
    const enfants = [];
    
    for (let i = 1; i <= formData.nombreEnfants; i++) {
      const birthDate = formData[`dateNaissanceEnfant${i}`] || '';
      enfants.push({
        birthDate,
        age: this.calculateAge(birthDate)
      });
    }
    
    return enfants;
  }

  private formatResults(results: any[]): ComparisonResult[] {
    return results.map(result => {
      console.log('🔍 DEBUG - Formatage résultat:', result);
      
      // Extraire l'assureur
      let assureur = result.assureur || result.insurerName || result.assurance || 'Non spécifié';
      
      // Extraire la formule
      let formule = result.formule || result.formula || result.niveau || 'Non spécifiée';
      
      // Extraire le prix - essayer plusieurs champs possibles
      let prix = 0;
      if (result.prix) prix = result.prix;
      else if (result.price) prix = result.price;
      else if (result.tarifMensuel) prix = result.tarifMensuel;
      else if (result.tarifGlobal) prix = result.tarifGlobal;
      else if (typeof result === 'string' && result.includes('€')) {
        // Extraire le prix d'une chaîne comme "123€/mois"
        const match = result.match(/(\d+(?:,\d+)?)\s*€/);
        if (match) prix = parseFloat(match[1].replace(',', '.'));
      }
      
      // Extraire les garanties
      let garanties = result.garanties || result.guarantees || {};
      
      const formattedResult = {
        assureur,
        formule,
        prix,
        garanties
      };
      
      console.log('✅ DEBUG - Résultat formaté:', formattedResult);
      return formattedResult;
    });
  }

  private loadHistory(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const history = JSON.parse(stored);
        // Convertir les dates string en objets Date
        history.forEach((item: any) => {
          item.date = new Date(item.date);
        });
        this.historySubject.next(history);
      }
    } catch (error) {
      console.error('Erreur lors du chargement de l\'historique:', error);
    }
  }

  private saveHistory(): void {
    try {
      const history = this.historySubject.value;
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(history));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de l\'historique:', error);
    }
  }
}
