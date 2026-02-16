'use client';

import React, { useState } from 'react';
import { Plus, Trash2, Save, Clock, Calendar as CalendarIcon, X } from 'lucide-react';
import { updateDoctorAvailabilityAction } from '@/lib/integrations/actions/calendar.actions';

interface AvailabilitySlot {
    _id?: string;
    days: string[];
    startTime: string;
    endTime: string;
    breakStart?: string;
    breakEnd?: string;
}

interface AvailabilityManagerProps {
    initialAvailability: AvailabilitySlot[];
}

const DAYS_OF_WEEK = [
    'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
];

function AvailabilityManager({ initialAvailability }: AvailabilityManagerProps) {
    const [slots, setSlots] = useState<AvailabilitySlot[]>(initialAvailability || []);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const handleAddSlot = () => {
        setSlots([
            ...slots,
            {
                days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
                startTime: '09:00 AM',
                endTime: '05:00 PM',
            }
        ]);
        setIsEditing(true);
    };

    const handleRemoveSlot = (index: number) => {
        const newSlots = [...slots];
        newSlots.splice(index, 1);
        setSlots(newSlots);
        setIsEditing(true);
    };

    const handleChange = (index: number, field: keyof AvailabilitySlot, value: any) => {
        const newSlots = [...slots];
        newSlots[index] = { ...newSlots[index], [field]: value };
        setSlots(newSlots);
        setIsEditing(true); // Enable save button
    };

    const handleDayToggle = (slotIndex: number, day: string) => {
        const newSlots = [...slots];
        const currentDays = newSlots[slotIndex].days || [];
        if (currentDays.includes(day)) {
            newSlots[slotIndex].days = currentDays.filter(d => d !== day);
        } else {
            newSlots[slotIndex].days = [...currentDays, day];
        }
        setSlots(newSlots);
        setIsEditing(true);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const result = await updateDoctorAvailabilityAction(slots);
            if (result.success) {
                setIsEditing(false);
                // Toast or notification could go here
            } else {
                alert('Failed to save availability: ' + result.error);
            }
        } catch (error) {
            console.error(error);
            alert('An error occurred while saving.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="bg-white dark:bg-[#111] p-6 rounded-2xl border border-gray-200 dark:border-gray-800 space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                    <Clock className="text-emerald-500" /> Availability Manager
                </h3>
                <button
                    onClick={handleAddSlot}
                    className="text-sm bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-lg hover:bg-emerald-100 font-medium flex items-center gap-1"
                >
                    <Plus size={16} /> Add Slot
                </button>
            </div>

            <div className="space-y-4">
                {slots.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 text-sm bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                        No availability slots configured. Add one to get started.
                    </div>
                ) : (
                    slots.map((slot, index) => (
                        <div key={index} className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30 space-y-4 relative group">
                            <button
                                onClick={() => handleRemoveSlot(index)}
                                className="absolute top-2 right-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 p-1"
                                title="Remove Slot"
                            >
                                <Trash2 size={16} />
                            </button>

                            {/* Days Selection */}
                            <div className="flex flex-wrap gap-2">
                                {DAYS_OF_WEEK.map(day => (
                                    <button
                                        key={day}
                                        onClick={() => handleDayToggle(index, day)}
                                        className={`px-2 py-1 text-xs rounded-md ${slot.days.includes(day)
                                            ? 'bg-emerald-600 text-white font-medium shadow-sm'
                                            : 'bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600'
                                            }`}
                                    >
                                        {day.slice(0, 3)}
                                    </button>
                                ))}
                            </div>

                            {/* Time Inputs */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Start Time</label>
                                    <input
                                        type="text"
                                        value={slot.startTime}
                                        onChange={(e) => handleChange(index, 'startTime', e.target.value)}
                                        className="w-full text-sm bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-lg p-2 focus:ring-2 focus:ring-emerald-500 outline-hidden"
                                        placeholder="09:00 AM"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">End Time</label>
                                    <input
                                        type="text"
                                        value={slot.endTime}
                                        onChange={(e) => handleChange(index, 'endTime', e.target.value)}
                                        className="w-full text-sm bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-lg p-2 focus:ring-2 focus:ring-emerald-500 outline-hidden"
                                        placeholder="05:00 PM"
                                    />
                                </div>
                            </div>

                            {/* Break Time (Optional) */}
                            <div className="pt-2 border-t border-gray-200 dark:border-gray-700/50">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-400 mb-1">Break Start (Optional)</label>
                                        <input
                                            type="text"
                                            value={slot.breakStart || ''}
                                            onChange={(e) => handleChange(index, 'breakStart', e.target.value)}
                                            className="w-full text-xs bg-transparent border border-gray-200 dark:border-gray-700 rounded-lg p-2 text-gray-600 focus:border-emerald-500 outline-hidden"
                                            placeholder="01:00 PM"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-400 mb-1">Break End (Optional)</label>
                                        <input
                                            type="text"
                                            value={slot.breakEnd || ''}
                                            onChange={(e) => handleChange(index, 'breakEnd', e.target.value)}
                                            className="w-full text-xs bg-transparent border border-gray-200 dark:border-gray-700 rounded-lg p-2 text-gray-600 focus:border-emerald-500 outline-hidden"
                                            placeholder="02:00 PM"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Action Footer */}
            {isEditing && (
                <div className="flex justify-end pt-2">
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-5 py-2 bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-200 dark:shadow-none hover:bg-emerald-700 flex items-center gap-2 font-medium disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isSaving ? (
                            <>
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save size={18} /> Save Changes
                            </>
                        )}
                    </button>
                </div>
            )}
        </div>
    );
}

export default React.memo(AvailabilityManager);
