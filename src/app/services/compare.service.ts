import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { environment } from '../environments/environment';
import { BesoinClient, ResultatComparaison } from '../models/comparateur.model';

@Injectable({
  providedIn: 'root'
})
export class CompareService {
  private readonly apiUrl = `${environment.apiUrl}${environment.endpoints.comparateur}`; // Build URL from environment
  private readonly httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    })
  };

  // Loading state management
  private loadingSubject = new BehaviorSubject<boolean>(false);
  public loading$ = this.loadingSubject.asObservable();

  constructor(private http: HttpClient) {}

  /**
   * Calls the backend to get comparison results based on client needs.
   * @param needs The payload containing slider values (BesoinClient).
   * @returns An Observable with the list of top 3 comparison results.
   */
  getComparisonResults(needs: BesoinClient): Observable<{ table: string }> {
    this.loadingSubject.next(true);

    return this.http.post<{ table: string }>(this.apiUrl, needs, this.httpOptions)
      .pipe(
        
        catchError(this.handleError.bind(this)),
        finalize(() => {
          this.loadingSubject.next(false);
        })
      );
  }

  /**
   * Private method to handle HTTP errors.
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'Une erreur inattendue s\'est produite.';

    if (error.error instanceof ErrorEvent) {
      // A client-side or network error occurred.
      errorMessage = `Erreur réseau: ${error.error.message}`;
    } else {
      // The backend returned an unsuccessful response code.
      // We log the entire error response to see the HTML causing the issue.
      console.error(
        `Backend returned code ${error.status}, ` +
        `body was: ${JSON.stringify(error.error)}`);
      
      // Check if the error is the HTML page, which would indicate a parsing failure.
      if (typeof error.error === 'string' && error.error.includes('<!DOCTYPE html>')) {
        errorMessage = 'Erreur de communication: Le serveur a renvoyé une page HTML au lieu de données JSON. Vérifiez que le backend est en cours d\'exécution et que l\'URL de l\'API est correcte.';
      } else {
        errorMessage = `Erreur du serveur (code ${error.status}): ${error.message}`;
      }
    }

    console.error('CompareService Error:', errorMessage, error);
    return throwError(() => new Error(errorMessage));
  }
}