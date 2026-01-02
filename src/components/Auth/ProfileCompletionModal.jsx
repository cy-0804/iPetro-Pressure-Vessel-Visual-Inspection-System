import React, { useState } from 'react';
import { Modal, TextInput, Button, Group, Stack, Text, LoadingOverlay } from '@mantine/core';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { notifications } from '@mantine/notifications';
import { IconCheck } from '@tabler/icons-react';

export function ProfileCompletionModal({ opened, userId, userEmail }) {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!firstName.trim() || !lastName.trim()) {
            notifications.show({
                title: 'Validation Error',
                message: 'First Name and Last Name are required.',
                color: 'red'
            });
            return;
        }

        setLoading(true);
        try {
            const userRef = doc(db, 'users', userId);
            await updateDoc(userRef, {
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                fullName: `${firstName.trim()} ${lastName.trim()}`, // Redundant but useful for search/display
                isProfileComplete: true
            });

            notifications.show({
                title: 'Profile Updated',
                message: 'Thank you! Your profile is now complete.',
                color: 'green',
                icon: <IconCheck size={16} />
            });
            // MainLayout's listener will detect the change and auto-close the modal
        } catch (error) {
            console.error("Error updating profile:", error);
            notifications.show({
                title: 'Error',
                message: 'Failed to update profile. Please try again.',
                color: 'red'
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            opened={opened}
            onClose={() => { }} // Prevent closing by clicking outside or escape
            withCloseButton={false}
            title="Complete Your Profile"
            centered
            closeOnClickOutside={false}
            closeOnEscape={false}
            overlayProps={{
                backgroundOpacity: 0.55,
                blur: 3,
            }}
        >
            <LoadingOverlay visible={loading} zIndex={1000} overlayProps={{ radius: "sm", blur: 2 }} />
            <Stack>
                <Text size="sm" c="dimmed">
                    Please provide your full name for reporting purposes. This helps identify you in reports and inspections.
                </Text>

                {userEmail && (
                    <Text size="xs" c="dimmed" fs="italic">
                        Account: {userEmail}
                    </Text>
                )}

                <TextInput
                    label="First Name"
                    placeholder="e.g. Ali"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    data-autofocus
                />
                <TextInput
                    label="Last Name"
                    placeholder="e.g. Bin Abu"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                />

                <Group justify="flex-end" mt="md">
                    <Button onClick={handleSubmit} loading={loading}>
                        Save & Continue
                    </Button>
                </Group>
            </Stack>
        </Modal>
    );
}
