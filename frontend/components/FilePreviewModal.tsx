import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, Download, File, Image, FileText, Music, Video, FileCode, Loader2, Plus, Minus, Table } from 'lucide-react';
import { FileEntry } from '../types';
import { api } from '../services/api';
import * as XLSX from 'xlsx';
import { renderAsync } from 'docx-preview';

interface FilePreviewModalProps {
  file: FileEntry | null;
  onClose: () => void;
}

// Helper function to convert Excel color to CSS color
const excelColorToCss = (color: any): string | null => {
  if (!color) return null;
  
  // Handle RGB color
  if (color.rgb) {
    return `#${color.rgb}`;
  }
  
  // Handle ARGB color (with alpha)
  if (color.argb) {
    // ARGB format: AARRGGBB, skip the alpha
    return `#${color.argb.substring(2)}`;
  }
  
  // Handle theme colors (approximate mapping)
  if (color.theme !== undefined) {
    const themeColors: { [key: number]: string } = {
      0: '#FFFFFF', // Background 1
      1: '#000000', // Text 1
      2: '#E7E6E6', // Background 2
      3: '#44546A', // Text 2
      4: '#4472C4', // Accent 1
      5: '#ED7D31', // Accent 2
      6: '#A5A5A5', // Accent 3
      7: '#FFC000', // Accent 4
      8: '#5B9BD5', // Accent 5
      9: '#70AD47', // Accent 6
    };
    return themeColors[color.theme] || null;
  }
  
  // Handle indexed colors (basic Excel palette)
  if (color.indexed !== undefined) {
    const indexedColors: { [key: number]: string } = {
      0: '#000000', 1: '#FFFFFF', 2: '#FF0000', 3: '#00FF00',
      4: '#0000FF', 5: '#FFFF00', 6: '#FF00FF', 7: '#00FFFF',
      8: '#000000', 9: '#FFFFFF', 10: '#FF0000', 11: '#00FF00',
      12: '#0000FF', 13: '#FFFF00', 14: '#FF00FF', 15: '#00FFFF',
      64: '#000000', // System foreground
    };
    return indexedColors[color.indexed] || null;
  }
  
  return null;
};

// Helper to convert column number to Excel letter (0 -> A, 1 -> B, etc.)
const getColumnLetter = (col: number): string => {
  let letter = '';
  let temp = col;
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
};

