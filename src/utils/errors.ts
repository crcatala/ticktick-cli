/**
 * Custom error classes for TickTick CLI.
 */

export class TickTickCLIError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TickTickCLIError";
  }
}

export class ConfigError extends TickTickCLIError {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

export class AuthError extends TickTickCLIError {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

export class ClientError extends TickTickCLIError {
  constructor(message: string) {
    super(message);
    this.name = "ClientError";
  }
}

export class ApiError extends ClientError {
  public status: number;
  public body: string;

  constructor(status: number, body: string) {
    super(`HTTP ${status}: ${body}`);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}
