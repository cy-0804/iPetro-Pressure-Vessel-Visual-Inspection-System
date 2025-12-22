import { IconBrandFacebook, IconBrandInstagram, IconBrandLinkedin, IconMail, IconPhone, IconMapPin } from '@tabler/icons-react';
import { ActionIcon, Container, Group, Text, Stack, Divider, Box } from '@mantine/core';
import ipetroLogo from '../assets/ipetro-logo.png';
import './FooterLinks.css';

const data = [
  {
    title: 'About Us',
    links: [
      { label: 'iPetro Academy', link: 'https://ipetroacademy.com/' },
      { label: 'Our Services', link: 'https://ipetroacademy.com/' },
      { label: 'Careers', link: 'https://ipetroacademy.com/' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Documentation', link: '#' },
      { label: 'Help Center', link: '#' },
      { label: 'Privacy Policy', link: '#' },
      { label: 'Terms of Service', link: '#' },
    ],
  },
];

const contactInfo = {
  title: 'Contact Us',
  items: [
    {
      icon: IconMail,
      label: 'info@ipetro.com.my',
      link: 'https://ipetroacademy.com/contact/',
    },
    {
      icon: IconPhone,
      label: '+60 06-350 0073',
      link: 'tel:+60063500073',
    },
    {
      icon: IconMapPin,
      label: 'No.15-1, Jalan Kerambit 5, Bandar Baru Sg. Udang, 76300 Melaka',
      link: 'https://maps.google.com/?q=iPetro+Services+Melaka',
    },
  ],
};

const contributors = [
  'Chamnan Chong',
  'Muhamad Rafeeq',
  'Muhammad Farhan',
  'Ang Cha Yan',
  'Isaac Ryan Koirin',
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
      >
        {link.label}
      </Text>
    ));

    return (
      <div className="footer-wrapper" key={group.title}>
        <Text className="footer-title">{group.title}</Text>
        <Stack gap={4}>
          {links}
        </Stack>
      </div>
    );
  });

  const contactLinks = contactInfo.items.map((item, index) => {
    const Icon = item.icon;
    return (
      <Group
        key={index}
        gap="xs"
        className="footer-contact-item"
        component="a"
        href={item.link}
        target="_blank"
        rel="noopener noreferrer"
        wrap="nowrap"
        align="flex-start"
      >
        <Icon size={16} stroke={1.5} style={{ color: '#868e96', flexShrink: 0, marginTop: 2 }} />
        <Text size="sm" className="footer-link" style={{ margin: 0 }}>
          {item.label}
        </Text>
      </Group>
    );
  });

  return (
    <footer className="footer">
      <Container size="xl" className="footer-inner">
        {/* Logo and Description */}
        <div className="footer-logo-section">
          <Box mb="md">
            <img 
              src={ipetroLogo} 
              alt="iPetro Logo" 
              className="footer-logo-img"
            />
          </Box>
          <Text size="sm" c="dimmed" className="footer-description">
            iPetro Pressure Vessel Visual Inspection System
          </Text>
          
          {/* Social Media */}
          <Group gap={8} mt="lg" className="footer-social-group">
            <ActionIcon 
              size="lg" 
              radius="md"
              color="gray" 
              variant="light"
              component="a"
              href="https://www.facebook.com/ipetroservices/"
              target="_blank"
              rel="noopener noreferrer"
              className="footer-social-icon"
            >
              <IconBrandFacebook size={18} stroke={1.5} />
            </ActionIcon>
            
            <ActionIcon 
              size="lg" 
              radius="md"
              color="gray" 
              variant="light"
              component="a"
              href="https://www.linkedin.com/company/ipetro/?originalSubdomain=my"
              target="_blank"
              rel="noopener noreferrer"
              className="footer-social-icon"
            >
              <IconBrandLinkedin size={18} stroke={1.5} />
            </ActionIcon>
            
            <ActionIcon 
              size="lg" 
              radius="md"
              color="gray" 
              variant="light"
              component="a"
              href="https://www.instagram.com/explore/locations/1867790576796651/ipetro-services-sdn-bhd/"
              target="_blank"
              rel="noopener noreferrer"
              className="footer-social-icon"
            >
              <IconBrandInstagram size={18} stroke={1.5} />
            </ActionIcon>
          </Group>
        </div>

        {/* Links Groups */}
        <div className="footer-groups">
          {groups}
          
          {/* Contact Section */}
          <div className="footer-wrapper">
            <Text className="footer-title">{contactInfo.title}</Text>
            <Stack gap={8}>
              {contactLinks}
            </Stack>
          </div>
        </div>
      </Container>

      <Divider my="xl" color="#e9ecef" />

      {/* Bottom Section */}
      <Container size="xl">
        <div className="footer-bottom">
          <div className="footer-bottom-left">
            <Text c="dimmed" size="sm" fw={500}>
              © 2025 iPetro Services Sdn Bhd. All rights reserved.
            </Text>
            <Text c="dimmed" size="xs" mt={6} style={{ lineHeight: 1.5 }}>
              Developed by: {contributors.join(' • ')}
            </Text>
          </div>
          
          <Group gap="lg" className="footer-bottom-links">
            <Text 
              size="sm" 
              c="dimmed" 
              component="a" 
              href="#" 
              className="footer-bottom-link"
            >
              Privacy Policy
            </Text>
            <Text 
              size="sm" 
              c="dimmed" 
              component="a" 
              href="#" 
              className="footer-bottom-link"
            >
              Terms of Service
            </Text>
            <Text 
              size="sm" 
              c="dimmed" 
              component="a" 
              href="#" 
              className="footer-bottom-link"
            >
              Cookies
            </Text>
          </Group>
        </div>
      </Container>
    </footer>
  );
}