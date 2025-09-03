import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray, AbstractControl, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
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
import { MessageModule } from 'primeng/message';
import { MarkdownModule } from 'ngx-markdown';
import { FormsModule } from '@angular/forms';

// App services and models
import { CompareService } from '../../services/compare.service';
import { InsuranceService } from '../../services/insurance.service';
import { AlptisService } from '../../services/alptis.service';
import { BesoinClient } from '../../models/comparateur.model';
import { InsuranceQuoteForm, InsuredPerson } from '../../models/project-model';
import { MessageService } from 'primeng/api';
import { startWith, finalize, debounceTime } from 'rxjs/operators';
import { Injectable } from '@angular/core';

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
    CommonModule, HttpClientModule, ReactiveFormsModule, FormsModule, StepsModule, ToastModule, SliderModule, PanelModule,
    DropdownModule, RadioButtonModule, CalendarModule, InputTextModule, InputMaskModule, ButtonModule, DividerModule,
    TooltipModule, InputNumberModule, CheckboxModule, CardModule, ProgressSpinnerModule, AccordionModule, TabViewModule,
    MessageModule, MarkdownModule
  ]
})
export class CompareComponent implements OnInit {
  insuranceForm!: FormGroup;
  activeIndex: number = 0;
  submitting: boolean = false;
  isComparing: boolean = false;
  results: any[] = [];
  comparisonResults: any[] = [];
  an = false;
  private comparisonSubscription: any = null;
  
  // PDF extraction properties
  selectedPdfFile: File | null = null;
  selectedInsurer: string = '';
  selectedLevelName: string = '';
  isExtractingPdf: boolean = false;
  pdfExtractionMessage: { type: 'success' | 'error' | 'info' | 'warn', text: string } | null = null;
  availableInsurers: { label: string, value: string }[] = [];
  availableLevels: { label: string, value: string }[] = [];
  contractsData: any[] = [];
  steps = [
    { label: 'Informations personnelles' },
    { label: 'Garanties' },
    { label: 'Résultats' }
  ];
  aprilPricingPayload: any = null;
  garanties: GarantieDefinition[] = [];

  civiliteOptions = [{ label: 'Monsieur', value: 'M' }, { label: 'Madame', value: 'F' }];
  regimeOptions = [{ label: 'Sécurité Sociale des Indépendants', value: 'TNS' }];
  EtatcivilOptions = [
    { label: 'Célibataire', value: 'celibataire' }, { label: 'Marié(e)', value: 'marie' },
    { label: 'Parent isolé', value: 'parentIsole' }, { label: 'Séparé(e)', value: 'separe' },
    { label: 'Union libre', value: 'unionLibre' }, { label: 'Veuf(ve)', value: 'veuf' },
    { label: 'Non déclaré', value: 'situationNonDeclaree' }
  ];
  sexeOptions = [{ label: 'Garçon', value: 'garcon' }, { label: 'Fille', value: 'fille' }];

  // Options pour Alptis
  categorieSocioProfessionnelleOptions = [
    { label: 'Artisans', value: 'ARTISANS' },
    { label: 'Commerçants et assimilés', value: 'COMMERCANTS_ET_ASSIMILES' },
    { label: 'Professions libérales et assimilés', value: 'PROFESSIONS_LIBERALES_ET_ASSIMILES' },
    { label: 'Chefs d\'entreprise', value: 'CHEFS_D_ENTREPRISE' }
  ];

  statutProfessionnelOptions = [
    { label: 'Professions libérales', value: 'PROFESSIONS_LIBERALES' },
    { label: 'Artisan commerçant', value: 'ARTISAN_COMMERCANT' }
  ];
minDate: Date | null = null;
  maxDate: Date | null = null;
  constructor(
    private fb: FormBuilder,
    private compareService: CompareService,
    private insuranceService: InsuranceService,
    private alptisService: AlptisService,
    private messageService: MessageService,
    private router: Router,
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {
    const today = new Date();
    this.minDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
    this.maxDate = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate());
  }

