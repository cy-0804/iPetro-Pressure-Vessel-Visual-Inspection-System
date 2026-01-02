import React, { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { Popover, Modal, Button, SegmentedControl, Group, Text, ActionIcon, Loader, Center } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconChevronLeft, IconChevronRight, IconRefresh } from "@tabler/icons-react";
import CreateInspectionPlanForm from "../components/inspection/CreateInspectionPlanForm";
import InspectorEventDetails from "../components/calendar/InspectorEventDetails";
import { inspectionService } from "../services/inspectionService";
import { userService } from "../services/userService";
import { getEquipments } from "../services/equipmentService";
import "../components/calendar/calendar.css";
import { auth } from "../firebase";
const getEventColor = (status) => {
  switch (status) {
    case "PLANNED": return "#228be6"; // mantine blue-6 (Unified)
    case "SCHEDULED": return "#228be6"; // mantine blue-6
    case "IN_PROGRESS": return "#fd7e14"; // mantine orange-6
    case "COMPLETED": return "#40c057"; // mantine green-6
    case "Submitted": return "#15aabf"; // mantine cyan-6 (Pending Review)
    case "Approved": return "#12b886"; // mantine teal-6
    case "Rejected": return "#e03131"; // mantine red-8
    case "OVERDUE": return "#fa5252"; // mantine red-6
    default: return "gray";
  }
};

