export default function SearchCommand() {
  return (
    <input
      class="input"
      aria-label="Search command"
      placeholder="Search projects, tasks, members..."
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          globalThis.location.href = `/tasks?q=${encodeURIComponent(event.currentTarget.value)}`;
        }
      }}
    />
  );
}
