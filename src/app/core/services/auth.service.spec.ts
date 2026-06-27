import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { Rol } from '../models';
import { environment } from '../../../environments/environment';

const mockUsuario = {
  id: 1, nombre: 'Admin', apellido: 'QA', email: 'admin@qa.com',
  rol: Rol.ADMIN, activo: true,
};

describe('AuthService', () => {
  let service: AuthService;
  let http: HttpTestingController;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    router = jasmine.createSpyObj('Router', ['navigate']);
    localStorage.clear();

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AuthService, { provide: Router, useValue: router }],
    });

    service = TestBed.inject(AuthService);
    http    = TestBed.inject(HttpTestingController);
  });

  afterEach(() => { http.verify(); localStorage.clear(); });

  it('inicia sin usuario autenticado', () => {
    expect(service.usuarioActual()).toBeNull();
  });

  it('login guarda token y usuario en localStorage', () => {
    service.login({ email: 'admin@qa.com', password: '123456' }).subscribe();

    const req = http.expectOne(`${environment.apiUrl}/auth/login`);
    req.flush({ token: 'test_token', usuario: mockUsuario });

    expect(localStorage.getItem('qa_token')).toBe('test_token');
    expect(service.usuarioActual()?.email).toBe('admin@qa.com');
  });

  it('logout limpia storage, signal y navega al login', () => {
    localStorage.setItem('qa_token', 'tok');
    localStorage.setItem('qa_user', JSON.stringify(mockUsuario));
    service['usuarioActual'].set(mockUsuario as any);

    service.logout();

    expect(localStorage.getItem('qa_token')).toBeNull();
    expect(service.usuarioActual()).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(['/auth/login']);
  });

  it('isAuthenticated retorna true cuando hay token', () => {
    localStorage.setItem('qa_token', 'tok');
    expect(service.isAuthenticated()).toBeTrue();
  });

  it('isAuthenticated retorna false sin token', () => {
    expect(service.isAuthenticated()).toBeFalse();
  });

  describe('computed roles', () => {
    it('esAdmin es true para ADMIN', () => {
      service['usuarioActual'].set({ ...mockUsuario, rol: Rol.ADMIN } as any);
      expect(service.esAdmin()).toBeTrue();
    });

    it('esAdmin es false para QA_TESTER', () => {
      service['usuarioActual'].set({ ...mockUsuario, rol: Rol.QA_TESTER } as any);
      expect(service.esAdmin()).toBeFalse();
    });

    it('puedeEditar es true para QA_LEAD', () => {
      service['usuarioActual'].set({ ...mockUsuario, rol: Rol.QA_LEAD } as any);
      expect(service.puedeEditar()).toBeTrue();
    });

    it('esDesarrollador es true para DEVELOPER', () => {
      service['usuarioActual'].set({ ...mockUsuario, rol: Rol.DEVELOPER } as any);
      expect(service.esDesarrollador()).toBeTrue();
    });
  });
});
