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
    if (!dateInput) return fallback || 'N/A';
    
    // Ignore date-only strings (e.g., "2026-04-16") as they would parse to UTC midnight 
    // and show as "05:30 AM" in IST. We prefer the fallback (original time string) in this case.
    if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
        return fallback || 'N/A';
    }

    try {
        const date = new Date(dateInput);
        if (isNaN(date.getTime())) return fallback || String(dateInput);
        
        // Ensure we are not returning midnight if the input was potentially date-only but didn't match the regex
        const timeStr = date.toISOString();
        if (timeStr.endsWith('T00:00:00.000Z') && typeof dateInput === 'string' && !dateInput.includes(':')) {
            return fallback || 'N/A';
        }

        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    } catch (e) {
        return fallback || String(dateInput);
    }
};
