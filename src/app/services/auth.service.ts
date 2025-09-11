import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, BehaviorSubject, of, throwError } from 'rxjs';
import { tap, catchError, map, finalize } from 'rxjs/operators';

export interface AuthResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  user: UserInfo;
}

export interface UserInfo {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  role: 'ADMIN' | 'COMMERCIAL' | 'VIEWER';
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  telephone?: string;
  departement?: string;
  hubspot_user_id?: string;
  hubspot_portal_id?: string;
  is_hubspot_user?: boolean;
  created_at: string;
  last_login?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  remember_me?: boolean;
}

export interface HubSpotAuthResponse {
  authorization_url: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly apiUrl = 'http://localhost:8081/api/v1';
  private readonly tokenKey = 'access_token';
  private readonly userKey = 'current_user';
  
  // Subjects for reactive state management
  private currentUserSubject = new BehaviorSubject<UserInfo | null>(null);
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  private isLoadingSubject = new BehaviorSubject<boolean>(false);
  
  // Public observables
  public currentUser$ = this.currentUserSubject.asObservable();
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();
  public isLoading$ = this.isLoadingSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {
    this.initializeAuthState();
    this.setupHubSpotCallback();
  }

  /**
   * Initialize authentication state on service creation
   */
  private initializeAuthState(): void {
    const token = this.getStoredToken();
    const storedUser = this.getStoredUser();
    
    if (token && storedUser) {
      this.currentUserSubject.next(storedUser);
      this.isAuthenticatedSubject.next(true);
      
      // Validate token with backend
      this.getCurrentUserProfile().subscribe({
        next: (user) => {
          console.log('✅ Token still valid, user loaded:', user);
        },
        error: (error) => {
          console.log('❌ Token invalid or expired, clearing auth state');
          this.clearAuthState();
        }
      });
    }
  }

  /**
   * Setup HubSpot callback listener
   */
  private setupHubSpotCallback(): void {
    // Listen for HubSpot OAuth callback from localStorage
    window.addEventListener('storage', (event) => {
      if (event.key === 'hubspot_auth_success') {
        const data = JSON.parse(event.newValue || '{}');
        if (data.token) {
          this.handleHubSpotAuthSuccess(data.token, data.user);
          localStorage.removeItem('hubspot_auth_success');
        }
      }
    });

    // Check for existing HubSpot auth data on page load
    const hubspotAuth = localStorage.getItem('hubspot_auth_success');
    if (hubspotAuth) {
      const data = JSON.parse(hubspotAuth);
      if (data.token) {
        this.handleHubSpotAuthSuccess(data.token, data.user);
        localStorage.removeItem('hubspot_auth_success');
      }
    }
  }

