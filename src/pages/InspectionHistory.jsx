import React, { useState } from "react";
import {
    Button,
    TextInput,
    Card,
    ScrollArea,
    Checkbox,
    Select,
    Pagination,
    Text,
    Title,
    Group,
    Stack,
    Box,
    Paper,
    Badge
} from "@mantine/core";
import { Download, Search, FileText, Calendar, User, X, ArrowLeft, Split } from "lucide-react";

const mockReports = [
    {
        id: "INS-RPT-001",
        equipment: "PV-101",
        type: "Visual",
        inspector: "Farid",
        date: "2025-10-12",
        pdf: "/pdfs/report1.pdf",
    },
    {
        id: "INS-RPT-002",
        equipment: "HX-220",
        type: "UT",
        inspector: "Amin",
        date: "2025-10-18",
        pdf: "/pdfs/report2.pdf",
    },
    {
        id: "INS-RPT-003",
        equipment: "TK-300",
        type: "Internal",
        inspector: "Siti",
        date: "2025-11-02",
        pdf: "/pdfs/report3.pdf",
    },
    {
        id: "INS-RPT-004",
        equipment: "TK-301",
        type: "External",
        inspector: "Siti",
        date: "2025-11-05",
        pdf: "/pdfs/report3.pdf",
    },
    {
        id: "INS-RPT-005",
        equipment: "PV-102",
        type: "Visual",
        inspector: "Farid",
        date: "2025-11-10",
        pdf: "/pdfs/report1.pdf",
    },
    {
        id: "INS-RPT-006",
        equipment: "HX-221",
        type: "UT",
        inspector: "Amin",
        date: "2025-11-12",
        pdf: "/pdfs/report2.pdf",
    },
    {
        id: "INS-RPT-007",
        equipment: "HX-221",
        type: "UT",
        inspector: "Amin",
        date: "2025-11-13",
        pdf: "/pdfs/report3.pdf",
    },
];

