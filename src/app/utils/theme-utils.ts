/**
 * Utility class to provide dynamic theme capabilities for the application
 * This can be used to programmatically switch between PrimeNG themes
 */
export class ThemeUtils {
  /**
   * Switching theme dynamically
   * @param theme Theme name: 'light' or 'dark'
   */
  public static switchTheme(theme: 'light' | 'dark') {
    const themeLink = document.getElementById('app-theme') as HTMLLinkElement;
    if (themeLink) {
      // Set theme based on theme name
      if (theme === 'dark') {
        themeLink.href = 'md-dark-indigo/theme.css';
        document.documentElement.classList.add('dark-theme');
        document.documentElement.setAttribute('data-theme-mode', 'dark');
      } else {
        themeLink.href = 'md-light-indigo/theme.css';
        document.documentElement.classList.remove('dark-theme');
        document.documentElement.setAttribute('data-theme-mode', 'light');
      }

      // Store user preference
      localStorage.setItem('theme-preference', theme);
    }
  }

  /**
   * Initialize theme on app startup
   * Reads from localStorage and sets the appropriate theme
   */
  public static initializeTheme() {
    // Check if user has a saved preference
    const savedTheme = localStorage.getItem('theme-preference') as 'light' | 'dark' | null;
    if (savedTheme) {
      this.switchTheme(savedTheme);
    } else {
      // Check if user prefers dark mode from system
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        this.switchTheme('dark');
      }
    }
  }
}

