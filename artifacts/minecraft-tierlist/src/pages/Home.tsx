import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { Link } from "wouter";
import { useListPlayers } from "@workspace/api-client-react";
import { useTierList, TierType } from "@/hooks/use-tierlist";
import logoImg from "@assets/logo_1775845660807.png";

const TIERS: TierType[] = ["S", "A", "B", "C", "D", "TRICHEUR", "CONNAIT_PAS"];

const TIER_STYLE: Record<TierType, { bg: string; label: string }> = {
  S: { bg: "linear-gradient(135deg, #ff6b6b, #ee5a24)", label: "S" },
  A: { bg: "linear-gradient(135deg, #ffa94d, #f39c12)", label: "A" },
  B: { bg: "linear-gradient(135deg, #ffe066, #f9ca24)", label: "B" },
  C: { bg: "linear-gradient(135deg, #69db7c, #1dd1a1)", label: "C" },
  D: { bg: "linear-gradient(135deg, #74c0fc, #4d79ff)", label: "D" },
  TRICHEUR: { bg: "linear-gradient(135deg, #b197fc, #7950f2)", label: "TRICHEUR" },
  CONNAIT_PAS: { bg: "linear-gradient(135deg, #adb5bd, #6c757d)", label: "CONNAIT PAS" },
};

type DragState = {
  playerId: string;
  x: number;
  y: number;
};

