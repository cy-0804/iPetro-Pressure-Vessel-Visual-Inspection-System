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
  IconX,
  IconTrash,
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

function ReportRow({ report, onClick, hoverCardSx, onDismiss }) {
  const title = report.reportNo || report.equipmentId || "Untitled Report";
  const equipment = report.equipmentId || "—";
  const description = report.equipmentDescription || "";
  const dateText = report.inspectionDate ? dayjs(report.inspectionDate).format("YYYY-MM-DD") : "—";

  return (
    <Paper p="md" radius="md" sx={hoverCardSx} style={{ cursor: "pointer", position: "relative" }} onClick={onClick}>
      {/* Dismiss Button */}
      {onDismiss && (
        <Box
          onClick={(e) => onDismiss(e, report)}
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            zIndex: 10,
            opacity: 0.6,
            cursor: "pointer"
          }}
          sx={{ "&:hover": { opacity: 1, color: 'red' } }}
        >
          <IconX size={16} />
        </Box>
      )}

      <Group justify="space-between" align="flex-start" pr={onDismiss ? 24 : 0}>
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


import { userService } from "../services/userService";
import { getEquipments } from "../services/equipmentService";
import InspectorEventDetails from "../components/calendar/InspectorEventDetails";

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

  // Simplified Preview Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);

  // Full Details Modal
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [inspectorsList, setInspectorsList] = useState([]);
  const [equipmentList, setEquipmentList] = useState([]);

  const openPlanModal = (plan) => {
    setSelectedPlan(plan);
    setModalOpen(true);
  };

  const handleOpenDetails = () => {
    setModalOpen(false); // Close preview
    setDetailsModalOpen(true); // Open full details
  };

  /* -------- Fetch Helpers for Details Modal -------- */
  useEffect(() => {
    async function loadAuxData() {
      try {
        const eqs = await getEquipments();
        setEquipmentList(eqs);

        const users = await userService.getInspectors();
        const inspectorUsers = users.filter(u => u.role === 'inspector');
        setInspectorsList(inspectorUsers);
      } catch (e) {
        console.error("Dashboard: Failed to load aux data", e);
      }
    }
    loadAuxData();
  }, []);

  const handleUpdateEvent = async (updatedEvent) => {
    // Update local state to reflect changes immediately
    const updater = (prev) => prev.map(p => p.id === updatedEvent.id ? { ...p, ...updatedEvent } : p);
    setMonthPlans(updater);
    setUpcomingPlans(updater);
    setSelectedPlan(updatedEvent); // Update selected plan if needed
  };

  const handleDeleteEvent = async (id) => {
    // In dashboard we might not support delete directly or just close
    setDetailsModalOpen(false);
    setMonthPlans(prev => prev.filter(p => p.id !== id));
    setUpcomingPlans(prev => prev.filter(p => p.id !== id));
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

        // Fetch all plans in the date range first (avoids complex index requirements)
        // We will filter for the specific inspector client-side
        const qMonth = query(
          collection(db, "inspection_plans"),
          where("start", ">=", start),
          where("start", "<=", end),
          orderBy("start", "asc")
        );

        const snap = await getDocs(qMonth);
        let plans = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

        // Inspector view: assigned only (Client-side filter)
        if (isInspector && username) {
          plans = plans.filter(p => {
            // Check root 'inspectors' array (new format)
            if (p.inspectors && Array.isArray(p.inspectors) && p.inspectors.includes(username)) return true;

            // Check root 'inspector' string (new format)
            if (p.inspector === username) return true;

            // Check Legacy extendedProps
            if (p.extendedProps?.inspectors && p.extendedProps.inspectors.includes(username)) return true;
            if (p.extendedProps?.inspector === username) return true;

            return false;
          });
        }

        setMonthPlans(plans);
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

        // Query 1: Upcoming plans (next 7 days) - Fetch ALL first
        let qUp = query(
          collection(db, "inspection_plans"),
          where("start", ">=", start),
          where("start", "<=", end),
          orderBy("start", "asc")
        );

        // Query 2: Overdue plans (Important!) - Fetch ALL first
        let qOverdue = query(
          collection(db, "inspection_plans"),
          where("status", "==", "OVERDUE"),
          orderBy("start", "asc")
        );

        // Note: usage of limit() removed temporarily to ensure we get enough docs to filter down 
        // if the volume is low. If volume is high, we might want to keep limit but increase it.
        // For this workshop, fetching all in range is safer for visibility.

        const [snapUp, snapOver] = await Promise.all([getDocs(qUp), getDocs(qOverdue)]);

        let upcomingDocs = snapUp.docs.map((d) => ({ id: d.id, ...d.data() }));
        let overdueDocs = snapOver.docs.map((d) => ({ id: d.id, ...d.data() }));

        // Client-side filter for inspector
        if (isInspector && username) {
          const filterFn = (d) => {
            // Check root 'inspectors' array (new format)
            if (d.inspectors && Array.isArray(d.inspectors) && d.inspectors.includes(username)) return true;
            // Check root 'inspector' string (new format)
            if (d.inspector === username) return true;
            // Check Legacy extendedProps
            if (d.extendedProps?.inspectors && d.extendedProps.inspectors.includes(username)) return true;
            if (d.extendedProps?.inspector === username) return true;
            return false;
          };

          upcomingDocs = upcomingDocs.filter(filterFn);
          overdueDocs = overdueDocs.filter(filterFn);
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
          // Fallback if needed
          if (!inspectorName && userData?.email) inspectorName = userData.email;

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
  }, [month, userLoading, username, isInspector, userData]);

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

  /* -------- Dismiss/Clear Logic -------- */
  const [dismissedReports, setDismissedReports] = useState(() => {
    try {
      const saved = localStorage.getItem("dismissedReports");
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem("dismissedReports", JSON.stringify(dismissedReports));
  }, [dismissedReports]);

  const handleDismiss = (e, report) => {
    e.stopPropagation();
    const status = normStatus(report.status);

    // Warning condition: In Progress, Draft, Overdue, or Submitted (Pending Review)
    // Safe condition: Approved, Completed, Video Uploaded, Rejected
    const isSafe = ["APPROVED", "COMPLETED", "VIDEO_UPLOADED", "REJECTED"].includes(status);

    if (!isSafe) {
      if (!window.confirm("This inspection is pending review or incomplete. Are you sure you want to remove it from the dashboard?")) {
        return;
      }
    }
    setDismissedReports(prev => [...prev, report.id]);
  };

  /* -------- Recent list -------- */
  const recentInspections = useMemo(() => {
    return [...monthReports]
      .filter(r => !dismissedReports.includes(r.id))
      .sort((a, b) => {
        // Sort by inspectionDate descending (most recent first)
        const dateA = a.inspectionDate || "";
        const dateB = b.inspectionDate || "";
        return dateB.localeCompare(dateA);
      })
      .slice(0, 6);
  }, [monthReports, dismissedReports]);

  const handleClearAll = () => {
    const visibleReports = recentInspections;
    if (visibleReports.length === 0) return;

    const hasUnsafe = visibleReports.some(r => {
      const status = normStatus(r.status);
      return !["APPROVED", "COMPLETED", "VIDEO_UPLOADED", "REJECTED"].includes(status);
    });

    if (hasUnsafe) {
      if (!window.confirm("Some items in this list are pending review or incomplete. Are you sure you want to clear the entire list?")) {
        return;
      }
    }

    // Dismiss all currently visible
    const newIds = visibleReports.map(r => r.id);
    setDismissedReports(prev => [...prev, ...newIds]);
  };

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

  /* -------- Drill Down Logic -------- */
  const [activeStatView, setActiveStatView] = useState(null); // null | 'total' | 'pending' | 'completed' | 'overdue'

  const handleStatClick = (view) => {
    setActiveStatView(view);
  };

  const drillDownData = useMemo(() => {
    if (!activeStatView) return { title: "", data: [], type: "report" };

    switch (activeStatView) {
      case 'total':
        return {
          title: "Total Reports (This Month)",
          data: monthReports,
          type: "report"
        };
      case 'pending':
        return {
          title: "Pending Review",
          data: monthReports.filter(r => normStatus(r.status) === "SUBMITTED"),
          type: "report"
        };
      case 'completed':
        return {
          title: "Completed Reports",
          data: monthReports.filter(r => normStatus(r.status) === "APPROVED"),
          type: "report"
        };
      case 'overdue':
        // Reuse the logic from stats calculation
        const todayStr = dayjs().format("YYYY-MM-DD");
        const overdueReports = monthReports.filter((r) => {
          const inspDate = r.inspectionDate;
          if (!inspDate) return false;
          const st = normStatus(r.status);
          if (st === "APPROVED") return false;
          return inspDate < todayStr;
        });
        return {
          title: "Overdue Reports",
          data: overdueReports,
          type: "report"
        };
      default:
        return { title: "", data: [], type: "report" };
    }
  }, [activeStatView, monthReports]);

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
            key: "total",
            title: "TOTAL REPORTS",
            value: stats.total,
            icon: IconReportAnalytics,
            color: "blue",
            description: "This month",
          },
          {
            key: "pending",
            title: "PENDING REVIEW",
            value: stats.pendingReview,
            icon: IconClock,
            color: "yellow",
            description: "Waiting action",
          },
          {
            key: "completed",
            title: "COMPLETED",
            value: stats.completed,
            icon: IconCircleCheck,
            color: "green",
            description: `${stats.completionRate}% completion`,
          },
          {
            key: "overdue",
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
            onClick={() => handleStatClick(stat.key)}
            style={{
              cursor: 'pointer',
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

      {/* Drill Down View or Main Grid */}
      {activeStatView ? (
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Group mb="md">
            <Button variant="subtle" onClick={() => setActiveStatView(null)}>
              ← Back to Dashboard
            </Button>
          </Group>
          <Title order={3} mb="md">{drillDownData.title}</Title>

          <Stack>
            {drillDownData.data.length === 0 ? (
              <Text c="dimmed" fs="italic">No items found.</Text>
            ) : (
              drillDownData.data.map((item) => (
                <ReportRow
                  key={item.id}
                  report={item}
                  hoverCardSx={hoverCardSx}
                  onClick={() => openPlanModal(item)} // Re-using modal logic for now, though reports might need different modal if they aren't plans
                />
              ))
            )}
          </Stack>
        </Card>
      ) : (
        <Grid gutter="lg">
          {/* LEFT */}
          <Grid.Col span={8}>
            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Group justify="space-between" mb="md">
                <Group>
                  <Title order={3}>
                    {activeSection === "inspections" ? "Recent Inspections" : "Upcoming Tasks"}
                  </Title>
                </Group>

                <Group>
                  {activeSection === "inspections" && recentInspections.length > 0 && (
                    <Button
                      variant="subtle"
                      color="red"
                      size="xs"
                      leftSection={<IconTrash size={14} />}
                      onClick={handleClearAll}
                    >
                      Clear All
                    </Button>
                  )}
                  <SegmentedControl
                    value={activeSection}
                    onChange={setActiveSection}
                    data={[
                      { label: "Inspections", value: "inspections" },
                      { label: "Tasks", value: "tasks" },
                    ]}
                  />
                </Group>
              </Group>

              <Box>
                {activeSection === "inspections" && (
                  <Stack>
                    {recentInspections.length === 0 ? (
                      <Text c="dimmed" fs="italic">No recent inspections.</Text>
                    ) : (
                      recentInspections.map((r) => (
                        <ReportRow
                          key={r.id}
                          report={r}
                          hoverCardSx={hoverCardSx}
                          onClick={() => openPlanModal(r)}
                          onDismiss={handleDismiss}
                        />
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
                  {/* List plans for selected day in calendar view */}
                  {selectedDayPlans.length > 0 && (
                    <Stack mt="sm" gap="xs">
                      {selectedDayPlans.map(p => (
                        <Paper key={p.id} withBorder p="xs" sx={{ cursor: 'pointer' }} onClick={() => openPlanModal(p)}>
                          <Group justify="space-between">
                            <Text size="xs" fw={700}>{p.title}</Text>
                            <Badge size="xs" color={getStatusColor(p.status)}>{normStatus(p.status)}</Badge>
                          </Group>
                        </Paper>
                      ))}
                    </Stack>
                  )}
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
      )}

      {/* Simplified Preview Modal */}
      <Modal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Inspection Details"
        centered
      >
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
              <Button onClick={handleOpenDetails}>View Details</Button>
            </Group>
          </Stack>
        ) : (
          <Text>No plan selected.</Text>
        )}
      </Modal>

      {/* Full Details Modal */}
      <Modal
        opened={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        withCloseButton={false}
        centered
        title={null}
        padding={0}
        size="xl"
      >
        {selectedPlan && (
          <InspectorEventDetails
            event={selectedPlan}
            onUpdate={handleUpdateEvent}
            onDelete={handleDeleteEvent}
            onClose={() => setDetailsModalOpen(false)}
            viewMode={isInspector ? 'inspector' : 'supervisor'}
            inspectors={inspectorsList}
            equipmentList={equipmentList}
            currentUser={username}
            userProfile={userData}
          />
        )}
      </Modal>

    </Container>
  );
}
