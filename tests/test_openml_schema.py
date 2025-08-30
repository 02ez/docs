#!/usr/bin/env python3
"""
OpenML Dataset Schema Validation Test

Tests the OpenML dataset structure and content to ensure it meets expected schema.
Validates row count, column count, and data integrity.
"""

import pandas as pd
import requests
from io import BytesIO
import sys

def test_openml_dataset():
    """Test OpenML dataset schema and structure"""
    url = "https://data.openml.org/datasets/0004/46500/dataset_46500.pq"
    
    try:
        print("📥 Downloading OpenML dataset...")
        # Download dataset with timeout
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        
        print("📊 Reading parquet data...")
        # Read parquet data
        df = pd.read_parquet(BytesIO(response.content))
        
        print(f"📋 Dataset shape: {df.shape}")
        print(f"📋 Columns: {list(df.columns)}")
        
        # Validate schema requirements
        assert df.shape[0] == 2069, f"❌ Expected 2069 rows, got {df.shape[0]}"
        assert df.shape[1] == 9, f"❌ Expected 9 columns, got {df.shape[1]}"
        
        # Check for nulls
        null_count = df.isnull().sum().sum()
        assert null_count == 0, f"❌ Found {null_count} null values in dataset"
        
        print(f"✅ Dataset validation passed:")
        print(f"   - Rows: {df.shape[0]} ✓")
        print(f"   - Columns: {df.shape[1]} ✓") 
        print(f"   - Null values: {null_count} ✓")
        
        return True
        
    except requests.RequestException as e:
        print(f"❌ Network error downloading dataset: {e}")
        sys.exit(1)
    except pd.errors.ParserError as e:
        print(f"❌ Error parsing parquet file: {e}")
        sys.exit(1)
    except AssertionError as e:
        print(f"❌ Schema validation failed: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    print("🔍 Starting OpenML dataset schema validation...")
    test_openml_dataset()
    print("🎉 Schema validation completed successfully")