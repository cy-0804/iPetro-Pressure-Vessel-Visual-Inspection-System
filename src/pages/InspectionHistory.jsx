import React, { useEffect, useState } from "react";
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
import {
  IconSearch,
  IconArrowRight,
  IconCalendar,
  IconArrowLeft,
  IconDownload,
  IconArrowsDiff,
  IconUser,
  IconX,
} from "@tabler/icons-react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { InspectionReportView } from "../components/InspectionReportView";

export default function InspectionReportHistory() {
  const [history, setHistory] = useState([]);
  const [groupedHistory, setGroupedHistory] = useState({});
  const [loading, setLoading] = useState(true);

  // View State
  const [selectedTag, setSelectedTag] = useState(null); // 'PV-101'
  const [search, setSearch] = useState("");

  // Modal State
  const [opened, { open, close }] = useDisclosure(false);
  const [selectedReport, setSelectedReport] = useState(null);

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
          latestDate: item.inspectionDate, // Initial assumption
        };
      }
      groups[item.equipmentId].reports.push(item);

      // Update latest date if current item is newer (though list is already sorted)
      const currentLatest = new Date(groups[item.equipmentId].latestDate);
      const itemDate = new Date(item.inspectionDate);
      if (itemDate > currentLatest) {
        groups[item.equipmentId].latestDate = item.inspectionDate;
      }
    });
    setGroupedHistory(groups);
  }, [history]);

  const filteredTags = Object.keys(groupedHistory).filter((tag) =>
    tag.toLowerCase().includes(search.toLowerCase())
  );

  const handleJsonOpen = (report) => {
    setSelectedReport(report);
    open();
  };

  // --- Views ---

  // 1. Grid View (Equipment Selection)
  const renderEquipmentGrid = () => (
    <>
      <Title order={2} mb="lg">
        Select Equipment
      </Title>
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
  // const [filterStatus, setFilterStatus] = useState("all"); // All here are Approved anyway

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
              setSelectedTag(null);
              setFilterSearch(""); // Reset filters on back
              setFilterType("all");
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
            <Button variant="subtle" leftSection={<IconDownload size={16} />}>
              Export
            </Button>
            <Button
              variant="default"
              leftSection={<IconArrowsDiff size={16} />}
              disabled
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
                    {/* <Checkbox color="gray" /> */}
                    <div>
                      <Text
                        fw={600}
                        size="sm"
                        style={{ fontFamily: "monospace" }}
                      >
                        {report.reportNo || "No Report ID"}
                      </Text>
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

                  <Button
                    size="xs"
                    radius="xl"
                    variant="outline"
                    onClick={() => handleJsonOpen(report)}
                  >
                    VISUAL
                  </Button>
                </Group>
              </Card>
            ))
          )}
        </Stack>
      </>
    );
  };

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
    </Container>
  );
}
