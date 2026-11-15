// UI-4: Keep primary navigation and subpage history independent from page content.
// This only tracks where the user is; it does not persist or modify learning data.
export const PRIMARY_TABS = Object.freeze(['home', 'study', 'srs', 'speak', 'more']);

export class NavigationState {
  constructor(initialTab = 'home') {
    if (!PRIMARY_TABS.includes(initialTab)) throw new Error(`Unknown primary tab: ${initialTab}`);
    this.activeTab = initialTab;
    this.page = initialTab;
    this.stack = [];
  }

  switchTab(tab) {
    if (!PRIMARY_TABS.includes(tab)) return false;
    this.activeTab = tab;
    this.page = tab;
    this.stack = [];
    return true;
  }

  open(page) {
    if (!page || page === this.page) return;
    this.stack.push(this.page);
    this.page = page;
  }

  back() {
    this.page = this.stack.pop() || this.activeTab;
    return this.page;
  }
}
