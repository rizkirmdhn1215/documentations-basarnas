"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Snackbar, Alert, Autocomplete, Chip,
  LinearProgress, Box, ThemeProvider, createTheme, CssBaseline,
  IconButton, List, ListItem, ListItemText, ListItemSecondaryAction
} from "@mui/material";
import { CloudUpload, Delete, CheckCircle, Error as ErrorIcon, Refresh } from "@mui/icons-material";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

// Dark Theme for MUI to match app style
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#ef4444' }, // Basarnas Red
    secondary: { main: '#22c55e' }, // Basarnas Green
    background: {
      default: '#0f172a',
      paper: '#1e293b',
    },
    text: { primary: '#f8fafc', secondary: '#94a3b8' }
  },
  typography: { fontFamily: 'inherit' },
  components: {
    MuiDialog: { styleOverrides: { paper: { backgroundImage: 'none' } } }
  }
});

export default function ArchivePage() {
  const router = useRouter();
  const [years, setYears] = useState([]);
  const [expandedYear, setExpandedYear] = useState(null);
  const [months, setMonths] = useState([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // Multi-file upload state
  const [uploadFiles, setUploadFiles] = useState([]);
  const [uploadSession, setUploadSession] = useState(null);
  const [uploadedTempFiles, setUploadedTempFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState({});
  const [uploadStage, setUploadStage] = useState('selecting'); // 'selecting' | 'uploading' | 'reviewing' | 'committing'

  // Metadata state (shared for all files)
  const [uploadDate, setUploadDate] = useState(getTodayDate());
  const [uploadTags, setUploadTags] = useState([]);
  const [uploadDescription, setUploadDescription] = useState("");

  // Snackbar State
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  function getTodayDate() {
    return new Date().toISOString().split('T')[0];
  }

  // Available tags for autocomplete
  const [availableTags, setAvailableTags] = useState([]);

  // Drag and Drop State
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    fetchYears();
    fetchTags();

    // Global Paste Handler
    const handlePaste = (e) => {
      if (!showUploadModal || uploadStage !== 'selecting') return;

      const items = e.clipboardData?.items;
      if (!items) return;

      const newFiles = [];
      for (const item of items) {
        if (item.kind === 'file') {
          const file = item.getAsFile();
          if (file && (file.type.startsWith('image/') || file.type.startsWith('video/'))) {
            newFiles.push(file);
          }
        }
      }

      if (newFiles.length > 0) {
        setUploadFiles(prev => [...prev, ...newFiles]);
        setSnackbar({ open: true, message: `${newFiles.length} file(s) pasted from clipboard!`, severity: "success" });
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [showUploadModal, uploadStage]);

  async function fetchTags() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/tags`);
      const data = await response.json();
      if (data.success) {
        setAvailableTags(data.tags);
      }
    } catch (error) {
      console.error("Error fetching tags:", error);
    }
  }

  async function fetchYears() {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/media/years`);
      const data = await response.json();
      if (data.success) {
        setYears(data.years);
      }
    } catch (error) {
      console.error("Error fetching years:", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchMonths(year) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/media/${year}/months`);
      const data = await response.json();
      if (data.success) {
        setMonths(data.months);
      }
    } catch (error) {
      console.error("Error fetching months:", error);
    }
  }

  function handleYearClick(year) {
    if (expandedYear === year) {
      setExpandedYear(null);
      setMonths([]);
    } else {
      setExpandedYear(year);
      fetchMonths(year);
    }
  }

  function handleMonthClick(year, month) {
    router.push(`/media/${year}/${month}`);
  }

  function handleFileChange(e) {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(f => f.type.startsWith('image/') || f.type.startsWith('video/'));

    if (validFiles.length > 0) {
      setUploadFiles(prev => [...prev, ...validFiles]);
      setSnackbar({ open: true, message: `${validFiles.length} file(s) selected`, severity: "success" });
    }

    if (validFiles.length < files.length) {
      setSnackbar({ open: true, message: "Some files were skipped (only images and videos allowed)", severity: "warning" });
    }
  }

  // Drag Handlers
  function handleDragOver(e) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(e) {
    e.preventDefault();
    setIsDragging(false);

    if (uploadStage !== 'selecting') return;

    const files = Array.from(e.dataTransfer.files || []);
    const validFiles = files.filter(f => f.type.startsWith('image/') || f.type.startsWith('video/'));

    if (validFiles.length > 0) {
      setUploadFiles(prev => [...prev, ...validFiles]);
      setSnackbar({ open: true, message: `${validFiles.length} file(s) dropped!`, severity: "success" });
    } else {
      setSnackbar({ open: true, message: "Only images and videos are allowed.", severity: "warning" });
    }
  }

  function removeFile(index) {
    setUploadFiles(prev => prev.filter((_, i) => i !== index));
  }

  // Stage 2: Upload files to temp storage
  async function handleStartUpload() {
    if (uploadFiles.length === 0) {
      setSnackbar({ open: true, message: "Please select at least one file", severity: "warning" });
      return;
    }

    setUploadStage('uploading');
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setUploadSession(sessionId);

    const tempFiles = [];
    const progress = {};

    for (let i = 0; i < uploadFiles.length; i++) {
      const file = uploadFiles[i];
      const fileKey = `file_${i}`;

      try {
        progress[fileKey] = { status: 'uploading', progress: 0 };
        setUploadProgress({ ...progress });

        const formData = new FormData();
        formData.append('file', file);
        formData.append('sessionId', sessionId);

        const response = await fetch(`${API_BASE_URL}/api/media/upload/temp`, {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();

        if (data.success) {
          progress[fileKey] = { status: 'success', progress: 100, file: data.file };
          tempFiles.push(data.file);
        } else {
          progress[fileKey] = { status: 'error', progress: 0, error: data.error };
        }
      } catch (error) {
        console.error(`Error uploading file ${i}:`, error);
        progress[fileKey] = { status: 'error', progress: 0, error: error.message };
      }

      setUploadProgress({ ...progress });
    }

    setUploadedTempFiles(tempFiles);

    if (tempFiles.length > 0) {
      setUploadStage('reviewing');
      setSnackbar({ open: true, message: `${tempFiles.length} file(s) uploaded to temporary storage`, severity: "success" });
    } else {
      setSnackbar({ open: true, message: "All uploads failed. Please try again.", severity: "error" });
      setUploadStage('selecting');
    }
  }

  // Stage 3: Retry failed uploads
  async function retryFailedUploads() {
    const failedKeys = Object.keys(uploadProgress).filter(key => uploadProgress[key].status === 'error');

    if (failedKeys.length === 0) return;

    for (const key of failedKeys) {
      const index = parseInt(key.split('_')[1]);
      const file = uploadFiles[index];

      try {
        const progress = { ...uploadProgress };
        progress[key] = { status: 'uploading', progress: 0 };
        setUploadProgress(progress);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('sessionId', uploadSession);

        const response = await fetch(`${API_BASE_URL}/api/media/upload/temp`, {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();

        if (data.success) {
          progress[key] = { status: 'success', progress: 100, file: data.file };
          setUploadedTempFiles(prev => [...prev, data.file]);
        } else {
          progress[key] = { status: 'error', progress: 0, error: data.error };
        }

        setUploadProgress(progress);
      } catch (error) {
        const progress = { ...uploadProgress };
        progress[key] = { status: 'error', progress: 0, error: error.message };
        setUploadProgress(progress);
      }
    }
  }

  // Stage 4: Commit to S3 and database
  async function handleCommit() {
    setUploadStage('committing');

    try {
      const response = await fetch(`${API_BASE_URL}/api/media/upload/commit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: uploadSession,
          files: uploadedTempFiles,
          metadata: {
            date: uploadDate,
            tags: uploadTags,
            description: uploadDescription
          }
        }),
      });

      const data = await response.json();

      if (data.success) {
        const successCount = data.results.filter(r => r.success).length;
        setSnackbar({ open: true, message: `Successfully uploaded ${successCount} file(s) to archive!`, severity: "success" });
        setShowUploadModal(false);
        resetUploadForm();
        fetchYears();
      } else {
        setSnackbar({ open: true, message: `Commit failed: ${data.error}`, severity: "error" });
        setUploadStage('reviewing');
      }
    } catch (error) {
      console.error("Error committing:", error);
      setSnackbar({ open: true, message: "Commit failed. Please try again.", severity: "error" });
      setUploadStage('reviewing');
    }
  }

  // Cancel upload session
  async function handleCancel() {
    if (uploadSession) {
      try {
        await fetch(`${API_BASE_URL}/api/media/upload/cancel/${uploadSession}`, {
          method: 'DELETE',
        });
      } catch (error) {
        console.error("Error cancelling session:", error);
      }
    }

    setShowUploadModal(false);
    resetUploadForm();
  }

  function resetUploadForm() {
    setUploadFiles([]);
    setUploadSession(null);
    setUploadedTempFiles([]);
    setUploadProgress({});
    setUploadStage('selecting');
    setUploadDate(getTodayDate());
    setUploadTags([]);
    setUploadDescription("");
  }

  function formatFileSize(bytes) {
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  }

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <div className={styles.page}>
        <header className={styles.header}>
          <div className={styles.title}>
            <div className={styles.logo}></div>
            <span>BASARNAS Media Archive</span>
          </div>
          <button
            className={styles.uploadButton}
            onClick={() => setShowUploadModal(true)}
          >
            <span>📤</span>
            Upload Media
          </button>
        </header>

        {loading ? (
          <div className={styles.loading}>Loading archive...</div>
        ) : years.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>📁</div>
            <p>No media in archive yet. Upload your first file!</p>
          </div>
        ) : (
          <div className={styles.treeView}>
            {years.map(year => (
              <div
                key={year}
                className={`${styles.yearItem} ${expandedYear === year ? styles.expanded : ''}`}
              >
                <div
                  className={styles.yearHeader}
                  onClick={() => handleYearClick(year)}
                >
                  <div className={styles.folderIcon}>📁</div>
                  <div className={styles.yearTitle}>{year}</div>
                  <div className={styles.expandIcon}>▶</div>
                </div>

                {expandedYear === year && months.length > 0 && (
                  <div className={styles.monthsContainer}>
                    {months.map(({ month, count }) => (
                      <div
                        key={month}
                        className={styles.monthItem}
                        onClick={() => handleMonthClick(year, month)}
                      >
                        <div className={styles.monthIcon}>📄</div>
                        <div className={styles.monthName}>{MONTH_NAMES[month - 1]}</div>
                        <div className={styles.monthCount}>{count}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Multi-File Upload Dialog */}
        <Dialog
          open={showUploadModal}
          onClose={uploadStage === 'uploading' || uploadStage === 'committing' ? undefined : handleCancel}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            {uploadStage === 'selecting' && 'Select Files to Upload'}
            {uploadStage === 'uploading' && 'Uploading to Temporary Storage...'}
            {uploadStage === 'reviewing' && 'Review and Submit'}
            {uploadStage === 'committing' && 'Committing to Archive...'}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>

              {/* Stage 1: File Selection */}
              {uploadStage === 'selecting' && (
                <>
                  <div
                    style={{ position: 'relative' }}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <input
                      type="file"
                      id="file-upload-multi"
                      style={{ display: 'none' }}
                      accept="image/*,video/*"
                      multiple
                      onChange={handleFileChange}
                    />
                    <label htmlFor="file-upload-multi">
                      <Box sx={{
                        border: '2px dashed',
                        borderColor: isDragging ? '#ef4444' : '#4b5563',
                        bgcolor: isDragging ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
                        borderRadius: 2,
                        p: 3,
                        textAlign: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        '&:hover': { borderColor: '#ef4444', bgcolor: 'rgba(239,68,68,0.05)' }
                      }}>
                        <CloudUpload sx={{ fontSize: 40, color: isDragging ? '#ef4444' : '#94a3b8', mb: 1 }} />
                        <div>
                          {isDragging ? "Drop files here!" : "Click, Drag & Drop, or Paste (Ctrl+V)"}
                        </div>
                        <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>Multiple Images and Videos</div>
                      </Box>
                    </label>
                  </div>

                  {uploadFiles.length > 0 && (
                    <Box>
                      <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
                        Selected Files ({uploadFiles.length})
                      </div>
                      <List dense>
                        {uploadFiles.map((file, index) => (
                          <ListItem key={index} sx={{ bgcolor: 'rgba(255,255,255,0.05)', mb: 0.5, borderRadius: 1 }}>
                            <ListItemText
                              primary={file.name}
                              secondary={formatFileSize(file.size)}
                            />
                            <ListItemSecondaryAction>
                              <IconButton edge="end" onClick={() => removeFile(index)} size="small">
                                <Delete fontSize="small" />
                              </IconButton>
                            </ListItemSecondaryAction>
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  )}
                </>
              )}

              {/* Stage 2: Uploading Progress */}
              {uploadStage === 'uploading' && (
                <Box>
                  <List dense>
                    {Object.entries(uploadProgress).map(([key, info]) => {
                      const index = parseInt(key.split('_')[1]);
                      const file = uploadFiles[index];

                      return (
                        <ListItem key={key} sx={{ bgcolor: 'rgba(255,255,255,0.05)', mb: 0.5, borderRadius: 1 }}>
                          <ListItemText
                            primary={file?.name || 'Unknown'}
                            secondary={
                              info.status === 'uploading' ? 'Uploading...' :
                                info.status === 'success' ? 'Uploaded successfully' :
                                  `Error: ${info.error}`
                            }
                          />
                          <ListItemSecondaryAction>
                            {info.status === 'success' && <CheckCircle sx={{ color: '#22c55e' }} />}
                            {info.status === 'error' && <ErrorIcon sx={{ color: '#ef4444' }} />}
                          </ListItemSecondaryAction>
                        </ListItem>
                      );
                    })}
                  </List>
                </Box>
              )}

              {/* Stage 3: Review */}
              {uploadStage === 'reviewing' && (
                <>
                  <Box>
                    <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
                      Uploaded Files ({uploadedTempFiles.length})
                    </div>
                    <List dense>
                      {uploadedTempFiles.map((file, index) => (
                        <ListItem key={index} sx={{ bgcolor: 'rgba(34, 197, 94, 0.1)', mb: 0.5, borderRadius: 1 }}>
                          <CheckCircle sx={{ color: '#22c55e', mr: 1 }} />
                          <ListItemText
                            primary={file.originalFilename}
                            secondary={formatFileSize(file.size)}
                          />
                        </ListItem>
                      ))}
                    </List>

                    {/* Show failed uploads with retry option */}
                    {Object.values(uploadProgress).some(p => p.status === 'error') && (
                      <Box sx={{ mt: 2 }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#ef4444' }}>
                          Failed Uploads
                        </div>
                        <List dense>
                          {Object.entries(uploadProgress)
                            .filter(([_, info]) => info.status === 'error')
                            .map(([key, info]) => {
                              const index = parseInt(key.split('_')[1]);
                              const file = uploadFiles[index];

                              return (
                                <ListItem key={key} sx={{ bgcolor: 'rgba(239, 68, 68, 0.1)', mb: 0.5, borderRadius: 1 }}>
                                  <ErrorIcon sx={{ color: '#ef4444', mr: 1 }} />
                                  <ListItemText
                                    primary={file?.name}
                                    secondary={info.error}
                                  />
                                </ListItem>
                              );
                            })}
                        </List>
                        <Button
                          startIcon={<Refresh />}
                          onClick={retryFailedUploads}
                          variant="outlined"
                          color="error"
                          size="small"
                          sx={{ mt: 1 }}
                        >
                          Retry Failed Uploads
                        </Button>
                      </Box>
                    )}
                  </Box>

                  <TextField
                    label="Date"
                    type="date"
                    value={uploadDate}
                    onChange={(e) => setUploadDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    fullWidth
                  />

                  <Autocomplete
                    multiple
                    freeSolo
                    options={availableTags}
                    value={uploadTags}
                    onChange={(event, newValue) => setUploadTags(newValue)}
                    renderTags={(value, getTagProps) =>
                      value.map((option, index) => (
                        <Chip
                          variant="outlined"
                          label={option}
                          {...getTagProps({ index })}
                          key={option}
                        />
                      ))
                    }
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Tags (applies to all files)"
                        placeholder="Add tags"
                      />
                    )}
                  />

                  <TextField
                    label="Description (Optional, applies to all files)"
                    multiline
                    rows={3}
                    value={uploadDescription}
                    onChange={(e) => setUploadDescription(e.target.value)}
                    fullWidth
                  />
                </>
              )}

              {/* Stage 4: Committing */}
              {uploadStage === 'committing' && (
                <Box sx={{ textAlign: 'center', py: 3 }}>
                  <LinearProgress color="primary" sx={{ mb: 2 }} />
                  <div>Uploading files to S3 and saving to database...</div>
                  <div style={{ fontSize: '0.9rem', opacity: 0.7, marginTop: '8px' }}>
                    Please wait, this may take a moment.
                  </div>
                </Box>
              )}

            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            {uploadStage === 'selecting' && (
              <>
                <Button onClick={handleCancel} color="inherit">Cancel</Button>
                <Button
                  onClick={handleStartUpload}
                  variant="contained"
                  color="primary"
                  disabled={uploadFiles.length === 0}
                  startIcon={<CloudUpload />}
                >
                  Start Upload ({uploadFiles.length})
                </Button>
              </>
            )}

            {uploadStage === 'reviewing' && (
              <>
                <Button onClick={handleCancel} color="inherit">Cancel & Delete Temp Files</Button>
                <Button
                  onClick={handleCommit}
                  variant="contained"
                  color="primary"
                  disabled={uploadedTempFiles.length === 0}
                  startIcon={<CheckCircle />}
                >
                  Submit to Archive ({uploadedTempFiles.length})
                </Button>
              </>
            )}
          </DialogActions>
        </Dialog>

        {/* Snackbar for Notifications */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert
            onClose={() => setSnackbar({ ...snackbar, open: false })}
            severity={snackbar.severity}
            variant="filled"
            sx={{ width: '100%' }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </div>
    </ThemeProvider>
  );
}
