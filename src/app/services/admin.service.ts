import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';
import { AuthService } from './auth.service';

export interface User {
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

export interface UserCreate {
  nom: string;
  prenom: string;
  email: string;
  password: string;
  role: 'ADMIN' | 'COMMERCIAL' | 'VIEWER';
  telephone?: string;
  departement?: string;
}

export interface UserUpdate {
  nom?: string;
  prenom?: string;
  email?: string;
  role?: 'ADMIN' | 'COMMERCIAL' | 'VIEWER';
  status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  telephone?: string;
  departement?: string;
}

export interface UserList {
  users: User[];
  total: number;
}

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private baseUrl = `${environment.apiUrl}/api/v1`;
  private usersUrl = `${this.baseUrl}/admin/users`;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  getUsers(page = 1, perPage = 10, search?: string, role?: string, status?: string): Observable<User[] | UserList> {
    let params = new HttpParams()
      .set('skip', ((page - 1) * perPage).toString())
      .set('limit', perPage.toString());
    
    if (search) params = params.set('search', search);
    if (role) params = params.set('role', role);
    if (status) params = params.set('status', status);

    console.log('🔍 AdminService - Making request to:', this.usersUrl);
    console.log('🔍 AdminService - Params:', params.toString());
    console.log('🔍 AdminService - Headers:', this.getAuthHeaders());

    return this.http.get<UserList>(this.usersUrl, { 
      headers: this.getAuthHeaders(),
      params 
    });
  }

  getUser(id: string): Observable<User> {
    return this.http.get<User>(`${this.usersUrl}/${id}`, {
      headers: this.getAuthHeaders()
    });
  }

  createUser(user: UserCreate): Observable<User> {
    return this.http.post<User>(this.usersUrl, user, {
      headers: this.getAuthHeaders()
    });
  }

  updateUser(id: string, user: UserUpdate): Observable<User> {
    return this.http.put<User>(`${this.usersUrl}/${id}`, user, {
      headers: this.getAuthHeaders()
    });
  }

  deleteUser(id: string): Observable<any> {
    return this.http.delete(`${this.usersUrl}/${id}`, {
      headers: this.getAuthHeaders()
    });
  }

  activateUser(id: string): Observable<any> {
    return this.http.put(`${this.usersUrl}/${id}/status`, 
      { status: 'ACTIVE' }, 
      { headers: this.getAuthHeaders() }
    );
  }

  deactivateUser(id: string): Observable<any> {
    return this.http.put(`${this.usersUrl}/${id}/status`, 
      { status: 'INACTIVE' }, 
      { headers: this.getAuthHeaders() }
    );
  }

  suspendUser(id: string): Observable<any> {
    return this.http.put(`${this.usersUrl}/${id}/status`, 
      { status: 'SUSPENDED' }, 
      { headers: this.getAuthHeaders() }
    );
  }
}
