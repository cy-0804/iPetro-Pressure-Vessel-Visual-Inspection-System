// dashboard.jsx
import { useEffect, useMemo, useState } from "react";
import {
  Container,
  Title,
  SimpleGrid,
  Paper,
  Text,
  Group,
  Stack,
  Badge,
  Button,
  Divider,
  Card,
  Grid,
  Center,
  Loader,
  Box,
  Modal,
  ThemeIcon,
  SegmentedControl,
  RingProgress,
  useMantineColorScheme,
} from "@mantine/core";
import {
  IconReportAnalytics,
  IconClock,
  IconCircleCheck,
  IconAlertCircle,
  IconTrendingUp,
  IconCalendar,
  IconPlus,
  IconFileText,
  IconUpload,
  IconListDetails,
} from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, query, where, orderBy, limit } from "firebase/firestore";
import { db } from "../firebase";
import { useCurrentUser } from "../hooks/useCurrentUser";
import dayjs from "dayjs";
import { Calendar } from "@mantine/dates";
import './Dashboard.css'
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/swiper-bundle.css";
import { inspectionService } from "../services/inspectionService";

/* ---------------- Helpers ---------------- */
const normStatus = (s) => (s || "").toString().trim().toUpperCase();

const statusBucket = (status) => {
  const s = normStatus(status);
  if (s === "OVERDUE" || s === "REJECTED") return "red";
  if (s === "APPROVED" || s === "COMPLETED") return "green";
  if (s === "SUBMITTED" || s === "PENDING" || s === "PENDING_REVIEW") return "cyan"; // Friend uses Cyan for Submitted
  if (s === "IN_PROGRESS") return "orange"; // Friend uses Orange
  if (s === "PLANNED" || s === "SCHEDULED") return "blue"; // Friend uses Blue
  return "gray";
};

const getStatusColor = (status) => {
  return statusBucket(status); // Returns valid Mantine colors: red, green, cyan, orange, blue, gray
};

const monthRangeStrings = (dateObj) => ({
  start: dayjs(dateObj).startOf("month").format("YYYY-MM-DD"),
  end: dayjs(dateObj).endOf("month").format("YYYY-MM-DD"),
});

const isDateWithinRange = (dateStr, startStr, endStr) => dateStr >= startStr && dateStr <= endStr;

const iterDatesInclusive = (startStr, endStr) => {
  const out = [];
  let cur = dayjs(startStr);
  const end = dayjs(endStr);
  while (cur.isBefore(end) || cur.isSame(end, "day")) {
    out.push(cur.format("YYYY-MM-DD"));
    cur = cur.add(1, "day");
  }
  return out;
};

const Dot = ({ bucket }) => {
  const size = 6;
  // Map bucket names to Mantine CSS variables
  const colorMap = {
    red: "var(--mantine-color-red-filled)",
    green: "var(--mantine-color-green-filled)",
    yellow: "var(--mantine-color-yellow-filled)",
    blue: "var(--mantine-color-blue-filled)",
    orange: "var(--mantine-color-orange-filled)",
    cyan: "var(--mantine-color-cyan-filled)",
    gray: "var(--mantine-color-gray-filled)",
  };

  const bg = colorMap[bucket] || colorMap.gray;

  return (
    <Box
      w={size}
      h={size}
      style={{
        borderRadius: 999,
        background: bg,
        opacity: 0.95,
      }}
    />
  );
};

function PlanRow({ plan, onClick, hoverCardSx }) {
  const title = plan.title || "Untitled Inspection";
  const inspector =
    plan?.extendedProps?.inspector ||
    (Array.isArray(plan.inspectors) ? plan.inspectors.join(", ") : "—");
  const dateText = plan.start ? dayjs(plan.start).format("YYYY-MM-DD") : "—";

  return (
    <Paper p="md" radius="md" sx={hoverCardSx} style={{ cursor: "pointer" }} onClick={onClick}>
      <Group justify="space-between" align="flex-start">
        <div style={{ minWidth: 0 }}>
          <Text fw={700} lineClamp={1}>
            {title}
          </Text>
          <Text size="sm" c="dimmed">
            Inspector: {inspector}
          </Text>
          <Text size="xs" c="dimmed">
            • {dateText}
          </Text>
        </div>

        <Badge color={getStatusColor(plan.status)} variant="light">
          {normStatus(plan.status) || "PLANNED"}
        </Badge>
      </Group>
    </Paper>
  );
}

