import React, { useEffect, useState, useRef } from "react";
import { db } from "../firebase";
import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import {
  Container,
  Title,
  Text,
  Paper,
  Table,
  Button,
  Group,
  Badge,
  ActionIcon,
  Modal,
  Stack,
  Box,
  SimpleGrid,
  Textarea,
  TextInput,
  Image,
  Divider,
  Loader
} from "@mantine/core";
import { IconPrinter, IconEye, IconArrowLeft, IconFileText } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;

const ReportGeneration = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);
  
  // Fetch Completed Reports
  useEffect(() => {
    const fetchReports = async () => {
      try {
        const q = query(
          collection(db, "inspections"), 
          where("status", "in", ["Completed", "Draft"]) 
        );
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Client-side sort (descending order by updatedAt)
        data.sort((a, b) => {
             const timeA = a.updatedAt?.seconds || 0;
             const timeB = b.updatedAt?.seconds || 0;
             return timeB - timeA;
        });

        setReports(data);
      } catch (error) {
        console.error("Error fetching reports:", error);
        notifications.show({ title: "Error", message: "Failed to load reports", color: "red" });
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, []);

  if (selectedReport) {
      return (
          <ReportEditor 
            report={selectedReport} 
            onBack={() => setSelectedReport(null)} 
          />
      );
  }

  return (
    <Container size="xl" py="xl">
      <Title order={2} mb="lg">Report Generation</Title>
      
      {loading ? (
          <Group justify="center"><Loader /></Group>
      ) : (
        <Paper withBorder shadow="sm" radius="md" overflow="hidden">
          <Table highlightOnHover verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Tag No / Equipment</Table.Th>
                <Table.Th>Inspector</Table.Th>
                <Table.Th>Date</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {reports.length === 0 && (
                 <Table.Tr>
                    <Table.Td colSpan={5} align="center">No reports found.</Table.Td>
                 </Table.Tr>
              )}
              {reports.map((r) => (
                <Table.Tr key={r.id}>
                  <Table.Td>
                    <Text fw={500}>{r.equipmentId || "N/A"}</Text>
                    <Text size="xs" c="dimmed">{r.equipmentDescription}</Text>
                  </Table.Td>
                  <Table.Td>{r.inspectorName}</Table.Td>
                  <Table.Td>{r.inspectionDate}</Table.Td>
                  <Table.Td>
                    <Badge color={r.status === 'Completed' ? 'green' : 'gray'}>{r.status}</Badge>
                  </Table.Td>
                  <Table.Td>
                    <Button 
                        size="xs" 
                        variant="light" 
                        leftSection={<IconFileText size={14} />}
                        onClick={() => setSelectedReport(r)}
                    >
                        Generate
                    </Button>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Paper>
      )}
    </Container>
  );
};

// --- A4 Editor Component ---
const ReportEditor = ({ report, onBack }) => {
    const [data, setData] = useState(report);

    const handlePrint = () => {
        window.print();
    };

    const chunkArray = (array, size) => {
        if (!array) return [];
        const chunked = [];
        for (let i = 0; i < array.length; i += size) {
            chunked.push(array.slice(i, i + size));
        }
        return chunked;
    };

    const photoChunks = (!data.photoReport || data.photoReport.length === 0) 
        ? [[]] 
        : chunkArray(data.photoReport, 3);

    return (
        <Box>
            {/* Toolbar - No Print */}
            <Group mb="md" className="no-print" justify="space-between">
                <Button variant="default" leftSection={<IconArrowLeft size={16}/>} onClick={onBack}>Back to List</Button>
                <Button color="blue" leftSection={<IconPrinter size={16}/>} onClick={handlePrint}>Print / Save PDF</Button>
            </Group>

            {/* A4 Container Wrapper */}
            <Box className="print-container">
                
                {/* --- PAGE 1: Findings Report --- */}
                <div className="a4-page">
                    {/* Header */}
                    <table style={{ width: '100%', borderCollapse: 'collapse', border: '2px solid black', marginBottom: 0 }}>
                        <tbody>
                            <tr>
                                <td rowSpan={2} style={{ width: '65%', borderRight: '2px solid black', textAlign: 'center', padding: '10px' }}>
                                    <Text fw={700} size="xl" tt="uppercase" style={{ lineHeight: 1.2 }}>MAJOR TURNAROUND 2025</Text>
                                    <Text fw={700} size="xl" tt="uppercase" style={{ lineHeight: 1.2 }}>PRESSURE VESSEL INSPECTION REPORT</Text>
                                </td>
                                <td style={{ borderBottom: '1px solid black', padding: '5px' }}>
                                    <Text size="xs" fw={700}>Report no.:</Text>
                                    <Text size="sm">{data.reportNo || "PLANT1/VI/V-001/TA2025"}</Text>
                                </td>
                            </tr>
                            <tr>
                                <td style={{ padding: '5px' }}>
                                    <Text size="xs" fw={700}>Report date.:</Text>
                                    <Text size="sm">{data.inspectionDate}</Text>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                    
                    {/* Equipment Info */}
                    <table style={{ width: '100%', borderCollapse: 'collapse', border: '2px solid black', borderTop: 'none', marginBottom: 0 }}>
                         <tbody>
                            <tr>
                                 <td style={{ width: '65%', borderRight: '2px solid black', padding: '5px', verticalAlign: 'top' }}>
                                     <Group gap="xs">
                                         <Text size="xs" fw={700}>Equipment tag no:</Text>
                                         <Text size="xs" fw={700}>{data.equipmentId}</Text>
                                     </Group>
                                     <Group gap="xs" mt={2}>
                                         <Text size="xs" fw={700}>Equipment description:</Text>
                                         <Text size="xs" fw={700}>{data.equipmentDescription}</Text>
                                     </Group>
                                 </td>
                                 <td style={{ padding: '5px', verticalAlign: 'top' }}>
                                     <Group gap="xs">
                                         <Text size="xs" fw={700}>Plant/Unit/Area:</Text>
                                         <Text size="xs" fw={700}>{data.plantUnitArea || "Plant 1"}</Text>
                                     </Group>
                                     <Group gap="xs" mt={2}>
                                         <Text size="xs" fw={700}>DOSH registration no.:</Text>
                                         <Text size="xs" fw={700}>{data.doshNumber || "MK PMT 1002"}</Text>
                                     </Group>
                                 </td>
                            </tr>
                         </tbody>
                    </table>

                    {/* Findings Section */}
                    <Box mb={0} style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                         <div style={{ backgroundColor: '#ccc', border: '2px solid black', borderTop: 'none', borderBottom: 'none', padding: '2px', marginTop: 0 }}>
                             <Text ta="center" size="sm" fw={700} tt="uppercase">FINDINGS, NDTs & RECOMMENDATIONS</Text>
                         </div>
                         <table style={{ width: '100%', borderCollapse: 'collapse', border: '2px solid black', borderTop: '2px solid black', flexGrow: 1 }}>
                             <tbody>
                                {/* Condition Header Row */}
                                <tr>
                                    <td style={{ padding: '5px', borderBottom: '2px solid black', borderTop: 'none' }}>
                                        <Text size="xs" c="dimmed" fs="italic">
                                            {data.condition || "Condition: With respect to the internal surface, describe and state location of any scales, pits or other deposits..."}
                                        </Text>
                                    </td>
                                </tr>
                                {/* Findings Content Row */}
                                <tr>
                                    <td style={{ padding: '10px', verticalAlign: 'top' }}>
                                        <Text td="underline" fw={700} size="sm" mb={4}>FINDINGS</Text>
                                        
                                        <Text size="sm" fw={700}>Initial/Pre-Inspection - <span style={{ fontWeight: 400 }}>{data.preInspectionFinding || "Not applicable"}</span></Text>
                                        <Text size="sm" fw={700} mt="xs">Post/Final Inspection</Text>
                                        {data.finalInspectionFinding && (
                                            <Text size="sm" style={{ whiteSpace: 'pre-wrap', marginBottom: '4px' }}>{data.finalInspectionFinding}</Text>
                                        )}
                                        
                                        <Text td="underline" size="sm" fw={700} mt="xs">External</Text>
                                        <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>{data.externalCondition || "No anomalies."}</Text>

                                        <Text td="underline" size="sm" fw={700} mt="xs">Internal</Text>
                                        <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>{data.internalCondition || "No anomalies."}</Text>

                                        <Text td="underline" fw={700} size="sm" mt="md" mb={4}>NON-DESTRUCTIVE TESTINGS</Text>
                                        <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>{data.ndt || "UTTM: No significant wall loss detected."}</Text>

                                        <Text td="underline" fw={700} size="sm" mt="md" mb={4}>RECOMMENDATIONS</Text>
                                        <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>{data.recommendation || "To be monitored on next opportunity."}</Text>
                                    </td>
                                </tr>
                             </tbody>
                         </table>
                    </Box>
                    
                    {/* Sign Off */}
                    <table style={{ width: '100%', borderCollapse: 'collapse', border: '2px solid black', borderTop: 'none', marginTop: 0, marginBottom: '0', pageBreakInside: 'avoid' }}>
                         <tbody>
                            <tr>
                                 <td style={{ width: '33%', borderRight: '1px solid black', padding: '5px', height: '60px', verticalAlign: 'top' }}>
                                     <Text size="xs" fw={700}>Inspected by:</Text>
                                     <Text size="sm">{data.inspectorName}</Text>
                                 </td>
                                 <td style={{ width: '33%', borderRight: '1px solid black', padding: '5px', verticalAlign: 'top' }}>
                                     <Text size="xs" fw={700}>Reviewed by:</Text>
                                     <Text size="sm"></Text>
                                 </td>
                                 <td style={{ width: '33%', padding: '5px', verticalAlign: 'top' }}>
                                     <Text size="xs" fw={700}>Approved by (Client):</Text>
                                     <Text size="sm"></Text>
                                 </td>
                            </tr>
                            {/* DOSH Officer Recommendation */}
                            <tr>
                                <td colSpan={3} style={{ borderTop: '1px solid black', padding: '5px', height: '80px', verticalAlign: 'top', position: 'relative' }}>
                                    <div style={{ marginBottom: '5px' }}>
                                        <Text size="xs" fw={700}>Recommendation/Comment by DOSH Officer (if applicable):</Text>
                                    </div>
                                    
                                    <div style={{ position: 'absolute', bottom: '5px', left: '5px', right: '5px', display: 'flex', justifyContent: 'space-between' }}>
                                        <div style={{ width: '30%' }}><Text size="xs">Name: </Text></div>
                                        <div style={{ width: '30%' }}><Text size="xs">Signature: </Text></div>
                                        <div style={{ width: '30%' }}><Text size="xs">Date: </Text></div>
                                    </div>
                                </td>
                            </tr>
                            {/* Action Taken by Plant */}
                            <tr>
                                <td colSpan={3} style={{ borderTop: '1px solid black', padding: '5px', height: '80px', verticalAlign: 'top', position: 'relative' }}>
                                    <div style={{ marginBottom: '5px' }}>
                                        <Text size="xs" fw={700}>Action taken by Plant 1 on recommendation by DOSH (if applicable):</Text>
                                    </div>
                                    
                                    <div style={{ position: 'absolute', bottom: '5px', left: '5px', right: '5px', display: 'flex', justifyContent: 'space-between' }}>
                                        <div style={{ width: '30%' }}><Text size="xs">Name: </Text></div>
                                        <div style={{ width: '30%' }}><Text size="xs">Signature: </Text></div>
                                        <div style={{ width: '30%' }}><Text size="xs">Date: </Text></div>
                                    </div>
                                </td>
                            </tr>
                         </tbody>
                    </table>
                </div>

                {/* --- PAGE 2+: Photo Report --- */}
                {/* --- PAGE 2+: Photo Report (Pagination) --- */}
                {photoChunks.map((chunk, pageIndex) => (
                    <div className="a4-page" key={pageIndex}>
                        {/* Photo Page Header */}
                        <table style={{ width: '100%', borderCollapse: 'collapse', border: '2px solid black', marginBottom: 0 }}>
                            <tbody>
                                <tr>
                                    <td rowSpan={2} style={{ width: '65%', borderRight: '2px solid black', textAlign: 'center', padding: '10px' }}>
                                        <Text fw={700} size="xl" tt="uppercase" style={{ lineHeight: 1.2 }}>MAJOR TURNAROUND 2025</Text>
                                        <Text fw={700} size="xl" tt="uppercase" style={{ lineHeight: 1.2 }}>PRESSURE VESSEL INSPECTION REPORT</Text>
                                    </td>
                                    <td style={{ borderBottom: '1px solid black', padding: '5px' }}>
                                        <Text size="xs" fw={700}>Report no.:</Text>
                                        <Text size="sm">{data.reportNo || "PLANT1/VI/V-001/TA2025"}</Text>
                                    </td>
                                </tr>
                                <tr>
                                    <td style={{ padding: '5px' }}>
                                        <Text size="xs" fw={700}>Report date.:</Text>
                                        <Text size="sm">{data.inspectionDate}</Text>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                        <div style={{ backgroundColor: '#999', border: '2px solid black', borderBottom: 'none', borderTop: 'none', padding: '2px', marginTop: 0 }}>
                            <Text ta="center" size="sm" fw={700} tt="uppercase">PHOTOS REPORT</Text>
                        </div>

                        {/* Photo Rows - Table Version */}
                        <table style={{ width: '100%', borderCollapse: 'collapse', border: '2px solid black', borderTop: '2px solid black', borderBottom: '2px solid black' }}>
                            <tbody>
                                {chunk.length === 0 ? (
                                    <tr>
                                        <td colSpan={2} style={{ padding: '10px' }}><Text>No photos available.</Text></td>
                                    </tr>
                                ) : (
                                    chunk.map((row, rowIndex) => {
                                        const globalIndex = (pageIndex * 3) + rowIndex;
                                        return (
                                            <tr key={rowIndex}>
                                                {/* Left: Images */}
                                                <td style={{ 
                                                    width: '50%', 
                                                    borderRight: '2px solid black', 
                                                    borderBottom: '2px solid black',
                                                    padding: '10px',
                                                    verticalAlign: 'top',
                                                    position: 'relative'
                                                }}>
                                                    <div style={{ 
                                                        position: 'absolute', top: 0, left: 0, 
                                                        backgroundColor: 'black', color: 'white', 
                                                        padding: '2px 8px', fontSize: '10pt', fontWeight: 'bold', zIndex: 10
                                                    }}>
                                                        Photo {globalIndex + 1}
                                                    </div>
                                                    <div style={{ marginTop: '25px', display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                                                        {row.photoUrls && row.photoUrls.map((url, imgIndex) => {
                                                            const totalImgs = row.photoUrls.length;
                                                            const width = totalImgs === 1 ? '100%' : '48%';
                                                            return (
                                                                <div key={imgIndex} style={{ width: width, position: 'relative' }}>
                                                                    <Image src={url} w="100%" fit="contain" style={{ border: '1px solid #ccc' }} />
                                                                    <div style={{
                                                                        position: 'absolute', top: '10px', left: '10px',
                                                                        backgroundColor: 'white', border: '1px solid red', color: 'black',
                                                                        padding: '2px 5px', fontSize: '10pt', fontWeight: 'bold'
                                                                    }}>
                                                                        {globalIndex + 1}.{imgIndex + 1}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </td>
                                                {/* Right: Text */}
                                                <td style={{ 
                                                    width: '50%', 
                                                    padding: '10px', 
                                                    verticalAlign: 'top',
                                                    borderBottom: '2px solid black',
                                                }}>
                                                    <Text td="underline" fw={700} size="sm">Finding:</Text>
                                                    <Text size="sm" mb="sm" style={{ whiteSpace: 'pre-wrap' }}>{row.finding || "No findings recorded."}</Text>
                                                    <Text td="underline" fw={700} size="sm">Recommendation:</Text>
                                                    <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>{row.recommendation || "Nil."}</Text>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>

                        <div style={{ flexGrow: 1, borderLeft: '2px solid black', borderRight: '2px solid black' }}></div>

                        {/* Footer */}
                        <table style={{ width: '100%', borderCollapse: 'collapse', border: '2px solid black', borderTop: '2px solid black', padding: 0, marginTop: 0, pageBreakInside: 'avoid' }}>
                            <tbody>
                                <tr>
                                    <td style={{ width: '50%', borderRight: '2px solid black', padding: '5px', height: '40px', verticalAlign: 'center' }}>
                                        <Text size="xs">Inspected by: <b>{data.inspectorName}</b></Text>
                                    </td>
                                    <td style={{ width: '50%', padding: '5px', verticalAlign: 'center' }}>
                                        <Text size="xs">Date: <b>{data.inspectionDate}</b></Text>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                ))}

            </Box>

            {/* Print Styles */}
            <style>{`
                .a4-page {
                    width: 210mm;
                    min-height: 297mm;
                    background-color: white;
                    margin: 0 auto 20px auto;
                    padding: 10mm;
                    box-shadow: 0 0 10px rgba(0,0,0,0.1);
                    color: black;
                    font-family: Arial, sans-serif;
                    font-size: 11pt;
                    position: relative;
                    display: flex;
                    flex-direction: column;
                    gap: 0;
                }

                @media print {
                    @page { margin: 0; size: auto; }
                    body { background-color: white; -webkit-print-color-adjust: exact; }
                    
                    body * { visibility: hidden; }
                    .print-container, .print-container * { visibility: visible; }
                    
                    .print-container {
                        position: absolute;
                        top: 0;
                        left: 0;
                        width: 100%;
                    }

                    .a4-page {
                        width: 210mm;
                        height: 297mm; /* Force height for print */
                        min-height: 297mm;
                        margin: 0;
                        padding: 10mm; /* Printer margins might handle this, but explicit padding is safer for content */
                        box-shadow: none;
                        page-break-after: always; /* Force break after each page */
                        break-after: page;
                    }

                    /* Remove break after last page if needed, but safe to keep */
                    .a4-page:last-child {
                        page-break-after: auto;
                    }
                    
                    .no-print { display: none !important; }
                }
            `}</style>
        </Box>
    );
};


const InfoRow = ({ label, value }) => (
    <Group align="flex-start" gap="xs" wrap="nowrap">
        <Text fw={700} size="sm" w={120}>{label}:</Text>
        <Text size="sm" style={{ flex: 1 }}>{value || "-"}</Text>
    </Group>
);

const EditableSection = ({ title, value }) => (
    <Box mb="sm">
        <Text fw={700} size="sm" td="underline" mb={4}>{title}:</Text>
        <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>{value || "-"}</Text>
        {/* Ideally this would be a contentEditable div or Textarea that prints as text */}
    </Box>
);

export default ReportGeneration;
