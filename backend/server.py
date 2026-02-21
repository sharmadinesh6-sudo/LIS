from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import FileResponse, StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
import jwt
import barcode
from barcode.writer import ImageWriter
from io import BytesIO
import base64
import qrcode
import json
import hashlib
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image as RLImage
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.graphics.barcode import code128
from reportlab.graphics.shapes import Drawing
from reportlab.graphics import renderPDF

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Security
SECRET_KEY = os.environ.get('SECRET_KEY', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 480

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

# ==================== MODELS ====================

class UserRole:
    SUPER_ADMIN = "super_admin"
    LAB_DIRECTOR = "lab_director"
    QUALITY_MANAGER = "quality_manager"
    PATHOLOGIST = "pathologist"
    LAB_TECHNICIAN = "lab_technician"
    RECEPTION = "reception"
    DOCTOR = "doctor"
    PATIENT = "patient"

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    name: str
    role: str
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    email: EmailStr
    name: str
    password: str
    role: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: User

class Patient(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    uhid: str
    name: str
    age: int
    gender: str
    phone: str
    email: Optional[str] = None
    address: Optional[str] = None
    patient_type: str  # OPD, IPD
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PatientCreate(BaseModel):
    name: str
    age: int
    gender: str
    phone: str
    email: Optional[str] = None
    address: Optional[str] = None
    patient_type: str

class TestItem(BaseModel):
    test_id: str
    test_name: str
    price: float
    tat_hours: int

class Sample(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    sample_id: str
    barcode: str
    patient_id: str
    patient_name: str
    uhid: str
    tests: List[TestItem]
    sample_type: str  # Serum, Plasma, EDTA, Urine, etc.
    collection_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    status: str = "collected"  # collected, received, processing, on_machine, under_validation, approved, dispatched
    collected_by: str
    tat_deadline: datetime
    is_rejected: bool = False
    rejection_reason: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SampleCreate(BaseModel):
    patient_id: str
    tests: List[TestItem]
    sample_type: str

class SampleStatusUpdate(BaseModel):
    status: str

class SampleRejection(BaseModel):
    rejection_reason: str

class TestParameter(BaseModel):
    parameter_name: str
    unit: str
    ref_range_male: str
    ref_range_female: str
    ref_range_child: Optional[str] = None
    critical_low: Optional[float] = None
    critical_high: Optional[float] = None

class TestConfig(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    test_code: str
    test_name: str
    category: str
    price: float
    tat_hours: int
    sample_type: str
    parameters: List[TestParameter]
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TestConfigCreate(BaseModel):
    test_code: str
    test_name: str
    category: str
    price: float
    tat_hours: int
    sample_type: str
    parameters: List[TestParameter]

class ResultParameter(BaseModel):
    parameter_name: str
    value: Optional[str] = None
    unit: str
    ref_range: str
    status: str = "normal"  # normal, high, low, critical

class TestResult(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    sample_id: str
    patient_id: str
    test_name: str
    parameters: List[ResultParameter]
    status: str = "draft"  # draft, under_review, approved, finalized
    entered_by: str
    reviewed_by: Optional[str] = None
    approved_by: Optional[str] = None
    has_critical_values: bool = False
    interpretation: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TestResultCreate(BaseModel):
    sample_id: str
    patient_id: str
    test_name: str
    parameters: List[ResultParameter]
    interpretation: Optional[str] = None

class TestResultUpdate(BaseModel):
    parameters: Optional[List[ResultParameter]] = None
    status: Optional[str] = None
    interpretation: Optional[str] = None

class QCEntry(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    test_name: str
    qc_type: str  # internal, external
    level: str  # Level 1, Level 2, Level 3
    lot_number: str
    parameter: str
    target_value: float
    measured_value: float
    deviation: float
    status: str  # pass, fail
    entered_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class QCEntryCreate(BaseModel):
    test_name: str
    qc_type: str
    level: str
    lot_number: str
    parameter: str
    target_value: float
    measured_value: float

class NABLDocument(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    document_type: str  # SOP, NCR, CAPA, Training, Audit
    document_id: str
    title: str
    version: str
    status: str  # draft, approved, archived
    uploaded_by: str
    approved_by: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class NABLDocumentCreate(BaseModel):
    document_type: str
    document_id: str
    title: str
    version: str

class AuditLog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    user_name: str
    user_role: str
    action: str
    module: str
    details: Dict[str, Any]
    ip_address: Optional[str] = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class InventoryItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    item_name: str
    item_type: str  # reagent, consumable
    lot_number: str
    quantity: int
    unit: str
    expiry_date: datetime
    minimum_stock: int
    supplier: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class InventoryItemCreate(BaseModel):
    item_name: str
    item_type: str
    lot_number: str
    quantity: int
    unit: str
    expiry_date: datetime
    minimum_stock: int
    supplier: str

# ==================== AUTH FUNCTIONS ====================

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Could not validate credentials")
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return User(**user)

async def log_audit(user: User, action: str, module: str, details: Dict[str, Any], request: Request = None):
    audit_log = AuditLog(
        user_id=user.id,
        user_name=user.name,
        user_role=user.role,
        action=action,
        module=module,
        details=details,
        ip_address=request.client.host if request else None
    )
    doc = audit_log.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    await db.audit_logs.insert_one(doc)

def generate_barcode_base64(barcode_text: str) -> str:
    EAN = barcode.get_barcode_class('code128')
    ean = EAN(barcode_text, writer=ImageWriter())
    buffer = BytesIO()
    ean.write(buffer)
    buffer.seek(0)
    return base64.b64encode(buffer.getvalue()).decode()

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register", response_model=User)
async def register(user_data: UserCreate):
    existing = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = get_password_hash(user_data.password)
    user = User(
        email=user_data.email,
        name=user_data.name,
        role=user_data.role
    )
    
    doc = user.model_dump()
    doc['password'] = hashed_password
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.users.insert_one(doc)
    return user

@api_router.post("/auth/login", response_model=Token)
async def login(credentials: UserLogin):
    user_doc = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not verify_password(credentials.password, user_doc['password']):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not user_doc.get('is_active', True):
        raise HTTPException(status_code=401, detail="Account is inactive")
    
    user = User(**user_doc)
    access_token = create_access_token(data={"sub": user.id})
    
    return Token(access_token=access_token, token_type="bearer", user=user)

@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

# ==================== PATIENT ROUTES ====================

@api_router.post("/patients", response_model=Patient)
async def create_patient(patient_data: PatientCreate, current_user: User = Depends(get_current_user), request: Request = None):
    # Generate UHID
    count = await db.patients.count_documents({}) + 1
    uhid = f"UHID{count:06d}"
    
    patient = Patient(
        uhid=uhid,
        name=patient_data.name,
        age=patient_data.age,
        gender=patient_data.gender,
        phone=patient_data.phone,
        email=patient_data.email,
        address=patient_data.address,
        patient_type=patient_data.patient_type,
        created_by=current_user.id
    )
    
    doc = patient.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.patients.insert_one(doc)
    
    await log_audit(current_user, "CREATE", "patients", {"patient_id": patient.id, "uhid": uhid}, request)
    
    return patient

@api_router.get("/patients", response_model=List[Patient])
async def get_patients(skip: int = 0, limit: int = 100, search: str = None, current_user: User = Depends(get_current_user)):
    query = {}
    if search:
        query = {"$or": [
            {"name": {"$regex": search, "$options": "i"}},
            {"uhid": {"$regex": search, "$options": "i"}},
            {"phone": {"$regex": search, "$options": "i"}}
        ]}
    
    patients = await db.patients.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    for p in patients:
        if isinstance(p['created_at'], str):
            p['created_at'] = datetime.fromisoformat(p['created_at'])
    return patients

@api_router.get("/patients/{patient_id}", response_model=Patient)
async def get_patient(patient_id: str, current_user: User = Depends(get_current_user)):
    patient = await db.patients.find_one({"id": patient_id}, {"_id": 0})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    if isinstance(patient['created_at'], str):
        patient['created_at'] = datetime.fromisoformat(patient['created_at'])
    return Patient(**patient)

# ==================== SAMPLE ROUTES ====================

@api_router.post("/samples", response_model=Sample)
async def create_sample(sample_data: SampleCreate, current_user: User = Depends(get_current_user), request: Request = None):
    patient = await db.patients.find_one({"id": sample_data.patient_id}, {"_id": 0})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # Generate sample ID and barcode
    count = await db.samples.count_documents({}) + 1
    sample_id = f"SMP{count:08d}"
    barcode_num = f"{count:012d}"
    
    # Calculate TAT deadline (use maximum TAT from tests)
    max_tat = max([test.tat_hours for test in sample_data.tests])
    tat_deadline = datetime.now(timezone.utc) + timedelta(hours=max_tat)
    
    sample = Sample(
        sample_id=sample_id,
        barcode=barcode_num,
        patient_id=sample_data.patient_id,
        patient_name=patient['name'],
        uhid=patient['uhid'],
        tests=[test.model_dump() for test in sample_data.tests],
        sample_type=sample_data.sample_type,
        collected_by=current_user.id,
        tat_deadline=tat_deadline
    )
    
    doc = sample.model_dump()
    doc['collection_date'] = doc['collection_date'].isoformat()
    doc['tat_deadline'] = doc['tat_deadline'].isoformat()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.samples.insert_one(doc)
    
    await log_audit(current_user, "CREATE", "samples", {"sample_id": sample_id, "patient_id": sample_data.patient_id}, request)
    
    return sample

@api_router.get("/samples", response_model=List[Sample])
async def get_samples(skip: int = 0, limit: int = 100, status: str = None, current_user: User = Depends(get_current_user)):
    query = {}
    if status:
        query["status"] = status
    
    samples = await db.samples.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    for s in samples:
        if isinstance(s['collection_date'], str):
            s['collection_date'] = datetime.fromisoformat(s['collection_date'])
        if isinstance(s['tat_deadline'], str):
            s['tat_deadline'] = datetime.fromisoformat(s['tat_deadline'])
        if isinstance(s['created_at'], str):
            s['created_at'] = datetime.fromisoformat(s['created_at'])
    return samples

@api_router.get("/samples/{sample_id}", response_model=Sample)
async def get_sample(sample_id: str, current_user: User = Depends(get_current_user)):
    sample = await db.samples.find_one({"id": sample_id}, {"_id": 0})
    if not sample:
        raise HTTPException(status_code=404, detail="Sample not found")
    if isinstance(sample['collection_date'], str):
        sample['collection_date'] = datetime.fromisoformat(sample['collection_date'])
    if isinstance(sample['tat_deadline'], str):
        sample['tat_deadline'] = datetime.fromisoformat(sample['tat_deadline'])
    if isinstance(sample['created_at'], str):
        sample['created_at'] = datetime.fromisoformat(sample['created_at'])
    return Sample(**sample)

@api_router.put("/samples/{sample_id}/status", response_model=Sample)
async def update_sample_status(sample_id: str, status_update: SampleStatusUpdate, current_user: User = Depends(get_current_user), request: Request = None):
    sample = await db.samples.find_one({"id": sample_id}, {"_id": 0})
    if not sample:
        raise HTTPException(status_code=404, detail="Sample not found")
    
    await db.samples.update_one({"id": sample_id}, {"$set": {"status": status_update.status}})
    sample['status'] = status_update.status
    
    await log_audit(current_user, "UPDATE_STATUS", "samples", {"sample_id": sample_id, "new_status": status_update.status}, request)
    
    if isinstance(sample['collection_date'], str):
        sample['collection_date'] = datetime.fromisoformat(sample['collection_date'])
    if isinstance(sample['tat_deadline'], str):
        sample['tat_deadline'] = datetime.fromisoformat(sample['tat_deadline'])
    if isinstance(sample['created_at'], str):
        sample['created_at'] = datetime.fromisoformat(sample['created_at'])
    return Sample(**sample)

@api_router.post("/samples/{sample_id}/reject", response_model=Sample)
async def reject_sample(sample_id: str, rejection: SampleRejection, current_user: User = Depends(get_current_user), request: Request = None):
    sample = await db.samples.find_one({"id": sample_id}, {"_id": 0})
    if not sample:
        raise HTTPException(status_code=404, detail="Sample not found")
    
    await db.samples.update_one({"id": sample_id}, {"$set": {
        "is_rejected": True,
        "rejection_reason": rejection.rejection_reason,
        "status": "rejected"
    }})
    
    sample['is_rejected'] = True
    sample['rejection_reason'] = rejection.rejection_reason
    sample['status'] = "rejected"
    
    await log_audit(current_user, "REJECT", "samples", {"sample_id": sample_id, "reason": rejection.rejection_reason}, request)
    
    if isinstance(sample['collection_date'], str):
        sample['collection_date'] = datetime.fromisoformat(sample['collection_date'])
    if isinstance(sample['tat_deadline'], str):
        sample['tat_deadline'] = datetime.fromisoformat(sample['tat_deadline'])
    if isinstance(sample['created_at'], str):
        sample['created_at'] = datetime.fromisoformat(sample['created_at'])
    return Sample(**sample)

@api_router.get("/samples/{sample_id}/barcode")
async def get_sample_barcode(sample_id: str, current_user: User = Depends(get_current_user)):
    sample = await db.samples.find_one({"id": sample_id}, {"_id": 0})
    if not sample:
        raise HTTPException(status_code=404, detail="Sample not found")
    
    barcode_base64 = generate_barcode_base64(sample['barcode'])
    return {"barcode": barcode_base64, "barcode_text": sample['barcode']}

# ==================== TEST CONFIG ROUTES ====================

@api_router.post("/tests", response_model=TestConfig)
async def create_test_config(test_data: TestConfigCreate, current_user: User = Depends(get_current_user), request: Request = None):
    test = TestConfig(**test_data.model_dump())
    doc = test.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.test_configs.insert_one(doc)
    
    await log_audit(current_user, "CREATE", "test_configs", {"test_id": test.id, "test_name": test.test_name}, request)
    
    return test

@api_router.get("/tests", response_model=List[TestConfig])
async def get_tests(current_user: User = Depends(get_current_user)):
    tests = await db.test_configs.find({}, {"_id": 0}).to_list(1000)
    for t in tests:
        if isinstance(t['created_at'], str):
            t['created_at'] = datetime.fromisoformat(t['created_at'])
    return tests

@api_router.get("/tests/{test_id}", response_model=TestConfig)
async def get_test(test_id: str, current_user: User = Depends(get_current_user)):
    test = await db.test_configs.find_one({"id": test_id}, {"_id": 0})
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    if isinstance(test['created_at'], str):
        test['created_at'] = datetime.fromisoformat(test['created_at'])
    return TestConfig(**test)

# ==================== RESULTS ROUTES ====================

@api_router.post("/results", response_model=TestResult)
async def create_result(result_data: TestResultCreate, current_user: User = Depends(get_current_user), request: Request = None):
    # Check for critical values
    has_critical = any(p.status == "critical" for p in result_data.parameters)
    
    result = TestResult(
        sample_id=result_data.sample_id,
        patient_id=result_data.patient_id,
        test_name=result_data.test_name,
        parameters=[p.model_dump() for p in result_data.parameters],
        interpretation=result_data.interpretation,
        entered_by=current_user.id,
        has_critical_values=has_critical
    )
    
    doc = result.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    await db.test_results.insert_one(doc)
    
    await log_audit(current_user, "CREATE", "test_results", {"result_id": result.id, "sample_id": result_data.sample_id, "has_critical": has_critical}, request)
    
    return result

@api_router.get("/results", response_model=List[TestResult])
async def get_results(sample_id: str = None, patient_id: str = None, status: str = None, current_user: User = Depends(get_current_user)):
    query = {}
    if sample_id:
        query["sample_id"] = sample_id
    if patient_id:
        query["patient_id"] = patient_id
    if status:
        query["status"] = status
    
    results = await db.test_results.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    for r in results:
        if isinstance(r['created_at'], str):
            r['created_at'] = datetime.fromisoformat(r['created_at'])
        if isinstance(r['updated_at'], str):
            r['updated_at'] = datetime.fromisoformat(r['updated_at'])
    return results

@api_router.get("/results/{result_id}", response_model=TestResult)
async def get_result(result_id: str, current_user: User = Depends(get_current_user)):
    result = await db.test_results.find_one({"id": result_id}, {"_id": 0})
    if not result:
        raise HTTPException(status_code=404, detail="Result not found")
    if isinstance(result['created_at'], str):
        result['created_at'] = datetime.fromisoformat(result['created_at'])
    if isinstance(result['updated_at'], str):
        result['updated_at'] = datetime.fromisoformat(result['updated_at'])
    return TestResult(**result)

@api_router.put("/results/{result_id}", response_model=TestResult)
async def update_result(result_id: str, update_data: TestResultUpdate, current_user: User = Depends(get_current_user), request: Request = None):
    result = await db.test_results.find_one({"id": result_id}, {"_id": 0})
    if not result:
        raise HTTPException(status_code=404, detail="Result not found")
    
    update_fields = {"updated_at": datetime.now(timezone.utc).isoformat()}
    
    if update_data.parameters:
        update_fields["parameters"] = [p.model_dump() for p in update_data.parameters]
        has_critical = any(p.status == "critical" for p in update_data.parameters)
        update_fields["has_critical_values"] = has_critical
    
    if update_data.status:
        update_fields["status"] = update_data.status
        if update_data.status == "approved":
            update_fields["approved_by"] = current_user.id
        elif update_data.status == "under_review":
            update_fields["reviewed_by"] = current_user.id
    
    if update_data.interpretation is not None:
        update_fields["interpretation"] = update_data.interpretation
    
    await db.test_results.update_one({"id": result_id}, {"$set": update_fields})
    
    await log_audit(current_user, "UPDATE", "test_results", {"result_id": result_id, "updates": list(update_fields.keys())}, request)
    
    result.update(update_fields)
    if isinstance(result['created_at'], str):
        result['created_at'] = datetime.fromisoformat(result['created_at'])
    if isinstance(result['updated_at'], str):
        result['updated_at'] = datetime.fromisoformat(result['updated_at'])
    return TestResult(**result)

# ==================== QC ROUTES ====================

@api_router.post("/qc", response_model=QCEntry)
async def create_qc_entry(qc_data: QCEntryCreate, current_user: User = Depends(get_current_user), request: Request = None):
    deviation = qc_data.measured_value - qc_data.target_value
    deviation_percent = (deviation / qc_data.target_value) * 100 if qc_data.target_value != 0 else 0
    
    # Simple QC pass/fail logic (within ±10%)
    status = "pass" if abs(deviation_percent) <= 10 else "fail"
    
    qc = QCEntry(
        test_name=qc_data.test_name,
        qc_type=qc_data.qc_type,
        level=qc_data.level,
        lot_number=qc_data.lot_number,
        parameter=qc_data.parameter,
        target_value=qc_data.target_value,
        measured_value=qc_data.measured_value,
        deviation=deviation,
        status=status,
        entered_by=current_user.id
    )
    
    doc = qc.model_dump()
    doc['date'] = doc['date'].isoformat()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.qc_entries.insert_one(doc)
    
    await log_audit(current_user, "CREATE", "qc_entries", {"qc_id": qc.id, "test_name": qc.test_name, "status": status}, request)
    
    return qc

@api_router.get("/qc", response_model=List[QCEntry])
async def get_qc_entries(test_name: str = None, qc_type: str = None, current_user: User = Depends(get_current_user)):
    query = {}
    if test_name:
        query["test_name"] = test_name
    if qc_type:
        query["qc_type"] = qc_type
    
    entries = await db.qc_entries.find(query, {"_id": 0}).sort("date", -1).limit(100).to_list(100)
    for e in entries:
        if isinstance(e['date'], str):
            e['date'] = datetime.fromisoformat(e['date'])
        if isinstance(e['created_at'], str):
            e['created_at'] = datetime.fromisoformat(e['created_at'])
    return entries

# ==================== NABL DOCUMENTS ROUTES ====================

@api_router.post("/nabl-documents", response_model=NABLDocument)
async def create_nabl_document(doc_data: NABLDocumentCreate, current_user: User = Depends(get_current_user), request: Request = None):
    doc = NABLDocument(
        document_type=doc_data.document_type,
        document_id=doc_data.document_id,
        title=doc_data.title,
        version=doc_data.version,
        status="draft",
        uploaded_by=current_user.id
    )
    
    doc_dict = doc.model_dump()
    doc_dict['created_at'] = doc_dict['created_at'].isoformat()
    doc_dict['updated_at'] = doc_dict['updated_at'].isoformat()
    await db.nabl_documents.insert_one(doc_dict)
    
    await log_audit(current_user, "CREATE", "nabl_documents", {"document_id": doc.id, "type": doc.document_type}, request)
    
    return doc

@api_router.get("/nabl-documents", response_model=List[NABLDocument])
async def get_nabl_documents(document_type: str = None, current_user: User = Depends(get_current_user)):
    query = {}
    if document_type:
        query["document_type"] = document_type
    
    docs = await db.nabl_documents.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    for d in docs:
        if isinstance(d['created_at'], str):
            d['created_at'] = datetime.fromisoformat(d['created_at'])
        if isinstance(d['updated_at'], str):
            d['updated_at'] = datetime.fromisoformat(d['updated_at'])
    return docs

# ==================== INVENTORY ROUTES ====================

@api_router.post("/inventory", response_model=InventoryItem)
async def create_inventory_item(item_data: InventoryItemCreate, current_user: User = Depends(get_current_user), request: Request = None):
    item = InventoryItem(**item_data.model_dump())
    doc = item.model_dump()
    doc['expiry_date'] = doc['expiry_date'].isoformat()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.inventory.insert_one(doc)
    
    await log_audit(current_user, "CREATE", "inventory", {"item_id": item.id, "item_name": item.item_name}, request)
    
    return item

@api_router.get("/inventory", response_model=List[InventoryItem])
async def get_inventory(current_user: User = Depends(get_current_user)):
    items = await db.inventory.find({}, {"_id": 0}).sort("item_name", 1).to_list(1000)
    for i in items:
        if isinstance(i['expiry_date'], str):
            i['expiry_date'] = datetime.fromisoformat(i['expiry_date'])
        if isinstance(i['created_at'], str):
            i['created_at'] = datetime.fromisoformat(i['created_at'])
    return items

@api_router.get("/inventory/alerts")
async def get_inventory_alerts(current_user: User = Depends(get_current_user)):
    items = await db.inventory.find({}, {"_id": 0}).to_list(1000)
    
    low_stock = []
    expiring_soon = []
    
    for item in items:
        if isinstance(item['expiry_date'], str):
            item['expiry_date'] = datetime.fromisoformat(item['expiry_date'])
        if isinstance(item['created_at'], str):
            item['created_at'] = datetime.fromisoformat(item['created_at'])
        
        if item['quantity'] <= item['minimum_stock']:
            low_stock.append(item)
        
        days_to_expire = (item['expiry_date'] - datetime.now(timezone.utc)).days
        if 0 <= days_to_expire <= 30:
            expiring_soon.append({**item, "days_to_expire": days_to_expire})
    
    return {"low_stock": low_stock, "expiring_soon": expiring_soon}

# ==================== AUDIT LOG ROUTES ====================

@api_router.get("/audit-logs", response_model=List[AuditLog])
async def get_audit_logs(module: str = None, skip: int = 0, limit: int = 100, current_user: User = Depends(get_current_user)):
    query = {}
    if module:
        query["module"] = module
    
    logs = await db.audit_logs.find(query, {"_id": 0}).sort("timestamp", -1).skip(skip).limit(limit).to_list(limit)
    for log in logs:
        if isinstance(log['timestamp'], str):
            log['timestamp'] = datetime.fromisoformat(log['timestamp'])
    return logs

# ==================== DASHBOARD STATS ====================

@api_router.get("/dashboard/stats")
async def get_dashboard_stats(current_user: User = Depends(get_current_user)):
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    
    total_patients = await db.patients.count_documents({})
    total_samples_today = await db.samples.count_documents({
        "created_at": {"$gte": today.isoformat()}
    })
    
    pending_results = await db.test_results.count_documents({"status": "draft"})
    critical_results = await db.test_results.count_documents({"has_critical_values": True, "status": {"$ne": "finalized"}})
    
    samples_by_status = {}
    for status in ["collected", "received", "processing", "under_validation", "approved"]:
        count = await db.samples.count_documents({"status": status})
        samples_by_status[status] = count
    
    # TAT breaches
    now_iso = datetime.now(timezone.utc).isoformat()
    tat_breaches = await db.samples.count_documents({
        "tat_deadline": {"$lt": now_iso},
        "status": {"$nin": ["approved", "dispatched"]}
    })
    
    return {
        "total_patients": total_patients,
        "total_samples_today": total_samples_today,
        "pending_results": pending_results,
        "critical_results": critical_results,
        "samples_by_status": samples_by_status,
        "tat_breaches": tat_breaches
    }

# ==================== EMR INTEGRATION ENDPOINTS ====================

class EMRPatientCreate(BaseModel):
    """EMR Patient Registration - simplified for external systems"""
    emr_patient_id: str  # Patient ID from EMR system
    name: str
    age: int
    gender: str
    phone: str
    email: Optional[str] = None
    address: Optional[str] = None
    patient_type: str = "OPD"

class EMRLabOrder(BaseModel):
    """Lab order from EMR system"""
    emr_order_id: str  # Order ID from EMR
    uhid: Optional[str] = None  # If patient already exists
    emr_patient_id: Optional[str] = None  # From EMR
    patient_details: Optional[EMRPatientCreate] = None  # New patient data
    sample_type: str
    test_codes: List[str]  # Test codes like ['CBC001', 'LFT001']
    ordered_by: str  # Doctor name
    priority: str = "routine"  # routine, urgent, stat

@api_router.post("/emr/patient/register")
async def emr_register_patient(patient_data: EMRPatientCreate, current_user: User = Depends(get_current_user)):
    """
    EMR Integration: Register patient from external EMR system
    Returns UHID for future reference
    """
    # Check if EMR patient already exists
    existing = await db.patients.find_one({"phone": patient_data.phone}, {"_id": 0})
    if existing:
        return {
            "status": "exists",
            "message": "Patient already registered",
            "uhid": existing['uhid'],
            "patient_id": existing['id'],
            "emr_patient_id": patient_data.emr_patient_id
        }
    
    # Generate UHID
    count = await db.patients.count_documents({}) + 1
    uhid = f"UHID{count:06d}"
    
    patient = Patient(
        uhid=uhid,
        name=patient_data.name,
        age=patient_data.age,
        gender=patient_data.gender,
        phone=patient_data.phone,
        email=patient_data.email,
        address=patient_data.address,
        patient_type=patient_data.patient_type,
        created_by=current_user.id
    )
    
    doc = patient.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['emr_patient_id'] = patient_data.emr_patient_id
    await db.patients.insert_one(doc)
    
    return {
        "status": "created",
        "message": "Patient registered successfully",
        "uhid": uhid,
        "patient_id": patient.id,
        "emr_patient_id": patient_data.emr_patient_id
    }

@api_router.post("/emr/lab-order/create")
async def emr_create_lab_order(order_data: EMRLabOrder, current_user: User = Depends(get_current_user)):
    """
    EMR Integration: Create lab order from doctor's prescription
    Automatically registers patient if new, creates sample with tests
    """
    patient_id = None
    uhid = None
    
    # Get or create patient
    if order_data.uhid:
        # Existing patient by UHID
        patient = await db.patients.find_one({"uhid": order_data.uhid}, {"_id": 0})
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found with given UHID")
        patient_id = patient['id']
        uhid = patient['uhid']
    elif order_data.emr_patient_id:
        # Try to find by EMR ID
        patient = await db.patients.find_one({"emr_patient_id": order_data.emr_patient_id}, {"_id": 0})
        if patient:
            patient_id = patient['id']
            uhid = patient['uhid']
    
    # Create new patient if needed
    if not patient_id and order_data.patient_details:
        count = await db.patients.count_documents({}) + 1
        uhid = f"UHID{count:06d}"
        
        patient = Patient(
            uhid=uhid,
            name=order_data.patient_details.name,
            age=order_data.patient_details.age,
            gender=order_data.patient_details.gender,
            phone=order_data.patient_details.phone,
            email=order_data.patient_details.email,
            address=order_data.patient_details.address,
            patient_type=order_data.patient_details.patient_type,
            created_by=current_user.id
        )
        
        doc = patient.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        doc['emr_patient_id'] = order_data.patient_details.emr_patient_id
        await db.patients.insert_one(doc)
        patient_id = patient.id
    
    if not patient_id:
        raise HTTPException(status_code=400, detail="Patient information required")
    
    # Get patient details
    patient = await db.patients.find_one({"id": patient_id}, {"_id": 0})
    
    # Get tests by codes
    test_list = []
    for test_code in order_data.test_codes:
        test = await db.test_configs.find_one({"test_code": test_code}, {"_id": 0})
        if test:
            test_list.append(TestItem(
                test_id=test['id'],
                test_name=test['test_name'],
                price=test['price'],
                tat_hours=test['tat_hours']
            ))
    
    if not test_list:
        raise HTTPException(status_code=404, detail="No valid tests found for given test codes")
    
    # Generate sample ID and barcode
    count = await db.samples.count_documents({}) + 1
    sample_id = f"SMP{count:08d}"
    barcode_num = f"{count:012d}"
    
    # Calculate TAT deadline
    max_tat = max([test.tat_hours for test in test_list])
    tat_deadline = datetime.now(timezone.utc) + timedelta(hours=max_tat)
    
    sample = Sample(
        sample_id=sample_id,
        barcode=barcode_num,
        patient_id=patient_id,
        patient_name=patient['name'],
        uhid=patient['uhid'],
        tests=[test.model_dump() for test in test_list],
        sample_type=order_data.sample_type,
        collected_by=current_user.id,
        tat_deadline=tat_deadline
    )
    
    doc = sample.model_dump()
    doc['collection_date'] = doc['collection_date'].isoformat()
    doc['tat_deadline'] = doc['tat_deadline'].isoformat()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['emr_order_id'] = order_data.emr_order_id
    doc['ordered_by'] = order_data.ordered_by
    doc['priority'] = order_data.priority
    await db.samples.insert_one(doc)
    
    return {
        "status": "success",
        "message": "Lab order created successfully",
        "uhid": uhid,
        "patient_id": patient_id,
        "patient_name": patient['name'],
        "sample_id": sample_id,
        "barcode": barcode_num,
        "tests": [{"test_name": t.test_name, "tat_hours": t.tat_hours} for t in test_list],
        "tat_deadline": tat_deadline.isoformat(),
        "emr_order_id": order_data.emr_order_id
    }

@api_router.get("/emr/patient/{uhid}")
async def emr_get_patient(uhid: str, current_user: User = Depends(get_current_user)):
    """EMR Integration: Get patient details by UHID"""
    patient = await db.patients.find_one({"uhid": uhid}, {"_id": 0})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    if isinstance(patient['created_at'], str):
        patient['created_at'] = datetime.fromisoformat(patient['created_at'])
    
    return Patient(**patient)

@api_router.get("/emr/results/patient/{patient_id}")
async def emr_get_patient_results(patient_id: str, current_user: User = Depends(get_current_user)):
    """EMR Integration: Get all results for a patient"""
    results = await db.test_results.find({"patient_id": patient_id}, {"_id": 0}).to_list(1000)
    for r in results:
        if isinstance(r['created_at'], str):
            r['created_at'] = datetime.fromisoformat(r['created_at'])
        if isinstance(r['updated_at'], str):
            r['updated_at'] = datetime.fromisoformat(r['updated_at'])
    return results

@api_router.get("/emr/sample/status/{sample_id}")
async def emr_get_sample_status(sample_id: str, current_user: User = Depends(get_current_user)):
    """EMR Integration: Get sample status by sample ID"""
    sample = await db.samples.find_one({"sample_id": sample_id}, {"_id": 0})
    if not sample:
        raise HTTPException(status_code=404, detail="Sample not found")
    
    if isinstance(sample['collection_date'], str):
        sample['collection_date'] = datetime.fromisoformat(sample['collection_date'])
    if isinstance(sample['tat_deadline'], str):
        sample['tat_deadline'] = datetime.fromisoformat(sample['tat_deadline'])
    if isinstance(sample['created_at'], str):
        sample['created_at'] = datetime.fromisoformat(sample['created_at'])
    
    return sample

# ==================== GENERATE PDF REPORT ====================

def generate_pdf_report(patient_data, sample_data, results_data):
    """Generate PDF report with hospital letterhead, QR code and barcode"""
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=0.5*inch, bottomMargin=0.5*inch, 
                          leftMargin=0.75*inch, rightMargin=0.75*inch)
    story = []
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=20,
        textColor=colors.HexColor('#0F172A'),
        spaceAfter=6,
        alignment=TA_CENTER,
        fontName='Helvetica-Bold'
    )
    
    header_style = ParagraphStyle(
        'Header',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor('#64748B'),
        alignment=TA_CENTER,
        spaceAfter=20
    )
    
    section_style = ParagraphStyle(
        'Section',
        parent=styles['Heading2'],
        fontSize=12,
        textColor=colors.HexColor('#0F172A'),
        spaceAfter=10,
        spaceBefore=15,
        fontName='Helvetica-Bold'
    )
    
    # Generate QR Code for report verification
    result_id = results_data[0]['id']
    qr_data = {
        'type': 'lab_report',
        'hospital': 'ABC Hospital, Panipat',
        'result_id': result_id,
        'uhid': patient_data['uhid'],
        'sample_id': sample_data['sample_id'],
        'patient_name': patient_data['name'],
        'generated_at': datetime.now(timezone.utc).isoformat(),
        'verification_hash': hashlib.sha256(f"{result_id}{patient_data['uhid']}{sample_data['sample_id']}".encode()).hexdigest()[:16]
    }
    
    qr = qrcode.QRCode(version=1, box_size=10, border=2)
    qr.add_data(json.dumps(qr_data))
    qr.make(fit=True)
    qr_img = qr.make_image(fill_color="black", back_color="white")
    
    # Save QR code to buffer
    qr_buffer = BytesIO()
    qr_img.save(qr_buffer, format='PNG')
    qr_buffer.seek(0)
    qr_image = RLImage(qr_buffer, width=1.2*inch, height=1.2*inch)
    
    # Hospital Letterhead with QR Code
    header_data = [
        [
            Paragraph("ABC HOSPITAL", title_style),
            qr_image
        ]
    ]
    header_table = Table(header_data, colWidths=[5.3*inch, 1.5*inch])
    header_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (0, 0), 'LEFT'),
        ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP')
    ]))
    story.append(header_table)
    
    story.append(Paragraph("NABL Accredited Laboratory (ISO 15189:2022)", header_style))
    story.append(Paragraph("Panipat, Haryana | Phone: +91-XXXXXXXXXX | Email: lab@abchospital.com", header_style))
    story.append(Spacer(1, 0.1*inch))
    
    # Horizontal line
    line_table = Table([['']], colWidths=[6.8*inch])
    line_table.setStyle(TableStyle([
        ('LINEABOVE', (0, 0), (-1, 0), 2, colors.HexColor('#0ea5e9')),
    ]))
    story.append(line_table)
    story.append(Spacer(1, 0.2*inch))
    
    # Report Title
    report_title = ParagraphStyle('ReportTitle', parent=styles['Heading1'], fontSize=14, 
                                   textColor=colors.HexColor('#0F172A'), alignment=TA_CENTER, 
                                   spaceAfter=15, fontName='Helvetica-Bold')
    story.append(Paragraph("LABORATORY TEST REPORT", report_title))
    story.append(Spacer(1, 0.1*inch))
    
    # Patient Information Section with UHID Barcode
    story.append(Paragraph("PATIENT INFORMATION", section_style))
    
    patient_info = [
        ['UHID:', patient_data['uhid'], 'Patient Name:', patient_data['name']],
        ['Age/Gender:', f"{patient_data['age']} Years / {patient_data['gender'].capitalize()}", 
         'Phone:', patient_data['phone']],
        ['Sample ID:', sample_data['sample_id'], 'Sample Type:', sample_data['sample_type']],
        ['Collection Date:', sample_data['collection_date'].strftime('%d-%b-%Y %I:%M %p') if isinstance(sample_data['collection_date'], datetime) else sample_data['collection_date'],
         'Report Date:', datetime.now(timezone.utc).strftime('%d-%b-%Y %I:%M %p')]
    ]
    
    patient_table = Table(patient_info, colWidths=[1.3*inch, 2*inch, 1.3*inch, 2.2*inch])
    patient_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#F1F5F9')),
        ('BACKGROUND', (2, 0), (2, -1), colors.HexColor('#F1F5F9')),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor('#0F172A')),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0'))
    ]))
    story.append(patient_table)
    story.append(Spacer(1, 0.1*inch))
    
    # UHID Barcode - simplified text with barcode value
    barcode_label = Paragraph(f"<b>UHID Barcode: {patient_data['uhid']}</b>", 
                             ParagraphStyle('BarcodeLabel', parent=styles['Normal'], fontSize=10,
                                          fontName='Courier-Bold',
                                          textColor=colors.HexColor('#0F172A'), spaceAfter=10))
    story.append(barcode_label)
    story.append(Spacer(1, 0.1*inch))
    
    # Test Results Section
    for result in results_data:
        story.append(Paragraph(f"TEST: {result['test_name']}", section_style))
        
        # Results table
        result_data = [['Parameter', 'Result', 'Unit', 'Reference Range', 'Status']]
        
        for param in result['parameters']:
            # Color coding for values
            status_text = param['status'].upper()
            if param['status'] == 'critical':
                status_text = '*** CRITICAL ***'
            elif param['status'] == 'high':
                status_text = 'HIGH'
            elif param['status'] == 'low':
                status_text = 'LOW'
            else:
                status_text = 'NORMAL'
            
            result_data.append([
                param['parameter_name'],
                param['value'],
                param['unit'],
                param['ref_range'],
                status_text
            ])
        
        result_table = Table(result_data, colWidths=[2.2*inch, 1.1*inch, 0.9*inch, 1.6*inch, 1*inch])
        
        # Apply styles
        table_style = [
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0F172A')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('ALIGN', (1, 1), (1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('FONTSIZE', (0, 1), (-1, -1), 9),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0'))
        ]
        
        # Apply color coding to rows
        for i, param in enumerate(result['parameters'], start=1):
            if param['status'] == 'critical':
                table_style.extend([
                    ('BACKGROUND', (0, i), (-1, i), colors.HexColor('#FEF2F2')),
                    ('TEXTCOLOR', (1, i), (1, i), colors.HexColor('#DC2626')),
                    ('TEXTCOLOR', (4, i), (4, i), colors.HexColor('#DC2626')),
                    ('FONTNAME', (1, i), (1, i), 'Helvetica-Bold'),
                    ('FONTNAME', (4, i), (4, i), 'Helvetica-Bold'),
                ])
            elif param['status'] == 'high':
                table_style.extend([
                    ('TEXTCOLOR', (1, i), (1, i), colors.HexColor('#DC2626')),
                    ('TEXTCOLOR', (4, i), (4, i), colors.HexColor('#DC2626')),
                    ('FONTNAME', (1, i), (1, i), 'Helvetica-Bold'),
                ])
            elif param['status'] == 'low':
                table_style.extend([
                    ('TEXTCOLOR', (1, i), (1, i), colors.HexColor('#2563EB')),
                    ('TEXTCOLOR', (4, i), (4, i), colors.HexColor('#2563EB')),
                    ('FONTNAME', (1, i), (1, i), 'Helvetica-Bold'),
                ])
        
        result_table.setStyle(TableStyle(table_style))
        story.append(result_table)
        
        # Interpretation if present
        if result.get('interpretation'):
            story.append(Spacer(1, 0.1*inch))
            interp_style = ParagraphStyle('Interpretation', parent=styles['Normal'], 
                                          fontSize=9, textColor=colors.HexColor('#475569'),
                                          leftIndent=10)
            story.append(Paragraph(f"<b>Interpretation:</b> {result['interpretation']}", interp_style))
        
        story.append(Spacer(1, 0.2*inch))
    
    # QR Code Information Box
    story.append(Spacer(1, 0.2*inch))
    qr_info_style = ParagraphStyle('QRInfo', parent=styles['Normal'], fontSize=8,
                                   textColor=colors.HexColor('#64748B'), leftIndent=5,
                                   rightIndent=5, spaceAfter=5)
    
    qr_info_data = [[
        Paragraph("<b>Report Verification:</b><br/>Scan the QR code above to verify this report's authenticity. "
                 f"Verification Hash: <font name='Courier'>{qr_data['verification_hash']}</font>", qr_info_style)
    ]]
    qr_info_table = Table(qr_info_data, colWidths=[6.8*inch])
    qr_info_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F1F5F9')),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#0ea5e9')),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10)
    ]))
    story.append(qr_info_table)
    
    # Footer with signatures
    story.append(Spacer(1, 0.2*inch))
    
    footer_data = [
        ['', ''],
        ['_____________________', '_____________________'],
        ['Lab Technician', 'Pathologist'],
        ['', ''],
        ['Note: This is a digitally generated report from ABC Hospital NABL-accredited laboratory.', ''],
        [f'Report ID: {result_id[:8].upper()}', f'Generated: {datetime.now(timezone.utc).strftime("%d-%b-%Y %I:%M %p UTC")}']
    ]
    
    footer_table = Table(footer_data, colWidths=[3.4*inch, 3.4*inch])
    footer_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (0, -3), 'LEFT'),
        ('ALIGN', (1, 0), (1, -3), 'RIGHT'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('TEXTCOLOR', (0, 0), (-1, -2), colors.HexColor('#0F172A')),
        ('TEXTCOLOR', (0, -1), (-1, -1), colors.HexColor('#64748B')),
        ('FONTNAME', (0, 1), (-1, 2), 'Helvetica-Bold'),
        ('SPAN', (0, -2), (-1, -2)),
    ]))
    story.append(footer_table)
    
    # Build PDF
    doc.build(story)
    buffer.seek(0)
    return buffer

