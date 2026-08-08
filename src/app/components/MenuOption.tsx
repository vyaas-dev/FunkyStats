import React, { useState, useRef, useEffect } from "react";
import "@/app/globals.css";
import ThemeToggle from "./ThemeToggle";
import Link from "next/link";
import { getCacheManager } from "@/app/lib/cache";
import SearchBar from "./SearchBar";

const mobileOptions = [
  { label: "Teams", value: "/global/2026" },
  { label: "Events", value: "/events/all" },
];

interface MenuOptionProps {
  isMobile?: boolean;
}

const MenuOption: React.FC<MenuOptionProps> = ({ isMobile }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState({
    top: 0,
    right: 0,
    width: 0,
  });

  const menuOptions = isMobile ? [...mobileOptions] : [];

  const handleClearCache = async () => {
    if (
      confirm(
        "Are you sure you want to clear the cache? This will remove all locally stored data and reload the page."
      )
    ) {
      try {
        const cache = getCacheManager();
        await cache.clear();
        alert("Cache cleared successfully! The page will reload.");
        window.location.reload();
      } catch (error) {
        console.error("Error clearing cache:", error);
        alert("Failed to clear cache");
      }
    }
  };

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        buttonRef.current &&
        dropdownRef.current &&
        !buttonRef.current.contains(target) &&
        !dropdownRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  useEffect(() => {
    if (open && buttonRef.current) {
      const updatePosition = () => {
        if (buttonRef.current) {
          const rect = buttonRef.current.getBoundingClientRect();
          if (isMobile) {
            const width = window.innerWidth * 0.96;
            const left = (window.innerWidth - width) / 2;
            setMenuPosition({
              top: rect.bottom + 8,
              right: window.innerWidth - (left + width),
              width: width,
            });
          } else {
            setMenuPosition({
              top: rect.bottom + 8,
              right: window.innerWidth - rect.right,
              width: 0,
            });
          }
        }
      };
      updatePosition();
      window.addEventListener("resize", updatePosition);
      window.addEventListener("scroll", updatePosition, true);
      return () => {
        window.removeEventListener("resize", updatePosition);
        window.removeEventListener("scroll", updatePosition, true);
      };
    }
  }, [open, isMobile]);

  const [menuHovered, setMenuHovered] = useState(false);

  return (
    <div
      ref={ref}
      style={{
        position: "relative",
        display: "inline-block",
      }}
      onClick={() => setOpen((prev) => !prev)}
    >
      <button
        ref={buttonRef}
        aria-label="Menu"
        onMouseEnter={() => setMenuHovered(true)}
        onMouseLeave={() => setMenuHovered(false)}
        style={{
          background:
            menuHovered || open ? "var(--menu-hover-bg)" : "transparent",
          border: "1.5px solid",
          borderColor:
            menuHovered || open ? "var(--yellow-color)" : "rgba(0, 0, 0, 0.15)",
          padding: isMobile ? 12 : 12,
          cursor: "pointer",
          outline: "none",
          borderRadius: "0.5rem",
          transition: "all 0.3s ease",
          transform: menuHovered ? "scale(1.05)" : "scale(1)",
          boxShadow: open ? "0 2px 4px rgba(0, 0, 0, 0.08)" : "none",
        }}
      >
        <div
          style={{
            width: isMobile ? 32 : 30,
            height: isMobile ? 32 : 30,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 4,
          }}
        >
          <span
            style={{
              height: 3,
              background: "var(--menu-color)",
              borderRadius: 2,
              transition: "all 0.3s ease",
              transform: open ? "rotate(45deg) translateY(7px)" : "none",
            }}
          />
          <span
            style={{
              height: 3,
              background: "var(--menu-color)",
              borderRadius: 2,
              transition: "all 0.3s ease",
              opacity: open ? 0 : 1,
            }}
          />
          <span
            style={{
              height: 3,
              background: "var(--menu-color)",
              borderRadius: 2,
              transition: "all 0.3s ease",
              transform: open ? "rotate(-45deg) translateY(-7px)" : "none",
            }}
          />
        </div>
      </button>
      {open && (
        <div
          ref={dropdownRef}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "fixed",
            top: `${menuPosition.top}px`,
            right: `${menuPosition.right}px`,
            width:
              isMobile && menuPosition.width > 0
                ? `${menuPosition.width}px`
                : "auto",
            maxWidth: isMobile ? "96vw" : "none",
            background: "var(--option-bg)",
            boxShadow:
              "0 4px 16px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.08)",
            borderRadius: 12,
            padding: isMobile ? 16 : 16,
            display: "flex",
            flexDirection: "column",
            gap: isMobile ? 16 : 12,
            zIndex: 100000,
            justifyContent: "center",
            alignItems: "stretch",
            minWidth: isMobile ? "auto" : 200,
            animation: "slideDown 0.3s ease",
          }}
        >
          {isMobile ? (
            <>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  width: "100%",
                }}
              >
                {menuOptions.map((option, index) => (
                  <Link
                    key={option.value}
                    style={{
                      padding: "12px 16px",
                      border: "1px solid #ffffff",
                      background: "transparent",
                      borderRadius: 8,
                      fontSize: 17,
                      textDecoration: "none",
                      cursor: "pointer",
                      color: "var(--option-text)",
                      textAlign: "center",
                      fontWeight: 500,
                      transition: "all 0.2s ease",
                      animation: `slideIn 0.3s ease ${index * 0.05}s both`,
                    }}
                    href={option.value}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background =
                        "var(--menu-item-hover-bg)";
                      e.currentTarget.style.color = "var(--yellow-color)";
                      e.currentTarget.style.transform = "scale(1.02)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.color = "var(--option-text)";
                      e.currentTarget.style.transform = "scale(1)";
                    }}
                  >
                    {option.label}
                  </Link>
                ))}
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 12,
                  width: "100%",
                  flexWrap: "wrap",
                }}
              >
                <ThemeToggle />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClearCache();
                  }}
                  style={{
                    padding: "10px 18px",
                    border: "2px solid var(--clear-cache-border)",
                    background: "var(--clear-cache-bg)",
                    borderRadius: 8,
                    fontSize: 15,
                    cursor: "pointer",
                    color: "var(--clear-cache-text)",
                    fontWeight: "600",
                    transition: "all 0.3s ease",
                    width: "auto",
                    flexShrink: 0,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background =
                      "var(--clear-cache-hover-bg)";
                    e.currentTarget.style.borderColor = "#ff4444";
                    e.currentTarget.style.transform = "scale(1.02)";
                    e.currentTarget.style.boxShadow =
                      "0 4px 12px rgba(255, 68, 68, 0.3)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "var(--clear-cache-bg)";
                    e.currentTarget.style.borderColor =
                      "var(--clear-cache-border)";
                    e.currentTarget.style.transform = "scale(1)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  Clear Cache
                </button>
              </div>

              <div
                style={{
                  width: "100%",
                  height: "1px",
                  background: "var(--menu-color)",
                  opacity: 0.2,
                  margin: "8px 0",
                }}
              />

              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  width: "100%",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  animation: "slideIn 0.3s ease 0.05s both",
                  margin: 0,
                  padding: 0,
                }}
              >
                <SearchBar isMobile={true} />
              </div>
            </>
          ) : (
            <>
              <ThemeToggle />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleClearCache();
                }}
                style={{
                  padding: "10px 14px",
                  border: "2px solid var(--clear-cache-border)",
                  background: "var(--clear-cache-bg)",
                  borderRadius: 8,
                  fontSize: 14,
                  cursor: "pointer",
                  color: "var(--clear-cache-text)",
                  fontWeight: "600",
                  transition: "all 0.3s ease",
                  width: "100%",
                  animation: "slideIn 0.3s ease 0.15s both",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background =
                    "var(--clear-cache-hover-bg)";
                  e.currentTarget.style.borderColor = "#ff4444";
                  e.currentTarget.style.transform = "scale(1.02)";
                  e.currentTarget.style.boxShadow =
                    "0 4px 12px rgba(255, 68, 68, 0.3)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "var(--clear-cache-bg)";
                  e.currentTarget.style.borderColor =
                    "var(--clear-cache-border)";
                  e.currentTarget.style.transform = "scale(1)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                ✖ Clear Cache
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default MenuOption;
