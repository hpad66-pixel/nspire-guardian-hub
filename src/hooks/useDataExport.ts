import { useCallback } from 'react';
import { toast } from 'sonner';

interface ExportOptions {
  filename: string;
  headers?: string[];
  dateFields?: string[];
}

export function useDataExport() {
  const formatValue = useCallback((value: unknown, field: string, dateFields: string[] = []): string => {
    if (value === null || value === undefined) {
      return '';
    }
    
    if (dateFields.includes(field) && typeof value === 'string') {
      try {
        return new Date(value).toLocaleDateString();
      } catch {
        return String(value);
      }
    }
    
    if (Array.isArray(value)) {
      return value.join('; ');
    }
    
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    
    // Escape quotes and wrap in quotes if contains comma
    const stringValue = String(value);
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    
    return stringValue;
  }, []);

  const exportToCSV = useCallback(<T extends Record<string, unknown>>(
    data: T[],
    options: ExportOptions
  ) => {
    if (!data || data.length === 0) {
      toast.error('No data to export');
      return;
    }

    try {
      // Get headers from options or from first data item
      const headers = options.headers || Object.keys(data[0]);
      
      // Create CSV content
      const csvRows: string[] = [];
      
      // Add header row
      csvRows.push(headers.map(h => {
        // Convert camelCase/snake_case to Title Case
        return h
          .replace(/_/g, ' ')
          .replace(/([A-Z])/g, ' $1')
          .replace(/^./, str => str.toUpperCase())
          .trim();
      }).join(','));
      
      // Add data rows
      for (const row of data) {
        const values = headers.map(header => 
          formatValue(row[header], header, options.dateFields)
        );
        csvRows.push(values.join(','));
      }
      
      const csvContent = csvRows.join('\n');
      
      // Create blob and download
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `${options.filename}_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success(`Exported ${data.length} records to CSV`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export data');
    }
  }, [formatValue]);

  const exportToJSON = useCallback(<T extends Record<string, unknown>>(
    data: T[],
    filename: string
  ) => {
    if (!data || data.length === 0) {
      toast.error('No data to export');
      return;
    }

    try {
      const jsonContent = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.json`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success(`Exported ${data.length} records to JSON`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export data');
    }
  }, []);

  return { exportToCSV, exportToJSON };
}
