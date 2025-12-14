import React, { useState, useEffect } from 'react';
import {
    Container, Paper, Title, TextInput, Select, Group, Button,
    Stack, Text, SimpleGrid, Table, ActionIcon, Badge, Modal, Image, Grid
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { modals } from '@mantine/modals';
import { IconPencil, IconTrash, IconPlus, IconArrowLeft, IconSearch } from '@tabler/icons-react';
import {
    addEquipment,
    updateEquipment,
    removeEquipment,
    subscribeToEquipment
} from '../services/equipmentService';
import { fetchDropdownOptions, addDropdownOption, removeDropdownOption } from '../services/settingsService';
import { CreatableSelect } from '../components/CreatableSelect';
import { ImageUpload } from '../components/ImageUpload';

export default function EquipmentRegistration() {
    const [view, setView] = useState('list'); // 'list' | 'form' | 'detail'
    const [equipmentList, setEquipmentList] = useState([]);
    const [selectedItem, setSelectedItem] = useState(null); // For Detail/Edit
    const [submitting, setSubmitting] = useState(false);

    // Dynamic Options State
    const [dropdownOptions, setDropdownOptions] = useState({});

    // Initial Data Load
    useEffect(() => {
        const unsubscribe = subscribeToEquipment((data) => setEquipmentList(data));
        loadDropdowns();
        return () => unsubscribe && unsubscribe();
    }, []);

    const loadDropdowns = async () => {
        const options = await fetchDropdownOptions();
        setDropdownOptions(options);
    };

    // Inline Management Handlers
    const handleCreateOption = async (category, value) => {
        setDropdownOptions(prev => ({ ...prev, [category]: [...(prev[category] || []), value] }));
        try {
            await addDropdownOption(category, value);
            notifications.show({ title: 'Created', message: `Added "${value}"`, color: 'green' });
        } catch (e) {
            notifications.show({ title: 'Error', message: e.message, color: 'red' });
            loadDropdowns();
        }
    };

    const handleDeleteOption = (category, value) => {
        modals.openConfirmModal({
            title: 'Delete Option',
            children: <Text size="sm">Remove <b>"{value}"</b> from list?</Text>,
            labels: { confirm: 'Delete', cancel: 'Cancel' },
            confirmProps: { color: 'red' },
            onConfirm: async () => {
                setDropdownOptions(prev => ({ ...prev, [category]: (prev[category] || []).filter(item => item !== value) }));
                try {
                    await removeDropdownOption(category, value);
                    notifications.show({ title: 'Deleted', message: 'Removed option', color: 'green' });
                } catch (e) {
                    loadDropdowns();
                }
            }
        });
    };

    // Form Setup
    const form = useForm({
        initialValues: {
            tagNumber: '', doshNumber: '', plantUnitArea: '', fabricator: '',
            equipmentDescription: '', imageUrl: '',
            type: '', function: '', geometry: '', construction: '',
            service: '', status: 'Active',
        },
        validate: {
            tagNumber: v => v.length < 2 ? 'Min 2 chars' : null,
            doshNumber: v => !v ? 'Required' : null,
            plantUnitArea: v => !v ? 'Required' : null,
            equipmentDescription: v => !v ? 'Required' : null,
            type: v => !v ? 'Required' : null
        }
    });

    // Navigation Handlers
    const handleAddNew = () => { setSelectedItem(null); form.reset(); setView('form'); };
    const handleViewDetail = (item) => { setSelectedItem(item); setView('detail'); };
    const handleEditFromDetail = () => {
        form.setValues(selectedItem);
        setView('form');
    };

    // Deletion Logic
    const handleDeleteItem = async (id) => {
        modals.openConfirmModal({
            title: 'Delete Equipment',
            children: <Text size="sm">Are you sure you want to delete this equipment?</Text>,
            labels: { confirm: 'Delete', cancel: 'Cancel' },
            confirmProps: { color: 'red' },
            onConfirm: async () => {
                try {
                    await removeEquipment(id);
                    notifications.show({ title: 'Deleted', message: 'Equipment removed', color: 'green' });
                    setView('list'); // Return to list if deleted from detail
                } catch (err) {
                    notifications.show({ title: 'Error', message: err.message, color: 'red' });
                }
            }
        });
    };

    const handleSubmit = async (values) => {
        setSubmitting(true);
        try {
            if (selectedItem?.id && view === 'form') {
                await updateEquipment(selectedItem.id, values);
                notifications.show({ title: 'Saved', message: 'Updated successfully', color: 'green' });
            } else {
                await addEquipment(values);
                notifications.show({ title: 'Saved', message: 'Registered successfully', color: 'green' });
            }
            setView('list'); form.reset();
        } catch (err) {
            console.error("Service Error:", err);
            notifications.show({ title: 'Error', message: err.message, color: 'red' });
        } finally {
            setSubmitting(false);
        }
    };

    // Filtering
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState(null);
    const [filterStatus, setFilterStatus] = useState(null);
    const filtered = equipmentList.filter(e => {
        const matchSearch = e.tagNumber?.toLowerCase().includes(search.toLowerCase());
        const matchType = filterType ? e.type === filterType : true;
        const matchStatus = filterStatus ? e.status === filterStatus : true;
        return matchSearch && matchType && matchStatus;
    });

    // --- VIEWS ---

    const renderList = () => (
        <Paper p="xl" withBorder>
            <Group justify="space-between" mb="md">
                <Title order={2}>Equipment Management</Title>
                <Button leftSection={<IconPlus size={14} />} onClick={handleAddNew}>Add Equipment</Button>
            </Group>

            <SimpleGrid cols={{ base: 1, sm: 3 }} mb="md">
                <TextInput placeholder="Search Tag Number" leftSection={<IconSearch size={14} />} value={search} onChange={(e) => setSearch(e.currentTarget.value)} />
                <Select placeholder="Filter by Type" data={dropdownOptions.types || []} value={filterType} onChange={setFilterType} clearable searchable />
                <Select placeholder="Filter by Status" data={dropdownOptions.statuses || []} value={filterStatus} onChange={setFilterStatus} clearable searchable />
            </SimpleGrid>

            <Table striped highlightOnHover>
                <Table.Thead><Table.Tr><Table.Th>Tag</Table.Th><Table.Th>Type</Table.Th><Table.Th>Plant</Table.Th><Table.Th>Status</Table.Th><Table.Th /></Table.Tr></Table.Thead>
                <Table.Tbody>
                    {filtered.map(item => (
                        <Table.Tr key={item.id} style={{ cursor: 'pointer' }} onClick={() => handleViewDetail(item)}>
                            <Table.Td>{item.tagNumber}</Table.Td>
                            <Table.Td>{item.type}</Table.Td>
                            <Table.Td>{item.plantUnitArea}</Table.Td>
                            <Table.Td><Badge color={item.status === 'Active' ? 'green' : 'yellow'}>{item.status}</Badge></Table.Td>
                            <Table.Td>
                                <Group gap={0} justify="flex-end">
                                    <ActionIcon variant="subtle" color="gray"><IconArrowLeft size={16} style={{ transform: 'rotate(180deg)' }} /></ActionIcon>
                                </Group>
                            </Table.Td>
                        </Table.Tr>
                    ))}
                </Table.Tbody>
            </Table>
        </Paper>
    );

    const renderDetail = () => {
        if (!selectedItem) return null;
        return (
            <Paper p="xl" withBorder>
                <Button variant="subtle" leftSection={<IconArrowLeft size={14} />} onClick={() => setView('list')}>Back to List</Button>

                <Group justify="space-between" mt="md" mb="xl">
                    <Title order={2}>{selectedItem.tagNumber}</Title>
                    <Group>
                        <Button variant="light" leftSection={<IconPencil size={16} />} onClick={handleEditFromDetail}>Edit</Button>
                        <Button color="red" variant="light" leftSection={<IconTrash size={16} />} onClick={() => handleDeleteItem(selectedItem.id)}>Delete</Button>
                    </Group>
                </Group>

                <Grid>
                    <Grid.Col span={{ base: 12, md: 4 }}>
                        {selectedItem.imageUrl ? (
                            <Image src={selectedItem.imageUrl} radius="md" />
                        ) : (
                            <Paper h={200} bg="gray.1" withBorder style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Text c="dimmed">No Image Available</Text>
                            </Paper>
                        )}
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, md: 8 }}>
                        <Stack gap="xs">
                            <Group><Text fw={700} w={120}>Type:</Text><Text>{selectedItem.type}</Text></Group>
                            <Group><Text fw={700} w={120}>Status:</Text><Badge color={selectedItem.status === 'Active' ? 'green' : 'yellow'}>{selectedItem.status}</Badge></Group>
                            <Group><Text fw={700} w={120}>Plant/Unit:</Text><Text>{selectedItem.plantUnitArea}</Text></Group>
                            <Group><Text fw={700} w={120}>DOSH No:</Text><Text>{selectedItem.doshNumber || '-'}</Text></Group>
                            <Group><Text fw={700} w={120}>Description:</Text><Text>{selectedItem.equipmentDescription || '-'}</Text></Group>
                            <Group><Text fw={700} w={120}>Fabricator:</Text><Text>{selectedItem.fabricator || '-'}</Text></Group>
                            <Group><Text fw={700} w={120}>Service:</Text><Text>{selectedItem.service || '-'}</Text></Group>
                            <Group><Text fw={700} w={120}>Function:</Text><Text>{selectedItem.function || '-'}</Text></Group>
                            <Group><Text fw={700} w={120}>Geometry:</Text><Text>{selectedItem.geometry || '-'}</Text></Group>
                        </Stack>
                    </Grid.Col>
                </Grid>
            </Paper>
        );
    };

    const renderForm = () => (
        <Paper p="xl" withBorder>
            <Button variant="subtle" leftSection={<IconArrowLeft size={14} />} onClick={() => setView('list')}>Cancel</Button>
            <Title order={2} mt="md">{selectedItem ? 'Edit Equipment' : 'Register Equipment'}</Title>
            <form onSubmit={form.onSubmit(handleSubmit)}>
                <Stack mt="md">
                    <Grid gutter="md">
                        <Grid.Col span={{ base: 12, md: 4 }}>
                            <ImageUpload {...form.getInputProps('imageUrl')} />
                        </Grid.Col>
                        <Grid.Col span={{ base: 12, md: 8 }}>
                            <Stack>
                                <SimpleGrid cols={2} spacing="md">
                                    <TextInput label="Tag Number" withAsterisk {...form.getInputProps('tagNumber')} />
                                    <TextInput label="DOSH No" withAsterisk {...form.getInputProps('doshNumber')} />
                                </SimpleGrid>
                                <TextInput label="Plant / Unit" withAsterisk {...form.getInputProps('plantUnitArea')} />
                                <TextInput label="Equipment Description" withAsterisk {...form.getInputProps('equipmentDescription')} />
                                <TextInput label="Fabricator" {...form.getInputProps('fabricator')} />
                            </Stack>
                        </Grid.Col>
                    </Grid>

                    <SimpleGrid cols={2} spacing="md">
                        <CreatableSelect label="Type" withAsterisk data={dropdownOptions.types || []} {...form.getInputProps('type')} onCreate={(v) => handleCreateOption('types', v)} onDelete={(v) => handleDeleteOption('types', v)} />
                        <CreatableSelect label="Function" data={dropdownOptions.functions || []} {...form.getInputProps('function')} onCreate={(v) => handleCreateOption('functions', v)} onDelete={(v) => handleDeleteOption('functions', v)} />
                        <CreatableSelect label="Geometry" data={dropdownOptions.geometries || []} {...form.getInputProps('geometry')} onCreate={(v) => handleCreateOption('geometries', v)} onDelete={(v) => handleDeleteOption('geometries', v)} />
                        <CreatableSelect label="Construction" data={dropdownOptions.constructions || []} {...form.getInputProps('construction')} onCreate={(v) => handleCreateOption('constructions', v)} onDelete={(v) => handleDeleteOption('constructions', v)} />
                        <CreatableSelect label="Service" data={dropdownOptions.services || []} {...form.getInputProps('service')} onCreate={(v) => handleCreateOption('services', v)} onDelete={(v) => handleDeleteOption('services', v)} />
                        <CreatableSelect label="Status" data={dropdownOptions.statuses || []} {...form.getInputProps('status')} onCreate={(v) => handleCreateOption('statuses', v)} onDelete={(v) => handleDeleteOption('statuses', v)} />
                    </SimpleGrid>

                    <Group justify="flex-end">
                        <Button variant="default" onClick={() => setView('list')}>Cancel</Button>
                        <Button type="submit" loading={submitting}>{selectedItem ? 'Update' : 'Save'}</Button>
                    </Group>
                </Stack>
            </form>
        </Paper>
    );

    return (
        <Container size="xl">
            {view === 'list' && renderList()}
            {view === 'detail' && renderDetail()}
            {view === 'form' && renderForm()}
        </Container>
    );
}
