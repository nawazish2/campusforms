/** CampusForms stores theme on `data-theme`; VengeanceUI also checks `.dark`. */
export function isDarkDocument(): boolean {
  const root = document.documentElement;
  return root.dataset.theme === 'dark' || root.classList.contains('dark');
}

export function observeDarkTheme(onChange: (dark: boolean) => void): () => void {
  const emit = () => onChange(isDarkDocument());
  emit();
  const observer = new MutationObserver(emit);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class', 'data-theme'],
  });
  return () => observer.disconnect();
}
