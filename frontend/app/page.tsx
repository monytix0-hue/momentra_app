import { SplashGate } from "@/components/splash-gate";
import type { MomentContext } from "@/lib/design-tokens";
import { createClient } from "@/utils/supabase/server";

/** Cloudflare Pages (@cloudflare/next-on-pages) requires edge for non-static routes. */
export const runtime = "edge";

const contexts: MomentContext[] = ["personal", "group", "business", "circle"];

type TodoRow = { id: string; name: string };

export default async function Home() {
  const supabase = await createClient();
  const { data: todos, error: todosError } = await supabase
    .from("todos")
    .select("id, name");

  return (
    <SplashGate>
    <div className="flex flex-1 flex-col bg-bg px-m-4 py-m-8 text-ink">
      <header className="mx-auto w-full max-w-2xl border-b border-rule pb-m-6">
        <p className="mb-3 text-[9px] font-semibold uppercase tracking-[0.18em] text-gold">
          Design tokens
        </p>
        <h1 className="font-serif text-2xl font-semibold tracking-tight text-ink md:text-3xl">
          Momentra <em className="text-gold not-italic">Theme Kit</em>{" "}
          <span className="text-ink-3 not-italic">v2.1</span>
        </h1>
        <p className="mt-2 max-w-md text-[13px] leading-relaxed text-ink-3">
          Deep indigo base, four contexts, Plus Jakarta Sans — tokens in{" "}
          <code className="rounded-m-badge bg-surface-300 px-1.5 py-0.5 text-[10px] text-gold-light">
            globals.css
          </code>{" "}
          and{" "}
          <code className="rounded-m-badge bg-surface-300 px-1.5 py-0.5 text-[10px] text-gold-light">
            lib/design-tokens
          </code>
          . Set{" "}
          <code className="rounded-m-badge bg-surface-300 px-1.5 py-0.5 text-[10px] text-gold-light">
            data-context
          </code>{" "}
          on <code className="text-gold-light">html</code> to swap Personal, Group, Business, or Circle.
        </p>
      </header>

      <main className="mx-auto mt-m-8 flex w-full max-w-2xl flex-col gap-m-8">
        <section>
          <h2 className="mb-m-3 text-[9px] font-semibold uppercase tracking-[0.18em] text-gold">
            Supabase · todos
          </h2>
          {todosError ? (
            <p className="text-[13px] text-urgency-high">
              Could not load todos: {todosError.message}
            </p>
          ) : (
            <ul className="list-inside list-disc text-[13px] text-ink-2">
              {(todos as TodoRow[] | null)?.length ? (
                (todos as TodoRow[]).map((todo) => (
                  <li key={todo.id}>{todo.name}</li>
                ))
              ) : (
                <li className="list-none text-ink-4">
                  No rows yet — create a <code className="text-gold-light">todos</code> table with{" "}
                  <code className="text-gold-light">id</code> and{" "}
                  <code className="text-gold-light">name</code>.
                </li>
              )}
            </ul>
          )}
        </section>

        <section>
          <h2 className="mb-m-3 text-[9px] font-semibold uppercase tracking-[0.18em] text-gold">
            Surfaces
          </h2>
          <div className="flex flex-wrap gap-m-2">
            <div className="h-10 w-14 rounded-m-chip border border-surface-300 bg-bg" title="bg" />
            <div className="h-10 w-14 rounded-m-chip border border-surface-300 bg-bg-2" />
            <div className="h-10 w-14 rounded-m-chip border border-surface-300 bg-surface-100" />
            <div className="h-10 w-14 rounded-m-chip border border-surface-300 bg-surface-200" />
            <div className="h-10 w-14 rounded-m-chip border border-surface-300 bg-surface-300" />
            <div className="h-10 w-14 rounded-m-chip border border-surface-300 bg-surface-400" />
          </div>
        </section>

        <section>
          <h2 className="mb-m-3 text-[9px] font-semibold uppercase tracking-[0.18em] text-gold">
            Context preview (same page, swap attribute in devtools)
          </h2>
          <p className="mb-m-4 text-[11px] text-ink-4">
            Values: {contexts.join(", ")} — layout defaults to{" "}
            <span className="text-ink-3">business</span>.
          </p>
          <div
            className="rounded-m-hero border border-ctx-border bg-ctx-cover p-m-6 transition-colors duration-normal ease-[cubic-bezier(0.4,0,0.2,1)]"
            style={{
              boxShadow: "inset 0 1px 0 0 color-mix(in srgb, var(--ctx-accent) 22%, transparent)",
            }}
          >
            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-ctx-accent">
              Active context
            </p>
            <p className="mt-2 font-serif text-xl font-medium text-ctx-text">
              Sample hero title
            </p>
            <div className="mt-m-4 h-2 overflow-hidden rounded-m-cta bg-ctx-surface">
              <div
                className="h-full w-2/5 rounded-m-cta"
                style={{
                  background: `linear-gradient(90deg, var(--ctx-accent), var(--ctx-accent-end))`,
                }}
              />
            </div>
          </div>
        </section>
      </main>
    </div>
    </SplashGate>
  );
}
