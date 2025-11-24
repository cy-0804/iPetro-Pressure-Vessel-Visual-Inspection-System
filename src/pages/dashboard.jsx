import { Title, SimpleGrid, Paper, Text } from "@mantine/core";

export default function DashboardPage() {
  return (
    <div>
      {/* This Title will appear INSIDE the Main area of your AppShell */}
      <Title order={2} mb="md">
        Dashboard Overview
      </Title>

      <SimpleGrid cols={{ base: 1, sm: 3 }}>
        {/* Stat Card 1 */}
        <Paper shadow="xs" p="md" withBorder>
          <Text size="xs" c="dimmed">
            TOTAL REPORTS
          </Text>
          <Text fw={700} size="xl">
            12
          </Text>
        </Paper>

        {/* Stat Card 2 */}
        <Paper shadow="xs" p="md" withBorder>
          <Text size="xs" c="dimmed">
            PENDING REVIEW
          </Text>
          <Text fw={700} size="xl">
            4
          </Text>
        </Paper>

        {/* Stat Card 3 */}
        <Paper shadow="xs" p="md" withBorder>
          <Text size="xs" c="dimmed">
            COMPLETED
          </Text>
          <Text fw={700} size="xl">
            8
          </Text>
        </Paper>
      </SimpleGrid>
    </div>
  );
}
