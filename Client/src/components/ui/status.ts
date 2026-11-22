export type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'brand';

/** Maps booking / payment / request statuses to a badge tone. */
export const statusTone = (status?: string): BadgeTone => {
    switch (status) {
        case 'confirmed':
        case 'paid':
        case 'checked_in':
        case 'completed':
        case 'available':
        case 'succeeded':
            return 'success';
        case 'pending':
        case 'in_progress':
        case 'dirty':
            return 'warning';
        case 'cancelled':
        case 'failed':
        case 'maintenance':
            return 'danger';
        case 'refunded':
        case 'checked_out':
        case 'occupied':
            return 'info';
        default:
            return 'neutral';
    }
};
