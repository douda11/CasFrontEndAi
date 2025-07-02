// src/app/components/tarif-april/tarif-april.component.ts

import { Component, OnInit } from '@angular/core';
import {
  FormGroup,
  FormArray,
  FormBuilder,
  Validators,
  AbstractControl
} from '@angular/forms';
import { AprilService } from '../../../services/april.service';
import { MessageService } from 'primeng/api';
import { finalize } from 'rxjs/operators';
import { HttpErrorResponse } from '@angular/common/http';
import { v4 as uuidv4 } from 'uuid';

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
import { ToastModule } from 'primeng/toast';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { DividerModule } from 'primeng/divider';

type SelectOption = { label: string; value: any };

@Component({
  selector: 'app-tarif-april',
  templateUrl: './tarif-april.component.html',
  styleUrls: ['./tarif-april.component.scss'],
  standalone: true,
  providers: [MessageService],
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
    ToastModule,
    ProgressSpinnerModule,
    DividerModule
  ]
})
export class TarifAprilComponent implements OnInit {
  insuranceForm!: FormGroup;
  steps: { label: string }[] = [];
  activeIndex = 0;
  loading = false;
  submitting = false;
  quoteResponse: any = null;

  // Dropdown options:
  projectTypeOptions: SelectOption[] = [
    { label: 'Résidence principale', value: 'ResidencePrincipale' },
    { label: 'Résidence secondaire', value: 'ResidenceSecondaire' },
    { label: 'Travaux résidence principale', value: 'TravauxResidencePrincipale' },
    { label: 'Travaux résidence secondaire', value: 'TravauxResidenceSecondaire' },
    { label: 'Investissement locatif', value: 'InvestissementLocatif' },
    { label: 'Prêt professionnel', value: 'PretProfessionnel' },
    { label: 'Prêt consommation', value: 'PretConsommation' },
    { label: 'Autres', value: 'Autres' }
  ];

  civilityOptions: SelectOption[] = [
    { label: 'Monsieur', value: 'Monsieur' },
    { label: 'Madame', value: 'Madame' },
    { label: 'Mademoiselle', value: 'Mademoiselle' }
  ];

  professionalCategoryOptions: SelectOption[] = [
    { label: 'Salarié', value: 'assure' },
    { label: 'Profession libérale', value: 'professionnel' },
    { label: 'Fonctionnaire', value: 'fonctionnaire' },
    { label: 'Retraité', value: 'retraite' },
    { label: 'Sans emploi', value: 'sansemploi' },
    { label: 'Autre', value: 'autre' }
  ];

  professionOptions: SelectOption[] = [
    { label: 'Cadre', value: 'Cadre' },
    { label: 'Employé', value: 'Employe' },
    { label: 'Ouvrier', value: 'Ouvrier' },
    { label: 'Commerçant', value: 'Commercant' },
    { label: 'Profession libérale', value: 'ProfessionLiberale' },
    { label: 'Agriculteur', value: 'Agriculteur' },
    { label: 'Retraité', value: 'Retraite' },
    { label: 'Sans emploi', value: 'SansEmploi' },
    { label: 'Autre', value: 'Autre' }
  ];

  loanTypeOptions: SelectOption[] = [
    { label: 'Classique', value: 'Classique' },
    { label: 'Différé', value: 'Differe' },
    { label: 'Taux Zéro', value: 'TauxZero' },
    { label: 'In Fine', value: 'InFine' },
    { label: 'Prêt Relais', value: 'PretRelais' },
    { label: 'Prêt à Paliers', value: 'PretAPaliers' },
    { label: 'Crédit Bail', value: 'CreditBail' }
  ];

  rateTypeOptions: SelectOption[] = [
    { label: 'Fixe', value: 'Fixe' },
    { label: 'Variable', value: 'Variable' }
  ];

  coverageOptionsList: SelectOption[] = [
    { label: 'Décès', value: 'Deces' },
    { label: 'PTIA', value: 'PTIA' },
    { label: 'ITT', value: 'ITT' },
    { label: 'IPT', value: 'IPT' },
    { label: 'IPP', value: 'IPP' },
    { label: 'Invalidité Pro. Méd.', value: 'InvaliditeProfessionsMedicales' }
  ];

