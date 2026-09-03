export default function HomePage() {
  return (
    <main>
      <h1>Business Agent</h1>
      <p>Configurable, auditable agents for enterprise business workflows.</p>
      <p>Land administration is the reference domain. Run data stays local by default.</p>
      <nav>
        <a href="/review">Open local review console</a>
        {" · "}
        <a href="/api/catalog">View domain catalog API</a>
      </nav>
      <h2>Local architecture</h2>
      <ul>
        <li>Markdown/YAML defines agents, skills, and flows.</li>
        <li>RunService records handoffs and waits for human review.</li>
        <li>Evaluations protect evidence, uncertainty, and safety boundaries.</li>
      </ul>
    </main>
  );
}
