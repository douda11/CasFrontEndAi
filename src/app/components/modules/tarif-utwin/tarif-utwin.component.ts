import { Component, OnInit } from '@angular/core';
import { BaseWizardComponent } from '../../../shared/base-wizard.component';
import { FormService } from '../../../services/form.service';
import { InsuranceService } from '../../../services/insurance.service';
import { MessageService } from 'primeng/api';
import { finalize } from 'rxjs/operators';
import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { StepsModule } from 'primeng/steps';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { DropdownModule } from 'primeng/dropdown';
import { CalendarModule } from 'primeng/calendar';
import { CheckboxModule } from 'primeng/checkbox';
import { SelectButtonModule } from 'primeng/selectbutton';
import { ToastModule } from 'primeng/toast';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { DividerModule } from 'primeng/divider';

@Component({
  selector: 'app-tarif-utwin',
  templateUrl: './tarif-utwin.component.html',
  styleUrls: ['./tarif-utwin.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    StepsModule,
    CardModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    DropdownModule,
    CalendarModule,
    CheckboxModule,
    SelectButtonModule,
    ToastModule,
    ProgressSpinnerModule,
    DividerModule
  ]
})
export class TarifUtwinComponent extends BaseWizardComponent implements OnInit {

  constructor(
    protected override formService: FormService,
    private insuranceService: InsuranceService,
    private messageService: MessageService
  ) {
    super(formService);
  }

  override ngOnInit(): void {
    super.ngOnInit();
    // Set UTWIN specific product reference
    this.insuranceForm.patchValue({
      productReference: 'PRET PREVOIR-PARTNER CRD'
    });
    
    // UTWIN specific guarantee types
    this.guaranteeTypeOptions = [
      { label: 'Décès', value: 'DC' },
      { label: 'IPT', value: 'IPT' },
      { label: 'ITT', value: 'ITT' }
    ];
  }

  loadExampleData(): void {
    const exampleFormData = this.insuranceService.getUtwinExampleFormValues();
    this.insuranceForm.patchValue(exampleFormData);
  }

  // Helper methods for safely accessing UTWIN quote response properties
  getAnnualPrice(): number {
    return (this.quoteResponse as any)?.quotes?.[0]?.annualPayment || 0;
  }

  getMonthlyPrice(): number {
    return (this.quoteResponse as any)?.quotes?.[0]?.monthlyPayment || 0;
  }

  getRate(): number {
    return (this.quoteResponse as any)?.quotes?.[0]?.additionalInfo?.rate || 0;
  }

  getReference(): string {
    return (this.quoteResponse as any)?.reference || '-';
  }

  getQuoteDate(): Date | null {
    return (this.quoteResponse as any)?.quoteDate || null;
  }

  hasQuoteDate(): boolean {
    return !!(this.quoteResponse as any)?.quoteDate;
  }

  getDetails(): any[] {
    return (this.quoteResponse as any)?.details || [];
  }

  hasDetails(): boolean {
    const details = (this.quoteResponse as any)?.quotes?.[0]?.additionalInfo;
    return Array.isArray(details) && details.length > 0;
  }

  // Helper methods for displaying labels
  getProjectTypeLabel(value: string): string {
    const option = this.projectTypes.find(item => item.value === value);
    return option ? option.label : '-';
  }
  
  getPeriodicityLabel(value: string): string {
    const option = this.periodicityOptions.find(item => item.value === value);
    return option ? option.label : '-';
  }
  
  getProfessionLabel(value: string): string {
    const option = this.professionOptions.find(item => item.value === value);
    return option ? option.label : '-';
  }
  
  getLoanTypeLabel(value: string): string {
    const option = this.loanTypeOptions.find(item => item.value === value);
    return option ? option.label : '-';
  }
  
  getGuaranteeTypeLabel(value: string): string {
    const option = this.guaranteeTypeOptions.find(item => item.value === value);
    return option ? option.label : '-';
  }
  
  override submitForm(): void {
    if (this.insuranceForm.valid) {
      this.loading = true;
      this.submitting = true;

      // Transforme le formulaire au format UTWIN via FormService
      const payload = this.formService.transformToUtwinFormat(this.insuranceForm.value);
      console.log('[TARIF-UTWIN] Envoi du payload UTWIN :', JSON.stringify(payload, null, 2));

      this.insuranceService.getUtwinTarifNew(this.insuranceForm.value)
        .pipe(finalize(() => {
          this.loading = false;
          this.submitting = false;
        }))
        .subscribe({
          next: (response: any) => {
            console.log('[TARIF-UTWIN] Réponse reçue :', JSON.stringify(response, null, 2));
            if (response?.result?.Emprunteurs) {
              // Mappe la réponse UTWIN dans un objet QuoteResponse standard
              const mapped = this.mapUtwinResultToDisplay(response.result);
              this.quoteResponse = {
                success: true,
                quotes: [{
                  monthlyPayment: mapped.monthlyPrice ?? 0,
                  annualPayment: mapped.annualPrice ?? 0,
                  additionalInfo: mapped.echeances,
                  coverageDetails: undefined
                }],
                errorMessage: undefined
              };
              this.messageService.add({
                severity: 'success',
                summary: 'Succès',
                detail: 'Tarification UTWIN calculée avec succès !'
              });
            } else {
              this.quoteResponse = {
                success: false,
                quotes: [],
                errorMessage: response?.errorMessage || 'Aucune proposition de tarif disponible.'
              };
              this.messageService.add({
                severity: 'warn',
                summary: 'Attention',
                detail: response?.errorMessage || 'Aucune proposition de tarif disponible.'
              });
            }
          },
          error: (error: HttpErrorResponse) => {
            console.error('UTWIN tarification error :', error);
            this.quoteResponse = {
              success: false,
              quotes: [],
              errorMessage: error.error?.message || 'Erreur inconnue'
            };
            this.messageService.add({
              severity: 'error',
              summary: 'Erreur',
              detail: `La tarification a échoué : ${error.error?.message || 'Erreur inconnue'}`
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

  /**
   * Map the nested UTWIN result to a flat structure for display in the UI
   */
  private mapUtwinResultToDisplay(result: any) {
    try {
      const emprunteur = result.Emprunteurs.TarifEmprunteurWsModel[0];
      const pret = emprunteur.Prets.TarifPretWsModel[0];
      const echeances = pret.Echeances.TarifEcheanceWsModel || [];

      return {
        monthlyPrice: emprunteur.PrimeTTC ? emprunteur.PrimeTTC / 12 : 0,
        annualPrice: emprunteur.PrimeTTC || 0,
        rate: emprunteur.Taux_Assurance || 0,
        reference: emprunteur.RefSimu || '-',
        echeances: echeances
      };
    } catch {
      return {
        monthlyPrice: 0,
        annualPrice: 0,
        rate: 0,
        reference: '-',
        echeances: []
      };
    }
  }
}
