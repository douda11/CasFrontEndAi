import { Component, OnInit } from '@angular/core';
import { BaseWizardComponent } from '../../../shared/base-wizard.component';
import { FormService } from '../../../services/form.service';
import { InsuranceService } from '../../../services/insurance.service';
import { MessageService } from 'primeng/api';
import { finalize } from 'rxjs/operators';

import { HttpErrorResponse } from '@angular/common/http';
import { FormGroup, FormArray, Validators } from '@angular/forms';
import { ComparisonResult } from '../../../models/project-model';
import { TableModule } from 'primeng/table';
import { ChartModule } from 'primeng/chart';
import { TagModule } from 'primeng/tag';
import { CardModule } from 'primeng/card';
import { DividerModule } from 'primeng/divider';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { StepsModule } from 'primeng/steps';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { DropdownModule } from 'primeng/dropdown';
import { CalendarModule } from 'primeng/calendar';
import { CheckboxModule } from 'primeng/checkbox';
import { SelectButtonModule } from 'primeng/selectbutton';
import { ToastModule } from 'primeng/toast';

@Component({
  selector: 'app-tarif-comparison',
  templateUrl: './tarif-comparison.component.html',
  styleUrls: ['./tarif-comparison.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TableModule,
    ChartModule,
    TagModule,
    CardModule,
    DividerModule,
    ButtonModule,
    ProgressSpinnerModule,
    StepsModule,
    InputTextModule,
    InputNumberModule,
    DropdownModule,
    CalendarModule,
    CheckboxModule,
    SelectButtonModule,
    ToastModule
  ]
})
export class TarifComparisonComponent extends BaseWizardComponent implements OnInit {
  comparisonResult: ComparisonResult | null = null;
  chartData: any;
  chartOptions: any;
  hasError: boolean = false;
  errorMessage: string = '';
  isLoading: boolean = false;
  combinedGuarantees: any[] = [];

  constructor(
    protected override formService: FormService,
    private insuranceService: InsuranceService,
    private messageService: MessageService
  ) {
    super(formService);
  }

  override ngOnInit(): void {
    // Initialize the form
    this.insuranceForm = this.formService.createInsuranceForm();
    
    // Initialize steps
    this.steps = [
      { label: 'Détails du projet' },
      { label: 'Emprunteurs' },
      { label: 'Prêts' },
      { label: 'Garanties' },
      { label: 'Comparaison' }
    ];
    
    // Add default borrower, loan and coverage
    this.addBorrower();
    this.addLoan();
    this.addCoverageOption();
    
    // Initialize chart options
    this.initializeChartOptions();
  }

  // Getters for form arrays
  override get borrowers(): FormArray {
    return this.insuranceForm.get('borrowers') as FormArray;
  }

  override get loans(): FormArray {
    return this.insuranceForm.get('loans') as FormArray;
  }

  override get coverageOptions(): FormArray {
    return this.insuranceForm.get('coverageOptions') as FormArray;
  }

  // Form array management
  override addBorrower(): void {
    const borrowerGroup = this.formService.createBorrowerForm();
    this.borrowers.push(borrowerGroup);
  }

  override removeBorrower(index: number): void {
    this.borrowers.removeAt(index);
  }

  override addLoan(): void {
    const loanGroup = this.formService.createLoanForm();
    this.loans.push(loanGroup);
  }

  override removeLoan(index: number): void {
    this.loans.removeAt(index);
  }

  override addCoverageOption(): void {
    const coverageGroup = this.formService.createCoverageForm();
    this.coverageOptions.push(coverageGroup);
  }

  override removeCoverageOption(index: number): void {
    this.coverageOptions.removeAt(index);
  }

  // Navigation
  override nextStep(): void {
    if (this.validateCurrentStep()) {
      this.activeIndex++;
      if (this.activeIndex === 4) {
        this.getComparison();
      }
    }
  }

  override previousStep(): void {
    this.activeIndex--;
  }

