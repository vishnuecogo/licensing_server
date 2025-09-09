#!/usr/bin/env python3
"""
Script to run database migrations for the licensing server.
"""

import sys
import os

# Add the current directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from migrations.add_model_specific_tracking import run_migration, rollback_migration

def main():
    """Main function to run migrations"""
    if len(sys.argv) > 1:
        command = sys.argv[1].lower()
        
        if command == "rollback":
            print("🔄 Rolling back model-specific tracking migration...")
            rollback_migration()
        elif command == "migrate":
            print("🚀 Running model-specific tracking migration...")
            run_migration()
        else:
            print("❌ Unknown command. Use 'migrate' or 'rollback'")
            sys.exit(1)
    else:
        print("🚀 Running model-specific tracking migration...")
        run_migration()

if __name__ == "__main__":
    main()
