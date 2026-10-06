"use client";
import { useEffect, useRef } from "react";
import { Play, ArrowUpRight, Radio } from "lucide-react";
import type { Game } from "@/db/schema";
import { useArcade } from "./ArcadeProvider";
export default function GameStage({ game, autoOpen = false }: { game: Game; autoOpen?: boolean }) {
  const { openGame } = useArcade();
  const didOpen = useRef(false);
  useEffect(() => { 
    if (autoOpen && !didOpen.current && game.status === "live" && game.source !== "external") { 
      didOpen.current = true; 
      // Do nothing! Let the user click the button.
    } 
  }, [autoOpen, game, openGame]);
  
  return game.status === "live" ? 
    <a className="btn btn-lime" href={game.source === "local" ? `/games/${game.slug}/index.html` : (game.url || "#")} target="_blank" rel="noopener noreferrer"><Play size={15} fill="currentColor" />Let's play<ArrowUpRight size={16} /></a> : 
    <button className="btn btn-lime" onClick={() => openGame(game)}><Radio size={16} />Get on the list<ArrowUpRight size={16} /></button>;
}
