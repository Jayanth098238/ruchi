@echo off
echo Building frontend...
cd backend\frontend

echo Building Next.js application with Tailwind CSS...
call npm run build

echo Frontend build complete!

echo Starting backend server...
cd ..
python start.py