  countryOptions: SelectOption[] = [
    { label: 'France', value: 'FR' },
    { label: 'Belgique', value: 'BE' },
    { label: 'Suisse', value: 'CH' },
    { label: 'Luxembourg', value: 'LU' },
    { label: 'Allemagne', value: 'DE' },
    { label: 'Espagne', value: 'ES' },
    { label: 'Italie', value: 'IT' },
    { label: 'Autre', value: 'OTHER' }
  ];

  constructor(
    private fb: FormBuilder,
    private aprilService: AprilService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    // Build the reactive form
    this.insuranceForm = this.fb.group({
      projectUuid: [''],
      projectDetails: this.fb.group({
        projectType: ['', Validators.required],
        effectiveDate: [null as Date | null, Validators.required],
        commission: [null as number | null, Validators.required],
        email: ['', [Validators.required, Validators.email]],
        moralSubscriber: [false],
        cancellation: [false],
        addressLine1: ['', Validators.required],
        postCode: ['', [Validators.required, Validators.pattern(/^[0-9]{5}$/)]],
        city: ['', Validators.required],
        countryCode: ['FR', Validators.required]
      }),
      borrowers: this.fb.array([this.createPersonGroup()]),
      loans: this.fb.array([this.createLoanGroup()]),
      coverageOptions: this.fb.array([this.createCoverageGroup()])
    });

    // Initialize wizard steps
    this.steps = [
      { label: 'Détails du projet' },
      { label: 'Emprunteurs' },
      { label: 'Prêts' },
      { label: 'Garanties' },
      { label: 'Validation' }
    ];

    // Keep loanRefOptions updated when the loans array changes
    this.loans.valueChanges.subscribe(() => {
      // Trigger getter reevaluation
    });
  }

  // ─── loanRefOptions getter ────────────────────────────────────
  get loanRefOptions(): SelectOption[] {
    return this.loans.controls.map((grp: AbstractControl) => {
      const id = grp.get('$id')!.value;
      const type = grp.get('loanType')!.value;
      return { label: `${type} (${id})`, value: id };
    });
  }

  // ------------- FormArray getters -------------
  get borrowers(): FormArray {
    return this.insuranceForm.get('borrowers') as FormArray;
  }

  get loans(): FormArray {
    return this.insuranceForm.get('loans') as FormArray;
  }

  get coverageOptionsArray(): FormArray {
    return this.insuranceForm.get('coverageOptions') as FormArray;
  }

  // ------------- FormGroup builders -------------
  private createPersonGroup(): FormGroup {
    return this.fb.group({
      $id: [uuidv4()],
      title: [null as string | null, Validators.required],
      lastName: ['', Validators.required],
      firstName: ['', Validators.required],
      birthDate: [null as Date | null, Validators.required],
      birthDepartment: ['', Validators.required],
      birthCity: ['', Validators.required],
      nationality: ['FR', Validators.required],
      birthCountry: ['FR', Validators.required],
      professionalCategory: [null as string | null, Validators.required],
      profession: [null as string | null, Validators.required],
      abroadTravel: [false],
      aerialOrLandSport: [false],
      highMileage: [false],
      workAtHeight: [false],
      heavyLoadHandling: [false],
      openEndedContractHolder: [false],
      noticeOfTermination: [false],
      remainingAccountLemoine: [null as number | null],
      smoker: [false],
      politicallyExposedPerson: [false],
      politicallyExposedRelatives: [false]
    });
  }

  private createLoanGroup(): FormGroup {
    return this.fb.group({
      $id: [uuidv4()],
      loanType: [null as string | null, Validators.required],
      borrowedAmount: [null as number | null, [Validators.required, Validators.min(0)]],
      interestRate: [null as number | null, [Validators.required, Validators.min(0)]],
      loanDuration: [null as number | null, [Validators.required, Validators.min(1)]]
    });
  }

  private createCoverageGroup(): FormGroup {
    return this.fb.group({
      loanRef: [null as string | null, Validators.required],
      guaranteeCode: [null as string | null, Validators.required],
      coveragePercentage: [100, [Validators.required, Validators.min(1), Validators.max(100)]],
      deductibleCode: ['030', Validators.required],
      levelCode: [''],
      compensationMode: ['']
    });
  }

  // ------------- Add / Remove FormArray items -------------
  addBorrower(): void {
    this.borrowers.push(this.createPersonGroup());
  }

  removeBorrower(idx: number): void {
    if (this.borrowers.length > 1) {
      this.borrowers.removeAt(idx);
    }
  }

