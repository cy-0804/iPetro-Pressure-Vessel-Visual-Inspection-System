import { useState } from 'react';
import { Container, Group, Burger, Box, Text, Button,Image } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useNavigate, useLocation } from 'react-router-dom';

const links = [

];

export function Header() {
  const [opened, { toggle }] = useDisclosure(false);
  const navigate = useNavigate();
  const location = useLocation(); // Gets current URL to set active state automatically

  const items = links.map((link) => (
    <Button
      key={link.label}
      variant={location.pathname === link.link ? 'light' : 'subtle'} // Active state style
      color="gray" // Neutral color
      onClick={() => {
        navigate(link.link); // The React Router way to move
      }}
    >
      {link.label}
    </Button>
  ));

  return (
    <Box h={60} p={0}>
      <Container  fluid  px={0} mx={80}  h="100%">
        <Group justify="space-between" align="center" h="100%">
          
          {/* 1. Logo Area */}
           <Image src="../src/assets/ipetro-logo.png" w={200} alt="IPETRO Logo" />

          {/* 2. Desktop Menu */}
          <Group gap={5} visibleFrom="xs">
            {items}
          </Group>

          <Button variant="default">Log Out</Button>
          {/* 3. Mobile Menu Button */}
          <Burger opened={opened} onClick={toggle} hiddenFrom="xs" size="sm" />
        
        </Group>
      </Container>
    </Box>
  );
}