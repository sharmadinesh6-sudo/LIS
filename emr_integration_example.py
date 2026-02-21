"""
EMR Integration Example for ABC Hospital LIMS
Python integration code for connecting your EMR with Laboratory Information System
"""

import requests
import json
from typing import List, Dict, Optional
from datetime import datetime


class LIMSIntegration:
    """LIMS API Integration Client"""
    
    def __init__(self, base_url: str, email: str, password: str):
        self.base_url = base_url.rstrip('/')
        self.email = email
        self.password = password
        self.token = None
        self.headers = {"Content-Type": "application/json"}
        
    def authenticate(self) -> bool:
        """Login and get access token"""
        try:
            response = requests.post(
                f"{self.base_url}/auth/login",
                json={"email": self.email, "password": self.password}
            )
            response.raise_for_status()
            data = response.json()
            self.token = data['access_token']
            self.headers['Authorization'] = f"Bearer {self.token}"
            print(f"✓ Authenticated as: {data['user']['name']}")
            return True
        except Exception as e:
            print(f"✗ Authentication failed: {e}")
            return False
    
    def register_patient(self, emr_patient_id: str, name: str, age: int, 
                        gender: str, phone: str, email: str = None, 
                        address: str = None, patient_type: str = "OPD") -> Dict:
        """
        Register patient from EMR
        Returns: {"uhid": "UHID000001", "patient_id": "uuid", ...}
        """
        payload = {
            "emr_patient_id": emr_patient_id,
            "name": name,
            "age": age,
            "gender": gender,
            "phone": phone,
            "email": email,
            "address": address,
            "patient_type": patient_type
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/emr/patient/register",
                headers=self.headers,
                json=payload
            )
            response.raise_for_status()
            result = response.json()
            print(f"✓ Patient registered: {result['uhid']} - {name}")
            return result
        except Exception as e:
            print(f"✗ Patient registration failed: {e}")
            raise
    
    def create_lab_order(self, emr_order_id: str, uhid: str, 
                        sample_type: str, test_codes: List[str],
                        ordered_by: str, priority: str = "routine") -> Dict:
        """
        Create lab order from doctor's prescription
        Returns: {"sample_id": "SMP00000001", "barcode": "...", ...}
        """
        payload = {
            "emr_order_id": emr_order_id,
            "uhid": uhid,
            "sample_type": sample_type,
            "test_codes": test_codes,
            "ordered_by": ordered_by,
            "priority": priority
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/emr/lab-order/create",
                headers=self.headers,
                json=payload
            )
            response.raise_for_status()
            result = response.json()
            print(f"✓ Lab order created: {result['sample_id']}")
            return result
        except Exception as e:
            print(f"✗ Lab order creation failed: {e}")
            raise
    
    def create_lab_order_with_new_patient(self, emr_order_id: str,
                                         patient_data: Dict, sample_type: str,
                                         test_codes: List[str], ordered_by: str) -> Dict:
        """Create lab order with new patient registration in one call"""
        payload = {
            "emr_order_id": emr_order_id,
            "patient_details": patient_data,
            "sample_type": sample_type,
            "test_codes": test_codes,
            "ordered_by": ordered_by,
            "priority": "routine"
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/emr/lab-order/create",
                headers=self.headers,
                json=payload
            )
            response.raise_for_status()
            result = response.json()
            print(f"✓ Patient & Lab order created: {result['uhid']} / {result['sample_id']}")
            return result
        except Exception as e:
            print(f"✗ Lab order with patient failed: {e}")
            raise
    
    def get_patient_by_uhid(self, uhid: str) -> Dict:
        """Get patient details by UHID"""
        try:
            response = requests.get(
                f"{self.base_url}/emr/patient/{uhid}",
                headers=self.headers
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"✗ Failed to get patient: {e}")
            raise
    
    def get_sample_status(self, sample_id: str) -> Dict:
        """Get sample status"""
        try:
            response = requests.get(
                f"{self.base_url}/emr/sample/status/{sample_id}",
                headers=self.headers
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"✗ Failed to get sample status: {e}")
            raise
    
    def get_patient_results(self, patient_id: str) -> List[Dict]:
        """Get all test results for a patient"""
        try:
            response = requests.get(
                f"{self.base_url}/emr/results/patient/{patient_id}",
                headers=self.headers
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"✗ Failed to get results: {e}")
            raise
    
    def download_report(self, result_id: str, save_path: str) -> bool:
        """Download PDF report"""
        try:
            response = requests.get(
                f"{self.base_url}/results/{result_id}/report",
                headers=self.headers
            )
            response.raise_for_status()
            
            with open(save_path, 'wb') as f:
                f.write(response.content)
            print(f"✓ Report downloaded: {save_path}")
            return True
        except Exception as e:
            print(f"✗ Failed to download report: {e}")
            return False


