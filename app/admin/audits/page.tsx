'use client';

import React, { useEffect, useState, Suspense } from "react";
import { FileText, Clock, Search, History } from "lucide-react";
import toast from "react-hot-toast";
import { adminService } from '@/lib/integrations';
import { useAuthStore } from '@/stores/authStore';
import { 
  PageHeader, 
  Table, 
  Badge, 
  Card 
} from '@/components/admin';
import type { AuditLog } from '@/lib/integrations';

function AuditsList() {
  const { isAuthenticated } = useAuthStore();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (isAuthenticated) {
      fetchLogs();
    }
  }, [isAuthenticated]);

  const fetchLogs = async () => {
    try {
      const data = await adminService.getAuditsClient();
      setLogs(data);
    } catch (err: any) {
      console.error("Failed to fetch logs", err);
      // Don't show toast error for 404/not found as this feature might be truly "coming soon" on backend too
      // However, if the endpoint exists but it's empty, we handle that.
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter((log) => {
    const query = searchQuery.toLowerCase();
    return (
      (log.action?.toLowerCase() || "").includes(query) ||
      (log.user?.name?.toLowerCase() || "").includes(query) ||
      (log.details?.toLowerCase() || "").includes(query)
    );
  });

  const headers = ["Timestamp", "Action", "User", "Details"];

  if (loading) return <div className="p-8 text-center" style={{ color: 'var(--text-color)' }}>Loading logs...</div>;

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader
        title="Audit Logs"
        subtitle="Complete history of system activities and administrative actions"
        icon={<History className="text-yellow-500" />}
      />

      <div className="mb-6 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search logs by action, user or details..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full border rounded-xl pl-10 pr-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
            style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-color)', borderColor: 'var(--border-color)' }}
          />
      </div>

      {filteredLogs.length > 0 ? (
        <Table headers={headers} responsive>
          {filteredLogs.map((log, index) => (
            <tr key={log._id || index} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
              <td className="px-6 py-4 whitespace-nowrap text-sm opacity-70">
                {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A'}
              </td>
              <td className="px-6 py-4">
                <Badge variant="info">{log.action || 'Unknown Action'}</Badge>
              </td>
              <td className="px-6 py-4">
                <div className="text-sm font-medium">{log.user?.name || 'Unknown User'}</div>
                <div className="text-[10px] opacity-50">{log.user?.role?.toUpperCase() || "N/A"}</div>
              </td>
              <td className="px-6 py-4">
                <p className="text-sm max-w-md line-clamp-2" title={log.details || ''}>
                  {log.details || 'No details provided'}
                </p>
              </td>
            </tr>
          ))}
        </Table>
      ) : logs.length > 0 ? (
        <Card className="p-16 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-500/10 mb-6">
            <Search size={40} className="text-blue-500" />
          </div>
          <h2 className="text-2xl font-bold mb-2">No Matching Logs</h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
            Try adjusting your search query to find the activity you're looking for.
          </p>
        </Card>
      ) : (
        <Card className="p-16 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-500/10 mb-6">
            <History size={40} className="text-blue-500" />
          </div>
          <h2 className="text-2xl font-bold mb-2">No Audit Logs Yet</h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
            System activity will appear here once administrators start performing actions.
          </p>
        </Card>
      )}
    </div>
  );
}

function AuditsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500">Loading Audits...</div>}>
      <AuditsList />
    </Suspense>
  );
}

export default React.memo(AuditsPage);
