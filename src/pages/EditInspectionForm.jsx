import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { db, auth, storage } from "../firebase";
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  serverTimestamp,
  getDocs,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import {
  Container,
  Paper,
  Title,
  Text,
  TextInput,
  Textarea,
  Button,
  Group,
  Stack,
  SimpleGrid,
  Modal,
  Image,
  ActionIcon,
  Badge,
  Box,
  Divider,
  Stepper,
  FileInput,
  CloseButton,
  Loader,
  Checkbox,
  Select,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { Dropzone, IMAGE_MIME_TYPE } from "@mantine/dropzone";
import {
  IconSearch,
  IconDeviceFloppy,
  IconPhoto,
  IconPlus,
  IconTrash,
  IconCheck,
  IconUpload,
  IconX,
} from "@tabler/icons-react";

// Standard report fields
const initialFormState = {
  equipmentId: "",
  equipmentDescription: "",
  doshNumber: "",
  plantUnitArea: "",
  inspectionDate: "",
  inspectorName: "",
  condition: "",
  preInspectionFinding: "",
  finalInspectionFinding: "",
  externalCondition: "",
  internalCondition: "",
  nonDestructiveTesting: "",
  recommendation: "",
  inspectionType: "VI", // Default to VI
};

const EditInspectionForm = () => {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState(initialFormState);
  const [equipmentList, setEquipmentList] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 2 State
  const [photoRows, setPhotoRows] = useState([]); // { id, file, preview, finding, recommendation }

  // Modal for Equipment Search
  const [opened, { open, close }] = useDisclosure(false);

  const location = useLocation();
  const [editingReportId, setEditingReportId] = useState(null);

  // --- Initial Data Loading ---
  useEffect(() => {
    // Check if we have incoming report data (Edit Mode)
    if (location.state && location.state.reportData) {
      const report = location.state.reportData;
      setEditingReportId(report.id);

      // Populate Form Data
      setFormData({
        equipmentId: report.equipmentId || "",
        equipmentDescription: report.equipmentDescription || "",
        doshNumber: report.doshNumber || "",
        plantUnitArea: report.plantUnitArea || "",
        inspectionDate: report.inspectionDate || "",
        inspectorName: report.inspectorName || "",
        condition: report.condition || "",
        preInspectionFinding: report.preInspectionFinding || "",
        finalInspectionFinding: report.finalInspectionFinding || "",
        externalCondition: report.externalCondition || "",
        internalCondition: report.internalCondition || "",
        nonDestructiveTesting: report.nonDestructiveTesting || "",
        recommendation: report.recommendation || "",
        inspectionType: report.inspectionType || "VI",
      });

      // Populate Photo Rows
      if (report.photoReport && report.photoReport.length > 0) {
        const rows = report.photoReport.map((item, index) => ({
          id: Date.now() + index,
          files: [],
          previews: item.photoUrls || [],
          existingUrls: item.photoUrls || [], // Track existing URLs separately
          finding: item.finding || "",
          recommendation: item.recommendation || "",
        }));
        setPhotoRows(rows);
      }

      notifications.show({
        title: "Edit Mode",
        message: `Loaded report ${report.reportNo || "Draft"} for editing.`,
        color: "blue",
      });
    } else {
      // If accessed directly without state, redirect back
      notifications.show({
        title: "Error",
        message: "No report selected for editing.",
        color: "red",
      });
      navigate("/");
    }

    // Equipment List
    const fetchEquipment = async () => {
      try {
        const snap = await getDocs(collection(db, "equipments"));
        const list = snap.docs.map((d) => ({ docId: d.id, ...d.data() }));
        setEquipmentList(list);
      } catch (err) {
        console.error("Failed to load equipment list:", err);
      }
    };
    fetchEquipment();
  }, [location.state, navigate]);

  // --- Handlers: Step 1 (General Form) ---
  const handleChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEquipmentPick = (eq) => {
    setFormData((prev) => ({
      ...prev,
      equipmentId: eq.tagNumber || "",
      equipmentDescription: eq.equipmentDescription || "",
      doshNumber: eq.doshNumber || "",
      plantUnitArea: eq.plantUnitArea || "",
    }));
    close();
    notifications.show({
      title: "Equipment Loaded",
      message: `Loaded details for ${eq.tagNumber}`,
      color: "blue",
    });
  };

  const handleStep1Submit = (e) => {
    e.preventDefault();

    if (
      !formData.equipmentId ||
      !formData.inspectionDate ||
      !formData.inspectorName
    ) {
      notifications.show({
        title: "Validation Error",
        message: "Please fill in Equipment ID, Date and Inspector Name.",
        color: "red",
      });
      return;
    }

    // Auto-add first row if empty
    if (photoRows.length === 0) {
      setPhotoRows([
        {
          id: Date.now(),
          files: [],
          previews: [],
          finding: "",
          recommendation: "",
        },
      ]);
    }
    setActiveStep(1); // Move to Step 2
    notifications.show({
      title: "Step 1 Validated",
      message: "Proceeding to Photo Report...",
      color: "blue",
    });
  };

  // --- Handlers: Step 2 (Photo Report) ---
  const addPhotoRow = () => {
    setPhotoRows((prev) => [
      ...prev,
      {
        id: Date.now(),
        files: [],
        previews: [],
        finding: "",
        recommendation: "",
      },
    ]);
  };

  const updatePhotoRow = (id, field, value) => {
    setPhotoRows((prev) =>
      prev.map((row) => {
        if (row.id === id) {
          return { ...row, [field]: value };
        }
        return row;
      })
    );
  };

  const removePhotoRow = (id) => {
    setPhotoRows((prev) => prev.filter((row) => row.id !== id));
  };

  const removeImageFromRow = (rowId, index) => {
    setPhotoRows((prev) =>
      prev.map((row) => {
        if (row.id === rowId) {
          const newPreviews = [...row.previews];
          const existingCount = row.existingUrls ? row.existingUrls.length : 0;

          // Remove from previews
          newPreviews.splice(index, 1);

          if (index < existingCount) {
            // It's an existing URL
            const newExisting = [...row.existingUrls];
            newExisting.splice(index, 1);
            return {
              ...row,
              existingUrls: newExisting,
              previews: newPreviews,
            };
          } else {
            // It's a new file
            const fileIndex = index - existingCount;
            const newFiles = [...row.files];
            newFiles.splice(fileIndex, 1);
            return {
              ...row,
              files: newFiles,
              previews: newPreviews,
            };
          }
        }
        return row;
      })
    );
  };

  const handleStep2Submit = async () => {
    if (photoRows.length === 0) {
      if (!confirm("Submit report without specific photos?")) return;
    }

    setIsSubmitting(true);
    try {
      // Determine Document Reference (New or Edit)
      let docRef;
      if (editingReportId) {
        docRef = doc(db, "inspections", editingReportId);
      } else {
        // Fallback or error, but this component is Edit Only
        docRef = doc(collection(db, "inspections"));
      }
      const docId = docRef.id;

      const uploadedPhotos = [];

      for (const row of photoRows) {
        // Start with existing URLs if any
        const photoUrls = [...(row.existingUrls || [])];

        // Upload all NEW files in this row
        if (row.files && row.files.length > 0) {
          for (const file of row.files) {
            const storageRef = ref(
              storage,
              `inspection-photos/${docId}/${Date.now()}-${file.name}`
            );
            await uploadBytes(storageRef, file);
            const url = await getDownloadURL(storageRef);
            photoUrls.push(url);
          }
        }

        // Only add to report if there's content or photos
        if (photoUrls.length > 0 || row.finding || row.recommendation) {
          uploadedPhotos.push({
            finding: row.finding,
            recommendation: row.recommendation,
            photoUrls: photoUrls,
            timestamp: new Date().toISOString(),
          });
        }
      }

      // Generate Report No (Update if needed, but usually stays same on edit unless fields change)
      // Format: [Plant]/[Type]/[Tag]/TA[Year]
      const plant = formData.plantUnitArea
        ? formData.plantUnitArea.trim().toUpperCase().replace(/\s+/g, "")
        : "PLANT";
      const tag = formData.equipmentId
        ? formData.equipmentId.trim().toUpperCase().replace(/\s+/g, "")
        : "TAG";
      const typeCode = formData.inspectionType || "VI";

      // Extract year from inspectionDate
      const dateObj = new Date(formData.inspectionDate);
      const year = !isNaN(dateObj.getFullYear())
        ? dateObj.getFullYear()
        : new Date().getFullYear();

      const reportNo = `${plant}/${typeCode}/${tag}/TA${year}`;

      // Prepare Final Data
      const finalData = {
        ...formData,
        reportNo: reportNo,
        photoReport: uploadedPhotos,
        status: "Draft",
        updatedAt: serverTimestamp(),
      };

      // Save to Firestore with Update semantics
      await updateDoc(docRef, finalData);

      notifications.show({
        title: "Report Updated",
        message: "Redirecting to Report Review...",
        color: "blue",
      });

      // Navigate to Report Generation
      navigate(`/report-submission?id=${docId}`);
    } catch (error) {
      console.error("Step 2 Error:", error);
      notifications.show({
        title: "Error",
        message: "Failed to save photo report.",
        color: "red",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Container size="lg" maw={1200} py="xl">
      <Title order={2} mb="md">
        Edit Inspection Report
      </Title>

      <Stepper
        active={activeStep}
        onStepClick={setActiveStep}
        mb="xl"
        allowNextStepsSelect={false}
      >
        <Stepper.Step
          label="Inspection Details"
          description="General findings & condition"
          allowStepSelect={activeStep > 0}
        >
          {/* Step 1 Content: The General Form */}
          <Paper withBorder shadow="sm" p="xl" radius="md">
            <form onSubmit={handleStep1Submit}>
              <Stack gap="xl">
                {/* Section 1: Equipment Details */}
                <Box>
                  <Divider
                    label="Equipment Details"
                    labelPosition="left"
                    mb="md"
                    fw={700}
                  />
                  <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
                    <Box>
                      <TextInput
                        label="Tag Number"
                        placeholder="Search..."
                        value={formData.equipmentId}
                        onChange={(e) =>
                          handleChange("equipmentId", e.currentTarget.value)
                        }
                        withAsterisk
                        rightSection={
                          <ActionIcon
                            onClick={open}
                            variant="filled"
                            color="blue"
                            size="sm"
                          >
                            <IconSearch size={14} />
                          </ActionIcon>
                        }
                        readOnly
                      />
                      <Text
                        size="xs"
                        mt={4}
                        c="blue"
                        style={{ cursor: "pointer" }}
                        onClick={open}
                      >
                        Click to Search Equipment
                      </Text>
                    </Box>
                    <TextInput
                      label="DOSH No."
                      value={formData.doshNumber}
                      onChange={(e) =>
                        handleChange("doshNumber", e.currentTarget.value)
                      }
                      withAsterisk
                    />
                    <TextInput
                      label="Plant / Unit"
                      value={formData.plantUnitArea}
                      onChange={(e) =>
                        handleChange("plantUnitArea", e.currentTarget.value)
                      }
                      withAsterisk
                    />
                  </SimpleGrid>
                  <Textarea
                    mt="md"
                    label="Equipment Description"
                    value={formData.equipmentDescription}
                    onChange={(e) =>
                      handleChange(
                        "equipmentDescription",
                        e.currentTarget.value
                      )
                    }
                    withAsterisk
                    minRows={2}
                  />
                </Box>

                {/* Section 2: Inspection Metadata */}
                <Box>
                  <Divider
                    label="Inspection Data"
                    labelPosition="left"
                    mb="md"
                    fw={700}
                  />
                  <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                    <TextInput
                      type="date"
                      label="Inspection Date"
                      value={formData.inspectionDate}
                      onChange={(e) =>
                        handleChange("inspectionDate", e.currentTarget.value)
                      }
                      withAsterisk
                    />
                    <Select
                      label="Inspection Type"
                      data={[
                        { value: "VI", label: "Visual Inspection (VI)" },
                        { value: "UT", label: "Ultrasonic Thickness (UT)" },
                        { value: "RT", label: "Radiographic Testing (RT)" },
                        { value: "PT", label: "Penetrant Testing (PT)" },
                        { value: "MT", label: "Magnetic Particle (MT)" },
                      ]}
                      value={formData.inspectionType}
                      onChange={(val) => handleChange("inspectionType", val)}
                      withAsterisk
                    />
                    <TextInput
                      label="Inspector Name"
                      value={formData.inspectorName}
                      onChange={(e) =>
                        handleChange("inspectorName", e.currentTarget.value)
                      }
                      withAsterisk
                    />
                  </SimpleGrid>
                </Box>

                {/* Section 3: Findings & Conditions */}
                <Box>
                  <Divider
                    label="Condition"
                    labelPosition="left"
                    mb="md"
                    fw={700}
                  />

                  <Textarea
                    label="Condition"
                    minRows={2}
                    mb="md"
                    value={formData.condition}
                    onChange={(e) =>
                      handleChange("condition", e.currentTarget.value)
                    }
                  />

                  <Divider
                    label="Findings"
                    labelPosition="left"
                    mt="lg"
                    mb="sm"
                    fw={700}
                  />

                  {/* Initial/Pre-Inspection */}
                  <Stack mb="md" gap="xs">
                    <Checkbox
                      label={<Text fw={600}>Initial/Pre-Inspection</Text>}
                      checked={
                        formData.preInspectionFinding !== "Not applicable"
                      }
                      onChange={(e) =>
                        handleChange(
                          "preInspectionFinding",
                          e.currentTarget.checked ? "" : "Not applicable"
                        )
                      }
                    />
                    {formData.preInspectionFinding !== "Not applicable" && (
                      <Textarea
                        placeholder="Enter findings..."
                        minRows={3}
                        value={formData.preInspectionFinding}
                        onChange={(e) =>
                          handleChange(
                            "preInspectionFinding",
                            e.currentTarget.value
                          )
                        }
                      />
                    )}
                  </Stack>

                  {/* Post/Final Inspection */}
                  <Stack mb="md" gap="xs">
                    <Checkbox
                      label={<Text fw={600}>Post/Final Inspection</Text>}
                      checked={formData.externalCondition !== "Not applicable"}
                      onChange={(e) => {
                        const val = e.currentTarget.checked
                          ? ""
                          : "Not applicable";
                        handleChange("externalCondition", val);
                        handleChange("internalCondition", val);
                      }}
                    />
                    {formData.externalCondition !== "Not applicable" && (
                      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                        <Textarea
                          label="External"
                          minRows={3}
                          value={formData.externalCondition}
                          onChange={(e) =>
                            handleChange(
                              "externalCondition",
                              e.currentTarget.value
                            )
                          }
                        />
                        <Textarea
                          label="Internal"
                          minRows={3}
                          value={formData.internalCondition}
                          onChange={(e) =>
                            handleChange(
                              "internalCondition",
                              e.currentTarget.value
                            )
                          }
                        />
                      </SimpleGrid>
                    )}
                  </Stack>

                  <Textarea
                    label="NON-DESTRUCTIVE TESTINGS"
                    minRows={4}
                    mb="md"
                    value={formData.nonDestructiveTesting}
                    onChange={(e) =>
                      handleChange(
                        "nonDestructiveTesting",
                        e.currentTarget.value
                      )
                    }
                  />

                  <Textarea
                    label="RECOMMENDATIONS"
                    minRows={4}
                    mb="md"
                    value={formData.recommendation}
                    onChange={(e) =>
                      handleChange("recommendation", e.currentTarget.value)
                    }
                  />
                </Box>

                <Button
                  type="submit"
                  size="md"
                  rightSection={<IconDeviceFloppy size={18} />}
                  loading={isSubmitting}
                >
                  Save and Proceed to Photos
                </Button>
              </Stack>
            </form>
          </Paper>
        </Stepper.Step>

        <Stepper.Step
          label="Photo Report"
          description="Upload photos with findings"
        >
          {/* Step 2 Content: Photo Report */}
          <Paper withBorder shadow="sm" p="xl" radius="md">
            <Stack>
              <Title order={4}>Photo Evidence & Specific Recommendations</Title>
              <Text c="dimmed" size="sm">
                Add photos of specific defects/observations along with dedicated
                findings.
              </Text>

              {photoRows.length === 0 && (
                <Box
                  p="xl"
                  bg="gray.1"
                  style={{ textAlign: "center", borderRadius: 8 }}
                >
                  <Text c="dimmed">
                    No photos added yet. Click "Add Photo Row" to begin.
                  </Text>
                </Box>
              )}

              {photoRows.map((row, index) => (
                <Paper key={row.id} withBorder p="md" bg="gray.0">
                  <Group align="flex-start" justify="space-between" mb="xs">
                    <Badge variant="filled" color="gray">
                      Photo #{index + 1}
                    </Badge>
                    <ActionIcon
                      color="red"
                      variant="subtle"
                      onClick={() => removePhotoRow(row.id)}
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Group>
                  <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg">
                    {/* Column 1: Image */}
                    <Box>
                      <Dropzone
                        onDrop={(files) => {
                          if (files.length === 0) return;

                          setPhotoRows((prev) => {
                            const newRows = [...prev];
                            const targetIndex = newRows.findIndex(
                              (r) => r.id === row.id
                            );

                            if (targetIndex !== -1) {
                              const existingFiles =
                                newRows[targetIndex].files || [];
                              const currentCount = existingFiles.length;

                              if (currentCount >= 5) {
                                notifications.show({
                                  title: "Limit Reached",
                                  message: "Maximum 5 photos allowed per row.",
                                  color: "red",
                                });
                                return prev;
                              }

                              let filesToAdd = files;
                              if (currentCount + files.length > 5) {
                                const allowed = 5 - currentCount;
                                filesToAdd = files.slice(0, allowed);
                                notifications.show({
                                  title: "Limit Reached",
                                  message: `Only ${allowed} photo(s) added to meet the limit of 5.`,
                                  color: "orange",
                                });
                              }

                              const existingPreviews =
                                newRows[targetIndex].previews || [];

                              const newFiles = [
                                ...existingFiles,
                                ...filesToAdd,
                              ];
                              const newPreviews = [
                                ...existingPreviews,
                                ...filesToAdd.map((f) =>
                                  URL.createObjectURL(f)
                                ),
                              ];

                              newRows[targetIndex] = {
                                ...newRows[targetIndex],
                                files: newFiles,
                                previews: newPreviews,
                              };
                            }
                            return newRows;
                          });
                        }}
                        onReject={() =>
                          notifications.show({
                            title: "Image Rejected ",
                            message:
                              "Image size too large, please select a image under 10 mb",
                            color: "red",
                          })
                        }
                        maxSize={10 * 1024 ** 2}
                        accept={IMAGE_MIME_TYPE}
                        multiple={true}
                        style={{
                          minHeight: 160,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          border: "1px dashed #ced4da",
                          borderRadius: 8,
                          cursor: "pointer",
                          overflow: "hidden",
                          backgroundColor:
                            row.previews && row.previews.length > 0
                              ? "white"
                              : "transparent",
                          padding: 10,
                        }}
                      >
                        {row.previews && row.previews.length > 0 ? (
                          <SimpleGrid
                            cols={
                              row.previews.length > 4
                                ? 3
                                : row.previews.length > 1
                                ? 2
                                : 1
                            }
                            spacing="xs"
                            w="100%"
                          >
                            {row.previews.map((preview, i) => (
                              <ImagePreviewItem
                                key={i}
                                src={preview}
                                onDelete={() => removeImageFromRow(row.id, i)}
                                height={row.previews.length > 2 ? 80 : 140}
                              />
                            ))}
                          </SimpleGrid>
                        ) : (
                          <Stack
                            align="center"
                            gap={4}
                            style={{ pointerEvents: "none" }}
                          >
                            <Dropzone.Idle>
                              <IconPhoto size={32} color="gray" />
                            </Dropzone.Idle>
                            <Dropzone.Accept>
                              <IconUpload size={32} color="blue" />
                            </Dropzone.Accept>
                            <Dropzone.Reject>
                              <IconX size={32} color="red" />
                            </Dropzone.Reject>
                            <Text size="xs" c="dimmed" ta="center">
                              Drag images here
                              <br />
                              Max file size 5MB
                              <br />5 images only
                            </Text>
                          </Stack>
                        )}
                      </Dropzone>
                    </Box>

                    {/* Column 2: Specific Finding */}
                    <Textarea
                      label="Specific Finding"
                      placeholder="Describe what's in the photo..."
                      minRows={4}
                      value={row.finding}
                      onChange={(e) =>
                        updatePhotoRow(row.id, "finding", e.currentTarget.value)
                      }
                    />

                    {/* Column 3: Recommendation */}
                    <Textarea
                      label="Recommendation"
                      placeholder="Action required..."
                      minRows={4}
                      value={row.recommendation}
                      onChange={(e) =>
                        updatePhotoRow(
                          row.id,
                          "recommendation",
                          e.currentTarget.value
                        )
                      }
                    />
                  </SimpleGrid>
                </Paper>
              ))}

              <Button
                variant="outline"
                leftSection={<IconPlus size={16} />}
                onClick={addPhotoRow}
              >
                Add Photo Row
              </Button>

              <Group justify="space-between" mt="xl">
                <Button variant="default" onClick={() => setActiveStep(0)}>
                  Back
                </Button>
                <Button
                  color="green"
                  onClick={handleStep2Submit}
                  loading={isSubmitting}
                  leftSection={<IconCheck size={18} />}
                >
                  Complete & Save Report
                </Button>
              </Group>
            </Stack>
          </Paper>
        </Stepper.Step>
      </Stepper>

      {/* Equipment Search Modal */}
      <Modal opened={opened} onClose={close} title="Search Equipment" size="lg">
        <Stack>
          {equipmentList.map((eq) => (
            <Paper
              key={eq.docId}
              withBorder
              p="sm"
              style={{ cursor: "pointer" }}
              onClick={() => handleEquipmentPick(eq)}
              hover={{ bg: "gray.0" }}
            >
              <Group justify="space-between">
                <div>
                  <Text fw={600}>{eq.tagNumber}</Text>
                  <Text size="sm" c="dimmed">
                    {eq.equipmentDescription}
                  </Text>
                </div>
                <Badge>{eq.plantUnitArea}</Badge>
              </Group>
            </Paper>
          ))}
        </Stack>
      </Modal>
    </Container>
  );
};

const ImagePreviewItem = ({ src, onDelete, height }) => (
  <div style={{ position: "relative", width: "100%", height: height }}>
    <Image
      src={src}
      height={height}
      radius="sm"
      style={{ objectFit: "cover" }}
    />
    <ActionIcon
      color="red"
      variant="filled"
      size="sm"
      style={{ position: "absolute", top: 4, right: 4 }}
      onClick={(e) => {
        e.stopPropagation();
        onDelete();
      }}
    >
      <IconX size={12} />
    </ActionIcon>
  </div>
);

export default EditInspectionForm;
