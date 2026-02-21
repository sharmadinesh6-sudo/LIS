# ABC Hospital - NABL Compliant Laboratory Management System
## Complete Source Code Package

### 🏥 System Overview
- **Hospital:** ABC Hospital, Panipat
- **Compliance:** NABL ISO 15189:2022
- **Tech Stack:** React + FastAPI + MongoDB
- **Features:** Complete LIMS with EMR Integration

---

## 📁 Project Structure

```
/app/
├── backend/
│   ├── server.py              # Main FastAPI application
│   ├── requirements.txt       # Python dependencies
│   └── .env                   # Environment variables
│
├── frontend/
│   ├── src/
│   │   ├── App.js            # Main React component
│   │   ├── index.css         # Global styles
│   │   ├── context/
│   │   │   └── AuthContext.js
│   │   ├── lib/
│   │   │   └── api.js        # API integration
│   │   ├── pages/            # All page components
│   │   │   ├── Login.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── PatientManagement.jsx
│   │   │   ├── SampleManagement.jsx
│   │   │   ├── TestConfiguration.jsx
│   │   │   ├── ResultEntry.jsx
│   │   │   ├── QualityControl.jsx
│   │   │   ├── NABLDocuments.jsx
│   │   │   ├── InventoryManagement.jsx
│   │   │   └── AuditLogs.jsx
│   │   └── components/
│   │       ├── layout/
│   │       │   └── Sidebar.jsx
│   │       └── ui/           # Shadcn components
│   ├── package.json
│   ├── tailwind.config.js
│   └── .env
│
├── API_DOCUMENTATION.md       # Complete API docs
├── emr_integration_example.py # EMR integration code
└── design_guidelines.json     # UI/UX guidelines
```

---

## 🚀 Installation & Setup

### Prerequisites
- Python 3.11+
- Node.js 18+
- MongoDB 6.0+

### Backend Setup

1. **Navigate to backend:**
```bash
cd /app/backend
```

2. **Create virtual environment:**
```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. **Install dependencies:**
```bash
pip install -r requirements.txt
```

4. **Configure environment (.env):**
```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=lims_db
SECRET_KEY=your-secret-key-change-in-production
CORS_ORIGINS=http://localhost:3000
```

5. **Run backend:**
```bash
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

### Frontend Setup

1. **Navigate to frontend:**
```bash
cd /app/frontend
```

2. **Install dependencies:**
```bash
yarn install
# or
npm install
```

3. **Configure environment (.env):**
```env
REACT_APP_BACKEND_URL=http://localhost:8001
```

4. **Run frontend:**
```bash
yarn start
# or
npm start
```

### Access Application
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8001
- **API Docs:** http://localhost:8001/docs

---

## 👤 Default Login

**First Time Setup:**
1. Visit http://localhost:3000
2. Click "Register" tab
3. Create an admin account:
   - Email: admin@lab.com
   - Password: admin123
   - Role: Super Admin

---

## 📊 Key Features

### ✅ Core Modules
- **Patient Management** - UHID generation, registration
- **Sample Management** - Barcode, TAT tracking
- **Test Configuration** - Parameters, reference ranges
- **Result Entry** - Critical value detection, color coding
- **Quality Control** - IQC & EQAS tracking
- **NABL Documents** - ISO 15189 compliance
- **Inventory** - Reagent & expiry alerts
- **Audit Trail** - Complete activity logging

### ✅ NABL Compliance Features
- ✓ Critical value color coding (Red/Blue/Black)
- ✓ Audit trail for all actions
- ✓ TAT monitoring & breach alerts
- ✓ QC documentation
- ✓ Document version control
- ✓ User role-based access

### ✅ Reports
- PDF generation with hospital letterhead
- QR code for verification
- UHID barcode
- Color-coded results
- Digital signatures placeholder

### ✅ EMR Integration APIs
- Patient registration endpoint
- Lab order creation
- Result retrieval
- Sample status tracking
- Complete API documentation

