const isDevelopment = import.meta.env.DEV;

export const logger = {
    error(message: string, error?: unknown) {
        if (isDevelopment) {
            console.error(message, error);
        }
    },
    warn(message: string, details?: unknown) {
        if (isDevelopment) {
            console.warn(message, details);
        }
    },
    info(message: string, details?: unknown) {
        if (isDevelopment) {
            console.info(message, details);
        }
    },
};
