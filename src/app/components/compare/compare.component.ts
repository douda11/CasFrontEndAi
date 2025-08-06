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

interface ApiviaBeneficiaire {
  typeBeneficiaire: string;
  dateDeNaissance: string;
  typeRegime: string;
  regimeSocial: string;
}

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
  aprilPricingPayload: any = null;
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
            setTimeout(() => {
              this.fetchAprilPrices();
              this.fetchAllUtwinPrices(); // Automatic fetch for Utwin
              this.fetchApiviaPrices(); // Automatic fetch for APIVIA
            });

            if (response.utwinResponse) {
              if (response.utwinResponse.messages) {
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
}
          
            if (err.error.table) { // Handle markdown table even in case of 400 error
                this.comparisonResults = this.parseMarkdownTable(err.error.table);
                setTimeout(() => {
                  this.fetchAprilPrices();
                  this.fetchAllUtwinPrices(); // Automatic fetch for Utwin
                  this.fetchApiviaPrices(); // Automatic fetch for APIVIA
                });
            }
          } else {
            this.messageService.add({ severity: 'error', summary: 'Erreur Technique', detail: 'Une erreur inattendue est survenue.' });
          }
        }
      });
  }

  private fetchApiviaPrices(): void {
    const personalInfo = this.insuranceForm.get('personalInfo')?.value;

    const formatDate = (date: any): string => {
      if (!date) return '';
      const d = new Date(date);
      const day = (`0${d.getDate()}`).slice(-2);
      const month = (`0${d.getMonth() + 1}`).slice(-2);
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    };

    const apiviaProducts = this.comparisonResults.filter(result => {
      const assuranceName = result.assurance?.toLowerCase() || '';
      return assuranceName.includes('apivia');
    });

    if (apiviaProducts.length === 0) {
      return; // No Apivia products, no need to proceed or notify
    }

    const beneficiaires: ApiviaBeneficiaire[] = [];

    // Main Insured
    beneficiaires.push({
      typeBeneficiaire: 'PRINCIPAL',
      dateDeNaissance: formatDate(personalInfo.dateNaissance),
      typeRegime: 'GE',
      regimeSocial: personalInfo.regime
    });

    // Conjoint
    if (personalInfo.conjoint && (personalInfo.etatCivil === 'marie' || personalInfo.etatCivil === 'unionLibre') && personalInfo.conjoint.dateNaissance) {
        beneficiaires.push({
            typeBeneficiaire: 'CONJOINT',
            dateDeNaissance: formatDate(personalInfo.conjoint.dateNaissance),
            typeRegime: 'GE',
            regimeSocial: personalInfo.conjoint.regime || 'GE' // Default to GE if not provided
        });
    }

    // Enfants
    personalInfo.enfants.forEach((enfant: any) => {
        beneficiaires.push({
            typeBeneficiaire: 'AUTRE',
            dateDeNaissance: formatDate(enfant.dateNaissance),
            typeRegime: 'GE',
            regimeSocial: enfant.regime || 'GE' // Default to GE if not provided
        });
    });

    apiviaProducts.forEach(result => {
        result.isPricingLoading = true;

        // Extract formula number from the result
        const formulaMatch = result.formule.match(/Formule (\d+)|Niveau (\d+)/i);
        const formulaNumber = formulaMatch ? (formulaMatch[1] || formulaMatch[2]) : '*';

        const apiviaPayload = {
          action: 'tarification',
          format: 'json',
          produits: 'VITAMM3', // Assuming VITAMM3 for all Apivia products for now
          formules: formulaNumber,
          renforts: '*',
          codePostal: personalInfo.codePostal,
          dateEffet: formatDate(personalInfo.dateEffet),
          beneficiaires: beneficiaires
        };

        console.log('Sending APIVIA Payload:', apiviaPayload);

        this.insuranceService.getApiviaTarif(apiviaPayload).pipe(
          finalize(() => { result.isPricingLoading = false; })
        ).subscribe({
          next: (response: any) => {
            console.log('APIVIA Response:', response);
            if (response.status === 'success' && response.list && response.list.length > 0) {
                // Find the correct pricing from the list
                const pricingInfo = response.list.find((item: any) => item.formule === formulaNumber);
                if (pricingInfo && pricingInfo.cotisation_mensuelle) {
                    result.prix = parseFloat(pricingInfo.cotisation_mensuelle);
                    this.messageService.add({ severity: 'success', summary: 'Tarif APIVIA Récupéré', detail: `Prix pour ${result.formule} mis à jour.` });
                } else {
                    result.prix = 'N/A';
                    this.messageService.add({ severity: 'warn', summary: 'Tarif APIVIA', detail: `Aucun prix trouvé pour la formule ${formulaNumber}.` });
                }
            } else {
                result.prix = 'Erreur';
                const errorMessages = response.list ? response.list.join(', ') : 'Erreur inconnue.';
                this.messageService.add({ severity: 'error', summary: 'Erreur APIVIA', detail: `La tarification a échoué: ${errorMessages}` });
            }
          },
          error: (err) => {
            result.prix = 'Erreur';
            this.messageService.add({ severity: 'error', summary: 'Erreur APIVIA', detail: 'Une erreur est survenue lors de la récupération du tarif.' });
            console.error('APIVIA pricing error:', err);
          }
        });
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

      const assurance = contratText.split(' ')[0];
      const formule = contratText.substring(assurance.length).trim().replace(/^-/, '').trim();

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

  private fetchAllUtwinPrices(): void {
    const quoteForm = this.transformFormToQuote();
    this.comparisonResults.forEach(result => {
      const assuranceName = result.assurance?.toLowerCase() || '';
      if (assuranceName.includes('utwin')) {
        result.isPricingLoading = true;
        this.insuranceService.getUtwinTarif(quoteForm, result.formule).pipe(
          finalize(() => { result.isPricingLoading = false; })
        ).subscribe({
          next: (response: any) => {
            // The response for Utwin tarif is expected to be an array of propositions
            const propositions = Array.isArray(response) ? response : response?.propositions;
            if (propositions) {
              this.updateUtwinPrice(result, propositions);
            }
          },
          error: (err: any) => {
            // Handle cases where API returns 400 but with valid data
            const propositions = err.error?.propositions;
            if (propositions) {
              this.updateUtwinPrice(result, propositions);
            } else {
              console.error('Erreur API pour', result.assurance, err);
            }
          }
        });
      }
    });
  }

  private normalizeUtwinProductName(name: string): string {
    return name
      .replace(/\(Niveau \d+\)/i, '') // Remove '(Niveau X)' pattern
      .replace(/'/g, ' ')
      .replace(/,/g, '')  // Remove commas
      .replace(/\s+/g, ' ')
      .replace(/-/g, ' ')
      .trim()
      .toUpperCase();
  }

    onFormuleSelect(result: any, formule: string): void {
    console.log('onFormuleSelect triggered for:', result.assurance, 'with formula:', formule);

    const assuranceName = result.assurance?.toLowerCase() || '';
    result.isPricingLoading = true;

    // APIVIA LOGIC
        if (assuranceName.includes('apivia')) {
      console.log('APIVIA product detected. Starting tarification process.');
      const personalInfo = this.insuranceForm.get('personalInfo')?.value;
      const formatDate = (date: any): string => {
        if (!date) return '';
        const d = new Date(date);
        const day = (`0${d.getDate()}`).slice(-2);
        const month = (`0${d.getMonth() + 1}`).slice(-2);
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
      };

      const beneficiaires: ApiviaBeneficiaire[] = [];
      beneficiaires.push({
        typeBeneficiaire: 'PRINCIPAL',
        dateDeNaissance: formatDate(personalInfo.dateNaissance),
        typeRegime: 'GE',
        regimeSocial: personalInfo.regime
      });

      if (personalInfo.conjoint && (personalInfo.etatCivil === 'marie' || personalInfo.etatCivil === 'unionLibre') && personalInfo.conjoint.dateNaissance) {
          beneficiaires.push({
              typeBeneficiaire: 'CONJOINT',
              dateDeNaissance: formatDate(personalInfo.conjoint.dateNaissance),
              typeRegime: 'GE',
              regimeSocial: personalInfo.conjoint.regime || 'GE'
          });
      }

      personalInfo.enfants.forEach((enfant: any) => {
          beneficiaires.push({
              typeBeneficiaire: 'AUTRE',
              dateDeNaissance: formatDate(enfant.dateNaissance),
              typeRegime: 'GE',
              regimeSocial: enfant.regime || 'GE'
          });
      });

      const formulaMatch = formule.match(/Formule (\d+)|Niveau (\d+)/i);
      const formulaNumber = formulaMatch ? (formulaMatch[1] || formulaMatch[2]) : '*';

      const apiviaPayload = {
        action: 'tarification',
        format: 'json',
        produits: 'VITAMM3',
        formules: formulaNumber,
        renforts: '*',
        codePostal: personalInfo.codePostal,
        dateEffet: formatDate(personalInfo.dateEffet),
        beneficiaires: beneficiaires
      };

      this.insuranceService.getApiviaTarif(apiviaPayload).pipe(
        finalize(() => { result.isPricingLoading = false; })
      ).subscribe({
        next: (response: any) => {
          if (response.status === 'success' && response.list && response.list.length > 0) {
            const product = response.list[0];
            if (product && product.formules && product.formules[formulaNumber]) {
              const formulaData = product.formules[formulaNumber];
              if (formulaData.total && typeof formulaData.total.complete === 'number') {
                result.prix = formulaData.total.complete;
              } else {
                result.prix = 'N/A';
              }
            } else {
              result.prix = 'N/A';
            }
          } else {
            result.prix = 'Erreur';
          }
        },
        error: (err) => {
          result.prix = 'Erreur';
          console.error('APIVIA pricing error on select:', err);
        }
      });

    // APRIL LOGIC
    } else if (assuranceName.includes('april')) {
      const quoteForm = this.transformFormToQuote();
      this.insuranceService.getAprilHealthTarif(quoteForm, result.assurance, formule).pipe(
        finalize(() => { result.isPricingLoading = false; })
      ).subscribe({
        next: (response: any) => {
          const tarifGlobal = response.data?.find((d: any) => d.priceType === 'TarifGlobal');
          if (tarifGlobal) {
            result.prix = tarifGlobal.contribution.contributionAmount;
          }
        },
        error: (err: any) => { console.error('Erreur API pour', result.assurance, err); }
      });

    // UTWIN LOGIC
    } else if (assuranceName.includes('utwin')) {
      const quoteForm = this.transformFormToQuote();
      this.insuranceService.getUtwinTarif(quoteForm, formule).pipe(
        finalize(() => { result.isPricingLoading = false; })
      ).subscribe({
        next: (response: any) => {
          const matchingProposition = response.propositions.find((p: any) => {
            const normalizedApiName = this.normalizeUtwinProductName(p.libelle);
            const normalizedOfferName = this.normalizeUtwinProductName(result.assurance);
            return normalizedApiName === normalizedOfferName;
          });

          if (matchingProposition) {
            result.prix = matchingProposition.cotisationTTC;
          } else {
            result.prix = 'N/A';
          }
        },
        error: (err: any) => {
          console.error('Erreur API pour', result.assurance, err);
          result.prix = 'Erreur';
        }
      });

    } else {
      result.isPricingLoading = false;
      console.warn('No specific pricing logic for:', result.assurance);
    }
  }

  private updateUtwinPrice(offer: ComparisonResult, propositions: any[]): void {
    const formulaParts = offer.formule.match(/(.+) Niveau (\d+)/);
    if (!formulaParts || formulaParts.length !== 3) {
      console.warn(`Formule format not recognized for automatic pricing: ${offer.formule}`);
      return;
    }

    const libelleProduit = formulaParts[1].trim();
    const niveau = formulaParts[2];
    const codeFormuleToFind = `N${niveau}`; // e.g., "N3"

    const proposition = propositions.find((p: any) => {
      const normalizedApiProduct = this.normalizeUtwinProductName(p.libelleProduit);
      const normalizedOfferProduct = this.normalizeUtwinProductName(libelleProduit);
      return normalizedApiProduct === normalizedOfferProduct && p.codeFormule === codeFormuleToFind;
    });

    if (proposition && proposition.cotisationMensuelleEuros) {
      offer.prix = proposition.cotisationMensuelleEuros;
    } else {
      console.warn(`No matching Utwin proposition found for: ${libelleProduit} - ${codeFormuleToFind}`);
    }
  }



  private fetchAprilPrices(): void {
    const quoteForm = this.transformFormToQuote();
    this.aprilPricingPayload = quoteForm;
    this.comparisonResults.forEach(result => {
      const assuranceName = result.assurance?.toLowerCase() || '';
      if (assuranceName.includes('april') && !assuranceName.includes('apivia')) {
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
    return !isNaN(parseFloat(value)) && isFinite(value);
  }

  generateQuote(result: ComparisonResult, action: 'envoiParEmail' | 'telechargement'): void {
    const payload = this.getQuotePayload(result);
    if (!payload) {
      this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de générer le devis, données manquantes.' });
      return;
    }

    if (result.assurance.toLowerCase().includes('april')) {
      console.log('April Quote Payload:', payload);
      this.insuranceService.sendAprilQuoteByEmail(payload).subscribe({
        next: () => this.messageService.add({ severity: 'success', summary: 'Email envoyé', detail: 'Le devis April a été envoyé par email.' }),
        error: () => this.messageService.add({ severity: 'error', summary: 'Erreur Email', detail: 'Impossible d\'envoyer le devis April.' })
      });
    } else if (result.assurance.toLowerCase().includes('utwin')) {
      this.insuranceService.generateCommercialProposal(payload, action).subscribe({
        next: (response) => {
          if (action === 'telechargement' && response instanceof Blob) {
            const url = window.URL.createObjectURL(response);
            const a = document.createElement('a');
            a.href = url;
            a.download = `devis-utwin.pdf`;
            a.click();
            window.URL.revokeObjectURL(url);
            this.messageService.add({ severity: 'success', summary: 'Téléchargement', detail: 'Le devis Utwin est en cours de téléchargement.' });
          } else {
            this.messageService.add({ severity: 'success', summary: 'Email envoyé', detail: 'Le devis Utwin a été envoyé par email.' });
          }
        },
        error: () => this.messageService.add({ severity: 'error', summary: 'Erreur', detail: `Impossible de traiter la demande pour le devis Utwin.` })
      });
    } else if (result.assurance.toLowerCase().includes('apivia')) {
      this.insuranceService.downloadApiviaQuotePdf(payload).subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `devis-apivia.pdf`;
          a.click();
          window.URL.revokeObjectURL(url);
          this.messageService.add({ severity: 'success', summary: 'Téléchargement', detail: 'Le devis Apivia est en cours de téléchargement.' });
        },
        error: () => this.messageService.add({ severity: 'error', summary: 'Erreur PDF', detail: 'Impossible de télécharger le devis Apivia.' })
      });
    }
  }

  private buildUtwinQuotePayload(result: ComparisonResult): any {
    const personalInfo = this.insuranceForm.get('personalInfo')?.value;
    if (!personalInfo) return null;

    const formatDate = (date: any): string => {
      if (!date) return '';
      return new Date(date).toISOString();
    };

    const mapRegime = (regime: string): string => {
      if (regime?.toUpperCase() === 'TNS') return 'SSI';
      return 'RG'; // Default
    };

    const mapCivilite = (civilite: string): string => {
      if (civilite === 'M') return 'Monsieur';
      if (civilite === 'F') return 'Madame';
      return civilite;
    }

    const assures: any[] = [];

    // Assuré principal
    assures.push({
      codeRegimeObligatoire: mapRegime(personalInfo.regime),
      codeTypeRole: 'AssurePrincipal',
      codeCivilite: mapCivilite(personalInfo.civilite),
      nom: personalInfo.nom,
      prenom: personalInfo.prenom,
      dateDeNaissance: formatDate(personalInfo.dateNaissance)
    });

    // Conjoint
    if (personalInfo.conjoint && (personalInfo.etatCivil === 'marie' || personalInfo.etatCivil === 'unionLibre')) {
      const conjointInfo = this.insuranceForm.get('personalInfo.conjoint')?.value;
      assures.push({
        codeRegimeObligatoire: mapRegime(conjointInfo.regime),
        codeTypeRole: 'Conjoint',
        codeCivilite: mapCivilite(conjointInfo.civilite),
        nom: conjointInfo.nom,
        prenom: conjointInfo.prenom,
        dateDeNaissance: formatDate(conjointInfo.dateNaissance)
      });
    }

    // Enfants
    personalInfo.enfants.forEach((enfant: any) => {
      assures.push({
        codeRegimeObligatoire: mapRegime(enfant.regime),
        codeTypeRole: 'Enfant',
        codeCivilite: mapCivilite(enfant.sexe === 'garcon' ? 'M' : 'F'),
        nom: personalInfo.nom, // Assuming children have the same last name
        prenom: enfant.prenom,
        dateDeNaissance: formatDate(enfant.dateNaissance)
      });
    });

    let codeProduit = 'UTWIN_MULTI'; // Default
    let codeFormule = 'N1'; // Default
    if (result.formule) {
        const match = result.formule.match(/NIVEAU (\d+)/i);
        if (match && match[1]) {
            codeFormule = `N${match[1]}`;
        }
    }

    return {
      souscripteur: {
        telephonePortable: personalInfo.telephone1,
        email: personalInfo.email,
        adresse: {
          codePostal: personalInfo.codePostal
        }
      },
      besoin: {
        dateEffet: formatDate(personalInfo.dateEffet)
      },
      assures: assures,
      contexteDeVente: {
        produits: [{
          codeProduit: codeProduit,
          codeFormule: codeFormule,
          tauxCommission: '10/10'
        }],
        venteAppelNonSollicite: 'false'
      }
    };
  }

  private buildAprilQuotePayload(result: ComparisonResult): any {
    const personalInfo = this.insuranceForm.get('personalInfo')?.value;
    if (!personalInfo) return null;

    const formatDate = (date: any): string => {
      if (!date) return '';
      const d = new Date(date);
      return d.toISOString().split('T')[0];
    };

    const formula = result.formule || '';
    const levelCodeMatch = formula.match(/FORMULE (\d+)/);
    const levelCode = levelCodeMatch ? `0${levelCodeMatch[1]}` : '01';

    const mainInsuredId = 'i-1';
    const persons = [{
      '$id': mainInsuredId,
      birthDate: formatDate(personalInfo.dateNaissance),
      title: personalInfo.civilite === 'M' ? 'Monsieur' : 'Madame',
      lastName: personalInfo.nom,
      firstName: personalInfo.prenom,
      mandatoryScheme: personalInfo.regime,
      familyStatus: personalInfo.etatCivil,
      mobilePhone: { number: personalInfo.telephone1 },
      email: personalInfo.email
    }];

    const mainApplicantId = 'a-1';
    const insureds = [{
      '$id': mainApplicantId,
      role: 'AssurePrincipal',
      person: { '$ref': mainInsuredId }
    }];

    return {
      '$type': 'PrevPro',
      properties: {
        addresses: [{
          '$id': 'adr-1',
          type: 'Actuelle',
          addressLine1: personalInfo.adresse,
          postCode: personalInfo.codePostal,
          city: personalInfo.ville
        }],
        email: personalInfo.email
      },
      persons: persons,
      products: [{
        '$id': 'p-1',
        productCode: 'SantePro',
        effectiveDate: formatDate(personalInfo.dateEffet),
        insureds: insureds,
        coverages: [{
          insured: { '$ref': mainApplicantId },
          guaranteeCode: 'MaladieChirurgie',
          eligibleMadelinLaw: true,
          levelCode: levelCode
        }, {
          insured: { '$ref': mainApplicantId },
          guaranteeCode: 'Surcomplementaire',
          eligibleMadelinLaw: true
        }]
      }],
      marketingParameters: {
        requestType: 'Quotation'
      }
    };
  }

  private getQuotePayload(result: ComparisonResult): any {
    const personalInfo = this.insuranceForm.get('personalInfo')?.value;
    if (!personalInfo) return null;

    const assuranceName = result.assurance?.toLowerCase() || '';
    if (assuranceName.includes('april') && !assuranceName.includes('apivia')) {
      return this.buildAprilQuotePayload(result);
    } else if (assuranceName.includes('apivia')) {
      return this.buildApiviaQuotePayload(result);
    } else if (assuranceName.includes('utwin')) {
      return this.buildUtwinQuotePayload(result);
    }

    // Default payload for any other case
    return {};
  }

  formatFormula(formule: string, assurance: string): string {
    if (!formule) return '';

    // Remove the assurance name from the beginning of the formula string
    const cleanedFormula = formule.toLowerCase().startsWith(assurance.toLowerCase()) 
        ? formule.substring(assurance.length).trim() 
        : formule;

    const regex = /(Niveau|FORMULE)/i;
    const parts = cleanedFormula.split(regex);

    if (parts.length > 1) {
      const productName = parts[0].trim();
      const formulaPart = parts.slice(1).join('').trim();
      return `<strong style="color: #A102F2; font-weight: bold;">${productName}</strong><br><em>${formulaPart}</em>`;
    }

    // Fallback if keywords are not found
    return `<strong style="color: #A102F2; font-weight: bold;">${cleanedFormula}</strong>`;
  }

  private buildApiviaQuotePayload(result: ComparisonResult): any {
    const personalInfo = this.insuranceForm.get('personalInfo')?.value;
    if (!personalInfo) return null;

    const formatDate = (date: any): string => {
      if (!date) return '';
      const d = new Date(date);
      const day = ('0' + d.getDate()).slice(-2);
      const month = ('0' + (d.getMonth() + 1)).slice(-2);
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    };

    const getProductCode = (productName: string): string => {
        if (productName && productName.toLowerCase().includes('apivia')) return 'VITAMT3';
        return productName; // Fallback
    };

    const getFormulaCode = (formulaName: string): string => {
        if (!formulaName) return '';
        const match = formulaName.match(/\d+/);
        return match ? match[0] : formulaName;
    };

    const beneficiaires: any[] = [];

    beneficiaires.push({
      typeBeneficiaire: 'PRINCIPAL',
      dateDeNaissance: formatDate(personalInfo.dateNaissance),
      typeRegime: 'GE',
      regimeSocial: personalInfo.regime || 'TNS'
    });

    if (personalInfo.conjoint && (personalInfo.etatCivil === 'marie' || personalInfo.etatCivil === 'unionLibre')) {
      beneficiaires.push({
        typeBeneficiaire: 'CONJOINT',
        dateDeNaissance: formatDate(personalInfo.conjoint.dateNaissance),
        typeRegime: 'GE',
        regimeSocial: personalInfo.conjoint.regime || 'TNS'
      });
    }

    personalInfo.enfants.forEach((enfant: any) => {
      beneficiaires.push({
        typeBeneficiaire: 'ENFANT',
        dateDeNaissance: formatDate(enfant.dateNaissance),
        typeRegime: 'GE',
        regimeSocial: enfant.regime || 'TNS'
      });
    });

    return {
      action: 'generate_pdf_devis',
      beneficiaires: beneficiaires,
      cle: 'f85d0eb55e8e069acb908c1d11af4c6e',
      conseiller: {
        nom: 'Dupont',
        prenom: 'Jean',
        typeConseiller: 'SALAR',
        orias: '12345678'
      },
      dateEffet: formatDate(personalInfo.dateEffet),
      dejaAssurance: true,
      format: 'json',
      formule: getFormulaCode(result.formule),
      frais: '15',
      isResiliationPourCompte: true,
      options: [],
      produit: getProductCode(result.assurance),
      renforts: [],
      souscripteur: {
        typeCivilite: personalInfo.civilite === 'M' ? 'M' : 'MME',
        nom: personalInfo.nom,
        prenom: personalInfo.prenom,
        telephone: personalInfo.telephone1,
        mobile: personalInfo.telephone1, // Assuming mobile is same as phone1
        email: personalInfo.email,
        adresse: {
          numero: '', // Not available in form
          codeBtq: '', // Not available in form
          natureVoie: '', // Not available in form
          nomVoie: personalInfo.adresse,
          complement: '', // Not available in form
          codePostal: personalInfo.codePostal,
          ville: personalInfo.ville,
          isAdresseComplete: true
        }
      },
      tarif: result.tarifGlobal || 0
    };
  }
}