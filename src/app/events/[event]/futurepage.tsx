"use client";
import { useEffect, useMemo, useState } from "react";
import PredEventTable from "../../components/PredEventTable";
import styles from "../../page.module.css";
import Image from "next/image";
import TeamLink from "@/app/components/TeamLink";

interface ClientPageProps {
  year: number;
  code: string;
  fsms: { [key: string]: number };
  predictedFlags?: { [key: string]: boolean };
}

export default function ClientPage({
  year,
  code,
  fsms,
  predictedFlags,
}: ClientPageProps) {
  const filteredFsms: Array<{
    key: string;
    fsm: string;
    rank: number;
    predicted?: boolean;
  }> = [];

  const sortedFsms = Object.entries(fsms).sort((a, b) => b[1] - a[1]);

  let fsmRank = 1;
  for (const [teamKey, fsmValue] of sortedFsms) {
    if (fsmValue > 0) {
      filteredFsms.push({
        key: teamKey,
        fsm: fsmValue.toFixed(2),
        rank: fsmRank,
        predicted: predictedFlags?.[teamKey] === true,
      });
      fsmRank++;
    }
  }

  const top3 = useMemo(() => {
    return [...filteredFsms]
      .map((t) => ({ key: t.key, fsm: Number(t.fsm) }))
      .filter((t) => t.key && Number.isFinite(t.fsm))
      .sort((a, b) => b.fsm - a.fsm)
      .slice(0, 3);
  }, [filteredFsms]);

  const [avatarMap, setAvatarMap] = useState<Record<string, string | null>>({});

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const entries = await Promise.all(
        top3.map(async (t) => {
          const teamKey = t.key.startsWith("frc") ? t.key : `frc${t.key}`;
          try {
            const res = await fetch(
              `/api/team-avatar?team=${encodeURIComponent(teamKey)}&year=${year}`
            );
            const json = await res.json();
            return [t.key, json?.avatarUrl ?? null] as const;
          } catch {
            return [t.key, null] as const;
          }
        })
      );
      if (cancelled) return;
      setAvatarMap((prev) => {
        const next = { ...prev };
        for (const [k, v] of entries) next[k] = v;
        return next;
      });
    };
    if (top3.length > 0) load();
    return () => {
      cancelled = true;
    };
  }, [top3, year]);

  return (
    <div
      className={styles.page}
      style={{ position: "relative", minHeight: "100vh" }}
    >
      <main className={styles.main}>
        <h1 className={styles.title}>Event FSM</h1>
        <h2 className={styles.table}>
          {year}
          {code}
        </h2>
        <h3
          style={{ fontWeight: "normal", margin: "1rem", textAlign: "center" }}
        >
          Complete event information is unavailable because the match schedule
          is not present on The Blue Alliance.
        </h3>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: "1rem",
            width: "100%",
            marginBottom: "1.5rem",
          }}
        >
          {top3.map((t, idx) => {
            const teamKey = t.key.startsWith("frc") ? t.key : `frc${t.key}`;
            const avatarUrl = avatarMap[t.key] ?? null;
            return (
              <div
                key={t.key}
                style={{
                  width: "min(280px, 92vw)",
                  padding: "1.1rem 1.25rem 1.0rem",
                  background: "var(--background-pred)",
                  borderRadius: 18,
                  border: "2px solid var(--border-color)",
                  boxShadow: "0 10px 22px rgba(0,0,0,0.18)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "0.75rem",
                }}
              >
                <div
                  style={{
                    width: 92,
                    height: 92,
                    borderRadius: 16,
                    background: "var(--gray-more)",
                    border: "2px solid rgba(255, 255, 255, 0.08)",
                    overflow: "hidden",
                    position: "relative",
                  }}
                >
                  {avatarUrl ? (
                    <Image
                      src={avatarUrl}
                      alt={`${teamKey} avatar`}
                      fill
                      unoptimized
                      style={{ objectFit: "contain" }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--gray-less)",
                        fontWeight: 700,
                        fontSize: 22,
                      }}
                    >
                      #{idx + 1}
                    </div>
                  )}
                </div>

                <div style={{ textAlign: "center" }}>
                  <div style={{ fontWeight: 800, fontSize: "1.05rem" }}>
                    <TeamLink teamKey={teamKey} year={year} />
                  </div>
                  <div
                    style={{
                      marginTop: 6,
                      color: "var(--gray-less)",
                      fontWeight: 700,
                    }}
                  >
                    FSM: {t.fsm.toFixed(1)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <PredEventTable teams={filteredFsms} />
      </main>
    </div>
  );
}
