/** CampusForms stores theme on `data-theme`; VengeanceUI also checks `.dark`. */
export function isDarkDocument(): boolean {
  const root = document.documentElement;
  return root.dataset.theme === 'dark' || root.classList.contains('dark');
}
