"use client";
import React from "react";
/* eslint-disable */

import { useState, useEffect, useRef } from "react";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [isAnimating, setIsAnimating] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const system = window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
    const initial = saved === "light" || saved === "dark" ? saved : system;
    setTheme(initial);
    document.documentElement.setAttribute("data-theme", initial);
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

    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => observer.disconnect();
  }, []);

  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    function handleResize() {
      const aspectRatio = window.innerWidth / window.innerHeight;
      setIsMobile(aspectRatio < 1);
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggleTheme = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    const newTheme = theme === "light" ? "dark" : "light";
    const btn = buttonRef.current;
    if (btn) {
      const rect = btn.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      if (newTheme === "light") {
        const container = document.createElement("div");
        container.style.cssText = [
          "position:fixed",
          "inset:0",
          "z-index:2000",
          "pointer-events:none",
          "overflow:hidden",
        ].join(";");

        const supernovaCore = document.createElement("div");
        supernovaCore.style.cssText = [
          "position:absolute",
          `left:${centerX}px`,
          `top:${centerY}px`,
          "width:20px",
          "height:20px",
          "margin:-10px 0 0 -10px",
          "background:radial-gradient(circle, #ffffff 0%, #fffacd 30%, #ffd700 60%, transparent 100%)",
          "border-radius:50%",
          "transform:scale(0)",
          "box-shadow:0 0 80px 20px rgba(255, 215, 0, 0.9), 0 0 40px 10px rgba(255, 255, 255, 1)",
        ].join(";");
        container.appendChild(supernovaCore);

        for (let i = 0; i < 4; i++) {
          const ring = document.createElement("div");
          ring.style.cssText = [
            "position:absolute",
            `left:${centerX}px`,
            `top:${centerY}px`,
            "width:80px",
            "height:80px",
            "margin:-40px 0 0 -40px",
            "border:4px solid rgba(255, 215, 0, 0.8)",
            "border-radius:50%",
            "transform:scale(0)",
            "box-shadow:0 0 20px rgba(255, 215, 0, 0.6)",
          ].join(";");
          container.appendChild(ring);

          ring.animate(
            [
              { transform: "scale(0)", opacity: "0.8" },
              { transform: "scale(8)", opacity: "0.3", offset: 0.7 },
              { transform: "scale(15)", opacity: "0" },
            ],
            {
              duration: 1000,
              delay: i * 100,
              easing: "cubic-bezier(0.22, 1, 0.36, 1)",
            }
          );
        }

        const mainRays: HTMLElement[] = [];
        for (let i = 0; i < 32; i++) {
          const angle = (i * 360) / 32;
          const ray = document.createElement("div");
          const width = i % 2 === 0 ? 12 : 8;
          ray.style.cssText = [
            "position:absolute",
            `left:${centerX}px`,
            `top:${centerY}px`,
            `width:${width}px`,
            "height:200vh",
            `margin-left:-${width / 2}px`,
            `background:linear-gradient(to bottom, rgba(255, 255, 255, 0.9) 0%, rgba(255, 215, 0, 0.9) 10%, rgba(255, 180, 0, 0.7) 40%, transparent 100%)`,
            `transform:rotate(${angle}deg) scaleY(0)`,
            "transform-origin:top center",
            "filter:blur(3px)",
          ].join(";");
          container.appendChild(ray);
          mainRays.push(ray);
        }

        const particles: HTMLElement[] = [];
        for (let i = 0; i < 50; i++) {
          const particle = document.createElement("div");
          const size = 4 + Math.random() * 8;
          particle.style.cssText = [
            "position:absolute",
            `left:${centerX}px`,
            `top:${centerY}px`,
            `width:${size}px`,
            `height:${size}px`,
            `margin:-${size / 2}px 0 0 -${size / 2}px`,
            "background:radial-gradient(circle, rgba(255, 255, 255, 1) 0%, rgba(255, 215, 0, 0.9) 40%, transparent 100%)",
            "border-radius:50%",
            "filter:blur(2px)",
            "box-shadow:0 0 15px rgba(255, 215, 0, 1)",
            "transform:scale(0)",
          ].join(";");
          container.appendChild(particle);
          particles.push(particle);
        }

        const bloom = document.createElement("div");
        bloom.style.cssText = [
          "position:absolute",
          `left:${centerX}px`,
          `top:${centerY}px`,
          "width:300px",
          "height:300px",
          "margin:-150px 0 0 -150px",
          "background:radial-gradient(circle, rgba(255, 255, 255, 0.9) 0%, rgba(255, 235, 150, 0.6) 30%, transparent 70%)",
          "border-radius:50%",
          "transform:scale(0)",
          "filter:blur(40px)",
        ].join(";");
        container.appendChild(bloom);

        const overlay = document.createElement("div");
        overlay.style.cssText = [
          "position:absolute",
          "inset:0",
          "background:radial-gradient(circle at " +
            centerX +
            "px " +
            centerY +
            "px, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 1) 70%)",
          "opacity:0",
        ].join(";");
        container.appendChild(overlay);

        const fadeOut = document.createElement("div");
        fadeOut.style.cssText = [
          "position:absolute",
          "inset:0",
          "background:#ffffff",
          "opacity:0",
        ].join(";");
        container.appendChild(fadeOut);

        document.body.appendChild(container);

        supernovaCore.animate(
          [
            { transform: "scale(0)", opacity: "1", filter: "brightness(5)" },
            {
              transform: "scale(3)",
              opacity: "1",
              filter: "brightness(3)",
              offset: 0.2,
            },
            { transform: "scale(30)", opacity: "0", filter: "brightness(1)" },
          ],
          { duration: 1000, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }
        );

        bloom.animate(
          [
            { transform: "scale(0)", opacity: "0" },
            { transform: "scale(2)", opacity: "1", offset: 0.3 },
            { transform: "scale(8)", opacity: "0" },
          ],
          { duration: 1000, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }
        );

        mainRays.forEach((ray, i) => {
          const startAngle = (i * 360) / 32;
          const rotationOffset = i % 2 === 0 ? 15 : -15;
          (ray as HTMLElement).animate(
            [
              {
                transform: `rotate(${startAngle}deg) scaleY(0)`,
                opacity: "0",
              },
              {
                transform: `rotate(${
                  startAngle + rotationOffset * 0.5
                }deg) scaleY(0.8)`,
                opacity: "1",
                offset: 0.3,
              },
              {
                transform: `rotate(${
                  startAngle + rotationOffset
                }deg) scaleY(1.3)`,
                opacity: "0.6",
                offset: 0.7,
              },
              {
                transform: `rotate(${
                  startAngle + rotationOffset
                }deg) scaleY(1.5)`,
                opacity: "0",
              },
            ],
            {
              duration: 950,
              easing: "cubic-bezier(0.22, 1, 0.36, 1)",
            }
          );
        });

        particles.forEach((particle, i) => {
          const angle = Math.random() * 360;
          const distance = 600 + Math.random() * 800;
          const duration = 800 + Math.random() * 300;
          const targetX = Math.cos((angle * Math.PI) / 180) * distance;
          const targetY = Math.sin((angle * Math.PI) / 180) * distance;

          particle.animate(
            [
              {
                transform: `translate(0, 0) scale(0)`,
                opacity: "0",
              },
              {
                transform: `translate(${targetX * 0.3}px, ${
                  targetY * 0.3
                }px) scale(1.5)`,
                opacity: "1",
                offset: 0.3,
              },
              {
                transform: `translate(${targetX * 0.7}px, ${
                  targetY * 0.7
                }px) scale(1.2)`,
                opacity: "0.8",
                offset: 0.7,
              },
              {
                transform: `translate(${targetX}px, ${targetY}px) scale(0.5)`,
                opacity: "0",
              },
            ],
            {
              duration: duration,
              easing: "cubic-bezier(0.22, 1, 0.36, 1)",
            }
          );
        });

        overlay.animate(
          [{ opacity: "0" }, { opacity: "0.5", offset: 0.4 }, { opacity: "1" }],
          { duration: 900, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }
        );

        fadeOut.animate(
          [{ opacity: "0" }, { opacity: "0", offset: 0.7 }, { opacity: "1" }],
          { duration: 1100, easing: "ease-in-out" }
        );

        const containerFadeOut = container.animate(
          [{ opacity: "1" }, { opacity: "1", offset: 0.75 }, { opacity: "0" }],
          { duration: 1200, easing: "ease-out" }
        );

        setTheme(newTheme);
        localStorage.setItem("theme", newTheme);
        document.documentElement.setAttribute("data-theme", newTheme);

        containerFadeOut.addEventListener("finish", () => {
          document.body.removeChild(container);
          setIsAnimating(false);
        });
      } else {
        const container = document.createElement("div");
        container.style.cssText = [
          "position:fixed",
          "inset:0",
          "z-index:2000",
          "pointer-events:none",
          "overflow:hidden",
        ].join(";");

        const blackHole = document.createElement("div");
        blackHole.style.cssText = [
          "position:absolute",
          `left:${centerX}px`,
          `top:${centerY}px`,
          "width:40px",
          "height:40px",
          "margin:-20px 0 0 -20px",
          "background:radial-gradient(circle, rgba(0, 0, 0, 1) 0%, rgba(20, 20, 40, 0.9) 30%, transparent 100%)",
          "border-radius:50%",
          "transform:scale(0)",
          "box-shadow:0 0 40px 10px rgba(0, 0, 0, 0.8), inset 0 0 20px rgba(0, 0, 0, 1)",
        ].join(";");
        container.appendChild(blackHole);

        const eventHorizon = document.createElement("div");
        eventHorizon.style.cssText = [
          "position:absolute",
          `left:${centerX}px`,
          `top:${centerY}px`,
          "width:80px",
          "height:80px",
          "margin:-40px 0 0 -40px",
          "border:3px solid rgba(255, 215, 0, 0.6)",
          "border-radius:50%",
          "transform:scale(0)",
          "box-shadow:0 0 30px rgba(255, 215, 0, 0.6), inset 0 0 30px rgba(255, 215, 0, 0.3)",
        ].join(";");
        container.appendChild(eventHorizon);

        const spiralStreams: HTMLElement[] = [];
        for (let i = 0; i < 24; i++) {
          const angle = (i * 360) / 24;
          const stream = document.createElement("div");
          const distance = 800 + Math.random() * 400;
          stream.style.cssText = [
            "position:absolute",
            `left:${centerX}px`,
            `top:${centerY}px`,
            "width:4px",
            `height:${distance}px`,
            "margin-left:-2px",
            `margin-top:-${distance}px`,
            `background:linear-gradient(to bottom, transparent 0%, rgba(255, 215, 0, 0.8) 40%, rgba(255, 165, 0, 0.9) 70%, rgba(255, 215, 0, 0) 100%)`,
            `transform:rotate(${angle}deg)`,
            "transform-origin:bottom center",
            "filter:blur(2px)",
            "opacity:1",
          ].join(";");
          container.appendChild(stream);
          spiralStreams.push(stream);
        }

        const particles: HTMLElement[] = [];
        for (let i = 0; i < 40; i++) {
          const particle = document.createElement("div");
          const size = 3 + Math.random() * 6;
          const startAngle = Math.random() * 360;
          const startDistance = 400 + Math.random() * 800;
          const startX =
            centerX + Math.cos((startAngle * Math.PI) / 180) * startDistance;
          const startY =
            centerY + Math.sin((startAngle * Math.PI) / 180) * startDistance;

          particle.style.cssText = [
            "position:absolute",
            `left:${startX}px`,
            `top:${startY}px`,
            `width:${size}px`,
            `height:${size}px`,
            `margin:-${size / 2}px 0 0 -${size / 2}px`,
            "background:radial-gradient(circle, rgba(255, 215, 0, 1) 0%, rgba(255, 165, 0, 0.8) 50%, transparent 100%)",
            "border-radius:50%",
            "filter:blur(1px)",
            "box-shadow:0 0 10px rgba(255, 215, 0, 0.8)",
          ].join(";");
          container.appendChild(particle);
          particles.push(particle);
        }

        const darkness = document.createElement("div");
        darkness.style.cssText = [
          "position:absolute",
          "inset:0",
          "background:radial-gradient(circle at " +
            centerX +
            "px " +
            centerY +
            "px, transparent 0%, rgba(10, 10, 30, 0.3) 30%, rgba(10, 10, 30, 0.95) 60%, rgba(10, 10, 30, 1) 100%)",
          "opacity:0",
        ].join(";");
        container.appendChild(darkness);

        const fadeOut = document.createElement("div");
        fadeOut.style.cssText = [
          "position:absolute",
          "inset:0",
          "background:#0a0a0a",
          "opacity:0",
        ].join(";");
        container.appendChild(fadeOut);

        document.body.appendChild(container);

        blackHole.animate(
          [
            { transform: "scale(0)", opacity: "0" },
            { transform: "scale(1)", opacity: "1", offset: 0.2 },
            { transform: "scale(2.5)", opacity: "1" },
          ],
          { duration: 1000, easing: "cubic-bezier(0.4, 0, 0.2, 1)" }
        );

        eventHorizon.animate(
          [
            { transform: "scale(0) rotate(0deg)", opacity: "0" },
            { transform: "scale(1) rotate(180deg)", opacity: "1", offset: 0.3 },
            { transform: "scale(0.3) rotate(720deg)", opacity: "0.5" },
          ],
          { duration: 1000, easing: "cubic-bezier(0.6, 0, 0.4, 1)" }
        );

        spiralStreams.forEach((stream, i) => {
          const startAngle = (i * 360) / 24;
          const rotations = 3 + Math.random() * 2;
          stream.animate(
            [
              {
                transform: `rotate(${startAngle}deg) scaleY(1)`,
                opacity: "1",
              },
              {
                transform: `rotate(${
                  startAngle + rotations * 360
                }deg) scaleY(0.4)`,
                opacity: "0.8",
                offset: 0.6,
              },
              {
                transform: `rotate(${
                  startAngle + rotations * 360
                }deg) scaleY(0)`,
                opacity: "0",
              },
            ],
            {
              duration: 900 + Math.random() * 200,
              easing: "cubic-bezier(0.6, 0, 0.4, 1)",
            }
          );
        });

        particles.forEach((particle, i) => {
          const startAngle = Math.random() * 360;
          const rotations = 2 + Math.random() * 3;
          const delay = Math.random() * 200;

          setTimeout(() => {
            particle.animate(
              [
                {
                  transform: `translate(0, 0) scale(1) rotate(0deg)`,
                  opacity: "1",
                },
                {
                  transform: `translate(${
                    (centerX - parseFloat(particle.style.left)) * 0.5
                  }px, ${
                    (centerY - parseFloat(particle.style.top)) * 0.5
                  }px) scale(0.8) rotate(${rotations * 180}deg)`,
                  opacity: "0.9",
                  offset: 0.5,
                },
                {
                  transform: `translate(${
                    centerX - parseFloat(particle.style.left)
                  }px, ${
                    centerY - parseFloat(particle.style.top)
                  }px) scale(0) rotate(${rotations * 360}deg)`,
                  opacity: "0",
                },
              ],
              {
                duration: 800,
                easing: "cubic-bezier(0.6, 0, 0.4, 1)",
              }
            );
          }, delay);
        });

        darkness.animate(
          [{ opacity: "0" }, { opacity: "0.5", offset: 0.4 }, { opacity: "1" }],
          { duration: 1000, easing: "cubic-bezier(0.4, 0, 0.2, 1)" }
        );

        fadeOut.animate(
          [{ opacity: "0" }, { opacity: "0", offset: 0.65 }, { opacity: "1" }],
          { duration: 1100, easing: "ease-in-out" }
        );

        const containerFadeOut = container.animate(
          [{ opacity: "1" }, { opacity: "1", offset: 0.7 }, { opacity: "0" }],
          { duration: 1200, easing: "ease-out" }
        );

        setTheme(newTheme);
        localStorage.setItem("theme", newTheme);
        document.documentElement.setAttribute("data-theme", newTheme);

        containerFadeOut.addEventListener("finish", () => {
          document.body.removeChild(container);
          setIsAnimating(false);
        });
      }
    }
  };

  const isDark = theme === "dark";

  return (
    <button
      ref={buttonRef}
      onClick={toggleTheme}
      disabled={isAnimating}
      aria-pressed={isDark}
      onMouseEnter={(e) => {
        setIsHovered(true);
        e.currentTarget.style.background = "var(--menu-item-hover-bg)";
      }}
      onMouseLeave={(e) => {
        setIsHovered(false);
        e.currentTarget.style.background = "transparent";
      }}
      style={{
        padding: isMobile ? "10px 14px" : "10px 16px",
        border: "none",
        background: "transparent",
        borderRadius: 8,
        fontSize: isMobile ? 16 : 15,
        cursor: isAnimating ? "not-allowed" : "pointer",
        color: "var(--option-text)",
        width: isMobile ? "auto" : "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        fontWeight: 500,
        transition: "all 0.2s ease",
        animation: "slideIn 0.3s ease 0.1s both",
        opacity: isAnimating ? 0.7 : 1,
        alignSelf: isMobile ? "center" : "stretch",
      }}
    >
      <span>Dark mode</span>
      <span
        aria-hidden
        style={{
          position: "relative",
          width: 44,
          height: 24,
          borderRadius: 999,
          background: isDark ? "var(--yellow-color)" : "rgba(156, 163, 175, 0.55)",
          flexShrink: 0,
          transition: "background 0.2s ease",
          boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.08)",
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 2,
            left: isDark ? 22 : 2,
            width: 20,
            height: 20,
            borderRadius: "50%",
            background: "#ffffff",
            boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
            transition: "left 0.2s ease",
          }}
        />
      </span>
    </button>
  );
}
