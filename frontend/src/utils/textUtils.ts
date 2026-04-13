/**
 * Text transformation utilities for stock list names
 * Rules:
 * 1. Only allow: Letters (A-Z a-z), Numbers (0-9), Spaces, &, -, ., ()
 * 2. First letter uppercase on creation only
 * 3. Preserve user's case during edits
 */

// Allowed characters regex
const ALLOWED_CHARS = /^[a-zA-Z0-9\s&\-.()]+$/;

// Characters to strip (anything not allowed)
const STRIP_PATTERN = /[^a-zA-Z0-9\s&\-.()]/g;

// Maximum length for list name
const MAX_LENGTH = 25;

// Minimum length for list name
const MIN_LENGTH = 1;

/**
 * Sanitize input - remove invalid characters
 */
export const sanitizeListName = (input: string): string => {
    if (!input) return '';
    
    // Remove any disallowed characters
    let cleaned = input.replace(STRIP_PATTERN, '');
    
    // Trim whitespace
    cleaned = cleaned.trim();
    
    // Limit length
    if (cleaned.length > MAX_LENGTH) {
        cleaned = cleaned.slice(0, MAX_LENGTH);
    }
    
    return cleaned;
};

/**
 * Format for creation - First letter uppercase, rest as provided
 * Example: "swing trades" → "Swing trades"
 */
export const formatForCreation = (input: string): string => {
    const sanitized = sanitizeListName(input);
    if (!sanitized) return '';
    
    // First letter uppercase, rest preserved
    return sanitized.charAt(0).toUpperCase() + sanitized.slice(1);
};

/**
 * Format for editing - Preserve user's exact case
 * Only sanitize invalid characters
 */
export const formatForEdit = (input: string): string => {
    return sanitizeListName(input);
};

/**
 * Validate list name before saving
 */
export const validateListName = (
    name: string, 
    existingNames: string[] = []
): { isValid: boolean; error: string | null } => {
    // Check if empty
    if (!name || name.trim().length === 0) {
        return { isValid: false, error: 'List name cannot be empty' };
    }
    
    // Check minimum length
    if (name.trim().length < MIN_LENGTH) {
        return { isValid: false, error: `List name must be at least ${MIN_LENGTH} character` };
    }
    
    // Check maximum length
    if (name.length > MAX_LENGTH) {
        return { isValid: false, error: `List name cannot exceed ${MAX_LENGTH} characters` };
    }
    
    // Check for invalid characters
    if (!ALLOWED_CHARS.test(name)) {
        return { 
            isValid: false, 
            error: 'Only letters, numbers, spaces, &, -, ., and () are allowed' 
        };
    }
    
    // Check for duplicate names (excluding current list if editing)
    const isDuplicate = existingNames.some(existingName => 
        existingName.toLowerCase() === name.toLowerCase()
    );
    
    if (isDuplicate) {
        return { isValid: false, error: 'A list with this name already exists' };
    }
    
    return { isValid: true, error: null };
};