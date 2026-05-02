const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png'];

export type ValidationResult = {
  valid: boolean;
  error?: string;
};

export function validateFiles(files: File[]): ValidationResult {
  if (files.length === 0) {
    return { valid: false, error: 'Please select at least 1 file.' };
  }
  if (files.length > 5) {
    return { valid: false, error: 'You can upload up to 5 files at a time.' };
  }
  for (const file of files) {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return { valid: false, error: `${file.name} is not a JPEG or PNG.` };
    }
    if (file.size > MAX_FILE_SIZE) {
      return { valid: false, error: `${file.name} is larger than 10MB.` };
    }
  }
  return { valid: true };
}

export function getValidationConstants() {
  return { MAX_FILE_SIZE, ACCEPTED_TYPES };
}
