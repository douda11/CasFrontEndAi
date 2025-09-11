import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { CardModule } from 'primeng/card';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';

@Component({
  selector: 'app-hubspot-callback',
  standalone: true,
  imports: [CommonModule, ProgressSpinnerModule, CardModule, ToastModule],
  providers: [MessageService],
  template: `
    <div class="callback-container">
      <p-toast></p-toast>
      
      <p-card class="callback-card">
        <ng-template pTemplate="content">
          <div class="callback-content">
            <p-progressSpinner 
              [style]="{'width': '50px', 'height': '50px'}" 
              strokeWidth="4">
            </p-progressSpinner>
            
            <h3>Connexion HubSpot en cours...</h3>
            <p>Veuillez patienter pendant que nous finalisons votre connexion.</p>
            
            <div *ngIf="errorMessage" class="error-message">
              <i class="pi pi-exclamation-triangle"></i>
              <span>{{ errorMessage }}</span>
            </div>
          </div>
        </ng-template>
      </p-card>
    </div>
  `,
  styles: [`
    .callback-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 1rem;
    }

    .callback-card {
      width: 100%;
      max-width: 400px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
      border-radius: 12px;
    }

    .callback-content {
      text-align: center;
      padding: 2rem;
    }

    .callback-content h3 {
      margin: 1rem 0 0.5rem;
      color: #374151;
    }

    .callback-content p {
      color: #6b7280;
      margin-bottom: 1rem;
    }

    .error-message {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 1rem;
      background-color: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 6px;
      color: #dc2626;
      margin-top: 1rem;
    }
  `]
})
export class HubspotCallbackComponent implements OnInit {
  errorMessage = '';
  private readonly apiUrl = 'http://localhost:8081/api/v1';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.handleCallback();
  }

  private handleCallback(): void {
    this.route.queryParams.subscribe(params => {
      const code = params['code'];
      const state = params['state'];
      const error = params['error'];
      const errorDescription = params['error_description'];

      if (error) {
        this.handleError(error, errorDescription);
        return;
      }

      if (code) {
        this.exchangeCodeForToken(code, state);
      } else {
        this.handleError('invalid_request', 'Code d\'autorisation manquant');
      }
    });
  }

  private exchangeCodeForToken(code: string, state?: string): void {
    const body = { code, state };
    
    this.http.post<any>(`${this.apiUrl}/hubspot-auth/callback`, body)
      .subscribe({
        next: (response) => {
          if (response.accessToken && response.user) {
            // Store auth data for the main window
            const authData = {
              token: response.accessToken,
              user: response.user
            };
            
            // Use localStorage to communicate with parent window
            localStorage.setItem('hubspot_auth_success', JSON.stringify(authData));
            
            // Close this popup/tab and redirect parent
            if (window.opener) {
              window.opener.postMessage({ type: 'hubspot_auth_success', data: authData }, '*');
              window.close();
            } else {
              // If not in popup, redirect directly
              this.router.navigate(['/compare']);
            }
          } else {
            this.handleError('invalid_response', 'Réponse d\'authentification invalide');
          }
        },
        error: (error) => {
          console.error('HubSpot callback error:', error);
          let errorMsg = 'Erreur lors de l\'authentification HubSpot';
          
          if (error.error?.detail) {
            errorMsg = error.error.detail;
          } else if (error.error?.message) {
            errorMsg = error.error.message;
          }
          
          this.handleError('auth_failed', errorMsg);
        }
      });
  }

  private handleError(error: string, description?: string): void {
    this.errorMessage = description || error;
    
    this.messageService.add({
      severity: 'error',
      summary: 'Erreur d\'authentification',
      detail: this.errorMessage,
      life: 5000
    });

    // Redirect to login after a delay
    setTimeout(() => {
      if (window.opener) {
        window.opener.postMessage({ 
          type: 'hubspot_auth_error', 
          error: error, 
          description: description 
        }, '*');
        window.close();
      } else {
        this.router.navigate(['/login'], {
          queryParams: { error: 'hubspot_auth_failed', message: this.errorMessage }
        });
      }
    }, 3000);
  }
}
