export interface Bed {
    _id: string;
    bedId: string;
    type: string;
    floor: string;
    room: string;
    department?: string;
    ward?: string;
    status: 'Vacant' | 'Occupied' | 'Cleaning' | 'Blocked';
    pricePerDay?: number;
    currentOccupancy?: {
        patientName: string;
        admissionId: string;
        admissionDate?: string | Date;
        condition?: string;
        lastVitalsRecordedAt?: string | Date;
        reasonForAdmission?: string;
        chiefComplaints?: string;
        symptoms?: string;
        reason?: string;
        notes?: string;
        clinicalNotes?: string;
    };
    hospital: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface IPDAdmission {
    _id: string;
    admissionId: string;
    patient: any;
    primaryDoctor: any;
    admissionDate: string;
    admissionType: 'ICU' | 'Ward' | 'Emergency';
    status: 'Active' | 'Discharged';
    diet?: string;
    clinicalNotes?: string;
    hospital: string;
}

export interface BedOccupancy {
    _id: string;
    bed: string | Bed;
    admission: string | IPDAdmission;
    startDate: string;
    endDate?: string;
    hospital: string;
}

export interface BedDetailsResponse {
    bed: Bed;
    occupancyDetails?: {
        admissionId: string;
        patient: { _id: string; name: string; mobile: string };
        doctor: { _id: string; user: { name: string } };
        admissionDate: string;
        vitals: any;
        medications?: string;
        diet?: string;
        reasonForAdmission?: string;
        chiefComplaints?: string;
        symptoms?: string;
        reason?: string;
        notes?: string;
        clinicalNotes?: string;
        condition?: string;
        lastVitalsRecordedAt?: string | Date;
        billing?: { totalAmount: number; status: string };
    };
}
