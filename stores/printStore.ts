import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface PrintState {
    printWithHeader: boolean;
    setPrintWithHeader: (val: boolean) => void;
}

export const usePrintStore = create<PrintState>()(
    persist(
        (set) => ({
            printWithHeader: true,
            setPrintWithHeader: (val) => set({ printWithHeader: val }),
        }),
        {
            name: 'print-settings-storage',
        }
    )
);
