"use client";

import Link from "next/link";
import Image from "next/image";
import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import "@/app/globals.css";
import MenuOption from "./MenuOption";
import SearchBar from "./SearchBar";
import styles from "./Navbar.module.css";

const navLinkStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "0.85rem 1.6rem",
  borderRadius: "0.65rem",
  fontSize: "1.125rem",
  fontWeight: 700,
  background: "var(--nav-button-bg)",
  color: "var(--nav-button-text)",
  textDecoration: "none",
  cursor: "pointer",
  border: "none",
  outline: "none",
  boxSizing: "border-box",
  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
  position: "relative",
  overflow: "hidden",
  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)",
};

export default function Navbar() {
  const pathname = usePathname();
  const links = [
    { href: "/global/2026", label: "Teams" },
    { href: "/events/all", label: "Events" },
  ];

  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = React.useState(false);
  const [hoveredLink, setHoveredLink] = useState<string | null>(null);
  const [logoHovered, setLogoHovered] = useState(false);

  const effectiveIsMobile = mounted ? isMobile : false;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const saved = localStorage.getItem("theme");
    const system = window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
    const initial = saved === "light" || saved === "dark" ? saved : system;
    document.documentElement.setAttribute("data-theme", initial);
  }, [mounted]);

  React.useEffect(() => {
    function handleResize() {
      const aspectRatio = window.innerWidth / window.innerHeight;
      setIsMobile(aspectRatio < 1);
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (pathname?.startsWith("/analytics")) {
    return null;
  }

  return (
    <nav className={styles.navRoot}>
      <div
        className={`${styles.navInner} ${effectiveIsMobile ? styles.navInnerMobile : ""}`}
      >
        <div
          className={`${styles.navRow} ${effectiveIsMobile ? styles.navRowMobile : ""}`}
        >
          <Link href="/" className={styles.linkWrap} style={{ textDecoration: "none" }}>
            <div
              onMouseEnter={() => setLogoHovered(true)}
              onMouseLeave={() => setLogoHovered(false)}
              className={`${styles.logoWrap} ${logoHovered ? styles.logoWrapHovered : ""}`}
            >
              <Image
                src="/logo846.png"
                alt="Logo"
                width={effectiveIsMobile ? 48 : 56}
                height={effectiveIsMobile ? 52 : 62}
                className={
                  logoHovered ? "navbar-logo logo-hovered" : "navbar-logo"
                }
                style={{
                  zIndex: 1000,
                  marginLeft: effectiveIsMobile ? "0.25rem" : "0.5rem",
                  transition: "filter 0.3s ease",
                  flexShrink: 0,
                }}
              />
              <p
                style={{
                  marginLeft: effectiveIsMobile ? "0.5rem" : "1rem",
                  color: "var(--yellow-color)",
                  fontWeight: "bold",
                  fontSize: effectiveIsMobile ? "1.55rem" : "1.85rem",
                  transition: "all 0.3s ease",
                  textShadow: logoHovered
                    ? "0 2px 8px var(--yellow-glow)"
                    : "0 1px 2px rgba(0, 0, 0, 0.08)",
                  letterSpacing: "-0.02em",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                FunkyStats
              </p>
            </div>
          </Link>

          <div
            className={`${styles.navLinksWrap} ${effectiveIsMobile ? styles.navLinksWrapMobile : ""}`}
          >
            {!effectiveIsMobile && <SearchBar isMobile={false} />}
            {!effectiveIsMobile &&
              links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={styles.linkWrap}
                >
                  <div
                    onMouseEnter={() => setHoveredLink(link.href)}
                    onMouseLeave={() => setHoveredLink(null)}
                    style={{
                      ...navLinkStyle,
                      transform:
                        hoveredLink === link.href
                          ? "translateY(-1px)"
                          : "translateY(0)",
                      boxShadow:
                        hoveredLink === link.href
                          ? "0 4px 12px var(--nav-button-shadow), 0 2px 4px rgba(0, 0, 0, 0.06)"
                          : "0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)",
                      background:
                        hoveredLink === link.href
                          ? "var(--nav-button-bg-hover)"
                          : "var(--nav-button-bg)",
                    }}
                  >
                    {link.label}
                  </div>
                </Link>
              ))}
            <MenuOption isMobile={effectiveIsMobile} />
          </div>
        </div>
      </div>
    </nav>
  );
}
