// InspectionCalendar.jsx
import React, { useState, useRef, useEffect, useMemo } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import AddInspectionEvent from "../components/calendar/AddInspectionEvent";
import "../components/calendar/calendar.css"; 

export default function InspectionCalendar() {
  const calendarRef = useRef(null);
  const [view, setView] = useState("dayGridMonth");
  const [selectedDate, setSelectedDate] = useState("");
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelDateISO, setPanelDateISO] = useState(null);
  const [userEvents, setUserEvents] = useState([]);

  useEffect(() => {
    const api = calendarRef.current?.getApi();
    if (api) {
       
        const timeout = setTimeout(() => {
            api.updateSize();
        }, 260); //

        return () => clearTimeout(timeout);
    }
    }, [panelOpen]);


  const baseEvents = useMemo(() => ([
    {
      id: 1, title: "Inspection A", start: "2025-11-15T09:00",
      extendedProps: { inspector: "Inspector A", status: "pending" }
    },
    {
      id: 2, title: "Inspection B", start: "2025-11-16T14:00",
      extendedProps: { inspector: "Inspector B", status: "in-progress" }
    }
  ]), []);

  const allEvents = [...baseEvents, ...userEvents];


  const [inspectorFilter, setInspectorFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");

  const filteredEvents = useMemo(() => {
    return allEvents.filter(evt => {
      const mi = inspectorFilter === "all" || evt.extendedProps?.inspector === inspectorFilter;
      const ms = statusFilter === "all" || evt.extendedProps?.status === statusFilter;
      const md = !dateFilter || evt.start.startsWith(dateFilter);
      return mi && ms && md;
    });
  }, [allEvents, inspectorFilter, statusFilter, dateFilter]);


  useEffect(() => {
    const api = calendarRef.current?.getApi();
    if (api) api.changeView(view);
  }, [view]);

  // date click opens panel and pre-fills the date
  const handleDateClick = (info) => {
    // info.dateStr is YYYY-MM-DD when clicking a day cell
    setPanelDateISO(info.dateStr);
    setPanelOpen(true);
  };

  // toolbar add button
  const openCreatePanel = () => {
    setPanelDateISO(null);
    setPanelOpen(true);
  };

  // save event from panel
  const handleSaveEvent = (newEvent) => {
    // optionally you can normalize newEvent before adding
    setUserEvents(prev => [...prev, newEvent]);
    // jump to created date
    try {
      const api = calendarRef.current?.getApi();
      if (api && newEvent.start) api.gotoDate(newEvent.start);
    } catch (e) {}
  };


  // sample inspectors list 
  const inspectors = ["Inspector A", "Inspector B", "Inspector C"];

  return (
    <div className="calendar-wrapper">
      <div className="top-toolbar">
        <button className="btn" onClick={() => {
            const today = new Date().toISOString().split("T")[0];
            setDateFilter(today);
            const api = calendarRef.current?.getApi(); if (api) api.gotoDate(today);
        }}>Today</button>

        <select value={view} onChange={(e) => setView(e.target.value)} className="btn">
          <option value="dayGridMonth">Month</option>
          <option value="timeGridWeek">Week</option>
          <option value="timeGridDay">Day</option>
        </select>

        <input type="date" className="date-input" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />

        <select className="btn" value={inspectorFilter} onChange={(e) => setInspectorFilter(e.target.value)}>
          <option value="all">All Inspectors</option>
          {inspectors.map((ins) => <option key={ins} value={ins}>{ins}</option>)}
        </select>

        <select className="btn" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="in-progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>

        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button className="btn btn-primary" onClick={openCreatePanel}>+ Create</button>
        </div>
      </div>

    <div className="main-content-area">

        <AddInspectionEvent
          isOpen={panelOpen}
          onClose={() => setPanelOpen(false)}
          onSave={handleSaveEvent}
          initialDateISO={panelDateISO}
          inspectors={inspectors}
        />
      
      <div className="calendar-container">
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView={view}
            headerToolbar={false}
            events={filteredEvents}
            height="100%"
            dateClick={handleDateClick}
            eventClassNames={(arg) => [arg.event.extendedProps?.status || ""]}
          />
        </div>

      </div>   
      </div>
  );
}
