import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import GameStage from "@/components/GameStage";
import GameCard, { StatusPill } from "@/components/GameCard";
import { getGame, relatedGames, topScores } from "@/lib/games";
export const dynamic = "force-dynamic";
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const game = await getGame((await params).slug);
  return { title: game ? `${game.title}${game.status === "live" ? " · Play now" : " · Coming soon"}` : "Game not found", description: game?.description, robots: { index: game?.status === "live", follow: true } };
}
export default async function PlayPage({ params }: Props) {
  const game = await getGame((await params).slug); if (!game) notFound();
  const [related, scores] = await Promise.all([relatedGames(game, 3), topScores(game.slug, 5)]);
  return <div className="detail-page"><div className="breadcrumb"><Link href="/#collection">THE COLLECTION</Link> / {game.title.toUpperCase()}</div><div className="detail-top"><div className="detail-art">{game.coverUrl && <Image src={game.coverUrl} alt={`${game.title} artwork`} fill priority sizes="(max-width: 600px) 90vw, 50vw" className="cover-image" />}</div><div className="detail-copy"><StatusPill status={game.status} /><h1>{game.title}<span className="lime">.</span></h1><p>{game.tagline}<br />{game.description}</p><GameStage game={game} autoOpen /></div></div><div className="detail-about"><section><span className="eyebrow">THE DETAILS</span><h2 style={{ marginTop: 10 }}>{game.status === "live" ? "Make yourself at home." : "A first look at what’s next."}</h2><p>{game.status === "live" ? "Your game opens in its own distraction-free panel. Go fullscreen, restart, or open a separate tab without leaving this domain. Scores from these demo games are reported by the browser, not a verified competition." : "This is a concept placeholder, not a playable game. No release date has been announced. Save it to your library or leave your email for future release updates."}</p><p style={{ marginTop: 15 }}><strong>Controls:</strong> {game.controls}</p></section><section className="score-list"><h2>Community scores</h2>{scores.length ? <ol>{scores.map((s,i) => <li key={s.id}><span>{String(i+1).padStart(2,"0")}</span><span>{s.player}</span><b>{s.score.toLocaleString()}</b></li>)}</ol> : <p>{game.status === "live" ? "A clean slate. Your first round could change that." : "This board opens when the game does."}</p>}</section></div>{related.length > 0 && <><h2 className="related-heading">Stay a little longer.</h2><div className="related-grid">{related.map((g) => <GameCard game={g} key={g.slug} />)}</div></>}</div>;
}
