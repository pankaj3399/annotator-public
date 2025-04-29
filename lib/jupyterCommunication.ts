/**
 * Utility functions for communicating with JupyterLite iframe
 */

/**
 * Safely escapes CSV content for embedding in Python code
 */
function escapeCSVForPython(csv: string): string {
    return csv
      .replace(/\\/g, '\\\\')  // Escape backslashes
      .replace(/"""/g, '\\"\\"\\"')  // Escape triple quotes
      .replace(/\n/g, '\\n');  // Escape newlines
  }
  
  /**
   * Sends CSV data to JupyterLite iframe for analysis
   * 
   * @param iframe - Reference to the JupyterLite iframe
   * @param csvContent - The CSV content as a string
   * @param filename - Optional filename for display purposes
   * @returns A promise that resolves when the message is sent
   */
  export function sendCSVToJupyterLite(
    iframe: HTMLIFrameElement | null,
    csvContent: string,
    filename: string = 'data.csv'
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!iframe || !iframe.contentWindow) {
        reject(new Error('Iframe not available'));
        return;
      }
  
      // Wait for the iframe to be properly loaded
      if (iframe.contentDocument?.readyState !== 'complete') {
        iframe.onload = () => {
          sendMessageToJupyter();
          resolve();
        };
      } else {
        sendMessageToJupyter();
        resolve();
      }
  
      function sendMessageToJupyter() {
        const escapedCSV = escapeCSVForPython(csvContent);
        
        // For REPL interface
        const pythonCode = `
  import pandas as pd
  import numpy as np
  import matplotlib.pyplot as plt
  import io
  
  # Load CSV data
  csv_data = """${escapedCSV}"""
  df = pd.read_csv(io.StringIO(csv_data))
  
  # Display basic information
  print(f"Loaded '{filename}' with {df.shape[0]} rows and {df.shape[1]} columns")
  print("\\nColumn names:")
  print(df.columns.tolist())
  print("\\nFirst 5 rows:")
  df.head()
  `;
  
        // Send the code to the iframe
        iframe.contentWindow?.postMessage({
          type: 'execute',
          code: pythonCode
        }, '*');
      }
    });
  }
  
  /**
   * Sets up a listener for messages from the JupyterLite iframe
   * 
   * @param callback - Function to call when a message is received
   * @returns A cleanup function to remove the event listener
   */
  export function setupJupyterListener(
    callback: (data: any) => void
  ): () => void {
    const handleMessage = (event: MessageEvent) => {
      // Filter for messages from JupyterLite
      if (
        event.data && 
        (event.data.type === 'jupyterlite:result' || 
         event.data.type === 'execute_result')
      ) {
        callback(event.data);
      }
    };
  
    window.addEventListener('message', handleMessage);
    
    // Return a cleanup function
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }
  
  /**
   * Creates a new notebook in JupyterLite with the provided CSV data
   * 
   * @param iframe - Reference to the JupyterLite iframe
   * @param csvContent - The CSV content as a string
   * @param filename - Optional filename for the notebook
   */
  export function createNotebookWithCSV(
    iframe: HTMLIFrameElement | null,
    csvContent: string,
    filename: string = 'data_analysis'
  ): void {
    if (!iframe || !iframe.contentWindow) {
      console.error('Iframe not available');
      return;
    }
  
    const escapedCSV = escapeCSVForPython(csvContent);
    
    // This function works when targeting the Lab interface (not the REPL)
    const notebookCreationScript = `
    (function() {
      // Create a new notebook
      const notebookPath = '${filename}.ipynb';
      
      // Define the notebook content with the CSV data pre-loaded
      const notebookContent = {
        metadata: {
          kernelspec: {
            display_name: "Python 3",
            language: "python",
            name: "python3"
          }
        },
        nbformat: 4,
        nbformat_minor: 5,
        cells: [
          {
            cell_type: "markdown",
            metadata: {},
            source: "# Data Analysis for ${filename}"
          },
          {
            cell_type: "code",
            metadata: {},
            source: \`import pandas as pd\\nimport numpy as np\\nimport matplotlib.pyplot as plt\\nimport io\\n\\n# Load the CSV data\\ncsv_data = """${escapedCSV}"""\\ndf = pd.read_csv(io.StringIO(csv_data))\\n\\n# Display the first few rows\\ndf.head()\`,
            execution_count: null,
            outputs: []
          },
          {
            cell_type: "markdown",
            metadata: {},
            source: "## Basic Statistics"
          },
          {
            cell_type: "code",
            metadata: {},
            source: "# Display summary statistics\\ndf.describe()",
            execution_count: null,
            outputs: []
          },
          {
            cell_type: "markdown",
            metadata: {},
            source: "## Data Visualization"
          },
          {
            cell_type: "code",
            metadata: {},
            source: "# Create a plot\\nplt.figure(figsize=(10, 6))\\n\\n# Modify this code based on your data structure\\nif 'date' in df.columns:\\n    plt.plot(df['date'])\\nelif df.select_dtypes(include=[np.number]).columns.size > 0:\\n    numeric_col = df.select_dtypes(include=[np.number]).columns[0]\\n    plt.plot(df[numeric_col])\\n\\nplt.title('Data Visualization')\\nplt.grid(True)\\nplt.show()",
            execution_count: null,
            outputs: []
          }
        ]
      };
      
      // Use the JupyterLab API to create and open the notebook
      if (window.jupyterapp) {
        const contents = window.jupyterapp.serviceManager.contents;
        
        contents.save(notebookPath, {
          type: 'notebook',
          format: 'json',
          content: notebookContent
        }).then((model) => {
          // Open the notebook
          window.jupyterapp.commands.execute('docmanager:open', {
            path: model.path
          });
        });
      }
    })();
    `;
  
    // Send the script to the iframe
    iframe.contentWindow.postMessage({
      type: 'script',
      script: notebookCreationScript
    }, '*');
  }