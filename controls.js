export class SortInterface {
    constructor(stateManager) {
        this.stateManager = stateManager;
        this.container = document.createElement('div');
        this.container.className = 'sort-interface';
        const sortOrderGroup = document.createElement('div');
        sortOrderGroup.className = 'sort-order-group';
        const sortOrderLabel = document.createElement('label');
        sortOrderLabel.textContent = 'Sort by:';
        sortOrderLabel.htmlFor = 'sort-order-select';
        sortOrderGroup.appendChild(sortOrderLabel);
        this.sortOrderSelect = document.createElement('select');
        this.sortOrderSelect.id = 'sort-order-select';
        this.sortOrderSelect.className = 'sort-order-select';
        const sortOrders = [
            { value: 'hot', label: 'Hot' }, { value: 'new', label: 'New' }, { value: 'top', label: 'Top' },
            { value: 'best', label: 'Best' }, { value: 'rising', label: 'Rising' }, { value: 'controversial', label: 'Controversial' }
        ];
        for (const so of sortOrders) {
            const option = document.createElement('option');
            option.value = so.value;
            option.textContent = so.label;
            this.sortOrderSelect.appendChild(option);
        }
        this.sortOrderSelect.value = this.stateManager.getState().sortOrder;
        sortOrderGroup.appendChild(this.sortOrderSelect);
        this.container.appendChild(sortOrderGroup);
        this.timespanContainer = document.createElement('div');
        this.timespanContainer.className = 'timespan-group';
        const timespanLabel = document.createElement('label');
        timespanLabel.textContent = 'Time:';
        timespanLabel.htmlFor = 'timespan-select';
        this.timespanContainer.appendChild(timespanLabel);
        this.timespanSelect = document.createElement('select');
        this.timespanSelect.id = 'timespan-select';
        this.timespanSelect.className = 'timespan-select';
        const timespans = [
            { value: 'hour', label: 'Past Hour' }, { value: 'day', label: 'Past Day' }, { value: 'week', label: 'Past Week' },
            { value: 'month', label: 'Past Month' }, { value: 'year', label: 'Past Year' }, { value: 'all', label: 'All Time' }
        ];
        for (const ts of timespans) {
            const option = document.createElement('option');
            option.value = ts.value;
            option.textContent = ts.label;
            this.timespanSelect.appendChild(option);
        }
        this.timespanSelect.value = this.stateManager.getState().timespan;
        this.timespanContainer.appendChild(this.timespanSelect);
        this.container.appendChild(this.timespanContainer);
        this.updateTimespanVisibility(this.stateManager.getState().sortOrder);
        this.sortOrderSelect.addEventListener('change', () => this.handleSortOrderChange());
        this.timespanSelect.addEventListener('change', () => this.handleTimespanChange());
    }
    render() { return this.container; }
    getSortOrder() { return this.sortOrderSelect.value; }
    getTimespan() { return this.timespanSelect.value; }
    updateTimespanVisibility(sortOrder) {
        this.timespanContainer.style.display = (sortOrder === 'top' || sortOrder === 'controversial') ? 'flex' : 'none';
    }
    async handleSortOrderChange() {
        const sortOrder = this.getSortOrder();
        this.updateTimespanVisibility(sortOrder);
        await this.stateManager.setSortOrder(sortOrder);
    }
    async handleTimespanChange() {
        await this.stateManager.setTimespan(this.getTimespan());
    }
    updateFromState() {
        const state = this.stateManager.getState();
        this.sortOrderSelect.value = state.sortOrder;
        this.timespanSelect.value = state.timespan;
        this.updateTimespanVisibility(state.sortOrder);
    }
}
export class ColumnSelector {
    constructor(stateManager) {
        this.stateManager = stateManager;
        this.container = document.createElement('div');
        this.container.className = 'column-selector';
        const columnGroup = document.createElement('div');
        columnGroup.className = 'column-group';
        const columnLabel = document.createElement('label');
        columnLabel.textContent = 'Columns:';
        columnLabel.htmlFor = 'column-select';
        columnGroup.appendChild(columnLabel);
        this.columnSelect = document.createElement('select');
        this.columnSelect.id = 'column-select';
        this.columnSelect.className = 'column-select';
        for (let i = 1; i <= 6; i++) {
            const option = document.createElement('option');
            option.value = i.toString();
            option.textContent = i.toString();
            this.columnSelect.appendChild(option);
        }
        this.columnSelect.value = this.stateManager.getState().columnCount.toString();
        columnGroup.appendChild(this.columnSelect);
        this.container.appendChild(columnGroup);
        this.columnSelect.addEventListener('change', () => this.stateManager.setColumnCount(parseInt(this.columnSelect.value, 10)));
    }
    render() { return this.container; }
    getColumnCount() { return parseInt(this.columnSelect.value, 10); }
    updateFromState() { this.columnSelect.value = this.stateManager.getState().columnCount.toString(); }
}
function createToggle(stateManager, id, label, checked, onChange) {
    const container = document.createElement('div');
    const toggleLabel = document.createElement('label');
    toggleLabel.className = 'toggle-label';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = id;
    checkbox.className = 'toggle-checkbox-hidden';
    checkbox.checked = checked;
    const slider = document.createElement('span');
    slider.className = 'toggle-switch';
    const labelText = document.createElement('span');
    labelText.className = 'toggle-text';
    labelText.textContent = label;
    toggleLabel.appendChild(checkbox);
    toggleLabel.appendChild(slider);
    toggleLabel.appendChild(labelText);
    container.appendChild(toggleLabel);
    checkbox.addEventListener('change', () => onChange(checkbox.checked));
    return { container, checkbox };
}
export class VideoToggle {
    constructor(stateManager) {
        this.stateManager = stateManager;
        const t = createToggle(stateManager, 'video-toggle-checkbox', 'Videos/GIFs', stateManager.getState().showVideos, (checked) => stateManager.setShowVideos(checked));
        this.container = t.container;
        this.toggleCheckbox = t.checkbox;
    }
    render() { return this.container; }
    getShowVideos() { return this.toggleCheckbox.checked; }
    updateFromState() { this.toggleCheckbox.checked = this.stateManager.getState().showVideos; }
}
export class GalleryExpandToggle {
    constructor(stateManager) {
        this.stateManager = stateManager;
        const t = createToggle(stateManager, 'gallery-expand-toggle-checkbox', 'Expand', stateManager.getState().expandGalleries, (checked) => stateManager.setExpandGalleries(checked));
        this.container = t.container;
        this.toggleCheckbox = t.checkbox;
    }
    render() { return this.container; }
    getExpandGalleries() { return this.toggleCheckbox.checked; }
    updateFromState() { this.toggleCheckbox.checked = this.stateManager.getState().expandGalleries; }
}
export class DarkModeToggle {
    constructor(stateManager) {
        this.stateManager = stateManager;
        const t = createToggle(stateManager, 'dark-mode-checkbox', 'Dark', stateManager.getState().darkMode, (checked) => stateManager.setDarkMode(checked));
        this.container = t.container;
        this.toggleCheckbox = t.checkbox;
    }
    render() { return this.container; }
    updateFromState() { this.toggleCheckbox.checked = this.stateManager.getState().darkMode; }
}
export class LayoutToggle {
    constructor(stateManager) {
        this.stateManager = stateManager;
        const t = createToggle(stateManager, 'masonry-layout-checkbox', 'Masonry', stateManager.getState().masonryLayout, (checked) => stateManager.setMasonryLayout(checked));
        this.container = t.container;
        this.toggleCheckbox = t.checkbox;
    }
    render() { return this.container; }
    updateFromState() { this.toggleCheckbox.checked = this.stateManager.getState().masonryLayout; }
}
