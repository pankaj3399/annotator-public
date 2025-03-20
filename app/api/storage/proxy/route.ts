// app/api/storage/proxy/route.ts
import { NextRequest, NextResponse } from "next/server";

/**
 * Proxy for reliable Google Drive CSV file access
 */
export async function GET(request: NextRequest) {
  try {
    // Parse the request URL
    const url = new URL(request.url);
    const fileUrl = url.searchParams.get("url");
    
    if (!fileUrl) {
      return NextResponse.json({ error: "File URL is required" }, { status: 400 });
    }

    console.log("Original requested URL:", fileUrl);
    
    // Check if this is a Google Drive URL
    const isGoogleDrive = fileUrl.includes('drive.google.com') || fileUrl.includes('docs.google.com');
    
    // If not Google Drive, proxy directly
    if (!isGoogleDrive) {
      console.log("Not a Google Drive URL, proxying directly");
      return proxyNonGoogleUrl(fileUrl);
    }
    
    // For Google Sheets with export=csv, use a different approach
    if (fileUrl.includes('spreadsheets/d/') && fileUrl.includes('export=csv')) {
      console.log("Google Sheet with export=csv detected");
      const sheetId = extractFileId(fileUrl);
      if (!sheetId) {
        return NextResponse.json({ error: "Could not extract Sheet ID" }, { status: 400 });
      }
      
      // Use the direct export API for Google Sheets
      const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
      console.log("Using Sheets export URL:", exportUrl);
      return proxyNonGoogleUrl(exportUrl);
    }
    
    // For regular Google Drive files
    // Extract the file ID
    const fileId = extractFileId(fileUrl);
    if (!fileId) {
      return NextResponse.json({ error: "Could not extract file ID from URL" }, { status: 400 });
    }
    
    console.log("Extracted file ID:", fileId);
    
    // Try multiple methods to get the file
    return await tryMultipleDownloadMethods(fileId);
    
  } catch (error) {
    console.error("Proxy error:", error);
    return NextResponse.json({ 
      error: "Failed to proxy file: " + (error instanceof Error ? error.message : String(error))
    }, { status: 500 });
  }
}

/**
 * Extract file ID from various Google Drive URL formats
 */
function extractFileId(url: string): string | null {
  let fileId = null;
  
  // Format: https://drive.google.com/file/d/FILE_ID/view
  const filePathMatch = url.match(/\/file\/d\/([^/]+)/);
  if (filePathMatch && filePathMatch[1]) {
    return filePathMatch[1];
  }
  
  // Format: https://drive.google.com/open?id=FILE_ID
  const openIdMatch = url.match(/[?&]id=([^&]+)/);
  if (openIdMatch && openIdMatch[1]) {
    return openIdMatch[1];
  }
  
  // Format: https://drive.google.com/uc?id=FILE_ID
  const ucIdMatch = url.match(/[?&]id=([^&]+)/);
  if (ucIdMatch && ucIdMatch[1]) {
    return ucIdMatch[1];
  }
  
  // Format: https://docs.google.com/spreadsheets/d/FILE_ID/edit
  const sheetMatch = url.match(/\/spreadsheets\/d\/([^/]+)/);
  if (sheetMatch && sheetMatch[1]) {
    return sheetMatch[1];
  }
  
  return fileId;
}

/**
 * Try multiple methods to download a Google Drive file
 */
