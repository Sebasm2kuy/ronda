// Error estándar de la API (compartido entre cliente y backend simulado)

export class ApiError extends Error {
  code: string;
  constructor(message: string, code = "ERROR") {
    super(message);
    this.code = code;
  }
}
