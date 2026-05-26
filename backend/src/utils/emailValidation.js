const dns = require('dns').promises;

class EmailValidationError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = 'EmailValidationError';
    this.statusCode = statusCode;
  }
}

const EMAIL_PATTERN = /^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?)+$/i;

const getDomain = (email) => String(email || '').split('@').pop().toLowerCase();

const isValidEmailSyntax = (email) => {
  const value = String(email || '').trim();
  const [localPart, domain] = value.split('@');

  return (
    value.length <= 254
    && Boolean(localPart)
    && Boolean(domain)
    && localPart.length <= 64
    && !value.includes('..')
    && EMAIL_PATTERN.test(value)
  );
};

const withTimeout = (promise, timeoutMs) => new Promise((resolve, reject) => {
  const timer = setTimeout(() => {
    reject(new EmailValidationError('Unable to verify this email right now. Please try again.', 503));
  }, timeoutMs);

  promise
    .then((value) => {
      clearTimeout(timer);
      resolve(value);
    })
    .catch((error) => {
      clearTimeout(timer);
      reject(error);
    });
});

const isTemporaryDnsError = (error) => (
  ['ETIMEOUT', 'ESERVFAIL', 'EAI_AGAIN', 'ECONNREFUSED'].includes(error?.code)
  || error instanceof EmailValidationError
);

const assertValidEmailForDelivery = async (email) => {
  const normalizedEmail = String(email || '').trim().toLowerCase();

  if (!isValidEmailSyntax(normalizedEmail)) {
    throw new EmailValidationError('Please enter a valid email address.');
  }

  const domain = getDomain(normalizedEmail);
  const timeoutMs = Number(process.env.EMAIL_DNS_TIMEOUT_MS || 4000);

  try {
    const mxRecords = await withTimeout(dns.resolveMx(domain), timeoutMs);
    if (Array.isArray(mxRecords) && mxRecords.length > 0) {
      return normalizedEmail;
    }
  } catch (error) {
    if (error?.code !== 'ENODATA' && error?.code !== 'ENOTFOUND') {
      if (isTemporaryDnsError(error)) {
        throw new EmailValidationError('Unable to verify this email right now. Please try again.', 503);
      }

      throw error;
    }
  }

  throw new EmailValidationError('Please enter an email address that can receive mail.');
};

module.exports = {
  EmailValidationError,
  assertValidEmailForDelivery,
  isValidEmailSyntax,
};
