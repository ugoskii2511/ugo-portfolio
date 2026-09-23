import { Wrap } from "@/components/site/wrap";
import { LinkButton } from "@/components/site/button";

export default function NotFound() {
  return (
    <section className="relative isolate flex min-h-[70vh] items-center overflow-hidden py-24">
      <div aria-hidden className="blueprint-grid absolute inset-0 -z-10" />
      <Wrap>
        <p className="label-mono">Error 404</p>
        <h1 className="display mt-6 max-w-3xl text-balance text-5xl sm:text-7xl">
          This page doesn&apos;t exist. <span className="text-muted">Yet.</span>
        </h1>
        <p className="mt-6 max-w-md text-lg text-muted">It may have moved, or the link might be mistyped.</p>
        <div className="mt-10 flex flex-wrap gap-3">
          <LinkButton href="/">Back home</LinkButton>
          <LinkButton href="/work" variant="secondary">
            See the work
          </LinkButton>
        </div>
      </Wrap>
    </section>
  );
}
