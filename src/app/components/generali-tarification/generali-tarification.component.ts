import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { GeneraliService, GeneraliTarificationRequest, GeneraliTarificationResponse } from '../../services/generali.service';

@Component({
  selector: 'app-generali-tarification',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './generali-tarification.component.html',
  styleUrls: ['./generali-tarification.component.css']
})
export class GeneraliTarificationComponent implements OnInit {
  tarificationForm: FormGroup;
  loading = false;
  error: string | null = null;
  result: GeneraliTarificationResponse | null = null;
  allFormules: GeneraliTarificationResponse[] = [];
  
  compositions = [
    { value: 'isolé', label: 'Personne seule' },
    { value: 'duo', label: 'Couple sans enfant' },
    { value: 'famille', label: 'Couple avec enfant(s)' }
  ];
  
  formules = ['F1', 'F2', 'F3', 'F4', 'F5'];

  constructor(
    private fb: FormBuilder,
    private generaliService: GeneraliService
  ) {
    this.tarificationForm = this.fb.group({
      age: ['', [Validators.required, Validators.min(18), Validators.max(65)]],
      codePostal: ['', [Validators.required, Validators.pattern(/^\d{5}$/)]],
      compositionFamiliale: ['', Validators.required],
      formule: ['F2', Validators.required],
      toutesFormules: [false]
    });
  }

  ngOnInit(): void {
    // Charger les compositions depuis l'API si nécessaire
    this.loadCompositions();
  }

  loadCompositions(): void {
    this.generaliService.getCompositions().subscribe({
      next: (data) => {
        this.compositions = data.compositions.map(comp => ({
          value: comp,
          label: data.descriptions[comp] || comp
        }));
      },
      error: (err) => {
        console.warn('Impossible de charger les compositions depuis l\'API, utilisation des valeurs par défaut');
      }
    });
  }

  onSubmit(): void {
    if (this.tarificationForm.valid) {
      this.loading = true;
      this.error = null;
      this.result = null;
      this.allFormules = [];

      const formValue = this.tarificationForm.value;
      const request: GeneraliTarificationRequest = {
        age: parseInt(formValue.age),
        codePostal: formValue.codePostal,
        compositionFamiliale: formValue.compositionFamiliale,
        formule: formValue.formule,
        toutesFormules: formValue.toutesFormules
      };

      this.generaliService.getTarification(request).subscribe({
        next: (response) => {
          this.loading = false;
          if (request.toutesFormules && response.toutesFormules) {
            this.allFormules = response.toutesFormules;
          } else {
            this.result = response;
          }
        },
        error: (err) => {
          this.loading = false;
          this.error = err.error?.error || 'Erreur lors du calcul de la tarification';
          console.error('Erreur tarification Generali:', err);
        }
      });
    } else {
      this.markFormGroupTouched();
    }
  }

  private markFormGroupTouched(): void {
    Object.keys(this.tarificationForm.controls).forEach(key => {
      const control = this.tarificationForm.get(key);
      control?.markAsTouched();
    });
  }

  getZoneInfo(): string {
    const codePostal = this.tarificationForm.get('codePostal')?.value;
    if (codePostal && this.generaliService.validateCodePostal(codePostal)) {
      const zone = this.generaliService.getZoneFromCodePostal(codePostal);
      return this.generaliService.getZoneDescription(zone);
    }
    return '';
  }

  reset(): void {
    this.tarificationForm.reset({
      formule: 'F2',
      toutesFormules: false
    });
    this.result = null;
    this.allFormules = [];
    this.error = null;
  }

  // Getters pour faciliter l'accès aux contrôles dans le template
  get age() { return this.tarificationForm.get('age'); }
  get codePostal() { return this.tarificationForm.get('codePostal'); }
  get compositionFamiliale() { return this.tarificationForm.get('compositionFamiliale'); }
  get formule() { return this.tarificationForm.get('formule'); }
  get toutesFormules() { return this.tarificationForm.get('toutesFormules'); }
}
