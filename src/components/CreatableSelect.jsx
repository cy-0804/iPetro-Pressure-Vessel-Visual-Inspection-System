import React, { useState } from 'react';
import { Select, Group, Text, ActionIcon } from '@mantine/core';
import { IconTrash } from '@tabler/icons-react';

export function CreatableSelect({ data, value, onChange, onCreate, onDelete, label, placeholder, ...props }) {
    const [search, setSearch] = useState('');

    // Convert strings to objects if needed, and handle "Create" option
    const exactMatch = data.some(item => item === search);

    // Build options list
    const selectData = data.map(item => ({ value: item, label: item }));

    // Add "Create" option if searching and no match
    if (search && !exactMatch && search.trim().length > 0) {
        selectData.push({
            value: search,
            label: `+ Create "${search}"`
        });
    }

    const handleChange = (val) => {
        if (val && !data.includes(val)) {
            // It's a new item
            onCreate(val);
        }
        onChange(val);
        setSearch(''); // Reset search after selection
    };

    return (
        <Select
            label={label}
            placeholder={placeholder}
            data={selectData}
            value={value}
            onChange={handleChange}
            searchable
            searchValue={search}
            onSearchChange={setSearch}
            nothingFoundMessage="Type to create..."
            renderOption={({ option }) => {
                // Check if it's the "Create" option (value equals search and not in original data)
                const isCreateOption = option.value === search && !data.includes(option.value);

                if (isCreateOption) {
                    return <Text size="sm" c="blue">{option.label}</Text>;
                }

                return (
                    <Group flex="1" gap="xs" justify="space-between" w="100%" wrap="nowrap">
                        <Text size="sm">{option.label}</Text>
                        <ActionIcon
                            size="xs"
                            color="red"
                            variant="subtle"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onDelete(option.value);
                            }}
                        >
                            <IconTrash size={12} />
                        </ActionIcon>
                    </Group>
                );
            }}
            {...props}
        />
    );
}
