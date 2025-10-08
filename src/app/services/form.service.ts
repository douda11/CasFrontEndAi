import { Injectable } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';

@Injectable({
  providedIn: 'root'
})
export class FormService {

  constructor(private fb: FormBuilder) { }

  // Create form structure for Health Insurance
  createHealthInsuranceForm(): FormGroup {
    return this.fb.group({
      properties: this.createPropertiesForm(),
      persons: this.fb.array([this.createPersonForm()]),
      products: this.fb.array([this.createProductForm()])
    });
  }

  createPropertiesForm(): FormGroup {
    return this.fb.group({
      addresses: this.fb.array([this.createAddressForm()]),
      email: ['test@april.com', [Validators.required, Validators.email]]
    });
  }

  createAddressForm(): FormGroup {
    return this.fb.group({
      type: ['Actuelle', Validators.required],
      addressLine1: ['123 Rue de la Sante', Validators.required],
      postCode: ['69000', Validators.required],
      city: ['Lyon', Validators.required]
    });
  }

  createPersonForm(): FormGroup {
    return this.fb.group({
      birthDate: ['1980-01-15', Validators.required],
      title: ['Monsieur', Validators.required],
      lastName: ['Assure', Validators.required],
      firstName: ['Principal', Validators.required],
      professionalCategory: ['Salarié', Validators.required],
      familyStatus: ['Célibataire', Validators.required],
      mandatoryScheme: ['Général', Validators.required],
      socialSecurityNumber: ['1800169123456', Validators.required] // Example SSN
    });
  }

  createProductForm(): FormGroup {
    return this.fb.group({
      productCode: ['SanteZen', Validators.required],
      effectiveDate: [this.formatDateToYYYYMMDD(new Date()), Validators.required],
      insureds: this.fb.array([this.createInsuredForm()]),
      coverages: this.fb.array([this.createCoverageFormHealth()])
    });
  }

  createInsuredForm(): FormGroup {
    return this.fb.group({
      role: ['AssurePrincipal', Validators.required],
      personRef: ['i-1'] // Default reference, to be updated dynamically
    });
  }

  createCoverageFormHealth(): FormGroup {
    return this.fb.group({
      guaranteeCode: ['MaladieChirurgie', Validators.required],
      levelCode: ['04', Validators.required]
    });
  }

  // #region Helper methods for form arrays
  getPersonsArray(form: FormGroup): FormArray {
    return form.get('persons') as FormArray;
  }

  getProductsArray(form: FormGroup): FormArray {
    return form.get('products') as FormArray;
  }

  getAddressesArray(properties: FormGroup): FormArray {
    return properties.get('addresses') as FormArray;
  }

  getInsuredsArray(product: FormGroup): FormArray {
    return product.get('insureds') as FormArray;
  }

  getCoveragesArray(product: FormGroup): FormArray {
    return product.get('coverages') as FormArray;
  }
  // #endregion

  // #region Form array management methods
  addPerson(form: FormGroup): void {
    this.getPersonsArray(form).push(this.createPersonForm());
  }

  removePerson(form: FormGroup, index: number): void {
    this.getPersonsArray(form).removeAt(index);
  }

  addProduct(form: FormGroup): void {
    this.getProductsArray(form).push(this.createProductForm());
  }

  removeProduct(form: FormGroup, index: number): void {
    this.getProductsArray(form).removeAt(index);
  }
  // #endregion

  // Transform form data to APRIL Health API format
  transformToHealthProtectionFormat(formValue: any): any {
    const persons = formValue.persons.map((person: any, index: number) => ({
      '$id': `i-${index + 1}`,
      ...person,
      birthDate: this.formatDateToYYYYMMDD(person.birthDate),
      // Add other fields required by the API with defaults if necessary
      birthName: person.lastName,
      birthDepartment: '69',
      birthCity: 'Lyon',
      nationality: 'FR',
      politicallyExposedPerson: false,
      birthCountry: 'FR',
      acceptanceRequestPartnersAPRIL: true,
      acreBeneficiary: false,
      companyCreationDate: null,
      swissCrossBorderWorker: false,
      businessCreator: false,
      microEntrepreneur: false,
      landlinePhone: { prefix: '+33', number: '0400000000' },
      mobilePhone: { prefix: '+33', number: '0600000000' },
      email: formValue.properties.email
    }));

    const products = formValue.products.map((product: any, index: number) => ({
      '$id': `p-${index + 1}`,
      ...product,
      effectiveDate: this.formatDateToYYYYMMDD(product.effectiveDate),
      insureds: product.insureds.map((insured: any, insuredIndex: number) => ({
        '$id': `a-${index + 1}-${insuredIndex + 1}`,
        role: insured.role,
        person: { '$ref': `i-${insuredIndex + 1}` } // Simple mapping, assumes 1 person per insured
      })),
      coverages: product.coverages.map((coverage: any) => ({
        insured: { '$ref': 'a-1-1' }, // Default to first insured, needs dynamic logic
        ...coverage
      }))
    }));

    return {
      '$type': 'PrevPro',
      properties: {
        ...formValue.properties,
      },
      persons: persons,
      products: products
    };
  }

  // Helper to format date to YYYY-MM-DD
  formatDateToYYYYMMDD(date: string | Date): string {
    if (!date) return new Date().toISOString().split('T')[0];
    if (typeof date === 'string') {
      if (date.includes('/')) {
        const parts = date.split('/');
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
      // If it's already a date object string, extract the date part
      if (date.includes('T')) {
        return date.split('T')[0];
      }
      return date; // Assumes YYYY-MM-DD
    }
    return new Date(date).toISOString().split('T')[0];
  }
}
