import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormArray } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { DeuxMaService } from '../../services/deuxma.service';
import { AcheelTarificationRequest, AcheelTarificationResponse } from '../../models/deuxma.model';

@Component({
  selector: 'app-acheel-tarif',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './acheel-tarif.component.html',
  styleUrls: ['./acheel-tarif.component.scss']
})
export class AcheelTarifComponent implements OnInit {

  tarifForm!: FormGroup;
  tarifResponse: AcheelTarificationResponse | null = null;
  errorMessage: string | null = null;

  constructor(private fb: FormBuilder, private deuxMaService: DeuxMaService) { }

  ngOnInit(): void {
    this.tarifForm = this.fb.group({
      product: ['ESSENTIEL'],
      splitting: ['M'],
      wish_effective_date: ['2023-12-30'],
      postal_code: ['62610'],
      city_id: ['62716'],
      subscriber_year_of_birth: ['1980'],
      subscriber_social_system: ['SOCIAL_INSURANCE_SYSTEM'],
      partner_year_of_birth: ['1982'],
      partner_social_system: ['TNS_SYSTEM'],
      additional_member: this.fb.array([])
    });
  }

  get additionalMembers(): FormArray {
      return this.tarifForm.get('additional_member') as FormArray;
  }

  addAdditionalMember(): void {
      const memberForm = this.fb.group({
          year_of_birth: ['2015'],
          social_system: ['SOCIAL_INSURANCE_SYSTEM'],
          status: ['CHILD']
      });
      this.additionalMembers.push(memberForm);
  }

  removeAdditionalMember(index: number): void {
      this.additionalMembers.removeAt(index);
  }

  onSubmit(): void {
    if (this.tarifForm.valid) {
      const request: AcheelTarificationRequest = this.tarifForm.value;
      this.deuxMaService.getAcheelTarif(request).subscribe({
        next: (response) => {
          this.tarifResponse = response;
          this.errorMessage = null;
        },
        error: (err) => {
          this.errorMessage = 'Erreur lors de la récupération des tarifs.';
          this.tarifResponse = null;
          console.error(err);
        }
      });
    }
  }
}
