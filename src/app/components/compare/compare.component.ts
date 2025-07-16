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
  chambreParticuliere: number;
  honoraires: number;
  dentaire: number;
  orthodontie: number;
  forfaitDentaire: number;
  forfaitOptique: number;
}

interface ComparisonResult {
  assurance: string;
  formule: string;
  logo: string;
  prix: string | number;
  garanties: GuaranteeValues;
  correspondencePercentage: number;
  weakPoint: string;
  isAprilProduct?: boolean;
  isPricingLoading?: boolean;
  tarifGlobal?: number;
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
    CommonModule, HttpClientModule, ReactiveFormsModule, StepsModule, ToastModule, SliderModule, PanelModule,
    DropdownModule, RadioButtonModule, CalendarModule, InputTextModule, InputMaskModule, ButtonModule, DividerModule,
    TooltipModule, InputNumberModule, CheckboxModule, CardModule, ProgressSpinnerModule, AccordionModule, TabViewModule,
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

  civiliteOptions = [{ label: 'Monsieur', value: 'M' }, { label: 'Madame', value: 'F' }];
  regimeOptions = [{ label: 'TNS', value: 'TNS' }];
  EtatcivilOptions = [
    { label: 'Célibataire', value: 'celibataire' }, { label: 'Marié(e)', value: 'marie' },
    { label: 'Parent isolé', value: 'parentIsole' }, { label: 'Séparé(e)', value: 'separe' },
    { label: 'Union libre', value: 'unionLibre' }, { label: 'Veuf(ve)', value: 'veuf' },
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

    const navigation = this.router.getCurrentNavigation();
    const state = navigation?.extras.state as { insuranceData: InsuranceQuoteForm };

    if (state?.insuranceData) {
      const data = state.insuranceData;
      const mainInsured = data.insuredPersons[0];

      this.insuranceForm.patchValue({
        personalInfo: {
          civilite: mainInsured.gender,
          nom: mainInsured.lastName,
          prenom: mainInsured.firstName,
          dateNaissance: new Date(mainInsured.birthDate),
          email: mainInsured.email,
          telephone1: mainInsured.phoneNumber,
          codePostal: mainInsured.address.postalCode,
          regime: mainInsured.regime,
          dateEffet: new Date(data.effectDate),
          etatCivil: mainInsured.situation
        }
      });

      this.submitComparison();
    }
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
          civilite: [''], nom: [''], prenom: [''],
          email: ['', Validators.email], dateNaissance: [null], regime: ['']
        }),
        enfants: this.fb.array([]),
      }),
      coverageSliders: this.fb.group({
        hospitalisation: [0], chambreParticuliere: [50], honoraires: [0],
        dentaire: [0], orthodontie: [0], forfaitDentaire: [100], forfaitOptique: [100],
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
          conjointGroup.reset();
          conjointGroup.disable();
        }
      });
      conjointGroup.disable();
    }
  }

  setupGaranties(): void {
    this.garanties = [
      { label: 'Hospitalisation', formControlName: 'hospitalisation', unit: '%' },
      { label: 'Chambre Particulière', formControlName: 'chambreParticuliere', unit: '€' },
      { label: 'Honoraires', formControlName: 'honoraires', unit: '%' },
      { label: 'Dentaire', formControlName: 'dentaire', unit: '%' },
      { label: 'Forfait Optique', formControlName: 'forfaitOptique', unit: '€' },
      { label: 'Orthodontie', formControlName: 'orthodontie', unit: '%' },
      { label: 'Forfait Dentaire', formControlName: 'forfaitDentaire', unit: '€' },
    ];
  }

  initializeSteps(): void {
    this.steps = [
      { label: 'Informations personnelles', command: () => this.goToStep(0) },
      { label: 'Comparer', command: () => this.goToStep(1) },
      { label: 'Résultat', command: () => this.goToStep(2) },
    ];
  }

  get enfants(): FormArray {
    return this.insuranceForm.get('personalInfo.enfants') as FormArray;
  }

  addEnfant(): void {
    this.enfants.push(this.fb.group({
      civilite: ['Monsieur', Validators.required],
      nom: ['', Validators.required],
      prenom: ['', Validators.required],
      dateNaissance: [null, Validators.required],
      regime: ['GENERAL', Validators.required],
    }));
  }

  removeEnfant(index: number): void {
    this.enfants.removeAt(index);
  }

  private getCurrentStepGroup(stepIndex: number): FormGroup | null {
    const stepGroups = ['personalInfo', 'coverageSliders'];
    return stepGroups[stepIndex] ? this.insuranceForm.get(stepGroups[stepIndex]) as FormGroup : null;
  }

  nextStep(): void {
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
    this.activeIndex = index;
  }

  submitComparison(): void {
    this.insuranceForm.markAllAsTouched();
    if (this.insuranceForm.invalid) {
      this.messageService.add({ severity: 'error', summary: 'Formulaire Invalide', detail: 'Veuillez remplir tous les champs.' });
      return;
    }
    this.submitting = true;
    const needs: BesoinClient = this.insuranceForm.get('coverageSliders')?.value;

    this.compareService.getComparisonResults(needs)
      .pipe(finalize(() => { this.submitting = false; }))
      .subscribe({
        next: (response: any) => {
          if (response && response.table) {
            this.comparisonResults = this.parseMarkdownTable(response.table);
            this.fetchAprilPrices();

            if (response.utwinResponse) {
              if (response.utwinResponse.propositions) {
                this.handleUtwinSuccess(response.utwinResponse);
              }
              if (response.utwinResponse.messages) {
                this.handleUtwinBusinessErrors(response.utwinResponse.messages);
              }
            }
          }
          this.activeIndex = 2;
          this.messageService.add({ severity: 'success', summary: 'Comparaison Terminée', detail: 'Les résultats sont disponibles.' });
        },
        error: (err) => {
          this.submitting = false;
          this.activeIndex = 2;
          if (err.status === 400 && err.error) {
            if (err.error.messages) {
              this.handleUtwinBusinessErrors(err.error.messages);
            }
            if (err.error.propositions && err.error.propositions.length > 0) {
              this.handleUtwinSuccess(err.error);
            }
            if (err.error.table) { // Handle markdown table even in case of 400 error
                this.comparisonResults = this.parseMarkdownTable(err.error.table);
                this.fetchAprilPrices();
            }
          } else {
            this.messageService.add({ severity: 'error', summary: 'Erreur Technique', detail: 'Une erreur inattendue est survenue.' });
          }
        }
      });
  }

  private handleUtwinSuccess(utwinResponse: any): void {
    utwinResponse.propositions.forEach((prop: any) => {
      const resultToUpdate = this.comparisonResults.find(r => prop.libelleCommercial.toLowerCase().includes(r.formule.toLowerCase()));
      if (resultToUpdate) {
        resultToUpdate.prix = prop.cotisationMensuelleEuros;
      }
    });
  }

  private handleUtwinBusinessErrors(messages: any[]): void {
    messages.forEach(msg => {
      this.messageService.add({ severity: 'warn', summary: `Avertissement Utwin: ${msg.code}`, detail: msg.libelle, sticky: true });
    });
  }

  private transformFormToQuote(): InsuranceQuoteForm {
    const personalInfo = this.insuranceForm.get('personalInfo')?.value;
    const insuredPersons: InsuredPerson[] = [];

    // Main person
    insuredPersons.push({
      lastName: personalInfo.nom,
      firstName: personalInfo.prenom,
      birthDate: personalInfo.dateNaissance,
      gender: personalInfo.civilite,
      address: {
        street: personalInfo.adresse,
        postalCode: personalInfo.codePostal,
        city: personalInfo.ville
      },
      email: personalInfo.email,
      phoneNumber: personalInfo.telephone1,
      regime: personalInfo.regime,
      situation: personalInfo.etatCivil,
      addressType: 'Actuelle'
    });

    // Conjoint
    if (personalInfo.conjoint && (personalInfo.etatCivil === 'marie' || personalInfo.etatCivil === 'unionLibre')) {
      insuredPersons.push({
        lastName: personalInfo.conjoint.nom,
        firstName: personalInfo.conjoint.prenom,
        birthDate: personalInfo.conjoint.dateNaissance,
        gender: personalInfo.conjoint.civilite,
        address: insuredPersons[0].address,
        email: personalInfo.conjoint.email,
        phoneNumber: '',
        regime: personalInfo.conjoint.regime,
        situation: personalInfo.etatCivil,
        addressType: 'Actuelle'
      });
    }

    // Enfants
    personalInfo.enfants.forEach((enfant: any) => {
      insuredPersons.push({
        lastName: enfant.nom,
        firstName: enfant.prenom,
        birthDate: enfant.dateNaissance,
        gender: enfant.sexe === 'garcon' ? 'M' : 'F',
        address: insuredPersons[0].address,
        email: '',
        phoneNumber: '',
        regime: enfant.regime,
        situation: 'celibataire',
        addressType: 'Actuelle'
      });
    });

    return {
      productReference: '',
      insuredPersons: insuredPersons,
      contact: {
        email: personalInfo.email,
        phoneNumber: personalInfo.telephone1,
        address: insuredPersons[0].address
      },
      effectDate: personalInfo.dateEffet,
      garanties: []
    };
  }

  private parseMarkdownTable(markdown: string): ComparisonResult[] {
    if (!markdown || typeof markdown !== 'string') return [];

    const lines = markdown.trim().split('\n').filter(line => line.trim().startsWith('|'));
    if (lines.length < 3) return [];

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

    return dataRows.map((row): ComparisonResult | null => {
      const cells = row.split('|').map(c => c.trim()).slice(1, -1);
      if (cells.length < 4) return null;

      const contratText = cells[0];
      const correspondencePercentageText = cells[1] || '0%';
      const pointsFortsText = cells[2];
      const weakPointText = cells.length > 3 ? cells[3] : '';
      const allBenefitsText = pointsFortsText + ' ' + weakPointText;

      const contratParts = contratText.split(' ');
      const formule = contratParts.slice(1).join(' ') || 'N/A';

      const guaranteeKeywords = {
        hospitalisation: ['Hospitalisation'],
        honoraires: ['SOINS COURANTS', 'Honoraires'],
        chambreParticuliere: ['Chambre particulière'],
        dentaire: ['Dentaire', 'Soins dentaires'],
        forfaitDentaire: ['Forfait dentaire', 'implantologie'],
        orthodontie: ['Orthodontie'],
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

      return {
        assurance: cells[0].trim().replace(/\*/g, ''),
        formule: formule,
        logo: '',
        prix: 'N/A',
        correspondencePercentage: parseFloat(correspondencePercentageText.replace('%', '')) || 0,
        weakPoint: weakPointText || 'N/A',
        garanties: garanties,
      };
    }).filter((result): result is ComparisonResult => result !== null);
  }

  onFormuleSelect(offer: any): void {
    console.log('Offre sélectionnée pour tarification :', offer);
    this.submitting = true;

    const quoteForm = this.transformFormToQuote();

    const tarifService = offer.assurance.toLowerCase().includes('utwin')
      ? this.insuranceService.getUtwinTarif(quoteForm, offer.formule)
      : this.insuranceService.getAprilHealthTarif(quoteForm, offer.assurance, offer.formule);

    tarifService.pipe(
      finalize(() => { this.submitting = false; })
    ).subscribe({
      next: (response: any) => {
        console.log('API Response for ' + offer.assurance + ':', response);
        let tarifAmount: number | null = null;

        if (offer.assurance.toLowerCase().includes('utwin')) {
          // Handle UTWIN response, which might be an array or an object with a 'propositions' key
          const propositions = Array.isArray(response) ? response : response?.propositions;
          if (propositions && Array.isArray(propositions)) {
            // Parse the formula string, e.g., "MULTI' Santé - Niveau 3"
            const formulaParts = offer.formule.match(/(.+) Niveau (\d+)/);

            if (formulaParts && formulaParts.length === 3) {
              const libelleProduit = formulaParts[1].trim();
              const niveau = formulaParts[2];
              const codeFormuleToFind = `N${niveau}`; // e.g., "N3"

              console.log(`Searching for: libelleProduit='${libelleProduit}', codeFormule='${codeFormuleToFind}'`);

              const proposition = propositions.find((p: any) => 
                p.libelleProduit === libelleProduit && p.codeFormule === codeFormuleToFind
              );

              if (proposition && proposition.cotisationMensuelleEuros) {
                tarifAmount = proposition.cotisationMensuelleEuros;
              }
            } else {
                console.warn(`Formule format not recognized: ${offer.formule}`);
            }
          }
        } else {
          // Handle APRIL response
          const tarifGlobal = response.data?.find((d: any) => d.priceType === 'TarifGlobal');
          if (tarifGlobal && tarifGlobal.contribution?.contributionAmount) {
            tarifAmount = tarifGlobal.contribution.contributionAmount;
          }
        }

        if (tarifAmount !== null) {
          // Find the offer in the main results list and update its price
          const resultToUpdate = this.comparisonResults.find((r: ComparisonResult) => r.assurance === offer.assurance && r.formule === offer.formule);
          if (resultToUpdate) {
            resultToUpdate.prix = tarifAmount;
          }

          this.messageService.add({
            severity: 'success',
            summary: 'Tarif Obtenu',
            detail: `Le tarif mensuel pour l'offre ${offer.formule} est de ${tarifAmount} €.`
          });
        } else {
          console.error('Tarif non trouvé pour', offer.assurance);
          this.messageService.add({
            severity: 'warn',
            summary: 'Tarif non disponible',
            detail: `Le tarif pour l'offre ${offer.formule} n'a pas pu être récupéré.`
          });
        }
      },
      error: (err: any) => {
        console.error('Erreur API pour', offer.assurance, err);
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur de tarification',
          detail: 'Une erreur est survenue lors de la récupération du tarif. Veuillez réessayer.'
        });
      }
    });
  }

  private fetchAprilPrices(): void {
    const quoteForm = this.transformFormToQuote();
    this.comparisonResults.forEach(result => {
      if (result.assurance?.toLowerCase().includes('april')) {
        result.isAprilProduct = true;
        result.isPricingLoading = true;
        this.insuranceService.getAprilHealthTarif(quoteForm, result.assurance, result.formule).pipe(
          finalize(() => { result.isPricingLoading = false; })
        ).subscribe({
          next: (response: any) => {
            const tarifGlobal = response.data?.find((d: any) => d.priceType === 'TarifGlobal');
            if (tarifGlobal) {
              result.tarifGlobal = tarifGlobal.contribution.contributionAmount;
            }
          },
          error: (err: any) => { console.error('Erreur API pour', result.assurance, err); }
        });
      }
    });
  }

  loadExampleData(): void {
    this.insuranceForm.get('personalInfo')?.patchValue({
      civilite: 'M', nom: 'Dupont', prenom: 'Jean', dateNaissance: new Date('1980-05-15'),
      regime: 'TNS', etatCivil: 'celibataire', adresse: '123 Rue de Paris', codePostal: '75001', ville: 'Paris',
      complementAdresse: 'Apt 101', dateEffet: new Date(), email: 'jean.dupont@example.com', telephone1: '0612345678'
    });
    const enfantsArray = this.insuranceForm.get('personalInfo.enfants') as FormArray;
    while (enfantsArray.length) { enfantsArray.removeAt(0); }
    this.messageService.add({ severity: 'success', summary: 'Données chargées', detail: 'Les données d\'exemple ont été chargées.' });
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

  public getInsurerName(assurance: string): string {
    if (!assurance) return '';
    return assurance.split(' ')[0];
  }



  public getCoverageClass(value: number): string {
    if (value >= 300) return 'coverage-high';
    if (value >= 150) return 'coverage-medium';
    if (value > 0) return 'coverage-low';
    return '';
  }

  public isNumeric(value: any): boolean {
    return value !== null && value !== undefined && !isNaN(parseFloat(value)) && isFinite(value);
  }
}