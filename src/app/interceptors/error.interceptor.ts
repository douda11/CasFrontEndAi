// src/app/interceptors/error.interceptor.ts
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { MessageService } from 'primeng/api';
import { catchError, throwError } from 'rxjs';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const messageService = inject(MessageService);
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // This is a special case for the Utwin API.
      // It returns a 400 Bad Request status even when it provides a valid list of propositions.
      // We bypass the global error handler here to allow the specific service (`insurance.service.ts`)
      // to catch this error and handle it as a successful response.
      if (error.status === 400 && error.url?.includes('/api/Sante/v1/Tarifs')) {
        return throwError(() => error); // Pass the original error to the service's error handler.
      }

      let errorMessage = 'Une erreur est survenue';
      let errorSummary = `Erreur ${error.status}`;
      
      if (error.error instanceof ErrorEvent) {
        // Client-side error
        errorMessage = `Erreur: ${error.error.message}`;
      } else {
        // Server-side error
        const serverError = error.error;
        
        if (typeof serverError === 'object' && serverError !== null) {
          if (serverError.detail) {
            errorMessage = serverError.detail;
            
            // Special handling for APRIL API errors
            if (error.url?.includes('april') && errorMessage.includes('APRIL API error')) {
              errorSummary = 'Erreur APRIL API';
              
              // Specific error for guarantee codes
              if (errorMessage.includes('guaranteeCode')) {
                errorMessage = 'Format de garantie invalide. Les codes DC, IPT, et ITT doivent être remplacés par leurs noms complets: DECES, INVALIDITE_PERMANENTE_TOTALE, et INCAPACITE_TEMPORAIRE_TOTALE.';
              }
            }
          } else if (serverError.message) {
            errorMessage = serverError.message;
          }
        }
        
        console.error('Error details:', {
          status: error.status,
          statusText: error.statusText,
          error: serverError
        });
      }
      
      messageService.add({
        severity: 'error',
        summary: errorSummary,
        detail: errorMessage,
        life: 7000 // Show for 7 seconds
      });
      
      return throwError(() => new Error(errorMessage));
    })
  );
};