  /**
   * Login user with email and password
   */
  login(loginRequest: LoginRequest): Observable<AuthResponse> {
    this.isLoadingSubject.next(true);

    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/login`, loginRequest)
      .pipe(
        tap(response => {
          if (response.access_token) {
            // Store token first
            localStorage.setItem(this.tokenKey, response.access_token);
            this.isAuthenticatedSubject.next(true);
            
            // Store user info
            this.currentUserSubject.next(response.user);
            this.storeUser(response.user);
            
            this.handlePostLoginRedirect();
          }
        }),
        catchError(this.handleAuthError.bind(this)),
        finalize(() => this.isLoadingSubject.next(false))
      );
  }

  /**
   * Logout user
   */
  logout(): Observable<any> {
    this.isLoadingSubject.next(true);
    
    const headers = this.getAuthHeaders();
    
    return this.http.post(`${this.apiUrl}/auth/logout`, {}, { headers })
      .pipe(
        tap(() => {
          console.log('✅ Logout successful');
        }),
        catchError(error => {
          console.warn('Logout API call failed:', error);
          // Continue with local logout even if API fails
          return of(null);
        }),
        finalize(() => {
          this.clearAuthState();
          this.router.navigate(['/login']);
          this.isLoadingSubject.next(false);
        })
      );
  }

  /**
   * Refresh authentication token
   */
  refreshToken(): Observable<AuthResponse> {
    const headers = this.getAuthHeaders();
    
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/refresh`, {}, { headers })
      .pipe(
        tap(response => {
          if (response.access_token) {
            localStorage.setItem(this.tokenKey, response.access_token);
            this.currentUserSubject.next(response.user);
            this.storeUser(response.user);
          }
        }),
        catchError(error => {
          this.clearAuthState();
          return throwError(() => error);
        })
      );
  }

  /**
   * Get current user profile
   */
  getCurrentUserProfile(): Observable<UserInfo> {
    const headers = this.getAuthHeaders();
    
    return this.http.get<UserInfo>(`${this.apiUrl}/auth/me`, { headers })
      .pipe(
        tap(user => {
          this.currentUserSubject.next(user);
          this.storeUser(user);
        })
      );
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.isAuthenticatedSubject.value && !!this.getStoredToken();
  }

  /**
   * Get current user
   */
  getCurrentUser(): UserInfo | null {
    return this.currentUserSubject.value;
  }

  /**
   * Check if user has admin role
   */
  isAdmin(): boolean {
    const user = this.getCurrentUser();
    return user?.role === 'ADMIN';
  }

  /**
   * Check if user has commercial role
   */
  isCommercial(): boolean {
    const user = this.getCurrentUser();
    return user?.role === 'COMMERCIAL';
  }

  /**
   * Check if user has specific role
   */
  hasRole(role: string): boolean {
    const user = this.getCurrentUser();
    return user?.role === role;
  }

  /**
   * Get authentication token
   */
  getToken(): string | null {
    return this.getStoredToken();
  }

  /**
   * HubSpot OAuth login
   */
  loginWithHubSpot(): void {
    this.isLoadingSubject.next(true);
    
    // Get HubSpot authorization URL
    this.http.post<HubSpotAuthResponse>(`${this.apiUrl}/hubspot-auth/authorize`, {})
      .pipe(
        finalize(() => this.isLoadingSubject.next(false))
      )
      .subscribe({
        next: (response) => {
          if (response.authorization_url) {
            // Store the current URL for redirect after auth
            const redirectUrl = this.router.url === '/login' ? '/compare' : this.router.url;
            localStorage.setItem('hubspot_redirect_url', redirectUrl);
            
            // Redirect to HubSpot OAuth
            window.location.href = response.authorization_url;
          }
        },
        error: (error) => {
          console.error('❌ Failed to get HubSpot auth URL:', error);
        }
      });
  }

  /**
   * Handle HubSpot authentication success
   */
  private handleHubSpotAuthSuccess(token: string, user?: UserInfo): void {
    console.log('✅ HubSpot auth success:', { token, user });
    
    // Store token
    localStorage.setItem(this.tokenKey, token);
    this.isAuthenticatedSubject.next(true);
    
    if (user) {
      this.currentUserSubject.next(user);
      this.storeUser(user);
    } else {
      // Load user profile if not provided
      this.getCurrentUserProfile().subscribe();
    }

    // Redirect to intended page
    const redirectUrl = localStorage.getItem('hubspot_redirect_url') || '/compare';
    localStorage.removeItem('hubspot_redirect_url');
    
    setTimeout(() => {
      this.router.navigate([redirectUrl]);
    }, 1000);
  }

  /**
   * Check if user is HubSpot user
   */
  isHubSpotUser(): boolean {
    const user = this.getCurrentUser();
    return user?.is_hubspot_user === true;
  }

  /**
   * Handle post-login redirect
   */
  private handlePostLoginRedirect(): void {
    const redirectUrl = localStorage.getItem('redirectUrl') || '/compare';
    localStorage.removeItem('redirectUrl');
    
    // Small delay to ensure state is updated
    setTimeout(() => {
      this.router.navigate([redirectUrl]);
    }, 100);
  }

  /**
   * Clear authentication state
   */
  private clearAuthState(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    localStorage.removeItem('redirectUrl');
    localStorage.removeItem('hubspot_redirect_url');
    localStorage.removeItem('hubspot_auth_success');
    
    this.currentUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);
  }

  /**
   * Get stored authentication token
   */
  private getStoredToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  /**
   * Store user information
   */
  private storeUser(user: UserInfo): void {
    localStorage.setItem(this.userKey, JSON.stringify(user));
  }

  /**
   * Get stored user information
   */
  private getStoredUser(): UserInfo | null {
    const stored = localStorage.getItem(this.userKey);
    return stored ? JSON.parse(stored) : null;
  }

  /**
   * Get authorization headers
   */
  public getAuthHeaders(): HttpHeaders {
    const token = this.getStoredToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  /**
   * Handle authentication errors
   */
  private handleAuthError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'Une erreur s\'est produite';
    
    if (error.status === 403) {
      // Account status errors
      const detail = error.error?.detail || error.error?.message || '';
      if (detail.includes('inactif') || detail.includes('suspendu') || detail.includes('HubSpot')) {
        return throwError(() => error);
      }
      errorMessage = 'Accès refusé';
    } else if (error.status === 401) {
      errorMessage = 'Email ou mot de passe incorrect';
    } else if (error.status === 422) {
      errorMessage = 'Données de connexion invalides';
    } else if (error.status === 0) {
      errorMessage = 'Impossible de se connecter au serveur';
    } else if (error.error?.detail || error.error?.message) {
      errorMessage = error.error.detail || error.error.message;
    }

    console.error('❌ Auth error:', errorMessage);
    return throwError(() => error);
  }
}