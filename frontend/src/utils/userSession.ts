const USER_ID_STORAGE_KEY = 'stock-tracker-user-id';

const createUserId = () => `user-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export const getUserId = () => {
    if (typeof window === 'undefined') {
        return 'anonymous';
    }

    const existing = window.localStorage.getItem(USER_ID_STORAGE_KEY);
    if (existing) {
        return existing;
    }

    const next = createUserId();
    window.localStorage.setItem(USER_ID_STORAGE_KEY, next);
    return next;
};
