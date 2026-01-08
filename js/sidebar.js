/**
 * Unified Sidebar Component
 * Handles tab switching, panel management across all pages (Graph, Periodic Table, Resources)
 */

// Generic tab switcher for any panel
function setupPanelTabs(panelSelector = '.detail-panel, #info-panel, #detail-panel, .side-panel') {
    document.querySelectorAll(panelSelector).forEach(panel => {
        const tabs = panel.querySelectorAll('.panel-tab');
        const contents = panel.querySelectorAll('.tab-content');

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetTab = tab.dataset.tab;
                setActivePanelTab(panel, targetTab);
            });

            // Keyboard nav: Arrow keys
            tab.addEventListener('keydown', (e) => {
                if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                    const allTabs = Array.from(panel.querySelectorAll('.panel-tab'));
                    const currentIndex = allTabs.indexOf(tab);
                    const nextIndex = e.key === 'ArrowLeft' 
                        ? (currentIndex - 1 + allTabs.length) % allTabs.length
                        : (currentIndex + 1) % allTabs.length;
                    allTabs[nextIndex].focus();
                    allTabs[nextIndex].click();
                }
            });
        });
    });
}

// Set active tab for a specific panel
function setActivePanelTab(panel, tabName) {
    const tabs = panel.querySelectorAll('.panel-tab');
    const contents = panel.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        const isActive = tab.dataset.tab === tabName;
        tab.classList.toggle('active', isActive);
        tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
        tab.setAttribute('tabindex', isActive ? '0' : '-1');
    });

    contents.forEach(content => {
        // Match by data-tab attribute OR by id pattern
        const contentTabName = content.dataset.tab || 
                              content.id.match(/(?:detail-|tab-)?(.+)(?:-section)?$/)?.[1];
        const isActive = contentTabName === tabName;
        
        content.classList.toggle('active', isActive);
        if (isActive) {
            content.removeAttribute('hidden');
        } else {
            content.setAttribute('hidden', '');
        }
    });
}

// Unified close panel function
function closeDetailPanel(panelSelector = '.detail-panel, #info-panel, #detail-panel, .side-panel') {
    const panel = typeof panelSelector === 'string' 
        ? document.querySelector(panelSelector)
        : panelSelector;
    
    if (panel) {
        panel.classList.remove('open');
    }
}

// Initialize sidebar on page load
document.addEventListener('DOMContentLoaded', () => {
    setupPanelTabs();

    // Bind close buttons to unified function
    document.querySelectorAll('.panel-close').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const panel = e.target.closest('.detail-panel, #info-panel, #detail-panel, .side-panel');
            closeDetailPanel(panel);
        });
    });

    // ESC key to close panel
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeDetailPanel();
        }
    });
});

// Backward compatibility wrapper: old code calls setActivePanelTab(tabName) with just one arg
// New code calls setActivePanelTab(panel, tabName) with two args
// Override the function to detect which signature is being used
const originalSetActivePanelTab = window.setActivePanelTab;
window.setActivePanelTab = function(panelOrTabName, tabName) {
    // If only one argument: find the open panel and use that
    if (tabName === undefined) {
        // panelOrTabName is actually the tabName
        const panel = document.querySelector('.detail-panel.open, #info-panel.open, #detail-panel.open, .side-panel.open');
        if (panel) {
            originalSetActivePanelTab(panel, panelOrTabName);
        }
    } else {
        // Two arguments: normal call
        originalSetActivePanelTab(panelOrTabName, tabName);
    }
};

// Also provide setActiveDetailTab as alias for backward compatibility
window.setActiveDetailTab = window.setActivePanelTab;
