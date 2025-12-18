import { 
  Container, 
  Title, 
  SimpleGrid, 
  Paper, 
  Text, 
  Group, 
  Stack,
  Progress,
  Badge,
  ThemeIcon,
  Card,
  Grid,
  RingProgress,
  Center
} from "@mantine/core";
import { 
  IconReportAnalytics, 
  IconClock, 
  IconCircleCheck, 
  IconAlertCircle,
  IconTrendingUp,
  IconCalendar
} from '@tabler/icons-react';

export default function Dashboard() {
  // Sample data
  const stats = [
    {
      title: 'Total Reports',
      value: '12',
      icon: IconReportAnalytics,
      color: 'blue',
      description: '+2 from last month',
      trend: 'up'
    },
    {
      title: 'Pending Review',
      value: '4',
      icon: IconClock,
      color: 'yellow',
      description: '2 urgent items',
      trend: 'neutral'
    },
    {
      title: 'Completed',
      value: '8',
      icon: IconCircleCheck,
      color: 'green',
      description: '66.7% completion',
      trend: 'up'
    },
    {
      title: 'Overdue',
      value: '2',
      icon: IconAlertCircle,
      color: 'red',
      description: 'Needs attention',
      trend: 'down'
    }
  ];

  const recentInspections = [
    { id: 1, equipment: 'Pressure Vessel #A-101', status: 'Completed', date: '2024-12-15', inspector: 'John Doe' },
    { id: 2, equipment: 'Boiler #B-205', status: 'Pending', date: '2024-12-18', inspector: 'Jane Smith' },
    { id: 3, equipment: 'Heat Exchanger #HE-301', status: 'In Progress', date: '2024-12-17', inspector: 'Mike Johnson' },
    { id: 4, equipment: 'Storage Tank #T-402', status: 'Scheduled', date: '2024-12-20', inspector: 'Sarah Lee' },
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed': return 'green';
      case 'Pending': return 'yellow';
      case 'In Progress': return 'blue';
      case 'Scheduled': return 'gray';
      default: return 'gray';
    }
  };

  return (
    <Container size="xl" px={0}>
      {/* Header Section */}
      <Stack gap="lg" mb="xl">
        <Group justify="space-between" align="center">
          <div>
            <Title 
              order={1} 
              style={{ 
                // background: 'linear-gradient(45deg, #667eea 0%, #764ba2 100%)',
                // WebkitBackgroundClip: 'text',
                // WebkitTextFillColor: 'transparent',
                // backgroundClip: 'text'
              }}
            >
              Dashboard Overview
            </Title>
            <Text c="dimmed" size="sm" mt={5}>
              Welcome back! Here's what's happening with your inspections today.
            </Text>
          </div>
          <Group>
            <ThemeIcon size="lg" radius="md" variant="light" color="violet">
              <IconCalendar size={20} />
            </ThemeIcon>
            <div>
              <Text size="xs" c="dimmed">Today</Text>
              <Text size="sm" fw={600}>December 18, 2024</Text>
            </div>
          </Group>
        </Group>
      </Stack>

      {/* Stats Grid */}
      <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="lg" mb="xl">
        {stats.map((stat, index) => (
          <Paper 
            key={index}
            shadow="sm" 
            p="xl" 
            radius="md"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.95) 100%)',
              border: '1px solid #e9ecef',
              transition: 'all 0.3s ease',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
            }}
          >
            <Group justify="space-between" mb="md">
              <ThemeIcon 
                size={50} 
                radius="md" 
                variant="light" 
                color={stat.color}
                style={{ background: `rgba(var(--mantine-color-${stat.color}-1-rgb), 0.1)` }}
              >
                <stat.icon size={28} stroke={1.5} />
              </ThemeIcon>
              {stat.trend === 'up' && (
                <ThemeIcon size="sm" radius="xl" color="green" variant="light">
                  <IconTrendingUp size={14} />
                </ThemeIcon>
              )}
            </Group>
            
            <Text size="xs" tt="uppercase" fw={700} c="dimmed" mb={5}>
              {stat.title}
            </Text>
            
            <Group align="flex-end" gap="xs">
              <Text 
                size="32px" 
                fw={700}
                style={{ lineHeight: 1 }}
              >
                {stat.value}
              </Text>
            </Group>
            
            <Text size="xs" c="dimmed" mt="sm">
              {stat.description}
            </Text>
          </Paper>
        ))}
      </SimpleGrid>

      {/* Main Content Grid */}
      <Grid gutter="lg">
        {/* Recent Inspections */}
        <Grid.Col span={{ base: 12, md: 8 }}>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group justify="space-between" mb="md">
              <Title order={3}>Recent Inspections</Title>
              <Badge size="lg" variant="light" color="blue">
                4 Active
              </Badge>
            </Group>

            <Stack gap="md">
              {recentInspections.map((inspection) => (
                <Paper 
                  key={inspection.id}
                  p="md" 
                  withBorder 
                  radius="md"
                  style={{
                    transition: 'all 0.2s ease',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f8f9fa';
                    e.currentTarget.style.borderColor = '#667eea';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.borderColor = '#dee2e6';
                  }}
                >
                  <Group justify="space-between" wrap="nowrap">
                    <div style={{ flex: 1 }}>
                      <Text fw={600} size="sm" mb={5}>
                        {inspection.equipment}
                      </Text>
                      <Group gap="xs">
                        <Text size="xs" c="dimmed">
                          Inspector: {inspection.inspector}
                        </Text>
                        <Text size="xs" c="dimmed">•</Text>
                        <Text size="xs" c="dimmed">
                          {inspection.date}
                        </Text>
                      </Group>
                    </div>
                    <Badge 
                      color={getStatusColor(inspection.status)}
                      variant="light"
                      size="lg"
                    >
                      {inspection.status}
                    </Badge>
                  </Group>
                </Paper>
              ))}
            </Stack>
          </Card>
        </Grid.Col>

        {/* Completion Rate */}
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Stack gap="lg">
            {/* Completion Rate Card */}
            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Title order={3} mb="md">Completion Rate</Title>
              
              <Center>
                <RingProgress
                  size={180}
                  thickness={16}
                  roundCaps
                  sections={[
                    { value: 66.7, color: 'green' },
                  ]}
                  label={
                    <Center>
                      <div style={{ textAlign: 'center' }}>
                        <Text size="32px" fw={700} style={{ lineHeight: 1 }}>
                          66.7%
                        </Text>
                        <Text size="xs" c="dimmed" mt={5}>
                          Complete
                        </Text>
                      </div>
                    </Center>
                  }
                />
              </Center>

              <Stack gap="xs" mt="md">
                <Group justify="space-between">
                  <Group gap="xs">
                    <div 
                      style={{ 
                        width: 12, 
                        height: 12, 
                        borderRadius: '50%', 
                        backgroundColor: 'var(--mantine-color-green-6)' 
                      }} 
                    />
                    <Text size="sm">Completed</Text>
                  </Group>
                  <Text size="sm" fw={600}>8</Text>
                </Group>
                
                <Group justify="space-between">
                  <Group gap="xs">
                    <div 
                      style={{ 
                        width: 12, 
                        height: 12, 
                        borderRadius: '50%', 
                        backgroundColor: 'var(--mantine-color-yellow-6)' 
                      }} 
                    />
                    <Text size="sm">Pending</Text>
                  </Group>
                  <Text size="sm" fw={600}>4</Text>
                </Group>
              </Stack>
            </Card>

            {/* Quick Actions Card */}
            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Title order={3} mb="md">Quick Actions</Title>
              
              <Stack gap="sm">
                <Paper
                  p="md"
                  radius="md"
                  style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    cursor: 'pointer',
                    transition: 'transform 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <Text fw={600} size="sm">New Inspection</Text>
                  <Text size="xs" mt={4} style={{ opacity: 0.9 }}>
                    Schedule equipment inspection
                  </Text>
                </Paper>

                <Paper
                  p="md"
                  radius="md"
                  style={{
                    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                    color: 'white',
                    cursor: 'pointer',
                    transition: 'transform 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <Text fw={600} size="sm">Generate Report</Text>
                  <Text size="xs" mt={4} style={{ opacity: 0.9 }}>
                    Create inspection report
                  </Text>
                </Paper>

                <Paper
                  p="md"
                  radius="md"
                  style={{
                    background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                    color: 'white',
                    cursor: 'pointer',
                    transition: 'transform 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <Text fw={600} size="sm">View Calendar</Text>
                  <Text size="xs" mt={4} style={{ opacity: 0.9 }}>
                    Check schedule
                  </Text>
                </Paper>
              </Stack>
            </Card>
          </Stack>
        </Grid.Col>
      </Grid>
    </Container>
  );
}