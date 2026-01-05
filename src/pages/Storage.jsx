import React, { useState, useEffect, useCallback } from "react";
import { storage, db, auth } from "../firebase";
import { ref, listAll, getDownloadURL, deleteObject, getMetadata, uploadBytes } from "firebase/storage";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  where,
  serverTimestamp
} from "firebase/firestore";
import {
  Container,
  Paper,
  Title,
  Text,
  Button,
  Group,
  Stack,
  Table,
  ActionIcon,
  Badge,
  Box,
  Loader,
  Center,
  Modal,
  TextInput,
  Select,
  FileButton,
  Progress
} from "@mantine/core";
import {
  IconFolder,
  IconFile,
  IconDownload,
  IconTrash,
  IconSearch,
  IconRefresh,
  IconFileTypePdf,
  IconFileTypeDocx,
  IconFileTypePpt,
  IconFileTypeXls,
  IconPhoto,
  IconFolderPlus,
  IconUpload
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { modals } from "@mantine/modals";

const Storage = () => {
  const [folders, setFolders] = useState([]);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPath, setCurrentPath] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [createFolderModalOpen, setCreateFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);


  const fetchStorageData = useCallback(async () => {
    setLoading(true);
    try {
      const storageRef = ref(storage, currentPath);
      const result = await listAll(storageRef);


      const folderList = result.prefixes.map((folderRef) => ({
        name: folderRef.name,
        fullPath: folderRef.fullPath,
        type: "folder",
      }));

      
      const fileList = await Promise.all(
        result.items.map(async (itemRef) => {
          try {
           
            if (itemRef.name === '.placeholder') return null;

            const url = await getDownloadURL(itemRef);
            const metadata = await getMetadata(itemRef);

          
            const q = query(
              collection(db, "storage_files"),
              where("storagePath", "==", itemRef.fullPath)
            );
            const querySnapshot = await getDocs(q);
            
            let firestoreData = {};
            if (!querySnapshot.empty) {
              firestoreData = { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() };
            }

            return {
              name: itemRef.name,
              fullPath: itemRef.fullPath,
              url,
              size: metadata.size,
              contentType: metadata.contentType,
              timeCreated: metadata.timeCreated,
              type: "file",
              ...firestoreData, 
            };
          } catch (error) {
            console.error(`Error fetching file ${itemRef.name}:`, error);
            return null;
          }
        })
      );

      setFolders(folderList);
      setFiles(fileList.filter((file) => file !== null));
    } catch (error) {
      console.error("Error fetching storage data:", error);
      notifications.show({
        title: "Error",
        message: "Failed to load storage data",
        color: "red",
      });
    } finally {
      setLoading(false);
    }
  }, [currentPath]);

  useEffect(() => {
    fetchStorageData();
  }, [fetchStorageData]);

  
  const handleFileUpload = async (selectedFiles) => {
    if (!selectedFiles || selectedFiles.length === 0) return;

    setUploadingFiles(true);
    setUploadProgress(0);

    try {
      const user = auth.currentUser;
      const totalFiles = selectedFiles.length;
      let uploadedCount = 0;

      for (const file of selectedFiles) {
        const filePath = currentPath ? `${currentPath}/${file.name}` : file.name;
        const fileRef = ref(storage, filePath);
        
      
        await uploadBytes(fileRef, file);
        const url = await getDownloadURL(fileRef);

        await addDoc(collection(db, "storage_files"), {
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          fileExtension: file.name.split('.').pop().toLowerCase(),
          storagePath: filePath,
          url: url,
          folder: currentPath || 'root',
          uploadedBy: user?.uid || "anonymous",
          uploadedByName: user?.displayName || user?.email || "Unknown User",
          uploadedAt: serverTimestamp(),
        });
        
        uploadedCount++;
        setUploadProgress(Math.round((uploadedCount / totalFiles) * 100));
      }

      notifications.show({
        title: "Success",
        message: `${totalFiles} file(s) uploaded successfully`,
        color: "green",
      });

      fetchStorageData();
    } catch (error) {
      console.error("Error uploading files:", error);
      notifications.show({
        title: "Error",
        message: "Failed to upload files",
        color: "red",
      });
    } finally {
      setUploadingFiles(false);
      setUploadProgress(0);
    }
  };

  const handleFolderClick = (folderPath) => {
    setCurrentPath(folderPath);
  };

  const handleBackClick = () => {
    const pathParts = currentPath.split("/");
    pathParts.pop();
    setCurrentPath(pathParts.join("/"));
  };

 
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      notifications.show({
        title: "Validation Error",
        message: "Folder name cannot be empty",
        color: "red",
      });
      return;
    }

    const validFolderName = /^[a-zA-Z0-9-_]+$/;
    if (!validFolderName.test(newFolderName)) {
      notifications.show({
        title: "Invalid Name",
        message: "Folder name can only contain letters, numbers, hyphens and underscores",
        color: "red",
      });
      return;
    }

    setCreatingFolder(true);

    try {
      const user = auth.currentUser;
      const folderPath = currentPath ? `${currentPath}/${newFolderName}` : newFolderName;
      const placeholderRef = ref(storage, `${folderPath}/.placeholder`);
      
      const emptyBlob = new Blob([''], { type: 'text/plain' });
      await uploadBytes(placeholderRef, emptyBlob);

     
      await addDoc(collection(db, "storage_folders"), {
        folderName: newFolderName,
        folderPath: folderPath,
        parentPath: currentPath || 'root',
        createdBy: user?.uid || "anonymous",
        createdByName: user?.displayName || user?.email || "Unknown User",
        createdAt: serverTimestamp(),
      });

      notifications.show({
        title: "Success",
        message: `Folder "${newFolderName}" created successfully`,
        color: "green",
      });

      setCreateFolderModalOpen(false);
      setNewFolderName("");
      fetchStorageData();
    } catch (error) {
      console.error("Error creating folder:", error);
      notifications.show({
        title: "Error",
        message: "Failed to create folder",
        color: "red",
      });
    } finally {
      setCreatingFolder(false);
    }
  };

  const handleDeleteFile = async (file) => {
    modals.openConfirmModal({
      title: "Delete File",
      centered: true,
      children: (
        <Text size="sm">
          Are you sure you want to delete <Text component="span" fw={600}>{file.name}</Text>? This action cannot be undone.
        </Text>
      ),
      labels: { confirm: "Delete", cancel: "Cancel" },
      confirmProps: { color: "red", leftSection: <IconTrash size={16} /> },
      onConfirm: async () => {
        try {
          // Delete from Storage
          const fileRef = ref(storage, file.fullPath);
          await deleteObject(fileRef);

          // Delete from Firestore if exists
          if (file.id) {
            await deleteDoc(doc(db, "storage_files", file.id));
          }
          
          notifications.show({
            title: "Success",
            message: "File deleted successfully",
            color: "green",
          });
          
          fetchStorageData();
        } catch (error) {
          console.error("Error deleting file:", error);
          notifications.show({
            title: "Error",
            message: "Failed to delete file",
            color: "red",
          });
        }
      },
    });
  };

  //  Delete folder from Storage AND Firestore
  const handleDeleteFolder = async (folder) => {
    modals.openConfirmModal({
      title: "Delete Folder",
      centered: true,
      children: (
        <Text size="sm">
          Are you sure you want to delete the folder <Text component="span" fw={600}>{folder.name}</Text>? All files inside will be deleted. This action cannot be undone.
        </Text>
      ),
      labels: { confirm: "Delete", cancel: "Cancel" },
      confirmProps: { color: "red", leftSection: <IconTrash size={16} /> },
      onConfirm: async () => {
        try {
          // Delete from Storage
          const folderRef = ref(storage, folder.fullPath);
          const result = await listAll(folderRef);
          
          // Delete all files from Storage
          await Promise.all(
            result.items.map((itemRef) => deleteObject(itemRef))
          );

          // Delete all files from Firestore
          const q = query(
            collection(db, "storage_files"),
            where("folder", "==", folder.fullPath)
          );
          const querySnapshot = await getDocs(q);
          await Promise.all(
            querySnapshot.docs.map((docSnapshot) => 
              deleteDoc(doc(db, "storage_files", docSnapshot.id))
            )
          );

          // Delete folder from Firestore
          const folderQuery = query(
            collection(db, "storage_folders"),
            where("folderPath", "==", folder.fullPath)
          );
          const folderSnapshot = await getDocs(folderQuery);
          await Promise.all(
            folderSnapshot.docs.map((docSnapshot) => 
              deleteDoc(doc(db, "storage_folders", docSnapshot.id))
            )
          );

          notifications.show({
            title: "Success",
            message: "Folder deleted successfully",
            color: "green",
          });
          
          fetchStorageData();
        } catch (error) {
          console.error("Error deleting folder:", error);
          notifications.show({
            title: "Error",
            message: "Failed to delete folder",
            color: "red",
          });
        }
      },
    });
  };

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Unknown";
    return new Date(dateString).toLocaleString();
  };

  const getFileIcon = (contentType, fileName) => {
    const iconProps = { size: 20, stroke: 1.5 };
    
    if (contentType?.includes("pdf")) {
      return <IconFileTypePdf {...iconProps} color="#e53e3e" />;
    } else if (contentType?.includes("word") || fileName?.endsWith(".docx")) {
      return <IconFileTypeDocx {...iconProps} color="#2b6cb0" />;
    } else if (contentType?.includes("presentation") || fileName?.endsWith(".pptx")) {
      return <IconFileTypePpt {...iconProps} color="#dd6b20" />;
    } else if (contentType?.includes("spreadsheet") || fileName?.endsWith(".xlsx")) {
      return <IconFileTypeXls {...iconProps} color="#38a169" />;
    } else if (contentType?.includes("image")) {
      return <IconPhoto {...iconProps} color="#9f7aea" />;
    }
    return <IconFile {...iconProps} color="#718096" />;
  };

  const getFileType = (contentType) => {
    if (!contentType) return "Unknown";
    if (contentType.includes("pdf")) return "PDF";
    if (contentType.includes("word")) return "Word";
    if (contentType.includes("presentation")) return "PowerPoint";
    if (contentType.includes("spreadsheet")) return "Excel";
    if (contentType.includes("image")) return "Image";
    return contentType.split("/")[1]?.toUpperCase() || "File";
  };

  const filteredFiles = files.filter((file) => {
    const matchesSearch = file.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === "all" || file.contentType?.includes(filterType);
    return matchesSearch && matchesFilter;
  });

  const totalSize = files.reduce((acc, file) => acc + (file.size || 0), 0);

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        {/* Header */}
        <Box>
          <Group justify="space-between" align="center">
            <div>
              <Title order={1} mb="xs">Storage</Title>
              <Text c="dimmed">
                Manage your files and folders
              </Text>
            </div>
            <Group gap="xs">
              <FileButton onChange={handleFileUpload} multiple>
                {(props) => (
                  <Button
                    {...props}
                    leftSection={<IconUpload size={18} />}
                    variant="filled"
                    loading={uploadingFiles}
                  >
                    Upload Files
                  </Button>
                )}
              </FileButton>
              <Button
                leftSection={<IconFolderPlus size={18} />}
                onClick={() => setCreateFolderModalOpen(true)}
                variant="light"
              >
                New Folder
              </Button>
              <ActionIcon
                size="lg"
                variant="light"
                onClick={fetchStorageData}
                loading={loading}
              >
                <IconRefresh size={20} />
              </ActionIcon>
            </Group>
          </Group>
        </Box>

        {/* Upload Progress */}
        {uploadingFiles && (
          <Paper shadow="sm" p="md" radius="md" withBorder>
            <Stack gap="xs">
              <Group justify="space-between">
                <Text size="sm" fw={500}>Uploading files...</Text>
                <Text size="sm" c="dimmed">{uploadProgress}%</Text>
              </Group>
              <Progress value={uploadProgress} animated />
            </Stack>
          </Paper>
        )}

        {/* Storage Stats */}
        <Paper shadow="sm" p="md" radius="md" withBorder>
          <Group justify="space-between">
            <Group gap="xl">
              <Box>
                <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Total Files</Text>
                <Text size="xl" fw={700}>{files.length}</Text>
              </Box>
              <Box>
                <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Total Folders</Text>
                <Text size="xl" fw={700}>{folders.length}</Text>
              </Box>
              <Box>
                <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Total Size</Text>
                <Text size="xl" fw={700}>{formatFileSize(totalSize)}</Text>
              </Box>
            </Group>
          </Group>
        </Paper>

        {/* Navigation & Filters */}
        <Paper shadow="sm" p="md" radius="md" withBorder>
          <Stack gap="md">
            {/* Breadcrumb */}
            <Group gap="xs">
              <Text size="sm" fw={600}>Path:</Text>
              <Button
                variant="subtle"
                size="xs"
                onClick={() => setCurrentPath("")}
              >
                Root
              </Button>
              {currentPath.split("/").filter(Boolean).map((part, index) => (
                <React.Fragment key={index}>
                  <Text size="sm" c="dimmed">/</Text>
                  <Button
                    variant="subtle"
                    size="xs"
                    onClick={() => {
                      const pathParts = currentPath.split("/");
                      setCurrentPath(pathParts.slice(0, index + 1).join("/"));
                    }}
                  >
                    {part}
                  </Button>
                </React.Fragment>
              ))}
            </Group>

            {/* Search & Filter */}
            <Group>
              <TextInput
                placeholder="Search files..."
                leftSection={<IconSearch size={16} />}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.currentTarget.value)}
                style={{ flex: 1 }}
              />
              <Select
                placeholder="Filter by type"
                data={[
                  { value: "all", label: "All Files" },
                  { value: "pdf", label: "PDF" },
                  { value: "word", label: "Word" },
                  { value: "image", label: "Images" },
                ]}
                value={filterType}
                onChange={setFilterType}
                style={{ width: 200 }}
              />
            </Group>
          </Stack>
        </Paper>

        {/* File List */}
        <Paper shadow="sm" radius="md" withBorder>
          {loading ? (
            <Center py="xl">
              <Loader size="lg" />
            </Center>
          ) : (
            <Table highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Name</Table.Th>
                  <Table.Th>Type</Table.Th>
                  <Table.Th>Size</Table.Th>
                  <Table.Th>Uploaded By</Table.Th>
                  <Table.Th>Modified</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {/* Back button */}
                {currentPath && (
                  <Table.Tr style={{ cursor: "pointer" }} onClick={handleBackClick}>
                    <Table.Td>
                      <Group gap="xs">
                        <IconFolder size={20} color="#fab005" />
                        <Text fw={500}>..</Text>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Badge variant="light" color="gray">Folder</Badge>
                    </Table.Td>
                    <Table.Td>—</Table.Td>
                    <Table.Td>—</Table.Td>
                    <Table.Td>—</Table.Td>
                    <Table.Td>—</Table.Td>
                  </Table.Tr>
                )}

                {/* Folders */}
                {folders.map((folder) => (
                  <Table.Tr key={folder.fullPath}>
                    <Table.Td
                      style={{ cursor: "pointer" }}
                      onClick={() => handleFolderClick(folder.fullPath)}
                    >
                      <Group gap="xs">
                        <IconFolder size={20} color="#fab005" />
                        <Text fw={500}>{folder.name}</Text>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Badge variant="light" color="yellow">Folder</Badge>
                    </Table.Td>
                    <Table.Td>—</Table.Td>
                    <Table.Td>—</Table.Td>
                    <Table.Td>—</Table.Td>
                    <Table.Td>
                      <ActionIcon
                        variant="subtle"
                        color="red"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteFolder(folder);
                        }}
                      >
                        <IconTrash size={18} />
                      </ActionIcon>
                    </Table.Td>
                  </Table.Tr>
                ))}

                {/* Files */}
                {filteredFiles.map((file) => (
                  <Table.Tr key={file.fullPath}>
                    <Table.Td>
                      <Group gap="xs">
                        {getFileIcon(file.contentType, file.name)}
                        <Text size="sm">{file.name}</Text>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Badge variant="light" size="sm">
                        {getFileType(file.contentType)}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{formatFileSize(file.size)}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed">{file.uploadedByName || "Unknown"}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed">{formatDate(file.timeCreated)}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <ActionIcon
                          variant="subtle"
                          color="blue"
                          component="a"
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <IconDownload size={18} />
                        </ActionIcon>
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          onClick={() => handleDeleteFile(file)}
                        >
                          <IconTrash size={18} />
                        </ActionIcon>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}

                {filteredFiles.length === 0 && folders.length === 0 && !currentPath && (
                  <Table.Tr>
                    <Table.Td colSpan={6}>
                      <Center py="xl">
                        <Text c="dimmed">No files or folders found</Text>
                      </Center>
                    </Table.Td>
                  </Table.Tr>
                )}
              </Table.Tbody>
            </Table>
          )}
        </Paper>
      </Stack>

      {/* Create Folder Modal */}
      <Modal
        opened={createFolderModalOpen}
        onClose={() => {
          setCreateFolderModalOpen(false);
          setNewFolderName("");
        }}
        title="Create New Folder"
        centered
      >
        <Stack gap="md">
          <TextInput
            label="Folder Name"
            placeholder="e.g. reports, images, documents"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.currentTarget.value)}
            description="Only letters, numbers, hyphens and underscores allowed"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleCreateFolder();
              }
            }}
          />
          <Group justify="flex-end">
            <Button
              variant="subtle"
              onClick={() => {
                setCreateFolderModalOpen(false);
                setNewFolderName("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateFolder}
              loading={creatingFolder}
              leftSection={<IconFolderPlus size={18} />}
            >
              Create Folder
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
};

export default Storage;