import React, { useEffect, useState } from "react";
import {
  TextInput, Select, Checkbox, Textarea, Group, Button,
  ActionIcon, Stack, Text, Box, ColorSwatch
} from "@mantine/core";
import { IconCheck, IconX } from "@tabler/icons-react";

// This component is now just the UI Form. 
// It doesn't know about Modals or Popovers.
export default function AddInspectionForm({
  onCancel,
  onSave,
  initialDateISO = null,
  inspectors = [],
  initialEvent = null,
  readOnly = false
}) {
  const [title, setTitle] = useState("");
  const [equipmentId, setEquipmentId] = useState("");
  const [inspector, setInspector] = useState(inspectors[0] || "");
  const [allDay, setAllDay] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("10:00");
  const [status, setStatus] = useState("pending");
  const [color, setColor] = useState("#1a73e8");
  const [description, setDescription] = useState("");

  const swatches = ["#1a73e8", "#f44336", "#fdd835", "#66bb6a", "#8e24aa", "#ff7043"];

  useEffect(() => {
    if (initialEvent) {
      // Populate form from existing event
      setTitle(initialEvent.title || "");
      setEquipmentId(initialEvent.extendedProps?.equipmentId || "");
      setInspector(initialEvent.extendedProps?.inspector || inspectors[0] || "");
      setStatus(initialEvent.extendedProps?.status || "pending");
      setDescription(initialEvent.extendedProps?.description || "");
      setColor(initialEvent.backgroundColor || "#1a73e8");
      setAllDay(initialEvent.allDay);

      if (initialEvent.start) {
        const startObj = new Date(initialEvent.start);
        setStartDate(startObj.toISOString().split("T")[0]);
        setStartTime(startObj.toTimeString().slice(0, 5));
      }
      if (initialEvent.end) {
        const endObj = new Date(initialEvent.end);
        setEndDate(endObj.toISOString().split("T")[0]);
        setEndTime(endObj.toTimeString().slice(0, 5));
      } else if (initialEvent.start) {
        // If no end, assume same day 1 hour later or whatever default
        const startObj = new Date(initialEvent.start);
        setEndDate(startObj.toISOString().split("T")[0]);
        setEndTime(startObj.toTimeString().slice(0, 5));
      }

    } else {
      // Initialize New Event Dates
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
          const hhmm = timePart.slice(0, 5);
          setStartTime(hhmm);
          // Default 1 hour duration
          const [h, m] = hhmm.split(":").map(Number);
          const endH = String((h + 1).toString()).padStart(2, "0");
          setEndTime(`${endH}:${m.toString().padStart(2, "0")}`);
        } else {
          setStartTime("09:00");
          setEndTime("10:00");
        }
      }

      // Reset Form Defaults
      setTitle("");
      setEquipmentId("");
      setInspector(inspectors[0] || "");
      setAllDay(false);
      setStatus("pending");
      setColor("#1a73e8");
      setDescription("");
    }
  }, [initialDateISO, inspectors, initialEvent]);

  const handleSave = () => {
    if (readOnly) return;
    if (!title.trim()) {
      alert("Please enter a title");
      return;
    }

    let startISO, endISO;
    if (allDay) {
      startISO = startDate;
      const endDt = new Date(endDate);
      endDt.setDate(endDt.getDate() + 1);
      endISO = endDt.toISOString().split("T")[0];
    } else {
      startISO = `${startDate}T${startTime}`;
      endISO = `${endDate}T${endTime}`;
    }

    const updatedEvent = {
      id: initialEvent ? initialEvent.id : `user-${Date.now()}`,
      title: title + (inspector ? ` (${inspector})` : ""),
      start: startISO,
      end: endISO,
      allDay: !!allDay,
      extendedProps: {
        ...initialEvent?.extendedProps,
        inspector,
        status,
        description,
        equipmentId
      },
      backgroundColor: color,
      borderColor: color,
    };

    onSave(updatedEvent);
  };

  return (
    <Box w={400} p="md"> {/* Increased width slightly */}
      <Stack gap="sm">
        {!initialEvent && (
          <Group justify="space-between">
            <Text fw={600} size="lg">Add Inspection</Text>
            <ActionIcon variant="subtle" color="gray" onClick={onCancel}>
              <IconX size={18} />
            </ActionIcon>
          </Group>
        )}

        <TextInput
          label="Title"
          placeholder="Inspection Title"
          data-autofocus={!initialEvent}
          size="sm"
          value={title}
          onChange={(e) => setTitle(e.currentTarget.value)}
          readOnly={readOnly}
        />

        <TextInput
          label="Equipment ID"
          placeholder="e.g. EQ-12345"
          size="sm"
          value={equipmentId}
          onChange={(e) => setEquipmentId(e.currentTarget.value)}
          readOnly={readOnly}
        />

        <Select
          label="Assigned Inspector"
          data={inspectors}
          value={inspector}
          onChange={setInspector}
          placeholder="Select Inspector"
          searchable
          size="sm"
          disabled={readOnly}
        />

        <Group grow>
          <TextInput label="Start Date" type="date" value={startDate} onChange={(e) => setStartDate(e.currentTarget.value)} size="sm" readOnly={readOnly} />
          {!allDay && <TextInput label="Start Time" type="time" value={startTime} onChange={(e) => setStartTime(e.currentTarget.value)} size="sm" readOnly={readOnly} />}
        </Group>

        <Group grow>
          <TextInput label="End Date" type="date" value={endDate} onChange={(e) => setEndDate(e.currentTarget.value)} size="sm" readOnly={readOnly} />
          {!allDay && <TextInput label="End Time" type="time" value={endTime} onChange={(e) => setEndTime(e.currentTarget.value)} size="sm" readOnly={readOnly} />}
        </Group>

        <Checkbox
          label="All day"
          checked={allDay}
          onChange={(e) => setAllDay(e.currentTarget.checked)}
          size="xs"
          disabled={readOnly}
        />

        <Group gap="xs">
          <Text size="sm" fw={500}>Color:</Text>
          {swatches.map((c) => (
            <ColorSwatch
              key={c}
              component="button"
              color={c}
              onClick={() => !readOnly && setColor(c)}
              size={26}
              radius="xl"
              style={{
                color: '#fff',
                cursor: readOnly ? 'default' : 'pointer',
                border: color === c ? '2px solid white' : 'none',
                outline: color === c ? `2px solid ${c}` : 'none',
                opacity: readOnly && color !== c ? 0.3 : 1
              }}
            >
              {color === c && <IconCheck size={14} />}
            </ColorSwatch>
          ))}
        </Group>

        <Textarea
          label="Description"
          placeholder="Add description..."
          minRows={3}
          value={description}
          onChange={(e) => setDescription(e.currentTarget.value)}
          size="sm"
          readOnly={readOnly}
        />

        {!readOnly && (
          <Group gap="xs" style={{ marginLeft: 'auto' }}>
            {onCancel && <Button variant="default" size="xs" onClick={onCancel}>Cancel</Button>}
            <Button onClick={handleSave} size="xs">Save</Button>
          </Group>
        )}
      </Stack>
    </Box>
  );
}