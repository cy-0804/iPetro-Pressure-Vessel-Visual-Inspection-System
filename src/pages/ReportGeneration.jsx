import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { db, auth } from "../firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import {
  Container,
  Title,
  Text,
  Paper,
  Table,
  Button,
  Group,
  Badge,
  Box,
  Image,
  Loader,
  Textarea,
} from "@mantine/core";
import {
  IconPrinter,
  IconArrowLeft,
  IconFileText,
  IconDeviceFloppy,
  IconSend,
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";

const ReportGeneration = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const reportId = searchParams.get("id");

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);

  // 1. If ID is present in URL, fetch it directly
  useEffect(() => {
    if (reportId) {
      const fetchSingle = async () => {
        try {
          const docRef = doc(db, "inspections", reportId);
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            setSelectedReport({ id: snap.id, ...snap.data() });
          } else {
            notifications.show({
              title: "Error",
              message: "Report not found",
              color: "red",
            });
          }
        } catch (err) {
          console.error(err);
        } finally {
          setLoading(false);
        }
      };
      fetchSingle();
    } else {
      // 2. Otherwise fetch list of drafts/completed
      const fetchList = async () => {
        try {
          // Fetch Drafts (for editing) and Completed/Submitted (for printing)
          const q = query(
            collection(db, "inspections"),
            where("status", "in", [
              "Draft",
              "Submitted",
              "Approved",
              "Completed",
            ])
          );
          const snapshot = await getDocs(q);
          const data = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));

          // Sort by updated descending
          data.sort((a, b) => {
            const timeA = a.updatedAt?.seconds || 0;
            const timeB = b.updatedAt?.seconds || 0;
            return timeB - timeA;
          });

          setReports(data);
        } catch (error) {
          console.error("Error fetching reports:", error);
        } finally {
          setLoading(false);
        }
      };
      fetchList();
    }
  }, [reportId]);

  if (loading) {
    return (
      <Container size="xl" py="xl">
        <Group justify="center">
          <Loader />
        </Group>
      </Container>
    );
  }

  // If a report is selected (either via URL or list click), show Editor/Viewer
  if (selectedReport) {
    return (
      <ReportEditor
        report={selectedReport}
        onBack={() => {
          setSelectedReport(null);
          navigate("/report-generation"); // Clear ID from URL
        }}
        isDraft={selectedReport.status === "Draft"}
      />
    );
  }

  // List View
  return (
    <Container size="xl" py="xl">
      <Title order={2} mb="lg">
        Report Generation & Review
      </Title>

      <Paper withBorder shadow="sm" radius="md" overflow="hidden">
        <Table highlightOnHover verticalSpacing="sm">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Tag No / Equipment</Table.Th>
              <Table.Th>Inspector</Table.Th>
              <Table.Th>Date</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {reports.length === 0 && (
              <Table.Tr>
                <Table.Td colSpan={5} align="center">
                  No reports found.
                </Table.Td>
              </Table.Tr>
            )}
            {reports.map((r) => (
              <Table.Tr key={r.id}>
                <Table.Td>
                  <Text fw={500}>{r.equipmentId || "N/A"}</Text>
                  <Text size="xs" c="dimmed">
                    {r.equipmentDescription}
                  </Text>
                </Table.Td>
                <Table.Td>{r.inspectorName}</Table.Td>
                <Table.Td>{r.inspectionDate}</Table.Td>
                <Table.Td>
                  <Badge
                    color={
                      r.status === "Approved"
                        ? "green"
                        : r.status === "Submitted"
                        ? "blue"
                        : "gray"
                    }
                  >
                    {r.status}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Button
                    size="xs"
                    variant="light"
                    leftSection={<IconFileText size={14} />}
                    onClick={() => setSelectedReport(r)}
                  >
                    {r.status === "Draft" ? "Edit / Submit" : "View / Print"}
                  </Button>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Paper>
    </Container>
  );
};

// --- A4 Editor Component (Merged with Edit/Submit Logic) ---
import { InspectionReportView } from "../components/InspectionReportView";

const ReportEditor = ({ report, onBack, isDraft }) => {
  const [data, setData] = useState(report);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const handlePrint = () => {
    window.print();
  };

  const handleSave = async (status) => {
    setSubmitting(true);
    try {
      const docRef = doc(db, "inspections", data.id);
      await updateDoc(docRef, {
        recommendation: data.recommendation, // Save edited recommendation
        status: status,
        updatedAt: serverTimestamp(),
      });

      notifications.show({
        title: status === "Submitted" ? "Report Submitted" : "Draft Saved",
        message:
          status === "Submitted"
            ? "Report sent to supervisor for approval."
            : "Changes saved locally.",
        color: "green",
      });

      if (status === "Submitted") {
        navigate("/dashboard");
      }
    } catch (err) {
      console.error(err);
      notifications.show({
        title: "Error",
        message: "Failed to save report",
        color: "red",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box>
      {/* Toolbar */}
      <Group mb="md" className="no-print" justify="space-between">
        <Button
          variant="default"
          leftSection={<IconArrowLeft size={16} />}
          onClick={onBack}
        >
          Back to List
        </Button>

        <Group>
          {isDraft && (
            <>
              <Button
                variant="default"
                leftSection={<IconDeviceFloppy size={16} />}
                loading={submitting}
                onClick={() => handleSave("Draft")}
              >
                Save Draft
              </Button>
              <Button
                color="blue"
                leftSection={<IconSend size={16} />}
                loading={submitting}
                onClick={() => handleSave("Submitted")}
              >
                Submit to Supervisor
              </Button>
            </>
          )}
          <Button
            color="orange"
            leftSection={<IconPrinter size={16} />}
            onClick={handlePrint}
          >
            Print / Save PDF
          </Button>
        </Group>
      </Group>

      <InspectionReportView
        data={data}
        isEditing={isDraft}
        onRecommendationChange={(val) =>
          setData({ ...data, recommendation: val })
        }
      />
    </Box>
  );
};

export default ReportGeneration;
