@echo off
echo Starting CASHedi Development Server...
echo Increasing Node.js memory limit to prevent out of memory errors...

set NODE_OPTIONS=--max-old-space-size=8192
ng serve --host 0.0.0.0 --port 4200 --hmr=false --source-map=false --optimization=false

pause
