export enum Rol {
  ADMIN = 'Administrador',
  QA_LEAD = 'QA Lead',
  QA_TESTER = 'QA Tester',
  DEVELOPER = 'Desarrollador',
  PROJECT_MANAGER = 'Project Manager'
}

export interface Usuario {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  password?: string;
  rol: Rol;
  activo: boolean;
  creadoEn: Date;
  actualizadoEn: Date;
}

export interface UsuarioRol {
  id: number;
  usuarioId: number;
  rol: Rol;
  proyectoId?: number;
  creadoEn: Date;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  usuario: Usuario;
}