# ==================== EXAMPLE USAGE ====================

def main():
    """Example: Complete EMR to LIMS integration flow"""
    
    # Initialize LIMS client
    lims = LIMSIntegration(
        base_url="https://nabl-compliance-lab.preview.emergentagent.com/api",
        email="admin@lab.com",
        password="admin123"
    )
    
    # Step 1: Authenticate
    if not lims.authenticate():
        return
    
    print("\n" + "="*60)
    print("SCENARIO 1: Existing Patient + Lab Order")
    print("="*60)
    
    # Step 2: Register patient (if new)
    patient = lims.register_patient(
        emr_patient_id="EMR-PAT-001",
        name="Rajesh Kumar",
        age=45,
        gender="male",
        phone="+91-9876543210",
        email="rajesh.kumar@email.com",
        address="Sector 15, Panipat, Haryana",
        patient_type="OPD"
    )
    
    uhid = patient['uhid']
    patient_id = patient['patient_id']
    
    # Step 3: Doctor orders lab tests
    lab_order = lims.create_lab_order(
        emr_order_id="EMR-ORD-12345",
        uhid=uhid,
        sample_type="Blood",
        test_codes=["CBC001"],  # CBC test
        ordered_by="Dr. Sharma",
        priority="routine"
    )
    
    sample_id = lab_order['sample_id']
    print(f"\nSample ID: {sample_id}")
    print(f"Barcode: {lab_order['barcode']}")
    print(f"TAT Deadline: {lab_order['tat_deadline']}")
    
    # Step 4: Check sample status
    print("\n" + "="*60)
    print("Checking Sample Status...")
    print("="*60)
    
    status = lims.get_sample_status(sample_id)
    print(f"Status: {status['status']}")
    print(f"Patient: {status['patient_name']} ({status['uhid']})")
    
    # Step 5: Get results (when ready)
    print("\n" + "="*60)
    print("Fetching Patient Results...")
    print("="*60)
    
    results = lims.get_patient_results(patient_id)
    print(f"Total Results: {len(results)}")
    
    for result in results:
        print(f"\n  Test: {result['test_name']}")
        print(f"  Status: {result['status']}")
        print(f"  Has Critical: {result['has_critical_values']}")
        
        # Download report if finalized
        if result['status'] == 'finalized':
            filename = f"report_{uhid}_{result['id'][:8]}.pdf"
            lims.download_report(result['id'], filename)
    
    print("\n" + "="*60)
    print("SCENARIO 2: New Patient + Lab Order (Single Call)")
    print("="*60)
    
    # Combined registration + lab order
    new_order = lims.create_lab_order_with_new_patient(
        emr_order_id="EMR-ORD-12346",
        patient_data={
            "emr_patient_id": "EMR-PAT-002",
            "name": "Sunita Devi",
            "age": 38,
            "gender": "female",
            "phone": "+91-9876543211",
            "email": "sunita.devi@email.com",
            "patient_type": "IPD"
        },
        sample_type="Blood",
        test_codes=["CBC001"],
        ordered_by="Dr. Verma"
    )
    
    print(f"\nNew UHID: {new_order['uhid']}")
    print(f"Sample ID: {new_order['sample_id']}")
    print(f"Patient: {new_order['patient_name']}")


if __name__ == "__main__":
    main()
