import React, { useState, useRef, useEffect, useMemo } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { Popover, Modal, Button } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import AddInspectionForm from "../components/calendar/AddInspectionEvent";
import "../components/calendar/calendar.css";

export default function InspectionCalendar() {
  const calendarRef = useRef(null);
  const containerRef = useRef(null); // Ref for the wrapper
  const [view, setView] = useState("dayGridMonth");

  // --- Popover Logic (Google Style) ---
  const [popoverOpened, setPopoverOpened] = useState(false);
  const [clickPosition, setClickPosition] = useState({ x: 0, y: 0 });
  const [selectedDateISO, setSelectedDateISO] = useState(null);

  // --- Modal Logic (For Mobile or "Create" button) ---
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);

  // --- Events Data ---
  const [userEvents, setUserEvents] = useState([]);
  const baseEvents = useMemo(() => ([
    { id: 1, title: "Inspection A", start: "2025-11-15T09:00", extendedProps: { inspector: "Inspector A", status: "pending" } },
    { id: 2, title: "Inspection B", start: "2025-11-16T14:00", extendedProps: { inspector: "Inspector B", status: "in-progress" } }
  ]), []);

  const allEvents = [...baseEvents, ...userEvents];

  // --- Filters ---
  const [inspectorFilter, setInspectorFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredEvents = useMemo(() => {
    return allEvents.filter(evt => {
      const mi = inspectorFilter === "all" || evt.extendedProps?.inspector === inspectorFilter;
      const ms = statusFilter === "all" || evt.extendedProps?.status === statusFilter;
      return mi && ms;
    });
  }, [allEvents, inspectorFilter, statusFilter]);

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

  const handleDateClick = (info) => {
    // 1. Capture coordinates
    const { clientX, clientY } = info.jsEvent;

    // 2. Set Date
    setSelectedDateISO(info.dateStr);

    // 3. Update position and Open Popover
    setClickPosition({ x: clientX, y: clientY });
    setPopoverOpened(true);
  };

  const handleSaveEvent = (newEvent) => {
    setUserEvents(prev => [...prev, newEvent]);
    setPopoverOpened(false);
    closeModal();
    // Refresh calendar view
    const api = calendarRef.current?.getApi();
    if (api && newEvent.start) api.gotoDate(newEvent.start);
  };

  const inspectors = ["Inspector A", "Inspector B", "Inspector C"];

  return (
    <div className="calendar-wrapper" ref={containerRef}>
      <div className="top-toolbar">
        <Button variant="default" onClick={() => calendarRef.current?.getApi().today()}>Today</Button>

        <select value={view} onChange={(e) => {
          setView(e.target.value);
          calendarRef.current?.getApi().changeView(e.target.value);
        }} className="btn">
          <option value="dayGridMonth">Month</option>
          <option value="timeGridWeek">Week</option>
          <option value="timeGridDay">Day</option>
        </select>

        {/* Inspector Filter */}
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

        {/* Status Filter */}
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

        <div style={{ marginLeft: "auto" }}>
          {/* The main Create button opens a centered Modal (Better UX for explicit create action) */}
          <Button onClick={() => { setSelectedDateISO(null); openModal(); }}>+ Create</Button>
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
          eventClassNames={(arg) => [arg.event.extendedProps?.status || ""]}
          // Ensures calendar resizes when sidebar toggles
          handleWindowResize={true}
        />
      </div>

      {/* --- 1. THE GOOGLE STYLE POPOVER --- */}
      <Popover
        opened={popoverOpened}
        onChange={setPopoverOpened}
        position="right-start"
        withArrow
        shadow="md"
        trapFocus
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

      {/* --- 2. CENTERED MODAL (For the top "Create" button) --- */}
      <Modal opened={modalOpened} onClose={closeModal} withCloseButton={false} centered>
        <AddInspectionForm
          onCancel={closeModal}
          onSave={handleSaveEvent}
          initialDateISO={null}
          inspectors={inspectors}
        />
      </Modal>

    </div>
  );
}