  ngOnInit(): void {
    this.initializeForm();
    this.initializeSteps();
    this.setupConjointListener();
    this.setupPostalCodeListener();
    this.setupGaranties();
    this.initializeAvailableInsurers();

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
    // Calculer la date d'effet par défaut (Date du jour + 35 jours)
    const today = new Date();
    const defaultEffectDate = new Date(today);
    defaultEffectDate.setDate(today.getDate() + 35);
    
    const formatDefaultDate = (date: Date): string => {
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    };

    this.insuranceForm = this.fb.group({
      personalInfo: this.fb.group({
        civilite: ['Monsieur', Validators.required],
        nom: ['', [Validators.required, this.noSpecialCharactersValidator]],
        prenom: ['', [Validators.required, this.noSpecialCharactersValidator]],
        dateNaissance: ['', [Validators.required, this.dateFormatValidator]],
        adresse: ['', Validators.required],
        complementAdresse: [''],
        codePostal: ['', [Validators.required, Validators.pattern(/^\d{5}$/)]],
        ville: ['', Validators.required],
        pays: ['France', Validators.required],
        dateEffet: [formatDefaultDate(defaultEffectDate), [Validators.required, this.dateFormatValidator]],
        email: ['', [Validators.required, Validators.email]],
        telephone1: ['', Validators.required],
        etatCivil: [null, Validators.required],
        regime: [null, Validators.required],
        categorieSocioProfessionnelle: [null, Validators.required],
        statutProfessionnel: [null],
        conjoint: this.fb.group({
          civilite: [''], 
          nom: ['', this.noSpecialCharactersValidator], 
          prenom: ['', this.noSpecialCharactersValidator],
          email: ['', Validators.email], 
          dateNaissance: ['', this.dateFormatValidator], 
          regime: ['']
        }),
        enfants: this.fb.array([]),
        termination: this.fb.group({
          hasFormerContract: [false],
          formerInsurer: [''],
          formerContractReference: ['']
        })
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

  // Custom validators
  noSpecialCharactersValidator(control: AbstractControl): {[key: string]: any} | null {
    const value = control.value;
    if (!value) return null;
    
    const specialCharsRegex = /[^a-zA-ZÀ-ÿ\s\-']/;
    if (specialCharsRegex.test(value)) {
      return { 'specialCharacters': { value: control.value } };
    }
    return null;
  }

  dateFormatValidator(control: AbstractControl): {[key: string]: any} | null {
    const value = control.value;
    if (!value) return null;
    
    // Vérifier le format JJ/MM/AAAA
    const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    const match = value.match(dateRegex);
    
    if (!match) {
      return { 'invalidDateFormat': { value: control.value } };
    }
    
    const [, day, month, year] = match;
    const dayNum = parseInt(day, 10);
    const monthNum = parseInt(month, 10);
    const yearNum = parseInt(year, 10);
    
    // Validation des valeurs
    if (dayNum < 1 || dayNum > 31) {
      return { 'invalidDay': { value: control.value } };
    }
    if (monthNum < 1 || monthNum > 12) {
      return { 'invalidMonth': { value: control.value } };
    }
    if (yearNum < 1920 || yearNum > 2030) {
      return { 'invalidYear': { value: control.value } };
    }
    
    // Vérifier si la date est valide
    const date = new Date(yearNum, monthNum - 1, dayNum);
    if (date.getFullYear() !== yearNum || date.getMonth() !== monthNum - 1 || date.getDate() !== dayNum) {
      return { 'invalidDate': { value: control.value } };
    }
    
    return null;
  }

  formatDateInput(event: any, fieldName: string): void {
    const input = event.target;
    let value = input.value.replace(/\D/g, ''); // Supprimer tous les caractères non numériques
    
    // Limiter à 8 chiffres maximum (JJMMAAAA)
    if (value.length > 8) {
      value = value.substring(0, 8);
    }
    
    // Ajouter les slashes automatiquement
    if (value.length >= 3 && value.length <= 4) {
      value = value.substring(0, 2) + '/' + value.substring(2);
    } else if (value.length >= 5) {
      value = value.substring(0, 2) + '/' + value.substring(2, 4) + '/' + value.substring(4);
    }
    
    // Mettre à jour la valeur dans le champ
    input.value = value;
    
    // Mettre à jour le FormControl
    const control = this.insuranceForm.get(`personalInfo.${fieldName}`);
    if (control) {
      control.setValue(value);
      control.markAsTouched();
    }
  }

  setupPostalCodeListener(): void {
    const codePostalControl = this.insuranceForm.get('personalInfo.codePostal');
    const villeControl = this.insuranceForm.get('personalInfo.ville');
    const paysControl = this.insuranceForm.get('personalInfo.pays');

    if (codePostalControl && villeControl && paysControl) {
      // Variables pour éviter les boucles infinies
      let isUpdatingFromCode = false;
      let isUpdatingFromCity = false;

      // Listener pour code postal -> ville
      codePostalControl.valueChanges.pipe(
        debounceTime(300)
      ).subscribe(codePostal => {
        if (!isUpdatingFromCity && codePostal && /^\d{5}$/.test(codePostal)) {
          console.log('Code postal détecté:', codePostal);
          isUpdatingFromCode = true;
          this.lookupCityFromPostalCode(codePostal, villeControl, paysControl);
          setTimeout(() => { isUpdatingFromCode = false; }, 100);
        }
      });

      // Listener pour ville -> code postal (seulement si l'utilisateur tape activement)
      villeControl.valueChanges.pipe(
        debounceTime(500)
      ).subscribe(ville => {
        if (!isUpdatingFromCode && ville && ville.length >= 3) {
          console.log('Ville détectée:', ville);
          isUpdatingFromCity = true;
          this.lookupPostalCodeFromCity(ville, codePostalControl, paysControl);
          setTimeout(() => { isUpdatingFromCity = false; }, 100);
        }
      });
    }
  }

  private lookupCityFromPostalCode(codePostal: string, villeControl: AbstractControl, paysControl: AbstractControl): void {
    // Base de données étendue des codes postaux français
    const postalCodeCities: {[key: string]: string} = {
      // Paris arrondissements
      '75001': 'Paris', '75002': 'Paris', '75003': 'Paris', '75004': 'Paris', '75005': 'Paris',
      '75006': 'Paris', '75007': 'Paris', '75008': 'Paris', '75009': 'Paris', '75010': 'Paris',
      '75011': 'Paris', '75012': 'Paris', '75013': 'Paris', '75014': 'Paris', '75015': 'Paris',
      '75016': 'Paris', '75017': 'Paris', '75018': 'Paris', '75019': 'Paris', '75020': 'Paris',
      
      // Lyon et région
      '69001': 'Lyon', '69002': 'Lyon', '69003': 'Lyon', '69004': 'Lyon', '69005': 'Lyon',
      '69006': 'Lyon', '69007': 'Lyon', '69008': 'Lyon', '69009': 'Lyon',
      '69100': 'Villeurbanne', '69120': 'Vaulx-en-Velin', '69140': 'Rillieux-la-Pape',
      '69200': 'Vénissieux', '69300': 'Caluire-et-Cuire', '69400': 'Arnas',
      
      // Marseille et région
      '13001': 'Marseille', '13002': 'Marseille', '13003': 'Marseille', '13004': 'Marseille',
      '13005': 'Marseille', '13006': 'Marseille', '13007': 'Marseille', '13008': 'Marseille',
      '13009': 'Marseille', '13010': 'Marseille', '13011': 'Marseille', '13012': 'Marseille',
      '13013': 'Marseille', '13014': 'Marseille', '13015': 'Marseille', '13016': 'Marseille',
      '13100': 'Aix-en-Provence', '13200': 'Arles', '13300': 'Salon-de-Provence',
      '13400': 'Aubagne', '13500': 'Martigues', '13600': 'La Ciotat',
      
      // Bordeaux et région
      '33000': 'Bordeaux', '33100': 'Bordeaux', '33200': 'Bordeaux', '33300': 'Bordeaux',
      '33400': 'Talence', '33500': 'Libourne', '33600': 'Pessac', '33700': 'Mérignac',
      '33800': 'Bordeaux', '33900': 'Bordeaux',
      
      // Toulouse et région
      '31000': 'Toulouse', '31100': 'Toulouse', '31200': 'Toulouse', '31300': 'Toulouse',
      '31400': 'Toulouse', '31500': 'Toulouse', '31700': 'Blagnac', '31770': 'Colomiers',
      
      // Lille et région
      '59000': 'Lille', '59100': 'Roubaix', '59200': 'Tourcoing', '59300': 'Valenciennes',
      '59400': 'Cambrai', '59500': 'Douai', '59600': 'Maubeuge', '59700': 'Marcq-en-Barœul',
      '59800': 'Lille', '59160': 'Lomme',
      
      // Nice et Côte d\'Azur
      '06000': 'Nice', '06100': 'Nice', '06200': 'Nice', '06300': 'Nice',
      '06400': 'Cannes', '06600': 'Antibes', '06800': 'Cagnes-sur-Mer',
      
      // Nantes et région
      '44000': 'Nantes', '44100': 'Nantes', '44200': 'Nantes', '44300': 'Nantes',
      '44400': 'Rezé', '44800': 'Saint-Herblain', '44900': 'Nantes',
      
      // Strasbourg et région
      '67000': 'Strasbourg', '67100': 'Strasbourg', '67200': 'Strasbourg',
      '67300': 'Schiltigheim', '67400': 'Illkirch-Graffenstaden',
      
      // Montpellier et région
      '34000': 'Montpellier', '34070': 'Montpellier', '34080': 'Montpellier',
      '34090': 'Montpellier', '34170': 'Castelnau-le-Lez', '34200': 'Sète',
      
      // Rennes et région
      '35000': 'Rennes', '35100': 'Rennes', '35200': 'Rennes', '35700': 'Rennes',
      
      // Grenoble et région
      '38000': 'Grenoble', '38100': 'Grenoble', '38700': 'La Tronche',
      '38400': 'Saint-Martin-d\'Hères', '38600': 'Fontaine',
      
      // Autres grandes villes
      '21000': 'Dijon', '25000': 'Besançon', '30000': 'Nîmes', '37000': 'Tours',
      '42000': 'Saint-Étienne', '45000': 'Orléans', '49000': 'Angers',
      '51100': 'Reims', '54000': 'Nancy', '57000': 'Metz', '63000': 'Clermont-Ferrand',
      '68000': 'Colmar', '76000': 'Rouen', '80000': 'Amiens', '87000': 'Limoges',
      
      // Villes moyennes importantes
      '14000': 'Caen', '29000': 'Quimper', '29200': 'Brest', '35400': 'Saint-Malo',
      '56000': 'Vannes', '64000': 'Pau', '65000': 'Tarbes', '66000': 'Perpignan',
      '71000': 'Mâcon', '72000': 'Le Mans', '73000': 'Chambéry', '74000': 'Annecy',
      '83000': 'Toulon', '84000': 'Avignon', '86000': 'Poitiers', '88000': 'Épinal',
      '90000': 'Belfort', '17000': 'La Rochelle', '79000': 'Niort'
    };

    const city = postalCodeCities[codePostal];
    if (city) {
      console.log('Ville trouvée pour', codePostal, ':', city);
      villeControl.setValue(city);
      paysControl.setValue('France');
    } else {
      console.log('Aucune ville trouvée pour', codePostal, ', recherche par département');
      // Enhanced department-based city lookup
      const department = codePostal.substring(0, 2);
      const departmentCities: {[key: string]: string} = {
        '01': 'Bourg-en-Bresse', '02': 'Laon', '03': 'Moulins', '04': 'Digne-les-Bains',
        '05': 'Gap', '06': 'Nice', '07': 'Privas', '08': 'Charleville-Mézières',
        '09': 'Foix', '10': 'Troyes', '11': 'Carcassonne', '12': 'Rodez',
        '13': 'Marseille', '14': 'Caen', '15': 'Aurillac', '16': 'Angoulême',
        '17': 'La Rochelle', '18': 'Bourges', '19': 'Tulle', '20': 'Ajaccio',
        '21': 'Dijon', '22': 'Saint-Brieuc', '23': 'Guéret', '24': 'Périgueux',
        '25': 'Besançon', '26': 'Valence', '27': 'Évreux', '28': 'Chartres',
        '29': 'Quimper', '30': 'Nîmes', '31': 'Toulouse', '32': 'Auch',
        '33': 'Bordeaux', '34': 'Montpellier', '35': 'Rennes', '36': 'Châteauroux',
        '37': 'Tours', '38': 'Grenoble', '39': 'Lons-le-Saunier', '40': 'Mont-de-Marsan',
        '41': 'Blois', '42': 'Saint-Étienne', '43': 'Le Puy-en-Velay', '44': 'Nantes',
        '45': 'Orléans', '46': 'Cahors', '47': 'Agen', '48': 'Mende',
        '49': 'Angers', '50': 'Saint-Lô', '51': 'Châlons-en-Champagne', '52': 'Chaumont',
        '53': 'Laval', '54': 'Nancy', '55': 'Bar-le-Duc', '56': 'Vannes',
        '57': 'Metz', '58': 'Nevers', '59': 'Lille', '60': 'Beauvais',
        '61': 'Alençon', '62': 'Arras', '63': 'Clermont-Ferrand', '64': 'Pau',
        '65': 'Tarbes', '66': 'Perpignan', '67': 'Strasbourg', '68': 'Colmar',
        '69': 'Lyon', '70': 'Vesoul', '71': 'Mâcon', '72': 'Le Mans',
        '73': 'Chambéry', '74': 'Annecy', '75': 'Paris', '76': 'Rouen',
        '77': 'Melun', '78': 'Versailles', '79': 'Niort', '80': 'Amiens',
        '81': 'Albi', '82': 'Montauban', '83': 'Toulon', '84': 'Avignon',
        '85': 'La Roche-sur-Yon', '86': 'Poitiers', '87': 'Limoges', '88': 'Épinal',
        '89': 'Auxerre', '90': 'Belfort', '91': 'Évry', '92': 'Nanterre',
        '93': 'Bobigny', '94': 'Créteil', '95': 'Pontoise'
      };
      
      const defaultCity = departmentCities[department];
      if (defaultCity) {
        console.log('Ville trouvée par département', department, ':', defaultCity);
        villeControl.setValue(defaultCity);
      } else {
        console.log('Aucune ville trouvée pour le département', department);
      }
      paysControl.setValue('France');
    }
  }

  private lookupPostalCodeFromCity(ville: string, codePostalControl: AbstractControl, paysControl: AbstractControl): void {
    // Normaliser la ville (supprimer accents, espaces, casse)
    const normalizedVille = ville.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();

    // Mapping ville -> code postal principal
    const cityToPostalCode: {[key: string]: string} = {
      // Grandes villes avec codes postaux principaux
      'paris': '75001',
      'lyon': '69001',
      'marseille': '13001',
      'toulouse': '31000',
      'nice': '06000',
      'nantes': '44000',
      'montpellier': '34000',
      'strasbourg': '67000',
      'bordeaux': '33000',
      'lille': '59000',
      'rennes': '35000',
      'reims': '51100',
      'saint-etienne': '42000',
      'toulon': '83000',
      'grenoble': '38000',
      'dijon': '21000',
      'angers': '49000',
      'nimes': '30000',
      'villeurbanne': '69100',
      'clermont-ferrand': '63000',
      'le havre': '76600',
      'aix-en-provence': '13100',
      'brest': '29200',
      'tours': '37000',
      'amiens': '80000',
      'limoges': '87000',
      'annecy': '74000',
      'perpignan': '66000',
      'besancon': '25000',
      'metz': '57000',
      'orleans': '45000',
      'rouen': '76000',
      'mulhouse': '68100',
      'caen': '14000',
      'nancy': '54000',
      'argenteuil': '95100',
      'montreuil': '93100',
      'roubaix': '59100',
      'tourcoing': '59200',
      'dunkerque': '59140',
      'avignon': '84000',
      'poitiers': '86000',
      'fort-de-france': '97200',
      'courbevoie': '92400',
      'versailles': '78000',
      'colombes': '92700',
      'aulnay-sous-bois': '93600',
      'pau': '64000',
      'la rochelle': '17000',
      'calais': '62100',
      'cannes': '06400',
      'antibes': '06600',
      'boulogne-billancourt': '92100',
      'meudon': '92190',
      'beziers': '34500',
      'bourges': '18000',
      'quimper': '29000',
      'valence': '26000',
      'merignac': '33700',
      'troyes': '10000'
    };

    // Chercher correspondance exacte
    let foundPostalCode = cityToPostalCode[normalizedVille];
    
    // Si pas de correspondance exacte, chercher par similarité
    if (!foundPostalCode) {
      for (const [cityKey, postalCode] of Object.entries(cityToPostalCode)) {
        if (cityKey.includes(normalizedVille) || normalizedVille.includes(cityKey)) {
          foundPostalCode = postalCode;
          break;
        }
      }
    }

    if (foundPostalCode) {
      console.log('Code postal trouvé pour', ville, ':', foundPostalCode);
      // Toujours mettre à jour le code postal, même s'il y en a déjà un
      codePostalControl.setValue(foundPostalCode);
      paysControl.setValue('France');
    } else {
      console.log('Aucun code postal trouvé pour', ville);
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

  initializeAvailableInsurers(): void {
    this.availableInsurers = [
      { label: 'ALPTIS', value: 'ALPTIS' },
      { label: 'APIVIA', value: 'APIVIA' },
      { label: 'UTWIN', value: 'UTWIN' },
      { label: 'APRIL', value: 'APRIL' },
      { label: 'ACHEEL', value: 'ACHEEL' },
      { label: 'AXA', value: 'AXA' },
      { label: 'MAAF', value: 'MAAF' },
      { label: 'MATMUT', value: 'MATMUT' },
      { label: 'HARMONIE MUTUELLE', value: 'HARMONIE_MUTUELLE' },
      { label: 'MGEN', value: 'MGEN' }
    ];
  }

  initializeSteps(): void {
    this.steps = [
      { label: 'Informations personnelles' },
      { label: 'Comparer' },
      { label: 'Résultat' }
    ];
  }

  get enfants(): FormArray {
    return this.insuranceForm.get('personalInfo.enfants') as FormArray;
  }

  addEnfant(): void {
    this.enfants.push(this.fb.group({
      civilite: ['Monsieur', Validators.required],
      nom: ['', [Validators.required, this.noSpecialCharactersValidator]],
      prenom: ['', [Validators.required, this.noSpecialCharactersValidator]],
      dateNaissance: ['', [Validators.required, this.dateFormatValidator]],
      regime: ['TNS', Validators.required],
    }));
  }

  removeEnfant(index: number): void {
    this.enfants.removeAt(index);
  }

  private getCurrentStepGroup(stepIndex: number): FormGroup | null {
    const stepGroups = ['personalInfo', 'coverageSliders'];
    return stepGroups[stepIndex] ? this.insuranceForm.get(stepGroups[stepIndex]) as FormGroup : null;
  }

  nextStep(event?: Event): void {
    // Empêcher le comportement par défaut du scroll
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    // Marquer tous les champs comme touchés pour afficher les erreurs
    const personalInfoGroup = this.insuranceForm.get('personalInfo') as FormGroup;
    if (personalInfoGroup) {
      Object.keys(personalInfoGroup.controls).forEach(key => {
        const control = personalInfoGroup.get(key);
        if (control) {
          control.markAsTouched();
          if (control instanceof FormGroup) {
            Object.keys(control.controls).forEach(subKey => {
              control.get(subKey)?.markAsTouched();
            });
          }
        }
      });
    }
    
    // Vérifier si le formulaire est valide
    if (this.insuranceForm.get('personalInfo')?.valid) {
      if (this.activeIndex < 2) {
        this.activeIndex++;
      }
    } else {
      // Sauvegarder la position actuelle du scroll
      const currentScrollPosition = window.pageYOffset || document.documentElement.scrollTop;
      
      // Afficher une notification toast au lieu du message sous le bouton
      this.messageService.add({ 
        severity: 'warn', 
        summary: 'Champs manquants', 
        detail: 'Veuillez remplir tous les champs obligatoires avant de continuer.',
        life: 4000
      });
      
      // Forcer le maintien de la position de scroll après l'affichage du toast
      setTimeout(() => {
        window.scrollTo(0, currentScrollPosition);
      }, 0);
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
    this.isComparing = true;
    
    // Bloquer instantanément les sliders
    this.disableSliders();
    
    const needs: BesoinClient = this.insuranceForm.get('coverageSliders')?.value;

    this.comparisonSubscription = this.compareService.getComparisonResults(needs)
      .pipe(finalize(() => { 
        this.submitting = false;
        this.isComparing = false;
        this.enableSliders();
        this.comparisonSubscription = null;
      }))
      .subscribe({
        next: (response: any) => {
          if (response && response.table) {
            this.results = this.parseMarkdownTable(response.table);
            this.comparisonResults = this.results;
            setTimeout(() => {
              this.fetchAprilPrices();
              this.fetchAllUtwinPrices(); // Automatic fetch for Utwin
              this.fetchApiviaPrices(); // Automatic fetch for APIVIA
              this.fetchAlptisPrices(); // Automatic fetch for Alptis
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
          this.isComparing = false;
          this.enableSliders();
          this.comparisonSubscription = null;
          this.activeIndex = 2;
          if (err.status === 400 && err.error) {
            if (err.error.messages) {
}
          
            if (err.error.table) { // Handle markdown table even in case of 400 error
                this.results = this.parseMarkdownTable(err.error.table);
                this.comparisonResults = this.results;
                setTimeout(() => {
                  this.fetchAprilPrices();
                  this.fetchAllUtwinPrices(); // Automatic fetch for Utwin
                  this.fetchApiviaPrices(); // Automatic fetch for APIVIA
                  this.fetchAlptisPrices(); // Automatic fetch for Alptis
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
      
      // Si c'est déjà une chaîne au format DD/MM/YYYY, la retourner directement
      if (typeof date === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(date)) {
        return date;
      }
      
      // Si c'est un objet Date
      if (date instanceof Date && !isNaN(date.getTime())) {
        const day = (`0${date.getDate()}`).slice(-2);
        const month = (`0${date.getMonth() + 1}`).slice(-2);
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
      }
      
      // Si c'est une chaîne au format DD/MM/YYYY, convertir en Date puis reformater
      if (typeof date === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(date)) {
        const [day, month, year] = date.split('/');
        const d = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        if (!isNaN(d.getTime())) {
          return date; // La date est déjà au bon format
        }
      }
      
      console.warn('Invalid date format:', date);
      return '';
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
        let formulaNumber = formulaMatch ? (formulaMatch[1] || formulaMatch[2]) : '*';
        
        // Vérifier que le numéro de formule est valide pour Apivia (1-6)
        if (formulaNumber !== '*' && (parseInt(formulaNumber) < 1 || parseInt(formulaNumber) > 6)) {
          console.warn(`Formule Apivia invalide: ${formulaNumber}. Utilisation de la formule 6 par défaut.`);
          formulaNumber = '6';
        }

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

  private fetchAlptisPrices(): void {
    const personalInfo = this.insuranceForm.get('personalInfo')?.value;

    const formatDate = (date: any): string => {
      if (!date) return '';
      
      // Si c'est déjà une chaîne au format DD/MM/YYYY, convertir en YYYY-MM-DD
      if (typeof date === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(date)) {
        const [day, month, year] = date.split('/');
        return `${year}-${month}-${day}`;
      }
      
      // Si c'est un objet Date
      if (date instanceof Date && !isNaN(date.getTime())) {
        const year = date.getFullYear();
        const month = (`0${date.getMonth() + 1}`).slice(-2);
        const day = (`0${date.getDate()}`).slice(-2);
        return `${year}-${month}-${day}`;
      }
      
      console.warn('Invalid date format for Alptis:', date);
      return '';
    };

    const alptisProducts = this.comparisonResults.filter(result => {
      const assuranceName = result.assurance?.toLowerCase() || '';
      return assuranceName.includes('alptis');
    });

    if (alptisProducts.length === 0) {
      return; // No Alptis products, no need to proceed
    }

    // Déterminer le statut professionnel selon les règles métier
    const getStatutProfessionnel = (categorie: string, statutChoisi?: string): string => {
      switch (categorie) {
        case 'ARTISANS':
        case 'COMMERCANTS_ET_ASSIMILES':
          return 'ARTISAN_COMMERCANT';
        case 'PROFESSIONS_LIBERALES_ET_ASSIMILES':
          return 'PROFESSIONS_LIBERALES';
        case 'CHEFS_D_ENTREPRISE':
          return statutChoisi || 'ARTISAN_COMMERCANT'; // Obligatoire de préciser
        default:
          return 'ARTISAN_COMMERCANT';
      }
    };

    // Construire les assurés
    const assures: any = {
      adherent: {
        cadre_exercice: 'INDEPENDANT',
        categorie_socioprofessionnelle: personalInfo.categorieSocioProfessionnelle,
        code_postal: personalInfo.codePostal,
        date_naissance: formatDate(personalInfo.dateNaissance),
        micro_entrepreneur: true,
        regime_obligatoire: 'SECURITE_SOCIALE_INDEPENDANTS',
        statut_professionnel: getStatutProfessionnel(
          personalInfo.categorieSocioProfessionnelle,
          personalInfo.statutProfessionnel
        )
      }
    };

    // Ajouter conjoint si présent
    if (personalInfo.conjoint && (personalInfo.etatCivil === 'marie' || personalInfo.etatCivil === 'unionLibre') && personalInfo.conjoint.dateNaissance) {
      assures.conjoint = {
        categorie_socioprofessionnelle: personalInfo.categorieSocioProfessionnelle,
        date_naissance: formatDate(personalInfo.conjoint.dateNaissance),
        regime_obligatoire: 'SECURITE_SOCIALE_INDEPENDANTS'
      };
    }

    // Ajouter enfants si présents
    if (personalInfo.enfants && personalInfo.enfants.length > 0) {
      assures.enfants = personalInfo.enfants.map((enfant: any) => ({
        date_naissance: formatDate(enfant.dateNaissance),
        regime_obligatoire: 'SECURITE_SOCIALE_INDEPENDANTS'
      }));
    }

    alptisProducts.forEach(result => {
      result.isPricingLoading = true;

      // Extraire le niveau depuis la formule
      const niveauMatch = result.formule.match(/Niveau (\d+)/i);
      const niveau = niveauMatch ? `NIVEAU_${niveauMatch[1]}` : 'NIVEAU_1';

      // Déterminer sur_complementaire selon les règles du contracts.json
      const contractsData = [
        { contract_name: 'Santé Pro+ Surco', contract_type: 'Surcomplémentaire santé', sur_complementaire: true },
        { contract_name: 'Santé Pro+', contract_type: 'Complémentaire santé', sur_complementaire: false }
      ];

      const contractInfo = contractsData.find(c => 
        result.formule.toLowerCase().includes(c.contract_name.toLowerCase())
      );
      const surComplementaire = contractInfo ? contractInfo.sur_complementaire : false;

      // Calculer ayants_droit
      const ayantsDroit: any = {};
      if (assures.conjoint) {
        ayantsDroit.conjoint = true;
      }
      if (assures.enfants && assures.enfants.length > 0) {
        ayantsDroit.enfants = assures.enfants.length;
      }

      const alptisPayload = {
        date_effet: formatDate(personalInfo.dateEffet),
        assures: assures,
        combinaisons: [{
          numero: 1,
          offre: {
            niveau: niveau,
            sur_complementaire: surComplementaire
          },
          ayants_droit: ayantsDroit,
          commissionnement: 'PREC40_15'
        }]
      };

      console.log('Sending Alptis Payload:', alptisPayload);

      this.alptisService.getTarification(alptisPayload).pipe(
        finalize(() => { result.isPricingLoading = false; })
      ).subscribe({
        next: (response: any) => {
          console.log('Alptis Response:', response);
          
          // Gérer les deux formats de réponse possibles (camelCase et snake_case)
          const tarificationArray = response.resultatsTarification || response.resultats_tarification;
          
          if (response && tarificationArray && tarificationArray.length > 0) {
            const tarificationResult = tarificationArray[0];
            
            // Chercher le prix dans total_mensuel en priorité
            if (tarificationResult.tarifs && tarificationResult.tarifs.total_mensuel) {
              result.prix = parseFloat(tarificationResult.tarifs.total_mensuel);
              console.log('Prix Alptis extrait de total_mensuel:', result.prix);
              this.messageService.add({ 
                severity: 'success', 
                summary: 'Tarif Alptis Récupéré', 
                detail: `Prix pour ${result.formule}: ${result.prix}€/mois` 
              });
            } else if (tarificationResult.tarifs && tarificationResult.tarifs.cotisationMensuelle) {
              result.prix = parseFloat(tarificationResult.tarifs.cotisationMensuelle);
              console.log('Prix Alptis extrait de cotisationMensuelle:', result.prix);
              this.messageService.add({ 
                severity: 'success', 
                summary: 'Tarif Alptis Récupéré', 
                detail: `Prix pour ${result.formule}: ${result.prix}€/mois` 
              });
            } else {
              result.prix = 'N/A';
              console.warn('Aucun prix trouvé dans la réponse Alptis:', tarificationResult.tarifs);
              this.messageService.add({ 
                severity: 'warn', 
                summary: 'Tarif Alptis', 
                detail: `Aucun prix trouvé pour ${result.formule}.` 
              });
            }
          } else {
            result.prix = 'Erreur';
            this.messageService.add({ 
              severity: 'error', 
              summary: 'Erreur Alptis', 
              detail: 'La tarification Alptis a échoué.' 
            });
          }
        },
        error: (err: any) => {
          result.prix = 'Erreur';
          this.messageService.add({ 
            severity: 'error', 
            summary: 'Erreur Alptis', 
            detail: 'Une erreur est survenue lors de la récupération du tarif Alptis.' 
          });
          console.error('Alptis pricing error:', err);
        }
      });
    });
  }

  private transformFormToQuote(): InsuranceQuoteForm {
    const personalInfo = this.insuranceForm.get('personalInfo')?.value;
    const insuredPersons: InsuredPerson[] = [];

    // Helper pour convertir DD/MM/YYYY en Date
    const parseFormDate = (dateStr: string): Date => {
      if (!dateStr || typeof dateStr !== 'string') return new Date();
      
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
        const [day, month, year] = dateStr.split('/');
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      }
      
      return new Date(dateStr);
    };

    // Main person
    insuredPersons.push({
      lastName: personalInfo.nom,
      firstName: personalInfo.prenom,
      birthDate: parseFormDate(personalInfo.dateNaissance),
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
    if (personalInfo.conjoint && (personalInfo.etatCivil === 'marie' || personalInfo.etatCivil === 'unionLibre') && personalInfo.conjoint.dateNaissance) {
      insuredPersons.push({
        lastName: personalInfo.conjoint.nom,
        firstName: personalInfo.conjoint.prenom,
        birthDate: parseFormDate(personalInfo.conjoint.dateNaissance),
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
      if (enfant.dateNaissance) {
        insuredPersons.push({
          lastName: enfant.nom,
          firstName: enfant.prenom,
          birthDate: parseFormDate(enfant.dateNaissance),
          gender: enfant.sexe === 'garcon' ? 'M' : 'F',
          address: insuredPersons[0].address,
          email: '',
          phoneNumber: '',
          regime: enfant.regime,
          situation: 'celibataire',
          addressType: 'Actuelle'
        });
      }
    });

    return {
      productReference: '',
      insuredPersons: insuredPersons,
      contact: {
        email: personalInfo.email,
        phoneNumber: personalInfo.telephone1,
        address: insuredPersons[0].address
      },
      effectDate: parseFormDate(personalInfo.dateEffet),
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
        
        // Si c'est déjà une chaîne au format DD/MM/YYYY, la retourner directement
        if (typeof date === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(date)) {
          return date;
        }
        
        // Si c'est un objet Date
        if (date instanceof Date && !isNaN(date.getTime())) {
          const day = (`0${date.getDate()}`).slice(-2);
          const month = (`0${date.getMonth() + 1}`).slice(-2);
          const year = date.getFullYear();
          return `${day}/${month}/${year}`;
        }
        
        console.warn('Invalid date format for Apivia:', date);
        return '';
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
      let formulaNumber = formulaMatch ? (formulaMatch[1] || formulaMatch[2]) : '*';
      
      // Vérifier que le numéro de formule est valide pour Apivia (1-6)
      if (formulaNumber !== '*' && (parseInt(formulaNumber) < 1 || parseInt(formulaNumber) > 6)) {
        console.warn(`Formule Apivia invalide: ${formulaNumber}. Utilisation de la formule 6 par défaut.`);
        formulaNumber = '6';
      }

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
      // Modifier le productCode selon le type d'assurance April
      quoteForm.productReference = this.getAprilProductCode(result.assurance);
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
      const quote = this.transformFormToQuote();
      this.insuranceService.getUtwinTarif(quote, result.formule).subscribe({
        next: (response: any) => {
          console.log('Réponse Utwin complète:', response);
          
          if (response && response.propositions && response.propositions.length > 0) {
            // Extraire le code formule depuis result.formule
            let codeFormuleToFind = '';
            if (result.formule) {
              const formuleMatch = result.formule.match(/(?:Niveau|Formule)\s*(\d+)/i);
              if (formuleMatch) {
                codeFormuleToFind = 'N' + formuleMatch[1];
              }
            }
            
            console.log('Code formule recherché:', codeFormuleToFind);
            
            // Chercher la proposition avec commission 30/10 et le bon code formule
            const matchingProposition = response.propositions.find((p: any) => 
              p.codeFormule === codeFormuleToFind && 
              p.codeTauxCommissionRetenu === '30/10' &&
              p.libelleProduit?.includes("MULTI' Santé")
            );

            if (matchingProposition?.cotisationMensuelleEuros) {
              result.prix = matchingProposition.cotisationMensuelleEuros;
              console.log('Prix Utwin trouvé:', matchingProposition.cotisationMensuelleEuros);
            } else {
              console.log('Aucune proposition Utwin correspondante trouvée pour:', codeFormuleToFind);
              result.prix = 'N/A';
            }
          } else {
            console.log('Aucune proposition dans la réponse Utwin');
            result.prix = 'N/A';
          }
          
          result.isPricingLoading = false;
        },
        error: (error: any) => {
          console.error('Erreur lors de la récupération du prix Utwin:', error);
          result.prix = 'Erreur';
          result.isPricingLoading = false;
        }
      });

    // ALPTIS LOGIC
    } else if (assuranceName.includes('alptis')) {
      console.log('ALPTIS product detected. Starting tarification process.');
      const personalInfo = this.insuranceForm.get('personalInfo')?.value;
      if (!personalInfo) {
        result.isPricingLoading = false;
        console.error('Personal info not available for Alptis tarification');
        return;
      }

      const formatDate = (date: any): string => {
        if (!date) return '';
        
        // Si c'est déjà une chaîne au format DD/MM/YYYY, convertir en YYYY-MM-DD
        if (typeof date === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(date)) {
          const [day, month, year] = date.split('/');
          return `${year}-${month}-${day}`;
        }
        
        // Si c'est un objet Date
        if (date instanceof Date && !isNaN(date.getTime())) {
          const year = date.getFullYear();
          const month = (`0${date.getMonth() + 1}`).slice(-2);
          const day = (`0${date.getDate()}`).slice(-2);
          return `${year}-${month}-${day}`;
        }
        
        console.warn('Invalid date format:', date);
        return '';
      };

      const getStatutProfessionnel = (categorie: string, statutChoisi?: string): string => {
        switch (categorie) {
          case 'ARTISANS':
          case 'COMMERCANTS_ET_ASSIMILES':
            return 'ARTISAN_COMMERCANT';
          case 'PROFESSIONS_LIBERALES_ET_ASSIMILES':
            return 'PROFESSIONS_LIBERALES';
          case 'CHEFS_D_ENTREPRISE':
            return statutChoisi || 'ARTISAN_COMMERCANT';
          default:
            return 'ARTISAN_COMMERCANT';
        }
      };

      const assures: any = {
        adherent: {
          cadre_exercice: 'INDEPENDANT',
          categorie_socioprofessionnelle: personalInfo.categorieSocioProfessionnelle,
          code_postal: personalInfo.codePostal,
          date_naissance: formatDate(personalInfo.dateNaissance),
          micro_entrepreneur: true,
          regime_obligatoire: 'SECURITE_SOCIALE_INDEPENDANTS',
          statut_professionnel: getStatutProfessionnel(
            personalInfo.categorieSocioProfessionnelle,
            personalInfo.statutProfessionnel
          )
        }
      };

      // N'ajouter conjoint et enfants que s'ils existent réellement
      // L'API Alptis accepte un payload sans ces champs

      const niveauMatch = result.formule.match(/Niveau (\d+)/i);
      const niveau = niveauMatch ? `NIVEAU_${niveauMatch[1]}` : 'NIVEAU_1';

      const contractsData = [
        { contract_name: 'Santé Pro+ Surco', contract_type: 'Surcomplémentaire santé', sur_complementaire: true },
        { contract_name: 'Santé Pro+', contract_type: 'Complémentaire santé', sur_complementaire: false }
      ];

      const contractInfo = contractsData.find(c => 
        result.formule.toLowerCase().includes(c.contract_name.toLowerCase())
      );
      const surComplementaire = contractInfo ? contractInfo.sur_complementaire : false;

      const ayantsDroit: any = {
        conjoint: assures.conjoint ? true : false,
        enfants: (assures.enfants && assures.enfants.length > 0) ? assures.enfants.length : 0
      };

      const alptisPayload = {
        date_effet: formatDate(personalInfo.dateEffet),
        assures: assures,
        combinaisons: [{
          numero: 1,
          offre: {
            niveau: niveau,
            sur_complementaire: surComplementaire
          },
          ayants_droit: ayantsDroit,
          commissionnement: 'PREC40_15'
        }]
      };

      console.log('Alptis tarification payload:', alptisPayload);

      this.alptisService.getTarification(alptisPayload).pipe(
        finalize(() => { result.isPricingLoading = false; })
      ).subscribe({
        next: (response: any) => {
          console.log('Alptis tarification response:', response);
          console.log('Full response structure:', JSON.stringify(response, null, 2));
          
          // Debug response structure
          if (response) {
            console.log('Response keys:', Object.keys(response));
            console.log('Has resultatsTarification?', !!response.resultatsTarification);
            console.log('Has resultats_tarification?', !!response.resultats_tarification);
            if (response.resultatsTarification) {
              console.log('resultatsTarification length:', response.resultatsTarification.length);
            }
            if (response.resultats_tarification) {
              console.log('resultats_tarification length:', response.resultats_tarification.length);
            }
          }
          
          // Gérer les deux formats de réponse possibles
          const tarificationArray = response.resultatsTarification || response.resultats_tarification;
          
          if (response && tarificationArray && tarificationArray.length > 0) {
            const tarificationResult = tarificationArray[0];
            console.log('Tarification result:', tarificationResult);
            
            // Vérifier plusieurs structures possibles
            let prix = null;
            
            if (tarificationResult.tarifs) {
              console.log('Tarifs object:', tarificationResult.tarifs);
              
              // Essayer différents champs de prix (camelCase et snake_case)
              if (tarificationResult.tarifs.totalMensuel) {
                prix = parseFloat(tarificationResult.tarifs.totalMensuel);
                console.log('Prix trouvé dans totalMensuel:', prix);
              } else if (tarificationResult.tarifs.total_mensuel) {
                prix = parseFloat(tarificationResult.tarifs.total_mensuel);
                console.log('Prix trouvé dans total_mensuel:', prix);
              } else if (tarificationResult.tarifs.cotisationMensuelleBase) {
                prix = parseFloat(tarificationResult.tarifs.cotisationMensuelleBase);
                console.log('Prix trouvé dans cotisationMensuelleBase:', prix);
              } else if (tarificationResult.tarifs.cotisation_mensuelle) {
                prix = parseFloat(tarificationResult.tarifs.cotisation_mensuelle);
                console.log('Prix trouvé dans cotisation_mensuelle:', prix);
              } else if (tarificationResult.tarifs.montant_total) {
                prix = parseFloat(tarificationResult.tarifs.montant_total);
                console.log('Prix trouvé dans montant_total:', prix);
              } else if (typeof tarificationResult.tarifs === 'number') {
                prix = tarificationResult.tarifs;
                console.log('Prix trouvé directement dans tarifs:', prix);
              }
            }
            
            // Essayer aussi au niveau racine
            if (!prix && tarificationResult.prix) {
              prix = parseFloat(tarificationResult.prix);
              console.log('Prix trouvé dans prix:', prix);
            }
            
            if (!prix && tarificationResult.cotisation) {
              prix = parseFloat(tarificationResult.cotisation);
              console.log('Prix trouvé dans cotisation:', prix);
            }
            
            if (prix && prix > 0) {
              result.prix = prix;
              console.log('Alptis price updated:', result.prix);
              this.messageService.add({ 
                severity: 'success', 
                summary: 'Tarif Alptis Récupéré', 
                detail: `Prix pour ${result.formule} mis à jour.` 
              });
            } else {
              result.prix = 'N/A';
              console.warn('No valid price found in Alptis response');
              this.messageService.add({ 
                severity: 'warn', 
                summary: 'Tarif Alptis', 
                detail: `Aucun prix trouvé pour ${result.formule}.` 
              });
            }
          } else {
            result.prix = 'Erreur';
            console.error('Invalid Alptis tarification response structure');
            this.messageService.add({ 
              severity: 'error', 
              summary: 'Erreur Alptis', 
              detail: `Réponse API invalide pour ${result.formule}.` 
            });
          }
        },
        error: (err: any) => {
          result.prix = 'Erreur';
          console.error('Alptis tarification error:', err);
        }
      });

    } else {
      result.isPricingLoading = false;
      console.warn('No specific pricing logic for:', result.assurance);
    }
  }

  private getAprilProductCode(assuranceName: string): string {
    console.log('getAprilProductCode called with:', assuranceName);
    
    if (!assuranceName) {
      console.log('No assurance name provided, returning SantePro');
      return 'SantePro';    console.log('getAprilProductCode called with:', assuranceName);

    }
    
    const normalizedName = assuranceName.toLowerCase();
    console.log('Normalized name:', normalizedName);
    
    if (normalizedName.includes('santé pro start') || normalizedName.includes('sante pro start')) {
      console.log('Detected Santé Pro Start, returning SanteProStart');
      return 'SanteProStart';
    } else if (normalizedName.includes('santé pro') || normalizedName.includes('sante pro')) {
      console.log('Detected Santé Pro, returning SantePro');
      return 'SantePro';
    }
    
    console.log('No match found, returning default SantePro');
    return 'SantePro';
  }

  private updateUtwinPrice(offer: ComparisonResult, propositions: any[]): void {
    console.log('Updating Utwin price for offer:', offer.formule);
    console.log('Available propositions:', propositions.length);
    
    // Essayer différents formats : "Niveau X", "Formule X", ou juste un numéro
    let libelleProduit: string;
    let niveau: string;
    
    // Format "Produit Niveau X"
    let formulaParts = offer.formule.match(/(.+) Niveau (\d+)/i);
    if (formulaParts && formulaParts.length === 3) {
      libelleProduit = formulaParts[1].trim();
      niveau = formulaParts[2];
    } else {
      // Format "Produit Formule X"
      formulaParts = offer.formule.match(/(.+) Formule (\d+)/i);
      if (formulaParts && formulaParts.length === 3) {
        libelleProduit = formulaParts[1].trim();
        niveau = formulaParts[2];
      } else {
        // Extraire juste le numéro et déterminer le produit
        const numeroMatch = offer.formule.match(/(\d+)/);
        if (numeroMatch) {
          niveau = numeroMatch[1];
          // Déterminer le produit basé sur le nom de l'offre
          if (offer.formule.toLowerCase().includes('basic')) {
            libelleProduit = "BASIC' Santé";
          } else if (offer.formule.toLowerCase().includes('multi')) {
            libelleProduit = "MULTI' Santé";
          } else {
            // Par défaut, essayer MULTI' Santé
            libelleProduit = "MULTI' Santé";
          }
        } else {
          console.warn(`Formule format not recognized for automatic pricing: ${offer.formule}`);
          return;
        }
      }
    }

    const codeFormuleToFind = `N${niveau}`; // e.g., "N3"
    console.log(`Looking for: ${libelleProduit} with code ${codeFormuleToFind}`);

    const proposition = propositions.find((p: any) => {
      // Support both camelCase and underscore formats
      const apiProduct = p.libelle_produit || p.libelleProduit;
      const apiCodeFormule = p.code_formule || p.codeFormule;
      
      const normalizedApiProduct = this.normalizeUtwinProductName(apiProduct);
      const normalizedOfferProduct = this.normalizeUtwinProductName(libelleProduit);
      const matches = normalizedApiProduct === normalizedOfferProduct && apiCodeFormule === codeFormuleToFind;
      
      if (matches) {
        console.log(`Found matching proposition:`, p);
      }
      
      return matches;
    });

    if (proposition) {
      // Support both camelCase and underscore formats for price
      const price = proposition.cotisation_mensuelle_euros || proposition.cotisationMensuelleEuros;
      if (price) {
        offer.prix = price;
        console.log(`Price updated to: ${price}`);
      }
      // Stocker le codeTauxCommissionRetenu pour l'utiliser dans le payload
      const commissionCode = proposition.code_taux_commission_retenu || proposition.codeTauxCommissionRetenu;
      if (commissionCode) {
        // @ts-ignore - Ajout de la propriété dynamique
        offer.codeTauxCommissionRetenu = commissionCode;
      }
    } else {
      console.warn(`No matching Utwin proposition found for: ${libelleProduit} - ${codeFormuleToFind}`);
      // Afficher les propositions disponibles pour debug
      console.log('Available propositions:', propositions.map(p => ({
        libelle: p.libelle_produit || p.libelleProduit,
        code: p.code_formule || p.codeFormule,
        prix: p.cotisation_mensuelle_euros || p.cotisationMensuelleEuros
      })));
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
      civilite: 'M', 
      nom: 'Dupont', 
      prenom: 'Jean', 
      dateNaissance: '16/04/1999',
      regime: 'TNS', 
      etatCivil: 'celibataire', 
      adresse: '123 Rue de la République', 
      codePostal: '69001', 
      ville: 'Lyon',
      complementAdresse: 'Appartement 15', 
      dateEffet: (() => {
        const today = new Date();
        today.setDate(today.getDate() + 35);
        const day = today.getDate().toString().padStart(2, '0');
        const month = (today.getMonth() + 1).toString().padStart(2, '0');
        const year = today.getFullYear();
        return `${day}/${month}/${year}`;
      })(), 
      email: 'jean.dupont@example.com', 
      telephone1: '0612345678',
      telephone2: '0478901234',
      conjoint: {
        civilite: 'F',
        nom: 'Dupont',
        prenom: 'Marie',
        dateNaissance: '22/08/2001'
      }
    });
    
    // Supprimer tous les enfants - pas d'enfant dans l'exemple
    const enfantsArray = this.insuranceForm.get('personalInfo.enfants') as FormArray;
    while (enfantsArray.length) { enfantsArray.removeAt(0); }
    
    this.messageService.add({ 
      severity: 'success', 
      summary: 'Données chargées', 
      detail: 'Tous les champs ont été pré-remplis avec des données d\'exemple (sans enfant).' 
    });
  }

  resetForm(): void {
    this.insuranceForm.reset();
    this.enfants.clear();
    this.initializeForm();
    this.setupConjointListener();
    this.activeIndex = 0;
    this.results = [];
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
    } else if (result.assurance.toLowerCase().includes('alptis')) {
      const alptisPayload = this.buildAlptisQuotePayload(result);
      if (!alptisPayload) {
        this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de générer le devis Alptis, données manquantes.' });
        return;
      }
      
      this.alptisService.generateDevis(alptisPayload, action === 'telechargement').subscribe({
        next: (response: any) => {
          if (action === 'telechargement' && response.pdfBase64) {
            const byteCharacters = atob(response.pdfBase64);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'application/pdf' });
            
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `devis-alptis.pdf`;
            a.click();
            window.URL.revokeObjectURL(url);
            this.messageService.add({ severity: 'success', summary: 'Téléchargement', detail: 'Le devis Alptis est en cours de téléchargement.' });
          } else {
            this.messageService.add({ severity: 'success', summary: 'Email envoyé', detail: 'Le devis Alptis a été envoyé par email.' });
          }
        },
        error: () => this.messageService.add({ severity: 'error', summary: 'Erreur Alptis', detail: 'Impossible de générer le devis Alptis.' })
      });
    }
  }

  private buildAlptisQuotePayload(result: ComparisonResult): any {
    const personalInfo = this.insuranceForm.get('personalInfo')?.value;
    if (!personalInfo) return null;

    const formatDate = (date: any): string => {
      if (!date) return '';
      
      // Si c'est déjà une chaîne au format DD/MM/YYYY, convertir en YYYY-MM-DD
      if (typeof date === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(date)) {
        const [day, month, year] = date.split('/');
        return `${year}-${month}-${day}`;
      }
      
      // Si c'est un objet Date
      if (date instanceof Date && !isNaN(date.getTime())) {
        const year = date.getFullYear();
        const month = (`0${date.getMonth() + 1}`).slice(-2);
        const day = (`0${date.getDate()}`).slice(-2);
        return `${year}-${month}-${day}`;
      }
      
      console.warn('Invalid date format:', date);
      return '';
    };

    const getStatutProfessionnel = (categorie: string, statutChoisi?: string): string => {
      switch (categorie) {
        case 'ARTISANS':
        case 'COMMERCANTS_ET_ASSIMILES':
          return 'ARTISAN_COMMERCANT';
        case 'PROFESSIONS_LIBERALES_ET_ASSIMILES':
          return 'PROFESSIONS_LIBERALES';
        case 'CHEFS_D_ENTREPRISE':
          return statutChoisi || 'ARTISAN_COMMERCANT';
        default:
          return 'ARTISAN_COMMERCANT';
      }
    };

    const assures: any = {
      adherent: {
        cadre_exercice: 'INDEPENDANT',
        categorie_socioprofessionnelle: personalInfo.categorieSocioProfessionnelle,
        code_postal: personalInfo.codePostal,
        date_naissance: formatDate(personalInfo.dateNaissance),
        micro_entrepreneur: true,
        regime_obligatoire: 'SECURITE_SOCIALE_INDEPENDANTS',
        statut_professionnel: getStatutProfessionnel(
          personalInfo.categorieSocioProfessionnelle,
          personalInfo.statutProfessionnel
        ),
        nom: personalInfo.nom,
        prenom: personalInfo.prenom,
        email: personalInfo.email,
        telephone: personalInfo.telephone1
      }
    };

    if (personalInfo.conjoint && (personalInfo.etatCivil === 'marie' || personalInfo.etatCivil === 'unionLibre') && personalInfo.conjoint.dateNaissance) {
      assures.conjoint = {
        categorie_socioprofessionnelle: personalInfo.categorieSocioProfessionnelle,
        date_naissance: formatDate(personalInfo.conjoint.dateNaissance),
        regime_obligatoire: 'SECURITE_SOCIALE_INDEPENDANTS',
        nom: personalInfo.conjoint.nom || personalInfo.nom,
        prenom: personalInfo.conjoint.prenom
      };
    }

    if (personalInfo.enfants && personalInfo.enfants.length > 0) {
      assures.enfants = personalInfo.enfants.map((enfant: any) => ({
        date_naissance: formatDate(enfant.dateNaissance),
        regime_obligatoire: 'SECURITE_SOCIALE_INDEPENDANTS',
        nom: personalInfo.nom,
        prenom: enfant.prenom
      }));
    }

    const niveauMatch = result.formule.match(/Niveau (\d+)/i);
    const niveau = niveauMatch ? `NIVEAU_${niveauMatch[1]}` : 'NIVEAU_1';

    const contractsData = [
      { contract_name: 'Santé Pro+ Surco', contract_type: 'Surcomplémentaire santé', sur_complementaire: true },
      { contract_name: 'Santé Pro+', contract_type: 'Complémentaire santé', sur_complementaire: false }
    ];

    const contractInfo = contractsData.find(c => 
      result.formule.toLowerCase().includes(c.contract_name.toLowerCase())
    );
    const surComplementaire = contractInfo ? contractInfo.sur_complementaire : false;

    const ayantsDroit: any = {};
    if (assures.conjoint) {
      ayantsDroit.conjoint = true;
    }
    if (assures.enfants && assures.enfants.length > 0) {
      ayantsDroit.enfants = assures.enfants.length;
    }

    return {
      date_effet: formatDate(personalInfo.dateEffet),
      assures: assures,
      combinaisons: [{
        numero: 1,
        offre: {
          niveau: niveau,
          sur_complementaire: surComplementaire
        },
        ayants_droit: ayantsDroit,
        commissionnement: 'PREC40_15'
      }]
    };
  }

  private buildUtwinQuotePayload(result: ComparisonResult): any {
    const personalInfo = this.insuranceForm.get('personalInfo')?.value;
    if (!personalInfo) return null;

    const formatDate = (date: any): string => {
      if (!date) return '';
      
      // Si c'est déjà une chaîne au format DD/MM/YYYY, convertir en ISO
      if (typeof date === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(date)) {
        const [day, month, year] = date.split('/');
        const d = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        return d.toISOString();
      }
      
      // Si c'est un objet Date
      if (date instanceof Date && !isNaN(date.getTime())) {
        return date.toISOString();
      }
      
      console.warn('Invalid date format for ISO:', date);
      return '';
    };

    const mapRegime = (regime: string): string => {
      if (regime?.toUpperCase() === 'TNS') return 'SSI';
      return 'RG'; // Default
    };

    const mapCivilite = (civilite: string): string => {
      if (civilite === 'M') return 'Monsieur';
      if (civilite === 'F') return 'Madame';
      return civilite;
    };

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
    if (personalInfo.enfants && personalInfo.enfants.length > 0) {
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
    }

    let codeProduit = 'UTWIN_MULTI'; // Default
    let codeFormule = 'N1'; // Default
    if (result.formule) {
        const match = result.formule.match(/NIVEAU (\d+)/i);
        if (match && match[1]) {
            codeFormule = `N${match[1]}`;
        }
    }

    // Récupérer le codeTauxCommissionRetenu s'il existe, sinon utiliser '10/10' comme valeur par défaut
    const codeTauxCommission = 
      // @ts-ignore - Vérification de la propriété dynamique
      result.codeTauxCommissionRetenu || '10/10';

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
          tauxCommission: codeTauxCommission
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
      
      // Si c'est déjà une chaîne au format DD/MM/YYYY, convertir en YYYY-MM-DD
      if (typeof date === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(date)) {
        const [day, month, year] = date.split('/');
        return `${year}-${month}-${day}`;
      }
      
      // Si c'est un objet Date
      if (date instanceof Date && !isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
      
      console.warn('Invalid date format for ISO date:', date);
      return '';
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
        productCode: this.getAprilProductCode(result.assurance),
        effectiveDate: formatDate(personalInfo.dateEffet),
        ...(personalInfo.termination?.hasFormerContract && personalInfo.termination?.formerInsurer && personalInfo.termination?.formerContractReference ? {
          termination: {
            insurer: personalInfo.termination.formerInsurer,
            formerContractReference: personalInfo.termination.formerContractReference
          }
        } : {}),
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

  private buildUtwinRequest(): any {
    const personalInfo = this.insuranceForm.get('personalInfo')?.value;
    if (!personalInfo) {
      console.error('Personal info not available for Utwin request');
      return null;
    }

    console.log('Building Utwin request with personalInfo:', personalInfo);

    const formatDateISO = (date: any): string => {
      if (!date) {
        console.warn('Date is null/undefined, using current date');
        return new Date().toISOString();
      }
      
      let dateObj: Date;
      if (typeof date === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(date)) {
        const [day, month, year] = date.split('/');
        dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      } else if (date instanceof Date) {
        dateObj = date;
      } else {
        dateObj = new Date(date);
      }
      
      if (isNaN(dateObj.getTime())) {
        console.warn('Invalid date, using current date:', date);
        return new Date().toISOString();
      }
      
      return dateObj.toISOString();
    };

    const assures: any[] = [];

    // Assuré principal - validation des données
    const principalData = {
      codeRegimeObligatoire: this.mapRegimeToUtwin(personalInfo.regime) || 'SSI',
      codeTypeRole: 'AssurePrincipal',
      dateDeNaissance: formatDateISO(personalInfo.dateNaissance)
    };
    console.log('Principal assuré data:', principalData);
    assures.push(principalData);

    // Conjoint
    if (personalInfo.conjoint && personalInfo.conjoint.dateNaissance && 
        (personalInfo.etatCivil === 'marie' || personalInfo.etatCivil === 'unionLibre')) {
      const conjointData = {
        codeRegimeObligatoire: this.mapRegimeToUtwin(personalInfo.conjoint.regime) || 'SSI',
        codeTypeRole: 'Conjoint',
        dateDeNaissance: formatDateISO(personalInfo.conjoint.dateNaissance)
      };
      console.log('Conjoint data:', conjointData);
      assures.push(conjointData);
    }

    // Enfants
    if (personalInfo.enfants && Array.isArray(personalInfo.enfants)) {
      personalInfo.enfants.forEach((enfant: any, index: number) => {
        if (enfant && enfant.dateNaissance) {
          const enfantData = {
            codeRegimeObligatoire: this.mapRegimeToUtwin(enfant.regime) || 'SSI',
            codeTypeRole: 'Enfant',
            dateDeNaissance: formatDateISO(enfant.dateNaissance)
          };
          console.log(`Enfant ${index} data:`, enfantData);
          assures.push(enfantData);
        }
      });
    }

    const utwinRequest = {
      souscripteur: {
        adresse: {
          codePostal: personalInfo.codePostal || '69000'
          // ville supprimée - non requise par Utwin
        }
      },
      besoin: {
        dateEffet: formatDateISO(personalInfo.dateEffet)
      },
      assures: assures
    };

    console.log('Final Utwin request:', utwinRequest);
    return utwinRequest;
  }

  private mapRegimeToUtwin(regime: string): string {
    if (!regime) return 'SSI';
    
    const regimeMap: { [key: string]: string } = {
      'TNS': 'SSI',
      'SALARIE': 'SALARIE', 
      'FONCTIONNAIRE': 'FONCTIONNAIRE',
      'PROFESSIONS_LIBERALES': 'SSI',
      'ARTISAN_COMMERCANT': 'SSI'
    };
    return regimeMap[regime] || 'SSI';
  }

  private buildApiviaQuotePayload(result: ComparisonResult): any {
    const personalInfo = this.insuranceForm.get('personalInfo')?.value;
    if (!personalInfo) return null;

    const formatDate = (date: any): string => {
      if (!date) return '';
      
      // Si c'est déjà une chaîne au format DD/MM/YYYY, la retourner directement
      if (typeof date === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(date)) {
        return date;
      }
      
      // Si c'est un objet Date
      if (date instanceof Date && !isNaN(date.getTime())) {
        const day = ('0' + date.getDate()).slice(-2);
        const month = ('0' + (date.getMonth() + 1)).slice(-2);
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
      }
      
      console.warn('Invalid date format:', date);
      return '';
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
          natureVoie: 'RUE', // Default value required by Apivia API
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

  // Méthodes pour contrôler les sliders
  disableSliders(): void {
    const slidersGroup = this.insuranceForm.get('coverageSliders');
    if (slidersGroup) {
      slidersGroup.disable();
    }
  }

  enableSliders(): void {
    const slidersGroup = this.insuranceForm.get('coverageSliders');
    if (slidersGroup) {
      slidersGroup.enable();
    }
  }

  // Méthode pour annuler la comparaison
  cancelComparison(): void {
    if (this.comparisonSubscription) {
      this.comparisonSubscription.unsubscribe();
      this.comparisonSubscription = null;
    }
    
    this.submitting = false;
    this.isComparing = false;
    this.enableSliders();
    
    this.messageService.add({ 
      severity: 'info', 
      summary: 'Comparaison Annulée', 
      detail: 'Le processus de comparaison a été interrompu.' 
    });
  }

  // Méthodes pour l'extraction PDF
  onPdfFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
      this.selectedPdfFile = file;
      this.pdfExtractionMessage = null;
    } else {
      this.selectedPdfFile = null;
      this.pdfExtractionMessage = {
        type: 'error',
        text: 'Veuillez sélectionner un fichier PDF valide.'
      };
    }
  }

  extractPdfData(): void {
    if (!this.selectedPdfFile || !this.selectedInsurer || !this.selectedLevelName) {
      this.pdfExtractionMessage = {
        type: 'error',
        text: 'Veuillez sélectionner un fichier PDF, un assureur et indiquer le niveau/formule.'
      };
      return;
    }

    this.isExtractingPdf = true;
    this.pdfExtractionMessage = {
      type: 'info',
      text: 'Extraction en cours... Cela peut prendre quelques instants.'
    };

    const formData = new FormData();
    formData.append('pdf_file', this.selectedPdfFile);
    formData.append('level_name', this.selectedLevelName);

    // URL du service d'extraction PDF (comparateur_brokins-master)
    const extractionUrl = 'http://localhost:5000/extract';

    this.http.post(extractionUrl, formData).pipe(
      finalize(() => {
        this.isExtractingPdf = false;
      })
    ).subscribe({
      next: (response: any) => {
        console.log('PDF extraction response:', response);
        this.handlePdfExtractionSuccess(response);
      },
      error: (error) => {
        console.error('PDF extraction error:', error);
        this.handlePdfExtractionError(error);
      }
    });
  }

  private handlePdfExtractionSuccess(extractedData: any): void {
    try {
      // Mapping des garanties PDF vers les sliders
      const guaranteeMapping = this.mapPdfToSliders(extractedData);
      
      if (guaranteeMapping) {
        // Remplir automatiquement les sliders
        this.populateSliders(guaranteeMapping);
        
        this.pdfExtractionMessage = {
          type: 'success',
          text: 'Extraction réussie ! Les sliders ont été remplis automatiquement.'
        };
      } else {
        this.pdfExtractionMessage = {
          type: 'warn',
          text: 'Extraction réussie mais aucune garantie compatible trouvée.'
        };
      }
    } catch (error) {
      console.error('Error processing extracted data:', error);
      this.pdfExtractionMessage = {
        type: 'error',
        text: 'Erreur lors du traitement des données extraites.'
      };
    }
  }

  private handlePdfExtractionError(error: any): void {
    let errorMessage = 'Erreur lors de l\'extraction du PDF.';
    
    if (error.status === 0) {
      errorMessage = 'Impossible de se connecter au service d\'extraction. Vérifiez que le serveur est démarré.';
    } else if (error.error?.error) {
      errorMessage = error.error.error;
    }

    this.pdfExtractionMessage = {
      type: 'error',
      text: errorMessage
    };
  }

  private mapPdfToSliders(extractedData: any): any {
    if (!extractedData?.benefits) {
      return null;
    }

    const benefits = extractedData.benefits;
    const mapping: any = {};

    // Mapping selon les correspondances spécifiées
    // "honoraires_chirurgien_optam" -> Hospitalisation
    if (benefits.HOSPITALISATION?.honoraires_chirurgien_optam) {
      mapping.hospitalisation = this.extractNumericValue(benefits.HOSPITALISATION.honoraires_chirurgien_optam);
    }

    // "chambre_particuliere" -> Chambre particulière
    if (benefits.HOSPITALISATION?.chambre_particuliere) {
      mapping.chambreParticuliere = this.extractNumericValue(benefits.HOSPITALISATION.chambre_particuliere);
    }

    // "consultation_generaliste_optam" -> Honoraires
    if (benefits.SOINS_COURANTS?.consultation_generaliste_optam) {
      mapping.honoraires = this.extractNumericValue(benefits.SOINS_COURANTS.consultation_generaliste_optam);
    }

    // "soins_dentaires" -> Dentaire
    if (benefits.DENTAIRE?.soins_dentaires) {
      mapping.dentaire = this.extractNumericValue(benefits.DENTAIRE.soins_dentaires);
    }

    // "implantologie" -> Forfait dentaire
    if (benefits.DENTAIRE?.implantologie) {
      mapping.forfaitDentaire = this.extractNumericValue(benefits.DENTAIRE.implantologie);
    }

    // "orthodontie" -> Orthodontie
    if (benefits.DENTAIRE?.orthodontie) {
      mapping.orthodontie = this.extractNumericValue(benefits.DENTAIRE.orthodontie);
    }

    // "verres_complexes" -> Forfait optique
    if (benefits.OPTIQUE?.verres_complexes) {
      mapping.forfaitOptique = this.extractNumericValue(benefits.OPTIQUE.verres_complexes);
    }

    return Object.keys(mapping).length > 0 ? mapping : null;
  }

  private extractNumericValue(value: string): number {
    if (!value) return 0;
    
    // Extraire les nombres de la chaîne (ex: "250 % BRSS" -> 250, "60 €" -> 60)
    const match = value.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  private populateSliders(mapping: any): void {
    const slidersGroup = this.insuranceForm.get('coverageSliders');
    if (!slidersGroup) return;

    // Remplir chaque slider avec les valeurs extraites
    Object.keys(mapping).forEach(key => {
      const control = slidersGroup.get(key);
      if (control && mapping[key] !== undefined) {
        control.setValue(mapping[key]);
      }
    });

    // Marquer les contrôles comme touchés pour déclencher la validation
    slidersGroup.markAsTouched();
  }
}