import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AdminGuard implements CanActivate {

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
        if (!isAuthenticated) {
          console.log('❌ User not authenticated, redirecting to login');
          localStorage.setItem('redirectUrl', state.url);
          this.router.navigate(['/login']);
          return false;
        }

        const user = this.authService.getCurrentUser();
        
        // Check account status
        if (user?.status !== 'ACTIVE') {
          console.log('❌ User account not active');
          this.router.navigate(['/login'], { 
            queryParams: { 
              error: 'account_inactive',
              message: 'Votre compte n\'est pas actif.' 
            }
          });
          return false;
        }

        // Check admin role
        if (user?.role !== 'ADMIN') {
          console.log('❌ User does not have admin role');
          this.router.navigate(['/compare'], { 
            queryParams: { 
              error: 'access_denied',
              message: 'Accès refusé. Droits administrateur requis.' 
            }
          });
          return false;
        }

        return true;
      })
    );
  }
}
