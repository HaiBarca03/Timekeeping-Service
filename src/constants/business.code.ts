export const BusinessCodes = {
  SUCCESS: {
    code: 1000,
    message: 'Operation completed successfully.',
  },
  ERROR: {
    code: 1001,
    message: 'An error occurred during the operation.',
  },
  VALIDATION_ERROR: {
    code: 1002,
    message: 'Validation failed for the provided data.',
  },
  NOT_FOUND: {
    code: 1003,
    message: 'The requested resource was not found.',
  },
  UNAUTHORIZED: {
    code: 1004,
    message: 'You are not authorized to perform this action.',
  },
  FORBIDDEN: {
    code: 1005,
    message: 'Access to the requested resource is forbidden.',
  },
  SERVER_ERROR: {
    code: 1006,
    message: 'An internal server error occurred.',
  },
}