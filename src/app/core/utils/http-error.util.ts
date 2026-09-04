import { HttpErrorResponse } from '@angular/common/http';

/**
 * Traduce un error HTTP de subida de archivo a un mensaje legible.
 * Evita mostrar "error desconocido" cuando el backend/proxy no devuelve
 * un cuerpo JSON con `message` (ej. 413 de nginx, timeouts, red caída).
 */
export function mensajeErrorSubida(err: unknown): string {
  const httpErr = err as HttpErrorResponse;

  // El backend devolvió un mensaje explícito (validación, tipo no permitido, etc.)
  if (httpErr?.error?.message) {
    return Array.isArray(httpErr.error.message)
      ? httpErr.error.message.join(', ')
      : httpErr.error.message;
  }

  switch (httpErr?.status) {
    case 0:
      return 'no se pudo conectar con el servidor (revisa tu conexión)';
    case 401:
      return 'tu sesión expiró, vuelve a iniciar sesión';
    case 403:
      return 'no tienes permiso para subir archivos';
    case 413:
      return 'el archivo supera el tamaño máximo permitido (25MB)';
    case 415:
      return 'tipo de archivo no permitido';
    case 500:
    case 502:
    case 503:
    case 504:
      return 'el servidor no pudo procesar el archivo, intenta de nuevo';
  }

  if (httpErr?.status) {
    return `el servidor respondió con un error (código ${httpErr.status})`;
  }

  return 'error desconocido';
}
