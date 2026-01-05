import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Title,
  Text,
  Group,
  Stack,
  Paper,
  Badge,
  Button,
  Image,
  TextInput,
  Select,
  Pagination,
  Modal,
  Loader,
} from "@mantine/core";
import {
  ArrowLeft,
  Search,
  Calendar,
  User,
  FileText,
} from "lucide-react";
import {
  collection,
  getDocs,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "../firebase";

/* =========================================================
   InspectionHistory.jsx
   ========================================================= */

export default function InspectionHistory() {
  const [equipments, setEquipments] = useState([]);
  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const [previewReport, setPreviewReport] = useState(null);

  // Filters
  const [search, setSearch] = useState("");
  const [inspectorFilter, setInspectorFilter] = useState("all");
  const [dateSort, setDateSort] = useState("latest");

  // Pagination
  const itemsPerPage = 6;
  const [page, setPage] = useState(1);

  /* =========================================================
     FETCH DATA FROM FIRESTORE
     ========================================================= */

  useEffect(() => {
    const fetchData = async () => {
      try {
        const equipmentSnap = await getDocs(
          query(collection(db, "equipments"), orderBy("createdAt", "desc"))
        );

        const inspectionSnap = await getDocs(
          query(collection(db, "inspections"), orderBy("createdAt", "desc"))
        );

        setEquipments(
          equipmentSnap.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
        );

        setInspections(
          inspectionSnap.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
        );
      } catch (err) {
        console.error("Error loading data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  /* =========================================================
     EQUIPMENT CARD STATS
     ========================================================= */

  const equipmentStats = useMemo(() => {
    return equipments.map((eq) => {
      const reports = inspections.filter(
        (i) => i.equipmentId === eq.tagNumber
      );

      const latest = reports
        .map((r) => r.inspectionDate)
        .sort()
        .reverse()[0];

      return {
        ...eq,
        reportCount: reports.length,
        latestDate: latest || "N/A",
      };
    });
  }, [equipments, inspections]);

  /* =========================================================
     FILTERED REPORTS
     ========================================================= */

  const filteredReports = useMemo(() => {
    if (!selectedEquipment) return [];

    let data = inspections.filter(
      (i) => i.equipmentId === selectedEquipment.tagNumber
    );

    if (search) {
      data = data.filter(
        (r) =>
          r.id.toLowerCase().includes(search.toLowerCase()) ||
          r.inspectorName?.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (inspectorFilter !== "all") {
      data = data.filter(
        (r) => r.inspectorName === inspectorFilter
      );
    }

    data.sort((a, b) =>
      dateSort === "latest"
        ? new Date(b.inspectionDate) - new Date(a.inspectionDate)
        : new Date(a.inspectionDate) - new Date(b.inspectionDate)
    );

    return data;
  }, [selectedEquipment, inspections, search, inspectorFilter, dateSort]);

  const totalPages = Math.ceil(filteredReports.length / itemsPerPage);
  const paginatedReports = filteredReports.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  /* =========================================================
     LOADING STATE
     ========================================================= */

  if (loading) {
    return (
      <Box mih="100vh" display="flex" style={{ alignItems: "center", justifyContent: "center" }}>
        <Loader size="lg" />
      </Box>
    );
  }

  /* =========================================================
     VIEW 1 — SELECT EQUIPMENT
     ========================================================= */

  if (!selectedEquipment) {
    return (
      <Box p="xl" bg="#f8f9fa" mih="100vh">
        <Title order={2} mb="lg">
          Select Equipment
        </Title>

        <Box
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "1.5rem",
          }}
        >
          {equipmentStats.map((eq) => (
            <Paper
              key={eq.id}
              withBorder
              radius="md"
              p="md"
              onClick={() => setSelectedEquipment(eq)}
              style={{ cursor: "pointer" }}
            >
              <Image
                src={eq.imageUrl}
                height={160}
                radius="md"
                fallbackSrc="https://via.placeholder.com/400x250"
              />

              <Stack mt="md" gap={4}>
                <Title order={4}>{eq.tagNumber}</Title>
                <Text size="sm" c="dimmed">
                  {eq.reportCount} inspection reports
                </Text>
                <Group gap={6}>
                  <Calendar size={14} />
                  <Text size="xs">
                    Latest: {eq.latestDate}
                  </Text>
                </Group>
              </Stack>

              <Button fullWidth mt="md" variant="light">
                View History
              </Button>
            </Paper>
          ))}
        </Box>
      </Box>
    );
  }

  /* =========================================================
     VIEW 2 — REPORT HISTORY
     ========================================================= */

  return (
    <Box p="xl" bg="#f8f9fa" mih="100vh">
      {/* HEADER */}
      <Group justify="space-between" mb="lg">
        <Group>
          <Button
            variant="subtle"
            leftSection={<ArrowLeft size={16} />}
            onClick={() => {
              setSelectedEquipment(null);
              setPage(1);
            }}
          >
            Back
          </Button>

          <Stack gap={0}>
            <Text size="xs" c="dimmed">
              Equipment Tag
            </Text>
            <Title order={3}>{selectedEquipment.tagNumber}</Title>
          </Stack>
        </Group>

        <Badge size="lg" variant="light">
          {filteredReports.length} reports found
        </Badge>
      </Group>

      {/* TOOLBAR */}
      <Paper withBorder p="md" radius="md" mb="lg">
        <Group grow align="flex-end">
          <TextInput
            label="Search"
            placeholder="Report ID or Inspector"
            leftSection={<Search size={14} />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <Select
            label="Inspector"
            value={inspectorFilter}
            onChange={setInspectorFilter}
            data={[
              "all",
              ...new Set(
                filteredReports.map((r) => r.inspectorName).filter(Boolean)
              ),
            ]}
          />

          <Select
            label="Date Order"
            value={dateSort}
            onChange={setDateSort}
            data={[
              { value: "latest", label: "Latest first" },
              { value: "oldest", label: "Oldest first" },
            ]}
          />
        </Group>
      </Paper>

      {/* REPORT CARDS */}
      <Stack gap="sm">
        {paginatedReports.map((r) => (
          <Paper
            key={r.id}
            withBorder
            p="md"
            radius="md"
            style={{ cursor: "pointer" }}
            onClick={() => setPreviewReport(r)}
          >
            <Group justify="space-between">
              <Group gap="md">
                <FileText size={20} />
                <Stack gap={2}>
                  <Text fw={600}>{r.id}</Text>
                  <Group gap={12}>
                    <Group gap={4}>
                      <User size={14} />
                      <Text size="xs">{r.inspectorName}</Text>
                    </Group>
                    <Group gap={4}>
                      <Calendar size={14} />
                      <Text size="xs">{r.inspectionDate}</Text>
                    </Group>
                  </Group>
                </Stack>
              </Group>

              <Badge color="green" variant="light">
                {r.status || "Completed"}
              </Badge>
            </Group>
          </Paper>
        ))}
      </Stack>

      {/* PAGINATION */}
      {totalPages > 1 && (
        <Group justify="center" mt="xl">
          <Pagination
            value={page}
            onChange={setPage}
            total={totalPages}
          />
        </Group>
      )}

      {/* PDF PREVIEW */}
      <Modal
        opened={!!previewReport}
        onClose={() => setPreviewReport(null)}
        size="90%"
        centered
        title={
          <Stack gap={2}>
            <Text fw={600}>{previewReport?.id}</Text>
            <Text size="xs" c="dimmed">
              Inspector: {previewReport?.inspectorName}
            </Text>
          </Stack>
        }
      >
        <iframe
          src={previewReport?.photoReport?.[0]?.photoUrls?.[0]}
          title="Inspection PDF"
          style={{
            width: "100%",
            height: "80vh",
            border: "1px solid #e5e7eb",
            borderRadius: 8,
          }}
        />
      </Modal>
    </Box>
  );
}
