import { IconBrandFacebook, IconBrandInstagram, IconBrandLinkedin } from '@tabler/icons-react';
import { ActionIcon, Container, Group, Text } from '@mantine/core';
import ipetroLogo from '../assets/ipetro-logo.png';
import './FooterLinks.css';

const data = [
  {
    title: 'About',
    links: [
      { label: 'iPetro Academy', link: 'https://ipetroacademy.com/' },
    ],
  },
  {
    title: 'Project',
    links: [
      { label: 'Contribute', link: '#' },
    ],
  },
  {
    title: 'Community',
    links: [
      { label: 'Join Discord', link: '#' },
    ],
  },
];

export function FooterLinks() {
  const groups = data.map((group) => {
    const links = group.links.map((link, index) => (
      <Text
        key={index}
        className="footer-link"
        component="a"
        href={link.link}
        target="_blank"
        rel="noopener noreferrer"
        style={{ cursor: 'pointer' }}
      >
        {link.label}
      </Text>
    ));

    return (
      <div className="footer-wrapper" key={group.title}>
        <Text className="footer-title">{group.title}</Text>
        {links}
      </div>
    );
  });

  return (
    <footer className="footer">
      <Container className="footer-inner">
        <div className="footer-logo">
          <img 
            src={ipetroLogo} 
            alt="iPetro Logo" 
            style={{ height: 40, width: 'auto' }} 
          />
          <Text size="xs" c="dimmed" className="footer-description">
            iPetro - Professional Equipment Inspection Management System
          </Text>
        </div>
        <div className="footer-groups">{groups}</div>
      </Container>
      <Container className="footer-after">
  <Text c="dimmed" size="sm">
    © 2026 iPetro. All rights reserved.
  </Text>
  <Group gap={0} className="footer-social" justify="flex-end" wrap="nowrap">
    <ActionIcon 
      size="lg" 
      color="gray" 
      variant="subtle"
      component="a"
      href="https://www.facebook.com/ipetroservices/"
      target="_blank"
      rel="noopener noreferrer"
    >
      <IconBrandFacebook size={18} stroke={1.5} />
    </ActionIcon>
    
    <ActionIcon 
      size="lg" 
      color="gray" 
      variant="subtle"
      component="a"
      href="https://www.linkedin.com/company/ipetro/?originalSubdomain=my"
      target="_blank"
      rel="noopener noreferrer"
    >
      <IconBrandLinkedin size={18} stroke={1.5} />
    </ActionIcon>
    
    <ActionIcon 
      size="lg" 
      color="gray" 
      variant="subtle"
      component="a"
      href="https://www.instagram.com/explore/locations/1867790576796651/ipetro-services-sdn-bhd/"
      target="_blank"
      rel="noopener noreferrer"
    >
      <IconBrandInstagram size={18} stroke={1.5} />
    </ActionIcon>
  </Group>
</Container>
    </footer>
  );
}