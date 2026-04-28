import Papa from 'papaparse';

/**
 * Parse a CSV file and return structured data
 */
export function parseCSV(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      transformHeader: (header) => header.trim(),
      complete: (results) => {
        if (results.errors.length > 0) {
          // Only reject on truly fatal errors — FieldMismatch is common and non-critical
          const criticalErrors = results.errors.filter(e => e.type === 'Delimiter');
          if (criticalErrors.length > 0) {
            reject(new Error(`CSV parsing error: ${criticalErrors[0].message}`));
            return;
          }
        }

        const columns = results.meta.fields || [];
        const data = results.data.filter(row => {
          // Filter out completely empty rows
          return Object.values(row).some(v => v !== null && v !== undefined && v !== '');
        });

        resolve({
          columns,
          data,
          rowCount: data.length,
          columnCount: columns.length,
          preview: data.slice(0, 10)
        });
      },
      error: (error) => {
        reject(new Error(`Failed to parse CSV: ${error.message}`));
      }
    });
  });
}

/**
 * Get column statistics (unique values, types, etc.)
 */
export function getColumnStats(data, columns) {
  return columns.map(col => {
    const values = data.map(row => row[col]).filter(v => v !== null && v !== undefined && v !== '');
    const uniqueValues = [...new Set(values.map(v => String(v).trim()))];
    const isNumeric = values.every(v => typeof v === 'number' || !isNaN(Number(v)));
    const nullCount = data.length - values.length;

    return {
      name: col,
      type: isNumeric ? 'numeric' : 'categorical',
      uniqueCount: uniqueValues.length,
      uniqueValues: uniqueValues.slice(0, 20), // Cap at 20 for display
      nullCount,
      totalCount: data.length,
      isLikelyCategorical: uniqueValues.length <= 20,
      sample: values.slice(0, 5)
    };
  });
}

/**
 * Format file size
 */
export function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
