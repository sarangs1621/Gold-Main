import React, { useState, useEffect } from 'react';
import { API } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { History } from 'lucide-react';
import Pagination from '../components/Pagination';
import { useURLPagination } from '../hooks/useURLPagination';
import { formatDateTime } from '../utils/dateTimeUtils';

export default function AuditLogsPage() {
  const { currentPage, setPage, pagination, setPagination } = useURLPagination();
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    loadLogs();
  }, [currentPage]);

  const loadLogs = async () => {
    try {
      const response = await API.get(`/api/audit-logs`, {
        params: { page: currentPage, page_size: 10 }
      });
      setLogs(Array.isArray(response.data.items) ? response.data.items : []);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Failed to load audit logs:', error);
      setLogs([]);
    }
  };

  return (
    <div data-testid="audit-logs-page">
      <div className="mb-8">
        <h1 className="text-4xl font-serif font-semibold text-gray-900 mb-2">Audit Logs</h1>
        <p className="text-muted-foreground">Track all system activities and changes</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-serif flex items-center gap-2">
            <History className="w-5 h-5" />
            Activity Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full" data-testid="audit-logs-table">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Timestamp</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase">User</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Module</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Action</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Record ID</th>
                </tr>
              </thead>
              <tbody>
                {Array.isArray(logs) && logs.map((log) => (
                  <tr key={log.id} className="border-t hover:bg-muted/30">
                    <td className="px-4 py-3 text-sm font-mono">
                      {formatDateTime(log.timestamp)}
                    </td>
                    <td className="px-4 py-3 text-sm">{log.user_name}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        {log.module}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm capitalize">{log.action}</td>
                    <td className="px-4 py-3 text-sm font-mono">{log.record_id ? log.record_id.slice(0, 8) : 'N/A'}...</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {logs.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No audit logs found</p>
              </div>
            )}
          </div>
        </CardContent>
        {pagination && <Pagination pagination={pagination} onPageChange={setPage} />}
      </Card>
    </div>
  );
}
