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
import { createNABLDocument, getNABLDocuments } from '@/lib/api';
import { toast } from 'sonner';
import { Plus, FileCheck } from 'lucide-react';

export default function NABLDocuments() {
  const [documents, setDocuments] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedType, setSelectedType] = useState('');
  const [formData, setFormData] = useState({
    document_type: 'SOP',
    document_id: '',
    title: '',
    version: '1.0'
  });

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async (type = null) => {
    try {
      const response = await getNABLDocuments(type);
      setDocuments(response.data);
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createNABLDocument(formData);
      toast.success('NABL document created successfully!');
      setDialogOpen(false);
      setFormData({
        document_type: 'SOP',
        document_id: '',
        title: '',
        version: '1.0'
      });
      fetchDocuments(selectedType || null);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create document');
    } finally {
      setLoading(false);
    }
  };

  const handleTypeFilter = (type) => {
    setSelectedType(type);
    fetchDocuments(type || null);
  };

  return (
    <Sidebar>
      <div data-testid="nabl-documents-page">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-slate-900" style={{ fontFamily: 'Manrope' }}>
              NABL Documents
            </h1>
            <p className="text-slate-600 mt-2">ISO 15189:2022 Documentation & Compliance</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="add-nabl-document-button" className="bg-slate-900 hover:bg-slate-800">
                <Plus className="h-4 w-4 mr-2" />
                Add Document
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create NABL Document</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="document_type">Document Type *</Label>
                  <Select
                    value={formData.document_type}
                    onValueChange={(value) => setFormData({ ...formData, document_type: value })}
                  >
                    <SelectTrigger data-testid="nabl-doc-type-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SOP">SOP (Standard Operating Procedure)</SelectItem>
                      <SelectItem value="NCR">NCR (Non-Conformity Report)</SelectItem>
                      <SelectItem value="CAPA">CAPA (Corrective & Preventive Action)</SelectItem>
                      <SelectItem value="Training">Training Records</SelectItem>
                      <SelectItem value="Audit">Audit Reports</SelectItem>
                      <SelectItem value="MRM">MRM (Management Review Meeting)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="document_id">Document ID *</Label>
                    <Input
                      id="document_id"
                      value={formData.document_id}
                      onChange={(e) => setFormData({ ...formData, document_id: e.target.value })}
                      required
                      placeholder="e.g., SOP-001"
                      data-testid="nabl-doc-id-input"
                    />
                  </div>
                  <div>
                    <Label htmlFor="version">Version *</Label>
                    <Input
                      id="version"
                      value={formData.version}
                      onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                      required
                      placeholder="e.g., 1.0"
                      data-testid="nabl-doc-version-input"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="title">Document Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    placeholder="e.g., Sample Collection Procedure"
                    data-testid="nabl-doc-title-input"
                  />
                </div>

                <Button type="submit" disabled={loading} className="w-full" data-testid="nabl-doc-submit-button">
                  {loading ? 'Creating...' : 'Create Document'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex gap-2 mb-6">
          <Button
            variant={selectedType === '' ? 'default' : 'outline'}
            onClick={() => handleTypeFilter('')}
          >
            All
          </Button>
          <Button
            variant={selectedType === 'SOP' ? 'default' : 'outline'}
            onClick={() => handleTypeFilter('SOP')}
          >
            SOPs
          </Button>
          <Button
            variant={selectedType === 'NCR' ? 'default' : 'outline'}
            onClick={() => handleTypeFilter('NCR')}
          >
            NCRs
          </Button>
          <Button
            variant={selectedType === 'CAPA' ? 'default' : 'outline'}
            onClick={() => handleTypeFilter('CAPA')}
          >
            CAPAs
          </Button>
          <Button
            variant={selectedType === 'Audit' ? 'default' : 'outline'}
            onClick={() => handleTypeFilter('Audit')}
          >
            Audits
          </Button>
        </div>

        <Card className="border-slate-200 mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-green-600" />
              NABL ISO 15189:2022 Requirements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="p-4 bg-slate-50 rounded-lg">
                <h3 className="font-semibold mb-2">Mandatory Documentation:</h3>
                <ul className="list-disc list-inside space-y-1 text-slate-600">
                  <li>Standard Operating Procedures (SOPs)</li>
                  <li>Quality Manual</li>
                  <li>Equipment Maintenance Records</li>
                  <li>Staff Competency & Training Logs</li>
                </ul>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg">
                <h3 className="font-semibold mb-2">Quality Management:</h3>
                <ul className="list-disc list-inside space-y-1 text-slate-600">
                  <li>Internal Quality Control Records</li>
                  <li>External Quality Assurance (EQAS)</li>
                  <li>Non-Conformity Reports (NCR)</li>
                  <li>Corrective & Preventive Actions (CAPA)</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle>Document Register</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document ID</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-slate-500 py-8">
                      No documents found
                    </TableCell>
                  </TableRow>
                ) : (
                  documents.map((doc) => (
                    <TableRow key={doc.id} data-testid={`nabl-doc-row-${doc.document_id}`}>
                      <TableCell className="font-mono text-sm font-semibold">{doc.document_id}</TableCell>
                      <TableCell>
                        <Badge className="bg-sky-100 text-sky-800">{doc.document_type}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">{doc.title}</TableCell>
                      <TableCell className="font-mono text-sm">{doc.version}</TableCell>
                      <TableCell>
                        <Badge
                          className={
                            doc.status === 'approved'
                              ? 'bg-green-100 text-green-800'
                              : doc.status === 'draft'
                              ? 'bg-slate-100 text-slate-800'
                              : 'bg-amber-100 text-amber-800'
                          }
                        >
                          {doc.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {new Date(doc.created_at).toLocaleDateString()}
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