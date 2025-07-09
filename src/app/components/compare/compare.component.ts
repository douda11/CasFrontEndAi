import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray, AbstractControl, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { Router } from '@angular/router';

// PrimeNG imports
import { StepsModule } from 'primeng/steps';
import { MenuItem } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { SliderModule } from 'primeng/slider';
import { PanelModule } from 'primeng/panel';
import { DropdownModule } from 'primeng/dropdown';
import { RadioButtonModule } from 'primeng/radiobutton';
import { CalendarModule } from 'primeng/calendar';
import { InputTextModule } from 'primeng/inputtext';
import { InputMaskModule } from 'primeng/inputmask';
import { ButtonModule } from 'primeng/button';
import { DividerModule } from 'primeng/divider';
import { TooltipModule } from 'primeng/tooltip';
import { InputNumberModule } from 'primeng/inputnumber';
import { CheckboxModule } from 'primeng/checkbox';
import { CardModule } from 'primeng/card';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { AccordionModule } from 'primeng/accordion';
import { TabViewModule } from 'primeng/tabview';
import { MarkdownModule } from 'ngx-markdown';

// App services and models
import { CompareService } from '../../services/compare.service';
import { InsuranceService } from '../../services/insurance.service';
import { BesoinClient } from '../../models/comparateur.model';
import { InsuranceQuoteForm, InsuredPerson } from '../../models/project-model';
import { MessageService } from 'primeng/api';
import { startWith, finalize } from 'rxjs/operators';

interface GuaranteeValues {
  hospitalisation: number;
  honoraires: number;
  chambreParticuliere: number;
  dentaire: number;
  orthodontie: number;
  forfaitDentaire: number;
  forfaitOptique: number;
}

interface ComparisonResult {
  assurance: string;
  formule: string;
  logo: string;
  prix: string;
  garanties: GuaranteeValues;
  correspondencePercentage: number;
  weakPoint: string;
}

interface GarantieDefinition {
  label: string;
  formControlName: keyof GuaranteeValues;
  unit: '%' | '€';
}

@Component({
  selector: 'app-compare',
  templateUrl: './compare.component.html',
  styleUrls: ['./compare.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    HttpClientModule,
    ReactiveFormsModule,
    StepsModule,
    ToastModule,
    SliderModule,
    PanelModule,
    DropdownModule,
    RadioButtonModule,
    CalendarModule,
    InputTextModule,
    InputMaskModule,
    ButtonModule,
    DividerModule,
    TooltipModule,
    InputNumberModule,
    CheckboxModule,
    CardModule,
    ProgressSpinnerModule,
    AccordionModule,
    TabViewModule,
    MarkdownModule
  ]
})
export class CompareComponent implements OnInit {
  insuranceForm!: FormGroup;
  steps!: MenuItem[];
  activeIndex = 0;
  submitting = false;
  minDate: Date;
  comparisonResults: ComparisonResult[] = [];
  garanties: GarantieDefinition[] = [];

  civiliteOptions = [
    { label: 'Monsieur', value: 'M' },
    { label: 'Madame', value: 'F' },
  ];

  regimeOptions = [
    { label: 'TNS', value: 'TNS' },
    // Add other options here when available
  ];

  EtatcivilOptions = [
    { label: 'Célibataire', value: 'celibataire' },
    { label: 'Marié(e)', value: 'marie' },
    { label: 'Parent isolé', value: 'parentIsole' },
    { label: 'Séparé(e)', value: 'separe' },
    { label: 'Union libre', value: 'unionLibre' },
    { label: 'Veuf(ve)', value: 'veuf' },
    { label: 'Non déclaré', value: 'situationNonDeclaree' }
  ];
  sexeOptions = [{ label: 'Garçon', value: 'garcon' }, { label: 'Fille', value: 'fille' }];

  constructor(
    private fb: FormBuilder,
    private compareService: CompareService,
    private insuranceService: InsuranceService,
    private messageService: MessageService,
    private router: Router
  ) {
    const today = new Date();
    this.minDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
  }

