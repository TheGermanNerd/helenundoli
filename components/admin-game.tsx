import { connection } from "next/server";
import { adminPlayers, adminTasks, getSettings } from "@/lib/game";
import { qrSvg } from "@/lib/qr";
import { AdminGamePanel } from "@/components/admin-game-panel";

export async function AdminGame({ origin }: { origin: string }) {
  await connection();
  const tasks = await Promise.all(
    adminTasks().map(async (task) => {
      const claimUrl = `${origin}/spiel/einloesen/${task.token}`;
      return {
        id: task.id,
        title: task.title,
        instruction: task.instruction,
        points: task.points,
        claimUrl,
        svg: await qrSvg(claimUrl),
      };
    }),
  );

  return <AdminGamePanel settings={getSettings()} tasks={tasks} players={adminPlayers()} />;
}
