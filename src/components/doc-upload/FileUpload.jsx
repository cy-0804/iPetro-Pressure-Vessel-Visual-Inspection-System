import React, { useState } from 'react';

const FileUpload = () => {
  const [files, setFiles] = useState([]);
  const [status, setStatus] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (event) => {
    const selectedFiles = Array.from(event.target.files || []);
    setFiles(selectedFiles);
    setStatus('');
  };

  const handleUpload = async (event) => {
    event.preventDefault();

    if (!files.length) {
      setStatus('Please select at least one file to upload.');
      return;
    }

    setIsUploading(true);
    setStatus('');

    try {
      const formData = new FormData();
      files.forEach((file) => formData.append('files', file));

      // change this to your real backend endpoint
      const res = await fetch('http://localhost:5000/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Upload failed');

      setStatus('✅ Files uploaded successfully.');
      setFiles([]);
    } catch (err) {
      console.error(err);
      setStatus('❌ Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <form onSubmit={handleUpload} style={{ marginTop: '1rem' }}>
      <div>
        <label htmlFor="documents">Select document(s): </label>
        <input
          id="documents"
          type="file"
          multiple
          onChange={handleFileChange}
          accept=".pdf,.doc,.docx,.xls,.xlsx,image/*"
        />
      </div>

      {files.length > 0 && (
        <ul style={{ marginTop: '0.5rem' }}>
          {files.map((file) => (
            <li key={file.name}>
              {file.name} ({(file.size / 1024).toFixed(1)} KB)
            </li>
          ))}
        </ul>
      )}

      <button
        type="submit"
        disabled={!files.length || isUploading}
        style={{ marginTop: '0.75rem' }}
      >
        {isUploading ? 'Uploading…' : 'Upload'}
      </button>

      {status && <p style={{ marginTop: '0.5rem' }}>{status}</p>}
    </form>
  );
};

export default FileUpload;