  ngOnInit(): void {
    this.initializeForm();
    this.initializeSteps();
    this.setupConjointListener();
    this.setupGaranties();
  }

  initializeForm(): void {
    this.insuranceForm = this.fb.group({
      personalInfo: this.fb.group({
        civilite: ['Monsieur', Validators.required],
        nom: ['', Validators.required],
        prenom: ['', Validators.required],
        dateNaissance: [null, Validators.required],
        adresse: ['', Validators.required],
        complementAdresse: [''],
        codePostal: ['', [Validators.required, Validators.pattern(/^\d{5}$/)]],
        ville: ['', Validators.required],
        dateEffet: [this.minDate, Validators.required],
        email: ['', [Validators.required, Validators.email]],
        telephone1: ['', Validators.required],
        etatCivil: [null, Validators.required],
        regime: [null, Validators.required],
        conjoint: this.fb.group({
          civilite: [''],
          nom: [''],
          prenom: [''],
          email: ['', Validators.email],
          dateNaissance: [null],
          regime: ['']
        }),
        enfants: this.fb.array([]),
      }),
      coverageSliders: this.fb.group({
        hospitalisation: [0],
        chambreParticuliere: [50],
        honoraires: [0],
        dentaire: [0],
        orthodontie: [0],
        forfaitDentaire: [100],
        forfaitOptique: [100],
      }),
    });
  }

  setupConjointListener(): void {
    const conjointGroup = this.insuranceForm.get('personalInfo.conjoint');
    const etatCivilControl = this.insuranceForm.get('personalInfo.etatCivil');

    if (etatCivilControl && conjointGroup) {
      etatCivilControl.valueChanges.pipe(startWith(etatCivilControl.value)).subscribe(etatCivil => {
        if (etatCivil === 'marie' || etatCivil === 'unionLibre') {
          conjointGroup.enable();
        } else {
          conjointGroup.reset({ civilite: 'Monsieur', nom: '', prenom: '', email: '', dateNaissance: null, regime: 'GENERAL' });
          conjointGroup.disable();
        }
      });
      conjointGroup.disable();
    }
  }

  setupGaranties(): void {
    this.garanties = [
      { label: 'Hospitalisation', formControlName: 'hospitalisation', unit: '%' },
      { label: 'Honoraires', formControlName: 'honoraires', unit: '%' },
      { label: 'Orthodontie', formControlName: 'orthodontie', unit: '%' },
      { label: 'Forfait Optique', formControlName: 'forfaitOptique', unit: '€' },
      { label: 'Forfait Dentaire', formControlName: 'forfaitDentaire', unit: '€' },
      { label: 'Dentaire', formControlName: 'dentaire', unit: '%' },
      { label: 'Chambre Particulière', formControlName: 'chambreParticuliere', unit: '€' },
    ];
  }

  initializeSteps(): void {
    this.steps = [
      { label: 'Informations personnelles', command: () => this.goToStep(0) },
      { label: 'Comparer', command: () => this.goToStep(1) },
      { label: 'Résultat', command: () => this.goToStep(2) },
    ];
  }

  dateFutureValidator(control: AbstractControl): { [key: string]: boolean } | null {
    if (control.value) {
      const selectedDate = new Date(control.value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedDate <= today) {
        return { 'dateInPast': true };
      }
    }
    return null;
  }

  get enfants(): FormArray {
    return this.insuranceForm.get('personalInfo.enfants') as FormArray;
  }

  createEnfantFormGroup(): FormGroup {
    return this.fb.group({
      civilite: ['Monsieur', Validators.required],
      nom: ['', Validators.required],
      prenom: ['', Validators.required],
      dateNaissance: [null, Validators.required],
      regime: ['GENERAL', Validators.required],
    });
  }

  addEnfant(): void {
    this.enfants.push(this.createEnfantFormGroup());
  }

  removeEnfant(index: number): void {
    this.enfants.removeAt(index);
  }

