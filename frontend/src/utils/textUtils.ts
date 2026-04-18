const ALLOWED_CHARS = /^[a-zA-Z0-9\s&\-.()]+$/;
const STRIP_PATTERN = /[^a-zA-Z0-9\s&\-.()]/g;
const MAX_LENGTH = 25;
const MIN_LENGTH = 1;

export const sanitizeListName = (input: string): string => {
    if (!input) return '';
    let cleaned = input.replace(STRIP_PATTERN, '');
    cleaned = cleaned.trim();
    if (cleaned.length > MAX_LENGTH) {
        cleaned = cleaned.slice(0, MAX_LENGTH);
    }
    return cleaned;
};

export const formatForCreation = (input: string): string => {
    const sanitized = sanitizeListName(input);
    if (!sanitized) return '';
    return sanitized.charAt(0).toUpperCase() + sanitized.slice(1);
};

export const formatForEdit = (input: string): string => {
    return sanitizeListName(input);
};

export const validateListName = (
    name: string,
    existingNames: string[] = []
): { isValid: boolean; error: string | null } => {
    if (!name || name.trim().length === 0) {
        return { isValid: false, error: 'List name cannot be empty' };
    }
    if (name.trim().length < MIN_LENGTH) {
        return { isValid: false, error: `List name must be at least ${MIN_LENGTH} character` };
    }
    if (name.length > MAX_LENGTH) {
        return { isValid: false, error: `List name cannot exceed ${MAX_LENGTH} characters` };
    }
    if (!ALLOWED_CHARS.test(name)) {
        return {
            isValid: false,
            error: 'Only letters, numbers, spaces, &, -, ., and () are allowed'
        };
    }
    const isDuplicate = existingNames.some(existingName =>
        existingName.toLowerCase() === name.toLowerCase()
    );
    if (isDuplicate) {
        return { isValid: false, error: 'A list with this name already exists' };
    }
    return { isValid: true, error: null };
};