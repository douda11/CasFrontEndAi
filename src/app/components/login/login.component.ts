import { Component, OnInit } from '@angular/core';
import { FormGroup, FormControl, Validators, FormBuilder } from '@angular/forms';
import { Router } from '@angular/router';

import { ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { MessageService } from 'primeng/api';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { CheckboxModule } from 'primeng/checkbox';
@Component({
  selector: 'app-login',
    imports: [CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    PasswordModule,
    CheckboxModule],
  providers: [MessageService],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent implements OnInit{
  loginForm!: FormGroup;
  isLoading = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
      rememberMe: [false]
    });
  }

  get f() {
    return this.loginForm.controls;
  }

  onSubmit(): void {
    if (this.loginForm.invalid) { return; }
    this.isLoading = true;
    const email = this.f['email'].value;
    const password = this.f['password'].value;
    this.authService.login(email, password).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Connexion réussie',
          detail: 'Vous êtes maintenant connecté.'
        });
        this.router.navigate(['/']);
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur de connexion',
          detail: 'Email ou mot de passe incorrect.'
        });
        console.error(err);
        this.isLoading = false;
      },
      complete: () => { this.isLoading = false; }
    });
  }

  onHubspotLogin(): void {
    this.authService.loginWithHubSpot();
    this.messageService.add({
      severity: 'info',
      summary: 'Fonction en cours de développement',
      detail: 'La connexion via HubSpot sera bientôt disponible.'
    });
  }

}
