import { AppShell, Burger, Group, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { Outlet } from "react-router-dom"; 
import { SideBar } from "./sideBar.jsx";
import { Header } from "./header.jsx"; 

export function MainLayout() {
  const [opened, { toggle }] = useDisclosure();

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: 300,
        breakpoint: "sm",
        collapsed: { mobile: !opened },
      }}
      padding="md"
    >
      <AppShell.Header>
      <Header/>
      </AppShell.Header>

      <AppShell.Navbar >
        {/* Isolate the links in a separate file so this file stays clean */}
        <SideBar />
      </AppShell.Navbar>

      <AppShell.Main>
        {/* This 'Outlet' is magic. 
            It renders whatever page you are currently on (Dashboard, Settings, etc.)
            inside this exact spot.
        */}
        <Outlet /> {/*benda ni amik page dalam router.jsx*/}
      </AppShell.Main>
    </AppShell>
  );
}