@api_router.get("/results/{result_id}/report")
async def download_report(result_id: str, current_user: User = Depends(get_current_user)):
    """Generate and download PDF report"""
    # Get result
    result = await db.test_results.find_one({"id": result_id}, {"_id": 0})
    if not result:
        raise HTTPException(status_code=404, detail="Result not found")
    
    # Get patient
    patient = await db.patients.find_one({"id": result['patient_id']}, {"_id": 0})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # Get sample
    sample = await db.samples.find_one({"id": result['sample_id']}, {"_id": 0})
    if not sample:
        raise HTTPException(status_code=404, detail="Sample not found")
    
    # Convert datetime strings
    if isinstance(result['created_at'], str):
        result['created_at'] = datetime.fromisoformat(result['created_at'])
    if isinstance(patient['created_at'], str):
        patient['created_at'] = datetime.fromisoformat(patient['created_at'])
    if isinstance(sample['collection_date'], str):
        sample['collection_date'] = datetime.fromisoformat(sample['collection_date'])
    
    # Generate PDF
    pdf_buffer = generate_pdf_report(patient, sample, [result])
    
    # Log action
    await log_audit(current_user, "DOWNLOAD_REPORT", "test_results", 
                   {"result_id": result_id, "patient_id": patient['id']})
    
    # Return PDF as streaming response
    pdf_buffer.seek(0)
    return StreamingResponse(
        pdf_buffer,
        media_type='application/pdf',
        headers={
            'Content-Disposition': f'attachment; filename="Report_{patient["uhid"]}_{sample["sample_id"]}.pdf"'
        }
    )

# ==================== INCLUDE ROUTER ====================

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()