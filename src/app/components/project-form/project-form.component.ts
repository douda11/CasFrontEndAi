import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  FormArray,
  ReactiveFormsModule,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MessageService } from 'primeng/api';

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
    MultiSelectModule
    
  ]
})
export class ProjectFormComponent implements OnInit {
  projectForm!: FormGroup;

  // ————————————————————————————————
  // Dropdown / Radio / Multiselect options
  // ————————————————————————————————
  typeContactOptions: SelectOption[] = [
    { label: 'Personne physique', value: 'personne_physique' },
    { label: 'Personne morale', value: 'personne_morale' }
  ];

  statutOptions: SelectOption[] = [
    // TODO: Remplacer par les valeurs exactes “Statut” provenant d’HUBSPOT
    { label: 'À traiter', value: 'a_traiter' },
    { label: 'En cours', value: 'en_cours' },
    { label: 'Clos', value: 'clos' }
  ];

  origineOptions: SelectOption[] = [
    // TODO: Remplacer par les valeurs exactes “Origine” provenant d’HUBSPOT
    { label: 'Back-office', value: 'back_office' },
    { label: 'Réseau', value: 'reseau' },
    { label: 'Partenaire', value: 'partenaire' }
  ];

  banqueOptions: SelectOption[] = [
    // TODO: Lister ici les banques UTWIN / codes APRIL (exemple)
    { label: 'Sélectionner une banque', value: null },
    { label: 'BNP Paribas', value: 'bnp' },
    { label: 'Société Générale', value: 'socgen' },
    { label: 'Crédit Agricole', value: 'credit_agri' }
    // … etc.
  ];

  projetOptions: SelectOption[] = [
    // Pour UTWIN = “TypePret” ; pour APRIL = “TypeProjet”
    // TODO: Remplacer par les valeurs exactes de “projet” dans Excel
    { label: 'Prêt Immo', value: 'pret_immo' },
    { label: 'Rachat de crédit', value: 'rachat_credit' },
    { label: 'Travaux', value: 'travaux' }
  ];

  civiliteOptions: SelectOption[] = [
    { label: 'Monsieur', value: 'Monsieur' },
    { label: 'Madame', value: 'Madame' },
    { label: 'Mademoiselle', value: 'Mademoiselle' }
  ];

  paysOptions: SelectOption[] = [
    // TODO: Compléter la liste des pays d’après votre Excel
    { label: 'France', value: 'FR' },
    { label: 'Belgique', value: 'BE' },
    { label: 'Suisse', value: 'CH' },
    { label: 'Luxembourg', value: 'LU' },
    { label: 'Italie', value: 'IT' },
    { label: 'Espagne', value: 'ES' },
    { label: 'Allemagne', value: 'DE' },
    { label: 'Autre', value: 'OTHER' }
  ];

  etatCivilOptions: SelectOption[] = [
    // “État civil” = statut marital, par ex.
    { label: 'Célibataire', value: 'celibataire' },
    { label: 'Marié(e)', value: 'marie' },
    { label: 'Divorcé(e)', value: 'divorce' },
    { label: 'Veuf/veuve', value: 'veuf' }
  ];

  fumeurOptions: SelectOption[] = [
    { label: 'Non', value: false },
    { label: 'Oui', value: true }
  ];

  categorieProOptions: SelectOption[] = [
    // TODO: Injecter tous les codes d’après votre Excel APRIL/UTWIN
    { label: 'Artisan BTP', value: 'ArtisanBTP' },
    { label: 'Médecin', value: 'Medecin' },
    { label: 'Professions agricoles', value: 'ExploitantAgricole' },
    { label: 'Cadre Assimilé Cadre', value: 'CadreAssimileCadre' },
    { label: 'Sans profession', value: 'SansProfession' }
    // … etc.
  ];

