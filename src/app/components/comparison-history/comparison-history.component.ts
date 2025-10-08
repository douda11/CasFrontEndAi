import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

// PrimeNG imports
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { CalendarModule } from 'primeng/calendar';
import { PanelModule } from 'primeng/panel';
import { DividerModule } from 'primeng/divider';

import { ComparisonHistoryService } from '../../services/comparison-history.service';
import { ComparisonHistory } from '../../models/comparison-history.model';

@Component({
  selector: 'app-comparison-history',
  templateUrl: './comparison-history.component.html',
  styleUrls: ['./comparison-history.component.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, TableModule, ButtonModule, CardModule, TagModule,
    TooltipModule, DialogModule, ConfirmDialogModule, ToastModule, InputTextModule,
    DropdownModule, CalendarModule, PanelModule, DividerModule
  ],
  providers: [ConfirmationService, MessageService]
})
export class ComparisonHistoryComponent implements OnInit, OnDestroy {
  history: ComparisonHistory[] = [];
  filteredHistory: ComparisonHistory[] = [];
  selectedComparison: ComparisonHistory | null = null;
  showDetailDialog = false;
  
  // Filtres
  searchText = '';
  selectedUser = '';
  dateRange: Date[] = [];
  
  // Options pour les filtres
  userOptions: { label: string, value: string }[] = [];
  
  // Statistiques
  statistics: any = {};
  
  // Subscriptions
  private historySubscription?: Subscription;
  
  // Colonnes du tableau
  cols = [
    { field: 'date', header: 'Date' },
    { field: 'userName', header: 'Utilisateur' },
    { field: 'principalName', header: 'Assuré Principal' },
    { field: 'conjoint', header: 'Conjoint' },
    { field: 'enfants', header: 'Enfants' },
    { field: 'totalResults', header: 'Résultats' },
    { field: 'actions', header: 'Actions' }
  ];

  constructor(
    private comparisonHistoryService: ComparisonHistoryService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.loadHistory();
    this.loadStatistics();
  }

  ngOnDestroy(): void {
    if (this.historySubscription) {
      this.historySubscription.unsubscribe();
    }
  }

  /**
   * Charger l'historique des comparaisons
   */
  private loadHistory(): void {
    this.historySubscription = this.comparisonHistoryService.getHistory().subscribe(
      history => {
        this.history = history;
        this.filteredHistory = [...history];
        this.updateUserOptions();
        this.applyFilters();
      }
    );
  }

  /**
   * Charger les statistiques
   */
  private loadStatistics(): void {
    this.statistics = this.comparisonHistoryService.getStatistics();
  }

  /**
   * Mettre à jour les options utilisateur pour le filtre
   */
  private updateUserOptions(): void {
    const uniqueUsers = [...new Set(this.history.map(h => h.userEmail))];
    this.userOptions = [
      { label: 'Tous les utilisateurs', value: '' },
      ...uniqueUsers.map(email => ({ label: email, value: email }))
    ];
  }

  /**
   * Appliquer les filtres
   */
  applyFilters(): void {
    let filtered = [...this.history];

    // Filtre par texte de recherche
    if (this.searchText.trim()) {
      const searchLower = this.searchText.toLowerCase();
      filtered = filtered.filter(item =>
        item.userName.toLowerCase().includes(searchLower) ||
        item.principalName.toLowerCase().includes(searchLower) ||
        item.principalFirstName.toLowerCase().includes(searchLower) ||
        (item.conjoint?.name || '').toLowerCase().includes(searchLower) ||
        (item.conjoint?.firstName || '').toLowerCase().includes(searchLower)
      );
    }

    // Filtre par utilisateur
    if (this.selectedUser) {
      filtered = filtered.filter(item => item.userEmail === this.selectedUser);
    }

    // Filtre par plage de dates
    if (this.dateRange && this.dateRange.length === 2 && this.dateRange[0] && this.dateRange[1]) {
      const startDate = this.dateRange[0];
      const endDate = this.dateRange[1];
      filtered = filtered.filter(item => {
        const itemDate = new Date(item.date);
        return itemDate >= startDate && itemDate <= endDate;
      });
    }

    this.filteredHistory = filtered;
  }

