#!/usr/bin/env python3
"""
Clean Project Script - Removes unnecessary files and keeps only essential ones
"""

import os
import shutil
import subprocess

def clean_project():
    print("🧹 Cleaning up project...")
    
    # Files to keep (essential)
    essential_files = [
        'app/',
        'requirements.txt',
        'start.py',
        'README.md'
    ]
    
    # Files to remove (unnecessary)
    files_to_remove = [
        'run.bat',
        'build_and_run.py', 
        'Dockerfile',
        'frontend/.next/',
        'frontend/node_modules/',
        'frontend/.git/',
        'frontend/package-lock.json',
        'frontend/next-env.d.ts',
        'frontend/postcss.config.mjs',
        'frontend/eslint.config.mjs',
        'frontend/tsconfig.json',
        'frontend/README.md',
        'frontend/.gitignore'
    ]
    
    # Remove unnecessary files
    for file_path in files_to_remove:
        if os.path.exists(file_path):
            try:
                if os.path.isdir(file_path):
                    shutil.rmtree(file_path, ignore_errors=True)
                else:
                    os.remove(file_path)
                print(f"✅ Removed: {file_path}")
            except Exception as e:
                print(f"⚠️  Could not remove {file_path}: {e}")
    
    # Keep only essential frontend files
    frontend_essential = [
        'frontend/app/',
        'frontend/package.json',
        'frontend/public/',
        'frontend/out/'
    ]
    
    print("\n📁 Project cleaned! Essential files kept:")
    for item in essential_files + frontend_essential:
        if os.path.exists(item):
            print(f"✅ {item}")
    
    print("\n🚀 Project is now clean and ready to use!")
    print("To run the project:")
    print("1. cd backend")
    print("2. python start.py")

if __name__ == "__main__":
    clean_project()

