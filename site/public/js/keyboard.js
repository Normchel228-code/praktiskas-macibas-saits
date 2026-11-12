// Atstarpes taustiņš aktivizē fokusētu saiti.
document.addEventListener("keydown", (event) => {
  if (event.defaultPrevented || event.key !== " " ||
      event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;

  const link = document.activeElement;
  if (event.target !== link || !link?.matches("a[href]")) return;

  event.preventDefault();
  if (!event.repeat) link.click();
});