  professionOptions: SelectOption[] = [
    // TODO: Compléter d’après l’Excel
    { label: 'Plombier', value: 'Plombier' },
    { label: 'Médecin Généraliste', value: 'MedecinGeneraliste' },
    { label: 'Agriculteur', value: 'Agriculteur' },
    { label: 'Cadre', value: 'Cadre' },
    { label: 'Ouvrier', value: 'Ouvrier' }
    // … etc.
  ];

  deplacementProOptions: SelectOption[] = [
    { label: 'Non', value: false },
    { label: 'Oui', value: true }
  ];

  manutentionOptions: SelectOption[] = [
    { label: 'Non', value: false },
    { label: 'Oui', value: true }
  ];

  travailHauteurOptions: SelectOption[] = [
    { label: 'Non', value: false },
    { label: 'Oui', value: true }
  ];

  typePretOptions: SelectOption[] = [
    // TODO: Remplacer par les types de prêt exacts UTWIN/APRIL
    { label: 'Classique', value: 'Classique' },
    { label: 'Différé', value: 'Differe' },
    { label: 'Taux Zéro', value: 'TauxZero' },
    { label: 'In Fine', value: 'InFine' },
    { label: 'Prêt Relais', value: 'PretRelais' }
  ];

  typeDiffereOptions: SelectOption[] = [
    // TODO: Remplacer par les valeurs exactes de “Type de différé”
    { label: 'Franchise totale', value: 'franchise_totale' },
    { label: 'Franchise partielle', value: 'franchise_partielle' }
  ];

  garantiesOptions: SelectOption[] = [
    // TODO: Remplacer par les codes de garanties exacts
    { label: 'Décès', value: 'Deces' },
    { label: 'PTIA', value: 'PTIA' },
    { label: 'ITT', value: 'ITT' },
    { label: 'IPT', value: 'IPT' },
    { label: 'IPP', value: 'IPP' },
    { label: 'Invalidité Pro. Méd.', value: 'InvaliditeProfessionsMedicales' }
  ];

  // ————————————————————————————————
  // Variables auxiliaires
  // ————————————————————————————————
  today = new Date();
  defaultDateEffet!: Date; // 05/(M+2)/YYYY

  constructor(
    private fb: FormBuilder,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.computeDefaultDateEffet();
    this.buildForm();

    // Si “personne_morale”, on rend Raison sociale et SIRET obligatoires
    this.projectForm.get('typeContact')!.valueChanges.subscribe((type) => {
      if (type === 'personne_morale') {
        this.projectForm.get('raisonSociale')!.setValidators([Validators.required]);
        this.projectForm.get('siret')!.setValidators([Validators.required]);
      } else {
        this.projectForm.get('raisonSociale')!.clearValidators();
        this.projectForm.get('siret')!.clearValidators();
      }
      this.projectForm.get('raisonSociale')!.updateValueAndValidity();
      this.projectForm.get('siret')!.updateValueAndValidity();
    });
  }

  private computeDefaultDateEffet(): void {
    // “05/(M+2)/année en cours”
    const year = this.today.getFullYear();
    let month = this.today.getMonth() + 2; // JS: janvier=0… donc +2
    if (month > 11) {
      month = month - 12;
      // si on dépasse décembre, année+1
      // Mais la consigne dit “année en cours”, on la laisse telle quelle,
      // ou on peut améliorer si vous le souhaitez.
    }
    // On fixe le jour à 5
    this.defaultDateEffet = new Date(year, month, 5);
  }

