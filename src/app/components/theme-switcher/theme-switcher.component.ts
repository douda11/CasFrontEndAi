import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { ThemeUtils } from '../../utils/theme-utils';

@Component({
  selector: 'app-theme-switcher',
  standalone: true,
  imports: [CommonModule, ButtonModule],
  template: `
    <button 
      pButton 
      [icon]="isDarkMode() ? 'pi pi-sun' : 'pi pi-moon'"
      [class]="isDarkMode() ? 'p-button-rounded p-button-text' : 'p-button-rounded p-button-text p-button-secondary'"
      (click)="toggleTheme()"
      aria-label="Toggle theme"
      title="Toggle dark/light mode">
    </button>
  `,
  styles: [`
    :host {
      display: inline-block;
    }
    button {
      width: 2.5rem;
      height: 2.5rem;
    }
  `]
})
export class ThemeSwitcherComponent {
  toggleTheme(): void {
    const currentIsDark = this.isDarkMode();
    ThemeUtils.switchTheme(currentIsDark ? 'light' : 'dark');
  }
  
  isDarkMode(): boolean {
    return document.documentElement.classList.contains('dark-theme');
  }
}
