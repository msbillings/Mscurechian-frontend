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
