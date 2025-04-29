// scripts/build-jupyterlite.js - Optimized for Vercel
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');
const publicDir = path.join(projectRoot, 'public');
const jupyterLiteDir = path.join(publicDir, 'jupyterlite');

// Create output directory
if (!fs.existsSync(jupyterLiteDir)) {
  fs.mkdirSync(jupyterLiteDir, { recursive: true });
}

// Create minimized config file for JupyterLite
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
    "mathjax_dir": "",
    "no_libsass": true,
    "no_mathjax_dir": true
  }
};

fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

// Check for Python
try {
  console.log('Building JupyterLite (optimized for Vercel)...');
  
  // Use Python if available
  const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
  
  try {
    // Install JupyterLite if needed
    execSync(`${pythonCmd} -m pip install jupyterlite`, { stdio: 'inherit' });
    
    // Build JupyterLite with optimized config
    execSync(`${pythonCmd} -m jupyter lite build --config ${configPath}`, { stdio: 'inherit' });
    
    console.log('JupyterLite build completed successfully!');
  } catch (err) {
    console.error('Error building JupyterLite:', err);
    
    // Fallback to iframe if build fails
    createIframeFallback();
  }
} catch (err) {
  console.error('Python not available, using iframe fallback');
  createIframeFallback();
}

// Create fallback if build fails
function createIframeFallback() {
  console.log('Creating iframe fallback...');
  
  // Create directory structure
  ['repl', 'lab'].forEach(dir => {
    const dirPath = path.join(jupyterLiteDir, dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  });
  
  // Create HTML files
  const indexHtml = `<!DOCTYPE html>
<html><head><meta http-equiv="refresh" content="0;URL='./repl/index.html'" /></head>
<body><p>Redirecting to JupyterLite...</p></body></html>`;
  
  fs.writeFileSync(path.join(jupyterLiteDir, 'index.html'), indexHtml);
  
  // Create REPL and Lab HTML files that use iframes as a fallback
  const replHtml = `<!DOCTYPE html>
<html><head><title>JupyterLite REPL</title><style>body, iframe {margin:0; padding:0; height:100%; width:100%; border:none; overflow:hidden;}</style></head>
<body><iframe src="https://jupyterlite.github.io/demo/repl/index.html?kernel=python&toolbar=1"></iframe></body></html>`;
  
  const labHtml = `<!DOCTYPE html>
<html><head><title>JupyterLite Lab</title><style>body, iframe {margin:0; padding:0; height:100%; width:100%; border:none; overflow:hidden;}</style></head>
<body><iframe src="https://jupyterlite.github.io/demo/lab/index.html"></iframe></body></html>`;
  
  fs.writeFileSync(path.join(jupyterLiteDir, 'repl/index.html'), replHtml);
  fs.writeFileSync(path.join(jupyterLiteDir, 'lab/index.html'), labHtml);
  
  console.log('Fallback created successfully');
}