  private getCurrentStepGroup(stepIndex: number): FormGroup | null {
    const stepGroups = ['personalInfo', 'coverageSliders'];
    return stepGroups[stepIndex] ? this.insuranceForm.get(stepGroups[stepIndex]) as FormGroup : null;
  }

  private markStepAsTouched(stepIndex: number): void {
    const group = this.getCurrentStepGroup(stepIndex);
    if (group) {
      group.markAllAsTouched();
    }
  }

  nextStep(): void {
    const currentGroup = this.getCurrentStepGroup(this.activeIndex);
    if (currentGroup && !currentGroup.valid) {
      this.markStepAsTouched(this.activeIndex);
      this.messageService.add({
        severity: 'warn',
        summary: 'Champs manquants ou invalides',
        detail: 'Certains champs sont requis. Vous pouvez continuer, mais le formulaire final sera invalide.',
      });
    }

    if (this.activeIndex < this.steps.length - 1) {
      if (this.activeIndex === 1) {
        this.submitComparison();
      } else {
        this.activeIndex++;
      }
    }
  }

  prevStep(): void {
    if (this.activeIndex > 0) {
      this.activeIndex--;
    }
  }

  goToStep(index: number): void {
    if (index < this.activeIndex) {
      this.activeIndex = index;
      return;
    }

    for (let i = 0; i < index; i++) {
      const stepGroup = this.getCurrentStepGroup(i);
      if (stepGroup && stepGroup.invalid) {
        this.activeIndex = i;
        this.markStepAsTouched(i);
        this.messageService.add({
          severity: 'warn',
          summary: 'Étape précédente invalide',
          detail: 'Veuillez compléter les étapes précédentes avant de continuer.',
        });
        return;
      }
    }
    this.activeIndex = index;
  }

  submitComparison(): void {
    this.insuranceForm.markAllAsTouched();
    if (this.insuranceForm.invalid) {
      this.messageService.add({
        severity: 'error',
        summary: 'Formulaire Invalide',
        detail: 'Veuillez remplir tous les champs obligatoires correctement avant de soumettre.',
      });
      for (let i = 0; i <= 1; i++) {
        const stepGroup = this.getCurrentStepGroup(i);
        if (stepGroup && stepGroup.invalid) {
          this.activeIndex = i;
          break;
        }
      }
      return;
    }

    this.submitting = true;
    const coverageSliders = this.insuranceForm.get('coverageSliders')?.value;
    const needs: BesoinClient = coverageSliders;

    this.compareService.getComparisonResults(needs)
      .pipe(finalize(() => { this.submitting = false; }))
      .subscribe({
        next: (response) => {
          if (response && response.table) {
            console.log('--- RAW MARKDOWN FROM BACKEND ---');
            console.log(response.table);
            console.log('---------------------------------');
            this.comparisonResults = this.parseMarkdownTable(response.table);
            if (this.comparisonResults.length === 0) {
              this.messageService.add({ severity: 'error', summary: 'Erreur de données', detail: 'Les résultats de la comparaison sont dans un format inattendu.' });
            }
          } else {
            this.comparisonResults = [];
          }
          this.activeIndex = 2;
          this.messageService.add({ severity: 'success', summary: 'Comparaison Réussie', detail: `Les résultats sont prêts.` });
        },
        error: (err) => {
          this.comparisonResults = [];
          this.submitting = false;
          this.activeIndex = 2;
          this.messageService.add({ severity: 'error', summary: 'Erreur de Comparaison', detail: 'Aucun résultat trouvé ou une erreur est survenue.' });
        }
      });
  }

