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
import { createQCEntry, getQCEntries } from '@/lib/api';
import { toast } from 'sonner';
import { Plus, CheckCircle, XCircle } from 'lucide-react';

export default function QualityControl() {
  const [qcEntries, setQcEntries] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    test_name: '',
    qc_type: 'internal',
    level: 'Level 1',
    lot_number: '',
    parameter: '',
    target_value: '',
    measured_value: ''
  });

  useEffect(() => {
    fetchQCEntries();
  }, []);

  const fetchQCEntries = async () => {
    try {
      const response = await getQCEntries({});
      setQcEntries(response.data);
    } catch (error) {
      console.error('Failed to fetch QC entries:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createQCEntry({
        ...formData,
        target_value: parseFloat(formData.target_value),
        measured_value: parseFloat(formData.measured_value)
      });
      toast.success('QC entry recorded successfully!');
      setDialogOpen(false);
      setFormData({
        test_name: '',
        qc_type: 'internal',
        level: 'Level 1',
        lot_number: '',
        parameter: '',
        target_value: '',
        measured_value: ''
      });
      fetchQCEntries();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create QC entry');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sidebar>
      <div data-testid="qc-page">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-slate-900" style={{ fontFamily: 'Manrope' }}>
              Quality Control
            </h1>
            <p className="text-slate-600 mt-2">Internal & External QC tracking (NABL Requirement)</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="add-qc-entry-button" className="bg-slate-900 hover:bg-slate-800">
                <Plus className="h-4 w-4 mr-2" />
                Add QC Entry
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Record QC Entry</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="test_name">Test Name *</Label>
                    <Input
                      id="test_name"
                      value={formData.test_name}
                      onChange={(e) => setFormData({ ...formData, test_name: e.target.value })}
                      required
                      data-testid="qc-test-name-input"
                    />
                  </div>
                  <div>
                    <Label htmlFor="qc_type">QC Type *</Label>
                    <Select value={formData.qc_type} onValueChange={(value) => setFormData({ ...formData, qc_type: value })}>
                      <SelectTrigger data-testid="qc-type-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="internal">Internal QC (IQC)</SelectItem>
                        <SelectItem value="external">External QC (EQAS)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="level">Level *</Label>
                    <Select value={formData.level} onValueChange={(value) => setFormData({ ...formData, level: value })}>
                      <SelectTrigger data-testid="qc-level-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Level 1">Level 1</SelectItem>
                        <SelectItem value="Level 2">Level 2</SelectItem>
                        <SelectItem value="Level 3">Level 3</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="lot_number">Lot Number *</Label>
                    <Input
                      id="lot_number"
                      value={formData.lot_number}
                      onChange={(e) => setFormData({ ...formData, lot_number: e.target.value })}
                      required
                      data-testid="qc-lot-input"
                    />
                  </div>
                  <div>
                    <Label htmlFor="parameter">Parameter *</Label>
                    <Input
                      id="parameter"
                      value={formData.parameter}
                      onChange={(e) => setFormData({ ...formData, parameter: e.target.value })}
                      required
                      data-testid="qc-parameter-input"
                    />
                  </div>
                  <div>
                    <Label htmlFor="target_value">Target Value *</Label>
                    <Input
                      id="target_value"
                      type="number"
                      step="0.01"
                      value={formData.target_value}
                      onChange={(e) => setFormData({ ...formData, target_value: e.target.value })}
                      required
                      data-testid="qc-target-input"
                    />
                  </div>
                  <div>
                    <Label htmlFor="measured_value">Measured Value *</Label>
                    <Input
                      id="measured_value"
                      type="number"
                      step="0.01"
                      value={formData.measured_value}
                      onChange={(e) => setFormData({ ...formData, measured_value: e.target.value })}
                      required
                      data-testid="qc-measured-input"
                    />
                  </div>
                </div>
                <Button type="submit" disabled={loading} className="w-full" data-testid="qc-submit-button">
                  {loading ? 'Recording...' : 'Record QC Entry'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle>QC Records</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Test Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Lot Number</TableHead>
                  <TableHead>Parameter</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Measured</TableHead>
                  <TableHead>Deviation</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {qcEntries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-slate-500 py-8">
                      No QC entries found
                    </TableCell>
                  </TableRow>
                ) : (
                  qcEntries.map((entry) => (
                    <TableRow key={entry.id} data-testid={`qc-row-${entry.id}`}>
                      <TableCell className="text-sm">
                        {new Date(entry.date).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="font-medium">{entry.test_name}</TableCell>
                      <TableCell>
                        <Badge className="bg-slate-100 text-slate-800 uppercase text-xs">
                          {entry.qc_type}
                        </Badge>
                      </TableCell>
                      <TableCell>{entry.level}</TableCell>
                      <TableCell className="font-mono text-sm">{entry.lot_number}</TableCell>
                      <TableCell>{entry.parameter}</TableCell>
                      <TableCell className="tabular-nums">{entry.target_value.toFixed(2)}</TableCell>
                      <TableCell className="tabular-nums font-semibold">{entry.measured_value.toFixed(2)}</TableCell>
                      <TableCell className="tabular-nums">
                        {entry.deviation.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {entry.status === 'pass' ? (
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            PASS
                          </Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-800">
                            <XCircle className="h-3 w-3 mr-1" />
                            FAIL
                          </Badge>
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