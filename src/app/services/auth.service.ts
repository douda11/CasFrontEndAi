import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, BehaviorSubject, of, throwError } from 'rxjs';
import { tap, catchError, map, finalize, retry } from 'rxjs/operators';

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
  private readonly apiUrl = 'http://localhost:8081';
  private readonly tokenKey = 'access_token';
  private readonly userKey = 'current_user';
  private readonly sessionExpiryKey = 'session_expiry';
  private readonly lastActivityKey = 'last_activity';
  private readonly SESSION_DURATION = 2 * 60 * 60 * 1000; // 2 heures en millisecondes
  private sessionTimer: any = null;
  
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
    this.setupActivityTracking();
  }

  /**
   * Initialize authentication state on service creation
   */
  private initializeAuthState(): void {
    const token = this.getStoredToken();
    const storedUser = this.getStoredUser();
    
    console.log('🔍 Initialisation auth state:', { hasToken: !!token, hasUser: !!storedUser });
    
    if (token && storedUser) {
      // Vérifier si la session n'a pas expiré
      if (this.isSessionExpired()) {
        console.log('❌ Session expirée, déconnexion automatique');
        this.clearAuthState();
        return;
      }
      
      console.log('✅ Session valide, restauration de l\'état utilisateur');
      this.currentUserSubject.next(storedUser);
      this.isAuthenticatedSubject.next(true);
      this.startSessionTimer();
      
      // Ne pas valider avec le backend au démarrage pour éviter les déconnexions
      // La validation se fera lors de la première requête API
      this.updateLastActivity();
    } else {
      console.log('❌ Pas de token ou utilisateur stocké');
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

    return this.http.post<AuthResponse>(`${this.apiUrl}/api/v1/auth/login`, loginRequest)
      .pipe(
        retry(2),
        tap(response => {
          if (response.access_token) {
            // Store token first
            localStorage.setItem(this.tokenKey, response.access_token);
            this.isAuthenticatedSubject.next(true);
            
            // Store user info
            this.currentUserSubject.next(response.user);
            this.storeUser(response.user);
            
            // Initialiser la session
            this.initializeSession();
            
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
    
    return this.http.post(`${this.apiUrl}/api/v1/auth/logout`, {}, { headers })
      .pipe(
        retry(2),
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
    
    return this.http.post<AuthResponse>(`${this.apiUrl}/api/v1/auth/refresh`, {}, { headers })
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
    
    return this.http.get<UserInfo>(`${this.apiUrl}/api/v1/auth/me`, { headers })
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
    this.http.post<HubSpotAuthResponse>(`${this.apiUrl}/api/v1/hubspot_auth/authorize`, {})
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
    localStorage.removeItem(this.sessionExpiryKey);
    localStorage.removeItem(this.lastActivityKey);
    localStorage.removeItem('redirectUrl');
    localStorage.removeItem('hubspot_redirect_url');
    localStorage.removeItem('hubspot_auth_success');
    
    this.clearSessionTimer();
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

  /**
   * Initialiser la session avec timestamp d'expiration
   */
  private initializeSession(): void {
    const now = Date.now();
    const expiryTime = now + this.SESSION_DURATION;
    
    localStorage.setItem(this.sessionExpiryKey, expiryTime.toString());
    localStorage.setItem(this.lastActivityKey, now.toString());
    
    this.startSessionTimer();
    console.log('✅ Session initialisée, expiration dans 2 heures');
  }

  /**
   * Vérifier si la session a expiré
   */
  private isSessionExpired(): boolean {
    const expiryTime = localStorage.getItem(this.sessionExpiryKey);
    if (!expiryTime) {
      console.log('🔍 Pas de timestamp d\'expiration trouvé');
      return true;
    }
    
    const now = Date.now();
    const expiry = parseInt(expiryTime);
    const timeLeft = expiry - now;
    
    console.log('🔍 Vérification expiration session:', {
      now: new Date(now).toLocaleString(),
      expiry: new Date(expiry).toLocaleString(),
      timeLeftMinutes: Math.round(timeLeft / (1000 * 60)),
      isExpired: now > expiry
    });
    
    return now > expiry;
  }

  /**
   * Mettre à jour la dernière activité et prolonger la session
   */
  private updateLastActivity(): void {
    const now = Date.now();
    const newExpiryTime = now + this.SESSION_DURATION;
    
    localStorage.setItem(this.lastActivityKey, now.toString());
    localStorage.setItem(this.sessionExpiryKey, newExpiryTime.toString());
    
    // Redémarrer le timer
    this.startSessionTimer();
  }

  /**
   * Démarrer le timer de session
   */
  private startSessionTimer(): void {
    this.clearSessionTimer();
    
    const expiryTime = localStorage.getItem(this.sessionExpiryKey);
    if (!expiryTime) return;
    
    const timeUntilExpiry = parseInt(expiryTime) - Date.now();
    
    if (timeUntilExpiry > 0) {
      this.sessionTimer = setTimeout(() => {
        console.log('⏰ Session expirée automatiquement après 2 heures');
        this.logout().subscribe();
      }, timeUntilExpiry);
    }
  }

  /**
   * Nettoyer le timer de session
   */
  private clearSessionTimer(): void {
    if (this.sessionTimer) {
      clearTimeout(this.sessionTimer);
      this.sessionTimer = null;
    }
  }

  /**
   * Configurer le suivi d'activité utilisateur
   */
  private setupActivityTracking(): void {
    // Throttle pour éviter trop d'appels
    let lastUpdate = 0;
    const throttleDelay = 30000; // 30 secondes
    
    // Écouter les événements d'activité utilisateur
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
      document.addEventListener(event, () => {
        const now = Date.now();
        if (this.isAuthenticated() && (now - lastUpdate > throttleDelay)) {
          this.updateLastActivity();
          lastUpdate = now;
        }
      }, { passive: true });
    });

    // Vérifier périodiquement l'expiration de session
    setInterval(() => {
      if (this.isAuthenticated() && this.isSessionExpired()) {
        console.log('⏰ Session expirée, déconnexion automatique');
        this.logout().subscribe();
      }
    }, 60000); // Vérifier chaque minute
  }
}