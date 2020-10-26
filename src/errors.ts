
export class ConfigurationError extends Error {
  constructor(message: string) {
      super(message);

      // Set the prototype explicitly, this is needed for instanceof checks
      Object.setPrototypeOf(this, ConfigurationError.prototype);
  }
}
