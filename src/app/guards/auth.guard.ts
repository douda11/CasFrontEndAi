import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {
    
    return this.authService.isAuthenticated$.pipe(
      take(1),
      map(isAuthenticated => {
        if (isAuthenticated) {
          // Check if user account is active
          const user = this.authService.getCurrentUser();
          
          if (user?.status === 'INACTIVE') {
            console.log('❌ User account is inactive');
            this.router.navigate(['/login'], { 
              queryParams: { 
                error: 'account_inactive',
                message: 'Votre compte est inactif. Contactez l\'administrateur.' 
              }
            });
            return false;
          }
          
          if (user?.status === 'SUSPENDED') {
            console.log('❌ User account is suspended');
            this.router.navigate(['/login'], { 
              queryParams: { 
                error: 'account_suspended',
                message: 'Votre compte est suspendu. Contactez l\'administrateur.' 
              }
            });
            return false;
          }
          
          return true;
        } else {
          console.log('❌ User not authenticated, redirecting to login');
          
          // Store the attempted URL for redirecting after login
          if (state.url !== '/login') {
            localStorage.setItem('redirectUrl', state.url);
          }
          
          this.router.navigate(['/login']);
          return false;
        }
      })
    );
  }
}
