import { Group, Burger, Box, Image, Container } from "@mantine/core";
import { useNavigate } from "react-router-dom";

export function Header({ opened, toggle }) {
  const navigate = useNavigate();

  return (
    <Box h={60} p={0} bg="white">
      <Container fluid px={20} h="100%">
        <Group justify="flex-start" align="center" h="100%" gap={20}>

          {/* Burger (always on left for ALL breakpoints) */}
          <Burger
            opened={opened}
            onClick={toggle}
            size="sm"
            aria-label="Toggle navigation"
          />

          {/* Logo */}
          <Box
            style={{
              cursor: "pointer",
              display: "flex",
              alignItems: "center"
            }}
            onClick={() => navigate("/dashboard")}
          >
            <Image
              src="/src/assets/ipetro-logo.png"
              w={140}
              fit="contain"
              alt="IPETRO Logo"
            />
          </Box>

        </Group>
      </Container>
    </Box>
  );
}
