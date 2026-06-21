import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly KEY = 'qa_theme';

  oscuro = signal<boolean>(this.loadTheme());

  constructor() {
    this.applyTheme(this.oscuro());
  }

  toggle(): void {
    const next = !this.oscuro();
    this.oscuro.set(next);
    localStorage.setItem(this.KEY, next ? 'dark' : 'light');
    this.applyTheme(next);
  }

  private loadTheme(): boolean {
    const saved = localStorage.getItem(this.KEY);
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  private applyTheme(dark: boolean): void {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  }
}
