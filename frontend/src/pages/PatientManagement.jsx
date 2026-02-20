import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { createPatient, getPatients } from '@/lib/api';
import { toast } from 'sonner';
import { Plus, Search } from 'lucide-react';

export default function PatientManagement() {
  const [patients, setPatients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    gender: 'male',
    phone: '',
    email: '',
    address: '',
    patient_type: 'OPD'
  });

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async (search = '') => {
    try {
      const response = await getPatients(search);
      setPatients(response.data);
    } catch (error) {
      console.error('Failed to fetch patients:', error);
    }
  };

  const handleSearch = () => {
    fetchPatients(searchTerm);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createPatient({ ...formData, age: parseInt(formData.age) });
      toast.success('Patient registered successfully!');
      setDialogOpen(false);
      setFormData({
        name: '',
        age: '',
        gender: 'male',
        phone: '',
        email: '',
        address: '',
        patient_type: 'OPD'
      });
      fetchPatients();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to register patient');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sidebar>
      <div data-testid="patient-management-page">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-slate-900" style={{ fontFamily: 'Manrope' }}>
              Patient Management
            </h1>
            <p className="text-slate-600 mt-2">Register and manage patient records</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="add-patient-button" className="bg-slate-900 hover:bg-slate-800">
                <Plus className="h-4 w-4 mr-2" />
                Register Patient
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Register New Patient</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      data-testid="patient-name-input"
                    />
                  </div>
                  <div>
                    <Label htmlFor="age">Age *</Label>
                    <Input
                      id="age"
                      type="number"
                      value={formData.age}
                      onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                      required
                      data-testid="patient-age-input"
                    />
                  </div>
                  <div>
                    <Label htmlFor="gender">Gender *</Label>
                    <Select value={formData.gender} onValueChange={(value) => setFormData({ ...formData, gender: value })}>
                      <SelectTrigger data-testid="patient-gender-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone *</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      required
                      data-testid="patient-phone-input"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      data-testid="patient-email-input"
                    />
                  </div>
                  <div>
                    <Label htmlFor="patient_type">Patient Type *</Label>
                    <Select value={formData.patient_type} onValueChange={(value) => setFormData({ ...formData, patient_type: value })}>
                      <SelectTrigger data-testid="patient-type-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="OPD">OPD</SelectItem>
                        <SelectItem value="IPD">IPD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    data-testid="patient-address-input"
                  />
                </div>
                <Button type="submit" disabled={loading} className="w-full" data-testid="patient-submit-button">
                  {loading ? 'Registering...' : 'Register Patient'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="border-slate-200 mb-6">
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search by name, UHID, or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-10"
                  data-testid="patient-search-input"
                />
              </div>
              <Button onClick={handleSearch} data-testid="patient-search-button">
                Search
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle>Registered Patients</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>UHID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Age/Gender</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Registered On</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {patients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-slate-500 py-8">
                      No patients found
                    </TableCell>
                  </TableRow>
                ) : (
                  patients.map((patient) => (
                    <TableRow key={patient.id} data-testid={`patient-row-${patient.uhid}`}>
                      <TableCell className="font-mono text-sm font-semibold">{patient.uhid}</TableCell>
                      <TableCell className="font-medium">{patient.name}</TableCell>
                      <TableCell>{patient.age}Y / {patient.gender}</TableCell>
                      <TableCell>{patient.phone}</TableCell>
                      <TableCell>
                        <span className="px-2 py-1 bg-sky-100 text-sky-800 text-xs rounded-full">
                          {patient.patient_type}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {new Date(patient.created_at).toLocaleDateString()}
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