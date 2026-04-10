import { useState, useRef, useCallback } from "react";
import { Link } from "wouter";
import { useListPlayers } from "@workspace/api-client-react";
import { useTierList, TierType } from "@/hooks/use-tierlist";
import logoImg from "@assets/logo_1775845660807.png";

const TIERS: TierType[] = ["S", "A", "B", "C", "D", "TRICHEUR"];

const TIER_STYLE: Record<TierType, { bg: string; label: string }> = {
  S: { bg: "linear-gradient(135deg, #ff6b6b, #ee5a24)", label: "S" },
  A: { bg: "linear-gradient(135deg, #ffa94d, #f39c12)", label: "A" },
  B: { bg: "linear-gradient(135deg, #ffe066, #f9ca24)", label: "B" },
  C: { bg: "linear-gradient(135deg, #69db7c, #1dd1a1)", label: "C" },
  D: { bg: "linear-gradient(135deg, #74c0fc, #4d79ff)", label: "D" },
  TRICHEUR: { bg: "linear-gradient(135deg, #b197fc, #7950f2)", label: "TRICHEUR" },
};

export default function Home() {
  const { data, isLoading, error } = useListPlayers();
  const { tiers, movePlayer, resetTiers, isLoaded } = useTierList();
  const players = Array.isArray(data) ? data : [];

  // Track which zone is currently highlighted — updated only via dragenter/drop/dragend
  const [activeZone, setActiveZone] = useState<TierType | "UNRANKED" | null>(null);
  // Counter per zone: incremented on dragenter, decremented on dragleave
  // Avoids false leaves when cursor moves over child elements
  const enterCounters = useRef<Record<string, number>>({});

  const draggedId = useRef<string | null>(null);

  const getCounter = (zone: string) => enterCounters.current[zone] ?? 0;

  const handleDragStart = useCallback((e: React.DragEvent, playerId: string) => {
    draggedId.current = playerId;
    e.dataTransfer.setData("text/plain", playerId);
    e.dataTransfer.effectAllowed = "move";
    // Small timeout so the ghost image is captured before opacity change
    const el = e.currentTarget as HTMLElement;
    setTimeout(() => { el.style.opacity = "0.4"; }, 0);
  }, []);

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    draggedId.current = null;
    setActiveZone(null);
    enterCounters.current = {};
    (e.currentTarget as HTMLElement).style.opacity = "1";
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent, zone: TierType | "UNRANKED") => {
    e.preventDefault();
    const key = zone as string;
    enterCounters.current[key] = getCounter(key) + 1;
    setActiveZone(zone);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent, zone: TierType | "UNRANKED") => {
    e.preventDefault();
    const key = zone as string;
    enterCounters.current[key] = Math.max(0, getCounter(key) - 1);
    if (enterCounters.current[key] === 0) {
      setActiveZone((prev) => (prev === zone ? null : prev));
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, dest: TierType | "UNRANKED") => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain") || draggedId.current;
    if (id) movePlayer(id, dest);
    draggedId.current = null;
    setActiveZone(null);
    enterCounters.current = {};
  }, [movePlayer]);

  if (!isLoaded || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-9 h-9 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground tracking-wide">Chargement...</p>
        </div>
      </div>
    );
  }

  if (error) {
    const message = error instanceof Error ? error.message : "Impossible de charger les joueurs.";

    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-6">
        <div className="w-full max-w-2xl rounded-xl border border-border bg-card p-6 shadow-lg">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-destructive">
            API inaccessible
          </p>
          <h1 className="mt-3 text-2xl font-semibold">La liste des joueurs n&apos;a pas pu charger</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Le front fonctionne, mais l&apos;API derriere `/api/players` ne repond pas correctement.
          </p>
          <pre className="mt-5 overflow-x-auto rounded-lg border border-border bg-background p-4 text-xs text-foreground/90">
            {message}
          </pre>
        </div>
      </div>
    );
  }

  if (data != null && !Array.isArray(data)) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-6">
        <div className="w-full max-w-2xl rounded-xl border border-border bg-card p-6 shadow-lg">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-destructive">
            Reponse API invalide
          </p>
          <h1 className="mt-3 text-2xl font-semibold">Le front attendait une liste de joueurs</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            `/api/players` devrait renvoyer un tableau JSON, mais il renvoie autre chose.
          </p>
          <pre className="mt-5 overflow-x-auto rounded-lg border border-border bg-background p-4 text-xs text-foreground/90">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      </div>
    );
  }

  const rankedIds = new Set(Object.values(tiers).flat());
  const unrankedPlayers = players.filter((p) => !rankedIds.has(p.id.toString()));

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logoImg} alt="Logo" className="h-10 w-10 object-contain" />
            <h1
              className="font-display text-2xl leading-none"
              style={{ letterSpacing: "0.06em" }}
            >
              Steners TF Ranked Tierlist
            </h1>
          </div>
          <Link href="/admin">
            <button
              className="text-sm font-semibold px-4 py-2 rounded-md border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
            >
              Admin
            </button>
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-8 flex flex-col gap-8">

        {/* Tier table */}
        <div className="tier-table">
          {TIERS.map((tier) => {
            const style = TIER_STYLE[tier];
            const isActive = activeZone === tier;
            const isTricheur = tier === "TRICHEUR";
            return (
              <div
                key={tier}
                className="tier-row"
                style={{ background: isActive ? "hsl(var(--card))" : undefined }}
                onDragEnter={(e) => handleDragEnter(e, tier)}
                onDragLeave={(e) => handleDragLeave(e, tier)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, tier)}
              >
                {/* Label */}
                <div
                  className="tier-label"
                  style={{
                    background: style.bg,
                    fontSize: isTricheur ? "1rem" : "2.4rem",
                    letterSpacing: isTricheur ? "0.05em" : "0.04em",
                  }}
                >
                  {style.label}
                </div>

                {/* Drop zone */}
                <div
                  className="tier-content"
                  style={{
                    outline: isActive ? "2px solid hsl(var(--primary) / 0.4)" : undefined,
                    outlineOffset: isActive ? "-2px" : undefined,
                    transition: "outline 0.1s",
                  }}
                >
                  {tiers[tier].map((pid) => {
                    const player = players.find((p) => p.id.toString() === pid);
                    if (!player) return null;
                    return (
                      <div
                        key={pid}
                        draggable
                        onDragStart={(e) => handleDragStart(e, pid)}
                        onDragEnd={handleDragEnd}
                        className="player-card"
                        style={{ transition: "opacity 0s" }}
                        title={player.username}
                      >
                        <img
                          src={`https://mc-heads.net/body/${player.username}/100`}
                          alt={player.username}
                          className="player-card-skin"
                          draggable={false}
                          style={{ pointerEvents: "none" }}
                        />
                        <div className="player-card-name" style={{ pointerEvents: "none" }}>
                          {player.username}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Unranked pool */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Non classé — {unrankedPlayers.length} joueur{unrankedPlayers.length !== 1 ? "s" : ""}
            </p>
            <button
              onClick={resetTiers}
              className="text-xs font-medium px-3 py-1.5 rounded-md border border-border text-muted-foreground hover:text-destructive hover:border-destructive/40 transition-colors"
            >
              Réinitialiser
            </button>
          </div>

          <div
            className="unranked-zone"
            style={{
              outline: activeZone === "UNRANKED" ? "2px solid hsl(var(--primary) / 0.4)" : undefined,
              outlineOffset: activeZone === "UNRANKED" ? "-2px" : undefined,
              background: activeZone === "UNRANKED" ? "hsl(var(--card) / 0.6)" : undefined,
            }}
            onDragEnter={(e) => handleDragEnter(e, "UNRANKED")}
            onDragLeave={(e) => handleDragLeave(e, "UNRANKED")}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, "UNRANKED")}
          >
            {unrankedPlayers.length === 0 ? (
              <div className="w-full flex items-center justify-center text-muted-foreground/40 text-sm py-8">
                Tous les joueurs sont classés
              </div>
            ) : (
              unrankedPlayers.map((player) => (
                <div
                  key={player.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, player.id.toString())}
                  onDragEnd={handleDragEnd}
                  className="player-card"
                  title={player.username}
                >
                  <img
                    src={`https://mc-heads.net/body/${player.username}/100`}
                    alt={player.username}
                    className="player-card-skin"
                    draggable={false}
                    style={{ pointerEvents: "none" }}
                  />
                  <div className="player-card-name" style={{ pointerEvents: "none" }}>
                    {player.username}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </main>
    </div>
  );
}
