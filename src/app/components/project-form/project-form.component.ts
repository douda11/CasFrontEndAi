import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { InsuranceService } from '../../services/insurance.service';
import { InsuranceQuoteForm, InsuredPerson } from '../../models/project-model';

// PrimeNG modules
import { PanelModule } from 'primeng/panel';
import { DropdownModule } from 'primeng/dropdown';
import { RadioButtonModule } from 'primeng/radiobutton';
import { CalendarModule } from 'primeng/calendar';
import { InputTextModule } from 'primeng/inputtext';
import { InputMaskModule } from 'primeng/inputmask';
import { ButtonModule } from 'primeng/button';
import { TextareaModule } from 'primeng/textarea';
import { DividerModule } from 'primeng/divider';
import { TooltipModule } from 'primeng/tooltip';
import { InputNumberModule } from 'primeng/inputnumber';
import { CheckboxModule } from 'primeng/checkbox';
import { MultiSelectModule } from 'primeng/multiselect';

interface SelectOption {
  label: string;
  value: any;
}

@Component({
  selector: 'app-project-form',
  templateUrl: './project-form.component.html',
  styleUrls: ['./project-form.component.css'],
  standalone: true,
  providers: [MessageService],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    PanelModule,
    DropdownModule,
    RadioButtonModule,
    CalendarModule,
    InputTextModule,
    InputMaskModule,
    ButtonModule,
    TextareaModule,
    DividerModule,
    TooltipModule,
    InputNumberModule,
    CheckboxModule,
    MultiSelectModule,
  ],
})
export class ProjectFormComponent implements OnInit {
  projectForm!: FormGroup;

  typeContactOptions: SelectOption[] = [
    { label: 'Personne physique', value: 'personne_physique' },
    { label: 'Personne morale', value: 'personne_morale' },
  ];

  statutOptions: SelectOption[] = [
    { label: 'À traiter', value: 'a_traiter' },
    { label: 'En cours', value: 'en_cours' },
    { label: 'Clos', value: 'clos' },
  ];

  origineOptions: SelectOption[] = [
    { label: 'Back-office', value: 'back_office' },
    { label: 'Réseau', value: 'reseau' },
    { label: 'Partenaire', value: 'partenaire' },
  ];

  civiliteOptions: SelectOption[] = [
    { label: 'Monsieur', value: 'Monsieur' },
    { label: 'Madame', value: 'Madame' },
  ];

  paysOptions: SelectOption[] = [
    { label: 'France', value: 'FR' },
    { label: 'Belgique', value: 'BE' },
    { label: 'Suisse', value: 'CH' },
  ];

  etatCivilOptions: SelectOption[] = [
    { label: 'Célibataire', value: 'celibataire' },
    { label: 'Marié(e)', value: 'marie' },
    { label: 'Divorcé(e)', value: 'divorce' },
    { label: 'Veuf/veuve', value: 'veuf' },
  ];

  addressTypeOptions: SelectOption[] = [
    { label: 'Actuelle', value: 'Actuelle' },
    { label: 'Future', value: 'Future' },
  ];

  garantiesOptions: SelectOption[] = [
    { label: 'Hospitalisation', value: 'HOSP' },
    { label: 'Soins Courants', value: 'SOINS' },
    { label: 'Optique', value: 'OPTI' },
    { label: 'Dentaire', value: 'DENT' },
  ];

  productOptions: SelectOption[] = [
    { label: 'Sélectionner un produit', value: null },
    { label: 'APRIL Santé Mix Proximité', value: 'APRIL Santé Mix Proximité' },
    { label: 'SANTE PRO APRIL', value: 'SANTE PRO APRIL' },
    { label: 'SanteProStartV1', value: 'SanteProStartV1' },
  ];

  today = new Date();
  defaultDateEffet!: Date;
  minDate!: Date;

  constructor(
    private fb: FormBuilder,
    private messageService: MessageService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const tomorrow = new Date();
    tomorrow.setDate(this.today.getDate() + 1);
    this.defaultDateEffet = tomorrow;
    this.minDate = tomorrow; // Empêche la sélection de dates passées

    this.buildForm();
  }

  private buildForm(): void {
    this.projectForm = this.fb.group({
      typeContact: ['personne_physique', Validators.required],
      dateEffetSouhaitee: [this.defaultDateEffet, Validators.required],
      statut: ['a_traiter', Validators.required],
      origine: ['back_office', Validators.required],
      productReference: [null, Validators.required],
      civilite: [null, Validators.required],
      nom: ['', Validators.required],
      prenom: ['', Validators.required],
      addressType: ['Actuelle', Validators.required],
      adresse: ['', Validators.required],
      codePostal: ['', Validators.required],
      ville: ['', Validators.required],
      pays: ['FR', Validators.required],
      telephone: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      socialSecurityNumber: [''],
      dateNaissance: [null as Date | null, Validators.required],
      etatCivil: [null, Validators.required],
      garanties: [[], Validators.required],
    });
  }

  onSubmit(): void {
    if (this.projectForm.invalid) {
      this.projectForm.markAllAsTouched();
      this.messageService.add({
        severity: 'error',
        summary: 'Erreur de Formulaire',
        detail: 'Veuillez remplir tous les champs requis.',
      });
      return;
    }

    const formValue = this.projectForm.getRawValue();

    const mainInsured: InsuredPerson = {
      firstName: formValue.prenom,
      lastName: formValue.nom,
      birthDate: new Date(formValue.dateNaissance),
      gender: formValue.civilite === 'Madame' ? 'F' : 'M',
      address: {
        street: formValue.adresse,
        postalCode: formValue.codePostal,
        city: formValue.ville,
      },
      email: formValue.email,
      phoneNumber: formValue.telephone,
      socialSecurityNumber: formValue.socialSecurityNumber,
      regime: 'GENERAL', // Default value, not in this form
      situation: formValue.etatCivil,
      addressType: formValue.addressType,
    };

    const quoteForm: InsuranceQuoteForm = {
      productReference: formValue.productReference,
      insuredPersons: [mainInsured],
      contact: {
        email: mainInsured.email,
        phoneNumber: mainInsured.phoneNumber,
        address: mainInsured.address,
      },
      effectDate: new Date(formValue.dateEffetSouhaitee),
      garanties: [], // Not used in the new flow from this form
      coverageOptions: formValue.garanties.map((garantie: string) => ({
        guaranteeType: garantie,
        coveragePercentage: 100,
        levelCode: '04', // Default value
      })),
    };

    this.messageService.add({
      severity: 'info',
      summary: 'Redirection',
      detail: 'Préparation du comparateur santé...',
    });

    this.router.navigate(['/compare'], {
      state: { insuranceData: quoteForm },
    });
  }
}
