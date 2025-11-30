import React, { useEffect, useState } from "react";
import { 
  TextInput, Select, Checkbox, Textarea, Group, Button, 
  ActionIcon, Stack, Text, Box
} from "@mantine/core";
import { IconCheck, IconX } from "@tabler/icons-react";

// This component is now just the UI Form. 
// It doesn't know about Modals or Popovers.
export default function AddInspectionForm({
  onCancel,
  onSave,
  initialDateISO = null,
  inspectors = [],
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

  const swatches = ["#1a73e8", "#f44336", "#fdd835", "#66bb6a", "#8e24aa", "#ff7043"];

  useEffect(() => {
    // Initialize Dates
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
    
    // Reset Form
    setTitle("");
    setInspector(inspectors[0] || "");
    setAllDay(false);
    setStatus("pending");
    setColor("#1a73e8");
    setDescription("");
  }, [initialDateISO, inspectors]);

  const handleSave = () => {
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

    const newEvent = {
      id: `user-${Date.now()}`,
      title: title + (inspector ? ` (${inspector})` : ""),
      start: startISO,
      end: endISO,
      allDay: !!allDay,
      extendedProps: { inspector, status, description },
      backgroundColor: color,
      borderColor: color,
    };

    onSave(newEvent);
  };

  return (
    <Box w={380} p="md"> {/* Fixed width card like Google Calendar */}
      <Stack gap="sm">
        <Group justify="space-between">
           <Text fw={600} size="lg">Add Inspection</Text>
           <ActionIcon variant="subtle" color="gray" onClick={onCancel}>
             <IconX size={18}/>
           </ActionIcon>
        </Group>
      
        <TextInput
          placeholder="Add title and inspector"
          data-autofocus
          size="md"
          variant="filled"
          value={title}
          onChange={(e) => setTitle(e.currentTarget.value)}
        />

        <Group grow>
           <TextInput type="date" value={startDate} onChange={(e) => setStartDate(e.currentTarget.value)} />
           {!allDay && <TextInput type="time" value={startTime} onChange={(e) => setStartTime(e.currentTarget.value)} />}
        </Group>

        <Checkbox 
            label="All day" 
            checked={allDay} 
            onChange={(e) => setAllDay(e.currentTarget.checked)} 
            size="xs"
        />

        <Select
          data={inspectors}
          value={inspector}
          onChange={setInspector}
          placeholder="Assign Inspector"
          searchable
        />

        <Group gap="xs">
          {swatches.map((c) => (
            <ActionIcon 
              key={c} 
              color={c} 
              variant={color === c ? "filled" : "subtle"}
              onClick={() => setColor(c)}
              size="sm"
              radius="xl"
            >
              <IconCheck size={12} style={{ opacity: color === c ? 1 : 0 }} />
            </ActionIcon>
          ))}
        </Group>

        <Textarea
          placeholder="Add description..."
          minRows={2}
          value={description}
          onChange={(e) => setDescription(e.currentTarget.value)}
        />

        <Group justify="flex-end" mt="xs">
          <Button variant="default" size="xs" onClick={onCancel}>Cancel</Button>
          <Button onClick={handleSave} size="xs">Save</Button>
        </Group>
      </Stack>
    </Box>
  );
}