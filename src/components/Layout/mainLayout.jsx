import { AppShell } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { Outlet } from "react-router-dom";
import { SideBar } from "../Layout/sideBar.jsx"; // Adjust path as needed
import { Header } from "../Layout/header.jsx";   // Adjust path as needed

// Debug code removed

export function MainLayout() {
  // defaulting to false means it starts CLOSED. 
  // Change to useDisclosure(true) if you want it open by default.
  const [opened, { toggle }] = useDisclosure();

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: 300,
        breakpoint: "sm",
        // UPDATE HERE: Control desktop state too
        collapsed: { mobile: !opened, desktop: !opened },
      }}
      padding={30}
    >
      <AppShell.Header>
        <Header opened={opened} toggle={toggle} />
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <SideBar toggle={toggle} />
      </AppShell.Navbar>

      <AppShell.Main >
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}