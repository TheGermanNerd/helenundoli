import { pointsLabel } from "@/lib/game-input";
import type { GameView } from "@/lib/game";
import { GameTasks } from "@/components/game-tasks";

export function GameBoard({ view }: { view: GameView }) {
  const goal = view.settings.goalPoints;
  const percent = Math.min(100, Math.round((view.score / goal) * 100));

  return (
    <div className="mt-8 space-y-8">
      <section className="border border-line bg-paper px-4 py-4">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-olive">Deine Punkte</p>
        <p className="mt-2 font-serif text-4xl text-bronze">
          {view.score} <span className="font-serif text-2xl text-ink-soft">von {goal}</span>
        </p>
        <div
          className="mt-3 h-2 bg-cream"
          role="progressbar"
          aria-valuenow={Math.min(view.score, goal)}
          aria-valuemin={0}
          aria-valuemax={goal}
          aria-label="Punkte bis zum Preis"
        >
          <div className="h-full bg-wine" style={{ width: `${percent}%` }} />
        </div>
        {view.playerName ? null : (
          <p className="mt-3 text-sm text-ink-soft">Trag deinen Namen ein, damit die Punkte bei dir landen.</p>
        )}
      </section>

      {view.prizeUnlocked ? (
        <section className="border border-gold bg-cream px-4 py-6 text-center">
          <p className="font-serif text-[0.68rem] font-medium tracking-[0.28em] text-olive uppercase">Geschafft</p>
          <h2 className="mt-2 font-script text-5xl leading-none text-bronze">{view.settings.prizeTitle}</h2>
          {view.settings.prizeText ? <p className="mt-4 whitespace-pre-wrap text-ink-soft">{view.settings.prizeText}</p> : null}
        </section>
      ) : null}

      <section>
        <h2 className="font-serif text-2xl text-bronze">Aufgaben</h2>
        <GameTasks tasks={view.tasks} playerName={view.playerName} />
      </section>

      <section>
        <h2 className="font-serif text-2xl text-bronze">Alle</h2>
        {view.leaderboard.length === 0 ? (
          <p className="mt-4 text-ink-soft">Noch niemand spielt.</p>
        ) : (
          <ol className="mt-4 divide-y divide-line border border-line bg-paper">
            {view.leaderboard.map((row, index) => (
              <li
                key={`${row.name}-${index}`}
                className={`flex items-baseline justify-between gap-3 px-4 py-3 ${row.you ? "bg-cream" : ""}`}
              >
                <span className="min-w-0">
                  <span className="text-olive">{index + 1}</span>
                  <span className="ml-3 break-words">{row.name}</span>
                  {row.you ? <span className="ml-2 text-sm text-ink-soft">du</span> : null}
                </span>
                <span className="shrink-0 font-medium">{pointsLabel(row.points)}</span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
