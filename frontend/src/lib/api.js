import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Patients
export const createPatient = (data) => axios.post(`${API}/patients`, data);
export const getPatients = (search = '') => axios.get(`${API}/patients`, { params: { search } });
export const getPatient = (id) => axios.get(`${API}/patients/${id}`);

// Samples
export const createSample = (data) => axios.post(`${API}/samples`, data);
export const getSamples = (status = null) => axios.get(`${API}/samples`, { params: { status } });
export const getSample = (id) => axios.get(`${API}/samples/${id}`);
export const updateSampleStatus = (id, status) => axios.put(`${API}/samples/${id}/status`, { status });
export const rejectSample = (id, rejection_reason) => axios.post(`${API}/samples/${id}/reject`, { rejection_reason });
export const getSampleBarcode = (id) => axios.get(`${API}/samples/${id}/barcode`);

// Tests
export const createTest = (data) => axios.post(`${API}/tests`, data);
export const getTests = () => axios.get(`${API}/tests`);
export const getTest = (id) => axios.get(`${API}/tests/${id}`);

// Results
export const createResult = (data) => axios.post(`${API}/results`, data);
export const getResults = (params) => axios.get(`${API}/results`, { params });
export const getResult = (id) => axios.get(`${API}/results/${id}`);
export const updateResult = (id, data) => axios.put(`${API}/results/${id}`, data);
export const downloadReport = (id) => axios.get(`${API}/results/${id}/report`, { responseType: 'blob' });

// QC
export const createQCEntry = (data) => axios.post(`${API}/qc`, data);
export const getQCEntries = (params) => axios.get(`${API}/qc`, { params });

// NABL Documents
export const createNABLDocument = (data) => axios.post(`${API}/nabl-documents`, data);
export const getNABLDocuments = (document_type = null) => axios.get(`${API}/nabl-documents`, { params: { document_type } });

// Inventory
export const createInventoryItem = (data) => axios.post(`${API}/inventory`, data);
export const getInventory = () => axios.get(`${API}/inventory`);
export const getInventoryAlerts = () => axios.get(`${API}/inventory/alerts`);

// Audit Logs
export const getAuditLogs = (params) => axios.get(`${API}/audit-logs`, { params });

// Dashboard
export const getDashboardStats = () => axios.get(`${API}/dashboard/stats`);