  private buildForm(): void {
    this.projectForm = this.fb.group({
      // ————————————————————————————————
      // Masqués “NE PAS AFFICHER”
      // ————————————————————————————————
      projetPrioritaire: [{ value: false, disabled: true }], 
      commercial: [{ value: 'login_hubspot_utilisateur', disabled: true }], 
      gestionnaire: [{ value: 'login_hubspot_gestionnaire', disabled: true }],

      // Les champs “Type de contact” et Démarche sont visibles/masqués ci-dessous
      demarcheCommerciale: [{ value: 'nouveau_contrat', disabled: true }],
      nouveauProjet: [{ value: false, disabled: true }], 
      dateSignature: [{ value: null, disabled: true }],

      // “Code APE”, “Nombre d’employés”, etc. masqués
      codeApe: [{ value: '', disabled: true }],
      nbEmployes: [{ value: null, disabled: true }],
      dateCreation: [{ value: null, disabled: true }],
      formeJuridique: [{ value: '', disabled: true }],
      conventionCollective: [{ value: '', disabled: true }],
      fonctionEntreprise: [{ value: '', disabled: true }],

      // Si besoin : vous pouvez ajouter d’autres masqués APRIL/UTWIN ici
      // (les noms doivent exactement correspondre aux clés du schéma back-end)
      // (ex. : typeSouscripteur, typeGaranties, typeProjets, origineProjet, etc.)
      typeSouscripteur: [{ value: 'EmprunteurPrincipal', disabled: true }],
      typeGaranties: [{ value: 'Deces,PTIA,ITT,IPT,IPP', disabled: true }],
      typeProjets: [{ value: 'ResidencePrincipale', disabled: true }],
      origineProjet: [{ value: 'BackOffice', disabled: true }],
      refProduitUTWIN: [{ value: 'PRET PREVOIR-PARTNER CRD', disabled: true }],
      codeProduitAPRIL: [{ value: 'ADPIntegral', disabled: true }],

      // ————————————————————————————————
      // Les champs visibles
      // ————————————————————————————————
      typeContact: ['personne_physique', Validators.required],
      dateEffetSouhaitee: [this.defaultDateEffet, Validators.required],

      statut: [null, Validators.required],
      origine: [null, Validators.required],
      banque: [null, Validators.required],
      projet: [null, Validators.required],

      civilite: [null, Validators.required],
      nom: ['', Validators.required],
      prenom: ['', Validators.required],
      adresse: ['', Validators.required],
      complementAdresse: [''],
      ville: ['', Validators.required],
      pays: ['FR', Validators.required],
      telephone: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],

      raisonSociale: [''], // rendu obligatoire si “personne_morale”
      siret: [''],         // rendu obligatoire si “personne_morale”

      dateNaissance: [null as Date | null, Validators.required],
      etatCivil: [null, Validators.required],
      fumeur: [false, Validators.required],
      categoriePro: [null, Validators.required],
      profession: [null, Validators.required],

      deplacementsPro: [false],
      manutention: [false],
      travailHauteur: [false],
      totalEncoursAssures: [null as number | null, Validators.required],

      typePret: [null, Validators.required],
      capitalRestantDu: [null as number | null, Validators.required],
      tauxPret: [null as number | null, Validators.required],
      dureeRestante: [null as number | null, Validators.required],
      dontDiffere: [null as number | null],
      typeDiffere: [null],
      mensualite: [null as number | null, Validators.required],
      duree: [null as number | null, Validators.required],
      quotite: [null as number | null, Validators.required],

      garanties: [[], Validators.required], // liste de strings
      franchise: [null as number | null, Validators.required],
      affectionsDisco: [false],
      maladiesPsychiques: [false],

      fraisDistribution: [null as number | null]
    });
  }

  // ————————————————————————————————
  // Soumission du formulaire
  // ————————————————————————————————
  onSubmit(): void {
    if (this.projectForm.invalid) {
      this.projectForm.markAllAsTouched();
      this.messageService.add({
        severity: 'warn',
        summary: 'Formulaire incomplet',
        detail: 'Veuillez renseigner tous les champs obligatoires.'
      });
      return;
    }

    // getRawValue() retourne aussi les champs désactivés (NE PAS AFFICHER)
    const payload = this.projectForm.getRawValue();
    console.log('Payload à envoyer →', payload);

    this.messageService.add({
      severity: 'success',
      summary: 'Succès',
      detail: 'Le formulaire a été validé et le payload généré.'
    });

    // Ici, vous pouvez appeler votre service pour envoyer à Utwin / April
    // ex. this.myService.sendComparison(payload).subscribe(...)
  }
}
