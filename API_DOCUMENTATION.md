# LIMS API Documentation for EMR Integration
## ABC Hospital Laboratory Information System

---

## Base URL
```
Production: https://nabl-compliance-lab.preview.emergentagent.com/api
```

## Authentication
All API endpoints require Bearer token authentication.

```http
Authorization: Bearer YOUR_ACCESS_TOKEN
```

### Get Access Token
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "emr-integration@hospital.com",
  "password": "your-password"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user": {
    "id": "user-id",
    "email": "emr-integration@hospital.com",
    "name": "EMR Integration",
    "role": "reception"
  }
}
```

---

## 1. Patient Registration API

### Create Patient (from EMR)
**Endpoint:** `POST /api/patients`

**Request Body:**
```json
{
  "name": "John Doe",
  "age": 35,
  "gender": "male",
  "phone": "+91-9876543210",
  "email": "john.doe@email.com",
  "address": "123, Main Street, Panipat",
  "patient_type": "OPD"
}
```

**Response (Success - 200):**
```json
{
  "id": "92ed0e79-26fe-4117-a1c3-d7cd54d9f756",
  "uhid": "UHID000001",
  "name": "John Doe",
  "age": 35,
  "gender": "male",
  "phone": "+91-9876543210",
  "email": "john.doe@email.com",
  "address": "123, Main Street, Panipat",
  "patient_type": "OPD",
  "created_by": "user-id",
  "created_at": "2026-02-21T13:30:00Z"
}
```

**Important:** Save the `uhid` in your EMR for future reference.

---

## 2. Get Patient by UHID

### Fetch Patient Details
**Endpoint:** `GET /api/patients?search={UHID}`

**Example:**
```http
GET /api/patients?search=UHID000001
Authorization: Bearer YOUR_TOKEN
```

**Response:**
```json
[
  {
    "id": "92ed0e79-26fe-4117-a1c3-d7cd54d9f756",
    "uhid": "UHID000001",
    "name": "John Doe",
    "age": 35,
    "gender": "male",
    "phone": "+91-9876543210",
    "email": "john.doe@email.com",
    "patient_type": "OPD",
    "created_at": "2026-02-21T13:30:00Z"
  }
]
```

---

## 3. Doctor Lab Order API

### Create Lab Order (Sample Collection)
**Endpoint:** `POST /api/samples`

**Request Body:**
```json
{
  "patient_id": "92ed0e79-26fe-4117-a1c3-d7cd54d9f756",
  "sample_type": "Blood",
  "tests": [
    {
      "test_id": "test-uuid-1",
      "test_name": "CBC",
      "price": 500.00,
      "tat_hours": 24
    },
    {
      "test_id": "test-uuid-2",
      "test_name": "Lipid Profile",
      "price": 800.00,
      "tat_hours": 24
    }
  ]
}
```

**Response:**
```json
{
  "id": "sample-uuid",
  "sample_id": "SMP00000001",
  "barcode": "000000000001",
  "patient_id": "92ed0e79-26fe-4117-a1c3-d7cd54d9f756",
  "patient_name": "John Doe",
  "uhid": "UHID000001",
  "tests": [
    {
      "test_id": "test-uuid-1",
      "test_name": "CBC",
      "price": 500.00,
      "tat_hours": 24
    }
  ],
  "sample_type": "Blood",
  "collection_date": "2026-02-21T14:00:00Z",
  "status": "collected",
  "tat_deadline": "2026-02-22T14:00:00Z",
  "collected_by": "user-id",
  "is_rejected": false,
  "created_at": "2026-02-21T14:00:00Z"
}
```

---

## 4. Get Available Tests

### List All Tests
**Endpoint:** `GET /api/tests`

**Response:**
```json
[
  {
    "id": "c766f6c0-ab1f-43d3-b716-2af83b9b6627",
    "test_code": "CBC001",
    "test_name": "Complete Blood Count",
    "category": "Hematology",
    "price": 500.00,
    "tat_hours": 24,
    "sample_type": "Blood",
    "parameters": [
      {
        "parameter_name": "Hemoglobin",
        "unit": "g/dL",
        "ref_range_male": "13.0-17.0",
        "ref_range_female": "12.0-15.0",
        "ref_range_child": "11.0-13.0",
        "critical_low": 7.0,
        "critical_high": 20.0
      }
    ],
    "created_at": "2026-02-21T10:00:00Z"
  }
]
```

---

## 5. Check Sample Status

### Get Sample Status
**Endpoint:** `GET /api/samples/{sample_id}`

**Response:**
```json
{
  "id": "sample-uuid",
  "sample_id": "SMP00000001",
  "status": "under_validation",
  "patient_name": "John Doe",
  "uhid": "UHID000001",
  "tests": [...],
  "tat_deadline": "2026-02-22T14:00:00Z"
}
```

**Sample Status Values:**
- `collected` - Sample collected
- `received` - Received in lab
- `processing` - Under processing
- `on_machine` - On analyzer
- `under_validation` - Being validated
- `approved` - Results approved
- `dispatched` - Report sent
- `rejected` - Sample rejected

---

## 6. Get Test Results

### Fetch Results by Patient ID
**Endpoint:** `GET /api/results?patient_id={patient_id}`

**Response:**
```json
[
  {
    "id": "result-uuid",
    "sample_id": "sample-uuid",
    "patient_id": "patient-uuid",
    "test_name": "CBC",
    "parameters": [
      {
        "parameter_name": "Hemoglobin",
        "value": "14.5",
        "unit": "g/dL",
        "ref_range": "13.0-17.0",
        "status": "normal"
      }
    ],
    "status": "finalized",
    "has_critical_values": false,
    "interpretation": "",
    "created_at": "2026-02-21T15:00:00Z"
  }
]
```

---

## 7. Download Report PDF

### Get PDF Report
**Endpoint:** `GET /api/results/{result_id}/report`

**Response:** PDF file download with:
- Hospital letterhead
- QR code for verification
- UHID barcode
- Complete test results with color coding
- Verification hash

---

## EMR Integration Flow

### Scenario 1: Patient Registration
```
EMR → POST /api/patients → LIMS
     ← UHID (Store in EMR)
