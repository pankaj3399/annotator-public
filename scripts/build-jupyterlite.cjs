// scripts/build-jupyterlite.cjs - Works in both dev and production
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const projectRoot = path.resolve(__dirname, '..');
const publicDir = path.join(projectRoot, 'public');
const jupyterLiteDir = path.join(publicDir, 'jupyterlite');

// Create output directory
if (!fs.existsSync(jupyterLiteDir)) {
  fs.mkdirSync(jupyterLiteDir, { recursive: true });
}

// Detect environment - isVercel will be true in Vercel production
const isVercel = process.env.VERCEL === '1';

// Try to build with Python if not on Vercel, fallback to iframe if needed
if (!isVercel) {
  try {
    // Try to build with Python in development
    console.log('Attempting to build JupyterLite with Python...');
    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
    
    // Create config file for JupyterLite
    const configPath = path.join(projectRoot, 'jupyter_lite_config.json');
    const config = {
      "LiteBuildConfig": {
        "output_dir": "public/jupyterlite",
        "skip_unused_packages": true,
        "piplite_wheels": [
          "numpy",
          "pandas",
          "matplotlib"
        ],
        "federated_extensions": [
          "@jupyterlab/cell-toolbar-extension"
        ],
        "ignore_sys_prefix": true,
        "include_source": false,
        "no_libsass": true,
        "no_mathjax_dir": true
      }
    };
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    
    try {
      // Install JupyterLite if needed
      execSync(`${pythonCmd} -m pip install jupyterlite`, { stdio: 'inherit' });
      
      // Build JupyterLite with config
      execSync(`${pythonCmd} -m jupyter lite build --config ${configPath}`, { stdio: 'inherit' });
      
      console.log('JupyterLite build completed successfully!');
      return; // Exit if successful
    } catch (err) {
      console.error('Error building JupyterLite with Python:', err);
      console.log('Falling back to iframe method...');
    }
  } catch (err) {
    console.log('Python not available, using iframe fallback...');
  }
}

// If we reach here, either we're on Vercel or Python build failed
console.log('Creating JupyterLite iframe integration...');
createIframeFallback();

function createIframeFallback() {
  console.log('Setting up JupyterLite directories...');
  
  // Create directory structure
  ['repl', 'lab'].forEach(dir => {
    const dirPath = path.join(jupyterLiteDir, dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  });
  
  // Create index.html redirect
  const indexHtml = `<!DOCTYPE html>
<html><head><meta http-equiv="refresh" content="0;URL='./repl/index.html'" /></head>
<body><p>Redirecting to JupyterLite...</p></body></html>`;
  
  fs.writeFileSync(path.join(jupyterLiteDir, 'index.html'), indexHtml);
  
  // Create REPL HTML with loading indicator
  const replHtml = `<!DOCTYPE html>
<html>
<head>
  <title>JupyterLite REPL</title>
  <style>
    body, html { margin:0; padding:0; height:100%; width:100%; overflow:hidden; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; }
    iframe { border:none; height:100%; width:100%; }
    .loading { 
      display: flex; 
      flex-direction: column;
      justify-content: center; 
      align-items: center; 
      height: 100%; 
      background-color: #f9f9f9;
    }
    .spinner {
      width: 40px;
      height: 40px;
      margin-bottom: 20px;
      border: 4px solid rgba(0, 0, 0, 0.1);
      border-radius: 50%;
      border-left-color: #3367d6;
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  </style>
</head>
<body>
  <div id="loading" class="loading">
    <div class="spinner"></div>
    <div>Loading JupyterLite REPL...</div>
  </div>
  <iframe id="jupyter-frame" src="https://jupyterlite.github.io/demo/repl/index.html?kernel=python&toolbar=1" style="display:none;" 
    onload="document.getElementById('loading').style.display='none';this.style.display='block';"></iframe>
</body>
</html>`;
  
  // Create Lab HTML with loading indicator
  const labHtml = `<!DOCTYPE html>
<html>
<head>
  <title>JupyterLite Lab</title>
  <style>
    body, html { margin:0; padding:0; height:100%; width:100%; overflow:hidden; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; }
    iframe { border:none; height:100%; width:100%; }
    .loading { 
      display: flex; 
      flex-direction: column;
      justify-content: center; 
      align-items: center; 
      height: 100%; 
      background-color: #f9f9f9;
    }
    .spinner {
      width: 40px;
      height: 40px;
      margin-bottom: 20px;
      border: 4px solid rgba(0, 0, 0, 0.1);
      border-radius: 50%;
      border-left-color: #3367d6;
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  </style>
</head>
<body>
  <div id="loading" class="loading">
    <div class="spinner"></div>
    <div>Loading JupyterLite Lab...</div>
  </div>
  <iframe id="jupyter-frame" src="https://jupyterlite.github.io/demo/lab/index.html" style="display:none;" 
    onload="document.getElementById('loading').style.display='none';this.style.display='block';"></iframe>
</body>
</html>`;
  
  fs.writeFileSync(path.join(jupyterLiteDir, 'repl/index.html'), replHtml);
  fs.writeFileSync(path.join(jupyterLiteDir, 'lab/index.html'), labHtml);
  
  console.log('JupyterLite integration completed successfully');
}