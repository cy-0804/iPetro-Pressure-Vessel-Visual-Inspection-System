import React, { useState, useEffect } from 'react';
import { TextInput, Select, NumberInput, Button, Group, Stack, Textarea, Text } from '@mantine/core';
import { inspectionService } from '../../services/inspectionService';
import { getEquipments } from '../../services/equipmentService';
import { userService } from '../../services/userService';

export default function CreateInspectionPlanForm({ onSaved, onCancel, initialDate, initialData }) {
    const [loading, setLoading] = useState(false);
    const [equipmentList, setEquipmentList] = useState([]);
    const [inspectors, setInspectors] = useState([]);


    const [asset, setAsset] = useState(initialData?.extendedProps?.equipmentId || null);
    const [title, setTitle] = useState(initialData?.title || '');
    const [inspectionType, setInspectionType] = useState(initialData?.extendedProps?.inspectionType || 'Visual');
    const [riskCategory, setRiskCategory] = useState(initialData?.extendedProps?.priority || 'Medium');
    const [location, setLocation] = useState(initialData?.extendedProps?.location || '');


    const [lastInspectionDate, setLastInspectionDate] = useState(null);
    const [intervalMonths, setIntervalMonths] = useState(12);


    const [windowStart, setWindowStart] = useState(initialData?.start ? new Date(initialData.start) : (initialDate ? new Date(initialDate) : null));
    const [windowEnd, setWindowEnd] = useState(initialData?.end ? new Date(initialData.end) : (initialDate ? new Date(initialDate) : null));

    const [scope, setScope] = useState(initialData?.extendedProps?.description || '');

    const [selectedInspector, setSelectedInspector] = useState(
        (initialData?.extendedProps?.inspectors && initialData.extendedProps.inspectors.length > 0)
            ? initialData.extendedProps.inspectors[0]
            : (initialData?.extendedProps?.inspector || '')
    );


    const calculateDueDate = (lastDate, interval) => {
        if (!lastDate || !interval) return "";
        const d = new Date(lastDate);
        d.setMonth(d.getMonth() + Number(interval));
        return d.toLocaleDateString(); // Display only
    };


    useEffect(() => {
        async function loadData() {
            const eqs = await getEquipments();
            const usrs = await userService.getInspectors();
            setEquipmentList(eqs.map(e => ({ value: e.tagNumber, label: e.tagNumber })));

            const inspectorUsers = usrs.filter(u => u.role === 'inspector');

            const uniqueInspectors = new Map();
            inspectorUsers.forEach(u => {
                const val = u.username || u.email;
                if (val && !uniqueInspectors.has(val)) {
                    uniqueInspectors.set(val, {
                        value: val,
                        label: (u.firstName && u.lastName)
                            ? `${u.firstName} ${u.lastName}`
                            : (u.fullName || u.username || u.email)
                    });
                }
            });
            setInspectors(Array.from(uniqueInspectors.values()));
        }
        loadData();
    }, []);

    const handleSubmit = async () => {
        if (!asset || !windowStart || !windowEnd || !title || !location || !selectedInspector) {
            alert("Please fill in required fields: Asset, Title, Location, Start Date, End Date, Inspector");
            return;
        }

        setLoading(true);
        try {
            const wStartObj = new Date(windowStart);
            const wEndObj = new Date(windowEnd);

            if (isNaN(wStartObj.getTime()) || isNaN(wEndObj.getTime())) {
                alert("Invalid Dates");
                setLoading(false);
                return;
            }

            if (wEndObj < wStartObj) {
                alert("End Date must be after Start Date");
                setLoading(false);
                return;
            }


            const planData = {
                title: title,
                start: wStartObj.toISOString().split("T")[0],
                end: wEndObj.toISOString().split("T")[0],

                // Root level fields for Dashboard Query Compatibility
                inspectors: selectedInspector ? [selectedInspector] : [],
                inspector: selectedInspector || "Unassigned",

                riskCategory,
                inspectionType: 'Visual',
                scope,
                interval: 12,


                inspectionWindowStart: wStartObj.toISOString(),
                inspectionWindowEnd: wEndObj.toISOString(),

                reportDueDate: new Date(wEndObj.setMonth(wEndObj.getMonth() + 1)).toISOString(),

                extendedProps: {
                    equipmentId: asset,
                    // Keep these for backward compatibility if needed, but root level is now primary for queries
                    inspectors: selectedInspector ? [selectedInspector] : [],
                    inspector: selectedInspector || "Unassigned",
                    status: initialData?.extendedProps?.status || "PLANNED",
                    description: scope,
                    priority: riskCategory,
                    location: location
                }
            };

            if (initialData && initialData.id) {
                await inspectionService.updateInspectionPlan(initialData.id, planData);
                if (onSaved) onSaved({ ...planData, id: initialData.id });
            } else {
                const newId = await inspectionService.addInspectionPlan(planData);
                if (onSaved) onSaved({ ...planData, id: newId });
            }
        } catch (e) {
            console.error("Error saving plan:", e);
            alert(`Failed to save plan: ${e.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Stack>
            <Select
                label="Select Asset"
                placeholder="Search for equipment"
                data={equipmentList}
                searchable
                value={asset}
                onChange={setAsset}
                required
            />

            <TextInput
                label="Inspection Title"
                placeholder="e.g. Annual Visual Inspection"
                value={title}
                onChange={(e) => setTitle(e.currentTarget.value)}
                required
            />

            <TextInput
                label="Location"
                placeholder="e.g. Building A, Floor 2"
                value={location}
                onChange={(e) => setLocation(e.currentTarget.value)}
                required
            />

            <Group grow>
                <Select
                    label="Risk Category"
                    data={['Low', 'Medium', 'High', 'Critical']}
                    value={riskCategory}
                    onChange={setRiskCategory}
                    required
                />
            </Group>

            <Group grow>
                <TextInput
                    type="date"
                    label="Start Date"
                    placeholder="Plan start"
                    value={windowStart ? new Date(windowStart).toISOString().split('T')[0] : ''}
                    onChange={(e) => setWindowStart(e.currentTarget.value ? new Date(e.currentTarget.value) : null)}
                    min={new Date().toISOString().split('T')[0]}
                    required
                />
                <TextInput
                    type="date"
                    label="End Date"
                    placeholder="Plan end"
                    value={windowEnd ? new Date(windowEnd).toISOString().split('T')[0] : ''}
                    onChange={(e) => setWindowEnd(e.currentTarget.value ? new Date(e.currentTarget.value) : null)}
                    min={windowStart ? new Date(windowStart).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}
                    required
                />
            </Group>

            <Select
                label="Assign Inspector"
                placeholder="Select inspector"
                data={Array.from(new Map(inspectors.map(i => [i.value, i])).values())}
                value={selectedInspector}
                onChange={setSelectedInspector}
                searchable
                required
            />

            <Textarea
                label="Scope of Work / Notes"
                placeholder="Describe inspection scope..."
                value={scope}
                onChange={(e) => setScope(e.currentTarget.value)}
                minRows={3}
            />

            <Group justify="flex-end" mt="md">
                <Button variant="default" onClick={onCancel}>Cancel</Button>
                <Button onClick={handleSubmit} loading={loading}>Create Plan</Button>
            </Group>
        </Stack>
    );
}
