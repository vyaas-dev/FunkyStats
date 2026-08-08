"use client";

import { useState } from "react";
import Image from "next/image";

type TeamMedia = {
  url: string;
  type: string;
  mediaType: "image" | "video";
  preferred: boolean;
  foreignKey?: string;
};

type TeamImageGalleryProps = {
  images: TeamMedia[];
  teamKey: string;
  year: string;
};

export default function TeamImageGallery({
  images,
  teamKey,
  year,
}: TeamImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mediaErrors, setMediaErrors] = useState<Set<number>>(new Set());

  if (!images || images.length === 0) {
    return null;
  }

  const validMedia = images.filter((_, idx) => !mediaErrors.has(idx));

  if (validMedia.length === 0) {
    return null;
  }

  const handleMediaError = (index: number) => {
    setMediaErrors((prev) => {
      const newSet = new Set(prev).add(index);

      if (index === selectedIndex) {
        const remainingValidIndices = images
          .map((_, idx) => idx)
          .filter((idx) => !newSet.has(idx));

        if (remainingValidIndices.length > 0) {
          const nextValid =
            remainingValidIndices.find((idx) => idx > index) ||
            remainingValidIndices[0];
          setSelectedIndex(nextValid);
        }
      }

      return newSet;
    });
  };

  const currentMedia = images[selectedIndex];

  if (mediaErrors.has(selectedIndex)) {
    const validIndices = images
      .map((_, idx) => idx)
      .filter((idx) => !mediaErrors.has(idx));
    if (validIndices.length > 0 && selectedIndex !== validIndices[0]) {
      setSelectedIndex(validIndices[0]);
    }
  }

  return (
    <div
      style={{
        background: "var(--background-pred)",
        border: "2px solid var(--border-color)",
        borderRadius: 12,
        padding: "1.5rem",
        boxShadow:
          "0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06)",
        height: "fit-content",
        position: "sticky",
        top: "1rem",
      }}
    >
      <h3
        style={{
          color: "var(--foreground)",
          textAlign: "center",
          marginBottom: "1rem",
          fontSize: "1.25rem",
        }}
      >
        Media {year}
      </h3>

      <div
        style={{
          position: "relative",
          width: "100%",
          height: "400px",
          marginBottom: "1rem",
          borderRadius: 8,
          overflow: "hidden",
          background: "var(--gray-more)",
        }}
      >
        {currentMedia.mediaType === "video" && (
          <div
            style={{
              position: "absolute",
              top: "0.75rem",
              right: "0.75rem",
              background: "rgba(239, 68, 68, 0.95)",
              color: "white",
              padding: "0.4rem 0.8rem",
              borderRadius: 6,
              fontSize: "0.75rem",
              fontWeight: "bold",
              letterSpacing: "0.05em",
              zIndex: 10,
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.3)",
            }}
          >
            <span style={{ fontSize: "0.9rem" }}>▶</span>
            VIDEO
          </div>
        )}
        {currentMedia.mediaType === "video" ? (
          <iframe
            src={currentMedia.url}
            title={`${teamKey} video ${year}`}
            style={{
              width: "100%",
              height: "100%",
              border: "none",
            }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            frameBorder="0"
          />
        ) : (
          <Image
            key={currentMedia.url}
            src={currentMedia.url}
            alt={`${teamKey} robot ${year}`}
            fill
            priority={selectedIndex === 0}
            style={{
              objectFit: "contain",
            }}
            onLoad={(e) => {
              const img = e.currentTarget as HTMLImageElement;
              if (
                (img.naturalWidth === 161 && img.naturalHeight === 81) ||
                (img.naturalWidth < 200 &&
                  img.naturalHeight < 100 &&
                  currentMedia.type === "imgur")
              ) {
                img.style.display = "none";
                handleMediaError(selectedIndex);
              }
            }}
            onError={(e) => {
              e.currentTarget.style.display = "none";
              handleMediaError(selectedIndex);
            }}
            unoptimized
          />
        )}
      </div>

      {images.length > 1 && (
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            overflowX: "auto",
            padding: "0.5rem 0",
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          {images.map((media, idx) => {
            if (mediaErrors.has(idx)) return null;

            return (
              <button
                key={idx}
                onClick={() => setSelectedIndex(idx)}
                style={{
                  position: "relative",
                  width: "80px",
                  height: "80px",
                  border:
                    selectedIndex === idx
                      ? "3px solid var(--yellow-color)"
                      : "2px solid var(--border-color)",
                  borderRadius: 8,
                  overflow: "hidden",
                  cursor: "pointer",
                  background: "var(--gray-more)",
                  padding: 0,
                  transition: "all 0.2s ease",
                  opacity: selectedIndex === idx ? 1 : 0.6,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                onMouseEnter={(e) => {
                  if (selectedIndex !== idx) {
                    e.currentTarget.style.opacity = "0.8";
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedIndex !== idx) {
                    e.currentTarget.style.opacity = "0.6";
                  }
                }}
              >
                {media.mediaType === "video" ? (
                  <div
                    style={{
                      position: "relative",
                      width: "100%",
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "var(--gray-more)",
                    }}
                  >
                    {media.type === "youtube" && media.foreignKey ? (
                      <>
                        <Image
                          src={`https://img.youtube.com/vi/${media.foreignKey}/default.jpg`}
                          alt={`${teamKey} video thumbnail ${idx + 1}`}
                          fill
                          style={{
                            objectFit: "cover",
                          }}
                          unoptimized
                        />
                        <div
                          style={{
                            position: "absolute",
                            top: "50%",
                            left: "50%",
                            transform: "translate(-50%, -50%)",
                            width: "32px",
                            height: "32px",
                            background: "rgba(239, 68, 68, 0.95)",
                            borderRadius: "50%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "white",
                            fontSize: "14px",
                            boxShadow: "0 2px 6px rgba(0, 0, 0, 0.4)",
                          }}
                        >
                          ▶
                        </div>
                      </>
                    ) : (
                      <span style={{ fontSize: "2rem" }}>▶️</span>
                    )}
                  </div>
                ) : (
                  <Image
                    src={media.url}
                    alt={`${teamKey} thumbnail ${idx + 1}`}
                    fill
                    style={{
                      objectFit: "cover",
                    }}
                    onLoad={(e) => {
                      const img = e.currentTarget as HTMLImageElement;
                      if (
                        (img.naturalWidth === 161 &&
                          img.naturalHeight === 81) ||
                        (img.naturalWidth < 200 &&
                          img.naturalHeight < 100 &&
                          media.type === "imgur")
                      ) {
                        const button = img.closest("button");
                        if (button) button.style.display = "none";
                        handleMediaError(idx);
                      }
                    }}
                    onError={(e) => {
                      const button = e.currentTarget.closest("button");
                      if (button) button.style.display = "none";
                      handleMediaError(idx);
                    }}
                    unoptimized
                  />
                )}
              </button>
            );
          })}
        </div>
      )}

      {images.length > 1 && (
        <div
          style={{
            textAlign: "center",
            marginTop: "0.5rem",
          }}
        >
          <p
            style={{
              color: "var(--gray-less)",
              fontSize: "0.875rem",
              marginBottom: "0.25rem",
            }}
          >
            {
              images.filter(
                (_, idx) => idx <= selectedIndex && !mediaErrors.has(idx)
              ).length
            }{" "}
            of {validMedia.length}
          </p>
          {currentMedia.mediaType === "video" && (
            <p
              style={{
                color: "rgba(239, 68, 68, 0.9)",
                fontSize: "0.75rem",
                fontWeight: "bold",
                letterSpacing: "0.05em",
              }}
            >
              ▶ VIDEO
            </p>
          )}
        </div>
      )}
    </div>
  );
}
