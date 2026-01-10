import React, { useState, useEffect, useRef } from "react";
import { storage, db, auth } from "../firebase";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  orderBy,
  getDoc,
  where,
} from "firebase/firestore";
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
  TextInput,
  Select,
  Modal,
} from "@mantine/core";
import {
  IconUpload,
  IconFile,
  IconFileTypePdf,
  IconDownload,
  IconTrash,
  IconCloudUpload,
  IconFileDescription,
  IconTag,
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { modals } from "@mantine/modals";
import { useTheme } from "../components/context/ThemeContext";
import { useNavigate } from "react-router-dom";

const FileUploadComponent = () => {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === "dark";
  const navigate = useNavigate();
  
  const fileInputRef = useRef(null);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  
  const [showReportModal, setShowReportModal] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);
  const [reportDetails, setReportDetails] = useState({
    reportNo: "",
    equipmentId: "",
    equipmentDescription: "",
    inspectionDate: new Date().toISOString().split('T')[0],
    planId: "",
  });
  const [inspectionPlans, setInspectionPlans] = useState([]);

  // Fetch inspection plans for dropdown
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) return;

        let inspectorName = currentUser.displayName || currentUser.email;
        try {
          const userDoc = await getDoc(doc(db, "users", currentUser.uid));
          if (userDoc.exists()) {
            const uData = userDoc.data();
            if (uData.firstName && uData.lastName) {
              inspectorName = `${uData.firstName} ${uData.lastName}`;
            } else if (uData.fullName) {
              inspectorName = uData.fullName;
            }
          }
        } catch (err) {
          console.warn("Error fetching user profile:", err);
        }

        const plansQuery = query(collection(db, "inspection_plans"));
        const plansSnapshot = await getDocs(plansQuery);
        const plans = plansSnapshot.docs.map((doc) => ({
          value: doc.id,
          label: doc.data().title || "Untitled Plan",
          data: doc.data(),
        })).filter(plan => 
          plan.data.assignedTo === inspectorName || 
          plan.data.status === "IN_PROGRESS"
        );

        setInspectionPlans(plans);
      } catch (error) {
        console.error("Error fetching plans:", error);
      }
    };

    fetchPlans();
  }, []);

  // Load documents from Firestore - only show Draft status reports
  const fetchUploadedFiles = async () => {
    setLoading(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const q = query(
        collection(db, "documents"),
        orderBy("uploadedAt", "desc")
      );
      const querySnapshot = await getDocs(q);

      const items = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Filter to only show files that have Draft status in inspections
      const enrichedItems = [];
      for (const item of items) {
        if (item.reportNo) {
          // Check if this report is still in Draft status
          const inspectionQuery = query(
            collection(db, "inspections"),
            where("reportNo", "==", item.reportNo)
          );
          const inspectionSnapshot = await getDocs(inspectionQuery);
          
          if (!inspectionSnapshot.empty) {
            const inspection = inspectionSnapshot.docs[0].data();
            // Only show if status is Draft, FIELD_COMPLETED, or COMPLETED (not submitted/approved)
            if (["Draft", "FIELD_COMPLETED", "COMPLETED"].includes(inspection.status)) {
              enrichedItems.push(item);
            }
          }
        } else {
          // Show files without report number
          enrichedItems.push(item);
        }
      }

      setUploadedFiles(enrichedItems);
    } catch (error) {
      console.error("Error fetching uploaded files:", error);
      notifications.show({
        title: "Error",
        message: "Could not load uploaded documents.",
        color: "red",
        autoClose: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUploadedFiles();
  }, []);

  const createInspectionReport = async (file, fileUrl) => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("User not authenticated");

      let inspectorName = user.displayName || user.email;
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const uData = userDoc.data();
          if (uData.firstName && uData.lastName) {
            inspectorName = `${uData.firstName} ${uData.lastName}`;
          } else if (uData.fullName) {
            inspectorName = uData.fullName;
          }
        }
      } catch (err) {
        console.warn("Error fetching user profile:", err);
      }

      const reportNo = reportDetails.reportNo;

      const reportData = {
        reportNo: reportNo,
        equipmentId: reportDetails.equipmentId || "N/A",
        equipmentDescription: reportDetails.equipmentDescription || file.name,
        inspectionDate: reportDetails.inspectionDate,
        planId: reportDetails.planId || null,
        planTitle: reportDetails.planId 
          ? (inspectionPlans.find(p => p.value === reportDetails.planId)?.label || "-")
          : "-",
        inspectorName: inspectorName,
        inspectorId: user.uid,
        status: "Draft",
        uploadedFileUrl: fileUrl,
        uploadedFileName: file.name,
        recommendation: "",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await addDoc(collection(db, "inspections"), reportData);

      notifications.show({
        title: "Report Created",
        message: "Inspection report created and added to pending submissions.",
        color: "green",
        autoClose: 4000,
      });

      setTimeout(() => {
        modals.openConfirmModal({
          title: "View Report Submission?",
          children: (
            <Text size="sm">
              Your report has been created as a draft. Would you like to go to the Report Submission page to review and submit it?
            </Text>
          ),
          labels: { confirm: "Go to Report Submission", cancel: "Stay Here" },
          onConfirm: () => navigate("/report-submission"),
        });
      }, 1000);

    } catch (error) {
      console.error("Error creating inspection report:", error);
      notifications.show({
        title: "Error",
        message: "Failed to create inspection report.",
        color: "red",
        autoClose: 5000,
      });
    }
  };

  const handleFileInputChange = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleUpload(Array.from(files));
    }
  };

  const handleUpload = async (files) => {
    if (!files || files.length === 0) return;

    const pdfFiles = Array.from(files).filter((file) => {
      const isPdf =
        file.type === "application/pdf" ||
        file.name.toLowerCase().endsWith(".pdf");
      if (!isPdf) {
        notifications.show({
          title: "Invalid File Type",
          message: `${file.name} is not a PDF file. Only PDF files are allowed.`,
          color: "red",
          autoClose: 4000,
        });
      }
      return isPdf;
    });

    if (pdfFiles.length === 0) {
      notifications.show({
        title: "No Valid Files",
        message: "Please select PDF files only.",
        color: "orange",
        autoClose: 4000,
      });
      return;
    }

    const file = pdfFiles[0];
    setPendingFile(file);
    
    // Generate report number in format: PLANT1/VI/V-002/TA2025
    try {
      const currentYear = new Date().getFullYear();
      const reportsQuery = query(
        collection(db, "inspections"),
        orderBy("createdAt", "desc")
      );
      const reportsSnapshot = await getDocs(reportsQuery);
      
      let highestNumber = 0;
      const yearPrefix = `TA${currentYear}`;
      
      reportsSnapshot.docs.forEach(doc => {
        const reportNo = doc.data().reportNo;
        if (reportNo && reportNo.includes(yearPrefix)) {
          const match = reportNo.match(/V-(\d+)/);
          if (match) {
            const num = parseInt(match[1]);
            if (num > highestNumber) {
              highestNumber = num;
            }
          }
        }
      });
      
      const nextNumber = highestNumber + 1;
      const formattedNumber = String(nextNumber).padStart(3, '0');
      const generatedReportNo = `PLANT1/VI/V-${formattedNumber}/${yearPrefix}`;
      
      setReportDetails({
        reportNo: generatedReportNo,
        equipmentId: "",
        equipmentDescription: "",
        inspectionDate: new Date().toISOString().split('T')[0],
        planId: "",
      });
    } catch (error) {
      console.error("Error generating report number:", error);
      const currentYear = new Date().getFullYear();
      const timestamp = Date.now().toString().slice(-3);
      setReportDetails({
        reportNo: `PLANT1/VI/V-${timestamp}/TA${currentYear}`,
        equipmentId: "",
        equipmentDescription: "",
        inspectionDate: new Date().toISOString().split('T')[0],
        planId: "",
      });
    }
    
    setShowReportModal(true);
  };

  const handleReportSubmit = async () => {
    if (!pendingFile) return;

    setShowReportModal(false);
    setIsUploading(true);

    try {
      const user = auth.currentUser;
      const timestamp = Date.now();
      const fileName = `${timestamp}-${pendingFile.name}`;
      const storageRef = ref(storage, `documents/${fileName}`);

      await uploadBytes(storageRef, pendingFile);
      const url = await getDownloadURL(storageRef);

      const docRef = await addDoc(collection(db, "documents"), {
        fileName: pendingFile.name,
        storageName: fileName,
        fileSize: pendingFile.size,
        fileType: pendingFile.type,
        fileExtension: pendingFile.name.split(".").pop().toLowerCase(),
        url: url,
        storagePath: storageRef.fullPath,
        uploadedBy: user?.uid || "anonymous",
        uploadedByName: user?.displayName || user?.email || "Unknown User",
        uploadedAt: serverTimestamp(),
        reportNo: reportDetails.reportNo,
      });

      await createInspectionReport(pendingFile, url);

      setUploadedFiles((prev) => [{
        id: docRef.id,
        fileName: pendingFile.name,
        storageName: fileName,
        fileSize: pendingFile.size,
        fileType: pendingFile.type,
        fileExtension: pendingFile.name.split(".").pop().toLowerCase(),
        url: url,
        storagePath: storageRef.fullPath,
        uploadedBy: user?.uid || "anonymous",
        uploadedByName: user?.displayName || user?.email || "Unknown User",
        uploadedAt: new Date(),
        reportNo: reportDetails.reportNo,
      }, ...prev]);

      notifications.show({
        title: "Success",
        message: "PDF report uploaded successfully",
        color: "green",
        autoClose: 4000,
      });

      setPendingFile(null);
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      console.error(err);
      notifications.show({
        title: "Upload Failed",
        message: "There was an error uploading the file.",
        color: "red",
        autoClose: 5000,
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      handleUpload(droppedFiles);
    }
  };

  const handleButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleDelete = async (file) => {
    modals.openConfirmModal({
      title: "Delete Document & Report",
      centered: true,
      children: (
        <Text size="sm">
          Are you sure you want to delete{" "}
          <Text component="span" fw={600}>
            {file.fileName}
          </Text>
          ? This will also delete the associated inspection report. This action cannot be undone.
        </Text>
      ),
      labels: { confirm: "Delete", cancel: "Cancel" },
      confirmProps: { color: "red", leftSection: <IconTrash size={16} /> },
      onConfirm: async () => {
        try {
          // 1. Delete from Storage
          try {
            const fileRef = ref(storage, file.storagePath);
            await deleteObject(fileRef);
          } catch (storageError) {
            if (storageError.code !== "storage/object-not-found") {
              throw storageError;
            }
            console.log("File already deleted from storage");
          }

          // 2. Delete associated inspection report
          if (file.reportNo) {
            try {
              const inspectionQuery = query(
                collection(db, "inspections"),
                where("reportNo", "==", file.reportNo)
              );
              const inspectionSnapshot = await getDocs(inspectionQuery);
              
              for (const docSnapshot of inspectionSnapshot.docs) {
                await deleteDoc(doc(db, "inspections", docSnapshot.id));
              }
              console.log("Associated inspection report deleted");
            } catch (inspectionError) {
              console.error("Error deleting inspection report:", inspectionError);
            }
          }

          // 3. Delete from documents collection
          await deleteDoc(doc(db, "documents", file.id));

          // 4. Update UI
          setUploadedFiles((prev) =>
            prev.filter((item) => item.id !== file.id)
          );

          notifications.show({
            title: "Success",
            message: "Document and associated report removed successfully",
            color: "green",
            autoClose: 3000,
          });
        } catch (error) {
          console.error("Error deleting file:", error);
          notifications.show({
            title: "Delete Failed",
            message: "Unable to delete document.",
            color: "red",
            autoClose: 5000,
          });
        }
      },
    });
  };

  const getFileIcon = (fileName) => {
    const ext = fileName.split(".").pop().toLowerCase();
    const iconProps = { size: 32, stroke: 1.5 };

    if (ext === "pdf") {
      return <IconFileTypePdf {...iconProps} color="#e53e3e" />;
    }
    return <IconFile {...iconProps} color="#718096" />;
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "Unknown";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return (
      date.toLocaleDateString() +
      " " +
      date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    );
  };

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        {/* Header */}
        <Group justify="space-between" align="center">
          <Box>
            <Title order={1} mb="xs">
              Upload Inspection Report
            </Title>
          </Box>
          <Button
            variant="outline"
            leftSection={<IconFileDescription size={16} />}
            onClick={() => navigate("/report-submission")}
          >
            Go to Report Submission
          </Button>
        </Group>

        {/* Upload Section */}
        <Paper shadow="sm" p="xl" radius="md" withBorder>
          <Stack gap="md">
            <Group gap="xs">
              <ThemeIcon size="lg" variant="light" color="blue">
                <IconCloudUpload size={20} />
              </ThemeIcon>
              <div>
                <Text fw={600} size="lg">
                  Upload Report
                </Text>
                <Text size="sm" c="dimmed">
                  Click to browse or drag & drop PDF inspection report here
                </Text>
              </div>
            </Group>

            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,.pdf"
              onChange={handleFileInputChange}
              style={{ display: 'none' }}
            />

            <Paper
              withBorder
              p="xl"
              radius="md"
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              style={{
                border: isDragging
                  ? "3px dashed #1c7ed6"
                  : "2px dashed #228be6",
                backgroundColor: isDragging
                  ? isDark
                    ? "#1e3a5f"
                    : "#d0ebff"
                  : isDark
                  ? "#25262b"
                  : "#f8f9fa",
                transition: "all 0.2s ease",
                transform: isDragging ? "scale(1.02)" : "scale(1)",
              }}
            >
              <Center>
                <Stack align="center" gap="md">
                  <ThemeIcon
                    size={60}
                    radius="xl"
                    variant="light"
                    color="blue"
                    style={{
                      transform: isDragging ? "scale(1.1)" : "scale(1)",
                      transition: "transform 0.2s ease",
                    }}
                  >
                    <IconUpload size={30} />
                  </ThemeIcon>
                  <div style={{ textAlign: "center" }}>
                    <Text size="lg" fw={600} mb={4}>
                      {isDragging
                        ? "Drop PDF report here!"
                        : "Click here or drag & drop PDF report"}
                    </Text>
                    <Text size="sm" c="dimmed">
                      PDF files only (Max 10MB recommended)
                    </Text>
                  </div>
                  {!isDragging && (
                    <Button
                      variant="light"
                      leftSection={<IconUpload size={16} />}
                      onClick={handleButtonClick}
                    >
                      Select PDF Report
                    </Button>
                  )}
                </Stack>
              </Center>
            </Paper>
          </Stack>
        </Paper>

        {/* Uploaded Documents Section */}
        <Paper shadow="sm" p="xl" radius="md" withBorder>
          <Stack gap="md">
            <Group justify="space-between" align="center">
              <div>
                <Title order={3}>Uploaded Reports</Title>
                <Text size="sm" c="dimmed" mt={4}>
                  {uploadedFiles.length} report
                  {uploadedFiles.length !== 1 ? "s" : ""} uploaded (Draft status only)
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
                    No draft reports
                  </Text>
                  <Text size="sm" c="dimmed">
                    Upload a report or all reports have been submitted
                  </Text>
                </Stack>
              </Center>
            ) : (
              <Grid gutter="md">
                {uploadedFiles.map((file) => (
                  <Grid.Col span={{ base: 12, sm: 6, lg: 4 }} key={file.id}>
                    <Card
                      shadow="sm"
                      padding="lg"
                      radius="md"
                      withBorder
                      style={{
                        height: "100%",
                        transition: "all 0.2s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-4px)";
                        e.currentTarget.style.boxShadow = isDark
                          ? "0 8px 16px rgba(0,0,0,0.4)"
                          : "0 8px 16px rgba(0,0,0,0.1)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "";
                      }}
                    >
                      <Stack gap="md">
                        {/* File Icon */}
                        <Group justify="space-between" align="flex-start">
                          <ThemeIcon
                            size={50}
                            radius="md"
                            variant="light"
                            color="blue"
                          >
                            {getFileIcon(file.fileName)}
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
                            title={file.fileName}
                          >
                            {file.fileName}
                          </Text>
                          <Group gap="xs" mt={4}>
                            <Badge size="xs" variant="light">
                              {file.fileExtension?.toUpperCase() || "FILE"}
                            </Badge>
                            <Text size="xs" c="dimmed">
                              {formatFileSize(file.fileSize)}
                            </Text>
                          </Group>
                          {file.reportNo && (
                            <Badge size="sm" variant="light" color="blue" mt={4}>
                              {file.reportNo}
                            </Badge>
                          )}
                          <Text size="xs" c="dimmed" mt={4}>
                            Uploaded by {file.uploadedByName}
                          </Text>
                          <Text size="xs" c="dimmed">
                            {formatDate(file.uploadedAt)}
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

      {/* Report Details Modal */}
      <Modal
        opened={showReportModal}
        onClose={() => {
          setShowReportModal(false);
          setPendingFile(null);
        }}
        title="Report Details"
        size="md"
      >
        <Stack gap="md">
          <TextInput
            label="Report Number"
            placeholder="PLANT1/VI/V-002/TA2025"
            leftSection={<IconFileDescription size={16} />}
            value={reportDetails.reportNo}
            onChange={(e) =>
              setReportDetails({ ...reportDetails, reportNo: e.target.value })
            }
            required
            description="Format: PLANT1/VI/V-XXX/TAXXXX"
          />
          
          <Select
            label="Link to Inspection Plan (Optional)"
            placeholder="Select a plan"
            data={inspectionPlans}
            value={reportDetails.planId}
            onChange={(value) =>
              setReportDetails({ ...reportDetails, planId: value })
            }
            searchable
            clearable
          />

          <TextInput
            label="Equipment ID / Tag No"
            placeholder="EQ-001"
            leftSection={<IconTag size={16} />}
            value={reportDetails.equipmentId}
            onChange={(e) =>
              setReportDetails({
                ...reportDetails,
                equipmentId: e.target.value,
              })
            }
          />

          <TextInput
            label="Equipment Description"
            placeholder="Equipment description"
            value={reportDetails.equipmentDescription}
            onChange={(e) =>
              setReportDetails({
                ...reportDetails,
                equipmentDescription: e.target.value,
              })
            }
          />

          <TextInput
            label="Inspection Date"
            type="date"
            value={reportDetails.inspectionDate}
            onChange={(e) =>
              setReportDetails({
                ...reportDetails,
                inspectionDate: e.target.value,
              })
            }
            required
          />

          <Group justify="flex-end" mt="md">
            <Button
              variant="outline"
              onClick={() => {
                setShowReportModal(false);
                setPendingFile(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleReportSubmit} loading={isUploading}>
              Upload Report
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Loading Overlay */}
      {isUploading && (
        <Box
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: isDark
              ? "rgba(20, 21, 23, 0.95)"
              : "rgba(255, 255, 255, 0.9)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 10000,
          }}
        >
          <Loader size="xl" />
          <Text mt="md" fw={600}>
            Uploading report...
          </Text>
          <Text size="sm" c="dimmed">
            Please wait
          </Text>
        </Box>
      )}
    </Container>
  );
};

export default FileUploadComponent;