async function tryMultipleDownloadMethods(fileId: string) {
  // Method 1: Direct export with confirm parameter
  try {
    console.log("Method 1: Direct export with confirm parameter");
    const directUrl = `https://drive.google.com/uc?export=download&id=${fileId}&confirm=t`;
    
    const response = await fetch(directUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/csv,application/csv,*/*',
        'Cache-Control': 'no-cache'
      }
    });
    
    if (!response.ok) {
      console.log("Method 1 failed:", response.status, response.statusText);
      throw new Error(`Direct export failed: ${response.status}`);
    }
    
    const content = await response.text();
    
    // If we got HTML, we need to try another method
    if (isHtmlContent(content)) {
      console.log("Method 1 returned HTML, trying to extract confirmation token");
      
      // Try to extract confirmation token
      const confirmMatch = content.match(/confirm=([0-9a-zA-Z]+)/);
      if (confirmMatch && confirmMatch[1]) {
        // Method 2: Use extracted confirmation token
        const confirmToken = confirmMatch[1];
        console.log("Method 2: Using extracted confirmation token:", confirmToken);
        
        const confirmUrl = `https://drive.google.com/uc?export=download&id=${fileId}&confirm=${confirmToken}`;
        return await tryConfirmUrl(confirmUrl);
      }
      
      // Check for warnings
      if (content.includes("too large") || content.includes("virus scan")) {
        console.log("File is too large or needs virus scan confirmation");
        
        // Method 3: Try the alternate export API
        console.log("Method 3: Using alternate export API");
        return await tryAlternateExportApi(fileId);
      }
      
      // Method 4: Try without any parameters
      console.log("Method 4: Using simple uc endpoint");
      const simpleUrl = `https://drive.google.com/uc?id=${fileId}`;
      return await tryConfirmUrl(simpleUrl);
    }
    
    // Verify content is actually CSV before returning
    if (isValidCsvContent(content)) {
      console.log("Method 1 succeeded with valid CSV content");
      return createCsvResponse(content);
    } else {
      console.log("Method 1 returned non-CSV content, trying alternate methods");
      throw new Error("Received non-CSV content");
    }
    
  } catch (error) {
    console.error("All direct methods failed:", error);
    
    // Last resort: Try the alternate export API
    try {
      console.log("Final attempt: Using alternate export API");
      return await tryAlternateExportApi(fileId);
    } catch (finalError) {
      console.error("All methods failed:", finalError);
      return NextResponse.json({ 
        error: "Could not access Google Drive file after multiple attempts" 
      }, { status: 400 });
    }
  }
}
// Enhanced createCsvResponse function for better CSV response handling
function createCsvResponse(content: string) {
  // Generate a random filename to avoid caching issues
  const timestamp = new Date().getTime();
  const filename = `download-${timestamp}.csv`;
  
  return new NextResponse(content, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  });
}

/**
 * Verify the content is actually a valid CSV
 */
function isValidCsvContent(content: string): boolean {
  // Quick validation to ensure we actually got CSV-like content
  // 1. Trim any BOM or whitespace
  const trimmed = content.trim().replace(/^\uFEFF/, '');
  
  // 2. Check if empty
  if (!trimmed) return false;
  
  // 3. Check for at least one comma or tab (simple heuristic)
  if (!trimmed.includes(',') && !trimmed.includes('\t')) {
    // Special case: single column CSV would have newlines but no commas
    if (trimmed.includes('\n') || trimmed.includes('\r')) {
      // Make sure it's not HTML with newlines
      return !isHtmlContent(trimmed);
    }
    return false;
  }
  
  // 4. Check for too many HTML-like characteristics
  if (isHtmlContent(trimmed)) return false;
  
  // 5. Check for common CSV structure (rows end with newlines)
  const hasNewlines = trimmed.includes('\n') || trimmed.includes('\r');
  
  return hasNewlines;
}

/**
 * Try a URL with confirmation parameter
 */
async function tryConfirmUrl(url: string) {
  console.log("Trying URL with confirm parameter:", url);
  
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'text/csv,application/csv,*/*',
      'Cache-Control': 'no-cache'
    }
  });
  
  if (!response.ok) {
    console.log("Confirm URL failed:", response.status, response.statusText);
    throw new Error(`Confirm URL failed: ${response.status}`);
  }
  
  const content = await response.text();
  
  // If we still got HTML, we need to give up on this method
  if (isHtmlContent(content)) {
    console.log("Still received HTML with confirm parameter");
    throw new Error("Still received HTML with confirm parameter");
  }
  
  // Verify content is actually CSV
  if (!isValidCsvContent(content)) {
    console.log("Confirm URL returned non-CSV content");
    throw new Error("Received non-CSV content from confirm URL");
  }
  
  // Return the content
  console.log("Confirm URL succeeded with CSV content");
  return createCsvResponse(content);
}