  private parseMarkdownTable(markdown: string): ComparisonResult[] {
    if (!markdown || typeof markdown !== 'string') {
      return [];
    }

    const lines = markdown.trim().split('\n').filter(line => line.trim().startsWith('|'));
    if (lines.length < 3) {
      return [];
    }

    const dataRows = lines.slice(2);

    const extractValue = (text: string, keywords: string[]): number => {
      for (const keyword of keywords) {
        const regex = new RegExp(`${keyword}[^\\d]*(\\d+)`, 'i');
        const match = text.match(regex);
        if (match && match[1]) {
          const value = parseFloat(match[1]);
          return isNaN(value) ? 0 : value;
        }
      }
      return 0;
    };

    const results = dataRows.map(row => {
      const cells = row.split('|').map(c => c.trim()).slice(1, -1);
      console.log('Parsing row. Detected cells:', cells.length, cells);
      if (cells.length < 4) { // On attend maintenant au moins 4 colonnes
        console.warn('Skipping row, not enough columns:', row);
        return null;
      }

      const contratText = cells[0];
      // Les colonnes ont changé de position
      const correspondencePercentageText = cells[1] || '0%';
      const pointsFortsText = cells[2];
      const weakPointText = cells.length > 3 ? cells[3] : ''; // Le point faible est dans la 4ème colonne
      const allBenefitsText = pointsFortsText + ' ' + weakPointText; // On combine les deux

      const contratParts = contratText.split(' ');
      const assurance = contratParts[0] || 'N/A';
      const formule = contratParts.slice(1).join(' ') || 'N/A';

      const guaranteeKeywords = {
        hospitalisation: ['Hospitalisation'],
        honoraires: ['SOINS COURANTS', 'Honoraires'],
        chambreParticuliere: ['Chambre particulière'],
        dentaire: ['Dentaire', 'Soins dentaires'],
        orthodontie: ['Orthodontie'],
        forfaitDentaire: ['Forfait dentaire', 'implantologie'],
        forfaitOptique: ['Forfait optique', 'Optique']
      };

      const garanties: GuaranteeValues = {
        hospitalisation: extractValue(allBenefitsText, guaranteeKeywords.hospitalisation),
        honoraires: extractValue(allBenefitsText, guaranteeKeywords.honoraires),
        chambreParticuliere: extractValue(allBenefitsText, guaranteeKeywords.chambreParticuliere),
        dentaire: extractValue(allBenefitsText, guaranteeKeywords.dentaire),
        orthodontie: extractValue(allBenefitsText, guaranteeKeywords.orthodontie),
        forfaitDentaire: extractValue(allBenefitsText, guaranteeKeywords.forfaitDentaire),
        forfaitOptique: extractValue(allBenefitsText, guaranteeKeywords.forfaitOptique),
      };

      const correspondencePercentage = parseFloat(correspondencePercentageText.replace('%', '')) || 0;

      return {
        assurance: assurance,
        formule: formule,
        logo: '',
        prix: '',
        garanties: garanties,
        correspondencePercentage: correspondencePercentage,
        weakPoint: weakPointText || 'N/A', // On affiche le point faible, ou N/A s'il est vide
      };
    }).filter((result): result is ComparisonResult => result !== null);

    return results;
  }

  getCoverageClass(coverage: number, needed: number): string {
    if (needed === 0) return '';
    return coverage >= needed ? 'coverage-good' : 'coverage-bad';
  }

  loadExampleData(): void {
    this.insuranceForm.get('personalInfo')?.patchValue({
      civilite: 'M',
      nom: 'Dupont',
      prenom: 'Jean',
      dateNaissance: new Date('1980-05-15'),
      regime: 'TNS',
      etatCivil: 'celibataire',
      adresse: '123 Rue de Paris',
      codePostal: '75001',
      ville: 'Paris',
      complementAdresse: 'Apt 101',
      dateEffet: new Date(),
      email: 'jean.dupont@example.com',
      telephone1: '0612345678'
    });

    // Clear existing children
    const enfantsArray = this.insuranceForm.get('personalInfo.enfants') as FormArray;
    while (enfantsArray.length) {
      enfantsArray.removeAt(0);
    }

    this.messageService.add({ severity: 'success', summary: 'Données chargées', detail: 'Les données d\'exemple pour l\'assuré principal ont été chargées.' });
  }

  resetForm(): void {
    this.insuranceForm.reset();
    this.enfants.clear();
    this.initializeForm();
    this.setupConjointListener();
    this.activeIndex = 0;
    this.comparisonResults = [];
    this.messageService.add({ severity: 'info', summary: 'Formulaire réinitialisé', detail: 'Le formulaire a été vidé.' });
  }

