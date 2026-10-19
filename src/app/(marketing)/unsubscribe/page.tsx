import type { Metadata } from "next";
import { Wrap } from "@/components/site/wrap";
import { verifyUnsubscribe } from "@/lib/unsubscribe";

export const metadata: Metadata = {
  title: "Unsubscribe",
  robots: { index: false, follow: false },
};

type Search = { p?: string; t?: string; status?: string };

export default async function UnsubscribePage({ searchParams }: { searchParams: Promise<Search> }) {
  const { p, t, status } = await searchParams;
  const valid = verifyUnsubscribe(p, t);

  let title = "Stop hearing from me";
  let body: React.ReactNode;
  if (status === "done") {
    title = "You're unsubscribed";
    body = <p className="text-muted">You won&apos;t receive any more messages from me. Sorry for the interruption, and all the best with your business.</p>;
  } else if (status === "error") {
    title = "Something went wrong";
    body = <p className="text-muted">Your request couldn&apos;t be saved just now. Please try the link again, or simply reply to the email with “no thanks”.</p>;
  } else if (!valid) {
    title = "This link isn't valid";
    body = <p className="text-muted">It may have been copied incompletely. You can also reply to the email with “no thanks” and I won&apos;t contact you again.</p>;
  } else {
    body = (
      <form method="post" action={`/api/unsubscribe?p=${encodeURIComponent(p!)}&t=${encodeURIComponent(t!)}`} className="flex flex-col gap-5">
        <p className="text-muted">Click below and you won&apos;t receive any more emails or messages from me.</p>
        <button
          type="submit"
          className="flex min-h-12 w-fit items-center justify-center rounded-full bg-accent px-6 py-3 text-sm font-medium text-white transition hover:bg-[#4f79ff]"
        >
          Unsubscribe
        </button>
      </form>
    );
  }

  return (
    <section className="pb-24 pt-16 sm:pb-32 sm:pt-24">
      <Wrap className="max-w-xl">
        <p className="label-mono">Email preferences</p>
        <h1 className="display mt-6 text-balance text-4xl sm:text-5xl">{title}</h1>
        <div className="mt-6 text-lg leading-relaxed">{body}</div>
      </Wrap>
    </section>
  );
}
