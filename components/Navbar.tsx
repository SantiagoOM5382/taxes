"use client";

import { Layout, Menu, Avatar, Dropdown } from "antd";
import { UserOutlined, LogoutOutlined } from "@ant-design/icons";
import Link from "next/link";

const { Header } = Layout;

export default function Navbar({ user }: { user: any }) {
  const items = [
    { key: "asesor", label: <Link href="/asesor">Asesor IA</Link> },
    { key: "dashboard", label: <Link href="/dashboard">Mis Deudas</Link> },
    { key: "finanzas", label: <Link href="/finanzas">Mis Finanzas</Link> },
    { key: "calendario", label: <Link href="/calendario">Calendario</Link> },
  ];

  const userMenu = {
    items: [
      {
        key: "logout",
        icon: <LogoutOutlined />,
        label: "Cerrar sesión",
      },
    ],
  };

  return (
    <Header style={{ display: "flex", alignItems: "center" }}>
      <div style={{ color: "#fff", fontWeight: 700, marginRight: 24 }}>
        · Mis Deudas
      </div>

      <Menu
        theme="dark"
        mode="horizontal"
        items={items}
        style={{ flex: 1 }}
      />

      {user && (
        <Dropdown menu={userMenu} placement="bottomRight">
          <Avatar style={{ cursor: "pointer", backgroundColor: "#3b82f6" }}>
            {user.nombre.charAt(0).toUpperCase()}
          </Avatar>
        </Dropdown>
      )}
    </Header>
  );
}