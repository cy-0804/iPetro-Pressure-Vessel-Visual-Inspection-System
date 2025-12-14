import React, { useState, useRef } from 'react';
import { Group, Text, Image, Button, Stack, ActionIcon, Loader, Center } from '@mantine/core';
import { Dropzone, IMAGE_MIME_TYPE } from '@mantine/dropzone';
import { IconPhoto, IconUpload, IconX, IconTrash } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { uploadEquipmentImage } from '../services/equipmentService';

export function ImageUpload({ value, onChange }) {
    const [loading, setLoading] = useState(false);
    const openRef = useRef(null);

    const handleDrop = async (files) => {
        const file = files[0];
        if (!file) return;

        setLoading(true);
        try {
            const url = await uploadEquipmentImage(file);
            onChange(url);
            notifications.show({ title: 'Success', message: 'Image uploaded', color: 'green' });
        } catch (error) {
            notifications.show({ title: 'Error', message: 'Upload failed', color: 'red' });
        } finally {
            setLoading(false);
        }
    };

    const handleRemove = () => {
        onChange(null);
    };

    if (loading) {
        return (
            <Center h={120} bg="var(--mantine-color-gray-0)" style={{ borderRadius: 8 }}>
                <Stack align="center" gap="xs">
                    <Loader size="sm" />
                    <Text size="xs" c="dimmed">Uploading...</Text>
                </Stack>
            </Center>
        );
    }

    if (value) {
        return (
            <Stack>
                <Text size="sm" fw={500}>Equipment Image</Text>
                <div style={{ position: 'relative', width: 'fit-content' }}>
                    <Image src={value} radius="md" h={200} w="auto" fit="contain" bg="gray.1" />
                    <ActionIcon
                        color="red"
                        variant="filled"
                        size="sm"
                        style={{ position: 'absolute', top: 5, right: 5 }}
                        onClick={handleRemove}
                    >
                        <IconTrash size={14} />
                    </ActionIcon>
                </div>
            </Stack>
        );
    }

    return (
        <Stack gap={4}>
            <Text size="sm" fw={500}>Equipment Image</Text>
            <Dropzone
                openRef={openRef}
                onDrop={handleDrop}
                accept={IMAGE_MIME_TYPE}
                maxSize={5 * 1024 ** 2}
                multiple={false}
                h={120}
            >
                <Group justify="center" gap="xl" style={{ minHeight: 120, pointerEvents: 'none' }}>
                    <Dropzone.Accept><IconUpload size={30} stroke={1.5} /></Dropzone.Accept>
                    <Dropzone.Reject><IconX size={30} stroke={1.5} /></Dropzone.Reject>
                    <Dropzone.Idle><IconPhoto size={30} stroke={1.5} /></Dropzone.Idle>
                    <div>
                        <Text size="sm" inline>Drag image here or click to select</Text>
                        <Text size="xs" c="dimmed" inline mt={7}>Max file size 5MB</Text>
                    </div>
                </Group>
            </Dropzone>
        </Stack>
    );
}
