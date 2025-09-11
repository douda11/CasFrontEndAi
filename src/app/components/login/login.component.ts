import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormGroup, FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';

import { AuthService, LoginRequest } from '../../services/auth.service';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { CheckboxModule } from 'primeng/checkbox';
import { CardModule } from 'primeng/card';
import { DividerModule } from 'primeng/divider';
import { MessagesModule } from 'primeng/messages';
import { ToastModule } from 'primeng/toast';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    PasswordModule,
    CheckboxModule,
    CardModule,
    DividerModule,
    MessagesModule,
    ToastModule
  ],
  providers: [MessageService],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent implements OnInit, OnDestroy {
  loginForm!: FormGroup;
  isLoading = false;
  errorMessage = '';
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.checkForErrors();
    this.subscribeToAuthState();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm(): void {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      rememberMe: [false]
    });
  }

  private checkForErrors(): void {
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
      if (params['error']) {
        const message = params['message'] || 'Une erreur s\'est produite';
        this.showError('Erreur de connexion', message);
      }
    });
  }

  private subscribeToAuthState(): void {
    // Subscribe to loading state
    this.authService.isLoading$.pipe(takeUntil(this.destroy$)).subscribe(
      isLoading => this.isLoading = isLoading
    );

    // Check if already authenticated
    this.authService.isAuthenticated$.pipe(takeUntil(this.destroy$)).subscribe(
      isAuthenticated => {
        if (isAuthenticated) {
          this.router.navigate(['/compare']);
        }
      }
    );
  }

  get f() {
    return this.loginForm.controls;
  }

  onSubmit(): void {
    console.log('🔄 onSubmit() appelé');
    
    if (this.loginForm.invalid) {
      console.log('❌ Formulaire invalide:', this.loginForm.errors);
      this.markFormGroupTouched();
      return;
    }

    this.errorMessage = '';
    const loginRequest: LoginRequest = {
      email: this.f['email'].value,
      password: this.f['password'].value,
      remember_me: this.f['rememberMe'].value
    };

    console.log('📤 Envoi de la requête de connexion:', { email: loginRequest.email });

    this.authService.login(loginRequest).subscribe({
      next: (response) => {
        console.log('✅ Connexion réussie:', response);
        // La redirection est gérée automatiquement par le service AuthService
        // Pas besoin d'afficher le toast car l'utilisateur sera redirigé
        console.log('✅ Connexion réussie, redirection en cours...');
      },
      error: (error) => {
        console.error('❌ Erreur de connexion:', error);
        this.handleLoginError(error);
      }
    });
  }

  onHubSpotLogin(): void {
    this.errorMessage = '';
    this.authService.loginWithHubSpot();
  }

  private handleLoginError(error: any): void {
    let errorTitle = 'Erreur de connexion';
    let errorDetail = 'Une erreur s\'est produite';

    if (error.status === 403) {
      const detail = error.error?.detail || error.error?.message || '';
      
      if (detail.includes('inactif')) {
        errorTitle = 'Compte inactif';
        errorDetail = 'Votre compte est inactif. Contactez l\'administrateur pour l\'activer.';
      } else if (detail.includes('suspendu')) {
        errorTitle = 'Compte suspendu';
        errorDetail = 'Votre compte est suspendu. Contactez l\'administrateur.';
      } else if (detail.includes('HubSpot')) {
        errorTitle = 'Compte HubSpot';
        errorDetail = 'Ce compte utilise HubSpot. Utilisez le bouton "Se connecter avec HubSpot".';
      } else {
        errorDetail = 'Accès refusé';
      }
    } else if (error.status === 401) {
      errorDetail = 'Email ou mot de passe incorrect';
    } else if (error.status === 422) {
      errorDetail = 'Données de connexion invalides';
    } else if (error.status === 0) {
      errorTitle = 'Erreur de connexion';
      errorDetail = 'Impossible de se connecter au serveur. Vérifiez votre connexion internet.';
    } else if (error.error?.detail || error.error?.message) {
      errorDetail = error.error.detail || error.error.message;
    }

    this.errorMessage = errorDetail;
    this.showError(errorTitle, errorDetail);
  }

  private markFormGroupTouched(): void {
    Object.keys(this.loginForm.controls).forEach(key => {
      const control = this.loginForm.get(key);
      control?.markAsTouched();
    });
  }

  private showSuccess(summary: string, detail: string): void {
    this.messageService.add({
      severity: 'success',
      summary,
      detail,
      life: 3000
    });
  }

  private showError(summary: string, detail: string): void {
    this.messageService.add({
      severity: 'error',
      summary,
      detail,
      life: 5000
    });
  }

  // Helper methods for template
  isFieldInvalid(fieldName: string): boolean {
    const field = this.loginForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.loginForm.get(fieldName);
    if (field && field.errors && (field.dirty || field.touched)) {
      if (field.errors['required']) {
        return `${fieldName === 'email' ? 'Email' : 'Mot de passe'} requis`;
      }
      if (field.errors['email']) {
        return 'Format d\'email invalide';
      }
      if (field.errors['minlength']) {
        return 'Le mot de passe doit contenir au moins 6 caractères';
      }
    }
    return '';
  }
}
