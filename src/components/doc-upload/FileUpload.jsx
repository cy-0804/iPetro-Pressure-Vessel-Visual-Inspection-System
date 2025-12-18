import React, { useState, useRef, useEffect } from "react";
import { FileUpload } from "primereact/fileupload";
import { ProgressSpinner } from "primereact/progressspinner";
import { storage } from "../../firebase";
import { ref, uploadBytes, getDownloadURL, listAll, deleteObject } from "firebase/storage";
import { Group, Text, Badge, CloseButton, Image, Paper } from "@mantine/core";
import { notifications } from '@mantine/notifications';
import { modals } from '@mantine/modals';
import "primereact/resources/themes/saga-blue/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";
import "./FileUpload.css";

const FileUploadComponent = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const fileUploadRef = useRef(null);

  // Load already uploaded documents from Firebase
  const fetchUploadedFiles = async () => {
    try {
      const listRef = ref(storage, "documents/");
      const res = await listAll(listRef);

      const items = await Promise.all(
        res.items.map(async (itemRef) => {
          const url = await getDownloadURL(itemRef);
          return {
            name: itemRef.name,
            url,
            fullPath: itemRef.fullPath,
          };
        })
      );

      setUploadedFiles(items);
    } catch (error) {
      console.error("Error fetching uploaded files:", error);
      notifications.show({
        title: 'Error',
        message: 'Could not load uploaded documents.',
        color: 'red',
        autoClose: 5000,
      });
    }
  };

  useEffect(() => {
    fetchUploadedFiles();
  }, []);

  const handleUpload = async (e) => {
    setIsUploading(true);

    try {
      const newlyUploaded = [];

      for (const file of e.files) {
        const storageRef = ref(storage, `documents/${Date.now()}-${file.name}`);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);

        newlyUploaded.push({
          name: storageRef.name,
          url,
          fullPath: storageRef.fullPath,
        });
      }

      if (fileUploadRef.current) {
        fileUploadRef.current.clear();
      }
      
      setUploadedFiles((prev) => [...prev, ...newlyUploaded]);

      notifications.show({
        title: 'Success',
        message: 'Files uploaded successfully',
        color: 'green',
        autoClose: 4000,
      });
    } catch (err) {
      console.error(err);
      notifications.show({
        title: 'Upload Failed',
        message: 'There was an error uploading the files.',
        color: 'red',
        autoClose: 5000,
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (file) => {
    modals.openConfirmModal({
      title: 'Delete File',
      children: (
        <Text size="sm">
          Are you sure you want to delete <strong>{file.name}</strong>?
        </Text>
      ),
      labels: { confirm: 'Delete', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          const fileRef = ref(storage, file.fullPath);
          await deleteObject(fileRef);

          setUploadedFiles((prev) =>
            prev.filter((item) => item.fullPath !== file.fullPath)
          );

          notifications.show({
            title: 'Success',
            message: 'File deleted successfully',
            color: 'green',
            autoClose: 3000,
          });
        } catch (error) {
          console.error("Error deleting file:", error);
          notifications.show({
            title: 'Delete Failed',
            message: 'Unable to delete file.',
            color: 'red',
            autoClose: 5000,
          });
        }
      },
    });
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0 || !bytes) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  const fileItemTemplate = (file, options) => {
    const isImage = file.type?.startsWith("image/");
    const sizeText = formatFileSize(file.size);

    return (
      <Paper withBorder radius="md" p="sm" className="prime-file-row">
        <Group justify="space-between" wrap="nowrap">
          <Group wrap="nowrap">
            {isImage && file.objectURL && (
              <Image
                src={file.objectURL}
                w={40}
                h={40}
                radius="md"
                alt={file.name}
              />
            )}

            <div>
              <Text size="sm" fw={500}>
                {file.name}
              </Text>

              <Group gap="xs">
                <Text size="xs" c="dimmed">
                  {sizeText}
                </Text>
                <Badge color="yellow" size="xs">
                  Pending
                </Badge>
              </Group>
            </div>
          </Group>

          <CloseButton
            aria-label="Remove file"
            onClick={options?.onRemove}
          />
        </Group>
      </Paper>
    );
  };

  return (
    <div className="upload-container">
      {/* Upload area (PrimeReact, but row UI is Mantine) */}
      <FileUpload
        ref={fileUploadRef}
        customUpload
        multiple
        uploadHandler={handleUpload}
        chooseLabel="Choose Files"
        uploadLabel="Upload"
        cancelLabel="Cancel"
        auto={false}
        itemTemplate={fileItemTemplate}
        emptyTemplate={
          <p className="m-0">Drag and drop files here to upload.</p>
        }
      />

      {/* Uploaded documents (already in Firebase) */}
      <div className="uploaded-files-section">
        <h3>Uploaded Documents</h3>

        {uploadedFiles.length === 0 ? (
          <p className="no-files-text">No documents uploaded yet.</p>
        ) : (
          <ul className="file-list">
            {uploadedFiles.map((file) => (
              <li key={file.fullPath} className="file-list-item">
                <span className="file-name">{file.name}</span>

                <div className="file-actions">
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="view-button"
                  >
                    View / Download
                  </a>
                  <button
                    type="button"
                    className="cancel-button"
                    onClick={() => handleDelete(file)}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {isUploading && (
        <div className="full-page-loading">
          <ProgressSpinner style={{ width: "100px", height: "100px" }} />
        </div>
      )}
    </div>
  );
};

export default FileUploadComponent;