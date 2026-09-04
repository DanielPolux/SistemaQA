import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { HeaderComponent } from './layout/header/header.component';
import { SidebarComponent } from './layout/sidebar/sidebar.component';
import { ToastComponent } from './layout/toast/toast.component';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, HeaderComponent, SidebarComponent, ToastComponent],
  templateUrl: './app.component.html'
})
export class AppComponent {
  auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly esRutaAutenticacion = signal(this.router.url.startsWith('/auth/'));

  constructor() {
    this.router.events
      .pipe(filter((evento): evento is NavigationEnd => evento instanceof NavigationEnd))
      .subscribe(evento => this.esRutaAutenticacion.set(evento.urlAfterRedirects.startsWith('/auth/')));
  }
}