  /**
   * Réinitialiser les filtres
   */
  resetFilters(): void {
    this.searchText = '';
    this.selectedUser = '';
    this.dateRange = [];
    this.applyFilters();
  }

  /**
   * Afficher les détails d'une comparaison
   */
  showDetails(comparison: ComparisonHistory): void {
    this.selectedComparison = comparison;
    this.showDetailDialog = true;
  }

  /**
   * Supprimer une comparaison
   */
  deleteComparison(comparison: ComparisonHistory): void {
    this.confirmationService.confirm({
      message: `Êtes-vous sûr de vouloir supprimer cette comparaison du ${this.formatDate(comparison.date)} ?`,
      header: 'Confirmation de suppression',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.comparisonHistoryService.deleteComparison(comparison.id);
        this.messageService.add({
          severity: 'success',
          summary: 'Suppression réussie',
          detail: 'La comparaison a été supprimée avec succès.'
        });
        this.loadStatistics();
      }
    });
  }

  /**
   * Vider tout l'historique
   */
  clearAllHistory(): void {
    this.confirmationService.confirm({
      message: 'Êtes-vous sûr de vouloir supprimer tout l\'historique ? Cette action est irréversible.',
      header: 'Confirmation de suppression totale',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.comparisonHistoryService.clearHistory();
        this.messageService.add({
          severity: 'success',
          summary: 'Historique vidé',
          detail: 'Tout l\'historique a été supprimé avec succès.'
        });
        this.loadStatistics();
      }
    });
  }

  /**
   * Exporter l'historique en CSV
   */
  exportToCsv(): void {
    const csvData = this.filteredHistory.map(item => ({
      Date: this.formatDate(item.date),
      Utilisateur: item.userName,
      Email: item.userEmail,
      'Assuré Principal': `${item.principalFirstName} ${item.principalName}`,
      'Date Naissance Principal': item.principalBirthDate,
      'Âge Principal': item.principalAge,
      Conjoint: item.conjoint ? `${item.conjoint.firstName} ${item.conjoint.name}` : 'Non',
      'Nombre Enfants': item.enfants?.count || 0,
      'Régime Obligatoire': item.regimeObligatoire,
      'Code Postal': item.codePostal,
      'Date Effet': item.dateEffet,
      'Situation Familiale': item.situationFamiliale,
      'Nombre Résultats': item.totalResults
    }));

    this.downloadCsv(csvData, 'historique_comparaisons.csv');
  }

  /**
   * Télécharger un fichier CSV
   */
  private downloadCsv(data: any[], filename: string): void {
    if (data.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Aucune donnée',
        detail: 'Aucune donnée à exporter.'
      });
      return;
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Formater une date
   */
  formatDate(date: Date | string): string {
    const d = new Date(date);
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Obtenir le texte de la composition familiale
   */
  getFamilyComposition(comparison: ComparisonHistory): string {
    let composition = 'Seul';
    
    if (comparison.conjoint && comparison.enfants?.count) {
      composition = `Famille (${comparison.enfants.count} enfant${comparison.enfants.count > 1 ? 's' : ''})`;
    } else if (comparison.conjoint) {
      composition = 'Couple';
    } else if (comparison.enfants?.count) {
      composition = `Parent isolé (${comparison.enfants.count} enfant${comparison.enfants.count > 1 ? 's' : ''})`;
    }
    
    return composition;
  }

  /**
   * Obtenir la couleur du tag pour le nombre de résultats
   */
  getResultsSeverity(totalResults: number): string {
    if (totalResults >= 10) return 'success';
    if (totalResults >= 5) return 'warning';
    return 'danger';
  }
}
