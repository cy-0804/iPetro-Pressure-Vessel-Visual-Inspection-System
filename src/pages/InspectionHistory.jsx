import React, { useEffect, useState } from "react";
import {
  Container,
  Paper,
  Title,
  Table,
  Badge,
  Loader,
  Text,
  Group,
  TextInput,
  Accordion,
  Button,
  Modal,
  Box,
  ActionIcon,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useDisclosure } from "@mantine/hooks";
import { IconSearch, IconEye, IconFileCheck, IconX } from "@tabler/icons-react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { InspectionReportView } from "../components/InspectionReportView";

export default function InspectionReportHistory() {
  const [history, setHistory] = useState([]);
  const [groupedHistory, setGroupedHistory] = useState({});
  const [loading, setLoading] = useState(true);
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
      // Simple search filter at the item level (optional, but good for UX)
      if (
        search &&
        !item.equipmentId.toLowerCase().includes(search.toLowerCase())
      ) {
        // If tag doesn't match, check inspector?
        // The user requested grouping by Tag, so searching usually filters the Tags.
        // Let's filter the Groups KEYs instead in the render.
      }

      if (!groups[item.equipmentId]) {
        groups[item.equipmentId] = {
          equipmentDescription: item.equipmentDescription,
          plantUnitArea: item.plantUnitArea,
          reports: [],
        };
      }
      groups[item.equipmentId].reports.push(item);
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

  return (
    <Container size="xl" py="xl">
      <Group justify="space-between" mb="xl">
        <Title order={2}>Inspection History</Title>
        <TextInput
          placeholder="Search Tag Number..."
          leftSection={<IconSearch size={14} />}
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          w={300}
        />
      </Group>

      {loading ? (
        <Group justify="center">
          <Loader />
        </Group>
      ) : filteredTags.length === 0 ? (
        <Text c="dimmed" ta="center">
          No equipment history found.
        </Text>
      ) : (
        <Accordion
          variant="separated"
          radius="md"
          defaultValue={filteredTags[0]}
        >
          {filteredTags.map((tag) => {
            const group = groupedHistory[tag];
            return (
              <Accordion.Item key={tag} value={tag}>
                <Accordion.Control
                  icon={<IconFileCheck size={20} color="#40c057" />}
                >
                  <Group justify="space-between" pr="md">
                    <Box>
                      <Text fw={700}>{tag}</Text>
                      <Text size="xs" c="dimmed">
                        {group.equipmentDescription} - {group.plantUnitArea}
                      </Text>
                    </Box>
                    <Badge variant="light" color="gray">
                      {group.reports.length} Reports
                    </Badge>
                  </Group>
                </Accordion.Control>
                <Accordion.Panel>
                  <Table striped highlightOnHover>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Inspection Date</Table.Th>
                        <Table.Th>Inspector</Table.Th>
                        <Table.Th>Reviewed By</Table.Th>
                        <Table.Th>Report No</Table.Th>
                        <Table.Th style={{ textAlign: "right" }}>
                          Action
                        </Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {group.reports.map((report) => (
                        <Table.Tr key={report.id}>
                          <Table.Td>{report.inspectionDate}</Table.Td>
                          <Table.Td>{report.inspectorName}</Table.Td>
                          <Table.Td>
                            <Text size="sm" fw={500} c="blue">
                              {report.reviewedBy}
                            </Text>
                          </Table.Td>
                          <Table.Td>{report.reportNo || "N/A"}</Table.Td>
                          <Table.Td style={{ textAlign: "right" }}>
                            <Button
                              size="xs"
                              variant="light"
                              leftSection={<IconEye size={14} />}
                              onClick={() => handleJsonOpen(report)}
                            >
                              View Report
                            </Button>
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </Accordion.Panel>
              </Accordion.Item>
            );
          })}
        </Accordion>
      )}

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
