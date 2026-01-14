import React from "react";
import { Box, Text, Group, Image } from "@mantine/core";

export const InspectionReportView = ({
  data,
  isEditing = false,
  onRecommendationChange,
}) => {
  if (!data) return null;

  const chunkArray = (array, size) => {
    if (!array) return [];
    const chunked = [];
    for (let i = 0; i < array.length; i += size) {
      chunked.push(array.slice(i, i + size));
    }
    return chunked;
  };

  const photoChunks =
    !data.photoReport || data.photoReport.length === 0
      ? [[]]
      : chunkArray(data.photoReport, 3);

  return (
    <Box>
      {/* A4 Container Wrapper */}
      <Box className="print-container">
        {/* --- PAGE 1: Findings Report --- */}
        <div className="a4-page">
          {/* Header */}
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              border: "2px solid black",
              marginBottom: 0,
            }}
          >
            <tbody>
              <tr>
                <td
                  rowSpan={2}
                  style={{
                    width: "65%",
                    borderRight: "2px solid black",
                    textAlign: "center",
                    padding: "10px",
                  }}
                >
                  <Text
                    fw={700}
                    size="xl"
                    tt="uppercase"
                    style={{ lineHeight: 1.2 }}
                  >
                    MAJOR TURNAROUND 2025
                  </Text>
                  <Text
                    fw={700}
                    size="xl"
                    tt="uppercase"
                    style={{ lineHeight: 1.2 }}
                  >
                    PRESSURE VESSEL INSPECTION REPORT
                  </Text>
                </td>
                <td style={{ borderBottom: "1px solid black", padding: "5px" }}>
                  <Text size="xs" fw={700}>
                    Report no.:
                  </Text>
                  <Text size="sm">
                    {data.reportNo || "PLANT1/VI/V-001/TA2025"}
                  </Text>
                </td>
              </tr>
              <tr>
                <td style={{ padding: "5px" }}>
                  <Text size="xs" fw={700}>
                    Report date.:
                  </Text>
                  <Text size="sm">{data.inspectionDate}</Text>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Equipment Info */}
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              border: "2px solid black",
              borderTop: "none",
              marginBottom: 0,
            }}
          >
            <tbody>
              <tr>
                <td
                  style={{
                    width: "65%",
                    borderRight: "2px solid black",
                    padding: "5px",
                    verticalAlign: "top",
                  }}
                >
                  <Group gap="xs">
                    <Text size="xs" fw={700}>
                      Equipment tag no:
                    </Text>
                    <Text size="xs" fw={700}>
                      {data.equipmentId}
                    </Text>
                  </Group>
                  <Group gap="xs" mt={2}>
                    <Text size="xs" fw={700}>
                      Equipment description:
                    </Text>
                    <Text size="xs" fw={700}>
                      {data.equipmentDescription}
                    </Text>
                  </Group>
                </td>
                <td style={{ padding: "5px", verticalAlign: "top" }}>
                  <Group gap="xs">
                    <Text size="xs" fw={700}>
                      Plant/Unit/Area:
                    </Text>
                    <Text size="xs" fw={700}>
                      {data.plantUnitArea || "Plant 1"}
                    </Text>
                  </Group>
                  <Group gap="xs" mt={2}>
                    <Text size="xs" fw={700}>
                      DOSH registration no.:
                    </Text>
                    <Text size="xs" fw={700}>
                      {data.doshNumber || "MK PMT 1002"}
                    </Text>
                  </Group>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Findings Section */}
          <Box
            mb={0}
            style={{ flexGrow: 1, display: "flex", flexDirection: "column" }}
          >
            <div
              style={{
                backgroundColor: "#ccc",
                border: "2px solid black",
                borderTop: "none",
                borderBottom: "none",
                padding: "2px",
                marginTop: 0,
              }}
            >
              <Text ta="center" size="sm" fw={700} tt="uppercase">
                FINDINGS, NDTs & RECOMMENDATIONS
              </Text>
            </div>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                border: "2px solid black",
                borderTop: "2px solid black",
                flexGrow: 1,
              }}
            >
              <tbody>
                {/* Condition Header Row */}
                <tr>
                  <td
                    style={{
                      padding: "5px",
                      borderBottom: "2px solid black",
                      borderTop: "none",
                    }}
                  >
                    <Text style={{ fontSize: "8px", lineHeight: 1.1, whiteSpace: "pre-wrap" }} c="dimmed" fs="italic">
                      {data.condition ||
                        "Condition: With respect to the internal surface, describe and state location of any scales, pits or other deposits. Give location and extent of any corrosion and state whether active or inactive. State location and extent of any erosion, grooving, bulging, warping, cracking or similar condition. Report on any defective rivets bowed, loose or broken stays. State condition of all tubes, tube end, coils nipples, etc. Report condition of setting, linings, baffles, support, etc. Describe major changes or repairs made since last inspection"}
                    </Text>
                  </td>
                </tr>
                {/* Findings Content Row */}
                <tr>
                  <td style={{ padding: "10px", verticalAlign: "top" }}>
                    <Text td="underline" fw={700} size="xs" mb={4}>
                      FINDINGS
                    </Text>

                    <Text size="xs" fw={700}>
                      Initial/Pre-Inspection -{" "}
                      <span style={{ fontWeight: 400 }}>
                        {data.preInspectionFinding || "Not applicable"}
                      </span>
                    </Text>
                    <Text size="xs" fw={700} mt="xs">
                      Post/Final Inspection
                    </Text>
                    {data.finalInspectionFinding && (
                      <Text
                        size="xs"
                        style={{ whiteSpace: "pre-wrap", marginBottom: "4px" }}
                      >
                        {data.finalInspectionFinding}
                      </Text>
                    )}

                    <Text td="underline" size="xs" fw={700} mt="xs">
                      External
                    </Text>
                    <Text size="xs" style={{ whiteSpace: "pre-wrap" }}>
                      {data.externalCondition || "No anomalies."}
                    </Text>

                    <Text td="underline" size="xs" fw={700} mt="xs">
                      Internal
                    </Text>
                    <Text size="xs" style={{ whiteSpace: "pre-wrap" }}>
                      {data.internalCondition || "No anomalies."}
                    </Text>

                    <Text td="underline" fw={700} size="xs" mt="md" mb={4}>
                      NON-DESTRUCTIVE TESTINGS
                    </Text>
                    <Text size="xs" style={{ whiteSpace: "pre-wrap" }}>
                      {data.ndt || "UTTM: No significant wall loss detected."}
                    </Text>

                    <Text td="underline" fw={700} size="xs" mt="md" mb={4}>
                      RECOMMENDATIONS
                    </Text>
                    <Text size="xs" style={{ whiteSpace: "pre-wrap" }}>
                      {data.recommendation ||
                        "To be monitored on next opportunity."}
                    </Text>
                  </td>
                </tr>
              </tbody>
            </table>
          </Box>

          {/* Sign Off */}
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              border: "2px solid black",
              borderTop: "none",
              marginTop: 0,
              marginBottom: "0",
              pageBreakInside: "avoid",
            }}
          >
            <tbody>
              <tr>
                <td
                  style={{
                    width: "33%",
                    borderRight: "1px solid black",
                    padding: "5px",
                    height: "60px",
                    verticalAlign: "top",
                  }}
                >
                  <Text size="xs" fw={700}>
                    Inspected by:
                  </Text>
                  <Text size="xs">{data.inspectorName}</Text>
                </td>
                <td
                  style={{
                    width: "33%",
                    borderRight: "1px solid black",
                    padding: "5px",
                    verticalAlign: "top",
                  }}
                >
                  <Text size="xs" fw={700}>
                    Reviewed by:
                  </Text>
                  <Text size="xs">{data.reviewedBy || ""}</Text>
                </td>
                <td
                  style={{ width: "33%", padding: "5px", verticalAlign: "top" }}
                >
                  <Text size="xs" fw={700}>
                    Approved by (Client):
                  </Text>
                  <Text size="sm"></Text>
                </td>
              </tr>
              {/* DOSH Officer Recommendation */}
              <tr>
                <td
                  colSpan={3}
                  style={{
                    borderTop: "1px solid black",
                    padding: "5px",
                    height: "50px",
                    verticalAlign: "top",
                    position: "relative",
                  }}
                >
                  <div style={{ marginBottom: "5px" }}>
                    <Text size="xs" fw={700}>
                      Recommendation/Comment by DOSH Officer (if applicable):
                    </Text>
                  </div>

                  <div
                    style={{
                      position: "absolute",
                      bottom: "5px",
                      left: "5px",
                      right: "5px",
                      display: "flex",
                      justifyContent: "space-between",
                    }}
                  >
                    <div style={{ width: "30%" }}>
                      <Text size="xs">Name: </Text>
                    </div>
                    <div style={{ width: "30%" }}>
                      <Text size="xs">Signature: </Text>
                    </div>
                    <div style={{ width: "30%" }}>
                      <Text size="xs">Date: </Text>
                    </div>
                  </div>
                </td>
              </tr>
              {/* Action Taken by Plant */}
              <tr>
                <td
                  colSpan={3}
                  style={{
                    borderTop: "1px solid black",
                    padding: "5px",
                    height: "50px",
                    verticalAlign: "top",
                    position: "relative",
                  }}
                >
                  <div style={{ marginBottom: "5px" }}>
                    <Text size="xs" fw={700}>
                      Action taken by Plant 1 on recommendation by DOSH (if
                      applicable):
                    </Text>
                  </div>

                  <div
                    style={{
                      position: "absolute",
                      bottom: "5px",
                      left: "5px",
                      right: "5px",
                      display: "flex",
                      justifyContent: "space-between",
                    }}
                  >
                    <div style={{ width: "30%" }}>
                      <Text size="xs">Name: </Text>
                    </div>
                    <div style={{ width: "30%" }}>
                      <Text size="xs">Signature: </Text>
                    </div>
                    <div style={{ width: "30%" }}>
                      <Text size="xs">Date: </Text>
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* --- PAGE 2+: Photo Report --- */}
        {photoChunks.map((chunk, pageIndex) => (
          <div className="a4-page" key={pageIndex}>
            {/* Photo Page Header */}
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                border: "2px solid black",
                marginBottom: 0,
              }}
            >
              <tbody>
                <tr>
                  <td
                    rowSpan={2}
                    style={{
                      width: "65%",
                      borderRight: "2px solid black",
                      textAlign: "center",
                      padding: "10px",
                    }}
                  >
                    <Text
                      fw={700}
                      size="xl"
                      tt="uppercase"
                      style={{ lineHeight: 1.2 }}
                    >
                      MAJOR TURNAROUND 2025
                    </Text>
                    <Text
                      fw={700}
                      size="xl"
                      tt="uppercase"
                      style={{ lineHeight: 1.2 }}
                    >
                      PRESSURE VESSEL INSPECTION REPORT
                    </Text>
                  </td>
                  <td
                    style={{ borderBottom: "1px solid black", padding: "5px" }}
                  >
                    <Text size="xs" fw={700}>
                      Report no.:
                    </Text>
                    <Text size="sm">
                      {data.reportNo || "PLANT1/VI/V-001/TA2025"}
                    </Text>
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: "5px" }}>
                    <Text size="xs" fw={700}>
                      Report date.:
                    </Text>
                    <Text size="sm">{data.inspectionDate}</Text>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Equipment Info for Photo Pages */}
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                border: "2px solid black",
                borderTop: "none",
                marginBottom: 0,
              }}
            >
              <tbody>
                <tr>
                  <td
                    style={{
                      width: "65%",
                      borderRight: "2px solid black",
                      padding: "5px",
                      verticalAlign: "top",
                    }}
                  >
                    <Group gap="xs">
                      <Text size="xs" fw={700}>
                        Equipment tag no:
                      </Text>
                      <Text size="xs" fw={700}>
                        {data.equipmentId}
                      </Text>
                    </Group>
                    <Group gap="xs" mt={2}>
                      <Text size="xs" fw={700}>
                        Equipment description:
                      </Text>
                      <Text size="xs" fw={700}>
                        {data.equipmentDescription}
                      </Text>
                    </Group>
                  </td>
                  <td style={{ padding: "5px", verticalAlign: "top" }}>
                    <Group gap="xs">
                      <Text size="xs" fw={700}>
                        Plant/Unit/Area:
                      </Text>
                      <Text size="xs" fw={700}>
                        {data.plantUnitArea || "Plant 1"}
                      </Text>
                    </Group>
                    <Group gap="xs" mt={2}>
                      <Text size="xs" fw={700}>
                        DOSH registration no.:
                      </Text>
                      <Text size="xs" fw={700}>
                        {data.doshNumber || "MK PMT 1002"}
                      </Text>
                    </Group>
                  </td>
                </tr>
              </tbody>
            </table>
            <div
              style={{
                backgroundColor: "#999",
                border: "2px solid black",
                borderBottom: "none",
                borderTop: "none",
                padding: "2px",
                marginTop: 0,
              }}
            >
              <Text ta="center" size="sm" fw={700} tt="uppercase">
                PHOTOS REPORT
              </Text>
            </div>

            {/* Photo Rows - Table Version */}
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                border: "2px solid black",
                borderTop: "2px solid black",
                borderBottom: "none", // Remove bottom border to attach to footer
                flexGrow: 1, // Fill remaining space
              }}
            >
              <tbody>
                {/* Always render 3 rows */}
                {[0, 1, 2].map((rowIndex) => {
                  const row = chunk[rowIndex];
                  const globalIndex = pageIndex * 3 + rowIndex;

                  if (!row) {
                    // Empty Placeholder Row
                    return (
                      <tr
                        key={`empty-${rowIndex}`}
                        style={{ height: "33.33%" }}
                      >
                        <td
                          style={{
                            width: "50%",
                            borderRight: "2px solid black",
                            borderBottom: "2px solid black",
                            padding: "10px",
                          }}
                        ></td>
                        <td
                          style={{
                            width: "50%",
                            padding: "10px",
                            borderBottom: "2px solid black",
                          }}
                        ></td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={rowIndex} style={{ height: "33.33%" }}>
                      {/* Left: Images */}
                      <td
                        style={{
                          width: "50%",
                          borderRight: "2px solid black",
                          borderBottom: "2px solid black",
                          padding: "10px",
                          verticalAlign: "top",
                          position: "relative",
                        }}
                      >
                        <div
                          style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            backgroundColor: "black",
                            color: "white",
                            padding: "2px 8px",
                            fontSize: "10pt",
                            fontWeight: "bold",
                            zIndex: 10,
                          }}
                        >
                          Photo {globalIndex + 1}
                        </div>
                        <div
                          style={{
                            marginTop: "25px",
                            display: "flex",
                            flexWrap: "wrap",
                            gap: "5px",
                          }}
                        >
                          {row.photoUrls &&
                            row.photoUrls.map((url, imgIndex) => {
                              const totalImgs = row.photoUrls.length;
                              const width = totalImgs === 1 ? "100%" : "48%";
                              return (
                                <div
                                  key={imgIndex}
                                  style={{
                                    width: width,
                                    position: "relative",
                                  }}
                                >
                                  <Image
                                    src={url}
                                    w="100%"
                                    fit="contain"
                                    style={{ border: "1px solid #ccc" }}
                                  />
                                  <div
                                    style={{
                                      position: "absolute",
                                      top: "10px",
                                      left: "10px",
                                      backgroundColor: "white",
                                      border: "1px solid red",
                                      color: "black",
                                      padding: "2px 5px",
                                      fontSize: "10pt",
                                      fontWeight: "bold",
                                    }}
                                  >
                                    {globalIndex + 1}.{imgIndex + 1}
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </td>
                      {/* Right: Text */}
                      <td
                        style={{
                          width: "50%",
                          padding: "10px",
                          verticalAlign: "top",
                          borderBottom: "2px solid black",
                        }}
                      >
                        <Text td="underline" fw={700} size="xs">
                          Finding:
                        </Text>
                        <Text
                          size="xs"
                          mb="sm"
                          style={{ whiteSpace: "pre-wrap" }}
                        >
                          {row.finding || "No findings recorded."}
                        </Text>
                        <Text td="underline" fw={700} size="xs">
                          Recommendation:
                        </Text>
                        <Text size="xs" style={{ whiteSpace: "pre-wrap" }}>
                          {row.recommendation || "Nil."}
                        </Text>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Footer */}
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                border: "2px solid black",
                borderTop: "2px solid black",
                padding: 0,
                marginTop: 0,
                pageBreakInside: "avoid",
              }}
            >
              <tbody>
                <tr>
                  <td
                    style={{
                      width: "50%",
                      borderRight: "2px solid black",
                      padding: "5px",
                      height: "40px",
                      verticalAlign: "center",
                    }}
                  >
                    <Text size="xs">
                      Inspected by: <b>{data.inspectorName}</b>
                    </Text>
                  </td>
                  <td
                    style={{
                      width: "50%",
                      padding: "5px",
                      verticalAlign: "center",
                    }}
                  >
                    <Text size="xs">
                      Date: <b>{data.inspectionDate}</b>
                    </Text>
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
                height: 296mm; /* Slightly less than 297mm to prevent overflow */
                background-color: white;
                margin: 0 auto 20px auto;
                padding: 10mm;
                box-shadow: 0 0 10px rgba(0,0,0,0.1);
                color: black;
                font-family: Arial, sans-serif;
                font-size: 9pt;
                position: relative;
                display: flex;
                flex-direction: column;
                gap: 0;
            }

            @media print {
                @page { margin: 0; size: A4; }
                body { background-color: white; -webkit-print-color-adjust: exact; }
                
                /* Hide everything by default relying on component scoping */
                body * { visibility: hidden; }
                .print-container, .print-container * { visibility: visible; }
                
                .print-container {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                }

                .a4-page {
                    width: 210mm;
                    height: 296mm; /* Strict height for single page alignment */
                    margin: 0;
                    padding: 10mm;
                    box-shadow: none;
                    page-break-after: always;
                    break-after: page;
                    display: flex; /* Restore flex for footer positioning */
                    flex-direction: column;
                }

                .a4-page:last-child {
                    page-break-after: auto;
                }
                
                .no-print { display: none !important; }
            }
        `}</style>
    </Box>
  );
};