  validateCurrentStep(): boolean {
    let valid = true;

    switch (this.activeIndex) {
      case 0:
        if (this.insuranceForm.get('projectDetails')?.invalid) {
          this.markFormGroupTouched(this.insuranceForm.get('projectDetails') as FormGroup);
          valid = false;
        }
        break;
      case 1:
        for (let i = 0; i < this.borrowers.length; i++) {
          if (this.borrowers.at(i).invalid) {
            this.markFormGroupTouched(this.borrowers.at(i) as FormGroup);
            valid = false;
          }
        }
        break;
      case 2:
        for (let i = 0; i < this.loans.length; i++) {
          if (this.loans.at(i).invalid) {
            this.markFormGroupTouched(this.loans.at(i) as FormGroup);
            valid = false;
          }
        }
        break;
      case 3:
        for (let i = 0; i < this.coverageOptions.length; i++) {
          if (this.coverageOptions.at(i).invalid) {
            this.markFormGroupTouched(this.coverageOptions.at(i) as FormGroup);
            valid = false;
          }
        }
        break;
    }

    if (!valid) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Formulaire incomplet',
        detail: 'Veuillez remplir tous les champs obligatoires.'
      });
    }

    return valid;
  }

  getComparison(): void {
    if (this.insuranceForm.invalid) {
      this.markFormGroupTouched(this.insuranceForm);
      this.messageService.add({
        severity: 'error',
        summary: 'Formulaire Invalide',
        detail: 'Veuillez remplir tous les champs requis avant de lancer la comparaison.',
      });
      this.activeIndex = 0;
      return;
    }

    this.isLoading = true;
    this.hasError = false;
    this.errorMessage = '';
    this.comparisonResult = null;

    this.insuranceService.getAprilHealthTarif(this.insuranceForm.value)
      .pipe(
        finalize(() => {
          this.isLoading = false;
        })
      )
      .subscribe({
        next: (response) => {
          // The backend wraps the response, so we look at `response.data`
          if (response && response.data && Array.isArray(response.data)) {
            const aprilTariffs = response.data;

            if (aprilTariffs.length === 0) {
                this.hasError = true;
                this.errorMessage = "Aucune offre APRIL n'a été trouvée pour les critères fournis.";
                return;
            }

            // Map the response from the health API to the structure our component expects
            const mappedQuotes = aprilTariffs.map((tarif: any) => {
                // We map the response from the health API to the structure our component expects.
                // The field names like 'monthlyPremium' are based on common API structures for insurance.
                // This may need to be adjusted if the actual API response uses different field names.
                const monthly = tarif.monthlyPremium || tarif.price?.amount || tarif.monthlyPayment || 0;
                const total = tarif.totalCost || tarif.totalPayment || (monthly * 240); // Default to 20 years if not provided

                return {
                    provider: 'APRIL',
                    productName: tarif.commercialName || tarif.productName || 'Offre Santé APRIL',
                    taea: tarif.taea || 0, // TAEA might not be applicable for health insurance
                    monthlyPayment: monthly,
                    annualPayment: monthly * 12,
                    totalPayment: total,
                    raw: tarif
                };
            });

            // We only have April's data now, so the comparison is simple.
            this.comparisonResult = {
              april: {
                success: true,
                quotes: mappedQuotes,
              },
              utwin: { success: false, quotes: [] }, // No UTWIN data for now
              savingsAmount: 0,
              savingsPercentage: 0,
              bestOffer: 'april'
            };

            this.processGuarantees();
            this.updateChartData();
          } else {
            this.hasError = true;
            this.errorMessage = response.message || "La réponse du serveur est invalide ou ne contient pas de données de tarification.";
            this.messageService.add({ severity: 'error', summary: 'Erreur de Données', detail: this.errorMessage });
          }
        },
        error: (err: HttpErrorResponse) => {
          this.hasError = true;
          this.errorMessage = err.error?.message || 'Une erreur technique est survenue lors de la communication avec le service APRIL.';
          this.messageService.add({ severity: 'error', summary: 'Erreur de Connexion', detail: this.errorMessage });
        }
      });
  }

  loadExampleData(): void {
    const exampleFormData = this.insuranceService.getAprilExampleFormValues();
    this.insuranceForm.patchValue(exampleFormData);
  }
  override resetForm(): void {
    this.insuranceForm.reset();
    this.borrowers.clear();
    this.loans.clear();
    this.coverageOptions.clear();

    this.addBorrower();
    this.addLoan();
    this.addCoverageOption();

    this.activeIndex = 0;
    this.quoteResponse = null;
    this.comparisonResult = null;
    this.hasError = false;
    this.errorMessage = '';
  }

  processGuarantees(): void {
    this.combinedGuarantees = [];
    if (!this.comparisonResult) return;

    const aprilQuote = this.comparisonResult.april?.quotes?.[0];
    const utwinQuote = this.comparisonResult.utwin?.quotes?.[0];

    const guaranteeMap = new Map<string, any>();

    // Helper to initialize a guarantee entry
    const initGuarantee = (code: string) => {
      if (!guaranteeMap.has(code)) {
        guaranteeMap.set(code, {
          name: this.getGuaranteeName(code),
          april: '-',
          utwin: '-'
        });
      }
    };

    // Process APRIL guarantees
    if (aprilQuote?.raw?.coverages) {
      for (const cov of aprilQuote.raw.coverages) {
        initGuarantee(cov.guaranteeCode);
        guaranteeMap.get(cov.guaranteeCode).april = `Niveau ${cov.levelCode}`;
      }
    }

    // Process UTWIN guarantees
    if (utwinQuote?.raw?.coverages) {
      for (const cov of utwinQuote.raw.coverages) {
        initGuarantee(cov.guaranteeCode);
        guaranteeMap.get(cov.guaranteeCode).utwin = `Niveau ${cov.levelCode}`;
      }
    }

    this.combinedGuarantees = Array.from(guaranteeMap.values());
  }

  getGuaranteeName(code: string): string {
    const names: { [key: string]: string } = {
      'HOSP': 'Hospitalisation',
      'CS': 'Soins Courants',
      'OPTI': 'Optique',
      'DENT': 'Dentaire',
      'AC': 'Autres Soins',
      'BE': 'Bien-être & Prévention'
    };
    return names[code] || code;
  }

  override markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      } else {
        control?.markAsTouched();
      }
    });
  }
  getPercentageSaving(): string {
    if (!this.comparisonResult?.savingsPercentage) return '0%';
    return `${this.comparisonResult.savingsPercentage.toFixed(2)}%`;
  }

  getAmountSaving(): string {
    if (!this.comparisonResult?.savingsAmount) return '0 €';
    return `${this.comparisonResult.savingsAmount.toFixed(2)} €`;
  }
  
  getBestOffer(): string {
    // If either provider has no quotes, the other is automatically the best
    if (!this.comparisonResult?.april?.quotes?.length && this.comparisonResult?.utwin?.quotes?.length) {
      return 'UTWIN';
    }
    if (this.comparisonResult?.april?.quotes?.length && !this.comparisonResult?.utwin?.quotes?.length) {
      return 'APRIL';
    }
    
    return this.comparisonResult?.bestOffer === 'april' ? 'APRIL' :
           this.comparisonResult?.bestOffer === 'utwin' ? 'UTWIN' : 'N/A';
  }
  
  initializeChartOptions(): void {
    this.chartOptions = {
      plugins: {
        legend: {
          position: 'top'
        },
        tooltip: {
          mode: 'index',
          callbacks: {
            label: function(context: any) {
              let label = context.dataset.label || '';
              if (label) {
                label += ': ';
              }
              if (context.parsed.y !== null) {
                label += new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(context.parsed.y);
              }
              return label;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value: any) {
              return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);
            }
          }
        }
      }
    };
  }  updateChartData(): void {
    // Safety check to prevent errors
    if (!this.comparisonResult) {
      console.warn('No comparison result available for chart display');
      return;
    }

    // Check if the comparison result is properly structured
    if (!this.comparisonResult.april && !this.comparisonResult.utwin) {
      console.warn('Comparison result is missing provider data');
      return;
    }

    const aprilQuote = this.comparisonResult.april?.quotes?.[0];
    const utwinQuote = this.comparisonResult.utwin?.quotes?.[0];
    
    // If one or both quotes are missing, don't update the chart
    if (!aprilQuote && !utwinQuote) {
      console.warn('No quotes available for chart display');
      return;
    }
    
    this.chartData = {
      labels: ['Mensuel', 'Annuel', 'Total'],
      datasets: [
        {
          label: 'APRIL',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          borderColor: 'rgb(75, 192, 192)',
          pointBackgroundColor: 'rgb(75, 192, 192)',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: 'rgb(75, 192, 192)',
          data: [
            aprilQuote?.monthlyPayment || 0, 
            aprilQuote?.annualPayment || 0, 
          ]
        },
        {
          label: 'UTWIN',
          backgroundColor: 'rgba(255, 159, 64, 0.2)',
          borderColor: 'rgb(255, 159, 64)',
          pointBackgroundColor: 'rgb(255, 159, 64)',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: 'rgb(255, 159, 64)',
          data: [
            utwinQuote?.monthlyPayment || 0, 
            utwinQuote?.annualPayment || 0, 
          ]
        }
      ]
    };
  }

  // Helper methods for label display
  getProjectTypeLabel(value: string): string {
    const option = this.projectTypes.find(item => item.value === value);
    return option ? option.label : '-';
  }
  
  getPeriodicityLabel(value: string): string {
    const option = this.periodicityOptions.find(item => item.value === value);
    return option ? option.label : '-';
  }
  
  getLocationLabel(value: string): string {
    const option = this.locationOptions.find(item => item.value === value);
    return option ? option.label : '-';
  }
  
  getPaymentTypeLabel(value: string): string {
    const option = this.paymentTypeOptions.find(item => item.value === value);
    return option ? option.label : '-';
  }
  
  getLoanTypeLabel(value: string): string {
    const option = this.loanTypeOptions.find(item => item.value === value);
    return option ? option.label : '-';
  }
  
  getProfessionLabel(value: string): string {
    const option = this.professionOptions.find(item => item.value === value);
    return option ? option.label : '-';
  }
  
  getGuaranteeTypeLabel(value: string): string {
    const option = this.guaranteeTypeOptions.find(item => item.value === value);
    return option ? option.label : '-';
  }
  
  // Format date as string
  formatDate(date: Date | null): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('fr-FR');
  }
  
  // Getters for summary display
  get selectedProjectTypeLabel(): string {
    const projectType = this.insuranceForm.get('projectDetails.projectType')?.value;
    return this.getProjectTypeLabel(projectType);
  }
  
  get selectedEffectiveDateLabel(): string {
    const effectiveDate = this.insuranceForm.get('projectDetails.effectiveDate')?.value;
    return this.formatDate(effectiveDate);
  }
  
  get selectedPeriodicityLabel(): string {
    const periodicity = this.insuranceForm.get('projectDetails.periodicity')?.value;
    return this.getPeriodicityLabel(periodicity);
  }

  // Helper methods to safely get and compare quote values


 






 



 
  // Helper methods to safely get and compare quote values
  getAprilMonthlyPayment(): number {
    return this.comparisonResult?.april?.quotes?.[0]?.monthlyPayment || 0;
  }

  getUtwinMonthlyPayment(): number {
    return this.comparisonResult?.utwin?.quotes?.[0]?.monthlyPayment || 0;
  }

  getAprilAnnualPayment(): number {
    return this.comparisonResult?.april?.quotes?.[0]?.annualPayment || 0;
  }

  getUtwinAnnualPayment(): number {
    return this.comparisonResult?.utwin?.quotes?.[0]?.annualPayment || 0;
  }

  getMonthlyPaymentDifference(): number {
    const aprilPayment = this.getAprilMonthlyPayment();
    const utwinPayment = this.getUtwinMonthlyPayment();
    if (aprilPayment > 0 && utwinPayment > 0) {
      return aprilPayment - utwinPayment;
    }
    return 0;
  }

  getAnnualPaymentDifference(): number {
    const aprilPayment = this.getAprilAnnualPayment();
    const utwinPayment = this.getUtwinAnnualPayment();
    if (aprilPayment > 0 && utwinPayment > 0) {
      return aprilPayment - utwinPayment;
    }
    return 0;
  }

  getDifferenceClass(diff: number): string {
    if (diff > 0) return 'text-red-600 font-bold'; // April is more expensive
    if (diff < 0) return 'text-green-600 font-bold'; // April is cheaper
    return '';
  }

  override submitForm(): void {
    // Reset error state
    this.hasError = false;
    this.errorMessage = '';
    
    if (this.insuranceForm.valid) {
      this.loading = true;
      this.submitting = true;

      this.insuranceService.getComparisonQuotes(this.insuranceForm.value)
        .pipe(
          finalize(() => {
            this.loading = false;
            this.submitting = false;
          })
        )
        .subscribe({
          next: (response) => {
            this.comparisonResult = response;
            
            if (response) {
              this.updateChartData();
              this.messageService.add({
                severity: 'success',
                summary: 'Succès',
                detail: 'Comparaison calculée avec succès!'
              });
            } else {
              this.hasError = true;
              this.errorMessage = 'Aucune comparaison disponible.';
              this.messageService.add({
                severity: 'warn',
                summary: 'Attention',
                detail: this.errorMessage
              });
            }
          },
          error: (error: HttpErrorResponse) => {
            console.error('Comparison error:', error);
            this.hasError = true;
            this.errorMessage = `La comparaison a échoué: ${error.error?.message || error.message || 'Erreur inconnue'}`;
            this.messageService.add({
              severity: 'error',
              summary: 'Erreur',
              detail: this.errorMessage
            });
          }
        });
    } else {
      this.markFormGroupTouched(this.insuranceForm);
      this.messageService.add({
        severity: 'warn',
        summary: 'Formulaire invalide',
        detail: 'Veuillez remplir tous les champs obligatoires.'
      });
    }
  }
}
