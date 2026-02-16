import { apiClient } from "../api";
import { EmergencyRequest } from "../types/emergency";

const HELPDESK_EMERGENCY_ENDPOINTS = {
    GET_REQUESTS: "/emergency/requests/hospital",
    ACCEPT_REQUEST: (requestId: string) => `/emergency/requests/${requestId}/accept`,
    REJECT_REQUEST: (requestId: string) => `/emergency/requests/${requestId}/reject`,
} as const;

class HelpdeskEmergencyService {
    // Get emergency requests for the hospital
    async getHospitalEmergencyRequests(): Promise<{ requests: EmergencyRequest[] }> {
        return await apiClient(HELPDESK_EMERGENCY_ENDPOINTS.GET_REQUESTS, {
            method: "GET",
        });
    }

    // Accept an emergency request
    async acceptRequest(requestId: string, notes?: string): Promise<{
        message: string;
        request: EmergencyRequest;
    }> {
        return await apiClient(
            HELPDESK_EMERGENCY_ENDPOINTS.ACCEPT_REQUEST(requestId),
            {
                method: "PUT",
                body: JSON.stringify({ notes }),
            }
        );
    }

    // Reject an emergency request
    async rejectRequest(requestId: string, rejectionReason?: string): Promise<{
        message: string;
        request: EmergencyRequest;
    }> {
        return await apiClient(
            HELPDESK_EMERGENCY_ENDPOINTS.REJECT_REQUEST(requestId),
            {
                method: "PUT",
                body: JSON.stringify({ rejectionReason }),
            }
        );
    }
}

export const helpdeskEmergencyService = new HelpdeskEmergencyService();
