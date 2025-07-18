import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AcheelTarificationRequest, AcheelTarificationResponse } from '../models/deuxma.model';

@Injectable({
  providedIn: 'root'
})
export class DeuxMaService {

  private apiUrl = '/api/deuxma/v1/tarifs'; // L'URL de base de votre API backend

  constructor(private http: HttpClient) { }

  getAcheelTarif(request: AcheelTarificationRequest): Observable<AcheelTarificationResponse> {
    return this.http.post<AcheelTarificationResponse>(`${this.apiUrl}/acheel`, request);
  }
}
