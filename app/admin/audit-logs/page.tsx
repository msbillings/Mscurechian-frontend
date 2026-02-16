"use client";

import React from "react";
import { FileText, Clock, Sparkles } from "lucide-react";

function AuditLogs() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2 text-gray-900 dark:text-white">
        <FileText className="text-yellow-500" /> Audit Logs
      </h1>

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-800">
        {/* Coming Soon Message */}
        <div className="p-16 text-center">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-linear-to-br from-blue-500/20 to-purple-500/20 mb-6">
            <Sparkles size={48} className="text-blue-500 dark:text-blue-400" />
          </div>
          
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
            Coming Soon
          </h2>
          
          <p className="text-gray-600 dark:text-gray-400 text-lg mb-6 max-w-md mx-auto">
            We're building an advanced audit logging system to track all administrative actions and system events.
          </p>

          <div className="inline-flex items-center gap-2 px-6 py-3 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg border border-blue-500/20">
            <Clock size={18} />
            <span className="font-medium">Feature Under Development</span>
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
            <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center mb-3 mx-auto">
                <FileText size={20} className="text-blue-500" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Action Tracking</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Monitor all admin activities</p>
            </div>
            
            <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700">
              <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center mb-3 mx-auto">
                <Clock size={20} className="text-purple-500" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Time Stamps</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Precise activity timeline</p>
            </div>
            
            <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700">
              <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center mb-3 mx-auto">
                <Sparkles size={20} className="text-green-500" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Detailed Logs</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Comprehensive event details</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default React.memo(AuditLogs);
