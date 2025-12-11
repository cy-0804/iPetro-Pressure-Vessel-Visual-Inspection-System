import React, { useState, useRef, useEffect, useMemo } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { Popover, Modal, Button, SegmentedControl, Group, Text, ActionIcon } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import AddInspectionForm from "../components/calendar/AddInspectionEvent";
import InspectorEventDetails from "../components/calendar/InspectorEventDetails";
import "../components/calendar/calendar.css";

export default function InspectionCalendar() {
  const calendarRef = useRef(null);
  const containerRef = useRef(null); // Ref for the wrapper
  const [view, setView] = useState("dayGridMonth");
  const [currentTitle, setCurrentTitle] = useState("");

  // --- View Mode Logic ---
  const [viewMode, setViewMode] = useState("supervisor"); // 'supervisor' | 'inspector'
  const currentUser = "Inspector A"; // Mock current user

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
  // Initialize with mock data so it's all mutable
  const [userEvents, setUserEvents] = useState([
    { id: 1, title: "Inspection A", start: "2025-11-15T09:00", extendedProps: { inspector: "Inspector A", status: "pending", equipmentId: "EQ-101" } },
    { id: 2, title: "Inspection B", start: "2025-11-16T14:00", extendedProps: { inspector: "Inspector B", status: "in-progress", equipmentId: "EQ-102" } },
    { id: 3, title: "Inspection C", start: "2025-11-17T10:00", extendedProps: { inspector: "Inspector C", status: "pending", equipmentId: "EQ-103" } }
  ]);

  const allEvents = userEvents;

  // --- Filters ---
  const [inspectorFilter, setInspectorFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredEvents = useMemo(() => {
    return allEvents.filter(evt => {
      // 1. View Mode Filter
      if (viewMode === "inspector") {
        if (evt.extendedProps?.inspector !== currentUser) return false;
      }

      // 2. Toolbar Filters (Only apply in Supervisor mode or if needed)
      if (viewMode === "supervisor") {
        const mi = inspectorFilter === "all" || evt.extendedProps?.inspector === inspectorFilter;
        const ms = statusFilter === "all" || evt.extendedProps?.status === statusFilter;
        return mi && ms;
      }

      return true;
    });
  }, [allEvents, inspectorFilter, statusFilter, viewMode]);

  // --- Resize Observer for Dynamic Resizing ---
  useEffect(() => {
    if (!containerRef.current || !calendarRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      // Use setTimeout to avoid "ResizeObserver loop limit exceeded" error
      setTimeout(() => {
        calendarRef.current?.getApi().updateSize();
      }, 0);
    });

    resizeObserver.observe(containerRef.current);

    return () => resizeObserver.disconnect();
  }, []);

  // --- Handlers ---

  const handlePrev = () => {
    calendarRef.current?.getApi().prev();
  };

  const handleNext = () => {
    calendarRef.current?.getApi().next();
  };

  const handleToday = () => {
    calendarRef.current?.getApi().today();
  };

  const handleDateClick = (info) => {
    if (viewMode === "inspector") return; // Inspectors don't create events via date click

    // 1. Capture coordinates
    const { clientX, clientY } = info.jsEvent;

    // 2. Set Date
    setSelectedDateISO(info.dateStr);

    // 3. Update position and Open Popover
    setClickPosition({ x: clientX, y: clientY });
    setPopoverOpened(true);
  };

  const handleEventClick = (info) => {
    // Open Inspector Details for both modes
    // Find the actual event object from state to ensure we have the latest data
    // Use String comparison to handle both number IDs (mock) and string IDs (new events)
    const evt = userEvents.find(e => String(e.id) === String(info.event.id)) || {
      id: info.event.id,
      title: info.event.title,
      start: info.event.startStr,
      end: info.event.endStr || info.event.startStr,
      extendedProps: info.event.extendedProps
    };

    setSelectedEvent(evt);
    openInspectorModal();
  };

  const handleSaveEvent = (newEvent) => {
    setUserEvents(prev => [...prev, newEvent]);
    setPopoverOpened(false);
    closeModal();
    // Refresh calendar view
    const api = calendarRef.current?.getApi();
    if (api && newEvent.start) api.gotoDate(newEvent.start);
  };

  const handleUpdateEvent = (updatedEvent) => {
    console.log("Updated Event:", updatedEvent);

    setUserEvents(prevEvents => prevEvents.map(evt =>
      evt.id === updatedEvent.id ? updatedEvent : evt
    ));

    // Update selectedEvent so the modal reflects changes immediately if it relies on this prop
    setSelectedEvent(updatedEvent);
  };

  const inspectors = ["Inspector A", "Inspector B", "Inspector C"];

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

          <SegmentedControl
            value={viewMode}
            onChange={setViewMode}
            data={[
              { label: 'Supervisor', value: 'supervisor' },
              { label: 'Inspector', value: 'inspector' },
            ]}
          />
        </Group>

        <select value={view} onChange={(e) => {
          setView(e.target.value);
          calendarRef.current?.getApi().changeView(e.target.value);
        }} className="btn">
          <option value="dayGridMonth">Month</option>
          <option value="timeGridWeek">Week</option>
          <option value="timeGridDay">Day</option>
        </select>

        {/* Filters - Only visible in Supervisor Mode */}
        {viewMode === "supervisor" && (
          <>
            <select
              value={inspectorFilter}
              onChange={(e) => setInspectorFilter(e.target.value)}
              className="btn"
            >
              <option value="all">All Inspectors</option>
              {inspectors.map(inspector => (
                <option key={inspector} value={inspector}>{inspector}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="btn"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </>
        )}

        {viewMode === "inspector" && (
          <Text size="sm" fw={500} c="dimmed">Viewing as: {currentUser}</Text>
        )}

        <div style={{ marginLeft: "auto" }}>
          {/* Create button only for Supervisor */}
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
          events={filteredEvents}
          height="100%"
          // This enables the "Google Calendar" click behavior
          dateClick={handleDateClick}
          eventClick={handleEventClick}
          eventClassNames={(arg) => [arg.event.extendedProps?.status || ""]}
          // Ensures calendar resizes when sidebar toggles
          handleWindowResize={true}
          datesSet={(dateInfo) => setCurrentTitle(dateInfo.view.title)}
        />
      </div>

      {/* --- 1. THE GOOGLE STYLE POPOVER (Supervisor Create) --- */}
      <Popover
        opened={popoverOpened}
        onChange={setPopoverOpened}
        position="right-start"
        withArrow
        shadow="md"
        trapFocus
        closeOnClickOutside={false}
      >
        <Popover.Target>
          {/* This invisible div acts as the anchor point at your mouse click coordinates */}
          <div
            style={{
              position: 'fixed',
              top: clickPosition.y,
              left: clickPosition.x,
              width: 1,
              height: 1,
              pointerEvents: 'none'
            }}
          />
        </Popover.Target>

        <Popover.Dropdown p={0}>
          <AddInspectionForm
            onCancel={() => setPopoverOpened(false)}
            onSave={handleSaveEvent}
            initialDateISO={selectedDateISO}
            inspectors={inspectors}
          />
        </Popover.Dropdown>
      </Popover>

      {/* --- 2. CENTERED MODAL (Supervisor Create) --- */}
      <Modal opened={modalOpened} onClose={closeModal} withCloseButton={false} centered>
        <AddInspectionForm
          onCancel={closeModal}
          onSave={handleSaveEvent}
          initialDateISO={null}
          inspectors={inspectors}
        />
      </Modal>

      {/* --- 3. INSPECTOR DETAILS MODAL --- */}
      <Modal
        opened={inspectorModalOpened}
        onClose={closeInspectorModal}
        withCloseButton={false}
        centered
        title={null}
        padding={0}
        size="auto" // Let content dictate size
      >
        {selectedEvent && (
          <InspectorEventDetails
            event={selectedEvent}
            onUpdate={handleUpdateEvent}
            onClose={closeInspectorModal}
            viewMode={viewMode}
          />
        )}
      </Modal>

    </div>
  );
}