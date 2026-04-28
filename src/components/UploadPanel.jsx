import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Upload, FileSpreadsheet, CheckCircle, AlertTriangle,
  Play, Database, ArrowRight, Loader, Trash2
} from 'lucide-react';
import { parseCSV, getColumnStats, formatFileSize } from '../utils/csvParser';
import {
  detectSensitiveColumns, detectTargetColumns, runFullAnalysis
} from '../utils/biasMetrics';
import { saveAudit } from '../utils/auditHistory';
import {
  SAMPLE_CSV_DATA, SAMPLE_DATA_NAME, SAMPLE_DATA_DESCRIPTION,
  SAMPLE_COLUMNS, SAMPLE_SENSITIVE_COL, SAMPLE_TARGET_COL,
  SAMPLE_FAVORABLE_VALUE, SAMPLE_PRIVILEGED_VALUE
} from '../data/sampleData';

export default function UploadPanel({
  parsedData, setParsedData, analysisResult, setAnalysisResult, onViewReport
}) {
  const [step, setStep] = useState(parsedData ? (analysisResult ? 3 : 2) : 1);
  const [fileInfo, setFileInfo] = useState(null);
  const [columnStats, setColumnStats] = useState([]);
  const [sensitiveCol, setSensitiveCol] = useState('');
  const [targetCol, setTargetCol] = useState('');
  const [favorableValue, setFavorableValue] = useState('');
  const [privilegedValue, setPrivilegedValue] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeStepIndex, setAnalyzeStepIndex] = useState(0);
  const [error, setError] = useState('');

  const analyzeSteps = [
    'Validating dataset...',
    'Detecting sensitive attributes...',
    'Computing fairness metrics...',
    'Calculating group-level rates...',
    'Generating scorecard...',
    'Analysis complete!'
  ];

  const onDrop = useCallback(async (acceptedFiles) => {
    setError('');
    if (acceptedFiles.length === 0) return;
    const file = acceptedFiles[0];
    if (!file.name.endsWith('.csv')) {
      setError('Please upload a CSV file.');
      return;
    }
    try {
      const result = await parseCSV(file);
      setParsedData(result);
      setFileInfo({ name: file.name, size: file.size });
      setColumnStats(getColumnStats(result.data, result.columns));
      const detectedSensitive = detectSensitiveColumns(result.columns);
      const detectedTarget = detectTargetColumns(result.columns);
      if (detectedSensitive.length > 0) setSensitiveCol(detectedSensitive[0]);
      if (detectedTarget.length > 0) setTargetCol(detectedTarget[0]);
      setStep(2);
      setAnalysisResult(null);
    } catch (err) {
      setError(err.message);
    }
  }, [setParsedData, setAnalysisResult]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'] },
    multiple: false
  });

  const loadSampleData = () => {
    const result = {
      columns: SAMPLE_COLUMNS,
      data: SAMPLE_CSV_DATA,
      rowCount: SAMPLE_CSV_DATA.length,
      columnCount: SAMPLE_COLUMNS.length,
      preview: SAMPLE_CSV_DATA.slice(0, 10)
    };
    setParsedData(result);
    setFileInfo({ name: SAMPLE_DATA_NAME, size: 0 });
    setColumnStats(getColumnStats(result.data, result.columns));
    setSensitiveCol(SAMPLE_SENSITIVE_COL);
    setTargetCol(SAMPLE_TARGET_COL);
    setFavorableValue(SAMPLE_FAVORABLE_VALUE);
    setPrivilegedValue(SAMPLE_PRIVILEGED_VALUE);
    setStep(2);
    setAnalysisResult(null);
    setError('');
  };

  const runAnalysis = async () => {
    if (!sensitiveCol || !targetCol || !favorableValue || !privilegedValue) {
      setError('Please select all required parameters.');
      return;
    }
    setIsAnalyzing(true);
    setError('');
    setAnalyzeStepIndex(0);
    for (let i = 0; i < analyzeSteps.length; i++) {
      setAnalyzeStepIndex(i);
      await new Promise(r => setTimeout(r, 400));
    }
    try {
      const result = runFullAnalysis(
        parsedData.data, sensitiveCol, targetCol, favorableValue, privilegedValue
      );
      setAnalysisResult(result);
      saveAudit({
        fileName: fileInfo?.name || 'Unknown',
        result,
        config: { sensitiveCol, targetCol, favorableValue, privilegedValue }
      });
      setStep(3);
    } catch (err) {
      setError(`Analysis error: ${err.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetAll = () => {
    setParsedData(null);
    setAnalysisResult(null);
    setFileInfo(null);
    setColumnStats([]);
    setSensitiveCol('');
    setTargetCol('');
    setFavorableValue('');
    setPrivilegedValue('');
    setStep(1);
    setError('');
  };

  const getColumnValues = (colName) => {
    const stat = columnStats.find(s => s.name === colName);
    return stat ? stat.uniqueValues : [];
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Analyze Dataset</h2>
        <p>Upload a CSV dataset to scan for hidden bias and unfairness</p>
      </div>

      {/* Stepper */}
      <div className="stepper">
        {['Upload Data', 'Configure', 'Results'].map((label, i) => (
          <div key={label} style={{ display: 'contents' }}>
            <div className={`step-item ${step > i + 1 ? 'completed' : step === i + 1 ? 'active' : ''}`}>
              <div className="step-number">
                {step > i + 1 ? <CheckCircle size={12} /> : i + 1}
              </div>
              <span>{label}</span>
            </div>
            {i < 2 && <div className={`step-connector ${step > i + 1 ? 'completed' : ''}`} />}
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="card" style={{
          background: 'var(--danger-bg)',
          borderColor: '#fecaca',
          color: 'var(--danger)',
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: '0.875rem'
        }}>
          <AlertTriangle size={16} />
          {error}
        </div>
      )}

      {/* Step 1: Upload */}
      {step === 1 && (
        <div className="animate-in">
          <div {...getRootProps()} className={`dropzone ${isDragActive ? 'drag-active' : ''}`} id="csv-dropzone">
            <input {...getInputProps()} />
            <div className="dropzone-icon">
              <Upload size={22} />
            </div>
            <div className="dropzone-text">
              <h3>Drop your CSV file here</h3>
              <p>or <span className="highlight">click to browse</span></p>
              <p style={{ marginTop: 4 }}>Supports .csv files up to 50MB</p>
            </div>
          </div>

          <div style={{ textAlign: 'center', margin: '20px 0', color: 'var(--gray-400)', fontSize: '0.8125rem' }}>
            or
          </div>

          <div style={{ textAlign: 'center' }}>
            <button className="btn btn-outline" onClick={loadSampleData} id="load-sample-data-btn">
              <Database size={14} />
              Load Sample Dataset
            </button>
            <p className="text-xs text-tertiary" style={{ marginTop: 6 }}>{SAMPLE_DATA_DESCRIPTION}</p>
          </div>
        </div>
      )}

      {/* Step 2: Configure */}
      {step === 2 && parsedData && (
        <div className="animate-in">
          <div className="file-info" style={{ marginBottom: 20 }}>
            <div className="file-info-icon">
              <FileSpreadsheet size={18} />
            </div>
            <div className="file-info-details" style={{ flex: 1 }}>
              <h4>{fileInfo?.name}</h4>
              <p>
                {parsedData.rowCount.toLocaleString()} rows × {parsedData.columnCount} columns
                {fileInfo?.size ? ` · ${formatFileSize(fileInfo.size)}` : ''}
              </p>
            </div>
            <button className="btn btn-sm btn-danger" onClick={resetAll}>
              <Trash2 size={12} /> Remove
            </button>
          </div>

          {/* Data Preview */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-header">
              <span className="card-title">Data Preview</span>
              <span className="card-subtitle">First 10 rows</span>
            </div>
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    {parsedData.columns.map(col => <th key={col}>{col}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {parsedData.preview.map((row, i) => (
                    <tr key={i}>
                      {parsedData.columns.map(col => (
                        <td key={col}>{String(row[col] ?? '')}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Configuration */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-header">
              <span className="card-title">Analysis Configuration</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div className="input-group">
                <label className="input-label">
                  Protected Attribute <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <select
                  className="input"
                  value={sensitiveCol}
                  onChange={e => { setSensitiveCol(e.target.value); setPrivilegedValue(''); }}
                  id="sensitive-col-select"
                >
                  <option value="">Select column...</option>
                  {parsedData.columns.map(col => <option key={col} value={col}>{col}</option>)}
                </select>
                <span className="text-xs text-tertiary">e.g., gender, race, age</span>
              </div>

              <div className="input-group">
                <label className="input-label">
                  Outcome Column <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <select
                  className="input"
                  value={targetCol}
                  onChange={e => { setTargetCol(e.target.value); setFavorableValue(''); }}
                  id="target-col-select"
                >
                  <option value="">Select column...</option>
                  {parsedData.columns.map(col => <option key={col} value={col}>{col}</option>)}
                </select>
                <span className="text-xs text-tertiary">e.g., income, approved, hired</span>
              </div>

              <div className="input-group">
                <label className="input-label">
                  Privileged Group <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <select
                  className="input"
                  value={privilegedValue}
                  onChange={e => setPrivilegedValue(e.target.value)}
                  disabled={!sensitiveCol}
                  id="privileged-value-select"
                >
                  <option value="">Select value...</option>
                  {getColumnValues(sensitiveCol).map(v => <option key={v} value={v}>{v}</option>)}
                </select>
                <span className="text-xs text-tertiary">The advantaged group</span>
              </div>

              <div className="input-group">
                <label className="input-label">
                  Favorable Outcome <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <select
                  className="input"
                  value={favorableValue}
                  onChange={e => setFavorableValue(e.target.value)}
                  disabled={!targetCol}
                  id="favorable-value-select"
                >
                  <option value="">Select value...</option>
                  {getColumnValues(targetCol).map(v => <option key={v} value={v}>{v}</option>)}
                </select>
                <span className="text-xs text-tertiary">The positive outcome</span>
              </div>
            </div>

            {/* Auto-detected chips */}
            {sensitiveCol && detectSensitiveColumns(parsedData.columns).length > 0 && (
              <div style={{ marginTop: 16 }}>
                <span className="text-xs text-tertiary" style={{ display: 'block', marginBottom: 6 }}>
                  Detected sensitive columns:
                </span>
                <div className="column-selector">
                  {detectSensitiveColumns(parsedData.columns).map(col => (
                    <span
                      key={col}
                      className={`column-chip ${col === sensitiveCol ? 'sensitive' : ''}`}
                      onClick={() => { setSensitiveCol(col); setPrivilegedValue(''); }}
                    >
                      {col}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button className="btn btn-secondary" onClick={resetAll}>
              <Trash2 size={14} /> Start Over
            </button>
            <button
              className="btn btn-primary btn-lg"
              onClick={runAnalysis}
              disabled={!sensitiveCol || !targetCol || !favorableValue || !privilegedValue || isAnalyzing}
              id="run-analysis-btn"
            >
              {isAnalyzing ? <Loader size={16} /> : <Play size={16} />}
              {isAnalyzing ? 'Analyzing...' : 'Run Analysis'}
            </button>
          </div>

          {/* Progress */}
          {isAnalyzing && (
            <div className="card" style={{ marginTop: 20 }}>
              <div className="analysis-steps">
                {analyzeSteps.map((label, i) => (
                  <div
                    key={label}
                    className={`analysis-step ${i < analyzeStepIndex ? 'completed' : i === analyzeStepIndex ? 'active' : ''}`}
                  >
                    <div className="step-icon">
                      {i < analyzeStepIndex ? <CheckCircle size={12} /> :
                       i === analyzeStepIndex ? <Loader size={12} /> : null}
                    </div>
                    {label}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Results */}
      {step === 3 && analysisResult && (
        <div className="animate-in">
          <div className="card" style={{ textAlign: 'center', padding: '40px 24px' }}>
            <div style={{
              width: 48, height: 48, borderRadius: '50%', margin: '0 auto 12px',
              background: analysisResult.severity.level === 'good' ? 'var(--success-bg)' :
                analysisResult.severity.level === 'warning' ? 'var(--warning-bg)' : 'var(--danger-bg)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              {analysisResult.severity.level === 'good'
                ? <CheckCircle size={22} style={{ color: 'var(--success)' }} />
                : <AlertTriangle size={22} style={{
                    color: analysisResult.severity.level === 'warning' ? 'var(--warning)' : 'var(--danger)'
                  }} />}
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 4 }}>Analysis Complete</h3>
            <p className="text-secondary" style={{ maxWidth: 420, margin: '0 auto 20px', fontSize: '0.875rem' }}>
              {analysisResult.severity.description}
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
              <button className="btn btn-primary btn-lg" onClick={onViewReport} id="view-full-report-btn">
                View Report <ArrowRight size={16} />
              </button>
              <button className="btn btn-secondary" onClick={() => setStep(2)}>Reconfigure</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
