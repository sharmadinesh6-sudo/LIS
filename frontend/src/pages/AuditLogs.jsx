import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { getAuditLogs } from '@/lib/api';
import { ScrollText, User, Clock } from 'lucide-react';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [selectedModule, setSelectedModule] = useState('all');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async (module = null) => {
    try {
      const response = await getAuditLogs({ module });
      setLogs(response.data);
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
    }
  };

  const handleModuleFilter = (module) => {
    setSelectedModule(module);
    fetchLogs(module === 'all' ? null : module);
  };

  const getActionBadge = (action) => {
    const config = {
      CREATE: 'bg-green-100 text-green-800',
      UPDATE: 'bg-blue-100 text-blue-800',
      UPDATE_STATUS: 'bg-sky-100 text-sky-800',
      DELETE: 'bg-red-100 text-red-800',
      REJECT: 'bg-red-100 text-red-800',
    };
    return <Badge className={config[action] || 'bg-slate-100 text-slate-800'}>{action}</Badge>;
  };

  return (
    <Sidebar>
      <div data-testid="audit-logs-page">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900" style={{ fontFamily: 'Manrope' }}>
            Audit Trail
          </h1>
          <p className="text-slate-600 mt-2">NABL Mandatory - Complete activity tracking</p>
        </div>

        <Card className="border-slate-200 mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ScrollText className="h-5 w-5 text-sky-600" />
              NABL Audit Trail Compliance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-slate-600 space-y-2">
              <p>
                <strong>ISO 15189:2022 Requirement:</strong> All activities affecting patient results must be
                logged with user ID, timestamp, and action details.
              </p>
              <p>This system automatically records all critical actions in an immutable audit trail.</p>
            </div>
          </CardContent>
        </Card>

        <div className="mb-6">
          <Select value={selectedModule} onValueChange={handleModuleFilter}>
            <SelectTrigger className="w-64" data-testid="audit-module-filter">
              <SelectValue placeholder="Filter by module" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Modules</SelectItem>
              <SelectItem value="patients">Patients</SelectItem>
              <SelectItem value="samples">Samples</SelectItem>
              <SelectItem value="test_results">Test Results</SelectItem>
              <SelectItem value="qc_entries">Quality Control</SelectItem>
              <SelectItem value="nabl_documents">NABL Documents</SelectItem>
              <SelectItem value="inventory">Inventory</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle>Activity Log</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Module</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>IP Address</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-slate-500 py-8">
                      No audit logs found
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id} data-testid={`audit-log-row-${log.id}`}>
                      <TableCell className="text-sm">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-slate-400" />
                          {new Date(log.timestamp).toLocaleString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-slate-400" />
                          <span className="font-medium">{log.user_name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-slate-100 text-slate-800 capitalize">
                          {log.user_role.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>{getActionBadge(log.action)}</TableCell>
                      <TableCell className="capitalize">{log.module.replace('_', ' ')}</TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {JSON.stringify(log.details, null, 2).substring(0, 100)}...
                      </TableCell>
                      <TableCell className="font-mono text-xs text-slate-500">{log.ip_address || 'N/A'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </Sidebar>
  );
}