import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { createSample, getSamples, getPatients, getTests, updateSampleStatus, rejectSample } from '@/lib/api';
import { toast } from 'sonner';
import { Plus, AlertCircle, Clock, CheckCircle, XCircle, Activity } from 'lucide-react';

export default function SampleManagement() {
  const [samples, setSamples] = useState([]);
  const [patients, setPatients] = useState([]);
  const [tests, setTests] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [formData, setFormData] = useState({
    patient_id: '',
    sample_type: 'Serum',
    selected_tests: []
  });

  useEffect(() => {
    fetchSamples();
    fetchPatients();
    fetchTests();
  }, []);

  const fetchSamples = async (status = null) => {
    try {
      const response = await getSamples(status);
      setSamples(response.data);
    } catch (error) {
      console.error('Failed to fetch samples:', error);
    }
  };

  const fetchPatients = async () => {
    try {
      const response = await getPatients();
      setPatients(response.data);
    } catch (error) {
      console.error('Failed to fetch patients:', error);
    }
  };

  const fetchTests = async () => {
    try {
      const response = await getTests();
      setTests(response.data);
    } catch (error) {
      console.error('Failed to fetch tests:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.selected_tests.length === 0) {
      toast.error('Please select at least one test');
      return;
    }
    setLoading(true);
    try {
      const testItems = formData.selected_tests.map(testId => {
        const test = tests.find(t => t.id === testId);
        return {
          test_id: test.id,
          test_name: test.test_name,
          price: test.price,
          tat_hours: test.tat_hours
        };
      });

      await createSample({
        patient_id: formData.patient_id,
        sample_type: formData.sample_type,
        tests: testItems
      });

      toast.success('Sample collected successfully!');
      setDialogOpen(false);
      setFormData({ patient_id: '', sample_type: 'Serum', selected_tests: [] });
      fetchSamples();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create sample');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (sampleId, newStatus) => {
    try {
      await updateSampleStatus(sampleId, newStatus);
      toast.success('Sample status updated');
      fetchSamples(selectedStatus || null);
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleStatusFilter = (status) => {
    setSelectedStatus(status);
    fetchSamples(status || null);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      collected: { color: 'bg-slate-100 text-slate-800', icon: Clock },
      received: { color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
      processing: { color: 'bg-amber-100 text-amber-800', icon: Clock },
      on_machine: { color: 'bg-purple-100 text-purple-800', icon: Activity },
      under_validation: { color: 'bg-sky-100 text-sky-800', icon: AlertCircle },
      approved: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      rejected: { color: 'bg-red-100 text-red-800', icon: XCircle },
    };

    const config = statusConfig[status] || statusConfig.collected;
    const Icon = config.icon;

    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {status?.replace('_', ' ')}
      </Badge>
    );
  };

  const isTATBreached = (deadline) => {
    return new Date(deadline) < new Date();
  };

  return (
    <Sidebar>
      <div data-testid="sample-management-page">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-slate-900" style={{ fontFamily: 'Manrope' }}>
              Sample Management
            </h1>
            <p className="text-slate-600 mt-2">Track and manage laboratory samples</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="collect-sample-button" className="bg-slate-900 hover:bg-slate-800">
                <Plus className="h-4 w-4 mr-2" />
                Collect Sample
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Collect New Sample</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="patient">Patient *</Label>
                  <Select value={formData.patient_id} onValueChange={(value) => setFormData({ ...formData, patient_id: value })}>
                    <SelectTrigger data-testid="sample-patient-select">
                      <SelectValue placeholder="Select patient" />
                    </SelectTrigger>
                    <SelectContent>
                      {patients.map(patient => (
                        <SelectItem key={patient.id} value={patient.id}>
                          {patient.uhid} - {patient.name} ({patient.age}Y/{patient.gender})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="sample_type">Sample Type *</Label>
                  <Select value={formData.sample_type} onValueChange={(value) => setFormData({ ...formData, sample_type: value })}>
                    <SelectTrigger data-testid="sample-type-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Serum">Serum</SelectItem>
                      <SelectItem value="Plasma">Plasma</SelectItem>
                      <SelectItem value="EDTA">EDTA</SelectItem>
                      <SelectItem value="Urine">Urine</SelectItem>
                      <SelectItem value="Stool">Stool</SelectItem>
                      <SelectItem value="CSF">CSF</SelectItem>
                      <SelectItem value="Blood">Whole Blood</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Select Tests *</Label>
                  <div className="border border-slate-200 rounded-md p-4 max-h-60 overflow-y-auto space-y-2">
                    {tests.map(test => (
                      <label key={test.id} className="flex items-center space-x-2 p-2 hover:bg-slate-50 rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.selected_tests.includes(test.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({ ...formData, selected_tests: [...formData.selected_tests, test.id] });
                            } else {
                              setFormData({ ...formData, selected_tests: formData.selected_tests.filter(id => id !== test.id) });
                            }
                          }}
                          className="rounded"
                        />
                        <span className="flex-1">{test.test_name} - ₹{test.price}</span>
                        <span className="text-xs text-slate-500">TAT: {test.tat_hours}h</span>
                      </label>
                    ))}
                  </div>
                </div>

                <Button type="submit" disabled={loading} className="w-full" data-testid="sample-submit-button">
                  {loading ? 'Collecting...' : 'Collect Sample'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex gap-2 mb-6">
          <Button
            variant={selectedStatus === '' ? 'default' : 'outline'}
            onClick={() => handleStatusFilter('')}
            data-testid="filter-all-button"
          >
            All
          </Button>
          <Button
            variant={selectedStatus === 'collected' ? 'default' : 'outline'}
            onClick={() => handleStatusFilter('collected')}
          >
            Collected
          </Button>
          <Button
            variant={selectedStatus === 'processing' ? 'default' : 'outline'}
            onClick={() => handleStatusFilter('processing')}
          >
            Processing
          </Button>
          <Button
            variant={selectedStatus === 'under_validation' ? 'default' : 'outline'}
            onClick={() => handleStatusFilter('under_validation')}
          >
            Under Validation
          </Button>
          <Button
            variant={selectedStatus === 'approved' ? 'default' : 'outline'}
            onClick={() => handleStatusFilter('approved')}
          >
            Approved
          </Button>
        </div>

        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle>Sample Tracking</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sample ID</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>UHID</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Tests</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>TAT Deadline</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {samples.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-slate-500 py-8">
                      No samples found
                    </TableCell>
                  </TableRow>
                ) : (
                  samples.map((sample) => (
                    <TableRow key={sample.id} data-testid={`sample-row-${sample.sample_id}`}>
                      <TableCell className="font-mono text-sm font-semibold">{sample.sample_id}</TableCell>
                      <TableCell className="font-medium">{sample.patient_name}</TableCell>
                      <TableCell className="font-mono text-sm">{sample.uhid}</TableCell>
                      <TableCell>{sample.sample_type}</TableCell>
                      <TableCell className="text-sm">
                        {sample.tests.map(t => t.test_name).join(', ')}
                      </TableCell>
                      <TableCell>{getStatusBadge(sample.status)}</TableCell>
                      <TableCell>
                        <div className={isTATBreached(sample.tat_deadline) && sample.status !== 'approved' ? 'text-red-600 font-semibold' : ''}>
                          {new Date(sample.tat_deadline).toLocaleString()}
                          {isTATBreached(sample.tat_deadline) && sample.status !== 'approved' && (
                            <div className="text-xs text-red-600">BREACHED</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={sample.status}
                          onValueChange={(value) => handleStatusUpdate(sample.id, value)}
                        >
                          <SelectTrigger className="w-40" data-testid={`sample-status-select-${sample.sample_id}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="collected">Collected</SelectItem>
                            <SelectItem value="received">Received</SelectItem>
                            <SelectItem value="processing">Processing</SelectItem>
                            <SelectItem value="on_machine">On Machine</SelectItem>
                            <SelectItem value="under_validation">Under Validation</SelectItem>
                            <SelectItem value="approved">Approved</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
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