export default function InspectionCalendar() {
  const calendarRef = useRef(null);
  const containerRef = useRef(null);
  const navigate = useNavigate();
  const [view, setView] = useState("dayGridMonth");
  const [currentTitle, setCurrentTitle] = useState("");

  // --- Real Auth Logic ---
  const [loadingUser, setLoadingUser] = useState(true);
  const [viewMode, setViewMode] = useState("inspector");
  const [currentUser, setCurrentUser] = useState(null);
  const [currentUserProfile, setCurrentUserProfile] = useState(null);

  // --- Popover Logic (Google Style) ---
  const [popoverOpened, setPopoverOpened] = useState(false);
  const [clickPosition, setClickPosition] = useState({ x: 0, y: 0 });
  const [selectedDateISO, setSelectedDateISO] = useState(null);

  // --- Modal Logic (For Mobile or "Create" button) ---
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);

  // --- Inspector Details Modal Logic ---
  const [inspectorModalOpened, { open: openInspectorModal, close: closeInspectorModal }] = useDisclosure(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  // --- Events Data ---
  const [userEvents, setUserEvents] = useState([]);

  // --- Data for Dropdowns ---
  const [inspectorList, setInspectorList] = useState([]);
  const [allUsers, setAllUsers] = useState([]); // For name resolution of supervisors/admins too
  const [equipmentList, setEquipmentList] = useState([]);

  // --- Filters ---
  const [inspectorFilter, setInspectorFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // 1. Fetch User Profile
  useEffect(() => {
    const initUser = async () => {
      const profile = await userService.getCurrentUserProfile();
      if (profile) {
        setViewMode(profile.role === 'supervisor' || profile.role === 'admin' ? 'supervisor' : 'inspector');

        setCurrentUser(profile.username || profile.email);
        setCurrentUserProfile(profile);
      }
      setLoadingUser(false);
    };
    initUser();
  }, []);

  // 2. Fetch Data (Events, Inspectors, Equipment)
  const fetchData = async () => {
    console.log("Fetching Inspection Data..."); // Debug Log
    try {

      await inspectionService.checkOverdueStatus();

      const plans = await inspectionService.getInspectionPlans();
      console.log(" fetched plans:", plans.length); // Debug Log
      setUserEvents(plans);

      const users = await userService.getInspectors();

      const inspectorUsers = users.filter(u => u.role === 'inspector');

      const uniqueInspectorsMap = new Map();
      inspectorUsers.forEach(u => {
        const key = u.username || u.email;
        if (key) uniqueInspectorsMap.set(key, u);
      });
      setInspectorList(Array.from(uniqueInspectorsMap.values()));


      setAllUsers(users);

      const eqs = await getEquipments();
      setEquipmentList(eqs);
    } catch (error) {
      console.error("Failed to fetch data", error);
    }
  };

  useEffect(() => {
    fetchData();

  }, []);


  useEffect(() => {
    if (inspectorModalOpened) {
      fetchData();
    }
  }, [inspectorModalOpened]);

  const allEvents = userEvents;

  const filteredEvents = useMemo(() => {
    if (!currentUser) return [];

    return allEvents.filter(evt => {
      // 1. View Mode Filter
      if (viewMode === "inspector") {

        if (evt.extendedProps?.inspector !== currentUser) return false;
      }

      // 2. Toolbar Filters 
      if (viewMode === "supervisor") {
        // Filter by Inspector 
        if (inspectorFilter !== "all") {
          const primary = evt.extendedProps?.inspector;
          const list = evt.extendedProps?.inspectors || [];
          // Match if Primary matches OR if list includes it
          const match = primary === inspectorFilter || list.includes(inspectorFilter);
          if (!match) return false;
        }

        const ms = statusFilter === "all" ||
          evt.extendedProps?.status === statusFilter ||
          (statusFilter === "PLANNED" && evt.extendedProps?.status === "SCHEDULED"); // Match both for Planned
        return ms;
      }

      return true;
    });
  }, [allEvents, inspectorFilter, statusFilter, viewMode, currentUser]);


  useEffect(() => {
    if (!containerRef.current || !calendarRef.current) return;
    const resizeObserver = new ResizeObserver(() => {
      setTimeout(() => {
        calendarRef.current?.getApi().updateSize();
      }, 0);
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // --- Handlers ---
  const handlePrev = () => calendarRef.current?.getApi().prev();
  const handleNext = () => calendarRef.current?.getApi().next();
  const handleToday = () => calendarRef.current?.getApi().today();

  const handleDateClick = (info) => {
    if (viewMode === "inspector") return;

    const { clientX, clientY } = info.jsEvent;
    setSelectedDateISO(info.dateStr);
    setClickPosition({ x: clientX, y: clientY });
    openModal();
  };

  const handleEventClick = (info) => {
    const evt = userEvents.find(e => e.id === info.event.id) || {
      id: info.event.id,
      title: info.event.title,
      start: info.event.startStr,
      end: info.event.endStr || info.event.startStr,
      extendedProps: info.event.extendedProps
    };

    setSelectedEvent(evt);
    openInspectorModal();
  };

  const handleSaveEvent = async (newEvent) => {
    const { id, ...dataToSave } = newEvent;
    try {
      const savedEvent = await inspectionService.addInspectionPlan(dataToSave);
      setUserEvents(prev => [...prev, savedEvent]);
      setPopoverOpened(false);
      closeModal();
      const api = calendarRef.current?.getApi();
      if (api && savedEvent.start) api.gotoDate(savedEvent.start);
    } catch (error) {
      alert("Failed to save event");
    }
  };

  const handleUpdateEvent = async (updatedEvent) => {
    try {
      const { id, ...updates } = updatedEvent;
      await inspectionService.updateInspectionPlan(id, updates);
      setUserEvents(prev => prev.map(evt => evt.id === id ? updatedEvent : evt));
      setSelectedEvent(updatedEvent);
    } catch (error) {
      alert("Failed to update event");
    }
  };

  const handleDeleteEvent = async (id) => {
    if (!id) return alert("Error: Event ID is missing during delete.");
    if (!window.confirm("Are you sure you want to delete this inspection plan?")) return;
    try {
      await inspectionService.deleteInspectionPlan(id);
      setUserEvents(prev => prev.filter(e => e.id !== id));
      closeInspectorModal();
    } catch (error) {
      console.error("Delete failed:", error);
      alert("Failed to delete event: " + (error.message || "Unknown error"));
    }
  }

  if (loadingUser) {
    return <Center h="100vh"><Loader /></Center>;
  }

  return (
    <div className="calendar-wrapper" ref={containerRef}>
      <div className="top-toolbar">
        <Group>
          <Button variant="default" onClick={handleToday}>Today</Button>
          <Group gap={0}>
            <ActionIcon variant="subtle" color="gray" onClick={handlePrev}>
              <IconChevronLeft size={20} />
            </ActionIcon>
            <ActionIcon variant="subtle" color="gray" onClick={handleNext}>
              <IconChevronRight size={20} />
            </ActionIcon>
          </Group>
          <Text size="lg" fw={700} style={{ minWidth: 150, textAlign: 'center' }}>{currentTitle}</Text>



        </Group>

        <select value={view} onChange={(e) => {
          setView(e.target.value);
          calendarRef.current?.getApi().changeView(e.target.value);
        }} className="btn">
          <option value="dayGridMonth">Month</option>
          <option value="timeGridWeek">Week</option>
          <option value="timeGridDay">Day</option>
        </select>


        {viewMode === "supervisor" && (
          <>
            <select
              value={inspectorFilter}
              onChange={(e) => setInspectorFilter(e.target.value)}
              className="btn"
            >
              <option value="all">All Inspectors</option>
              {inspectorList.map(inspector => {

                let displayName = inspector.username || inspector.email;
                if (inspector.firstName && inspector.lastName) {
                  displayName = `${inspector.firstName} ${inspector.lastName}`;
                } else if (inspector.fullName) {
                  displayName = inspector.fullName;
                }

                const value = inspector.username || inspector.email; // Keep using username/email as value for filtering
                return <option key={inspector.id || value} value={value}>{displayName}</option>;
              })}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="btn"
            >
              <option value="all">All Status</option>
              <option value="PLANNED">Planned</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="Submitted">Pending Review</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
              <option value="OVERDUE">Overdue</option>
            </select>



          </>
        )}

        <div style={{ marginLeft: "auto" }}>

          {viewMode === "supervisor" && (
            <Button onClick={() => { setSelectedDateISO(null); openModal(); }}>+ Create</Button>
          )}
        </div>
      </div>

      <div className="calendar-container">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView={view}
          headerToolbar={false}
          events={filteredEvents.map(e => ({
            ...e,
            allDay: true,
            color: getEventColor(e.status || e.extendedProps?.status)
          }))}
          height="100%"
          dateClick={viewMode === "supervisor" ? handleDateClick : undefined}
          eventClick={handleEventClick}
          eventClassNames={(arg) => [arg.event.extendedProps?.status || ""]}
          handleWindowResize={true}
          datesSet={(dateInfo) => setCurrentTitle(dateInfo.view.title)}
        />
      </div>

      <Modal
        opened={modalOpened}
        onClose={closeModal}
        title="Create Inspection Plan"
        centered
        size="lg"
      >
        <CreateInspectionPlanForm
          onCancel={closeModal}
          onSaved={() => {
            closeModal();

            window.location.reload();
          }}
          initialDate={selectedDateISO}
        />
      </Modal>

      <Modal
        opened={inspectorModalOpened}
        onClose={closeInspectorModal}
        withCloseButton={false}
        centered
        title={null}
        padding={0}
        size="auto"
      >
        {selectedEvent && (
          <InspectorEventDetails
            event={selectedEvent}
            onUpdate={handleUpdateEvent}
            onDelete={handleDeleteEvent}
            onClose={closeInspectorModal}
            viewMode={viewMode}
            inspectors={inspectorList}
            userMap={allUsers}
            equipmentList={equipmentList}
            currentUser={currentUser}
            userProfile={currentUserProfile}
          />
        )}
      </Modal>

    </div >
  );
}