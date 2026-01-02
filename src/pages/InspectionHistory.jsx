import React, { useEffect, useState, useRef } from "react";
import {
  Container,
  Title,
  Text,
  Group,
  TextInput,
  Button,
  Modal,
  Box,
  SimpleGrid,
  Card,
  Badge,
  Stack,
  ActionIcon,
  Select,
  Checkbox,
  Divider,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useDisclosure } from "@mantine/hooks";
import { useNavigate, useLocation } from "react-router-dom";
import {
  IconSearch,
  IconArrowRight,
  IconCalendar,
  IconArrowLeft,
  IconDownload,
  IconArrowsDiff,
  IconUser,
  IconX,
  IconTrash,
} from "@tabler/icons-react";
import { collection, query, where, getDocs, doc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";
import { InspectionReportView } from "../components/InspectionReportView";
import { ReportEditor } from "./ReportGeneration";
import { userService } from "../services/userService";
import { getEquipments } from "../services/equipmentService";
import JSZip from "jszip";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { saveAs } from "file-saver";

export default function InspectionReportHistory() {
  const [history, setHistory] = useState([]);
  const [groupedHistory, setGroupedHistory] = useState({});
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await userService.getCurrentUserProfile();
        setUserRole(user?.role);
      } catch (e) {
        console.error("Failed to load user", e);
      }
    };
    loadUser();
  }, []);

  const handleDeleteReport = async (reportId) => {
    if (!window.confirm("Are you sure you want to delete this report? This action cannot be undone.")) return;
    try {
      await deleteDoc(doc(db, "inspections", reportId));
      notifications.show({ title: "Success", message: "Report deleted", color: "green" });
      setHistory(prev => prev.filter(h => h.id !== reportId));
      setSelectedReportIds(prev => prev.filter(id => id !== reportId));
    } catch (err) {
      console.error("Delete error", err);
      notifications.show({ title: "Error", message: "Failed to delete report", color: "red" });
    }
  };


  const [selectedTag, setSelectedTag] = useState(null);
  const [search, setSearch] = useState("");


  const [opened, { open, close }] = useDisclosure(false);
  const [compareModalOpen, { open: openCompare, close: closeCompare }] = useDisclosure(false);
  const [selectedReport, setSelectedReport] = useState(null);

  const navigate = useNavigate();
  const location = useLocation();
  const [selectedReportIds, setSelectedReportIds] = useState([]);
  const [exportReports, setExportReports] = useState([]);
  const reportEditorRef = useRef(null);


  const [equipmentMap, setEquipmentMap] = useState({});
  const [equipmentTypes, setEquipmentTypes] = useState([]);
  const [filterEquipmentType, setFilterEquipmentType] = useState("all");

  // Fetch Equipment
  useEffect(() => {
    const fetchEquipments = async () => {
      const equips = await getEquipments();
      const map = {};
      const types = new Set();
      equips.forEach((eq) => {

        const key = eq.tagNumber || eq.id;
        map[key] = {
          type: eq.type || "Unknown",
          description: eq.description || eq.equipmentDescription || ""
        };
        if (eq.type) types.add(eq.type);
      });
      setEquipmentMap(map);
      setEquipmentTypes(Array.from(types));
    };
    fetchEquipments();
  }, []);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const q = query(
          collection(db, "inspections"),
          where("status", "==", "Approved")
        );
        const snap = await getDocs(q);
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

        // Sort by date descending
        list.sort(
          (a, b) => new Date(b.inspectionDate) - new Date(a.inspectionDate)
        );

        setHistory(list);
      } catch (err) {
        console.error(err);
        notifications.show({
          title: "Error",
          message: "Failed to load history",
          color: "red",
        });
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  // Grouping Logic
  useEffect(() => {
    const groups = {};
    history.forEach((item) => {
      if (!groups[item.equipmentId]) {
        groups[item.equipmentId] = {
          equipmentDescription: item.equipmentDescription,
          plantUnitArea: item.plantUnitArea,
          reports: [],
          latestDate: item.inspectionDate,
        };
      }
      groups[item.equipmentId].reports.push(item);


      const currentLatest = new Date(groups[item.equipmentId].latestDate);
      const itemDate = new Date(item.inspectionDate);
      if (itemDate > currentLatest) {
        groups[item.equipmentId].latestDate = item.inspectionDate;
      }
    });
    setGroupedHistory(groups);
  }, [history]);


  useEffect(() => {
    if (location.state?.selectedTag) {
      setSelectedTag(location.state.selectedTag);
    }
  }, [location.state]);

  const filteredTags = Object.keys(groupedHistory).filter((tag) => {
    const group = groupedHistory[tag];
    const matchSearch = tag.toLowerCase().includes(search.toLowerCase()) ||
      (group.equipmentDescription || equipmentMap[tag]?.description || "").toLowerCase().includes(search.toLowerCase());
    const type = equipmentMap[tag]?.type; // Access type from object
    const matchType = filterEquipmentType === "all" || type === filterEquipmentType;
    return matchSearch && matchType;
  });

  const handleJsonOpen = (report) => {
    setSelectedReport(report);
    open();
  };

  // --- Views ---

  // 1. Grid View (Equipment Selection)
  const renderEquipmentGrid = () => (
    <>
      <Title order={2} mb="lg">
        Inspection History
      </Title>

      {/* FILTERS FOR GRID VIEW */}
      <Group mb="lg">
        <TextInput
          placeholder="Search Tag No..."
          leftSection={<IconSearch size={14} />}
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
        />
        <Select
          placeholder="Filter by Type"
          data={[{ value: 'all', label: 'All Types' }, ...equipmentTypes.map(t => ({ value: t, label: t }))]}
          value={filterEquipmentType}
          onChange={setFilterEquipmentType}
          searchable
          clearable
        />
      </Group>

      <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
        {filteredTags.map((tag) => {
          const group = groupedHistory[tag];
          return (
            <Card key={tag} shadow="sm" padding="lg" radius="md" withBorder>
              <Group justify="space-between" mb="xs">
                <Text fw={700} size="lg" c="blue">
                  {tag}
                </Text>
                <Badge color="gray.2" c="dark">
                  {group.reports.length} REPORTS
                </Badge>
              </Group>

              <Group gap="xs" mb="lg">
                <IconCalendar size={16} color="gray" />
                <Text size="sm" c="dimmed">
                  Latest: {group.latestDate}
                </Text>
              </Group>

              <Button
                variant="light"
                fullWidth
                rightSection={<IconArrowRight size={14} />}
                onClick={() => setSelectedTag(tag)}
              >
                View History
              </Button>
            </Card>
          );
        })}
      </SimpleGrid>
      {filteredTags.length === 0 && !loading && (
        <Text c="dimmed" ta="center" mt="xl">
          No equipment found matching your search.
        </Text>
      )}
    </>
  );

  // 2. Detail View (Report List)
  const [filterSearch, setFilterSearch] = useState("");
  const [filterType, setFilterType] = useState("all");


  const renderDetailView = () => {
    const group = groupedHistory[selectedTag];
    if (!group) return <Text>Error: Equipment data not found.</Text>;

    // Filter Logic
    const filteredReports = group.reports.filter((r) => {
      const matchSearch =
        (r.reportNo &&
          r.reportNo.toLowerCase().includes(filterSearch.toLowerCase())) ||
        (r.inspectorName &&
          r.inspectorName.toLowerCase().includes(filterSearch.toLowerCase()));

      const matchType =
        filterType === "all" ||
        (r.inspectionType && r.inspectionType === filterType);

      return matchSearch && matchType;
    });

    return (
      <>
        {/* Header */}
        <Group mb="md">
          <Button
            variant="subtle"
            leftSection={<IconArrowLeft size={16} />}
            onClick={() => {
              if (location.state?.fromEquipmentDetails) {
                navigate(-1);
              } else {
                setSelectedTag(null);
                setFilterSearch("");
                setFilterType("all");
                setSelectedReportIds([]);
              }
            }}
            pl={0}
          >
            Back
          </Button>
        </Group>

        <Group justify="space-between" align="center" mb="lg">
          <Title order={3}>{selectedTag} History</Title>
          <Badge size="lg" variant="light">
            {filteredReports.length} FOUND
          </Badge>
        </Group>

        {/* Controls */}
        <Group justify="space-between" mb="md">
          <TextInput
            placeholder="Search Report No or Inspector..."
            leftSection={<IconSearch size={14} />}
            style={{ flex: 1 }}
            value={filterSearch}
            onChange={(e) => setFilterSearch(e.currentTarget.value)}
          />
          <Group>
            <Button
              variant="subtle"
              leftSection={<IconDownload size={16} />}
              disabled={selectedReportIds.length === 0}
              onClick={() => {
                const selected = history.filter(h => selectedReportIds.includes(h.id));
                setExportReports(selected);
              }}
            >
              Export PDF
            </Button>
            <Button
              variant="default"
              leftSection={<IconArrowsDiff size={16} />}
              disabled={selectedReportIds.length !== 2}
              onClick={openCompare}
            >
              Compare
            </Button>
          </Group>
        </Group>

        {/* Filters Row */}
        <Group grow mb="xl">
          <Select
            placeholder="Filter by type"
            data={[
              { value: "all", label: "All Types" },
              { value: "VI", label: "Visual Inspection (VI)" },
              { value: "UT", label: "Ultrasonic Thickness (UT)" },
              { value: "RT", label: "Radiographic Testing (RT)" },
              { value: "PT", label: "Penetrant Testing (PT)" },
              { value: "MT", label: "Magnetic Particle (MT)" },
            ]}
            value={filterType}
            onChange={setFilterType}
          />
        </Group>

        {/* List */}
        <Stack gap="sm">
          {filteredReports.length === 0 ? (
            <Text c="dimmed" ta="center" py="xl">
              No reports match your filters.
            </Text>
          ) : (
            filteredReports.map((report) => (
              <Card
                key={report.id}
                withBorder
                shadow="sm"
                padding="sm"
                radius="md"
              >
                <Group justify="space-between">
                  <Group>
                    <Checkbox
                      checked={selectedReportIds.includes(report.id)}
                      onChange={(e) => {
                        if (e.currentTarget.checked) {
                          setSelectedReportIds(prev => [...prev, report.id]);
                        } else {
                          setSelectedReportIds(prev => prev.filter(id => id !== report.id));
                        }
                      }}
                    />
                    <div>
                      <Group gap="xs">
                        <Text
                          fw={600}
                          size="sm"
                          style={{ fontFamily: "monospace" }}
                        >
                          {report.reportNo || "No Report ID"}
                        </Text>
                        <Badge size="sm" variant="light" color="blue">
                          {{
                            VI: "Visual",
                            UT: "Ultrasonic",
                            RT: "Radiographic",
                            PT: "Penetrant",
                            MT: "Magnetic"
                          }[report.inspectionType] || report.inspectionType || "Visual"}
                        </Badge>
                      </Group>
                      <Group gap="xs" mt={4}>
                        <Badge size="xs" color="blue" variant="outline">
                          {report.inspectionType || "VI"}
                        </Badge>
                        <Divider orientation="vertical" />
                        <IconUser size={14} color="gray" />
                        <Text size="xs" c="dimmed">
                          {report.inspectorName}
                        </Text>
                        <Divider orientation="vertical" />
                        <IconCalendar size={14} color="gray" />
                        <Text size="xs" c="dimmed">
                          {report.inspectionDate}
                        </Text>
                      </Group>
                    </div>
                  </Group>

                  <Group>
                    {userRole === 'supervisor' && (
                      <ActionIcon color="red" variant="subtle" onClick={() => handleDeleteReport(report.id)} title="Delete Report">
                        <IconTrash size={18} />
                      </ActionIcon>
                    )}
                    <Button
                      size="xs"
                      radius="xl"
                      variant="outline"
                      onClick={() => handleJsonOpen(report)}
                    >
                      View
                    </Button>
                  </Group>
                </Group>
              </Card>
            ))
          )}
        </Stack>
      </>
    );
  };

  if (loading) {
    return (
      <Container size="xl" py="xl">
        <Text ta="center" size="lg" c="dimmed" mt="xl">Loading inspection history...</Text>
      </Container>
    );
  }

  return (
    <Container size="xl" py="xl">
      {selectedTag ? renderDetailView() : renderEquipmentGrid()}

      {/* Full Screen View Modal */}
      <Modal
        opened={opened}
        onClose={close}
        title={`Viewing Report: ${selectedReport?.equipmentId} (${selectedReport?.inspectionDate})`}
        size="100%"
        styles={{
          body: { backgroundColor: "#f0f0f0", padding: 0 },
        }}
        closeButtonProps={{
          icon: <IconX size={20} />,
        }}
      >
        {selectedReport && (
          <Box>
            <Box
              style={{
                height: "calc(100vh - 80px)",
                overflowY: "auto",
                paddingTop: "20px",
              }}
            >
              <InspectionReportView data={selectedReport} />
            </Box>
          </Box>
        )}
      </Modal>

      {/* Compare Modal */}
      <Modal
        opened={compareModalOpen}
        onClose={closeCompare}
        title="Compare Reports"
        size="100%"
        styles={{ body: { backgroundColor: "#f0f0f0", padding: 0 } }}
        closeButtonProps={{ icon: <IconX size={20} /> }}
      >
        <SimpleGrid cols={2} spacing={0}>
          {selectedReportIds.map(id => {

            const reportData = history.find(r => r.id === id);
            return (
              <Box key={id} style={{ height: "calc(100vh - 80px)", overflowY: "auto", borderRight: "1px solid #ccc" }}>
                {reportData ? <InspectionReportView data={reportData} /> : <Text>Report not found</Text>}
              </Box>
            );
          })}
        </SimpleGrid>
      </Modal>

      {/* Hidden Report Editor for Zip Generation */}
      {exportReports.length > 0 && (
        <div style={{ position: 'fixed', top: 0, left: 10000, width: '210mm' }}>
          <ReportEditor
            ref={reportEditorRef}
            reports={exportReports}
            onMount={async () => {
              try {
                const id = notifications.show({ title: 'Exporting', message: 'Generating PDFs...', loading: true, autoClose: false });

                if (!reportEditorRef.current) return;

                const isSingle = exportReports.length === 1;
                const zip = isSingle ? null : new JSZip();


                const sections = reportEditorRef.current.querySelectorAll('.report-section');

                for (let i = 0; i < sections.length; i++) {
                  const section = sections[i];
                  const reportData = exportReports[i];
                  const reportNo = reportData?.reportNo || `report_${i + 1}`;
                  const safeName = reportNo.replace(/[^a-z0-9_-]/gi, '_');

                  const fileName = `${safeName}_${i + 1}.pdf`;

                  const pdf = new jsPDF('p', 'mm', 'a4');
                  const pages = section.querySelectorAll('.a4-page');

                  for (let j = 0; j < pages.length; j++) {
                    const page = pages[j];
                    if (j > 0) pdf.addPage();

                    const canvas = await html2canvas(page, {
                      scale: 2,
                      useCORS: true,
                      logging: false,
                      windowWidth: 1200
                    });

                    const imgData = canvas.toDataURL('image/jpeg', 0.8);
                    const pdfWidth = pdf.internal.pageSize.getWidth();


                    const imgProps = pdf.getImageProperties(imgData);
                    const ratio = imgProps.width / imgProps.height;
                    const renderedHeight = pdfWidth / ratio;

                    pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, renderedHeight);
                  }

                  if (isSingle) {
                    pdf.save(fileName);
                  } else {
                    zip.file(fileName, pdf.output('blob'));
                  }
                }

                if (!isSingle) {
                  const content = await zip.generateAsync({ type: "blob" });
                  saveAs(content, `reports_export_${new Date().toISOString().slice(0, 10)}.zip`);
                }

                notifications.update({ id, title: 'Success', message: isSingle ? 'PDF downloaded.' : 'ZIP file downloaded.', color: 'green', loading: false, autoClose: 2000 });
              } catch (err) {
                console.error("Zip Error", err);
                notifications.show({ title: 'Error', message: 'Failed to generate ZIP.', color: 'red' });
              } finally {
                setExportReports([]);
              }
            }}
            hideBackButton={true}
          />
        </div>
      )}
    </Container>
  );
}
