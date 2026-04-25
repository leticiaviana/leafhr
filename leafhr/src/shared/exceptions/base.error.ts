export class BaseError extends Error {
  public readonly code: string;
  public readonly httpStatus: number;
  public readonly details: Record<string, unknown>;

  constructor(
    message: string,
    code: string,
    httpStatus: number = 400,
    details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.httpStatus = httpStatus;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