export default function InspectionReportHistory() {
    const [selected, setSelected] = useState(null);
    const [search, setSearch] = useState("");

    // Filters
    const [filterType, setFilterType] = useState("all");
    const [filterInspector, setFilterInspector] = useState("all");
    const [filterEquipment, setFilterEquipment] = useState("");

    // Pagination
    const itemsPerPage = 5;
    const [page, setPage] = useState(1);

    // Select multiple reports
    const [selectedReports, setSelectedReports] = useState([]);

    // Equipment Selection Logic
    const [selectedEquipment, setSelectedEquipment] = useState(null);

    // Group reports by equipment for the dashboard view
    const equipmentStats = React.useMemo(() => {
        const stats = {};
        mockReports.forEach(r => {
            if (!stats[r.equipment]) {
                stats[r.equipment] = { count: 0, latest: r.date, type: r.type };
            }
            stats[r.equipment].count += 1;
            // Keep track of latest date
            if (new Date(r.date) > new Date(stats[r.equipment].latest)) {
                stats[r.equipment].latest = r.date;
            }
        });
        return Object.entries(stats).map(([name, data]) => ({ name, ...data }));
    }, []);


    // Toggle Selection for Comparison/Export
    const toggleSelect = (id) => {
        setSelectedReports((prev) =>
            prev.includes(id)
                ? prev.filter((x) => x !== id)
                : [...prev, id]
        );
    };

    // Filter logic for the Report List
    const filteredReports = mockReports
        .filter((r) =>
            (r.id + r.equipment + r.inspector + r.type)
                .toLowerCase()
                .includes(search.toLowerCase())
        )
        .filter((r) => (filterType === "all" || !filterType ? true : r.type === filterType))
        .filter((r) =>
            (filterInspector === "all" || !filterInspector ? true : r.inspector === filterInspector)
        );
    // Note: Equipment filter is handled by 'displayedReports' later

    const exportSelected = () => {
        alert("Exporting selected reports: " + selectedReports.join(", "));
    };

    // Comparison logic
    const [isComparing, setIsComparing] = useState(false);

    const handleCompare = () => {
        setIsComparing(true);
        setSelected(null);
    };

    const handleBackFromCompare = () => {
        setIsComparing(false);
    };

    // Derived state for comparison
    const compareReport1 = mockReports.find(r => r.id === selectedReports[0]);
    const compareReport2 = mockReports.find(r => r.id === selectedReports[1]);


    // ---- RENDER: EQUIPMENT LIST (Home View) ----
    if (!selectedEquipment) {
        return (
            <div style={{ padding: '2rem', height: 'calc(100vh - 60px)', overflowY: 'auto', backgroundColor: '#f8f9fa' }}>
                <Title order={2} mb="lg">Select Equipment</Title>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                    gap: '1.5rem'
                }}>
                    {equipmentStats.map((eq) => (
                        <Paper
                            key={eq.name}
                            p="xl"
                            radius="md"
                            withBorder
                            onClick={() => setSelectedEquipment(eq.name)}
                            style={{ cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-4px)';
                                e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = 'none';
                            }}
                        >
                            <Group justify="space-between" mb="xs">
                                <Text size="xl" fw={700} c="blue">{eq.name}</Text>
                                <Badge size="lg" variant="light" color="gray">{eq.count} Reports</Badge>
                            </Group>
                            <Group gap="xs" mt="md">
                                <Calendar size={16} className="text-gray-500" />
                                <Text size="sm" c="dimmed">Latest: {eq.latest}</Text>
                            </Group>
                            <Button fullWidth mt="md" variant="light" rightSection={<ArrowLeft size={16} style={{ rotate: '180deg' }} />}>
                                View History
                            </Button>
                        </Paper>
                    ))}
                </div>
            </div>
        );
    }

    // ---- RENDER: COMPARISON VIEW ----
    if (isComparing && compareReport1 && compareReport2) {
        return (
            <div style={{ height: 'calc(100vh - 60px)', display: 'flex', flexDirection: 'column', backgroundColor: '#f8f9fa' }}>
                <Paper p="md" shadow="xs" style={{ borderBottom: '1px solid #e5e7eb', zIndex: 10 }}>
                    <Group justify="space-between">
                        <Group>
                            <Button variant="subtle" leftSection={<ArrowLeft size={16} />} onClick={handleBackFromCompare}>
                                Back to Reports
                            </Button>
                            <Title order={4}>Comparison Mode</Title>
                        </Group>
                        {/* ... (comparison header details) */}
                    </Group>
                </Paper>
                {/* ... (comparison panels) */}
                <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRight: '1px solid #e5e7eb' }}>
                        <iframe src={compareReport1.pdf} style={{ width: '100%', height: '100%', border: 'none' }} title="Report 1" />
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <iframe src={compareReport2.pdf} style={{ width: '100%', height: '100%', border: 'none' }} title="Report 2" />
                    </div>
                </div>
            </div>
        );
    }


    // ---- RENDER: REPORT LIST (Filtered by Equipment) ----
    const displayedReports = filteredReports.filter(r => r.equipment === selectedEquipment);
    const totalPagesFiltered = Math.ceil(displayedReports.length / itemsPerPage);
    const paginatedFiltered = displayedReports.slice((page - 1) * itemsPerPage, page * itemsPerPage);

    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: selected ? 'minmax(400px, 40%) 1fr' : '1fr 0px',
            height: 'calc(100vh - 60px)',
            width: '100%',
            overflow: 'hidden',
            backgroundColor: '#f8f9fa',
            transition: 'grid-template-columns 300ms ease'
        }}>
            {/* LEFT SIDE: LIST */}
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                borderRight: selected ? '1px solid #e5e7eb' : 'none',
                backgroundColor: 'white',
                overflow: 'hidden',
                padding: '1rem',
                minWidth: 0
            }}>
                <Group justify="space-between" mb="md">
                    <Group>
                        <Button variant="subtle" size="xs" onClick={() => setSelectedEquipment(null)} leftSection={<ArrowLeft size={14} />}>
                            Back
                        </Button>
                        <Title order={4}>{selectedEquipment} History</Title>
                    </Group>
                    <Badge variant="light" size="lg">{displayedReports.length} found</Badge>
                </Group>

                {/* Search & Utility */}
                <Group gap="xs" mb="sm">
                    {/* ... (Search inputs) */}
                    <TextInput placeholder="Search..." style={{ flex: 1 }} value={search} onChange={(e) => setSearch(e.target.value)} />
                    {/* ... (Export/Compare Buttons) */}
                    <Button variant="subtle" size="xs" onClick={exportSelected} leftSection={<Download size={14} />}>Export</Button>
                    <Button variant="filled" size="xs" disabled={selectedReports.length !== 2} onClick={handleCompare} leftSection={<Split size={14} />}>Compare</Button>
                </Group>

                {/* Filters (Removed Equipment Filter as we are already filtered) */}
                <Stack gap="sm" mb="md">
                    <Group grow>
                        <Select placeholder="Type" value={filterType} onChange={setFilterType} data={['all', 'Visual', 'UT', 'Internal']} />
                        <Select placeholder="Inspector" value={filterInspector} onChange={setFilterInspector} data={['all', 'Farid', 'Amin', 'Siti']} />
                    </Group>
                </Stack>

                {/* Scrollable List */}
                <ScrollArea style={{ flex: 1, margin: '0 -1rem' }} px="1rem">
                    <Stack gap="xs" pb="md">
                        {paginatedFiltered.map((report) => (
                            <Paper key={report.id} p="sm" withBorder onClick={() => setSelected(report)} style={{ cursor: 'pointer', borderColor: selected?.id === report.id ? '#228be6' : '#e5e7eb', backgroundColor: selected?.id === report.id ? '#e7f5ff' : 'white' }}>
                                <Group align="flex-start" wrap="nowrap">
                                    <Checkbox checked={selectedReports.includes(report.id)} onChange={() => toggleSelect(report.id)} onClick={(e) => e.stopPropagation()} mt={4} />
                                    <div style={{ flex: 1 }}>
                                        <Group justify="space-between" mb={4}>
                                            <Text fw={600} size="sm">{report.id}</Text>
                                            <Badge size="sm" variant="outline">{report.type}</Badge>
                                        </Group>
                                        <Group gap="lg">
                                            <Group gap={4}><User size={14} /><Text size="xs">{report.inspector}</Text></Group>
                                            <Group gap={4}><Calendar size={14} /><Text size="xs">{report.date}</Text></Group>
                                        </Group>
                                    </div>
                                </Group>
                            </Paper>
                        ))}
                    </Stack>
                </ScrollArea>

                <Group justify="center" mt="auto" pt="sm" style={{ borderTop: '1px solid #f3f4f6' }}>
                    <Pagination total={totalPagesFiltered} value={page} onChange={setPage} size="sm" />
                </Group>
            </div>

            {/* RIGHT SIDE: PREVIEW */}
            <div style={{
                display: 'flex', flexDirection: 'column', backgroundColor: '#f8f9fa', overflow: 'hidden',
                padding: selected ? '1.5rem' : '0', borderLeft: selected ? '1px solid #e5e7eb' : 'none'
            }}>
                {selected && (
                    <Paper shadow="sm" radius="md" p="md" style={{ display: 'flex', flexDirection: 'column', height: '100%', minWidth: '400px' }}>
                        <Group justify="space-between" mb="md">
                            <Title order={4}>Report Preview</Title>
                            <Button variant="subtle" onClick={() => setSelected(null)}><X size={20} /></Button>
                        </Group>
                        <iframe src={selected.pdf} style={{ width: '100%', height: '100%', border: 'none' }} />
                    </Paper>
                )}
            </div>
        </div>
    );
}
