import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ToastService } from './toast.service';

describe('ToastService', () => {
  let service: ToastService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ToastService);
  });

  it('inicia sin toasts', () => {
    expect(service.toasts()).toHaveSize(0);
  });

  it('agrega un toast al llamar mostrar()', () => {
    service.mostrar('Algo falló', 'error');
    expect(service.toasts()).toHaveSize(1);
    expect(service.toasts()[0].mensaje).toBe('Algo falló');
    expect(service.toasts()[0].tipo).toBe('error');
  });

  it('el helper error() agrega toast de tipo error', () => {
    service.error('Error de red');
    expect(service.toasts()[0].tipo).toBe('error');
  });

  it('el helper exito() agrega toast de tipo success', () => {
    service.exito('Guardado correctamente');
    expect(service.toasts()[0].tipo).toBe('success');
  });

  it('el helper aviso() agrega toast de tipo warning', () => {
    service.aviso('Atención');
    expect(service.toasts()[0].tipo).toBe('warning');
  });

  it('el helper info() agrega toast de tipo info', () => {
    service.info('Información');
    expect(service.toasts()[0].tipo).toBe('info');
  });

  it('cerrar() elimina el toast con el id dado', () => {
    service.error('Toast A');
    service.error('Toast B');
    const idA = service.toasts()[0].id;

    service.cerrar(idA);

    expect(service.toasts()).toHaveSize(1);
    expect(service.toasts()[0].mensaje).toBe('Toast B');
  });

  it('elimina el toast automáticamente después de la duración', fakeAsync(() => {
    service.mostrar('Temporal', 'info', 3000);
    expect(service.toasts()).toHaveSize(1);

    tick(3000);

    expect(service.toasts()).toHaveSize(0);
  }));

  it('permite múltiples toasts simultáneos', () => {
    service.error('Uno');
    service.exito('Dos');
    service.aviso('Tres');

    expect(service.toasts()).toHaveSize(3);
  });

  it('cerrar un id inexistente no afecta los toasts actuales', () => {
    service.error('Persistente');
    service.cerrar(99999);

    expect(service.toasts()).toHaveSize(1);
  });
});