// Helper function to generate styled HTML from Excel worksheet
const generateStyledExcelHtml = (worksheet: XLSX.WorkSheet, workbook: XLSX.WorkBook): string => {
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
  // Always start from column A (index 0) and row 1 (index 0)
  const startCol = 0;
  const startRow = 0;
  const endCol = range.e.c;
  const endRow = range.e.r;
  const rows: string[] = [];
  
  // Get column widths
  const colWidths = worksheet['!cols'] || [];
  
  // Get hyperlinks
  const hyperlinks = worksheet['!hyperlinks'] || [];
  const hyperlinkMap: { [key: string]: string } = {};
  hyperlinks.forEach((hl: any) => {
    if (hl.ref && hl.Target) {
      hyperlinkMap[hl.ref] = hl.Target;
    }
  });
  
  // Get merged cells
  const merges = worksheet['!merges'] || [];
  const mergedCells: { [key: string]: { rowspan: number; colspan: number } } = {};
  const skipCells = new Set<string>();
  
  merges.forEach((merge: XLSX.Range) => {
    const startRef = XLSX.utils.encode_cell({ r: merge.s.r, c: merge.s.c });
    mergedCells[startRef] = {
      rowspan: merge.e.r - merge.s.r + 1,
      colspan: merge.e.c - merge.s.c + 1
    };
    // Mark cells to skip
    for (let r = merge.s.r; r <= merge.e.r; r++) {
      for (let c = merge.s.c; c <= merge.e.c; c++) {
        if (r !== merge.s.r || c !== merge.s.c) {
          skipCells.add(XLSX.utils.encode_cell({ r, c }));
        }
      }
    }
  });
  
  // Create header row with column letters
  const headerCells: string[] = ['<th class="row-header"></th>']; // Empty corner cell
  for (let c = startCol; c <= endCol; c++) {
    headerCells.push(`<th class="col-header">${getColumnLetter(c)}</th>`);
  }
  const headerRow = `<thead><tr class="header-row">${headerCells.join('')}</tr></thead>`;
  
  const bodyRows: string[] = [];
  for (let r = startRow; r <= endRow; r++) {
    const cells: string[] = [];
    
    // Add row number header
    cells.push(`<td class="row-header">${r + 1}</td>`);
    
    for (let c = startCol; c <= endCol; c++) {
      const cellRef = XLSX.utils.encode_cell({ r, c });
      
      // Skip cells that are part of a merge (not the first cell)
      if (skipCells.has(cellRef)) {
        continue;
      }
      
      const cell = worksheet[cellRef];
      
      let cellValue = '';
      const styles: string[] = [];
      let isHyperlink = false;
      let hyperlinkUrl = '';
      
      // Check for hyperlink
      if (hyperlinkMap[cellRef]) {
        isHyperlink = true;
        hyperlinkUrl = hyperlinkMap[cellRef];
      }
      
      // Also check cell.l for hyperlinks
      if (cell?.l?.Target) {
        isHyperlink = true;
        hyperlinkUrl = cell.l.Target;
      }
      
      if (cell) {
        // Get formatted value
        if (cell.w !== undefined) {
          cellValue = cell.w; // Formatted text
        } else if (cell.v !== undefined) {
          cellValue = String(cell.v);
        }
        
        if (cell.s) {
          const s = cell.s;
          
          // Font styles
          if (s.font) {
            if (s.font.bold) styles.push('font-weight: bold');
            if (s.font.italic) styles.push('font-style: italic');
            if (s.font.underline) styles.push('text-decoration: underline');
            if (s.font.strike) styles.push('text-decoration: line-through');
            if (s.font.sz) styles.push(`font-size: ${s.font.sz}pt`);
            if (s.font.name) styles.push(`font-family: "${s.font.name}", sans-serif`);
            
            const fontColor = excelColorToCss(s.font.color);
            if (fontColor) styles.push(`color: ${fontColor}`);
          }
          
          // Fill/background color
          if (s.fill) {
            if (s.fill.fgColor) {
              const bgColor = excelColorToCss(s.fill.fgColor);
              if (bgColor && bgColor !== '#000000') {
                styles.push(`background-color: ${bgColor}`);
              }
            }
            if (s.fill.bgColor && !s.fill.fgColor) {
              const bgColor = excelColorToCss(s.fill.bgColor);
              if (bgColor) styles.push(`background-color: ${bgColor}`);
            }
          }
          
          // Alignment
          if (s.alignment) {
            if (s.alignment.horizontal) {
              styles.push(`text-align: ${s.alignment.horizontal}`);
            }
            if (s.alignment.vertical) {
              const vAlign = s.alignment.vertical === 'center' ? 'middle' : s.alignment.vertical;
              styles.push(`vertical-align: ${vAlign}`);
            }
            if (s.alignment.wrapText) {
              styles.push('white-space: pre-wrap');
            }
          }
          
          // Borders
          if (s.border) {
            const borderStyle = (b: any) => b ? '1px solid #000' : '';
            if (s.border.top) styles.push(`border-top: ${borderStyle(s.border.top)}`);
            if (s.border.bottom) styles.push(`border-bottom: ${borderStyle(s.border.bottom)}`);
            if (s.border.left) styles.push(`border-left: ${borderStyle(s.border.left)}`);
            if (s.border.right) styles.push(`border-right: ${borderStyle(s.border.right)}`);
          }
        }
      }
      
      // Check for merge attributes
      let mergeAttr = '';
      if (mergedCells[cellRef]) {
        const merge = mergedCells[cellRef];
        if (merge.rowspan > 1) mergeAttr += ` rowspan="${merge.rowspan}"`;
        if (merge.colspan > 1) mergeAttr += ` colspan="${merge.colspan}"`;
      }
      
      const cellStyle = styles.length > 0 ? ` style="${styles.join('; ')}"` : '';
      
      // Escape HTML entities
      let escapedValue = cellValue
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/\n/g, '<br>');
      
      // Wrap in hyperlink if needed
      if (isHyperlink && escapedValue) {
        escapedValue = `<a href="${hyperlinkUrl}" target="_blank" rel="noopener noreferrer" class="excel-link">${escapedValue}</a>`;
      }
      
      cells.push(`<td${mergeAttr}${cellStyle}>${escapedValue}</td>`);
    }
    bodyRows.push(`<tr>${cells.join('')}</tr>`);
  }
  
  return `<table class="excel-table">${headerRow}<tbody>${bodyRows.join('')}</tbody></table>`;
};

