/**
 * Calculates the duration between an admission date and the current time.
 * Returns a formatted string like "2 Days 5 Hours" or "0 Days 45 Mins".
 */
export const calculateStayDuration = (admissionDate: string | Date, endDate?: string | Date): string => {
    if (!admissionDate) return 'N/A';

    const start = new Date(admissionDate).getTime();
    const end = endDate ? new Date(endDate).getTime() : Date.now();
    const diffMs = end - start;

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
    // console.log("[formatLocalTime] Input:", { dateInput, fallback });

    if (!dateInput && !fallback) return "N/A";

    const isFormattedTime = (s: string) => /^\d{1,2}:\d{2}(?:\s*[AP]M)?$/i.test(s);

    try {
        // If we have a full timestamp (ISO or Date object), try converting it to local first.
        if (dateInput) {
            const date = new Date(dateInput);
            if (!isNaN(date.getTime())) {
                const localStr = date.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                });
                // If it's just midnight (from a date-only string), and we have a fallback, use fallback.
                if (localStr === "12:00 AM" && fallback && isFormattedTime(fallback)) {
                   return fallback;
                }
                return localStr;
            }
        }

        // Fallback to the provided time string if it's already formatted.
        if (fallback && isFormattedTime(fallback)) return fallback;
        if (typeof dateInput === 'string' && isFormattedTime(dateInput)) return dateInput;

        return fallback || "N/A";
    } catch (e) {
        console.error("[formatLocalTime] Error:", e);
        return fallback || "N/A";
    }
};

/**
 * Calculates age from date of birth.
 * Returns age as a string or "N/A".
 */
export const calculateAge = (dob: string | Date | undefined): string => {
    if (!dob) return "N/A";
    try {
        const birthDate = new Date(dob);
        if (isNaN(birthDate.getTime())) return "N/A";

        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age >= 0 ? age.toString() : "N/A";
    } catch (error) {
        return "N/A";
    }
};
