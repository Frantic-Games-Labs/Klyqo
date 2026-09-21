"use client";
import { useEffect, useRef } from "react";
import { Play, ArrowUpRight, Radio } from "lucide-react";
import type { Game } from "@/db/schema";
import { useArcade } from "./ArcadeProvider";
export default function GameStage({ game, autoOpen = false }: { game: Game; autoOpen?: boolean }) {
  const { openGame } = useArcade();
  const didOpen = useRef(false);
  useEffect(() => { if (autoOpen && !didOpen.current && game.status === "live" && game.source !== "external") { didOpen.current = true; openGame(game); } }, [autoOpen, game, openGame]);
  return <button className="btn btn-lime" onClick={() => openGame(game)}>{game.status === "live" ? <Play size={15} fill="currentColor" /> : <Radio size={16} />}{game.status === "live" ? "Let’s play" : "Get on the list"}<ArrowUpRight size={16} /></button>;
}