const FilePreviewModal: React.FC<FilePreviewModalProps> = ({ file, onClose }) => {
  const [textContent, setTextContent] = useState<string>('');
  const [dataUrl, setDataUrl] = useState<string>('');
  const [excelData, setExcelData] = useState<{ sheets: string[]; currentSheet: string; html: string; workbook?: XLSX.WorkBook } | null>(null);
  const [docxHtml, setDocxHtml] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);
  const modalRef = useRef<HTMLDivElement>(null);
  const docxContainerRef = useRef<HTMLDivElement>(null);

  // Fetch file content for preview
  useEffect(() => {
    if (!file) return;

    // Reset state for new file
    setDataUrl('');
    setTextContent('');
    setExcelData(null);
    setDocxHtml('');
    setError(null);
    setLoading(true);

    const isTextFile = file.type.startsWith('text/') ||
                       file.type.includes('json') ||
                       file.type.includes('javascript') ||
                       file.type.includes('html') ||
                       file.type.includes('css') ||
                       file.type.includes('xml');

    const isPreviewable = file.type.startsWith('image/') ||
                          file.type === 'application/pdf' ||
                          file.type.startsWith('video/') ||
                          file.type.startsWith('audio/');

    const isWord = file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                   file.name.endsWith('.docx');

    const isExcel = file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                    file.type === 'application/vnd.ms-excel' ||
                    file.name.endsWith('.xlsx') ||
                    file.name.endsWith('.xls');

    // For previewable files, fetch as base64 and create data URL
    // This bypasses download managers like IDM completely
    if (isPreviewable) {
      console.log('Fetching preview data for:', file.id, file.type);
      api.getPreviewData(file.id)
        .then(result => {
          console.log('Preview data result:', result ? 'received' : 'null');
          if (result) {
            // Create data URL from base64
            const url = `data:${result.contentType};base64,${result.data}`;
            setDataUrl(url);
            setLoading(false);
          } else {
            setError('Failed to load file');
            setLoading(false);
          }
        })
        .catch(err => {
          console.error('Error getting preview data:', err);
          setError('Failed to load file');
          setLoading(false);
        });
    } else if (isWord) {
      // Handle Word documents - render client-side with docx-preview
      api.getPreviewData(file.id)
        .then(async result => {
          if (result) {
            try {
              // Convert base64 to ArrayBuffer
              const binaryString = atob(result.data);
              const bytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }
              
              // Create a temporary container for rendering
              const tempContainer = document.createElement('div');
              
              // Render DOCX to the temp container
              await renderAsync(bytes.buffer, tempContainer, undefined, {
                className: 'docx-viewer',
                inWrapper: true,
                ignoreWidth: false,
                ignoreHeight: false,
                ignoreFonts: false,
                breakPages: true,
                ignoreLastRenderedPageBreak: false,
                experimental: true,
                trimXmlDeclaration: true,
                useBase64URL: true,
                renderHeaders: true,
                renderFooters: true,
                renderFootnotes: true,
                renderEndnotes: true,
              });
              
              // Get the rendered HTML and styles
              const styles = tempContainer.querySelectorAll('style');
              let styleContent = '';
              styles.forEach(style => {
                styleContent += style.outerHTML;
              });
              
              // Get the inner HTML
              const docContent = tempContainer.innerHTML;
              
              // Build complete HTML document for iframe
              // Show the document as a single continuous page with the docx-preview styling
              // docx-preview already handles the page layout with proper margins
              const fullHtml = `
                <!DOCTYPE html>
                <html>
                <head>
                  <meta charset="UTF-8">
                  <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    html, body { 
                      font-family: 'Calibri', 'Arial', sans-serif;
                      background: #525659;
                      min-height: 100vh;
                    }
                    body {
                      padding: 20px;
                      display: flex;
                      flex-direction: column;
                      align-items: center;
                    }
                    
                    /* Style the docx-preview wrapper */
                    .docx-viewer-wrapper {
                      background: transparent !important;
                      padding: 0 !important;
                      display: flex;
                      flex-direction: column;
                      align-items: center;
                    }
                    
                    /* Style the section as a white page */
                    section.docx-viewer {
                      background: white !important;
                      box-shadow: 0 2px 8px rgba(0,0,0,0.3) !important;
                      margin-bottom: 0 !important;
                    }
                    
                    /* Ensure proper text rendering */
                    p, span { line-height: 1.15; }
                    table { border-collapse: collapse; }
                    img { max-width: 100%; height: auto; }
                  </style>
                  ${styleContent}
                </head>
                <body>
                  ${docContent}
                </body>
                </html>
              `;
              
              setDocxHtml(fullHtml);
              setLoading(false);
            } catch (err) {
              console.error('Error rendering Word document:', err);
              setError('Failed to render document');
              setLoading(false);
            }
          } else {
            setError('Failed to load document');
            setLoading(false);
          }
        })
        .catch(err => {
          console.error('Error loading Word document:', err);
          setError('Failed to load document');
          setLoading(false);
        });
    } else if (isExcel) {
      // Handle Excel files
      api.getPreviewData(file.id)
        .then(result => {
          if (result) {
            // Convert base64 to ArrayBuffer
            const binaryString = atob(result.data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }

            // Parse Excel file with cellStyles option
            const workbook = XLSX.read(bytes, { type: 'array', cellStyles: true, cellNF: true });
            const sheetNames = workbook.SheetNames;
            const firstSheet = sheetNames[0];
            const worksheet = workbook.Sheets[firstSheet];
            const html = generateStyledExcelHtml(worksheet, workbook);

            setExcelData({
              sheets: sheetNames,
              currentSheet: firstSheet,
              html: html,
              workbook: workbook
            });
            setLoading(false);
          } else {
            setError('Failed to load spreadsheet');
            setLoading(false);
          }
        })
        .catch(err => {
          console.error('Error loading Excel file:', err);
          setError('Failed to load spreadsheet');
          setLoading(false);
        });
    } else if (isTextFile) {
      // Fetch text content via base64 as well to avoid IDM
      api.getPreviewData(file.id)
        .then(result => {
          if (result) {
            // Decode base64 to text
            try {
              const text = atob(result.data);
              setTextContent(text);
            } catch (e) {
              // If atob fails, try decoding as UTF-8
              const bytes = Uint8Array.from(atob(result.data), c => c.charCodeAt(0));
              const text = new TextDecoder('utf-8').decode(bytes);
              setTextContent(text);
            }
            setLoading(false);
          } else {
            setError('Failed to load file content');
            setLoading(false);
          }
        })
        .catch(err => {
          console.error('Error loading text file:', err);
          setError('Failed to load file content');
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [file?.id]);

  // Reset zoom when file changes
  useEffect(() => {
    setZoom(100);
  }, [file]);

  // Handle escape key and click outside
  useEffect(() => {
    if (!file) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [file, onClose]);

  // Handle download
  const handleDownload = useCallback(async () => {
    if (!file) return;
    try {
      const res = await api.downloadFile(file.id);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (e) {
      console.error(e);
    }
  }, [file]);

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev + 25, 300));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev - 25, 25));
  }, []);

  // Render preview content based on file type
  const renderPreview = () => {
    if (!file) return null;

    if (loading) {
      return (
        <div className="flex items-center justify-center h-full min-h-[300px]">
          <div className="flex flex-col items-center gap-4 text-gray-400">
            <Loader2 className="w-12 h-12 animate-spin text-[#00ED64]" />
            <p>Loading preview...</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center justify-center h-full min-h-[300px]">
          <div className="flex flex-col items-center gap-4 text-center">
            <File className="w-16 h-16 text-gray-300" />
            <p className="text-gray-600">{error}</p>
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2 bg-[#028546] text-white rounded-lg hover:bg-[#00D65A] transition-colors"
            >
              <Download className="w-4 h-4" />
              Download File
            </button>
          </div>
        </div>
      );
    }

    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf';
    const isVideo = file.type.startsWith('video/');
    const isAudio = file.type.startsWith('audio/');
    const isTextFile = file.type.startsWith('text/') ||
                       file.type.includes('json') ||
                       file.type.includes('javascript') ||
                       file.type.includes('html') ||
                       file.type.includes('css') ||
                       file.type.includes('xml');
    const isWord = file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                   file.name.endsWith('.docx');
    const isExcel = file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                    file.type === 'application/vnd.ms-excel' ||
                    file.name.endsWith('.xlsx') ||
                    file.name.endsWith('.xls');

    // Image preview with zoom
    if (isImage && dataUrl) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-4 p-6">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>1/1</span>
          </div>
          <div className="overflow-auto w-full flex-1 flex items-center justify-center bg-gray-50">
            <img
              src={dataUrl}
              alt={file.name}
              style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'center' }}
              className="max-w-full max-h-full object-contain"
              onError={() => setError('Failed to load image')}
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleZoomOut}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Zoom out"
            >
              <Minus className="w-5 h-5 text-gray-600" />
            </button>
            <span className="text-sm text-gray-600 min-w-[3rem] text-center">{zoom}%</span>
            <button
              onClick={handleZoomIn}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Zoom in"
            >
              <Plus className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
      );
    }

    // PDF preview - use iframe with data URL (bypasses IDM)
    if (isPdf && dataUrl) {
      return (
        <iframe
          src={dataUrl}
          className="w-full h-full border-0"
          title={file.name}
          onError={() => setError('Failed to load PDF')}
        />
      );
    }

    // Text file preview
    if (isTextFile && textContent) {
      return (
        <div className="w-full h-full overflow-auto p-6">
          <pre className="p-4 text-sm bg-gray-900 text-gray-100 rounded-lg overflow-auto h-full">
            <code>{textContent}</code>
          </pre>
        </div>
      );
    }

    // Word document preview (rendered client-side with docx-preview in isolated iframe)
    if (isWord && docxHtml) {
      return (
        <iframe
          srcDoc={docxHtml}
          className="w-full h-full border-0"
          title={file.name}
          style={{ background: '#525659' }}
          sandbox="allow-same-origin allow-scripts"
        />
      );
    }

    // Excel spreadsheet preview
    if (isExcel && excelData) {
      return (
        <div className="w-full h-full flex flex-col overflow-hidden">
          {/* Sheet tabs */}
          {excelData.sheets.length > 1 && (
            <div className="flex gap-1 px-4 py-2 bg-gray-100 border-b overflow-x-auto flex-shrink-0">
              {excelData.sheets.map(sheet => (
                <button
                  key={sheet}
                  onClick={() => {
                    // Switch sheet using stored workbook
                    if (excelData.workbook) {
                      const worksheet = excelData.workbook.Sheets[sheet];
                      const html = generateStyledExcelHtml(worksheet, excelData.workbook);
                      setExcelData({ ...excelData, currentSheet: sheet, html });
                    }
                  }}
                  className={`px-4 py-1.5 text-sm rounded-t-lg whitespace-nowrap ${
                    excelData.currentSheet === sheet
                      ? 'bg-white text-gray-900 font-medium border-t border-l border-r'
                      : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                  }`}
                >
                  {sheet}
                </button>
              ))}
            </div>
          )}
          {/* Spreadsheet content */}
          <div 
            className="flex-1 overflow-auto bg-white"
            style={{ position: 'relative' }}
          >
            <div 
              className="p-4"
              dangerouslySetInnerHTML={{ __html: excelData.html }}
            />
          </div>
          <style>{`
            .excel-table {
              border-collapse: separate;
              border-spacing: 0;
              font-size: 13px;
              font-family: Calibri, Arial, sans-serif;
              background: white;
            }
            .excel-table td, .excel-table th {
              border: 1px solid #d0d0d0;
              border-right: none;
              border-bottom: none;
              padding: 4px 8px;
              min-width: 60px;
              max-width: 300px;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              vertical-align: middle;
              background: white;
              box-sizing: border-box;
            }
            .excel-table td:last-child, .excel-table th:last-child {
              border-right: 1px solid #d0d0d0;
            }
            .excel-table tr:last-child td {
              border-bottom: 1px solid #d0d0d0;
            }
            /* Column headers (A, B, C...) */
            .excel-table thead {
              position: sticky;
              top: 0;
              z-index: 10;
            }
            .excel-table .header-row th {
              background: #e9ecef;
              font-weight: 600;
              text-align: center;
              color: #495057;
              padding: 6px 8px;
              border-bottom: 1px solid #d0d0d0;
            }
              background: linear-gradient(180deg, #f8f9fa 0%, #e9ecef 100%);
              font-weight: 600;
              text-align: center;
              color: #495057;
              padding: 6px 8px;
            }
            /* Row headers (1, 2, 3...) in tbody */
            .excel-table tbody .row-header {
              background: #e9ecef !important;
              font-weight: 600;
              text-align: center;
              color: #495057;
              min-width: 40px !important;
              max-width: 60px !important;
              padding: 4px 6px;
              position: sticky;
              left: 0;
              z-index: 5;
            }
            /* Corner cell in thead */
            .excel-table thead .row-header {
              background: #e0e0e0 !important;
              position: sticky;
              left: 0;
              z-index: 15;
            }
            /* Column header cells */
            .excel-table .col-header {
              min-width: 80px;
            }
            /* Hyperlinks */
            .excel-table .excel-link {
              color: #0563c1;
              text-decoration: underline;
            }
            .excel-table .excel-link:hover {
              color: #0366d6;
              text-decoration: underline;
            }
            /* Data cells in first data row (row 1 in tbody) */
            .excel-table tbody tr:first-child td:not(.row-header) {
              background-color: #f3f3f3;
              font-weight: 500;
            }
          `}</style>
        </div>
      );
    }

    // Video preview
    if (isVideo && dataUrl) {
      return (
        <div className="flex items-center justify-center h-full p-6">
          <video
            src={dataUrl}
            controls
            className="max-w-full max-h-full"
            onError={() => setError('Failed to load video')}
          >
            Your browser does not support video playback.
          </video>
        </div>
      );
    }

    // Audio preview
    if (isAudio && dataUrl) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-8 p-6">
          <div className="w-32 h-32 bg-gray-100 rounded-full flex items-center justify-center">
            <Music className="w-16 h-16 text-gray-400" />
          </div>
          <audio
            src={dataUrl}
            controls
            className="w-full max-w-md"
            onError={() => setError('Failed to load audio')}
          >
            Your browser does not support audio playback.
          </audio>
        </div>
      );
    }

    // Unsupported file type
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center p-6">
        {getFileIcon(file.type, 64)}
        <p className="text-gray-600 mt-4">Preview not available for this file type</p>
        <p className="text-gray-400 text-sm mt-2">{file.type}</p>
        <button
          onClick={handleDownload}
          className="flex items-center gap-2 px-4 py-2 bg-[#028546] text-white rounded-lg hover:bg-[#00D65A] transition-colors mt-4"
        >
          <Download className="w-4 h-4" />
          Download File
        </button>
      </div>
    );
  };

  if (!file) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center animate-in fade-in-0 duration-200">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70" />

      {/* Modal */}
      <div
        ref={modalRef}
        className="relative bg-white rounded-xl shadow-2xl w-[95vw] max-w-[1400px] h-[90vh] flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {getFileIcon(file.type)}
            <h2 className="text-lg font-semibold text-gray-900 truncate" title={file.name}>
              {file.name}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-3 py-2 bg-[#028546] text-white text-sm font-medium rounded-lg hover:bg-[#00D65A] transition-colors"
              title="Download file"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Download</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              title="Close"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden p-0">
          {renderPreview()}
        </div>
      </div>
    </div>
  );
};

// Helper function to get file icon
const getFileIcon = (mime: string, size: number = 20) => {
  const sizeClass = size === 64 ? 'w-16 h-16' : 'w-5 h-5';
  if (mime.startsWith('image/')) return <Image className={`text-blue-500 ${sizeClass}`} />;
  if (mime.startsWith('video/')) return <Video className={`text-purple-500 ${sizeClass}`} />;
  if (mime.startsWith('audio/')) return <Music className={`text-pink-500 ${sizeClass}`} />;
  if (mime.includes('javascript') || mime.includes('json') || mime.includes('html')) return <FileCode className={`text-yellow-500 ${sizeClass}`} />;
  if (mime.includes('spreadsheet') || mime.includes('excel')) return <Table className={`text-green-600 ${sizeClass}`} />;
  if (mime.includes('wordprocessing') || mime.includes('msword')) return <FileText className={`text-blue-600 ${sizeClass}`} />;
  if (mime.includes('pdf') || mime.includes('text')) return <FileText className={`text-red-500 ${sizeClass}`} />;
  return <File className={`text-gray-400 ${sizeClass}`} />;
};

export default FilePreviewModal;
