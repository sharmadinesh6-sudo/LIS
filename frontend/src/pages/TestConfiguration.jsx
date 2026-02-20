import React, { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { createTest } from '@/lib/api';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';

export default function TestConfiguration() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    test_code: '',
    test_name: '',
    category: '',
    price: '',
    tat_hours: '',
    sample_type: 'Serum',
    parameters: [{
      parameter_name: '',
      unit: '',
      ref_range_male: '',
      ref_range_female: '',
      ref_range_child: '',
      critical_low: '',
      critical_high: ''
    }]
  });

  const addParameter = () => {
    setFormData({
      ...formData,
      parameters: [...formData.parameters, {
        parameter_name: '',
        unit: '',
        ref_range_male: '',
        ref_range_female: '',
        ref_range_child: '',
        critical_low: '',
        critical_high: ''
      }]
    });
  };

  const removeParameter = (index) => {
    setFormData({
      ...formData,
      parameters: formData.parameters.filter((_, i) => i !== index)
    });
  };

  const updateParameter = (index, field, value) => {
    const updated = [...formData.parameters];
    updated[index][field] = value;
    setFormData({ ...formData, parameters: updated });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...formData,
        price: parseFloat(formData.price),
        tat_hours: parseInt(formData.tat_hours),
        parameters: formData.parameters.map(p => ({
          ...p,
          critical_low: p.critical_low ? parseFloat(p.critical_low) : null,
          critical_high: p.critical_high ? parseFloat(p.critical_high) : null
        }))
      };

      await createTest(payload);
      toast.success('Test configuration created successfully!');
      setDialogOpen(false);
      setFormData({
        test_code: '',
        test_name: '',
        category: '',
        price: '',
        tat_hours: '',
        sample_type: 'Serum',
        parameters: [{
          parameter_name: '',
          unit: '',
          ref_range_male: '',
          ref_range_female: '',
          ref_range_child: '',
          critical_low: '',
          critical_high: ''
        }]
      });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create test');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sidebar>
      <div data-testid="test-configuration-page">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-slate-900" style={{ fontFamily: 'Manrope' }}>
              Test Configuration
            </h1>
            <p className="text-slate-600 mt-2">Configure test panels and parameters</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="add-test-button" className="bg-slate-900 hover:bg-slate-800">
                <Plus className="h-4 w-4 mr-2" />
                Add Test
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Configure New Test</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Test Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="test_code">Test Code *</Label>
                        <Input
                          id="test_code"
                          value={formData.test_code}
                          onChange={(e) => setFormData({ ...formData, test_code: e.target.value })}
                          required
                          data-testid="test-code-input"
                        />
                      </div>
                      <div>
                        <Label htmlFor="test_name">Test Name *</Label>
                        <Input
                          id="test_name"
                          value={formData.test_name}
                          onChange={(e) => setFormData({ ...formData, test_name: e.target.value })}
                          required
                          data-testid="test-name-input"
                        />
                      </div>
                      <div>
                        <Label htmlFor="category">Category *</Label>
                        <Input
                          id="category"
                          value={formData.category}
                          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                          required
                          data-testid="test-category-input"
                        />
                      </div>
                      <div>
                        <Label htmlFor="sample_type">Sample Type *</Label>
                        <Input
                          id="sample_type"
                          value={formData.sample_type}
                          onChange={(e) => setFormData({ ...formData, sample_type: e.target.value })}
                          required
                          data-testid="test-sample-type-input"
                        />
                      </div>
                      <div>
                        <Label htmlFor="price">Price (₹) *</Label>
                        <Input
                          id="price"
                          type="number"
                          step="0.01"
                          value={formData.price}
                          onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                          required
                          data-testid="test-price-input"
                        />
                      </div>
                      <div>
                        <Label htmlFor="tat_hours">TAT (Hours) *</Label>
                        <Input
                          id="tat_hours"
                          type="number"
                          value={formData.tat_hours}
                          onChange={(e) => setFormData({ ...formData, tat_hours: e.target.value })}
                          required
                          data-testid="test-tat-input"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Parameters</CardTitle>
                      <Button type="button" variant="outline" size="sm" onClick={addParameter}>
                        <Plus className="h-4 w-4 mr-1" /> Add Parameter
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {formData.parameters.map((param, index) => (
                      <Card key={index} className="bg-slate-50">
                        <CardContent className="pt-4 space-y-3">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium">Parameter {index + 1}</span>
                            {formData.parameters.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeParameter(index)}
                              >
                                Remove
                              </Button>
                            )}
                          </div>
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <Label>Parameter Name *</Label>
                              <Input
                                value={param.parameter_name}
                                onChange={(e) => updateParameter(index, 'parameter_name', e.target.value)}
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
                              <Label>Ref Range (Male) *</Label>
                              <Input
                                value={param.ref_range_male}
                                onChange={(e) => updateParameter(index, 'ref_range_male', e.target.value)}
                                required
                              />
                            </div>
                            <div>
                              <Label>Ref Range (Female) *</Label>
                              <Input
                                value={param.ref_range_female}
                                onChange={(e) => updateParameter(index, 'ref_range_female', e.target.value)}
                                required
                              />
                            </div>
                            <div>
                              <Label>Ref Range (Child)</Label>
                              <Input
                                value={param.ref_range_child}
                                onChange={(e) => updateParameter(index, 'ref_range_child', e.target.value)}
                              />
                            </div>
                            <div>
                              <Label>Critical Low</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={param.critical_low}
                                onChange={(e) => updateParameter(index, 'critical_low', e.target.value)}
                              />
                            </div>
                            <div>
                              <Label>Critical High</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={param.critical_high}
                                onChange={(e) => updateParameter(index, 'critical_high', e.target.value)}
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </CardContent>
                </Card>

                <Button type="submit" disabled={loading} className="w-full" data-testid="test-submit-button">
                  {loading ? 'Creating...' : 'Create Test Configuration'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle>Test Configuration Guide</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-sm text-slate-600">
              <p>Configure laboratory tests with detailed parameters, reference ranges, and critical values.</p>
              <ul className="list-disc list-inside space-y-2">
                <li><strong>Test Code:</strong> Unique identifier for the test (e.g., CBC001, LFT002)</li>
                <li><strong>Parameters:</strong> Individual measurements within the test</li>
                <li><strong>Reference Ranges:</strong> Normal values by gender and age</li>
                <li><strong>Critical Values:</strong> Thresholds that trigger alerts (NABL requirement)</li>
                <li><strong>TAT:</strong> Turnaround time in hours for test completion</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </Sidebar>
  );
}