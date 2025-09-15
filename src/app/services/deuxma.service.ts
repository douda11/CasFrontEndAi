import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AcheelTarificationRequest, AcheelTarificationResponse } from '../models/deuxma.model';

@Injectable({
  providedIn: 'root'
})
export class DeuxMaService {

  private apiUrl = 'http://localhost:8081/api/deuxma/v1/tarifs'; // L'URL de base de votre API backend

  constructor(private http: HttpClient) { }

  getAcheelTarif(request: AcheelTarificationRequest): Observable<AcheelTarificationResponse> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    return this.http.post<AcheelTarificationResponse>(`${this.apiUrl}/acheel`, request, { headers });
  }
}
