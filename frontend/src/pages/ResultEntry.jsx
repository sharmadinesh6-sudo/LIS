import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { createResult, getResults, getSamples, updateResult, downloadReport } from '@/lib/api';
import { toast } from 'sonner';
import { Plus, AlertCircle, FileText, Download } from 'lucide-react';

export default function ResultEntry() {
  const [results, setResults] = useState([]);
  const [samples, setSamples] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedSample, setSelectedSample] = useState(null);
  const [parameters, setParameters] = useState([]);

  useEffect(() => {
    fetchResults();
    fetchApprovedSamples();
  }, []);

  const fetchResults = async () => {
    try {
      const response = await getResults({});
      setResults(response.data);
    } catch (error) {
      console.error('Failed to fetch results:', error);
    }
  };

  const fetchApprovedSamples = async () => {
    try {
      const response = await getSamples();
      const approvedSamples = response.data.filter(s => ['approved', 'under_validation'].includes(s.status));
      setSamples(approvedSamples);
    } catch (error) {
      console.error('Failed to fetch samples:', error);
    }
  };

  const handleSampleSelect = (sampleId) => {
    const sample = samples.find(s => s.id === sampleId);
    setSelectedSample(sample);
    // Create parameters from sample tests
    const params = [];
    sample?.tests.forEach(test => {
      // Create sample parameters
      params.push({
        parameter_name: `${test.test_name} - Result`,
        value: '',
        unit: '',
        ref_range: '',
        status: 'normal'
      });
    });
    setParameters(params);
  };

  const updateParameter = (index, field, value) => {
    const updated = [...parameters];
    updated[index][field] = value;

    // Auto-detect status based on value
    if (field === 'value' && updated[index].value) {
      const numValue = parseFloat(value);
      if (!isNaN(numValue)) {
        // Simple logic - can be enhanced
        if (numValue > 100) updated[index].status = 'high';
        else if (numValue < 10) updated[index].status = 'low';
        else updated[index].status = 'normal';
      }
    }

    setParameters(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSample) {
      toast.error('Please select a sample');
      return;
    }

    setLoading(true);
    try {
      const hasCritical = parameters.some(p => p.status === 'critical');

      await createResult({
        sample_id: selectedSample.id,
        patient_id: selectedSample.patient_id,
        test_name: selectedSample.tests.map(t => t.test_name).join(', '),
        parameters: parameters,
        interpretation: ''
      });

      toast.success(hasCritical ? 'Result entered with CRITICAL values!' : 'Result entered successfully!');
      setDialogOpen(false);
      setSelectedSample(null);
      setParameters([]);
      fetchResults();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create result');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (resultId, status) => {
    try {
      await updateResult(resultId, { status });
      toast.success('Result status updated');
      fetchResults();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const getValueColor = (status) => {
    switch (status) {
      case 'critical': return 'text-red-600 font-bold animate-pulse-critical';
      case 'high': return 'text-red-600 font-semibold';
      case 'low': return 'text-blue-600 font-semibold';
      default: return 'text-black';
    }
  };

  const getStatusBadge = (status) => {
    const config = {
      draft: 'bg-slate-100 text-slate-800',
      under_review: 'bg-blue-100 text-blue-800',
      approved: 'bg-green-100 text-green-800',
      finalized: 'bg-slate-900 text-white'
    };
    return <Badge className={config[status] || config.draft}>{status.replace('_', ' ')}</Badge>;
  };

  return (
    <Sidebar>
      <div data-testid="result-entry-page">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-slate-900" style={{ fontFamily: 'Manrope' }}>
              Result Entry
            </h1>
            <p className="text-slate-600 mt-2">Enter and validate test results</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="enter-result-button" className="bg-slate-900 hover:bg-slate-800">
                <Plus className="h-4 w-4 mr-2" />
                Enter Result
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Enter Test Results</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <Label htmlFor="sample">Sample *</Label>
                  <Select onValueChange={handleSampleSelect}>
                    <SelectTrigger data-testid="result-sample-select">
                      <SelectValue placeholder="Select sample" />
                    </SelectTrigger>
                    <SelectContent>
                      {samples.map(sample => (
                        <SelectItem key={sample.id} value={sample.id}>
                          {sample.sample_id} - {sample.patient_name} - {sample.tests.map(t => t.test_name).join(', ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedSample && (
                  <Card className="bg-slate-50">
                    <CardContent className="pt-4">
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="font-semibold">Patient:</span> {selectedSample.patient_name}
                        </div>
                        <div>
                          <span className="font-semibold">UHID:</span> {selectedSample.uhid}
                        </div>
                        <div>
                          <span className="font-semibold">Sample Type:</span> {selectedSample.sample_type}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {parameters.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Parameters</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {parameters.map((param, index) => (
                        <div key={index} className="grid grid-cols-5 gap-3 items-end">
                          <div>
                            <Label>Parameter</Label>
                            <Input value={param.parameter_name} disabled />
                          </div>
                          <div>
                            <Label>Value *</Label>
                            <Input
                              value={param.value}
                              onChange={(e) => updateParameter(index, 'value', e.target.value)}
                              required
                            />
                          </div>
                          <div>
                            <Label>Unit *</Label>
                            <Input
                              value={param.unit}
                              onChange={(e) => updateParameter(index, 'unit', e.target.value)}
                              required
                            />
                          </div>
                          <div>
                            <Label>Ref Range *</Label>
                            <Input
                              value={param.ref_range}
                              onChange={(e) => updateParameter(index, 'ref_range', e.target.value)}
                              required
                              placeholder="e.g., 10-50"
                            />
                          </div>
                          <div>
                            <Label>Status</Label>
                            <Select
                              value={param.status}
                              onValueChange={(value) => updateParameter(index, 'status', value)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="normal">Normal</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                                <SelectItem value="low">Low</SelectItem>
                                <SelectItem value="critical">Critical</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                <Button type="submit" disabled={loading} className="w-full" data-testid="result-submit-button">
                  {loading ? 'Saving...' : 'Save & Verify Result'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900">NABL Critical Value Protocol</h3>
              <p className="text-sm text-red-700 mt-1">
                Critical values must be immediately reported to the ordering physician and documented in the audit trail.
                Values marked as CRITICAL will flash and require acknowledgment.
              </p>
            </div>
          </div>
        </div>

        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Test Name</TableHead>
                  <TableHead>Parameters</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Has Critical</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-slate-500 py-8">
                      No results found
                    </TableCell>
                  </TableRow>
                ) : (
                  results.map((result) => (
                    <TableRow key={result.id} data-testid={`result-row-${result.id}`}>
                      <TableCell className="font-medium">{result.patient_id}</TableCell>
                      <TableCell>{result.test_name}</TableCell>
                      <TableCell>
                        <div className="space-y-1 text-sm">
                          {result.parameters.map((param, idx) => (
                            <div key={idx} className={getValueColor(param.status)}>
                              {param.parameter_name}: <span className="font-semibold">{param.value}</span> {param.unit}
                            </div>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(result.status)}</TableCell>
                      <TableCell>
                        {result.has_critical_values && (
                          <Badge className="bg-red-100 text-red-800 animate-pulse">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            CRITICAL
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {new Date(result.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {result.status !== 'finalized' && (
                          <Select
                            value={result.status}
                            onValueChange={(value) => handleStatusUpdate(result.id, value)}
                          >
                            <SelectTrigger className="w-36">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="draft">Draft</SelectItem>
                              <SelectItem value="under_review">Under Review</SelectItem>
                              <SelectItem value="approved">Approved</SelectItem>
                              <SelectItem value="finalized">Finalized</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
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