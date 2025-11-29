// AddInspectionPanel.jsx
import React, { useEffect, useState } from "react";
import "./AddInspectionEvent.css";

export default function AddInspectionEvent({
  isOpen,
  onClose,
  onSave,
  initialDateISO = null, // string like '2025-11-15' or '2025-11-15T09:00'
  inspectors = [], // array of inspector names
}) {
  const [title, setTitle] = useState("");
  const [inspector, setInspector] = useState(inspectors[0] || "");
  const [allDay, setAllDay] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("10:00");
  const [status, setStatus] = useState("pending");
  const [color, setColor] = useState("#1a73e8");
  const [description, setDescription] = useState("");

  // populate initial date when opened
  useEffect(() => {
    if (!isOpen) return;
    // If initialDateISO includes time, split
    if (!initialDateISO) {
      const d = new Date();
      const iso = d.toISOString().split("T")[0];
      setStartDate(iso);
      setEndDate(iso);
    } else {
      const [datePart, timePart] = initialDateISO.split("T");
      if (datePart) {
        setStartDate(datePart);
        setEndDate(datePart);
      }
      if (timePart) {
        const hhmm = timePart.slice(0,5);
        setStartTime(hhmm);
        // default end = +1 hour
        const [h, m] = hhmm.split(":").map(Number);
        const endH = String((h + 1).toString()).padStart(2, "0");
        setEndTime(`${endH}:${m.toString().padStart(2, "0")}`);
      } else {
        setStartTime("09:00");
        setEndTime("10:00");
      }
    }

    // reset other fields for new open
    setTitle("");
    setInspector(inspectors[0] || "");
    setAllDay(false);
    setStatus("pending");
    setColor("#1a73e8");
    setDescription("");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialDateISO]);

  const handleSave = () => {
    if (!title.trim()) {
      alert("Please enter a title for the inspection.");
      return;
    }

    // Build ISO datetimes
    let startISO, endISO;
    if (allDay) {
      // FullCalendar all-day event: start date only (no time)
      startISO = startDate;
      // FullCalendar treats end as exclusive; set end to next day to show single-day all-day
      const endDt = new Date(endDate);
      endDt.setDate(endDt.getDate() + 1);
      endISO = endDt.toISOString().split("T")[0];
    } else {
      startISO = `${startDate}T${startTime}`;
      endISO = `${endDate}T${endTime}`;
    }

    const newEvent = {
      id: `user-${Date.now()}`,
      title: title + (inspector ? ` (${inspector})` : ""),
      start: startISO,
      end: endISO,
      allDay: !!allDay,
      extendedProps: {
        inspector,
        status,
        description,
      },
      backgroundColor: color,
      borderColor: color,
    };

    onSave(newEvent);
    onClose();
  };


  return (
      <aside className={`add-panel ${isOpen ? "slide-in" : ""}`}>
        <div className="panel-header">
          <h3>Create inspection</h3>
          <button className="panel-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="panel-body">
          <label className="label">Title</label>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Inspection title" />

          <label className="label">Inspector</label>
          <select className="input" value={inspector} onChange={(e) => setInspector(e.target.value)}>
            <option value="">(Unassigned)</option>
            {inspectors.map((ins, idx) => <option key={idx} value={ins}>{ins}</option>)}
          </select>

          <div className="row">
            <label className="label-inline">
              <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} /> All day
            </label>
          </div>

          <div className="datetime-grid">
            <div>
              <label className="label">Start</label>
              <input className="input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              {!allDay && <input className="input time" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />}
            </div>

            <div>
              <label className="label">End</label>
              <input className="input" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              {!allDay && <input className="input time" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />}
            </div>
          </div>

          <label className="label">Status</label>
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="pending">Pending</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>

          <label className="label">Color</label>
          <div className="color-picker">
            {["#1a73e8","#f44336","#fdd835","#66bb6a","#8e24aa","#ff7043"].map((c) => (
              <button
                key={c}
                className={`color-swatch ${c===color ? "active" : ""}`}
                style={{ background: c }}
                onClick={() => setColor(c)}
                aria-label={c}
              />
            ))}
          </div>

          <label className="label">Description</label>
          <textarea className="input textarea" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Notes, location, checklist..." />
        </div>

        <div className="panel-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSave}>Save</button>
        </div>
      </aside>
  );
}