  addLoan(): void {
    this.loans.push(this.createLoanGroup());
  }

  removeLoan(idx: number): void {
    if (this.loans.length > 1) {
      this.loans.removeAt(idx);
    }
  }

  addCoverage(): void {
    this.coverageOptionsArray.push(this.createCoverageGroup());
  }

  removeCoverage(idx: number): void {
    if (this.coverageOptionsArray.length > 1) {
      this.coverageOptionsArray.removeAt(idx);
    }
  }

  // ------------- Navigation -------------
  nextStep(): void {
    if (this.isCurrentStepValid()) {
      this.activeIndex++;
    }
  }

  previousStep(): void {
    if (this.activeIndex > 0) {
      this.activeIndex--;
    }
  }

  private isCurrentStepValid(): boolean {
    let valid = true;
    switch (this.activeIndex) {
      case 0:
        if (this.insuranceForm.get('projectDetails')!.invalid) {
          this.markGroupTouched(this.insuranceForm.get('projectDetails')! as FormGroup);
          valid = false;
        }
        break;
      case 1:
        this.borrowers.controls.forEach((grp: AbstractControl) => {
          if ((grp as FormGroup).invalid) {
            this.markGroupTouched(grp as FormGroup);
            valid = false;
          }
        });
        break;
      case 2:
        this.loans.controls.forEach((grp: AbstractControl) => {
          if ((grp as FormGroup).invalid) {
            this.markGroupTouched(grp as FormGroup);
            valid = false;
          }
        });
        break;
      case 3:
        this.coverageOptionsArray.controls.forEach((grp: AbstractControl) => {
          if ((grp as FormGroup).invalid) {
            this.markGroupTouched(grp as FormGroup);
            valid = false;
          }
        });
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

  private markGroupTouched(group: FormGroup): void {
    Object.keys(group.controls).forEach(key => {
      const ctrl = group.get(key);
      if (ctrl instanceof FormGroup) {
        this.markGroupTouched(ctrl);
      } else {
        ctrl?.markAsTouched();
      }
    });
  }

  // ------------- Load Example Data -------------
  loadExampleData(): void {
    const example = {
      $type: 'Emprunteur' as const,
      properties: {
        addresses: [
          {
            $id: 'adr-1',
            type: 'Actuelle',
            postCode: '38100',
            city: 'GRENOBLE',
            addressLine1: undefined,
            addressLine2: undefined,
            addressLine3: undefined,
            addressLine4: undefined,
            countryCode: undefined
          }
        ],
        cancellation: false,
        projectType: 'ResidencePrincipale',
        email: 'damien.valcarcel@april.com',
        commission: '4010',
        moralSubscriber: false,
        effectiveDate: '2025-10-10'
      },
      persons: [
        {
          $id: 'i-1',
          title: 'Monsieur',
          lastName: 'test',
          firstName: 'profilhori',
          birthDate: '1999-07-01',
          smoker: false,
          politicallyExposedPerson: false,
          politicallyExposedRelatives: false,
          birthDepartment: '38',
          birthCity: 'LA TRONCHE',
          nationality: '64',
          birthCountry: 'FR',
          professionalCategory: 'ArtisanBTP',
          profession: 'Plombier',
          abroadTravel: false,
          aerialOrLandSport: false,
          highMileage: false,
          workAtHeight: false,
          heavyLoadHandling: false,
          openEndedContractHolder: true,
          noticeOfTermination: false,
          remainingAccountLemoine: 0
        },
        {
          $id: 'i-2',
          title: 'Madame',
          lastName: 'test',
          firstName: 'profillemoi',
          birthDate: '1999-07-01',
          smoker: false,
          politicallyExposedPerson: false,
          politicallyExposedRelatives: false,
          birthDepartment: '38',
          birthCity: 'LA TRONCHE',
          nationality: '64',
          birthCountry: 'FR',
          professionalCategory: 'Medecin',
          profession: 'MedecinGeneraliste',
          abroadTravel: false,
          aerialOrLandSport: false,
          highMileage: false,
          workAtHeight: false,
          heavyLoadHandling: false,
          openEndedContractHolder: true,
          noticeOfTermination: false,
          remainingAccountLemoine: 10000
        }
      ],
      loans: [
        {
          $id: 'pr-1',
          loanType: 'Classique',
          borrowedAmount: 150000,
          loanDuration: 240,
          interestRate: 1.9
        }
      ],
      lenders: [
        {
          companyName: 'SG SOCIETE GENERALE',
          address: {
            addressLine1: '17, rue du Louvre',
            postCode: '97400',
            city: 'SAINT DENIS'
          },
          loans: [
            {
              $ref: 'pr-1'
            }
          ]
        }
      ],
      products: [
        {
          $id: 'p-1',
          productCode: 'ADPIntegral',
          contributionType: 'variable',
          insured: {
            role: 'AssurePrincipal',
            person: { $ref: 'i-1' }
          },
          coverages: [
            {
              loan: { $ref: 'pr-1' },
              guaranteeCode: 'Deces',
              coveragePercentage: 100
            },
            {
              loan: { $ref: 'pr-1' },
              guaranteeCode: 'PTIA',
              coveragePercentage: 100
            },
            {
              loan: { $ref: 'pr-1' },
              guaranteeCode: 'ITT',
              coveragePercentage: 100,
              deductibleCode: '030',
              levelCode: 'ConfortPlus'
            },
            {
              loan: { $ref: 'pr-1' },
              guaranteeCode: 'IPT',
              coveragePercentage: 100,
              compensationMode: 'Capital',
              levelCode: 'ConfortPlus'
            },
            {
              loan: { $ref: 'pr-1' },
              guaranteeCode: 'IPP'
            }
          ]
        },
        {
          $id: 'p-2',
          productCode: 'ADPIntegral',
          contributionType: 'variable',
          insured: {
            role: 'AssurePrincipal',
            person: { $ref: 'i-2' }
          },
          coverages: [
            {
              loan: { $ref: 'pr-1' },
              guaranteeCode: 'Deces',
              coveragePercentage: 20
            },
            {
              loan: { $ref: 'pr-1' },
              guaranteeCode: 'PTIA',
              coveragePercentage: 20
            },
            {
              loan: { $ref: 'pr-1' },
              guaranteeCode: 'ITT',
              coveragePercentage: 20,
              deductibleCode: '090',
              levelCode: 'ConfortPlus'
            },
            {
              loan: { $ref: 'pr-1' },
              guaranteeCode: 'IPT',
              coveragePercentage: 20,
              compensationMode: 'Capital',
              levelCode: 'ConfortPlus'
            },
            {
              loan: { $ref: 'pr-1' },
              guaranteeCode: 'InvaliditeProfessionsMedicales'
            },
            {
              loan: { $ref: 'pr-1' },
              guaranteeCode: 'IPP'
            }
          ]
        }
      ]
    };

    // 1) Patch projectDetails
    const pd = this.insuranceForm.get('projectDetails') as FormGroup;
    pd.patchValue({
      projectType: example.properties.projectType,
      effectiveDate: new Date(example.properties.effectiveDate),
      commission: Number(example.properties.commission),
      email: example.properties.email,
      moralSubscriber: example.properties.moralSubscriber,
      cancellation: example.properties.cancellation,
      addressLine1: example.properties.addresses[0].addressLine1 || '',
      postCode: example.properties.addresses[0].postCode,
      city: example.properties.addresses[0].city,
      countryCode: example.properties.addresses[0].countryCode || 'FR'
    });

    // 2) Patch borrowers array
    while (this.borrowers.length > 0) {
      this.borrowers.removeAt(0);
    }
    example.persons.forEach(person => {
      const grp = this.createPersonGroup();
      grp.patchValue({
        $id: person.$id,
        title: person.title,
        lastName: person.lastName,
        firstName: person.firstName,
        birthDate: new Date(person.birthDate),
        birthDepartment: person.birthDepartment,
        birthCity: person.birthCity,
        nationality: person.nationality,
        birthCountry: person.birthCountry,
        professionalCategory: person.professionalCategory,
        profession: person.profession,
        abroadTravel: person.abroadTravel,
        aerialOrLandSport: person.aerialOrLandSport,
        highMileage: person.highMileage,
        workAtHeight: person.workAtHeight,
        heavyLoadHandling: person.heavyLoadHandling,
        openEndedContractHolder: person.openEndedContractHolder,
        noticeOfTermination: person.noticeOfTermination,
        remainingAccountLemoine: person.remainingAccountLemoine,
        smoker: person.smoker,
        politicallyExposedPerson: person.politicallyExposedPerson,
        politicallyExposedRelatives: person.politicallyExposedRelatives
      });
      this.borrowers.push(grp);
    });

    // 3) Patch loans array
    while (this.loans.length > 0) {
      this.loans.removeAt(0);
    }
    example.loans.forEach(ln => {
      const grp = this.createLoanGroup();
      grp.patchValue({
        $id: ln.$id,
        loanType: ln.loanType,
        borrowedAmount: ln.borrowedAmount,
        interestRate: ln.interestRate,
        loanDuration: ln.loanDuration
      });
      this.loans.push(grp);
    });

    // 4) Patch coverageOptions array
    while (this.coverageOptionsArray.length > 0) {
      this.coverageOptionsArray.removeAt(0);
    }
    example.products.forEach(prod => {
      prod.coverages.forEach(cov => {
        const grp = this.createCoverageGroup();
        grp.patchValue({
          loanRef: cov.loan.$ref,
          guaranteeCode: cov.guaranteeCode,
          coveragePercentage: cov.coveragePercentage ?? 0,
          deductibleCode: cov.deductibleCode ?? '',
          levelCode: cov.levelCode ?? '',
          compensationMode: cov.compensationMode ?? ''
        });
        this.coverageOptionsArray.push(grp);
      });
    });
  }

  // ------------- Reset -------------
  resetForm(): void {
    this.activeIndex = 0;
    this.quoteResponse = null;
    this.insuranceForm.reset();

    // Re‐initialize all arrays with exactly one entry:
    while (this.borrowers.length > 0) {
      this.borrowers.removeAt(0);
    }
    this.borrowers.push(this.createPersonGroup());

    while (this.loans.length > 0) {
      this.loans.removeAt(0);
    }
    this.loans.push(this.createLoanGroup());

    while (this.coverageOptionsArray.length > 0) {
      this.coverageOptionsArray.removeAt(0);
    }
    this.coverageOptionsArray.push(this.createCoverageGroup());
  }

  // ------------- Submit -------------
  submitForm(): void {
    if (this.insuranceForm.invalid) {
      this.markGroupTouched(this.insuranceForm);
      this.messageService.add({
        severity: 'warn',
        summary: 'Formulaire invalide',
        detail: 'Veuillez remplir tous les champs obligatoires.'
      });
      return;
    }

    this.loading = true;
    this.submitting = true;

    // Build full AprilGettarifRequest payload:
    const payload = this.buildAprilPayload();
    const projectUuid = uuidv4();

    this.aprilService
      .getTarif(payload, 'Simple', 'false', projectUuid)
      .pipe(
        finalize(() => {
          this.loading = false;
          this.submitting = false;
        })
      )
      .subscribe({
        next: res => {
          this.quoteResponse = res;
          if (res && res.quotes && res.quotes.length) {
            this.messageService.add({
              severity: 'success',
              summary: 'Succès',
              detail: 'Tarification APRIL calculée avec succès !'
            });
          } else {
            this.messageService.add({
              severity: 'warn',
              summary: 'Avertissement',
              detail: res.errorMessage || 'Aucune proposition de tarif disponible.'
            });
          }
        },
        error: (err: HttpErrorResponse) => {
          console.error('APRIL tarification erreur :', err);
          this.quoteResponse = { success: false, errorMessage: err.message };
          this.messageService.add({
            severity: 'error',
            summary: 'Erreur',
            detail: `La tarification a échoué : ${err.message}`
          });
        }
      });
  }

  private buildAprilPayload(): any {
    const fv = this.insuranceForm.value;

    // 1) properties.addresses
    const addresses = [
      {
        $id: 'adr-1',
        type: 'Actuelle' as const,
        postCode: fv.projectDetails.postCode,
        city: fv.projectDetails.city,
        addressLine1: fv.projectDetails.addressLine1 || undefined,
        addressLine2: undefined,
        addressLine3: undefined,
        addressLine4: undefined,
        countryCode: fv.projectDetails.countryCode
      }
    ];

    // 2) properties
    const properties = {
      addresses,
      email: fv.projectDetails.email,
      commission: fv.projectDetails.commission?.toString() || '0',
      moralSubscriber: fv.projectDetails.moralSubscriber,
      effectiveDate: this.formatDateYYYYMMDD(fv.projectDetails.effectiveDate),
      cancellation: fv.projectDetails.cancellation,
      projectType: fv.projectDetails.projectType
    };

    // 3) persons array
    const persons = fv.borrowers.map((b: any) => ({
      $id: b.$id,
      title: b.title,
      lastName: b.lastName,
      firstName: b.firstName,
      birthDate: this.formatDateYYYYMMDD(b.birthDate),
      birthDepartment: b.birthDepartment,
      birthCity: b.birthCity,
      nationality: b.nationality,
      birthCountry: b.birthCountry,
      professionalCategory: b.professionalCategory,
      profession: b.profession,
      abroadTravel: b.abroadTravel,
      aerialOrLandSport: b.aerialOrLandSport,
      highMileage: b.highMileage,
      workAtHeight: b.workAtHeight,
      heavyLoadHandling: b.heavyLoadHandling,
      openEndedContractHolder: b.openEndedContractHolder,
      noticeOfTermination: b.noticeOfTermination,
      remainingAccountLemoine: b.remainingAccountLemoine ?? 0,
      smoker: b.smoker,
      politicallyExposedPerson: b.politicallyExposedPerson,
      politicallyExposedRelatives: b.politicallyExposedRelatives
    }));

    // 4) loans array
    const loans = fv.loans.map((l: any) => ({
      $id: l.$id,
      loanType: l.loanType,
      borrowedAmount: l.borrowedAmount,
      interestRate: l.interestRate,
      loanDuration: l.loanDuration
    }));

    // 5) lenders: one lender referencing all loan IDs
    const loanRefs = loans.map((ln: any) => ({ $ref: ln.$id }));
    const lenders = [
      {
        companyName: 'SG SOCIETE GENERALE',
        address: {
          addressLine1: fv.projectDetails.addressLine1,
          postCode: fv.projectDetails.postCode,
          city: fv.projectDetails.city
        },
        loans: loanRefs
      }
    ];

    // 6) products: one product per borrower
    const products: any[] = [];
    fv.borrowers.forEach((b: any, borrowerIdx: number) => {
      const productId = `p-${borrowerIdx + 1}`;
      const insured = {
        role: 'AssurePrincipal' as const,
        person: { $ref: b.$id }
      };

      const coveragesForThisBorrower: any[] = [];
      fv.coverageOptions.forEach((cov: any) => {
        if (loans.some((ln: any) => ln.$id === cov.loanRef)) {
          coveragesForThisBorrower.push({
            loan: { $ref: cov.loanRef },
            guaranteeCode: cov.guaranteeCode,
            coveragePercentage: cov.coveragePercentage,
            deductibleCode: cov.deductibleCode || undefined,
            levelCode: cov.levelCode || undefined,
            compensationMode: cov.compensationMode || undefined
          });
        }
      });

      products.push({
        $id: productId,
        productCode: 'ADPIntegral',
        contributionType: 'variable',
        insured,
        coverages: coveragesForThisBorrower
      });
    });

    // 7) final wrapper matching Pydantic model
    return {
      $type: 'Emprunteur' as const,
      properties,
      persons,
      loans,
      lenders,
      products
    };
  }

  private formatDateYYYYMMDD(date: string | Date): string {
    if (!date) return new Date().toISOString().slice(0, 10);
    if (typeof date === 'string') {
      if (date.includes('-')) return date;
      if (date.includes('/')) {
        const [d, m, y] = date.split('/');
        return `${y}-${m}-${d}`;
      }
      return date;
    }
    return new Date(date).toISOString().slice(0, 10);
  }

  // ------------- Helpers -------------
  getAnnualPrice(): number {
    return this.quoteResponse?.quotes?.[0]?.annualPayment || 0;
  }

  getMonthlyPrice(): number {
    return this.quoteResponse?.quotes?.[0]?.monthlyPayment || 0;
  }

  getAdditionalInfoEntries(addInfo: any): { key: string; value: any }[] {
    if (!addInfo) return [];
    return Object.entries(addInfo).map(([k, v]) => ({ key: k, value: v }));
  }

  hasQuotes(): boolean {
    return (
      this.quoteResponse?.success === true &&
      Array.isArray(this.quoteResponse.quotes) &&
      this.quoteResponse.quotes.length > 0
    );
  }

  hasError(): boolean {
    return (
      this.quoteResponse != null &&
      (this.quoteResponse.success === false ||
        !this.quoteResponse.quotes ||
        this.quoteResponse.quotes.length === 0)
    );
  }

  getErrorMessage(): string {
    return this.quoteResponse?.errorMessage || 'Aucune proposition de tarif disponible.';
  }
}
