import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { retry, catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ComparatorService {

  private apiUrl = 'http://127.0.0.1:5000'; // URL de votre API Flask

  constructor(private http: HttpClient) { }

  /**
   * Appelle l'API pour comparer les contrats en fonction des données utilisateur.
   * @param userData Les données fournies par l'utilisateur pour la comparaison.
   * @returns Un Observable contenant la réponse de l'API (le tableau en markdown).
   */
  compareContracts(userData: any): Observable<{ table: string }> {
    return this.http.post<{ table: string }>(`${this.apiUrl}/compare`, userData).pipe(
      retry(2),
      catchError(error => {
        console.error('Erreur lors de la comparaison des contrats:', error);
        throw error;
      })
    );
  }
}
