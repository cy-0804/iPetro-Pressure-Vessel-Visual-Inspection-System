// dashboard.jsx
import { useEffect, useMemo, useState, useRef } from "react";
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
  Select,
  SegmentedControl,
  RingProgress,
  useMantineColorScheme,
  Textarea,
  TextInput,
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
  IconSearch,
  IconFilter,
  IconUser,
  IconUsers,
  IconAdjustments,
  IconSortDescending,
  IconSortAscending,
} from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, query, where, orderBy, limit, onSnapshot, doc, getDoc } from "firebase/firestore";
import { updateDoc, serverTimestamp } from "firebase/firestore";
import { notifications } from "@mantine/notifications";
import { db, auth } from "../firebase";
import { useCurrentUser } from "../hooks/useCurrentUser";
import dayjs from "dayjs";
import { Calendar } from "@mantine/dates";
import './Dashboard.css'
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/swiper-bundle.css";
import { inspectionService } from "../services/inspectionService";
import { InspectionReportView } from "../components/InspectionReportView";

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

const formatMaybeTimestamp = (value, fmt = "YYYY-MM-DD HH:mm") => {
  if (!value) return null;
  try {
    if (value && typeof value.toDate === "function") {
      return dayjs(value.toDate()).format(fmt);
    }
    const s = String(value);
    // if date-only
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return dayjs(s).format(fmt.split(' ')[0]);
    return dayjs(s).format(fmt);
  } catch (e) {
    return null;
  }
};

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

