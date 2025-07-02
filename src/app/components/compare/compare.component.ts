import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray, AbstractControl, ReactiveFormsModule } from '@angular/forms';
import { CommonModule, DOCUMENT, formatDate } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';

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
import { ResultatComparaison, BesoinClient } from '../../models/comparateur.model';
import { MessageService } from 'primeng/api';
import { startWith, finalize } from 'rxjs/operators';

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
  markdownResult: string = '';
  minDate: Date;

  civiliteOptions = [{ label: 'Monsieur', value: 'Monsieur' }, { label: 'Madame', value: 'Madame' }];
  sexeOptions = [{ label: 'Garçon', value: 'garcon' }, { label: 'Fille', value: 'fille' }];
  EtatcivilOptions = [
    { label: 'Célibataire', value: 'celibataire' },
    { label: 'Marié(e)', value: 'marie' },
    { label: 'Parent isolé', value: 'parentIsole' },
    { label: 'Séparé(e)', value: 'separe' },
    { label: 'Union libre', value: 'unionLibre' },
    { label: 'Veuf(ve)', value: 'veuf' },
    { label: 'Non déclaré', value: 'situationNonDeclaree' }
  ];
  regimeOptions = [
    { label: 'Salarié', value: 'salarie' },
    { label: 'Travailleur non salarié', value: 'tns' },
    { label: 'Exploitant agricole', value: 'exploitant_agricole' },
    { label: 'Salarié agricole', value: 'salarie_agricole' },
    { label: 'Alsace-Moselle', value: 'alsace_moselle' },
    { label: 'Fonction publique', value: 'fonction_publique' },
    { label: 'Retraité salarié', value: 'retraite_salarie' },
    { label: 'Retraité TNS', value: 'retraite_tns' },
    { label: 'Retraité Alsace-Moselle', value: 'retraite_alsace_moselle' },
    { label: 'Étudiant', value: 'etudiant' }
  ];

  constructor(
    private fb: FormBuilder,
    private compareService: CompareService,
    private messageService: MessageService
  ) {
    this.minDate = new Date();
    this.minDate.setDate(this.minDate.getDate() + 1);
  }

  ngOnInit(): void {
    this.initializeForm();
    this.initializeSteps();
    this.setupConjointListener();
  }

  initializeForm(): void {
    this.insuranceForm = this.fb.group({
      personalInfo: this.fb.group({
        civilite: ['Monsieur', Validators.required],
        nom: ['', Validators.required],
        prenom: ['', Validators.required],
        dateNaissance: [null, Validators.required],
        adresse: ['', Validators.required],
        complementAdresse: [''], // Champ texte libre, pas de validation requise
        codePostal: ['', [Validators.required, Validators.pattern(/^\d{5}$/)]],
        ville: ['', Validators.required],
        dateEffet: [null, [Validators.required, this.dateFutureValidator.bind(this)]],
        email: ['', [Validators.required, Validators.email]],
        telephone1: ['', Validators.required],
        etatCivil: ['celibataire', Validators.required],
        conjoint: this.fb.group({
          civilite: ['Monsieur'],
          nom: [''],
          prenom: [''],
          email: ['', Validators.email],
          dateNaissance: [null],
          regime: ['GENERAL'],
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
      conjointGroup.disable(); // Désactivé par défaut
    }
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
      today.setHours(0, 0, 0, 0); // Ignorer l'heure pour la comparaison
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
        if (this.activeIndex === 1) { // Si on est à l'étape des sliders, on soumet
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
      // Naviguer vers la première étape invalide
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
          this.markdownResult = response.table;
          this.activeIndex = 2; // Aller à l'étape des résultats
          this.messageService.add({ severity: 'success', summary: 'Comparaison Réussie', detail: `Les résultats sont prêts.` });
        },
        error: (err) => {
          this.markdownResult = '';
          this.submitting = false;
          this.activeIndex = 2; // Navigate to results page to show feedback
          this.messageService.add({ severity: 'error', summary: 'Erreur de Comparaison', detail: 'Aucun résultat trouvé ou une erreur est survenue.' });
        }
      });
  }

  loadExampleData(): void {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    this.insuranceForm.patchValue({
      personalInfo: {
        civilite: 'Monsieur',
        nom: 'Dupont',
        prenom: 'Jean',
        dateNaissance: new Date('1985-03-15'),
        adresse: '123 Rue de la Paix',
        complementAdresse: 'Apt 101',
        codePostal: '75001',
        ville: 'PARIS',
        email: 'jean.dupont@example.com',
        telephone1: '0123456789',
        etatCivil: 'celibataire',
        dateEffet: tomorrow,
      },
      coverageSliders: {
        hospitalisation: 200,
        chambreParticuliere: 70,
        honorairesSpecialistes: 250,
        dentaire: 150,
        orthodontie: 300,
        forfaitDentaire: 500,
        forfaitOptique: 400,
      }
    });
    this.messageService.add({ severity: 'info', summary: 'Données chargées', detail: 'Les données d\'exemple ont été chargées.' });
  }

  resetForm(): void {
    this.insuranceForm.reset();
    this.enfants.clear();
    this.initializeForm(); // Réinitialise avec les valeurs par défaut
    this.setupConjointListener();
    this.activeIndex = 0;
    this.markdownResult = '';
    this.messageService.add({ severity: 'info', summary: 'Formulaire réinitialisé', detail: 'Le formulaire a été vidé.' });
  }

  hasResults(): boolean {
    return this.markdownResult.length > 0;
  }
} 