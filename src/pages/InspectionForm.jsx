import React, { useEffect, useState } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { db, auth, storage } from "../firebase";
import { notificationService } from "../services/notificationService";
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  serverTimestamp,
  getDocs,
  getDoc,
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
  Affix,
  Transition,
  rem,
  Accordion,
  Drawer,
  Alert,
  ScrollArea,
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
  IconFolder,
  IconNotebook,
  IconInfoCircle,
  IconEye,
  IconSend,
} from "@tabler/icons-react";
import { ReportEditor } from "./ReportGeneration";
import { useTheme } from "../components/context/ThemeContext";

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
const InspectionForm = () => {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState(initialFormState);
  const [equipmentList, setEquipmentList] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { colorScheme } = useTheme();
  const isDark = colorScheme === "dark";
  const submittingRef = React.useRef(false);

  // Step 2 State
  const [photoRows, setPhotoRows] = useState([]); // { id, file, preview, finding, recommendation }

  // Modal for Equipment Search
  const [opened, { open, close }] = useDisclosure(false);

  // Draft Data State (Restored)
  const [draftData, setDraftData] = useState({ notes: "", photos: [] });
  const [drawerOpened, { open: openDrawer, close: closeDrawer }] =
    useDisclosure(false);

  const [searchParams] = useSearchParams();
  const urlPlanId = searchParams.get("planId");
  const [currentPlanId, setCurrentPlanId] = useState(urlPlanId);
  const location = useLocation();
  const [editingReportId, setEditingReportId] = useState(null);

  // Preview State
  const [previewOpened, setPreviewOpened] = useState(false);
  const [previewData, setPreviewData] = useState(null);

  const [newDocId, setNewDocId] = useState(null);

  // --- Initial Data Loading ---
  useEffect(() => {
    if (location.state && location.state.reportData) {
      const report = location.state.reportData;
      setEditingReportId(report.id);

      if (report.planId) {
        setCurrentPlanId(report.planId);
      }

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

      if (report.photoReport && report.photoReport.length > 0) {
        const rows = report.photoReport.map((item, index) => ({
          id: Date.now() + index,
          photos: (item.photoUrls || []).map((u) => ({
            type: "url",
            url: u,
            preview: u,
          })),
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
    // Use local date (avoid UTC shifting from toISOString())
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const today = `${yyyy}-${mm}-${dd}`;

    const unsubscribe = auth.onAuthStateChanged(async (user) => {
        if (user) {
          let inspector = user.displayName || user.email || "Unknown Inspector";

          try {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists()) {
              const uData = userDoc.data();
              if (uData.firstName && uData.lastName) {
                inspector = `${uData.firstName} ${uData.lastName}`;
              } else if (uData.fullName) {
                inspector = uData.fullName;
              }
            }
          } catch (err) {
            console.warn(
              "Failed to fetch user profile for inspector name:",
              err
            );
          }

          setFormData((prev) => ({
            ...prev,
            inspectionDate: prev.inspectionDate || today,
            inspectorName: prev.inspectorName || inspector,
          }));
        }
      });
      return () => unsubscribe();
    }
  }, [location.state]);

  useEffect(() => {
    const fetchEquipment = async () => {
      console.log("Fetching Equipment List...");
      try {
        const snap = await getDocs(collection(db, "equipments"));
        const list = snap.docs.map((d) => ({ docId: d.id, ...d.data() }));
        console.log(`Fetched ${list.length} equipment items.`);
        setEquipmentList(list);
      } catch (err) {
        console.error("Failed to load equipment list:", err);
        notifications.show({
          title: "Error",
          message: "Failed to load equipment list",
          color: "red",
        });
      }
    };
    fetchEquipment();
  }, []);

  const [planData, setPlanData] = useState(null);

  // 1. Fetch Plan Data when ID changes
  useEffect(() => {
    if (!currentPlanId) return;
    const loadPlan = async () => {
      try {
        const planRef = doc(db, "inspection_plans", currentPlanId);
        const planSnap = await getDoc(planRef);
        if (planSnap.exists()) {
          setPlanData(planSnap.data());
        }
      } catch (e) {
        console.error("Error loading plan:", e);
      }
    };
    loadPlan();
  }, [currentPlanId]);

  // 2. Auto-fill Form when Plan Data AND Equipment List are ready
  useEffect(() => {
    // Debug Logs
    console.log("Auto-fill Effect Triggered");
    console.log("PlanData:", planData);
    console.log("EquipmentList Length:", equipmentList.length);

    if (!planData || equipmentList.length === 0 || location.state?.reportData) {
      const reasons = [];
      if (!planData) reasons.push("Plan Data not loaded");
      if (equipmentList.length === 0) reasons.push("Equipment List empty");
      if (location.state?.reportData)
        reasons.push("Report Data exists (Edit Mode)");

      console.log(`Skipping Auto-fill: ${reasons.join(", ")}`);
      return;
    }

    const exProps = planData.extendedProps || {};

    const eqTag = exProps.equipmentId || planData.equipmentId || "";
    console.log("Derived Equipment Tag from Plan:", eqTag);

    if (eqTag) {
      let fullEquipment = equipmentList.find((e) => e.tagNumber === eqTag);

      if (!fullEquipment) {
        console.log("Strict match failed. Trying loose match...");
        fullEquipment = equipmentList.find(
          (e) =>
            e.tagNumber?.trim().toLowerCase() === eqTag.trim().toLowerCase()
        );
      }

      if (fullEquipment) {
        console.log("Match Found:", fullEquipment);
        setFormData((prev) => ({
          ...prev,
          equipmentId: eqTag,
          doshNumber: fullEquipment.doshNumber || prev.doshNumber || "",
          plantUnitArea:
            fullEquipment.plantUnitArea || prev.plantUnitArea || "",
          equipmentDescription:
            fullEquipment.equipmentDescription ||
            prev.equipmentDescription ||
            "",

          inspectorName: prev.inspectorName,
        }));
        console.log(`Data Loaded: Pre-filled details for ${eqTag}`);
      } else {
        console.warn("No matching equipment found in list for tag:", eqTag);
        notifications.show({
          title: "Equipment Mismatch",
          message: `Could not find equipment details for tag: ${eqTag}`,
          color: "orange",
        });
      }
    } else {
      console.warn("No equipment tag found on plan.");
    }

    // Load Draft Data (Notes/Photos)
    if (exProps.fieldPhotos || exProps.executionNotes) {
      setDraftData({
        notes: exProps.executionNotes || "",
        photos: exProps.fieldPhotos || [],
      });
      console.log("Draft Data Found: Field notes and photos applied.");
    }
  }, [planData, equipmentList, location.state]);

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

    if (photoRows.length === 0) {
      setPhotoRows([
        {
          id: Date.now(),
          photos: [],

          finding: "",
          recommendation: "",
        },
      ]);
    }
    setActiveStep(1); // Move to Step 2
    console.log("Step 1 Validated: Proceeding to Photo Report...");
  };

  // --- Handlers: Step 2 (Photo Report) ---
  const addPhotoRow = () => {
    setPhotoRows((prev) => [
      ...prev,
      {
        id: Date.now(),
        photos: [],
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
          const newPhotos = [...row.photos];
          newPhotos.splice(index, 1);
          return { ...row, photos: newPhotos };
        }
        return row;
      })
    );
  };

  const handleDrop = (e, rowId) => {
    e.preventDefault();
    e.stopPropagation();
    const droppedData = e.dataTransfer.getData("text/plain");

    if (droppedData) {
      let urlsToAdd = [];
      try {
        const parsed = JSON.parse(droppedData);
        if (Array.isArray(parsed)) urlsToAdd = parsed;
        else urlsToAdd = [droppedData];
      } catch (err) {
        urlsToAdd = [droppedData];
      }

      setPhotoRows((prev) =>
        prev.map((row) => {
          if (row.id === rowId) {
            const currentCount = row.photos?.length || 0;
            if (currentCount >= 5) {
              notifications.show({
                title: "Limit Reached",
                message: "Max 5 photos.",
                color: "red",
              });
              return row;
            }

            const remaining = 5 - currentCount;
            const finalAdditions = urlsToAdd.slice(0, remaining);

            if (finalAdditions.length < urlsToAdd.length) {
              notifications.show({
                title: "Partial Add",
                message: `Added ${finalAdditions.length} photos. Limit is 5.`,
                color: "orange",
              });
            } else {
              notifications.show({
                title: "Photo(s) Added",
                message: `${finalAdditions.length} photos inserted.`,
                color: "green",
              });
            }

            const newPhotoObjects = finalAdditions.map((url) => ({
              type: "url",
              url: url,
              preview: url,
            }));

            return {
              ...row,
              photos: [...(row.photos || []), ...newPhotoObjects],
            };
          }
          return row;
        })
      );
    }
  };

  // --- Preview Logic ---
  const handlePreview = () => {
    if (photoRows.length === 0) {
      if (!confirm("Submit report without specific photos?")) return;
    }

    const simulatedPhotoReport = photoRows
      .map((row) => {
        const draftUrls = row.existingUrls || [];
        const newFilePreviews = row.previews || [];

        const photos = row.photos || [];
        const allPhotoUrls = photos.map((p) => p.preview);

        if (allPhotoUrls.length === 0 && !row.finding && !row.recommendation)
          return null;

        return {
          finding: row.finding,
          recommendation: row.recommendation,
          photoUrls: allPhotoUrls,
          timestamp: new Date().toISOString(),
        };
      })
      .filter(Boolean);

    const plant = formData.plantUnitArea
      ? formData.plantUnitArea.trim().toUpperCase().replace(/\s+/g, "")
      : "PLANT";
    const tag = formData.equipmentId
      ? formData.equipmentId.trim().toUpperCase().replace(/\s+/g, "")
      : "TAG";
    const typeCode = formData.inspectionType || "VI";
    const dateObj = new Date(formData.inspectionDate);
    const year = !isNaN(dateObj.getFullYear())
      ? dateObj.getFullYear()
      : new Date().getFullYear();
    const previewReportNo = `${plant}/${typeCode}/${tag}/TA${year}`;

    const mockReport = {
      ...formData,
      inspectionDate:
        formData.inspectionDate || new Date().toISOString().split("T")[0],
      reportNo: previewReportNo,
      photoReport: simulatedPhotoReport,

      plantUnitArea: formData.plantUnitArea || "Plant 1",
      doshNumber: formData.doshNumber || "MK PMT 1002",
    };

    setPreviewData(mockReport);
    setPreviewOpened(true);
  };

  const handleStep2Submit = async (status = "Submitted") => {
    if (isSubmitting) {
      console.warn(
        `Double submit detected! Ignoring call for status: ${status}`
      );
      return;
    }

    console.log(`handleStep2Submit START - Status: ${status}`);
    setIsSubmitting(true);

    try {
      const targetDocId =
        editingReportId || newDocId || doc(collection(db, "inspections")).id;

      const uploadedPhotos = [];

      for (const row of photoRows) {
        const photos = row.photos || [];
        const rowUrls = photos
          .filter((p) => p.type === "url")
          .map((p) => p.url);

        const filesToUpload = photos
          .filter((p) => p.type === "file")
          .map((p) => p.file);

        if (filesToUpload.length > 0) {
          for (const file of filesToUpload) {
            const storageRef = ref(
              storage,
              `reports/${targetDocId}/${Date.now()}_${file.name}`
            );
            const snapshot = await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);
            rowUrls.push(downloadURL);
          }
        }

        if (rowUrls.length > 0 || row.finding || row.recommendation) {
          uploadedPhotos.push({
            finding: row.finding,
            recommendation: row.recommendation,
            photoUrls: rowUrls,
            timestamp: new Date().toISOString(),
          });
        }
      }

      const plant = formData.plantUnitArea
        ? formData.plantUnitArea.trim().toUpperCase().replace(/\s+/g, "")
        : "PLANT";
      // 1. Prepare Data
      const finalData = {
        ...previewData,
        photoReport: uploadedPhotos,
        status: status,
        updatedAt: serverTimestamp(),
        submittedAt: status === 'Submitted' ? serverTimestamp() : null,
        createdAt: editingReportId ? undefined : serverTimestamp(),
        stepsCompleted: 2,
        planId: currentPlanId, // PERSIST PLAN ID
        inspectorId: auth.currentUser?.uid || null, // Add unique user ID for robust filtering
      };

      const distinctId = editingReportId || newDocId || targetDocId;

      if (!newDocId && !editingReportId) {
        setNewDocId(distinctId);
      }

      const reportRef = doc(db, "inspections", distinctId);

      await setDoc(reportRef, finalData, { merge: true });

      if (currentPlanId && status === "Submitted") {
        const planRef = doc(db, "inspection_plans", currentPlanId);
        await updateDoc(planRef, {
          status: "Submitted",
          "extendedProps.status": "Submitted",
          outcome: "Pass",
          updatedAt: serverTimestamp(),
        });
      }

      if (status === "Submitted") {
        try {
          const inspectorName =
            formData.inspectorName ||
            auth.currentUser?.displayName ||
            "an Inspector";
          const title = "Report Submitted";
          const message = `Report ${finalData.reportNo || "Unknown"
            } has been submitted by ${inspectorName} for approval.`;
          const link = "/supervisor-review"; // Link to supervisor review page

          await notificationService.notifyRole(
            "supervisor",
            title,
            message,
            "info",
            link
          );
          console.log("Notification sent to supervisor (InspectionForm)");
        } catch (notifErr) {
          console.error("Failed to send notification:", notifErr);
        }
      }

      notifications.show({
        title: status === "Draft" ? "Draft Saved" : "Report Submitted",
        message:
          status === "Draft"
            ? "Your report has been saved as a draft."
            : "Report submitted to supervisor for review.",
        color: "green",
      });

      if (status === "Draft") {
        navigate(`/report-submission`);
      } else {
        navigate(`/report-submission?id=${distinctId}`);
      }
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
        Inspection Report
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
          <Paper
            withBorder
            shadow="sm"
            p="xl"
            radius="md"
            bg={isDark ? "#1a1b1e" : undefined}
            style={{ borderColor: isDark ? "#373a40" : undefined }}
          >
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
          <Paper
            withBorder
            shadow="sm"
            p="xl"
            radius="md"
            bg={isDark ? "#1a1b1e" : undefined}
            style={{ borderColor: isDark ? "#373a40" : undefined }}
          >
            <Stack>
              <Title order={4}>Photo Evidence & Specific Recommendations</Title>
              <Text c="dimmed" size="sm">
                Add photos of specific defects/observations along with dedicated
                findings.
              </Text>

              {photoRows.length === 0 && (
                <Box
                  p="xl"
                  bg={isDark ? "#25262b" : "gray.1"}
                  style={{ textAlign: "center", borderRadius: 8 }}
                >
                  <Text c="dimmed">
                    No photos added yet. Click "Add Photo Row" to begin.
                  </Text>
                </Box>
              )}

              {photoRows.map((row, index) => (
                <Paper
                  key={row.id}
                  withBorder
                  p="md"
                  bg={isDark ? "#25262b" : "gray.0"}
                  style={{
                    transition: "border-color 0.2s",
                    borderColor: isDark ? "#373a40" : undefined,
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.currentTarget.style.borderColor = "#228be6";
                  }}
                  onDragLeave={(e) => {
                    e.currentTarget.style.borderColor = isDark
                      ? "#373a40"
                      : "#ced4da";
                  }}
                  onDrop={(e) => {
                    e.currentTarget.style.borderColor = isDark
                      ? "#373a40"
                      : "#ced4da";
                    handleDrop(e, row.id);
                  }}
                >
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
                    <div
                      onDragOverCapture={(e) => {
                        console.log(
                          "DragOver Capture Types:",
                          e.dataTransfer.types
                        );
                        // Allow drop if it contains text/plain (drawer item)
                        if (e.dataTransfer.types.includes("text/plain")) {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = "copy";
                        }
                      }}
                      onDropCapture={(e) => {
                        console.log(
                          "Drop Capture Types:",
                          e.dataTransfer.types
                        );

                        if (e.dataTransfer.types.includes("text/plain")) {
                          console.log("Is text/plain drop");
                          e.preventDefault();
                          e.stopPropagation();
                          handleDrop(e, row.id);
                        }
                      }}
                    >
                      <Dropzone
                        onDrop={(files) => {
                          if (files.length === 0) return;

                          setPhotoRows((prev) => {
                            const newRows = [...prev];
                            const targetIndex = newRows.findIndex(
                              (r) => r.id === row.id
                            );

                            if (targetIndex !== -1) {
                              const currentPhotos =
                                newRows[targetIndex].photos || [];
                              const currentCount = currentPhotos.length;

                              if (currentCount >= 5) {
                                notifications.show({
                                  title: "Limit Reached",
                                  message: "Max 5 photos.",
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
                                  message: `Partial add.`,
                                  color: "orange",
                                });
                              }

                              const newPhotoObjects = filesToAdd.map((f) => ({
                                type: "file",
                                file: f,
                                preview: URL.createObjectURL(f),
                              }));

                              newRows[targetIndex] = {
                                ...newRows[targetIndex],
                                photos: [...currentPhotos, ...newPhotoObjects],
                              };
                            }
                            return newRows;
                          });
                        }}
                        onReject={() =>
                          notifications.show({
                            title: "Image Rejected ",
                            message: "File too large (Max 10MB)",
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
                          border: `1px dashed ${isDark ? "#373a40" : "#ced4da"
                            }`,
                          borderRadius: 8,
                          cursor: "pointer",
                          overflow: "hidden",
                          backgroundColor:
                            row.photos && row.photos.length > 0
                              ? isDark
                                ? "#25262b"
                                : "white"
                              : "transparent",
                          padding: 10,
                        }}
                      >
                        {row.photos && row.photos.length > 0 ? (
                          <SimpleGrid
                            cols={
                              row.photos.length === 1
                                ? 1
                                : row.photos.length === 2
                                  ? 2
                                  : row.photos.length <= 4
                                    ? 2
                                    : 3
                            }
                            spacing="xs"
                            verticalSpacing="xs"
                            w="100%"
                            style={{
                              alignItems: "stretch",
                              overflow: "hidden",
                            }}
                          >
                            {row.photos.map((p, i) => (
                              <ImagePreviewItem
                                key={i}
                                src={p.preview}
                                onDelete={() => removeImageFromRow(row.id, i)}
                                height={
                                  row.photos.length <= 2
                                    ? 140
                                    : row.photos.length <= 4
                                      ? 100
                                      : 80
                                }
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
                              Max file size 10MB
                              <br />5 images only
                            </Text>
                          </Stack>
                        )}
                      </Dropzone>
                    </div>

                    {/* Column 2: Finding */}
                    <Textarea
                      label="Specific Finding / Observation"
                      placeholder="Describe what is seen in the photo..."
                      minRows={6}
                      value={row.finding}
                      onChange={(e) =>
                        updatePhotoRow(row.id, "finding", e.currentTarget.value)
                      }
                    />

                    {/* Column 3: Recommendation */}
                    <Textarea
                      label="Specific Recommendation"
                      placeholder="Action required for this specific item..."
                      minRows={6}
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

              <Group justify="center" mt="md">
                <Button
                  leftSection={<IconPlus size={16} />}
                  variant="outline"
                  onClick={addPhotoRow}
                >
                  Add Photo Row
                </Button>
              </Group>

              <Divider my="lg" />

              <Group justify="space-between">
                <Button variant="default" onClick={() => setActiveStep(0)}>
                  Back to Details
                </Button>
                <Button
                  color="green"
                  leftSection={<IconCheck size={16} />}
                  onClick={handlePreview}
                >
                  Complete Report
                </Button>
              </Group>
            </Stack>
          </Paper>
        </Stepper.Step>
      </Stepper>

      {/* Preview Modal - Full Screen */}
      <Modal
        opened={previewOpened}
        onClose={() => setPreviewOpened(false)}
        fullScreen
        title="Report Preview"
        styles={{
          title: { fontWeight: "bold" },
          body: {
            backgroundColor: isDark ? "#1a1b1e" : "#f5f5f5",
            minHeight: "100vh",
            padding: 0,
          },
        }}
      >
        <Container size="xl" py="md">
          {previewData && (
            <ReportEditor
              report={previewData}
              hideBackButton
              ActionButtons={
                <Group>
                  <Button
                    type="button"
                    variant="default"
                    size="md"
                    loading={isSubmitting}
                    leftSection={<IconDeviceFloppy size={16} />}
                    onClick={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();

                      await handleStep2Submit("Draft");
                      setPreviewOpened(false);
                    }}
                  >
                    Save as Draft
                  </Button>
                  <Button
                    type="button"
                    color="green"
                    size="md"
                    loading={isSubmitting}
                    leftSection={<IconSend size={16} />}
                    onClick={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();

                      if (submittingRef.current) return;
                      submittingRef.current = true;

                      try {
                        await handleStep2Submit("Submitted");
                        setPreviewOpened(false);
                      } catch (err) {
                        console.error("Submission failed:", err);
                      } finally {
                        submittingRef.current = false;
                      }
                    }}
                  >
                    Confirm & Submit
                  </Button>
                </Group>
              }
            />
          )}
        </Container>
      </Modal>
      {/* Search Modal */}
      <EquipmentSearchModal
        opened={opened}
        onClose={close}
        equipmentList={equipmentList}
        onPick={handleEquipmentPick}
        isDark={isDark}
      />

      <Drawer
        opened={drawerOpened}
        onClose={closeDrawer}
        title="Field Notes & Draft Photos"
        position="right"
        size="lg"
        withOverlay={false}
        lockScroll={false}
        styles={{ content: { boxShadow: "-5px 0px 20px rgba(0,0,0,0.1)" } }}
      >
        <Stack>
          <Title order={4}>Execution Notes</Title>
          <div
            dangerouslySetInnerHTML={{
              __html: draftData.notes || "<p>No notes recorded.</p>",
            }}
          />
          <Divider />
          <Title order={4}>Field Photos</Title>
          {!draftData.photos || draftData.photos.length === 0 ? (
            <Text c="dimmed">No photos available.</Text>
          ) : (
            <DraftPhotoGallery photos={draftData.photos} />
          )}
        </Stack>
      </Drawer>

      <Affix position={{ bottom: 20, right: 20 }}>
        <Transition
          transition="slide-up"
          mounted={
            !!(
              draftData.notes ||
              (draftData.photos && draftData.photos.length > 0)
            )
          }
        >
          {(transitionStyles) => (
            <Button
              leftSection={<IconNotebook size={20} />}
              style={transitionStyles}
              color="orange"
              onClick={openDrawer}
              size="lg"
              radius="xl"
              shadow="xl"
            >
              Draft Data ({draftData.photos?.length || 0})
            </Button>
          )}
        </Transition>
      </Affix>
    </Container>
  );
};

function EquipmentSearchModal({
  opened,
  onClose,
  equipmentList,
  onPick,
  isDark,
}) {
  const [query, setQuery] = useState("");

  const q = query.toLowerCase().trim();
  const results = equipmentList
    .filter((eq) => {
      const fields = [
        eq.tagNumber,
        eq.type,
        eq.plantUnitArea,
        eq.doshNumber,
        eq.service,
        eq.status,
        eq.function,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return q === "" ? true : fields.includes(q);
    })
    .slice(0, 15);

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Select Equipment Database"
      size="lg"
      centered
    >
      <TextInput
        placeholder="Type Tag No, DOSH, or Plant..."
        leftSection={<IconSearch size={16} />}
        value={query}
        onChange={(e) => setQuery(e.currentTarget.value)}
        mb="md"
        data-autofocus
      />

      <Stack gap="xs" style={{ maxHeight: "60vh", overflowY: "auto" }}>
        {results.length === 0 && (
          <Text c="dimmed" align="center" py="xl">
            No matching equipment found.
          </Text>
        )}
        {results.map((eq) => (
          <Paper
            key={eq.docId}
            withBorder
            p="sm"
            onClick={() => onPick(eq)}
            style={{
              cursor: "pointer",
              transition: "background-color 0.2s",
              borderColor: isDark ? "#373a40" : undefined,
            }}
            onMouseEnter={(e) =>
            (e.currentTarget.style.backgroundColor = isDark
              ? "#25262b"
              : "#f1f3f5")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "transparent")
            }
          >
            <Group wrap="nowrap">
              <Image
                src={eq.imageUrl || "https://placehold.co/48?text=Eq"}
                w={48}
                h={48}
                radius="md"
              />
              <Box style={{ flex: 1 }}>
                <Group justify="space-between" mb={2}>
                  <Text fw={600} size="sm">
                    {eq.tagNumber || "(No Tag)"}
                  </Text>
                  <Badge
                    size="sm"
                    variant="outline"
                    color={eq.status === "Active" ? "green" : "yellow"}
                  >
                    {eq.status}
                  </Badge>
                </Group>
                <Text size="xs" c="dimmed">
                  {[eq.type, eq.plantUnitArea, eq.doshNumber]
                    .filter(Boolean)
                    .join(" • ")}
                </Text>
                <Text size="xs" lineClamp={1}>
                  {eq.equipmentDescription}
                </Text>
              </Box>
            </Group>
          </Paper>
        ))}
      </Stack>
    </Modal>
  );
}

const ImagePreviewItem = ({ src, onDelete, height }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <Box
      pos="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      h={height}
      w="100%"
      style={{ overflow: "hidden" }}
    >
      <Image src={src} radius="sm" h="100%" w="100%" fit="cover" />
      {hovered && (
        <Box
          pos="absolute"
          top={0}
          left={0}
          w="100%"
          h="100%"
          bg="rgba(0,0,0,0.5)"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 4,
            zIndex: 10,
          }}
        >
          <ActionIcon
            color="red"
            variant="filled"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <IconTrash size={16} />
          </ActionIcon>
        </Box>
      )}
    </Box>
  );
};

// Component to group photos by folder in Drawer
function DraftPhotoGallery({ photos }) {
  const [selected, setSelected] = useState(new Set()); // Set of URLs

  // Extract unique folders
  const uniqueFolders = new Set(["General"]);
  photos.forEach((p) => {
    if (p.folder) uniqueFolders.add(p.folder);
  });
  const folders = Array.from(uniqueFolders);

  const toggleSelect = (url) => {
    const newSet = new Set(selected);
    if (newSet.has(url)) newSet.delete(url);
    else newSet.add(url);
    setSelected(newSet);
  };

  return (
    <Stack>
      <Alert
        variant="light"
        color="blue"
        title="How to use"
        icon={<IconInfoCircle />}
      >
        Click photos to select multiple. Drag any selected photo to add all of
        them at once.
      </Alert>
      <Accordion multiple defaultValue={["General"]} variant="separated">
        {selected.size > 0 && (
          <Text size="sm" mb="xs" c="blue" ta="right">
            {selected.size} selected. Drag any selected item.
          </Text>
        )}
        {folders.map((folder) => {
          const folderPhotos = photos.filter(
            (p) => (p.folder || "General") === folder
          );
          if (folderPhotos.length === 0) return null;

          return (
            <Accordion.Item key={folder} value={folder}>
              <Accordion.Control icon={<IconFolder size={20} color="orange" />}>
                {folder} ({folderPhotos.length})
              </Accordion.Control>
              <Accordion.Panel>
                <SimpleGrid cols={2} spacing="xs">
                  {folderPhotos.map((p, i) => {
                    const url = p.url || p;
                    const isSelected = selected.has(url);
                    return (
                      <Box
                        key={i}
                        draggable
                        onClick={() => toggleSelect(url)}
                        onDragStart={(e) => {
                          let dataToSend;
                          // If dragging a selected item, send ALL selected items
                          if (isSelected) {
                            dataToSend = JSON.stringify(Array.from(selected));
                            console.log("Dragging multiple:", selected.size);
                          } else {
                            // If dragging unselected item, just send that one (even if others selected?)
                            // Standardize behavior: dragging one overrides selection logic for simple drag?
                            // Or better: clear selection and drag valid one?
                            // Let's implement: if dragging unselected, just drag that one as single.
                            dataToSend = url; // Single URL behaves as standard text/plain
                            console.log("Dragging single:", url);
                          }
                          e.dataTransfer.setData("text/plain", dataToSend);
                          e.dataTransfer.effectAllowed = "copy";
                        }}
                        style={{
                          cursor: "grab",
                          border: isSelected
                            ? "3px solid #228be6"
                            : "1px solid transparent",
                          borderRadius: 8,
                          transition: "border 0.2s",
                          position: "relative",
                        }}
                      >
                        <Image
                          src={url}
                          radius="md"
                          h={100}
                          fit="cover"
                          style={{ pointerEvents: "none" }}
                        />
                        {isSelected && (
                          <Box
                            pos="absolute"
                            top={5}
                            right={5}
                            bg="blue"
                            style={{
                              borderRadius: "50%",
                              width: 20,
                              height: 20,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <IconCheck size={14} color="white" />
                          </Box>
                        )}
                      </Box>
                    );
                  })}
                </SimpleGrid>
              </Accordion.Panel>
            </Accordion.Item>
          );
        })}
      </Accordion>
    </Stack>
  );
}

export default InspectionForm;
