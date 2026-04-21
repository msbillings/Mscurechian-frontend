"use client";

import React from "react";
import { useAuthStore } from "@/stores/authStore";

export default function MasterHelpdeskDashboard() {
  const { user } = useAuthStore();

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 flex flex-col justify-center items-center h-screen bg-gray-50">
      <div className="bg-white p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 text-center border overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
        <h1 className="text-4xl font-extrabold text-gray-800 mb-4 font-sans tracking-tight">
          Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Master Helpdesk</span>
        </h1>
        <p className="text-gray-500 text-lg mb-8 font-medium">this is msater helpdesk portal</p>
        
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-100/50 shadow-inner">
          <p className="text-sm uppercase tracking-wider text-blue-800 font-semibold mb-2">Logged in User</p>
          <p className="text-xl text-gray-700 font-bold">{user?.name || "Loading..."}</p>
          <div className="mt-3 flex items-center justify-center gap-2">
            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold uppercase tracking-wide">Active</span>
            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold uppercase tracking-wide">{user?.role || "masterhelpdesk"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
