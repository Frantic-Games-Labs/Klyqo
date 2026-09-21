import ArcadeHome from "@/components/ArcadeHome";
import { queryGames } from "@/lib/games";
export const dynamic = "force-dynamic";
export default async function Home() {
  return <ArcadeHome initial={await queryGames({ limit: 12 })} />;
}