export default function Home() {
  const { data, isLoading, error } = useListPlayers();
  const { tiers, movePlayer, isLoaded } = useTierList();
  const players = Array.isArray(data) ? data : [];

  const [activeZone, setActiveZone] = useState<TierType | "UNRANKED" | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const scrollLoopRef = useRef<number | null>(null);

  const playersById = useMemo(
    () => new Map(players.map((player) => [player.id.toString(), player])),
    [players],
  );

  useEffect(() => {
    dragStateRef.current = dragState;
  }, [dragState]);

  const stopAutoScroll = useCallback(() => {
    if (scrollLoopRef.current !== null) {
      cancelAnimationFrame(scrollLoopRef.current);
      scrollLoopRef.current = null;
    }
  }, []);

  const getHoveredZone = useCallback((x: number, y: number) => {
    const hovered = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-drop-zone]");
    const zone = hovered?.dataset.dropZone;

    if (zone === "UNRANKED") return "UNRANKED";
    if (zone && TIERS.includes(zone as TierType)) return zone as TierType;
    return null;
  }, []);

  const updateAutoScroll = useCallback((pointerY: number) => {
    const threshold = 120;
    const maxSpeed = 18;

    const computeSpeed = (y: number) => {
      if (y < threshold) {
        return -Math.ceil(((threshold - y) / threshold) * maxSpeed);
      }
      if (y > window.innerHeight - threshold) {
        return Math.ceil(((y - (window.innerHeight - threshold)) / threshold) * maxSpeed);
      }
      return 0;
    };

    if (computeSpeed(pointerY) === 0) {
      stopAutoScroll();
      return;
    }

    if (scrollLoopRef.current !== null) return;

    const tick = () => {
      const current = dragStateRef.current;
      if (!current) {
        stopAutoScroll();
        return;
      }

      const speed = computeSpeed(current.y);
      if (speed === 0) {
        stopAutoScroll();
        return;
      }

      window.scrollBy({ top: speed });
      scrollLoopRef.current = requestAnimationFrame(tick);
    };

    scrollLoopRef.current = requestAnimationFrame(tick);
  }, [stopAutoScroll]);

  useEffect(() => {
    if (!dragState) return;

    const handlePointerMove = (event: PointerEvent) => {
      setDragState((prev) => (prev ? { ...prev, x: event.clientX, y: event.clientY } : prev));
      setActiveZone(getHoveredZone(event.clientX, event.clientY));
      updateAutoScroll(event.clientY);
    };

    const finishDrag = (event?: PointerEvent) => {
      const current = dragStateRef.current;
      if (current) {
        const dropZone = event ? getHoveredZone(event.clientX, event.clientY) : activeZone;
        if (dropZone) {
          movePlayer(current.playerId, dropZone);
        }
      }

      setDragState(null);
      setActiveZone(null);
      stopAutoScroll();
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };

    const handlePointerUp = (event: PointerEvent) => finishDrag(event);
    const handlePointerCancel = () => finishDrag();

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerCancel);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerCancel);
      stopAutoScroll();
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
  }, [activeZone, dragState, getHoveredZone, movePlayer, stopAutoScroll, updateAutoScroll]);

  const handlePointerDown = useCallback((event: React.PointerEvent, playerId: string) => {
    if (event.button !== 0) return;

    event.preventDefault();
    document.body.style.userSelect = "none";
    document.body.style.cursor = "grabbing";
    setDragState({
      playerId,
      x: event.clientX,
      y: event.clientY,
    });
    setActiveZone(getHoveredZone(event.clientX, event.clientY));
  }, [getHoveredZone]);

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
  const unrankedPlayers = players.filter((player) => !rankedIds.has(player.id.toString()));
  const draggedPlayer = dragState ? playersById.get(dragState.playerId) ?? null : null;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logoImg} alt="Logo" className="h-10 w-10 object-contain" />
            <h1 className="font-display text-2xl leading-none" style={{ letterSpacing: "0.06em" }}>
              Steners TF Ranked Tierlist
            </h1>
          </div>
          <Link href="/admin">
            <button className="text-sm font-semibold px-4 py-2 rounded-md border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors">
              Admin
            </button>
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-8 flex flex-col gap-8">
        <div className="tier-table">
          {TIERS.map((tier) => {
            const style = TIER_STYLE[tier];
            const isActive = activeZone === tier;
            const isWideLabel = tier === "TRICHEUR" || tier === "CONNAIT_PAS";

            return (
              <div
                key={tier}
                className="tier-row"
                style={{ background: isActive ? "hsl(var(--card))" : undefined }}
              >
                <div
                  className="tier-label"
                  style={{
                    background: style.bg,
                    fontSize: isWideLabel ? "0.92rem" : "2.4rem",
                    letterSpacing: isWideLabel ? "0.05em" : "0.04em",
                  }}
                >
                  {style.label}
                </div>

                <div
                  className="tier-content"
                  data-drop-zone={tier}
                  style={{
                    outline: isActive ? "2px solid hsl(var(--primary) / 0.4)" : undefined,
                    outlineOffset: isActive ? "-2px" : undefined,
                    transition: "outline 0.1s",
                  }}
                >
                  {tiers[tier].map((pid) => {
                    const player = playersById.get(pid);
                    if (!player) return null;

                    return (
                      <div
                        key={pid}
                        onPointerDown={(event) => handlePointerDown(event, pid)}
                        className="player-card"
                        style={{ opacity: dragState?.playerId === pid ? 0.3 : 1 }}
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

        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Non classe - {unrankedPlayers.length} joueur{unrankedPlayers.length !== 1 ? "s" : ""}
            </p>
          </div>

          <div
            className="unranked-zone"
            data-drop-zone="UNRANKED"
            style={{
              outline: activeZone === "UNRANKED" ? "2px solid hsl(var(--primary) / 0.4)" : undefined,
              outlineOffset: activeZone === "UNRANKED" ? "-2px" : undefined,
              background: activeZone === "UNRANKED" ? "hsl(var(--card) / 0.6)" : undefined,
            }}
          >
            {unrankedPlayers.length === 0 ? (
              <div className="w-full flex items-center justify-center text-muted-foreground/40 text-sm py-8">
                Tous les joueurs sont classes
              </div>
            ) : (
              unrankedPlayers.map((player) => (
                <div
                  key={player.id}
                  onPointerDown={(event) => handlePointerDown(event, player.id.toString())}
                  className="player-card"
                  style={{ opacity: dragState?.playerId === player.id.toString() ? 0.3 : 1 }}
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

        {draggedPlayer && dragState && (
          <div
            className="player-card"
            style={{
              position: "fixed",
              left: dragState.x - 46,
              top: dragState.y - 28,
              zIndex: 50,
              pointerEvents: "none",
              transform: "rotate(-3deg) scale(1.04)",
              boxShadow: "0 18px 40px rgba(0,0,0,0.45)",
            }}
          >
            <img
              src={`https://mc-heads.net/body/${draggedPlayer.username}/100`}
              alt={draggedPlayer.username}
              className="player-card-skin"
              draggable={false}
            />
            <div className="player-card-name">{draggedPlayer.username}</div>
          </div>
        )}
      </main>
    </div>
  );
}
