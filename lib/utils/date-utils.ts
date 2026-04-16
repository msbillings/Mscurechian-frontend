/**
 * Calculates the duration between an admission date and the current time.
 * Returns a formatted string like "2 Days 5 Hours" or "0 Days 45 Mins".
 */
export const calculateStayDuration = (admissionDate: string | Date): string => {
    if (!admissionDate) return 'N/A';

    const start = new Date(admissionDate).getTime();
    const now = Date.now();
    const diffMs = now - start;

    if (diffMs < 0) return "0 Days 0 Mins";

    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffDays > 0) {
        return `${diffDays} Day${diffDays > 1 ? 's' : ''} ${diffHours} Hr${diffHours !== 1 ? 's' : ''}`;
    } else if (diffHours > 0) {
        return `${diffHours} Hr${diffHours !== 1 ? 's' : ''} ${diffMins} Min${diffMins !== 1 ? 's' : ''}`;
    } else {
        return `${diffMins} Min${diffMins !== 1 ? 's' : ''}`;
    }
};

/**
 * Formats a date string or Date object to a local time string (e.g., "10:10 AM").
 * Handles UTC to Local conversion automatically.
 */
export const formatLocalTime = (dateInput: string | Date | undefined, fallback?: string): string => {
    // 1. If fallback is already a formatted time (e.g. "10:39 AM"), return it immediately.
    // This is the most reliable way to show the time specifically saved during booking.
    const isFormattedTime = (s: string) => /^\d{1,2}:\d{2}(?:\s*[AP]M)?$/i.test(s);
    if (fallback && isFormattedTime(fallback)) {
        return fallback;
    }

    // 2. If dateInput itself looks like a formatted time, return it.
    if (typeof dateInput === 'string' && isFormattedTime(dateInput)) {
        return dateInput;
    }

    if (!dateInput) return fallback || 'N/A';
    
    // 3. Ignore date-only strings.
    if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
        return fallback || 'N/A';
    }

    try {
        const date = new Date(dateInput);
        if (isNaN(date.getTime())) return fallback || String(dateInput);
        
        // 4. Handle "midnight" edge cases for date-only ISO strings.
        const timeStr = date.toISOString();
        if (timeStr.includes('T00:00:00') && typeof dateInput === 'string' && !dateInput.includes(':')) {
            return fallback || 'N/A';
        }

        // 5. Use toLocaleTimeString which handles the visitor's local timezone.
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    } catch (e) {
        return fallback || String(dateInput);
    }
};
