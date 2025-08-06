import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';

// PrimeNG imports
import { MenubarModule } from 'primeng/menubar';
import { ButtonModule } from 'primeng/button';
import { MenuItem } from 'primeng/api';

// Theme switcher
import { ThemeSwitcherComponent } from '../theme-switcher/theme-switcher.component';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, MenubarModule, ButtonModule, ThemeSwitcherComponent],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss'
})
export class NavbarComponent {
  items: MenuItem[];

  constructor(private router: Router) {
    this.items = [
      {
        label: 'UTWIN',
        icon: 'pi pi-calculator',
        command: () => this.router.navigate(['/tarif-utwin'])
      },
      {
        label: 'APRIL',
        icon: 'pi pi-calculator',
        command: () => this.router.navigate(['/tarif-april'])
      },
      {
        label: 'Comparateur',
        icon: 'pi pi-sync',
        command: () => this.router.navigate(['/compare'])
      }
    ];
  }

}