function PlanRow({ plan, onClick, hoverCardSx, now }) {
  const title = plan.title || "Untitled Inspection";
  const inspector =
    plan?.extendedProps?.inspector ||
    (Array.isArray(plan.inspectors) ? plan.inspectors.join(", ") : "—");
  const dateText = plan.start ? dayjs(plan.start).format("YYYY-MM-DD") : "—";

  // Time remaining display if start date exists
  const computeTimeRemaining = (due) => {
    if (!due) return null;
    const nowLocal = now || dayjs();

    // Normalize due into a dayjs object. Support Firestore Timestamp, ISO string, or YYYY-MM-DD
    let target;
    try {
      if (due && typeof due.toDate === "function") {
        // Firestore Timestamp
        target = dayjs(due.toDate());
      } else {
        const s = String(due);
        if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
          // date-only -> treat as end of day
          target = dayjs(s).endOf("day");
        } else {
          target = dayjs(s);
        }
      }
    } catch (e) {
      return null;
    }

    if (!target.isValid()) return null;

    const diffMs = target.valueOf() - nowLocal.valueOf();
    const abs = Math.abs(diffMs);

    const days = Math.floor(abs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((abs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((abs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffMs >= 0) {
      // Not yet due
      if (days > 0) {
        return `${days} day${days === 1 ? "" : "s"} ${hours} hour${hours === 1 ? "" : "s"} remaining`;
      }
      // Less than a day, show hours and minutes
      return `${hours} hour${hours === 1 ? "" : "s"} ${minutes} min${minutes === 1 ? "" : "s"} remaining`;
    } else {
      // Overdue
      if (days > 0) {
        return `Inspection is overdue by: ${days} day${days === 1 ? "" : "s"} ${hours} hour${hours === 1 ? "" : "s"}`;
      }
      return `Inspection is overdue by: ${hours} hour${hours === 1 ? "" : "s"} ${minutes} min${minutes === 1 ? "" : "s"}`;
    }
  };

  // Prefer an explicit dueDate field if present, otherwise use end, then start
  const dueField = plan.dueDate || plan.end || plan.start;
  const timeRemaining = computeTimeRemaining(dueField);

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
            • {dateText} {timeRemaining ? ` • ${timeRemaining}` : ''}
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
  const submittedText = formatMaybeTimestamp(report.submittedAt, "YYYY-MM-DD HH:mm");

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
          <Group position="apart" align="flex-start">
            <Text fw={700} lineClamp={1}>
              {title}
            </Text>
            <Badge color={report.planId ? "blue" : "gray"} variant="light" size="sm">
              {report.planId ? `Scheduled: ${report._planTitle || report.planId}` : "Manual"}
            </Badge>
          </Group>
          <Text size="sm" c="dimmed">
            Equipment: {equipment}
          </Text>
          {description && (
            <Text size="xs" c="dimmed" lineClamp={1}>
              {description}
            </Text>
          )}
          <Text size="xs" c="dimmed">
            • {dateText}{submittedText ? ` • Submitted: ${submittedText}` : ''}
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

  // Now timer to support live countdowns (updates every minute)
  const [now, setNow] = useState(dayjs());
  useEffect(() => {
    const t = setInterval(() => setNow(dayjs()), 60 * 1000);
    return () => clearInterval(t);
  }, []);

  // Inspection Reports (actual submitted work)
  const [monthReports, setMonthReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(true);

  // Cache of plan titles for linked reports: { [planId]: title }
  const [planTitles, setPlanTitles] = useState({});

  const [loadingMonth, setLoadingMonth] = useState(true);
  const [loadingUpcoming, setLoadingUpcoming] = useState(true);

  // Simplified Preview Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);

  // Clear-All confirmation modal
  const [clearModalOpen, setClearModalOpen] = useState(false);
  const [clearCandidateIds, setClearCandidateIds] = useState([]);

  // Clear History modal
  const [clearHistoryModalOpen, setClearHistoryModalOpen] = useState(false);

  // Confirmation modals for clear actions
  const [clearCompletedConfirmOpen, setClearCompletedConfirmOpen] = useState(false);
  const [clearAllConfirmOpen, setClearAllConfirmOpen] = useState(false);
  const [completedReportsCount, setCompletedReportsCount] = useState(0);

  // Full Details Modal
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [inspectorsList, setInspectorsList] = useState([]);
  const [equipmentList, setEquipmentList] = useState([]);

  const openPlanModal = async (plan) => {
    // Normalize plan vs report so the modal can render correctly
    try {
      if (plan && (plan.reportNo || plan.inspectionDate || plan.inspectorId)) {
        // It's a report document
        const rp = { ...plan };
        // mark as report for rendering logic
        rp._isReport = true;
        // Resolve inspector name if missing
        try {
          if (!rp.inspectorName && rp.inspectorId) {
            const u = await getDoc(doc(db, 'users', rp.inspectorId));
            if (u.exists()) {
              const ud = u.data();
              rp.inspectorName = ud.username || (ud.firstName && ud.lastName ? `${ud.firstName} ${ud.lastName}` : ud.fullName) || rp.inspectorName;
            }
          }
        } catch (err) {
          // ignore inspector name resolution failure
        }

        // Resolve linked plan title/start/end if planId present
        try {
          if (rp.planId && !rp._planTitle) {
            const p = await getDoc(doc(db, 'inspection_plans', rp.planId));
            if (p.exists()) {
              const pd = p.data();
              rp._planTitle = pd.title || pd.name || pd.extendedProps?.title || pd.extendedProps?.inspectionTitle || pd.title;
              rp._planStart = pd.start || pd.extendedProps?.start || pd.start;
              rp._planEnd = pd.end || pd.extendedProps?.end || pd.end;
            }
          }
        } catch (err) {
          // ignore
        }

        setSelectedPlan(rp);
      } else {
        // It's a plan/event; use as-is
        setSelectedPlan(plan);
      }
    } catch (e) {
      console.error('openPlanModal normalization failed', e);
      setSelectedPlan(plan);
    }

    setModalOpen(true);
  };

  const handleOpenDetails = () => {
    setModalOpen(false); // Close preview
    setDetailsModalOpen(true); // Open full details
  };

  // Review modal (for admin)
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewReport, setReviewReport] = useState(null);
  const [processingReview, setProcessingReview] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [previewScale, setPreviewScale] = useState(0.68);
  const printSectionRef = useRef(null);

  const openReview = async (reportOrPlan) => {
    try {
      let r = reportOrPlan;
      if (!r) return;

      // If passed a plan (no reportNo), try to find a linked report by plan id
      if (!r.reportNo) {
        const snaps = await getDocs(query(collection(db, 'inspections'), where('planId', '==', r.id)));
        if (!snaps.empty) {
          r = { id: snaps.docs[0].id, ...snaps.docs[0].data() };
        } else {
          notifications.show({ title: 'No report', message: 'No linked report found for this plan', color: 'yellow' });
          return;
        }
      } else {
        // it's a report object; ensure we have full doc data
        if (r.id && (!r.status || !r.photoReport)) {
          const d = await getDoc(doc(db, 'inspections', r.id));
          if (d.exists()) r = { id: d.id, ...d.data() };
        }
      }

      // Track viewed report in localStorage for Recent Inspections
      if (r.id) {
        try {
          const viewedReports = JSON.parse(localStorage.getItem('viewedReports') || '[]');
          // Add to beginning, remove duplicates, keep last 5
          const updated = [r.id, ...viewedReports.filter(id => id !== r.id)].slice(0, 5);
          localStorage.setItem('viewedReports', JSON.stringify(updated));
          setViewedReportIds(updated); // Update state immediately to trigger re-render/fetch

          // Also remove from dismissedReports if present, so it reappears
          if (dismissedReports.includes(r.id)) {
            setDismissedReports(prev => prev.filter(id => id !== r.id));
          }
        } catch (e) {
          console.error('Failed to track viewed report', e);
        }
      }

      setReviewReport(r);
      setReviewModalOpen(true);
    } catch (e) {
      console.error('openReview failed', e);
      notifications.show({ title: 'Error', message: 'Failed to open review', color: 'red' });
    }
  };

  const handleRejectReview = async (reason) => {
    if (!reviewReport) return;
    if (!reason || !reason.trim()) return notifications.show({ title: 'Required', message: 'Please provide a reason', color: 'red' });

    setProcessingReview(true);
    try {
      const user = auth.currentUser;
      let supervisorName = user?.displayName || user?.email || 'Supervisor';

      await updateDoc(doc(db, 'inspections', reviewReport.id), {
        status: 'Rejected',
        rejectionReason: reason,
        reviewedBy: supervisorName,
        reviewedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      if (reviewReport.planId) {
        try { await inspectionService.updateInspectionStatus(reviewReport.planId, 'Rejected', 'supervisor', supervisorName, false); } catch (e) { console.error(e); }
      }

      // Optimistic local updates: update report status locally and remove plan from upcoming lists
      setMonthReports(prev => prev.map(r => r.id === reviewReport.id ? { ...r, status: 'Rejected', rejectionReason: reason, reviewedBy: supervisorName } : r));
      if (reviewReport.planId) {
        setUpcomingPlans(prev => prev.filter(p => p.id !== reviewReport.planId));
        setMonthPlans(prev => prev.map(p => p.id === reviewReport.planId ? { ...p, status: 'Rejected' } : p));
      }

      notifications.show({ title: 'Rejected', message: 'Report rejected and returned', color: 'orange' });
      setReviewModalOpen(false);
      setReviewReport(null);
      setRejectModalOpen(false);
      setRejectReason('');
    } catch (e) {
      console.error(e);
      notifications.show({ title: 'Error', message: 'Failed to reject report', color: 'red' });
    } finally {
      setProcessingReview(false);
    }
  };

  const handleApproveReview = async () => {
    if (!reviewReport) return;
    if (!window.confirm('Approve this report?')) return;
    setProcessingReview(true);
    try {
      const user = auth.currentUser;
      let supervisorName = user?.displayName || user?.email || 'Supervisor';

      await updateDoc(doc(db, 'inspections', reviewReport.id), {
        status: 'Approved',
        reviewedBy: supervisorName,
        reviewedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      if (reviewReport.planId) {
        try { await inspectionService.updateInspectionStatus(reviewReport.planId, 'Approved', 'supervisor', supervisorName, false); } catch (e) { console.error(e); }
      }

      // Optimistic local updates
      setMonthReports(prev => prev.map(r => r.id === reviewReport.id ? { ...r, status: 'Approved', reviewedBy: supervisorName } : r));
      if (reviewReport.planId) {
        setUpcomingPlans(prev => prev.filter(p => p.id !== reviewReport.planId));
        setMonthPlans(prev => prev.map(p => p.id === reviewReport.planId ? { ...p, status: 'Approved' } : p));
      }

      notifications.show({ title: 'Approved', message: 'Report approved', color: 'green' });
      setReviewModalOpen(false);
      setReviewReport(null);
    } catch (e) {
      console.error(e);
      notifications.show({ title: 'Error', message: 'Failed to approve', color: 'red' });
    } finally {
      setProcessingReview(false);
    }
  };

  // Print helper: temporarily remove scaling for print and cleanup after
  const handlePrint = () => {
    try {
      const section = printSectionRef.current;
      if (!section) {
        window.print();
        return;
      }

      // Clone the section (deep) so we don't disturb React-managed nodes
      const clone = section.cloneNode(true);
      // Remove transforms to ensure full-size rendering
      clone.style.transform = 'none';
      clone.style.transformOrigin = 'top center';

      // Create a wrapper for the cloned content
      const printWrapper = document.createElement('div');
      printWrapper.className = 'print-wrapper-temp';
      printWrapper.appendChild(clone);

      // Inject temporary CSS for print
      const styleId = 'dashboard-temp-print-style';
      let styleTag = document.getElementById(styleId);
      if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = styleId;
        document.head.appendChild(styleTag);
      }

      styleTag.innerHTML = `
        @media print {
          body > *:not(.print-wrapper-temp) { 
            display: none !important; 
          }
          .print-wrapper-temp {
            display: block !important;
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
          }
          .print-wrapper-temp * {
            transform: none !important;
          }
        }
      `;

      // Append to body
      document.body.appendChild(printWrapper);

      const cleanup = () => {
        try {
          if (printWrapper && printWrapper.parentNode) {
            printWrapper.parentNode.removeChild(printWrapper);
          }
        } catch (e) { }
        try {
          const s = document.getElementById(styleId);
          if (s) s.parentNode.removeChild(s);
        } catch (e) { }
        try {
          window.removeEventListener('afterprint', cleanup);
        } catch (e) { }
      };

      window.addEventListener('afterprint', cleanup);

      // Give browser time to render, then print
      setTimeout(() => {
        try {
          window.print();
          // Fallback cleanup
          setTimeout(cleanup, 3000);
        } catch (e) {
          console.error('print failed', e);
          cleanup();
        }
      }, 200);
    } catch (e) {
      console.error('print failed', e);
      window.print();
    }
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
    setLoadingMonth(true);
    const { start, end } = monthRangeStrings(month);

    const qMonth = query(
      collection(db, "inspection_plans"),
      where("start", ">=", start),
      where("start", "<=", end),
      orderBy("start", "asc")
    );

    // Realtime subscription for month plans
    const unsubscribe = onSnapshot(
      qMonth,
      async (snap) => {
        try {
          let plans = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

          if (isInspector && username) {
            plans = plans.filter((p) => {
              if (p.inspectors && Array.isArray(p.inspectors) && p.inspectors.includes(username)) return true;
              if (p.inspector === username) return true;
              if (p.extendedProps?.inspectors && p.extendedProps.inspectors.includes(username)) return true;
              if (p.extendedProps?.inspector === username) return true;
              return false;
            });
          }

          // Filter out plans with approved/rejected/completed reports
          // So they disappear from calendar once done
          const filteredPlans = [];
          await Promise.all(plans.map(async (p) => {
            try {
              const snaps = await getDocs(query(collection(db, 'inspections'), where('planId', '==', p.id)));
              const reports = snaps.docs.map(d => ({ id: d.id, ...d.data() }));
              // Check if any report is approved/rejected/completed
              const hasCompletedReport = reports.some(r => {
                const s = normStatus(r.status);
                return s === 'APPROVED' || s === 'REJECTED' || s === 'COMPLETED';
              });
              // Only include plan if it doesn't have a completed report
              if (!hasCompletedReport) {
                filteredPlans.push(p);
              }
            } catch (e) {
              // On error, keep the plan visible
              filteredPlans.push(p);
            }
          }));

          setMonthPlans(filteredPlans);
        } catch (err) {
          console.error("Dashboard: month plans snapshot processing failed", err);
          setMonthPlans([]);
        } finally {
          setLoadingMonth(false);
        }
      },
      (err) => {
        console.error("Dashboard: month plans onSnapshot error", err);
        setLoadingMonth(false);
      }
    );

    return () => unsubscribe();
  }, [month, userLoading, isInspector, username]);

  /* -------- Fetch upcoming plans (next 7 days) -------- */
  useEffect(() => {
    if (userLoading) return;
    // refs to hold latest snapshots between handlers
    const upcomingLatestRef = { current: [] };
    const overdueLatestRef = { current: [] };
    let unsubUp = () => { };
    let unsubOver = () => { };

    async function setupSubscriptions() {
      setLoadingUpcoming(true);
      try {
        await inspectionService.checkOverdueStatus();

        const today = dayjs();
        const start = today.format("YYYY-MM-DD");
        const end = today.add(7, "day").format("YYYY-MM-DD");

        const qUp = query(
          collection(db, "inspection_plans"),
          where("start", ">=", start),
          where("start", "<=", end),
          orderBy("start", "asc")
        );

        const qOverdue = query(
          collection(db, "inspection_plans"),
          where("status", "==", "OVERDUE"),
          orderBy("start", "asc")
        );

        const filterAnsweredPlans = async (plans, mode = 'admin') => {
          // mode: 'admin' -> treat plan as answered only when linked report is APPROVED/REJECTED/COMPLETED
          // mode: 'inspector' -> treat plan as answered when any linked report exists (any status)
          if (!plans || plans.length === 0) return [];
          try {
            const filtered = [];
            await Promise.all(plans.map(async (p) => {
              try {
                const snaps = await getDocs(query(collection(db, 'inspections'), where('planId', '==', p.id)));
                const reports = snaps.docs.map(d => ({ id: d.id, ...d.data() }));
                if (mode === 'inspector') {
                  // inspector: if they have submitted any report for this plan, consider it answered
                  const answered = reports.length > 0;
                  if (!answered) filtered.push(p);
                } else {
                  // admin/default: only consider plan answered when a report is approved/rejected/completed
                  const answered = reports.some(r => {
                    const s = normStatus(r.status);
                    return s === 'APPROVED' || s === 'REJECTED' || s === 'COMPLETED';
                  });
                  if (!answered) filtered.push(p);
                }
              } catch (e) {
                // on error, keep the plan visible
                filtered.push(p);
              }
            }));
            return filtered;
          } catch (e) {
            return plans;
          }
        };

        unsubUp = onSnapshot(qUp, async (snapUp) => {
          try {
            let upcomingDocs = snapUp.docs.map((d) => ({ id: d.id, ...d.data() }));

            if (isInspector && username) {
              const filterFn = (d) => {
                if (d.inspectors && Array.isArray(d.inspectors) && d.inspectors.includes(username)) return true;
                if (d.inspector === username) return true;
                if (d.extendedProps?.inspectors && d.extendedProps.inspectors.includes(username)) return true;
                if (d.extendedProps?.inspector === username) return true;
                return false;
              };
              upcomingDocs = upcomingDocs.filter(filterFn);
            }

            // Exclude answered plans according to role
            const mode = isInspector ? 'inspector' : 'admin';
            const unanswered = await filterAnsweredPlans(upcomingDocs, mode);

            // update latest ref
            upcomingLatestRef.current = unanswered;

            // Merge with latest snapshot of overdue (we'll combine in each handler below)
            const currentOver = overdueLatestRef.current || [];
            const combined = [...currentOver, ...unanswered];
            const unique = Array.from(new Map(combined.map(item => [item.id, item])).values());
            unique.sort((a, b) => (a.start || "").localeCompare(b.start || ""));
            setUpcomingPlans(unique.slice(0, 10));
            setLoadingUpcoming(false);
          } catch (err) {
            console.error("Dashboard: upcoming snapshot processing failed", err);
          }
        }, (err) => {
          console.error("Dashboard: upcoming onSnapshot error", err);
          setLoadingUpcoming(false);
        });

        unsubOver = onSnapshot(qOverdue, async (snapOver) => {
          try {
            let overdueDocs = snapOver.docs.map((d) => ({ id: d.id, ...d.data() }));
            if (isInspector && username) {
              overdueDocs = overdueDocs.filter((d) => {
                if (d.inspectors && Array.isArray(d.inspectors) && d.inspectors.includes(username)) return true;
                if (d.inspector === username) return true;
                if (d.extendedProps?.inspectors && d.extendedProps.inspectors.includes(username)) return true;
                if (d.extendedProps?.inspector === username) return true;
                return false;
              });
            }

            const modeOver = isInspector ? 'inspector' : 'admin';
            const unansweredOverdue = await filterAnsweredPlans(overdueDocs, modeOver);

            overdueLatestRef.current = unansweredOverdue;
            // Combine with last upcoming snapshot (if any)
            const upcomingLatest = upcomingLatestRef.current || [];
            const combined = [...unansweredOverdue, ...upcomingLatest];
            const unique = Array.from(new Map(combined.map(item => [item.id, item])).values());
            unique.sort((a, b) => (a.start || "").localeCompare(b.start || ""));
            setUpcomingPlans(unique.slice(0, 10));
            setLoadingUpcoming(false);
          } catch (err) {
            console.error("Dashboard: overdue snapshot processing failed", err);
          }
        }, (err) => {
          console.error("Dashboard: overdue onSnapshot error", err);
          setLoadingUpcoming(false);
        });

      } catch (e) {
        console.error("Dashboard: setupSubscriptions failed", e);
        setUpcomingPlans([]);
        setLoadingUpcoming(false);
      }
    }

    setupSubscriptions();

    return () => {
      try { unsubUp(); } catch { }
      try { unsubOver(); } catch { }
    };
  }, [userLoading, isInspector, username]);

  /* -------- Fetch monthly inspection reports (actual submitted work) -------- */
  useEffect(() => {
    if (userLoading) return;

    setLoadingReports(true);

    const { start, end } = monthRangeStrings(month);
    const qReports = query(
      collection(db, "inspections"),
      where("inspectionDate", ">=", start),
      where("inspectionDate", "<=", end)
    );

    // Use real-time listener so dashboard updates immediately after a report is created/updated
    const unsubscribe = onSnapshot(
      qReports,
      (snap) => {
        try {
          let reports = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

          // Client-side filter for Inspector
          if (isInspector) {
            const currentUid = userData?.uid;
            const currentName = (username || '').toString().trim().toLowerCase();
            const currentEmail = (userData?.email || '').toString().trim().toLowerCase();

            const normalize = (s) => (s || '').toString().trim().toLowerCase();

            const matchesInspector = (r) => {
              try {
                // Prefer UID match
                if (currentUid && r.inspectorId && r.inspectorId === currentUid) return true;

                // Email match (if stored on report)
                if (currentEmail && r.inspectorEmail && normalize(r.inspectorEmail) === currentEmail) return true;

                // Name match - be flexible: compare normalized names and allow partial matches
                const rName = normalize(r.inspectorName || r._inspectorName || r.reportedBy || r.author || '');
                if (rName && currentName && (rName === currentName || rName.includes(currentName) || currentName.includes(rName))) return true;

                return false;
              } catch (e) {
                return false;
              }
            };

            reports = reports.filter((r) => matchesInspector(r));
          }

          // Filter out drafts - only show submitted work
          const submittedReports = reports.filter((r) => {
            const st = (r.status || "").toString().trim().toLowerCase();
            return st !== "draft";
          });

          setMonthReports(submittedReports);
          setLoadingReports(false);
          console.log(`Dashboard: (snapshot) Loaded ${submittedReports.length} reports`);
        } catch (err) {
          console.error("Dashboard: onSnapshot processing failed", err);
        }
      },
      (err) => {
        console.error("Dashboard: onSnapshot error", err);
        setLoadingReports(false);
      }
    );

    return () => unsubscribe();
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

  // Track viewed reports for Recent Inspections
  const [viewedReportIds, setViewedReportIds] = useState(() => {
    try {
      const saved = localStorage.getItem("viewedReports");
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  // Cache for viewed reports that might be outside the current month view
  const [cachedViewedReports, setCachedViewedReports] = useState([]);

  // Fetch missing viewed reports (those not in monthplans/monthReports)
  useEffect(() => {
    const fetchMissingReports = async () => {
      // Get latest IDs
      let ids = [];
      try { ids = JSON.parse(localStorage.getItem('viewedReports') || '[]'); } catch (e) { }

      if (ids.length === 0) return;

      // Identify which IDs we don't have data for in monthReports or already cached
      const missingIds = ids.filter(id => {
        const inMonth = monthReports.some(r => r.id === id);
        const inCache = cachedViewedReports.some(r => r.id === id);
        return !inMonth && !inCache;
      });

      if (missingIds.length === 0) return;

      // Fetch missing
      try {
        const newReports = [];
        await Promise.all(missingIds.map(async (id) => {
          try {
            const snap = await getDoc(doc(db, 'inspections', id));
            if (snap.exists()) {
              newReports.push({ id: snap.id, ...snap.data() });
            }
          } catch (e) { console.error(`Failed to fetch report ${id}`, e); }
        }));

        if (newReports.length > 0) {
          setCachedViewedReports(prev => [...prev, ...newReports]);
        }
      } catch (e) {
        console.error("Failed to fetch missing viewed reports", e);
      }
    };

    fetchMissingReports();
  }, [monthReports, viewedReportIds]); // Re-run when month data changes or IDs change

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

  /* -------- Recent list: Merge submitted reports + viewed reports -------- */
  const recentInspections = useMemo(() => {
    // Use the state 'viewedReportIds' which updates immediately on interaction
    const viewedIds = viewedReportIds;

    // Combine monthReports AND cachedViewedReports
    const combined = [...monthReports, ...cachedViewedReports];

    // Remove duplicates by ID, filter dismissed, sort by most recent
    const uniqueMap = new Map();
    combined.forEach(r => {
      if (!dismissedReports.includes(r.id)) {
        uniqueMap.set(r.id, r);
      }
    });

    // Convert to array and sort by:
    // 1. Priority to viewed reports (most recently viewed first)
    // 2. Then by submission/inspection date
    const uniqueReports = Array.from(uniqueMap.values());

    return uniqueReports
      .sort((a, b) => {
        const aViewedIndex = viewedIds.indexOf(a.id);
        const bViewedIndex = viewedIds.indexOf(b.id);

        // Both viewed: sort by view order (lower index = more recent)
        if (aViewedIndex !== -1 && bViewedIndex !== -1) {
          return aViewedIndex - bViewedIndex;
        }
        // Only a viewed: a comes first
        if (aViewedIndex !== -1) return -1;
        // Only b viewed: b comes first
        if (bViewedIndex !== -1) return 1;

        // Neither viewed: sort by inspection date
        const dateA = a.inspectionDate || a.submittedAt || "";
        const dateB = b.inspectionDate || b.submittedAt || "";
        return String(dateB).localeCompare(String(dateA));
      })
      .slice(0, 5); // Limit to last 5
  }, [monthReports, dismissedReports, cachedViewedReports, viewedReportIds]);

  // Fetch plan titles for any reports that reference a planId and are missing title in cache
  useEffect(() => {
    let mounted = true;
    const missing = new Set();
    recentInspections.forEach(r => {
      if (r.planId && !planTitles[r.planId]) missing.add(r.planId);
    });

    if (missing.size === 0) return;

    (async () => {
      const updates = {};
      try {
        await Promise.all(Array.from(missing).map(async (pid) => {
          try {
            const d = await getDoc(doc(db, 'inspection_plans', pid));
            if (d.exists()) updates[pid] = d.data().title || d.data().name || "(untitled)";
            else updates[pid] = pid;
          } catch (e) {
            updates[pid] = pid;
          }
        }));
        if (!mounted) return;
        setPlanTitles(prev => ({ ...prev, ...updates }));
      } catch (e) {
        console.error('Failed to fetch plan titles', e);
      }
    })();

    return () => { mounted = false; };
  }, [recentInspections, planTitles]);

  const handleClearAll = () => {
    // Close the clear history modal first
    setClearHistoryModalOpen(false);

    // Check if there are reports to clear
    const visibleReports = recentInspections;
    if (visibleReports.length === 0) {
      notifications.show({ title: 'No reports', message: 'There are no reports to clear', color: 'blue' });
      return;
    }

    // Show custom confirmation modal instead of window.confirm
    setClearAllConfirmOpen(true);
  };

  const confirmClearAll = () => {
    // Perform the actual clear all action
    // We must dismiss ALL reports currently in monthReports to ensure nothing else "slides in"
    // from pagination/slicing
    const allIds = monthReports.map(r => r.id);

    setDismissedReports(prev => {
      const all = new Set([...prev, ...allIds]);
      return Array.from(all);
    });

    // Clear view history
    localStorage.setItem('viewedReports', JSON.stringify([]));
    setViewedReportIds([]); // Update state immediately

    // Close confirmation modal
    setClearAllConfirmOpen(false);

    notifications.show({ title: 'Cleared', message: 'All recent inspections cleared', color: 'green' });
  };

  const handleClearCompletedOnly = () => {
    // Close the clear history modal first
    setClearHistoryModalOpen(false);

    // Filter completed reports from ALL loaded reports (monthReports)
    // to ensure we catch everything, not just the visible 5
    const completedReports = monthReports.filter(r => {
      // Must not already be dismissed
      if (dismissedReports.includes(r.id)) return false;
      const status = normStatus(r.status);
      return ["APPROVED", "REJECTED", "COMPLETED", "VIDEO_UPLOADED"].includes(status);
    });

    if (completedReports.length === 0) {
      notifications.show({ title: 'No completed reports', message: 'There are no completed reports to clear', color: 'blue' });
      return;
    }

    // Store count and show custom confirmation modal
    setCompletedReportsCount(completedReports.length);
    setClearCompletedConfirmOpen(true);
  };

  const confirmClearCompletedOnly = () => {
    // Perform the actual clear completed action on ALL loaded reports
    const completedReports = monthReports.filter(r => {
      // Must not already be dismissed
      if (dismissedReports.includes(r.id)) return false;
      const status = normStatus(r.status);
      return ["APPROVED", "REJECTED", "COMPLETED", "VIDEO_UPLOADED"].includes(status);
    });

    const completedIds = completedReports.map(r => r.id);
    setDismissedReports(prev => {
      const all = new Set([...prev, ...completedIds]);
      return Array.from(all);
    });

    // Close confirmation modal
    setClearCompletedConfirmOpen(false);

    notifications.show({ title: 'Cleared', message: `${completedReports.length} completed report(s) cleared`, color: 'green' });
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
  // groupBy is now automatically derived from searchQuery - no toggle needed
  const [sortBy, setSortBy] = useState('latest'); // 'latest' | 'status'
  const [sortDir, setSortDir] = useState('desc'); // 'desc' | 'asc'
  const [filterInspector, setFilterInspector] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const handleStatClick = (view) => {
    setActiveStatView(view);
    // Reset filters when entering a new view
    setFilterInspector('all');
    setSearchQuery('');
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

  // Extract unique inspectors for filter dropdown
  const uniqueInspectors = useMemo(() => {
    const data = drillDownData.data || [];
    const set = new Set();
    data.forEach(item => {
      const name = item.inspectorName || item.inspectorId;
      if (name) set.add(name);
    });
    return Array.from(set).map(name => ({ value: name, label: name }));
  }, [drillDownData]);

  // Compute displayed drill data with grouping/sorting
  const displayedDrill = useMemo(() => {
    let list = [...(drillDownData.data || [])];

    // 1. Filter by Inspector
    if (filterInspector !== 'all') {
      list = list.filter(item => (item.inspectorName || item.inspectorId) === filterInspector);
    }

    // 2. Search Query (Fuzzy)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(item => {
        const name = (item.inspectorName || item.inspectorId || '').toLowerCase();
        const equip = (item.equipmentId || '').toLowerCase();
        // Also search in report ID or title if available
        const id = (item.id || '').toLowerCase();
        const rptNo = (item.reportNo || '').toLowerCase();
        return name.includes(q) || equip.includes(q) || id.includes(q) || rptNo.includes(q);
      });
    }

    const parseDateValue = (r) => {
      // Prefer submittedAt, then updatedAt, then inspectionDate
      if (r.submittedAt && typeof r.submittedAt.toDate === 'function') return r.submittedAt.toDate().getTime();
      if (r.submittedAt) return new Date(r.submittedAt).getTime ? new Date(r.submittedAt).getTime() : 0;
      if (r.updatedAt && typeof r.updatedAt.toDate === 'function') return r.updatedAt.toDate().getTime();
      if (r.updatedAt) return new Date(r.updatedAt).getTime ? new Date(r.updatedAt).getTime() : 0;
      if (r.inspectionDate) return new Date(r.inspectionDate).getTime();
      return 0;
    };

    const statusOrder = (s) => {
      const m = {
        'SUBMITTED': 1,
        'PENDING': 2,
        'PENDING_REVIEW': 2,
        'REJECTED': 3,
        'APPROVED': 4,
        'COMPLETED': 5,
      };
      return m[normStatus(s)] || 99;
    };

    const sorter = (a, b, field = 'latest') => {
      if (field === 'status') {
        return statusOrder(a.status) - statusOrder(b.status);
      }
      // latest
      return parseDateValue(b) - parseDateValue(a);
    };

    // Sort
    list.sort((a, b) => {
      const primary = sorter(a, b, sortBy);
      return sortDir === 'desc' ? primary : -primary;
    });

    // Auto-group by inspector when search query is not empty OR a specific inspector is selected
    const shouldGroup = searchQuery.trim().length > 0 || filterInspector !== 'all';
    if (shouldGroup) {
      const groups = new Map();
      for (const item of list) {
        const key = (item.inspectorName || item.inspectorId || 'Unknown').toString();
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(item);
      }
      // Convert to array of { inspector, items }
      const out = Array.from(groups.entries()).map(([inspector, items]) => ({ inspector, items }));
      // Optionally sort each group's items by sortBy/sortDir
      out.forEach(g => {
        g.items.sort((a, b) => {
          const v = sorter(a, b, sortBy);
          return sortDir === 'desc' ? v : -v;
        });
      });
      return { grouped: true, groups: out };
    }

    return { grouped: false, items: list };
  }, [drillDownData, sortBy, sortDir, filterInspector, searchQuery]);

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

          <Paper shadow="xs" p="md" radius="md" mb="md" withBorder style={{
            backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'var(--mantine-color-gray-0)'
          }}>
            <Group>
              <TextInput
                placeholder="Search report, inspector..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.currentTarget.value)}
                size="sm"
                leftSection={<IconSearch size={16} />}
                style={{ flex: 2, minWidth: 220 }}
              />

              <Select
                value={filterInspector}
                onChange={(v) => setFilterInspector(v || 'all')}
                data={[{ value: 'all', label: 'All Inspectors' }, ...uniqueInspectors]}
                placeholder="Filter Inspector"
                size="sm"
                leftSection={<IconUser size={16} />}
                searchable
                checkIconPosition="right"
                style={{ flex: 1.5, minWidth: 200 }}
              />

              <Select
                value={sortBy}
                onChange={(v) => setSortBy(v || 'latest')}
                data={[{ value: 'latest', label: 'Latest First' }, { value: 'status', label: 'Status' }]}
                size="sm"
                leftSection={sortDir === 'desc' ? <IconSortDescending size={16} /> : <IconSortAscending size={16} />}
                placeholder="Sort By"
                checkIconPosition="right"
                style={{ flex: 1, minWidth: 160 }}
              />

              <Select
                value={sortDir}
                onChange={(v) => setSortDir(v || 'desc')}
                data={[{ value: 'desc', label: 'Descending' }, { value: 'asc', label: 'Ascending' }]}
                size="sm"
                style={{ width: 130 }}
              />
            </Group>
          </Paper>

          <Stack>
            {(!drillDownData.data || drillDownData.data.length === 0) ? (
              <Text c="dimmed" fs="italic">No items found.</Text>
            ) : (
              displayedDrill.grouped ? (
                // Render groups
                displayedDrill.groups.map(g => (
                  <div key={g.inspector} style={{ marginBottom: 12 }}>
                    <Text fw={700} mb={6}>{g.inspector}</Text>
                    <Stack>
                      {g.items.map(item => (
                        <ReportRow key={item.id} report={item} hoverCardSx={hoverCardSx} onClick={() => openPlanModal(item)} />
                      ))}
                    </Stack>
                  </div>
                ))) : (
                // Flat list
                displayedDrill.items.map(item => (
                  <ReportRow key={item.id} report={item} hoverCardSx={hoverCardSx} onClick={() => openPlanModal(item)} />
                ))
              )
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
                      onClick={() => setClearHistoryModalOpen(true)}
                    >
                      Clear History
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
                          report={{ ...r, _planTitle: r.planId ? planTitles[r.planId] : undefined }}
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
                        <PlanRow key={p.id} plan={p} hoverCardSx={hoverCardSx} onClick={() => openPlanModal(p)} now={now} />
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
          selectedPlan._isReport ? (
            <Stack gap="sm">
              <Text fw={900}>{selectedPlan.reportNo || selectedPlan.equipmentId || 'Inspection Report'}</Text>

              <Text size="sm" c="dimmed">Inspector: {selectedPlan.inspectorName || selectedPlan._inspectorName || '—'}</Text>

              <Text size="sm" c="dimmed">Scheduled: {selectedPlan.inspectionDate || '—'}</Text>

              <Text size="sm" c="dimmed">Submitted: {formatMaybeTimestamp(selectedPlan.submittedAt) || (selectedPlan.timestamp ? formatMaybeTimestamp(selectedPlan.timestamp) : '—')}</Text>

              <Text size="sm" c="dimmed">Equipment: {selectedPlan.equipmentId || '—'}</Text>

              {selectedPlan.photoReport && selectedPlan.photoReport.length > 0 && (
                <div>
                  <Text size="sm" fw={700}>Photos</Text>
                  <Stack spacing={6} mt={6}>
                    {selectedPlan.photoReport.map((pr, idx) => (
                      <div key={idx}>
                        {pr.photoUrls && pr.photoUrls.length > 0 && (
                          <Group spacing={8} align="center">
                            {pr.photoUrls.slice(0, 3).map((u, i) => (
                              <img key={i} src={u} alt={`photo-${i}`} style={{ width: 80, height: 60, objectFit: 'cover', borderRadius: 6 }} />
                            ))}
                            {pr.finding && <Text size="xs">{pr.finding}</Text>}
                          </Group>
                        )}
                      </div>
                    ))}
                  </Stack>
                </div>
              )}

              <Divider />

              <Group grow>
                <Button variant="light" onClick={() => openReview(selectedPlan)}>
                  Review
                </Button>
                <Button onClick={handleOpenDetails}>View Details</Button>
              </Group>
            </Stack>
          ) : (
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
                {role === 'admin' ? (
                  <Button variant="light" onClick={() => openReview(selectedPlan)}>
                    Review
                  </Button>
                ) : (
                  <Button variant="light" onClick={() => navigate("/inspection-plan")}>
                    Open Schedule
                  </Button>
                )}
                <Button onClick={handleOpenDetails}>View Details</Button>
              </Group>
            </Stack>
          )
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
          selectedPlan._isReport ? (
            <Stack p="md">
              <Group position="apart">
                <Title order={4}>{selectedPlan.reportNo || 'Inspection Report'}</Title>
                <Badge color={getStatusColor(selectedPlan.status)}>{normStatus(selectedPlan.status)}</Badge>
              </Group>

              <Text size="sm" c="dimmed">Inspector: {selectedPlan.inspectorName || '—'}</Text>
              <Text size="sm" c="dimmed">Date: {selectedPlan.inspectionDate || selectedPlan.timestamp || '—'}</Text>
              <Text size="sm" c="dimmed">Equipment: {selectedPlan.equipmentId || '—'}</Text>

              <Divider />

              <Stack spacing={8}>
                <Text fw={700}>Findings</Text>
                {selectedPlan.photoReport && selectedPlan.photoReport.length > 0 ? (
                  selectedPlan.photoReport.map((pr, i) => (
                    <Card key={i} withBorder p="sm">
                      {pr.finding && <Text size="sm">{pr.finding}</Text>}
                      {pr.recommendation && <Text size="xs" c="dimmed">{pr.recommendation}</Text>}
                      {pr.photoUrls && pr.photoUrls.length > 0 && (
                        <Group mt={8} spacing={8}>
                          {pr.photoUrls.map((u, j) => (
                            <img key={j} src={u} alt={`photo-${j}`} style={{ width: 120, height: 90, objectFit: 'cover', borderRadius: 6 }} />
                          ))}
                        </Group>
                      )}
                    </Card>
                  ))
                ) : (
                  <Text c="dimmed">No findings/photos attached.</Text>
                )}
              </Stack>

              <Divider />

              <Group position="right">
                {(role === 'admin' || role === 'supervisor') ? (
                  <Button variant="outline" onClick={() => openReview(selectedPlan)}>Review</Button>
                ) : (
                  <Button variant="outline" onClick={() => navigate(`/report-submission?id=${selectedPlan.id}`)}>Open Report</Button>
                )}
                <Button onClick={() => setDetailsModalOpen(false)}>Close</Button>
              </Group>
            </Stack>
          ) : (
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
          )
        )}
      </Modal>

      {/* Review Modal for Admin */}
      <Modal
        opened={reviewModalOpen}
        onClose={() => { setReviewModalOpen(false); setReviewReport(null); setShowRejectInput(false); setRejectReason(''); }}
        title="Inspection Review"
        centered
        size="xl"
      >
        {reviewReport ? (
          <div>
            <Group mb="md" position="apart">
              <div>
                <Text fw={700}>{reviewReport.reportNo || reviewReport.id}</Text>
                <Text size="sm" c="dimmed">Inspector: {reviewReport.inspectorName}</Text>
              </div>
              <Group>
                <Button variant="default" onClick={handlePrint}>Print PDF</Button>
                <Group spacing={6} align="center" style={{ marginLeft: 6, marginRight: 6 }}>
                  <Button size="xs" variant="subtle" onClick={() => setPreviewScale(s => Math.max(0.4, Math.round((s - 0.05) * 100) / 100))}>-</Button>
                  <Text size="xs" c="dimmed">{Math.round(previewScale * 100)}%</Text>
                  <Button size="xs" variant="subtle" onClick={() => setPreviewScale(s => Math.min(1.0, Math.round((s + 0.05) * 100) / 100))}>+</Button>
                </Group>
                {(() => {
                  // Only admin and supervisor can approve/reject reports
                  // Inspectors should never see these buttons
                  const isInspectorRole = role === 'inspector';
                  const canReview = normStatus(reviewReport.status) === 'SUBMITTED' && !isInspectorRole;

                  return canReview ? (
                    <>
                      <Button
                        color="red"
                        variant="light"
                        loading={processingReview}
                        onClick={() => {
                          if (!showRejectInput) {
                            setShowRejectInput(true);
                            return;
                          }
                          // confirm reject with provided reason
                          handleRejectReview(rejectReason);
                        }}
                      >
                        {showRejectInput ? 'Confirm Reject' : 'Reject & Return'}
                      </Button>
                      <Button color="green" onClick={handleApproveReview} loading={processingReview}>Approve Report</Button>
                    </>
                  ) : null;
                })()}
              </Group>
            </Group>

            {showRejectInput && (
              <div style={{ marginBottom: 12 }}>
                <Textarea placeholder="Rejection reason" value={rejectReason} onChange={(e) => setRejectReason(e.currentTarget.value)} autosize minRows={2} />
              </div>
            )}

            <Paper withBorder p="md" style={{ overflow: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <div ref={printSectionRef} className="preview-scale no-print-scale" style={{ transform: `scale(${previewScale})`, transformOrigin: 'top center', width: '210mm' }}>
                  <InspectionReportView data={reviewReport} />
                </div>
              </div>

              <style>{`
                /* Keep scaled preview on screen, but print at full size */
                /* When printing from the dashboard we add a body class to force the preview to unscale */
                .dashboard-printing .no-print-scale { transform: none !important; width: auto !important; max-width: none !important; }
                @media print {
                  .no-print-scale { transform: none !important; width: auto !important; max-width: none !important; }
                  body { margin: 0 !important; }
                }
                `}</style>
            </Paper>
          </div>
        ) : (
          <Text>No report selected.</Text>
        )}
      </Modal>

      {/* Interactive Clear-All Confirmation Modal */}
      <Modal
        opened={clearModalOpen}
        onClose={() => { setClearModalOpen(false); setClearCandidateIds([]); }}
        title="Clear Recent Inspections"
        centered
        size="sm"
      >
        <Stack>
          <Text size="sm">Some items in this list are pending review or incomplete.</Text>
          <Text size="xs" c="dimmed">Clearing will hide them from your Recent Inspections list (you can restore if needed by other actions).</Text>

          <Group position="apart" mt="md">
            <Button variant="default" onClick={() => { setClearModalOpen(false); setClearCandidateIds([]); }}>Cancel</Button>
            <Group>
              <Button color="blue" variant="light" onClick={() => {
                // Only clear completed/reviewed items (Approved, Completed, Video_Uploaded, Rejected)
                const completedIds = clearCandidateIds.filter(id => {
                  const report = recentInspections.find(r => r.id === id);
                  if (!report) return false;
                  const status = normStatus(report.status);
                  return ["APPROVED", "COMPLETED", "VIDEO_UPLOADED", "REJECTED"].includes(status);
                });
                if (completedIds.length > 0) {
                  setDismissedReports(prev => [...prev, ...completedIds]);
                  notifications.show({ title: 'Cleared', message: `${completedIds.length} completed item(s) cleared from view`, color: 'blue' });
                } else {
                  notifications.show({ title: 'No Items', message: 'No completed items to clear', color: 'yellow' });
                }
                setClearCandidateIds([]);
                setClearModalOpen(false);
              }}>Clear Completed Only</Button>
              <Button color="red" onClick={() => {
                if (clearCandidateIds.length > 0) {
                  setDismissedReports(prev => [...prev, ...clearCandidateIds]);
                }
                setClearCandidateIds([]);
                setClearModalOpen(false);
                notifications.show({ title: 'Cleared', message: 'Recent inspections cleared from view', color: 'blue' });
              }}>Clear All</Button>
            </Group>
          </Group>
        </Stack>
      </Modal>

      {/* Clear History Modal */}
      <Modal
        opened={clearHistoryModalOpen}
        onClose={() => setClearHistoryModalOpen(false)}
        title="Clear Recent Inspections"
        centered
        size="sm"
      >
        <Stack>
          <Text size="sm">Choose how you want to clear your recent inspections:</Text>

          <Button
            variant="light"
            color="blue"
            fullWidth
            onClick={handleClearCompletedOnly}
          >
            Clear Completed Only
          </Button>

          <Text size="xs" c="dimmed" ta="center">
            Removes only approved, rejected, and completed reports
          </Text>

          <Divider my="sm" />

          <Button
            variant="light"
            color="red"
            fullWidth
            leftSection={<IconTrash size={16} />}
            onClick={handleClearAll}
          >
            Clear All
          </Button>

          <Text size="xs" c="dimmed" ta="center">
            Removes all reports and clears view history
          </Text>

          <Button
            variant="subtle"
            color="gray"
            fullWidth
            onClick={() => setClearHistoryModalOpen(false)}
            mt="md"
          >
            Cancel
          </Button>
        </Stack>
      </Modal>

      {/* Clear Completed Only Confirmation Modal */}
      <Modal
        opened={clearCompletedConfirmOpen}
        onClose={() => setClearCompletedConfirmOpen(false)}
        title={`Clear ${completedReportsCount} Completed Report(s)`}
        centered
        size="sm"
      >
        <Stack>
          <Text size="sm">
            Clear {completedReportsCount} completed report(s) from Recent Inspections? This will not delete any reports from the database.
          </Text>

          <Group position="right" mt="md">
            <Button
              variant="default"
              onClick={() => setClearCompletedConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              color="blue"
              onClick={confirmClearCompletedOnly}
            >
              OK
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Clear All Confirmation Modal */}
      <Modal
        opened={clearAllConfirmOpen}
        onClose={() => setClearAllConfirmOpen(false)}
        title="Clear All Recent Inspections"
        centered
        size="sm"
      >
        <Stack>
          <Text size="sm">
            Clear all items from Recent Inspections? This will not delete any reports from the database.
          </Text>

          <Group position="right" mt="md">
            <Button
              variant="default"
              onClick={() => setClearAllConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              color="red"
              onClick={confirmClearAll}
            >
              OK
            </Button>
          </Group>
        </Stack>
      </Modal>

    </Container>
  );
}
