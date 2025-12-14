import React, { useState, useEffect } from 'react';
import { Modal, Tabs, TextInput, Button, Group, ActionIcon, Stack, Text, ScrollArea } from '@mantine/core';
import { IconTrash, IconPlus } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { fetchDropdownOptions, addDropdownOption, removeDropdownOption } from '../services/settingsService';

export function ManageDropdownsModal({ opened, onClose }) {
    const [options, setOptions] = useState({});
    const [newItem, setNewItem] = useState('');
    const [activeTab, setActiveTab] = useState('types');
    const [loading, setLoading] = useState(false);

    const loadOptions = async () => {
        const data = await fetchDropdownOptions();
        setOptions(data);
    };

    useEffect(() => {
        if (opened) loadOptions();
    }, [opened]);

    const handleAdd = async () => {
        if (!newItem.trim()) return;
        setLoading(true);
        try {
            await addDropdownOption(activeTab, newItem);
            setNewItem('');
            await loadOptions(); // Refresh
            notifications.show({ title: 'Added', message: 'New option saved', color: 'green' });
        } catch (error) {
            notifications.show({ title: 'Error', message: error.message, color: 'red' });
        } finally {
            setLoading(false);
        }
    };

    const handleRemove = async (value) => {
        if (!confirm(`Delete "${value}"?`)) return;
        try {
            await removeDropdownOption(activeTab, value);
            await loadOptions(); // Refresh
            notifications.show({ title: 'Removed', message: 'Option deleted', color: 'green' });
        } catch (error) {
            notifications.show({ title: 'Error', message: error.message, color: 'red' });
        }
    };

    const categories = [
        { id: 'types', label: 'Equipment Type' },
        { id: 'functions', label: 'Function' },
        { id: 'geometries', label: 'Geometry' },
        { id: 'constructions', label: 'Construction' },
        { id: 'services', label: 'Service' },
        { id: 'orientations', label: 'Orientation' },
        { id: 'statuses', label: 'Status' }
    ];

    return (
        <Modal opened={opened} onClose={onClose} title="Manage Dropdown Lists" size="lg">
            <Tabs value={activeTab} onChange={setActiveTab}>
                <Tabs.List>
                    {categories.map(c => <Tabs.Tab key={c.id} value={c.id}>{c.label}</Tabs.Tab>)}
                </Tabs.List>

                <Stack mt="md">
                    <Group>
                        <TextInput
                            placeholder={`Add new ${categories.find(c => c.id === activeTab)?.label}`}
                            value={newItem}
                            onChange={(e) => setNewItem(e.currentTarget.value)}
                            style={{ flex: 1 }}
                        />
                        <Button leftSection={<IconPlus size={16} />} onClick={handleAdd} loading={loading}>Add</Button>
                    </Group>

                    <ScrollArea h={300} type="always" offsetScrollbars>
                        <Stack gap="xs">
                            {options[activeTab]?.sort().map((item) => (
                                <Group key={item} justify="space-between" bg="var(--mantine-color-gray-0)" p="xs" style={{ borderRadius: 4 }}>
                                    <Text size="sm">{item}</Text>
                                    <ActionIcon color="red" variant="subtle" onClick={() => handleRemove(item)}>
                                        <IconTrash size={16} />
                                    </ActionIcon>
                                </Group>
                            ))}
                        </Stack>
                    </ScrollArea>
                </Stack>
            </Tabs>
        </Modal>
    );
}
