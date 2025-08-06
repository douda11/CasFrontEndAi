// src/app/services/auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

export interface AuthResponse {
  access_token: string;
  token_type: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  apiUrl = 'http://localhost:8000'
  private baseUrl = this.apiUrl + '/api/v1/auth';

  constructor(private http: HttpClient, private router: Router) {}

  login(username: string, password: string): Observable<AuthResponse> {
    const body = new URLSearchParams();
    body.set('username', username);
    body.set('password', password);
    const headers = new HttpHeaders({ 'Content-Type': 'application/x-www-form-urlencoded' });
    return this.http.post<AuthResponse>(`${this.baseUrl}/login`, body.toString(), { headers }).pipe(
      tap((res) => {
        localStorage.setItem('access_token', res.access_token);
      })
    );
  }

  logout(): Observable<any> {
    return this.http.post(`${this.baseUrl}/logout`, {}).pipe(
      tap(() => {
        localStorage.removeItem('access_token');
        this.router.navigate(['/login']);
      })
    );
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('access_token');
  }

  getToken(): string | null {
    return localStorage.getItem('access_token');
  }
  // NEW: Initiate HubSpot OAuth flow (direct login or link account)
  loginWithHubSpot(): void {
    // For direct login, you might not have a current user.
    // Your backend should support both the direct hubspot login flow
    // and the link-account flow if a user is already authenticated.
    this.http.post<{ authorization_url: string }>(`${this.apiUrl}/api/v1/hubspot_auth/authorize`, {})
      .subscribe({
        next: (data) => {
          // Redirect the user to HubSpot's OAuth consent screen
          window.location.href = data.authorization_url;
        },
        error: (err) => {
          console.error("HubSpot login error", err);
        }
      });
  }
}