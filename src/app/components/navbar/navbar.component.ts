import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

import { AuthService, UserInfo } from '../../services/auth.service';
import { ThemeSwitcherComponent } from '../theme-switcher/theme-switcher.component';
import { ButtonModule } from 'primeng/button';
import { MenuModule } from 'primeng/menu';
import { AvatarModule } from 'primeng/avatar';
import { BadgeModule } from 'primeng/badge';
import { TagModule } from 'primeng/tag';
import { MenuItem } from 'primeng/api';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [
    CommonModule, 
    RouterLink, 
    RouterLinkActive, 
    ThemeSwitcherComponent,
    ButtonModule,
    MenuModule,
    AvatarModule,
    BadgeModule,
    TagModule
  ],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css'
})
export class NavbarComponent implements OnInit, OnDestroy {
  currentUser: UserInfo | null = null;
  isAuthenticated = false;
  showUserMenu = false;
  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  ngOnInit(): void {
    // Subscribe to authentication state
    this.authService.isAuthenticated$
      .pipe(takeUntil(this.destroy$))
      .subscribe(isAuth => {
        this.isAuthenticated = isAuth;
      });

    // Subscribe to current user
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.currentUser = user;
        this.updateUserMenu();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private updateUserMenu(): void {
    // Menu items no longer needed with custom dropdown
  }

  getUserInitials(): string {
    if (!this.currentUser) return '';
    
    const firstInitial = this.currentUser.prenom?.charAt(0)?.toUpperCase() || '';
    const lastInitial = this.currentUser.nom?.charAt(0)?.toUpperCase() || '';
    
    return `${firstInitial}${lastInitial}`;
  }

  getUserDisplayName(): string {
    if (!this.currentUser) return '';
    
    return `${this.currentUser.prenom} ${this.currentUser.nom}`;
  }

  getRoleBadge(): string {
    if (!this.currentUser) return '';
    
    switch (this.currentUser.role) {
      case 'ADMIN':
        return 'Admin';
      case 'COMMERCIAL':
        return 'Commercial';
      case 'VIEWER':
        return 'Viewer';
      default:
        return '';
    }
  }

  getRoleSeverity(): string {
    if (!this.currentUser) return 'info';
    
    switch (this.currentUser.role) {
      case 'ADMIN':
        return 'danger';
      case 'COMMERCIAL':
        return 'success';
      case 'VIEWER':
        return 'info';
      default:
        return 'info';
    }
  }

  isHubSpotUser(): boolean {
    return this.currentUser?.is_hubspot_user === true;
  }

  viewProfile(): void {
    // Navigate to profile page (to be implemented)
    console.log('View profile clicked');
    this.showUserMenu = false;
  }

  logout(): void {
    this.showUserMenu = false;
    this.authService.logout().subscribe({
      next: () => {
        console.log('✅ Logout successful');
      },
      error: (error) => {
        console.error('❌ Logout error:', error);
        // Even if logout API fails, we still redirect to login
      }
    });
  }

  navigateToLogin(): void {
    this.router.navigate(['/login']);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    const userProfileMenu = target.closest('.user-profile-dropdown');
    
    if (!userProfileMenu && this.showUserMenu) {
      this.showUserMenu = false;
    }
  }
}