```

### Scenario 2: Doctor Orders Lab Test
```
1. Doctor orders test in EMR
2. EMR → GET /api/tests (get available tests)
3. EMR → POST /api/samples (create lab order)
4. LIMS ← Sample ID & Barcode
5. Store Sample ID in EMR
```

### Scenario 3: Check Result Status
```
EMR → GET /api/results?patient_id={id}
    ← Results data
If status = "finalized":
    EMR → GET /api/results/{id}/report
        ← PDF Download
```

---

## Sample Integration Code (Python)

```python
import requests

BASE_URL = "https://nabl-compliance-lab.preview.emergentagent.com/api"
TOKEN = "your-access-token"

headers = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json"
}

# 1. Register Patient from EMR
def register_patient(patient_data):
    response = requests.post(
        f"{BASE_URL}/patients",
        headers=headers,
        json=patient_data
    )
    return response.json()

# 2. Create Lab Order
def create_lab_order(patient_id, tests, sample_type="Blood"):
    payload = {
        "patient_id": patient_id,
        "sample_type": sample_type,
        "tests": tests
    }
    response = requests.post(
        f"{BASE_URL}/samples",
        headers=headers,
        json=payload
    )
    return response.json()

# 3. Get Results
def get_patient_results(patient_id):
    response = requests.get(
        f"{BASE_URL}/results",
        headers=headers,
        params={"patient_id": patient_id}
    )
    return response.json()

# Usage Example
patient = register_patient({
    "name": "John Doe",
    "age": 35,
    "gender": "male",
    "phone": "+91-9876543210",
    "patient_type": "OPD"
})

uhid = patient["uhid"]
patient_id = patient["id"]

# Create lab order
lab_order = create_lab_order(
    patient_id=patient_id,
    tests=[
        {
            "test_id": "test-uuid",
            "test_name": "CBC",
            "price": 500.0,
            "tat_hours": 24
        }
    ]
)

print(f"Sample ID: {lab_order['sample_id']}")
```

---

## Error Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 400 | Bad Request - Invalid data |
| 401 | Unauthorized - Invalid/missing token |
| 404 | Not Found - Resource doesn't exist |
| 500 | Internal Server Error |

---

## Rate Limiting
- 1000 requests per hour per token
- Burst: 100 requests per minute

---

## Support
For API integration support, contact:
**Email:** lab@abchospital.com
**Phone:** +91-XXXXXXXXXX

---

## Changelog

### v1.0 (2026-02-21)
- Initial API release
- Patient registration endpoint
- Lab order creation
- Result retrieval
- PDF report generation with QR code