function ReportRow({ report, onClick, hoverCardSx }) {
  const title = report.reportNo || report.equipmentId || "Untitled Report";
  const equipment = report.equipmentId || "—";
  const description = report.equipmentDescription || "";
  const dateText = report.inspectionDate ? dayjs(report.inspectionDate).format("YYYY-MM-DD") : "—";

  return (
    <Paper p="md" radius="md" sx={hoverCardSx} style={{ cursor: "pointer" }} onClick={onClick}>
      <Group justify="space-between" align="flex-start">
        <div style={{ minWidth: 0 }}>
          <Text fw={700} lineClamp={1}>
            {title}
          </Text>
          <Text size="sm" c="dimmed">
            Equipment: {equipment}
          </Text>
          {description && (
            <Text size="xs" c="dimmed" lineClamp={1}>
              {description}
            </Text>
          )}
          <Text size="xs" c="dimmed">
            • {dateText}
          </Text>
        </div>

        <Badge color={getStatusColor(report.status)} variant="light">
          {normStatus(report.status) || "UNKNOWN"}
        </Badge>
      </Group>
    </Paper>
  );
}


/* ---------------- Dashboard ---------------- */
export default function Dashboard() {
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';
  const navigate = useNavigate();
  const { userData, loading: userLoading } = useCurrentUser();

  const role = userData?.role || "inspector";
  const username = userData?.name || "";
  const isInspector = role === "inspector";

  const [activeSection, setActiveSection] = useState("inspections"); // "inspections" | "tasks"
  const [rightActiveSection, setRightActiveSection] = useState("completion"); // "completion" | "calendar"

  const [month, setMonth] = useState(new Date());
  const [selectedDateObj, setSelectedDateObj] = useState(new Date());

  const [monthPlans, setMonthPlans] = useState([]);
  const [upcomingPlans, setUpcomingPlans] = useState([]);

  // Inspection Reports (actual submitted work)
  const [monthReports, setMonthReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(true);

  const [loadingMonth, setLoadingMonth] = useState(true);
  const [loadingUpcoming, setLoadingUpcoming] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);

  const openPlanModal = (plan) => {
    setSelectedPlan(plan);
    setModalOpen(true);
  };

  const hoverCardSx = {
    transition: "all 0.2s ease",
    cursor: "pointer",
    "&:hover": {
      transform: "translateY(-3px)",
      boxShadow: "0 12px 24px rgba(0, 0, 0, 0.18)",
    },
  };

  const hoverActionCardSx = {
    transition: "all 0.2s ease",
    cursor: "pointer",
    "&:hover": {
      transform: "translateY(-2px)",
      boxShadow: "0 10px 18px rgba(0, 0, 0, 0.18)",
    },
  };

  /* -------- Fetch month plans -------- */
  useEffect(() => {
    if (userLoading) return;

    async function loadMonthPlans() {
      setLoadingMonth(true);
      try {
        const { start, end } = monthRangeStrings(month);

        // Default: all plans in month
        let qMonth = query(
          collection(db, "inspection_plans"),
          where("start", ">=", start),
          where("start", "<=", end),
          orderBy("start", "asc")
        );

        // Inspector view: assigned only
        if (isInspector && username) {
          qMonth = query(
            collection(db, "inspection_plans"),
            where("inspectors", "array-contains", username),
            where("start", ">=", start),
            where("start", "<=", end),
            orderBy("start", "asc")
          );
        }

        const snap = await getDocs(qMonth);
        setMonthPlans(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.error("Dashboard: loadMonthPlans failed", e);
        setMonthPlans([]);
      } finally {
        setLoadingMonth(false);
      }
    }

    loadMonthPlans();
  }, [month, userLoading, isInspector, username]);

  /* -------- Fetch upcoming plans (next 7 days) -------- */
  useEffect(() => {
    if (userLoading) return;

    async function loadUpcoming() {
      setLoadingUpcoming(true);
      try {
        // 1. Ensure statuses are up to date (mark overdue items)
        await inspectionService.checkOverdueStatus();

        const today = dayjs();
        const start = today.format("YYYY-MM-DD");
        const end = today.add(7, "day").format("YYYY-MM-DD");

        // Query 1: Upcoming plans (next 7 days)
        let qUp = query(
          collection(db, "inspection_plans"),
          where("start", ">=", start),
          where("start", "<=", end),
          orderBy("start", "asc"),
          limit(20)
        );

        // Query 2: Overdue plans (Important!)
        let qOverdue = query(
          collection(db, "inspection_plans"),
          where("status", "==", "OVERDUE"),
          orderBy("start", "asc"),
          limit(20)
        );

        if (isInspector && username) {
          qUp = query(
            collection(db, "inspection_plans"),
            where("inspectors", "array-contains", username),
            where("start", ">=", start),
            where("start", "<=", end),
            orderBy("start", "asc"),
            limit(20)
          );

          // For overdue, we need composite index: inspectors + status
          // Since we might not have that specific index, we can fetch all overdue for inspector via client-side filtering 
          // OR if we assume valid index exists. 
          // Safest fallback: Use the inspectors query we used for monthPlans but filter for overdue?
          // Actually, let's try the direct query. If index missing, we catch error.
          // Better: just query all OVERDUE and filter client side since OVERDUE count shouldn't be massive.
          qOverdue = query(
            collection(db, "inspection_plans"),
            where("status", "==", "OVERDUE"),
            // where("inspectors", "array-contains", username), // This would require new index: status + inspectors
            orderBy("start", "asc")
          );
        }

        const [snapUp, snapOver] = await Promise.all([getDocs(qUp), getDocs(qOverdue)]);

        const upcomingDocs = snapUp.docs.map((d) => ({ id: d.id, ...d.data() }));
        let overdueDocs = snapOver.docs.map((d) => ({ id: d.id, ...d.data() }));

        // Client-side filter for inspector overdue if we didn't use the specific query
        if (isInspector && username) {
          overdueDocs = overdueDocs.filter(d =>
            d.extendedProps?.inspector === username ||
            (Array.isArray(d.inspectors) && d.inspectors.includes(username))
          );
        }

        // Merge: Overdue first (most urgent), then Upcoming
        // Remove duplicates if any
        const combined = [...overdueDocs, ...upcomingDocs];
        const unique = Array.from(new Map(combined.map(item => [item.id, item])).values());

        // Sort by date (Overdue will likely be earlier)
        unique.sort((a, b) => (a.start || "").localeCompare(b.start || ""));

        setUpcomingPlans(unique.slice(0, 10)); // Show top 10 important tasks
      } catch (e) {
        console.error("Dashboard: loadUpcoming failed", e);
        setUpcomingPlans([]);
      } finally {
        setLoadingUpcoming(false);
      }
    }

    loadUpcoming();
  }, [userLoading, isInspector, username]);

  /* -------- Fetch monthly inspection reports (actual submitted work) -------- */
  useEffect(() => {
    if (userLoading) return;

    async function loadMonthReports() {
      setLoadingReports(true);
      try {
        const { start, end } = monthRangeStrings(month);

        let qReports;

        if (isInspector) {
          // Get current user's inspector name
          let inspectorName = username;
          if (!inspectorName && auth.currentUser) {
            inspectorName = auth.currentUser.displayName || auth.currentUser.email;
          }

          if (!inspectorName) {
            console.warn("Dashboard: No inspector name available");
            setMonthReports([]);
            setLoadingReports(false);
            return;
          }

          // Fetch reports by inspector name and date range
          qReports = query(
            collection(db, "inspections"),
            where("inspectorName", "==", inspectorName),
            where("inspectionDate", ">=", start),
            where("inspectionDate", "<=", end)
          );
        } else {
          // Admin/Supervisor: Fetch ALL reports for the month
          qReports = query(
            collection(db, "inspections"),
            where("inspectionDate", ">=", start),
            where("inspectionDate", "<=", end)
          );
        }

        const snap = await getDocs(qReports);
        const reports = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

        // Filter out drafts - only show submitted work
        const submittedReports = reports.filter(r => r.status !== "Draft");

        setMonthReports(submittedReports);
        console.log(`Dashboard: Loaded ${submittedReports.length} reports (${isInspector ? "Inspector" : "Admin/All"})`);
      } catch (e) {
        console.error("Dashboard: loadMonthReports failed", e);
        setMonthReports([]);
      } finally {
        setLoadingReports(false);
      }
    }

    loadMonthReports();
  }, [month, userLoading, username, isInspector]);

  /* -------- Top stats -------- */
  const stats = useMemo(() => {
    const total = monthReports.length;

    // Pending Review: reports with status "Submitted"
    const pendingReview = monthReports.filter((r) =>
      normStatus(r.status) === "SUBMITTED"
    ).length;

    // Completed: reports with status "Approved"
    const completed = monthReports.filter((r) =>
      normStatus(r.status) === "APPROVED"
    ).length;

    // Overdue: inspectionDate < today and not approved
    const todayStr = dayjs().format("YYYY-MM-DD");
    const overdue = monthReports.filter((r) => {
      const inspDate = r.inspectionDate;
      if (!inspDate) return false;
      const st = normStatus(r.status);
      if (st === "APPROVED") return false;
      return inspDate < todayStr;
    }).length;

    const completionRate = total === 0 ? 0 : Math.round((completed / total) * 100);

    return { total, pendingReview, completed, overdue, completionRate };
  }, [monthReports]);

  /* -------- Recent list -------- */
  const recentInspections = useMemo(() => {
    return [...monthReports]
      .sort((a, b) => {
        // Sort by inspectionDate descending (most recent first)
        const dateA = a.inspectionDate || "";
        const dateB = b.inspectionDate || "";
        return dateB.localeCompare(dateA);
      })
      .slice(0, 6);
  }, [monthReports]);

  /* -------- Calendar dots -------- */
  const dayBuckets = useMemo(() => {
    const map = new Map();
    for (const p of monthPlans) {
      const s = p.start;
      const e = p.end || p.start;
      if (!s) continue;
      for (const d of iterDatesInclusive(s, e)) {
        if (!map.has(d)) map.set(d, new Set());
        map.get(d).add(statusBucket(p.status));
      }
    }
    return map;
  }, [monthPlans]);

  const selectedDateStr = useMemo(
    () => dayjs(selectedDateObj).format("YYYY-MM-DD"),
    [selectedDateObj]
  );

  const selectedDayPlans = useMemo(() => {
    return monthPlans
      .filter((p) => {
        const s = p.start;
        const e = p.end || p.start;
        if (!s) return false;
        return isDateWithinRange(selectedDateStr, s, e);
      })
      .sort((a, b) => (a.start || "").localeCompare(b.start || ""));
  }, [monthPlans, selectedDateStr]);

  return (
    <Container size="xl" py="lg">
      {/* Header */}
      <Group justify="space-between" align="center" mb="xl">
        <div>
          <Title order={1}>Dashboard Overview</Title>
          <Text size="sm" c="dimmed">
            Welcome back! Here&apos;s what&apos;s happening with your inspections today.
          </Text>
        </div>

        <Group>
          <ThemeIcon size="lg" radius="md" variant="light" color="violet">
            <IconCalendar size={20} />
          </ThemeIcon>
          <div>
            <Text size="xs" c="dimmed">
              Today
            </Text>
            <Text size="sm" fw={700}>
              {dayjs().format("MMMM D, YYYY")}
            </Text>
          </div>
        </Group>
      </Group>

      {/* Stats */}
      <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="lg" mb="xl">
        {[
          {
            title: "TOTAL REPORTS",
            value: stats.total,
            icon: IconReportAnalytics,
            color: "blue",
            description: "This month",
          },
          {
            title: "PENDING REVIEW",
            value: stats.pendingReview,
            icon: IconClock,
            color: "yellow",
            description: "Waiting action",
          },
          {
            title: "COMPLETED",
            value: stats.completed,
            icon: IconCircleCheck,
            color: "green",
            description: `${stats.completionRate}% completion`,
          },
          {
            title: "OVERDUE",
            value: stats.overdue,
            icon: IconAlertCircle,
            color: "red",
            description: "Needs attention",
          },
        ].map((stat, idx) => (
          <Paper
            key={idx}
            shadow="sm"
            p="xl"
            radius="md"
            sx={hoverCardSx}
            style={{
              background: isDark
                ? undefined
                : "linear-gradient(135deg, #f1f1f1 0%, #e9e9e9 100%)",
            }}
          >
            <Group justify="space-between" mb="md">
              <ThemeIcon size={50} radius="md" variant="light" color={stat.color}>
                <stat.icon size={28} />
              </ThemeIcon>
              <Badge color={stat.color} size="sm" variant="light">
                <IconTrendingUp size={14} />
              </Badge>
            </Group>
            <Text size="xs" tt="uppercase" fw={800} c="dimmed" mb={6}>
              {stat.title}
            </Text>
            <Text size="32px" fw={800}>
              {stat.value}
            </Text>
            <Text size="xs" c="dimmed" mt="sm">
              {stat.description}
            </Text>
          </Paper>
        ))}
      </SimpleGrid>

      {/* Main grid */}
      <Grid gutter="lg">
        {/* LEFT */}
        <Grid.Col span={8}>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group justify="space-between" mb="md">
              <Title order={3}>
                {activeSection === "inspections" ? "Recent Inspections" : "Upcoming Tasks"}
              </Title>
              <SegmentedControl
                value={activeSection}
                onChange={setActiveSection}
                data={[
                  { label: "Inspections", value: "inspections" },
                  { label: "Tasks", value: "tasks" },
                ]}
              />
            </Group>

            <Box>
              {activeSection === "inspections" && (
                <Stack>
                  {recentInspections.length === 0 ? (
                    <Text c="dimmed" fs="italic">No recent inspections.</Text>
                  ) : (
                    recentInspections.map((r) => (
                      <ReportRow key={r.id} report={r} hoverCardSx={hoverCardSx} onClick={() => openPlanModal(r)} />
                    ))
                  )}
                </Stack>
              )}

              {activeSection === "tasks" && (
                <Stack>
                  <Text size="sm" c="dimmed" mb="sm">
                    Important upcoming and overdue tasks
                  </Text>
                  {upcomingPlans.length === 0 ? (
                    <Text c="dimmed" fs="italic">No upcoming or overdue tasks.</Text>
                  ) : (
                    upcomingPlans.map((p) => (
                      <PlanRow key={p.id} plan={p} hoverCardSx={hoverCardSx} onClick={() => openPlanModal(p)} />
                    ))
                  )}
                </Stack>
              )}
            </Box>
          </Card>
        </Grid.Col>

        {/* RIGHT */}
        <Grid.Col span={4}>
          {/* Calendar & Completion Toggle */}
          <Card shadow="sm" padding="lg" radius="md" withBorder mb="lg">
            <Group justify="space-between" mb="md">
              <Title order={3}>
                {rightActiveSection === "completion" ? "Completion Rate" : "Calendar"}
              </Title>
              <SegmentedControl
                size="xs"
                value={rightActiveSection}
                onChange={setRightActiveSection}
                data={[
                  { label: <IconCircleCheck size={16} />, value: "completion" },
                  { label: <IconCalendar size={16} />, value: "calendar" },
                ]}
              />
            </Group>

            {rightActiveSection === "calendar" ? (
              <>
                <Box style={{ display: "flex", justifyContent: "center" }}>
                  <Box style={{ width: "100%", maxWidth: 360 }}>
                    <Calendar
                      value={selectedDateObj}
                      onChange={(v) => setSelectedDateObj(v || new Date())}
                      month={month}
                      onMonthChange={setMonth}
                      renderDay={(date) => {
                        const day = dayjs(date).date();
                        const dateKey = dayjs(date).format("YYYY-MM-DD");
                        const buckets = dayBuckets.get(dateKey);
                        const order = ["red", "orange", "cyan", "green", "blue", "gray"];
                        return (
                          <Box style={{ width: "100%" }} key={dateKey}>
                            <div style={{ textAlign: "center" }}>{day}</div>
                            {buckets && buckets.size > 0 && (
                              <Group justify="center" gap={3} mt={2} style={{ pointerEvents: "none" }}>
                                {order
                                  .filter((b) => buckets.has(b))
                                  .slice(0, 3)
                                  .map((b) => (
                                    <Dot key={b} bucket={b} />
                                  ))}
                              </Group>
                            )}
                          </Box>
                        );
                      }}
                    />
                  </Box>
                </Box>
                <Divider my="md" />
                <Text size="sm" fw={700}>
                  Selected Day: {dayjs(selectedDateObj).format("MMM D, YYYY")}
                </Text>
                <Text size="sm" c="dimmed">
                  {selectedDayPlans.length === 0
                    ? `No inspections on ${dayjs(selectedDateObj).format("MMM D")}.`
                    : `${selectedDayPlans.length} inspection(s) on this day.`}
                </Text>
              </>
            ) : (
              <Center py="xl">
                <Stack align="center">
                  <RingProgress
                    size={180}
                    thickness={16}
                    roundCaps
                    sections={[{ value: stats.completionRate, color: "green" }]}
                    label={
                      <Text c="blue" fw={700} ta="center" size="xl">
                        {stats.completionRate}%
                        <Text size="xs" c="dimmed" fw={500}>Complete</Text>
                      </Text>
                    }
                  />
                  <Group>
                    <Group gap={6}>
                      <Box w={8} h={8} style={{ borderRadius: 999, background: 'var(--mantine-color-green-6)' }} />
                      <Text size="xs">Completed</Text>
                      <Text size="xs" fw={700}>{stats.completed}</Text>
                    </Group>
                    <Group gap={6}>
                      <Box w={8} h={8} style={{ borderRadius: 999, background: 'var(--mantine-color-orange-6)' }} />
                      <Text size="xs">Pending</Text>
                      <Text size="xs" fw={700}>{stats.total - stats.completed}</Text>
                    </Group>
                  </Group>
                </Stack>
              </Center>
            )}
          </Card>

          {/* Quick actions */}
          <Stack>
            <Card
              padding="lg"
              radius="md"
              withBorder
              sx={hoverActionCardSx}
              style={{
                background: "linear-gradient(135deg, #6d5bd0 0%, #5a4ac0 100%)",
                color: "white",
              }}
              onClick={() => navigate("/inspection-plan")}
            >
              <Group>
                <ThemeIcon color="white" variant="light">
                  <IconPlus size={18} />
                </ThemeIcon>
                <div>
                  <Text fw={800}>New Inspection</Text>
                  <Text size="sm" style={{ opacity: 0.9 }}>
                    Schedule equipment inspection
                  </Text>
                </div>
              </Group>
            </Card>

            <Card
              padding="lg"
              radius="md"
              withBorder
              sx={hoverActionCardSx}
              style={{
                background: "linear-gradient(135deg, #ff6aa2 0%, #ff4d7d 100%)",
                color: "white",
              }}
              onClick={() => navigate("/inspection-form")}
            >
              <Group>
                <ThemeIcon color="white" variant="light">
                  <IconFileText size={18} />
                </ThemeIcon>
                <div>
                  <Text fw={800}>Generate Report</Text>
                  <Text size="sm" style={{ opacity: 0.9 }}>
                    Create inspection report
                  </Text>
                </div>
              </Group>
            </Card>

            <Card
              padding="lg"
              radius="md"
              withBorder
              sx={hoverActionCardSx}
              style={{
                background: "linear-gradient(135deg, #4b4b7a 0%, #3b3b66 100%)",
                color: "white",
              }}
              onClick={() => navigate("/document-upload")}
            >
              <Group>
                <ThemeIcon color="white" variant="light">
                  <IconUpload size={18} />
                </ThemeIcon>
                <div>
                  <Text fw={800}>Quick Upload</Text>
                  <Text size="sm" style={{ opacity: 0.9 }}>
                    Upload document report
                  </Text>
                </div>
              </Group>
            </Card>
          </Stack>
        </Grid.Col>
      </Grid>

      {/* Modal */}
      <Modal opened={modalOpen} onClose={() => setModalOpen(false)} title="Inspection Details" radius="lg">
        {selectedPlan ? (
          <Stack gap="sm">
            <Text fw={900}>{selectedPlan.title || "Untitled Inspection"}</Text>

            <Text size="sm" c="dimmed">
              Inspector:{" "}
              {selectedPlan.extendedProps?.inspector ||
                (Array.isArray(selectedPlan.inspectors) ? selectedPlan.inspectors.join(", ") : "—")}
            </Text>

            <Text size="sm" c="dimmed">
              Scheduled: {selectedPlan.start || "—"} → {selectedPlan.end || selectedPlan.start || "—"}
            </Text>

            <Text size="sm" c="dimmed">
              Equipment: {selectedPlan.extendedProps?.equipmentId || "—"}
            </Text>

            <Text size="sm">{selectedPlan.extendedProps?.description || "No description provided"}</Text>

            <Divider />

            <Group grow>
              <Button variant="light" onClick={() => navigate("/inspection-plan")}>
                Open Schedule
              </Button>
              <Button onClick={() => navigate("/inspection-plan")}>View Details</Button>
            </Group>
          </Stack>
        ) : (
          <Text>No plan selected.</Text>
        )}
      </Modal>
    </Container>
  );
}