/**
 * Try the alternate export API
 */
async function tryAlternateExportApi(fileId: string) {
  console.log("Trying alternate export API for file ID:", fileId);
  
  // For large files, try the alternate API
  const exportApiUrl = `https://drive.google.com/uc?export=download&id=${fileId}&confirm=t&uuid=${Date.now()}`;
  
  const response = await fetch(exportApiUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'text/csv,application/csv,*/*'
    }
  });
  
  if (!response.ok) {
    console.log("Alternate API failed:", response.status, response.statusText);
    throw new Error(`Alternate API failed: ${response.status}`);
  }
  
  const content = await response.text();
  
  // Final check for HTML
  if (isHtmlContent(content)) {
    console.log("Alternate API returned HTML");
    
    // One last attempt for Google Sheets specifically
    if (content.includes("Google Sheets") || content.includes("spreadsheet")) {
      console.log("Detected possible Google Sheet, trying Sheets-specific export");
      const sheetsExportUrl = `https://docs.google.com/spreadsheets/d/${fileId}/export?format=csv`;
      
      const sheetsResponse = await fetch(sheetsExportUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/csv,application/csv,*/*'
        }
      });
      
      if (!sheetsResponse.ok) {
        throw new Error(`Sheets export failed: ${sheetsResponse.status}`);
      }
      
      const sheetsContent = await sheetsResponse.text();
      
      if (isHtmlContent(sheetsContent)) {
        throw new Error("Still received HTML from Sheets export");
      }
      
      if (!isValidCsvContent(sheetsContent)) {
        throw new Error("Sheets export returned non-CSV content");
      }
      
      return createCsvResponse(sheetsContent);
    }
    
    throw new Error("All methods returned HTML instead of CSV data");
  }
  
  // Verify content is actually CSV
  if (!isValidCsvContent(content)) {
    console.log("Alternate API returned non-CSV content");
    throw new Error("Received non-CSV content from alternate API");
  }
  
  // Return the content
  console.log("Alternate API succeeded with CSV content");
  return createCsvResponse(content);
}

/**
 * Proxy a non-Google URL directly
 */
async function proxyNonGoogleUrl(url: string) {
  console.log("Proxying non-Google URL:", url);
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/csv,application/csv,*/*'
      }
    });
    
    if (!response.ok) {
      return NextResponse.json({ 
        error: `Failed to fetch URL: ${response.status} ${response.statusText}`
      }, { status: response.status });
    }
    
    const content = await response.text();
    
    // Check if we got HTML instead of a CSV
    if (isHtmlContent(content)) {
      return NextResponse.json({
        error: "Received HTML instead of CSV data."
      }, { status: 400 });
    }
    
    // Verify content is actually CSV
    if (!isValidCsvContent(content)) {
      return NextResponse.json({
        error: "URL did not return valid CSV data."
      }, { status: 400 });
    }
    
    return createCsvResponse(content);
  } catch (error) {
    console.error("Error proxying non-Google URL:", error);
    return NextResponse.json({ 
      error: "Failed to proxy URL: " + (error instanceof Error ? error.message : String(error))
    }, { status: 500 });
  }
}

/**
 * Check if content is HTML
 */
function isHtmlContent(text: string): boolean {
  // HTML detection needs to be robust but careful not to flag CSV data
  // that might contain HTML-like text
  const sample = text.trim().toLowerCase().substring(0, 500);
  
  // Strong HTML indicators
  if (
    sample.includes('<!doctype') ||
    sample.includes('<html') ||
    sample.includes('<head') ||
    sample.includes('<body') ||
    (sample.includes('<div') && sample.includes('</div>')) ||
    (sample.includes('<script') && sample.includes('</script>'))
  ) {
    return true;
  }
  
  // Count HTML tags as a heuristic
  const tagCount = (sample.match(/<\/?[a-z]+[^>]*>/g) || []).length;
  
  // If there are multiple HTML tags, likely it's HTML content
  return tagCount > 3;
}