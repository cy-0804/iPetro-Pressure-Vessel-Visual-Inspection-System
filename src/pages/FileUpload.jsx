import React, { useState, useEffect } from "react";
import { storage } from "../firebase";
import { ref, uploadBytes, getDownloadURL, listAll, deleteObject } from "firebase/storage";
import {
  Container,
  Paper,
  Title,
  Text,
  Button,
  Group,
  Stack,
  Badge,
  ActionIcon,
  Card,
  Grid,
  Box,
  ThemeIcon,
  Loader,
  Center,
  FileButton
} from "@mantine/core";
import {
  IconUpload,
  IconFile,
  IconFileTypePdf,
  IconFileTypeDocx,
  IconFileTypePpt,
  IconFileTypeXls,
  IconDownload,
  IconTrash,
  IconCloudUpload
} from "@tabler/icons-react";
import { notifications } from '@mantine/notifications';
import { modals } from '@mantine/modals';

const FileUploadComponent = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load already uploaded documents from Firebase
  const fetchUploadedFiles = async () => {
    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUploadedFiles();
  }, []);

  const handleUpload = async (files) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);

    try {
      const newlyUploaded = [];

      for (const file of files) {
        const storageRef = ref(storage, `documents/${Date.now()}-${file.name}`);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);

        newlyUploaded.push({
          name: storageRef.name,
          url,
          fullPath: storageRef.fullPath,
        });
      }
      
      setUploadedFiles((prev) => [...prev, ...newlyUploaded]);

      notifications.show({
        title: 'Success',
        message: `${newlyUploaded.length} file(s) uploaded successfully`,
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
      title: 'Delete Document',
      centered: true,
      children: (
        <Text size="sm">
          Are you sure you want to delete <Text component="span" fw={600}>{getCleanFileName(file.name)}</Text>? This action cannot be undone.
        </Text>
      ),
      labels: { confirm: 'Delete', cancel: 'Cancel' },
      confirmProps: { color: 'red', leftSection: <IconTrash size={16} /> },
      onConfirm: async () => {
        try {
          const fileRef = ref(storage, file.fullPath);
          await deleteObject(fileRef);

          setUploadedFiles((prev) =>
            prev.filter((item) => item.fullPath !== file.fullPath)
          );

          notifications.show({
            title: 'Success',
            message: 'Document deleted successfully',
            color: 'green',
            autoClose: 3000,
          });
        } catch (error) {
          console.error("Error deleting file:", error);
          notifications.show({
            title: 'Delete Failed',
            message: 'Unable to delete document.',
            color: 'red',
            autoClose: 5000,
          });
        }
      },
    });
  };

  const getFileIcon = (fileName) => {
    const ext = fileName.split('.').pop().toLowerCase();
    const iconProps = { size: 32, stroke: 1.5 };

    switch (ext) {
      case 'pdf':
        return <IconFileTypePdf {...iconProps} color="#e53e3e" />;
      case 'doc':
      case 'docx':
        return <IconFileTypeDocx {...iconProps} color="#2b6cb0" />;
      case 'ppt':
      case 'pptx':
        return <IconFileTypePpt {...iconProps} color="#dd6b20" />;
      case 'xls':
      case 'xlsx':
        return <IconFileTypeXls {...iconProps} color="#38a169" />;
      default:
        return <IconFile {...iconProps} color="#718096" />;
    }
  };

  const getCleanFileName = (fileName) => {
    // Remove timestamp prefix (e.g., "1766042255743-")
    return fileName.replace(/^\d+-/, '');
  };

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        {/* Header */}
        <Box>
          <Title order={1} mb="xs">Document Management</Title>
          <Text c="dimmed">Upload and manage your inspection documents</Text>
        </Box>

        {/* Upload Section */}
        <Paper shadow="sm" p="xl" radius="md" withBorder>
          <Stack gap="md">
            <Group gap="xs">
              <ThemeIcon size="lg" variant="light" color="blue">
                <IconCloudUpload size={20} />
              </ThemeIcon>
              <div>
                <Text fw={600} size="lg">Upload Documents</Text>
                <Text size="sm" c="dimmed">Click to browse and select files</Text>
              </div>
            </Group>

            {/* Custom Upload Area with FileButton */}
            <FileButton onChange={handleUpload} accept="*" multiple>
              {(props) => (
                <Paper
                  {...props}
                  withBorder
                  p="xl"
                  radius="md"
                  style={{
                    border: '2px dashed #228be6',
                    backgroundColor: '#f8f9fa',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#e7f5ff';
                    e.currentTarget.style.borderColor = '#1c7ed6';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#f8f9fa';
                    e.currentTarget.style.borderColor = '#228be6';
                  }}
                >
                  <Center>
                    <Stack align="center" gap="md">
                      <ThemeIcon size={60} radius="xl" variant="light" color="blue">
                        <IconUpload size={30} />
                      </ThemeIcon>
                      <div style={{ textAlign: 'center' }}>
                        <Text size="lg" fw={600} mb={4}>
                          Click here to select files
                        </Text>
                        <Text size="sm" c="dimmed">
                          Support for PDF, Word, Excel, PowerPoint and more
                        </Text>
                      </div>
                      <Button variant="light" leftSection={<IconUpload size={16} />}>
                        Select Files
                      </Button>
                    </Stack>
                  </Center>
                </Paper>
              )}
            </FileButton>
          </Stack>
        </Paper>

        {/* Uploaded Documents Section */}
        <Paper shadow="sm" p="xl" radius="md" withBorder>
          <Stack gap="md">
            <Group justify="space-between" align="center">
              <div>
                <Title order={3}>Uploaded Documents</Title>
                <Text size="sm" c="dimmed" mt={4}>
                  {uploadedFiles.length} document{uploadedFiles.length !== 1 ? 's' : ''} in storage
                </Text>
              </div>
              <Badge size="lg" variant="light" color="blue">
                {uploadedFiles.length} files
              </Badge>
            </Group>

            {loading ? (
              <Center py="xl">
                <Loader size="lg" />
              </Center>
            ) : uploadedFiles.length === 0 ? (
              <Center py="xl">
                <Stack align="center" gap="xs">
                  <ThemeIcon size={60} radius="xl" variant="light" color="gray">
                    <IconFile size={30} />
                  </ThemeIcon>
                  <Text size="lg" fw={500} c="dimmed">
                    No documents uploaded yet
                  </Text>
                  <Text size="sm" c="dimmed">
                    Upload your first document to get started
                  </Text>
                </Stack>
              </Center>
            ) : (
              <Grid gutter="md">
                {uploadedFiles.map((file) => (
                  <Grid.Col span={{ base: 12, sm: 6, lg: 4 }} key={file.fullPath}>
                    <Card
                      shadow="sm"
                      padding="lg"
                      radius="md"
                      withBorder
                      style={{
                        height: '100%',
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-4px)';
                        e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '';
                      }}
                    >
                      <Stack gap="md">
                        {/* File Icon */}
                        <Group justify="space-between" align="flex-start">
                          <ThemeIcon size={50} radius="md" variant="light" color="blue">
                            {getFileIcon(file.name)}
                          </ThemeIcon>
                          <ActionIcon
                            variant="subtle"
                            color="red"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(file);
                            }}
                          >
                            <IconTrash size={18} />
                          </ActionIcon>
                        </Group>

                        {/* File Name */}
                        <div>
                          <Text
                            fw={600}
                            size="sm"
                            lineClamp={2}
                            title={getCleanFileName(file.name)}
                          >
                            {getCleanFileName(file.name)}
                          </Text>
                          <Text size="xs" c="dimmed" mt={4}>
                            {getCleanFileName(file.name).split('.').pop().toUpperCase()}
                          </Text>
                        </div>

                        {/* Actions */}
                        <Button
                          variant="light"
                          fullWidth
                          leftSection={<IconDownload size={16} />}
                          component="a"
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                        >
                          View / Download
                        </Button>
                      </Stack>
                    </Card>
                  </Grid.Col>
                ))}
              </Grid>
            )}
          </Stack>
        </Paper>
      </Stack>

      {/* Loading Overlay */}
      {isUploading && (
        <Box
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 10000,
          }}
        >
          <Loader size="xl" />
          <Text mt="md" fw={600}>Uploading documents...</Text>
          <Text size="sm" c="dimmed">Please wait</Text>
        </Box>
      )}
    </Container>
  );
};

export default FileUploadComponent;