  hasResults(): boolean {
    return this.comparisonResults && this.comparisonResults.length > 0;
  }

  selectOffer(offer: any): void {
    console.log('Offre sélectionnée pour tarification :', offer);
    this.submitting = true;

    const personalInfo = this.insuranceForm.get('personalInfo')?.value;
    const familyInfo = this.insuranceForm.get('familyInfo')?.value;

    const mainInsured: InsuredPerson = {
      lastName: personalInfo.nom,
      firstName: personalInfo.prenom,
      birthDate: personalInfo.dateNaissance,
      gender: personalInfo.civilite,
      address: {
        street: personalInfo.adresse,
        postalCode: personalInfo.codePostal,
        city: personalInfo.ville,
      },
      email: personalInfo.email,
      phoneNumber: personalInfo.telephone1,
      regime: personalInfo.regime,
      situation: personalInfo.etatCivil,
      addressType: personalInfo.addressType,
    };

    const insuredPersons: InsuredPerson[] = [mainInsured];

    // Add spouse if exists
    if (personalInfo.etatCivil === 'marie' && personalInfo.conjoint) {
        const conjoint: InsuredPerson = {
            lastName: personalInfo.conjoint.nom,
            firstName: personalInfo.conjoint.prenom,
            birthDate: personalInfo.conjoint.dateNaissance,
            gender: personalInfo.conjoint.civilite,
            address: mainInsured.address, // Assuming same address
            email: personalInfo.conjoint.email,
            phoneNumber: '', // No phone for spouse in form
            regime: personalInfo.conjoint.regime,
            situation: 'Marie',
            addressType: mainInsured.addressType // Assuming same address type as main insured
        };
        insuredPersons.push(conjoint);
    }

    // Add children if they exist
    const enfantsArray = this.insuranceForm.get('familyInfo.enfants') as FormArray;
    if (enfantsArray && enfantsArray.length > 0) {
      enfantsArray.controls.forEach(control => {
        const enfantValue = control.value;
        const enfant: InsuredPerson = {
          lastName: personalInfo.nom, // Assuming same last name
          firstName: enfantValue.prenom,
          birthDate: enfantValue.dateNaissance,
          gender: enfantValue.civilite,
          address: mainInsured.address, // Assuming same address
          email: '', // No email for children in form
          phoneNumber: '', // No phone for children in form
          regime: 'GENERAL', // Default regime for children
          situation: 'Celibataire',
          addressType: mainInsured.addressType // Assuming same address type as main insured
        };
        insuredPersons.push(enfant);
      });
    }

    const quoteForm: InsuranceQuoteForm = {
      productReference: offer.nomDeLOffre,
      insuredPersons: insuredPersons,
      contact: {
        email: personalInfo.email,
        phoneNumber: personalInfo.telephone1,
        address: mainInsured.address,
      },
      effectDate: personalInfo.dateEffet,
      garanties: [],
      coverageOptions: [] // Added to satisfy interface
    };

    this.insuranceService.getAprilHealthTarif(quoteForm).pipe(
      finalize(() => {
        this.submitting = false;
      })
    ).subscribe({
      next: (response) => {
        console.log('API Response:', response);
        // Assuming the response has a 'data' array with pricing info
        const tarifGlobal = response.data?.find((d: any) => d.priceType === 'TarifGlobal');
        if (tarifGlobal) {
            this.messageService.add({
                severity: 'success',
                summary: 'Tarif Obtenu',
                detail: `Le tarif mensuel pour l'offre ${offer.nomDeLOffre} est de ${tarifGlobal.contribution.contributionAmount} €.`
            });
        } else {
            throw new Error('Tarif non trouvé dans la réponse.');
        }
      },
      error: (err) => {
        console.error('Erreur API:', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur de tarification',
          detail: 'Une erreur est survenue lors de la récupération du tarif. Veuillez réessayer.'
        });
      }
    });
  }
}
