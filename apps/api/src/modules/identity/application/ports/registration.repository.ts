export interface CreatePatientRegistration {
  phone: string;
  passwordHash: string;
}

export interface RegisteredUser {
  id: string;
  phone: string;
  roles: string[];
  createdAt: Date;
}

export class PhoneAlreadyRegisteredError extends Error {
  constructor() {
    super('An account with this phone number already exists.');
    this.name = 'PhoneAlreadyRegisteredError';
  }
}

export class RegistrationConfigurationError extends Error {
  constructor() {
    super('Identity registration is not configured.');
    this.name = 'RegistrationConfigurationError';
  }
}

export abstract class RegistrationRepository {
  abstract createPatient(
    registration: CreatePatientRegistration,
  ): Promise<RegisteredUser>;
}
