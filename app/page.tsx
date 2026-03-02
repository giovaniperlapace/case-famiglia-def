import Link from "next/link";

export default function HomePage() {
  return (
    <main>
      <h1>Case Famiglia</h1>
      <p className="muted">Questionnaire intake and private user portal.</p>
      <div className="card" style={{ marginTop: "1rem" }}>
        <p>
          Continue to <Link href="/login">login</Link>.
        </p>
      </div>
    </main>
  );
}
