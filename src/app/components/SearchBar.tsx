"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

interface SearchBarProps {
  isMobile?: boolean;
  onSearchStateChange?: (isSearching: boolean) => void;
}

interface TeamOption {
  key: string;
  value: string;
}

interface EventOption {
  key: string;
  value: string;
}

interface FilteredOption {
  type: "team" | "event";
  key: string;
  value: string;
  display: string;
}

function SearchIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block" }}
      aria-hidden
    >
      <path
        d="M7 12C9.76142 12 12 9.76142 12 7C12 4.23858 9.76142 2 7 2C4.23858 2 2 4.23858 2 7C2 9.76142 4.23858 12 7 12Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10.5 10.5L14 14"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function SearchBar({
  isMobile = false,
  onSearchStateChange,
}: SearchBarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [events, setEvents] = useState<EventOption[]>([]);
  const [focused, setFocused] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const modalInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const modalPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const getTheme = () => {
      const saved = localStorage.getItem("theme");
      const system = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
      return saved === "light" || saved === "dark" ? saved : system;
    };

    const updateTheme = () => {
      setTheme(getTheme() as "light" | "dark");
    };

    updateTheme();
    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [teamsRes, eventsRes] = await Promise.all([
          fetch("/api/teams?year=2026"),
          fetch("/api/events?year=2026"),
        ]);

        if (teamsRes.ok) {
          const teamsData: TeamOption[] = await teamsRes.json();
          teamsData.sort((a: TeamOption, b: TeamOption) => {
            const numA = Number(a.key) || 0;
            const numB = Number(b.key) || 0;
            if (numA < numB) return -1;
            if (numA > numB) return 1;
            return a.value.localeCompare(b.value);
          });
          setTeams(teamsData);
        }

        if (eventsRes.ok) {
          const events2026: EventOption[] = await eventsRes.json();
          const uniqueEvents = Array.from(
            new Map(events2026.map((event) => [event.key, event])).values()
          );
          uniqueEvents.sort((a, b) => {
            const firstCharA = a.value.charAt(0);
            const firstCharB = b.value.charAt(0);
            if (firstCharA !== firstCharB) {
              return firstCharA.localeCompare(firstCharB);
            }
            return a.value.localeCompare(b.value);
          });
          setEvents(uniqueEvents);
        }
      } catch (error) {
        console.error("Error fetching search data:", error);
      }
    };

    fetchData();
  }, []);

  const closeModal = () => {
    setModalOpen(false);
    setFocused(false);
    setSelectedIndex(-1);
  };

  const navigateToResult = (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;

    const teamNumber = trimmed.toLowerCase().replace(/^frc/, "").trim();
    const teamMatch = teamNumber.match(/^\d+$/);
    if (teamMatch) {
      router.push(`/team/frc${teamNumber}-2026`);
      setSearchQuery("");
      closeModal();
      return;
    }

    const teamPrefixMatch = trimmed.match(/^team\s+(\d+)$/i);
    if (teamPrefixMatch) {
      router.push(`/team/frc${teamPrefixMatch[1]}-2026`);
      setSearchQuery("");
      closeModal();
      return;
    }

    const matchedTeam = teams.find(
      (team) =>
        team.value === trimmed ||
        team.value.toLowerCase() === trimmed.toLowerCase()
    );
    if (matchedTeam) {
      router.push(`/team/frc${matchedTeam.key}-2026`);
      setSearchQuery("");
      closeModal();
      return;
    }

    const matchedEvent = events.find(
      (event) => event.value.toLowerCase() === trimmed.toLowerCase()
    );
    if (matchedEvent) {
      router.push(`/events/${matchedEvent.key}`);
      setSearchQuery("");
      closeModal();
      return;
    }

    const partialEventMatch = events.find((event) =>
      event.value.toLowerCase().includes(trimmed.toLowerCase())
    );
    if (partialEventMatch) {
      router.push(`/events/${partialEventMatch.key}`);
      setSearchQuery("");
      closeModal();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigateToResult(searchQuery);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setSelectedIndex(-1);
  };

  const handleOptionSelect = (option: FilteredOption) => {
    if (option.type === "team") {
      router.push(`/team/frc${option.key}-2026`);
    } else {
      router.push(`/events/${option.key}`);
    }
    setSearchQuery("");
    closeModal();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0 && filteredOptions[selectedIndex]) {
        handleOptionSelect(filteredOptions[selectedIndex]);
      } else {
        navigateToResult(searchQuery);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < filteredOptions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === "Escape") {
      if (modalOpen) {
        closeModal();
      } else {
        setFocused(false);
        setSelectedIndex(-1);
      }
    }
  };

  const filteredOptions: FilteredOption[] = searchQuery
    ? (() => {
        const queryLower = searchQuery.toLowerCase();
        const queryNum = Number(searchQuery);
        const isNumericQuery = !isNaN(queryNum) && isFinite(queryNum);

        const teamMatches = teams.filter((team) =>
          team.value.toLowerCase().includes(queryLower)
        );

        let teamExact: typeof teams = [];
        let teamPrefix: typeof teams = [];
        let teamPartial: typeof teams = [];

        if (isNumericQuery) {
          teamExact = teamMatches.filter((team) => {
            const teamNum = Number(team.key);
            return !isNaN(teamNum) && teamNum === queryNum;
          });
          teamPrefix = teamMatches.filter((team) => {
            if (teamExact.includes(team)) return false;
            return team.key.startsWith(searchQuery);
          });
          teamPartial = teamMatches.filter(
            (team) => !teamExact.includes(team) && !teamPrefix.includes(team)
          );
        } else {
          teamPrefix = teamMatches.filter((team) =>
            team.value.toLowerCase().startsWith(queryLower)
          );
          teamPartial = teamMatches.filter(
            (team) => !teamPrefix.includes(team)
          );
        }

        const eventMatches = events.filter((event) =>
          event.value.toLowerCase().includes(queryLower)
        );
        const eventComplete = eventMatches.filter((event) =>
          event.value.toLowerCase().startsWith(queryLower)
        );
        const eventPartial = eventMatches.filter(
          (event) => !event.value.toLowerCase().startsWith(queryLower)
        );

        const allTeams = [...teamExact, ...teamPrefix, ...teamPartial].slice(
          0,
          5
        );
        const allEvents = [...eventComplete, ...eventPartial].slice(0, 5);

        return [
          ...allTeams.map((team) => ({
            type: "team" as const,
            key: team.key,
            value: team.value,
            display: `Team ${team.value}`,
          })),
          ...allEvents.map((event) => ({
            type: "event" as const,
            key: event.key,
            value: event.value,
            display: event.value,
          })),
        ];
      })()
    : [];

  useEffect(() => {
    if (onSearchStateChange) {
      onSearchStateChange(
        (modalOpen || focused) && filteredOptions.length > 0
      );
    }
  }, [focused, modalOpen, filteredOptions.length, onSearchStateChange]);

  useEffect(() => {
    if (!modalOpen) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusTimer = window.setTimeout(() => {
      modalInputRef.current?.focus();
    }, 30);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    document.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", onKey);
    };
  }, [modalOpen]);

  useEffect(() => {
    if (!isMobile || !focused) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setFocused(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [focused, isMobile]);

  const placeholderColor =
    theme === "light" ? "rgba(107, 114, 128, 0.75)" : "rgba(255, 255, 255, 0.7)";
  const softWhiteBorder = "2px solid rgba(255, 255, 255, 0.55)";
  const fieldBg =
    theme === "dark" ? "rgba(20, 20, 20, 0.95)" : "rgba(255, 255, 255, 0.98)";

  const renderResults = (inModal: boolean) => {
    if (!filteredOptions.length) return null;

    return (
      <div
        style={{
          marginTop: inModal ? 10 : 4,
          background:
            theme === "dark"
              ? "rgba(30, 30, 30, 0.98)"
              : "rgba(255, 255, 255, 0.98)",
          borderRadius: 12,
          border: `1px solid ${
            theme === "dark"
              ? "rgba(255, 255, 255, 0.1)"
              : "rgba(0, 0, 0, 0.08)"
          }`,
          boxShadow:
            theme === "dark"
              ? "0 16px 40px rgba(0,0,0,0.45)"
              : "0 14px 36px rgba(0,0,0,0.16)",
          maxHeight: inModal ? "min(50vh, 380px)" : "300px",
          overflowY: "auto",
          overflowX: "hidden",
        }}
      >
        {filteredOptions.map((option, idx) => (
          <div
            key={`${option.type}-${option.key}-${idx}`}
            onClick={() => handleOptionSelect(option)}
            onMouseEnter={() => setSelectedIndex(idx)}
            style={{
              padding: inModal ? "14px 16px" : "11px 14px",
              cursor: "pointer",
              background:
                selectedIndex === idx
                  ? theme === "dark"
                    ? "rgba(253, 224, 71, 0.17)"
                    : "rgba(107, 114, 128, 0.1)"
                  : "transparent",
              color: "var(--foreground)",
              fontSize: inModal ? 16 : isMobile ? 15 : 14,
              borderBottom:
                idx < filteredOptions.length - 1
                  ? `1px solid ${
                      theme === "dark"
                        ? "rgba(255, 255, 255, 0.1)"
                        : "rgba(0, 0, 0, 0.08)"
                    }`
                  : "none",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span
              style={{
                fontSize: 12,
                opacity: 0.65,
                fontWeight: 500,
                minWidth: 40,
              }}
            >
              {option.type === "team" ? "Team" : "Event"}
            </span>
            <span style={{ flex: 1 }}>{option.display}</span>
          </div>
        ))}
      </div>
    );
  };

  const renderSearchField = (
    ref: React.RefObject<HTMLInputElement | null>,
    inputId: string,
    large: boolean
  ) => (
    <form onSubmit={handleSubmit} style={{ margin: 0, width: "100%" }}>
      <div
        style={{
          display: "flex",
          alignItems: "stretch",
          width: "100%",
          borderRadius: large ? 16 : 14,
          border: softWhiteBorder,
          overflow: "hidden",
          background: fieldBg,
          boxShadow: large
            ? theme === "dark"
              ? "0 18px 48px rgba(0,0,0,0.5)"
              : "0 18px 48px rgba(0,0,0,0.18)"
            : "none",
        }}
      >
        <input
          id={inputId}
          ref={ref}
          type="text"
          placeholder="Search Teams or Events"
          value={searchQuery}
          onChange={handleInputChange}
          onFocus={() => setFocused(true)}
          onKeyDown={handleKeyDown}
          style={{
            flex: 1,
            padding: large ? "18px 20px" : isMobile ? "12px 14px" : "14px 16px",
            fontSize: large ? 18 : isMobile ? 15 : 16,
            border: "none",
            outline: "none",
            background: "transparent",
            color: "var(--foreground)",
            lineHeight: 1.5,
            minWidth: 0,
          }}
        />
        <button
          type="submit"
          aria-label="Search"
          style={{
            width: large ? 64 : isMobile ? 54 : 58,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            border: "none",
            outline: "none",
            cursor: "pointer",
            background: "var(--yellow-color)",
            color: "#000",
            flexShrink: 0,
          }}
        >
          <SearchIcon size={large ? 20 : 18} />
        </button>
      </div>
    </form>
  );

  // Desktop: trigger opens modal
  if (!isMobile) {
    return (
      <>
        <style>{`
          #search-input-modal::placeholder,
          #search-input-modal::-webkit-input-placeholder {
            color: ${placeholderColor};
            opacity: 1;
          }
        `}</style>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={modalOpen}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 16px",
            minWidth: 300,
            borderRadius: 14,
            border: softWhiteBorder,
            background:
              theme === "dark"
                ? "rgba(20, 20, 20, 0.9)"
                : "rgba(255, 255, 255, 0.95)",
            color:
              theme === "dark"
                ? "rgba(255, 255, 255, 0.72)"
                : "rgba(107, 114, 128, 0.85)",
            fontSize: 16,
            cursor: "pointer",
            boxSizing: "border-box",
            flexShrink: 1,
            boxShadow:
              theme === "light"
                ? "0 0 0 1px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.08)"
                : "none",
            transition: "transform 0.2s ease, box-shadow 0.2s ease",
          }}
        >
          <span style={{ flex: 1, textAlign: "left" }}>
            Search Teams or Events
          </span>
          <span
            style={{
              width: 36,
              height: 36,
              margin: "-4px -6px -4px 0",
              borderRadius: 10,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              background: "var(--yellow-color)",
              color: "#000",
              flexShrink: 0,
            }}
          >
            <SearchIcon size={16} />
          </span>
        </button>

        {mounted &&
          modalOpen &&
          createPortal(
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Search teams or events"
              onMouseDown={(e) => {
                if (e.target === e.currentTarget) closeModal();
              }}
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 200000,
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "center",
                padding: "12vh 1.25rem 2rem",
                background: "rgba(0, 0, 0, 0.55)",
                backdropFilter: "blur(4px)",
                WebkitBackdropFilter: "blur(4px)",
              }}
            >
              <div
                ref={modalPanelRef}
                style={{
                  width: "min(820px, 100%)",
                  position: "relative",
                }}
              >
                {renderSearchField(modalInputRef, "search-input-modal", true)}
                {renderResults(true)}
              </div>
            </div>,
            document.body
          )}
      </>
    );
  }

  // Mobile (menu): keep inline search with white outline
  const inputId = "search-input-mobile";
  return (
    <>
      <style>{`
        #${inputId}::placeholder,
        #${inputId}::-webkit-input-placeholder {
          color: ${placeholderColor};
          opacity: 1;
        }
      `}</style>
      <div
        ref={containerRef}
        style={{
          position: "relative",
          display: "flex",
          justifyContent: "center",
          width: "100%",
          margin: 0,
          padding: 0,
        }}
      >
        <div style={{ width: mounted ? "95%" : "100%" }}>
          {renderSearchField(inputRef, inputId, false)}
          {focused && renderResults(false)}
        </div>
      </div>
    </>
  );
}
