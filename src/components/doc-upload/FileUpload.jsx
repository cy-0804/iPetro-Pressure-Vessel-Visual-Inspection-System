import React, { useState, useRef } from "react";
import { FileUpload } from "primereact/fileupload";
import { storage } from "../../firebase/upload"; // Firebase storage configuration
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Toast } from "primereact/toast";
import { ProgressSpinner } from 'primereact/progressspinner'; // Import the ProgressSpinner component
import 'primereact/resources/themes/saga-blue/theme.css';
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';
import './FileUpload.css';

const FileUploadComponent = () => {
  const [isUploading, setIsUploading] = useState(false);
  // const [status, setStatus] = useState("");
  const toast = useRef(null);
  const fileUploadRef = useRef(null);

  const handleUpload = async (e) => {
    setIsUploading(true);
    // setStatus("Uploading...");

    try {
      for (const file of e.files) {
        const storageRef = ref(storage, `documents/${Date.now()}-${file.name}`);
        await uploadBytes(storageRef, file); // Upload the file to Firebase Storage
        const url = await getDownloadURL(storageRef); // Get the download URL for the uploaded file
        console.log("Uploaded file URL:", url);
      }

      fileUploadRef.current.clear(); // Clears the file list from the UI

      // setStatus("✅ Files uploaded to Firebase successfully!");
      toast.current.show({
        severity: 'success',
        summary: 'Upload Success',
        detail: 'Files uploaded successfully.'
      });
    } catch (err) {
      console.error(err);
      // setStatus("❌ Upload failed.");
      toast.current.show({
        severity: 'error',
        summary: 'Upload Failed',
        detail: 'There was an error uploading the files.'
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="upload-container">
      <Toast ref={toast} />

      <FileUpload
        ref={fileUploadRef}
        customUpload
        multiple
        uploadHandler={handleUpload}
        chooseLabel="Choose Files"
        uploadLabel="Upload"
        cancelLabel="Cancel"
        cancelIcon="pi pi-times"
        cancelButtonClassName="cancel-button"
        disabled={isUploading}
        dragDrop={true}
        className="file-upload"
        emptyTemplate={<p className="m-0">Drag and drop files to here to upload.</p>}
      />

      {/* Full page loading spinner */}
      {isUploading && (
        <div className="full-page-loading">
          <ProgressSpinner style={{ width: '100px', height: '100px' }} />
        </div>
      )}

      {/* <p>{status}</p> Show status of the upload */}
    </div>
  );
};

export default FileUploadComponent;