---

## 🔌 EMR Integration

See `API_DOCUMENTATION.md` and `emr_integration_example.py`

**Quick Start:**
```python
from emr_integration_example import LIMSIntegration

lims = LIMSIntegration(
    base_url="http://localhost:8001/api",
    email="your-email",
    password="your-password"
)

lims.authenticate()

# Register patient
patient = lims.register_patient(
    emr_patient_id="EMR-001",
    name="Patient Name",
    age=35,
    gender="male",
    phone="+91-9876543210"
)

# Create lab order
order = lims.create_lab_order(
    emr_order_id="ORD-001",
    uhid=patient['uhid'],
    sample_type="Blood",
    test_codes=["CBC01"],
    ordered_by="Dr. Sharma"
)
```

---

## 🛠️ Production Deployment

### Environment Variables
Update `.env` files with production values:
- MongoDB connection string
- Secret keys
- CORS origins
- Backend URL

### Security Checklist
- [ ] Change SECRET_KEY
- [ ] Update MongoDB credentials
- [ ] Configure CORS properly
- [ ] Enable HTTPS
- [ ] Set up firewall rules
- [ ] Regular backups

### Recommended Stack
- **Hosting:** AWS, Azure, or DigitalOcean
- **Database:** MongoDB Atlas
- **Frontend:** Vercel, Netlify
- **Backend:** Docker + Kubernetes

---

## 📝 API Endpoints

### Authentication
- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Patients
- `POST /api/patients` - Create patient
- `GET /api/patients` - List patients
- `GET /api/patients/{id}` - Get patient

### Samples
- `POST /api/samples` - Create sample
- `GET /api/samples` - List samples
- `PUT /api/samples/{id}/status` - Update status
- `GET /api/samples/{id}/barcode` - Get barcode

### Tests
- `POST /api/tests` - Create test config
- `GET /api/tests` - List tests

### Results
- `POST /api/results` - Create result
- `GET /api/results` - List results
- `PUT /api/results/{id}` - Update result
- `GET /api/results/{id}/report` - Download PDF

### EMR Integration
- `POST /api/emr/patient/register`
- `POST /api/emr/lab-order/create`
- `GET /api/emr/patient/{uhid}`
- `GET /api/emr/sample/status/{sample_id}`
- `GET /api/emr/results/patient/{patient_id}`

**Full API docs:** See API_DOCUMENTATION.md

---

## 🎨 Customization

### Change Hospital Details
Edit in `/app/backend/server.py`:
```python
# Line ~800 in generate_pdf_report function
story.append(Paragraph("ABC HOSPITAL", title_style))
story.append(Paragraph("Panipat, Haryana | Phone: +91-XXX...", ...))
```

### Update Test Codes
Add tests via frontend or API:
```json
POST /api/tests
{
  "test_code": "LFT001",
  "test_name": "Liver Function Test",
  "category": "Biochemistry",
  "price": 800,
  "tat_hours": 24,
  ...
}
```

---

## 🐛 Troubleshooting

### Backend not starting
```bash
# Check logs
tail -f /var/log/supervisor/backend.err.log

# Restart
sudo supervisorctl restart backend
```

### Frontend build errors
```bash
# Clear cache
rm -rf node_modules
yarn cache clean
yarn install
```

### Database connection issues
- Verify MongoDB is running
- Check MONGO_URL in .env
- Ensure database exists

---

## 📞 Support

For issues or questions:
- **Documentation:** /app/API_DOCUMENTATION.md
- **Examples:** /app/emr_integration_example.py
- **Email:** lab@abchospital.com

---

## 📜 License

Proprietary - ABC Hospital, Panipat
All rights reserved.

---

## 🙏 Credits

Built with:
- React + Tailwind CSS
- FastAPI + Python
- MongoDB
- ReportLab (PDF generation)
- Shadcn/UI components

---

**Version:** 1.0.0
**Last Updated:** February 2026
**NABL Compliance:** ISO 15189:2022
