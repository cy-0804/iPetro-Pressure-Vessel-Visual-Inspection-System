import React, { useState } from 'react';
import {
	Container,
	Card,
	Title,
	Button,
	Group,
	Divider,
	SimpleGrid,
	Table,
	Text,
	Badge,
	Modal,
	Stack,
	Paper,
} from '@mantine/core';
import { IconTrash, IconEye, IconCheck } from '@tabler/icons-react';

// Placeholder sample reports from inspectors
const initialReports = [
	{
		id: 1,
		reportId: 'R-2025-001',
		inspector: 'Inspector A',
		inspectionDate: '2025-11-01',
		status: 'Received',
		decision: 'Pending',
		findings: 'Observed minor non-compliance with section 3.2; recommended documentation update.',
		attachment: 'report_R-2025-001.pdf',
		notes: 'Requires follow-up by team lead.',
		receivedAt: '2025-11-01 10:12',
	},
	{
		id: 2,
		reportId: 'R-2025-002',
		inspector: 'Inspector B',
		inspectionDate: '2025-11-05',
		status: 'Requires Action',
		decision: 'Pending',
		findings: 'Critical issue in deployment pipeline causing intermittent failures.',
		attachment: 'report_R-2025-002.pdf',
		notes: 'Escalate to DevOps.',
		receivedAt: '2025-11-05 14:03',
	},
	{
		id: 3,
		reportId: 'R-2025-003',
		inspector: 'Inspector C',
		inspectionDate: '2025-11-08',
		status: 'Received',
		decision: 'Pending',
		findings: 'All checks passed. No actions required.',
		attachment: '',
		notes: '',
		receivedAt: '2025-11-08 09:20',
	},
];

export default function SupervisorReview() {
	const [reports, setReports] = useState(initialReports);
	const [preview, setPreview] = useState(null);
	const [modalOpen, setModalOpen] = useState(false);

	function openPreview(report) {
		console.log('openPreview', report?.reportId);
		setPreview(report);
		setModalOpen(true);
	}

	function closePreview() {
		setModalOpen(false);
		setPreview(null);
	}

	function handleApprove(id) {
		setReports((r) => r.map((rep) => (rep.id === id ? { ...rep, decision: 'Approved', status: 'Closed' } : rep)));
		// if previewing same report, update it too
		if (preview && preview.id === id) {
			setPreview((p) => ({ ...p, decision: 'Approved', status: 'Closed' }));
		}
		// close modal after approving
		closePreview();
	}

	function handleDelete(id) {
		setReports((r) => r.filter((rep) => rep.id !== id));
		if (preview && preview.id === id) closePreview();
	}

	return (
		<Container mx={0} fluid w="100%">
			<Title order={2} mb="sm">
				Supervisor — Inspector Reports
			</Title>

			<Text c="dimmed" mb="md">
				Placeholder list of reports received from inspectors. Click "View" to preview a report, then "Approve" when review is complete.
			</Text>

			<SimpleGrid cols={1} spacing="lg" w="100%">
				<Paper withBorder p="lg" w="100%">
					<Group position="apart" mb="sm">
						<Title order={4}>Incoming reports</Title>
						<Text size="sm" c="dimmed">
							{reports.length} total
						</Text>
					</Group>

					<Divider mb="sm" />

					{reports.length === 0 ? (
						<Text c="dimmed">No reports available.</Text>
					) : (
						<Table highlightOnHover verticalSpacing="sm">
							<Table.Thead>
								<Table.Tr>
									<Table.Th>Report ID</Table.Th>
									<Table.Th>Inspector</Table.Th>
									<Table.Th>Inspection date</Table.Th>
									<Table.Th>Status</Table.Th>
									<Table.Th>Decision</Table.Th>
									<Table.Th></Table.Th>
								</Table.Tr>
							</Table.Thead>
							<Table.Tbody>
								{reports.map((r) => (
									<Table.Tr key={r.id}>
										<Table.Td>
											<Text fw={600}>{r.reportId}</Text>
											<Text size="xs" color="dimmed">
												Received: {r.receivedAt}
											</Text>
										</Table.Td>
										<Table.Td>{r.inspector}</Table.Td>
										<Table.Td>{r.inspectionDate}</Table.Td>
										<Table.Td>
											<Badge color={r.status === 'Received' ? 'blue' : r.status === 'Requires Action' ? 'yellow' : 'red'}>
												{r.status}
											</Badge>
										</Table.Td>
										<Table.Td>{r.decision}</Table.Td>
										<Table.Td>
											<Group spacing={6} position="right">
												<Button variant="subtle" size="xs" leftIcon={<IconEye size={14} />} onClick={() => openPreview(r)}>
													View
												</Button>
												<Button variant="subtle" color="green" size="xs" leftIcon={<IconCheck size={14} />} onClick={() => handleApprove(r.id)}>
													Approve
												</Button>
												<Button variant="subtle" color="red" size="xs" onClick={() => handleDelete(r.id)} leftIcon={<IconTrash size={14} />}>
													Delete
												</Button>
											</Group>
										</Table.Td>
									</Table.Tr>
								))}
							</Table.Tbody>
						</Table>
					)}
				</Paper>
			</SimpleGrid>

<Modal
  opened={modalOpen}
  onClose={closePreview}
  title={preview ? `${preview.reportId} — ${preview.inspector}` : 'Report preview'}
  size="100%"
  centered
>
  {preview ? (
    <Stack spacing="sm">
      {/* PDF preview (dummy PDF if no attachment) */}
      <div style={{ width: '100%', height: 500, border: '1px solid var(--mantine-color-gray-3)', borderRadius: 6, overflow: 'hidden' }}>
        <iframe
          src={preview.attachment ? preview.attachment : 'https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf'}
          style={{ width: '100%', height: '100%', border: 'none' }}
          title="report-preview"
        />
      </div>

      <Group position="apart">
        <Text weight={700}>{preview.reportId}</Text>
        <Text size="sm" color="dimmed">Received: {preview.receivedAt}</Text>
      </Group>

      <Text size="sm"><strong>Inspection date:</strong> {preview.inspectionDate}</Text>

      <Text><strong>Findings:</strong></Text>
      <Text color="dimmed">{preview.findings || '—'}</Text>

      <Text><strong>Notes:</strong></Text>
      <Text color="dimmed">{preview.notes || '—'}</Text>

      {preview.attachment ? (
        <Text><strong>Attachment:</strong> {preview.attachment}</Text>
      ) : null}

      <Group position="right" mt="md">
        <Button color="green" onClick={() => { handleApprove(preview.id); }}>
          Approve
        </Button>
        <Button variant="outline" color="gray" onClick={closePreview}>
          Close
        </Button>
      </Group>
    </Stack>
  ) : null}
</Modal>
		</Container>
	);
}
