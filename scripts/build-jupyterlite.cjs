const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Create directories if they don't exist
const scriptsDir = path.join(__dirname);
const projectRoot = path.join(scriptsDir, '..');
const publicDir = path.join(projectRoot, 'public');
const jupyterLiteDir = path.join(publicDir, 'jupyterlite');

// Ensure public directory exists
if (!fs.existsSync(publicDir)) {
  console.log('Creating public directory...');
  fs.mkdirSync(publicDir, { recursive: true });
}

// Check if Python and JupyterLite are installed
try {
  console.log('Checking for Python installation...');
  execSync('python --version', { stdio: 'inherit' });
} catch (error) {
  try {
    console.log('Trying with python3...');
    execSync('python3 --version', { stdio: 'inherit' });
  } catch (error) {
    console.error('\nError: Python is not installed or not in PATH');
    console.error('Please install Python 3.7+ and try again.\n');
    process.exit(1);
  }
}

// Instead of building JupyterLite directly, copy from the demo site
console.log('Creating JupyterLite directory structure...');

const createDirectories = [
  jupyterLiteDir,
  path.join(jupyterLiteDir, 'repl'),
  path.join(jupyterLiteDir, 'lab')
];

createDirectories.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Create a simple redirect index file
const indexHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>JupyterLite</title>
  <meta http-equiv="refresh" content="0;URL='./repl/index.html'" />
</head>
<body>
  <p>Redirecting to JupyterLite REPL...</p>
  <p>If you are not redirected automatically, follow this <a href="./repl/index.html">link to JupyterLite REPL</a>.</p>
</body>
</html>
`;

fs.writeFileSync(path.join(jupyterLiteDir, 'index.html'), indexHtml);

// Create an iframe HTML that embeds the JupyterLite demo site
const replHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>JupyterLite REPL</title>
  <style>
    body, html {
      height: 100%;
      margin: 0;
      padding: 0;
      overflow: hidden;
    }
    iframe {
      width: 100%;
      height: 100%;
      border: none;
    }
  </style>
</head>
<body>
  <iframe src="https://jupyterlite.github.io/demo/repl/index.html?kernel=python&toolbar=1" allowfullscreen></iframe>
</body>
</html>
`;

const labHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>JupyterLite Lab</title>
  <style>
    body, html {
      height: 100%;
      margin: 0;
      padding: 0;
      overflow: hidden;
    }
    iframe {
      width: 100%;
      height: 100%;
      border: none;
    }
  </style>
</head>
<body>
  <iframe src="https://jupyterlite.github.io/demo/lab/index.html" allowfullscreen></iframe>
</body>
</html>
`;

fs.writeFileSync(path.join(jupyterLiteDir, 'repl/index.html'), replHtml);
fs.writeFileSync(path.join(jupyterLiteDir, 'lab/index.html'), labHtml);

console.log('\nJupyterLite setup complete!');
console.log(`Files are available in: ${jupyterLiteDir}`);
console.log('\nYou can access JupyterLite at:');
console.log('- REPL: /jupyterlite/repl/index.html');
console.log('- Lab: /jupyterlite/lab/index.html');