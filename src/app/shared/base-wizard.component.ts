import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, FormArray, ReactiveFormsModule } from '@angular/forms';
import { InsuranceQuoteForm, QuoteResponse  } from '../models/project-model';
import { FormService } from '../services/form.service';

// PrimeNG imports
import { StepsModule } from 'primeng/steps';
import { MenuItem } from 'primeng/api';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { DropdownModule } from 'primeng/dropdown';
import { CalendarModule } from 'primeng/calendar';
import { CheckboxModule } from 'primeng/checkbox';
import { SelectButtonModule } from 'primeng/selectbutton';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { DividerModule } from 'primeng/divider';

@Component({
  selector: 'app-base-wizard',
  template: '',
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
  ],
  providers: [MessageService]
})
export class BaseWizardComponent implements OnInit {
  // Common properties and methods for all wizards
  insuranceForm!: FormGroup;
  steps!: MenuItem[];
  activeIndex = 0;
  loading = false;
  submitting = false;
  quoteResponse: QuoteResponse | null = null;

  // Dropdown options
  projectTypes = [
    { label: 'Résidence principale', value: 'RES1' },
    { label: 'Résidence secondaire', value: 'RES2' },
    { label: 'Investissement locatif', value: 'INVEST' },
    { label: 'Autre', value: 'AUTRE' }
  ];
  
  periodicityOptions = [
    { label: 'Mensuel', value: 'mensuel' },
    { label: 'Trimestriel', value: 'trimestriel' },
    { label: 'Semestriel', value: 'semestriel' },
    { label: 'Annuel', value: 'annuel' }
  ];

  locationOptions = [
    { label: 'Métropole', value: 'METRO' },
    { label: 'DOM', value: 'DOM' },
    { label: 'TOM', value: 'TOM' },
    { label: 'Etranger', value: 'ETRANGER' }
  ];

  paymentTypeOptions = [
    { label: 'En une fois', value: 'paiement_en_une_fois' },
    { label: 'Avec prélèvement', value: 'avec_prelevement' }
  ];

  loanTypeOptions = [
    { label: 'Amortissable', value: 'AMORTISSABLE' },
    { label: 'In Fine', value: 'IN_FINE' },
    { label: 'Relais', value: 'RELAIS' }
  ];

  professionOptions = [
    { label: 'Cadre administratif / commercial', value: 'CADRE_ADMIN_COM' },
    { label: 'Profession libérale', value: 'PROFESSION_LIBERALE' },
    { label: 'Artisan / commerçant', value: 'ARTISAN_COMMERCANT' },
    { label: 'Ouvrier', value: 'OUVRIER' },
    { label: 'Étudiant', value: 'ETUDIANT' },
    { label: 'Retraité', value: 'RETRAITE' },
    { label: 'Sans profession', value: 'SANS_PROFESSION' }
  ];

  guaranteeTypeOptions = [
    { label: 'Décès', value: 'DECES' },
    { label: 'Invalidité Permanente Totale', value: 'INVALIDITE_PERMANENTE_TOTALE' },
    { label: 'Incapacité Temporaire Totale', value: 'INCAPACITE_TEMPORAIRE_TOTALE' }
  ];

  constructor(protected formService: FormService) {}

  ngOnInit(): void {
    this.initForm();
    this.initSteps();
  }

  // Initialize the form
  initForm(): void {
    this.insuranceForm = this.formService.createHealthInsuranceForm();
  }

  // Initialize the steps
  initSteps(): void {
    this.steps = [
      { 
        label: 'Détails du projet',
        command: (event: any) => this.activeIndex = 0
      },
      { 
        label: 'Emprunteur', 
        command: (event: any) => this.activeIndex = 1
      },
      { 
        label: 'Prêt', 
        command: (event: any) => this.activeIndex = 2
      },
      { 
        label: 'Garanties', 
        command: (event: any) => this.activeIndex = 3
      },
      { 
        label: 'Récapitulatif', 
        command: (event: any) => this.activeIndex = 4
      }
    ];
  }

  // Move to the next step
  nextStep(): void {
    const formSection = this.getCurrentFormSection();
    if (formSection?.valid) {
      this.activeIndex = Math.min(this.activeIndex + 1, this.steps.length - 1);
    } else {
      this.markFormGroupTouched(formSection);
    }
  }

  // Move to the previous step
  previousStep(): void {
    this.activeIndex = Math.max(this.activeIndex - 1, 0);
  }

  // Get the current form section based on active step
  getCurrentFormSection(): FormGroup {
    switch (this.activeIndex) {
      case 0:
        return this.insuranceForm.get('projectDetails') as FormGroup;
      case 1:
        return this.insuranceForm; // Parent FormGroup contains 'borrowers' FormArray
      case 2:
        return this.insuranceForm; // Parent FormGroup contains 'loans' FormArray
      case 3:
        return this.insuranceForm; // Parent FormGroup contains 'coverageOptions' FormArray
      default:
        return this.insuranceForm;
    }
  }

  // Helper to mark all form fields as touched to trigger validation
  markFormGroupTouched(formGroup: any): void {
    if (formGroup instanceof FormArray) {
      formGroup.controls.forEach((control: any) => {
        this.markFormGroupTouched(control);
      });
    } else if (formGroup instanceof FormGroup) {
      Object.keys(formGroup.controls).forEach(key => {
        const control = formGroup.get(key);
        if (control instanceof FormGroup || control instanceof FormArray) {
          this.markFormGroupTouched(control);
        } else {
          control?.markAsTouched();
        }
      });
    }
  }

  

  // Reset the form
  resetForm(): void {
    this.insuranceForm = this.formService.createHealthInsuranceForm();
    this.activeIndex = 0;
    this.quoteResponse = null;
  }

  // Submit the form (to be implemented by child components)
  submitForm(): void {
    console.log('Base submit method called - should be overridden');
  }
}
