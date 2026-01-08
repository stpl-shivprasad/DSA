// DSA Periodic Table Logic

// Dependency guard: fail fast with a visible message if required globals aren't present.
if (typeof graphData === 'undefined' || !Array.isArray(graphData.nodes) || !Array.isArray(graphData.edges) || typeof PERIODIC_CONFIG === 'undefined') {
    console.error('[DSA Visualizer] Missing dependencies for periodic table.', {
        hasGraphData: typeof graphData !== 'undefined',
        hasNodes: typeof graphData !== 'undefined' && Array.isArray(graphData.nodes),
        hasEdges: typeof graphData !== 'undefined' && Array.isArray(graphData.edges),
        hasConfig: typeof PERIODIC_CONFIG !== 'undefined',
    });

    try {
        const host = document.querySelector('.table-container') || document.body;
        host.innerHTML = `
            <div class="error-container">
                <h2 class="error-title">Table failed to load</h2>
                <p class="error-message">Required scripts didn’t load. Make sure <strong>graph_data.js</strong> and <strong>periodic-table-config.js</strong> are reachable from your server.</p>
            </div>
        `;
    } catch {
        // no-op
    }

    throw new Error('Missing dependencies for periodic table');
}

// ========================================
// RELATIONS TRACKING (Lineage like graph view)
// ========================================

// Maps for tracking relationships
let parentMap = {};  // child → parents (prerequisites)
let childMap = {};   // parent → children (leads to)
let processedNodes = []; // Store for highlighting

// Build relationship maps from graphData edges
function buildRelationMaps() {
    if (!graphData || !graphData.edges) return;

    parentMap = {};
    childMap = {};

    graphData.edges.forEach(edge => {
        const source = edge.source;
        const target = edge.target;
        const relation = edge.relation || 'requires';

        // Child → Parents (prerequisites)
        if (!parentMap[target]) parentMap[target] = [];
        parentMap[target].push({ id: source, relation });

        // Parent → Children (leads to)
        if (!childMap[source]) childMap[source] = [];
        childMap[source].push({ id: target, relation });
    });
}

// Get all prerequisites (ancestors) for a node
function getPrerequisites(nodeId, maxDepth = 3) {
    const prereqs = new Set();
    const queue = [{ id: nodeId, depth: 0 }];

    while (queue.length > 0) {
        const { id, depth } = queue.shift();
        if (depth >= maxDepth) continue;

        const parents = parentMap[id] || [];
        parents.forEach(({ id: parentId }) => {
            if (!prereqs.has(parentId) && parentId !== nodeId) {
                prereqs.add(parentId);
                queue.push({ id: parentId, depth: depth + 1 });
            }
        });
    }
    return prereqs;
}

// Get all descendants (leads to) for a node
function getDescendants(nodeId, maxDepth = 2) {
    const descendants = new Set();
    const queue = [{ id: nodeId, depth: 0 }];

    while (queue.length > 0) {
        const { id, depth } = queue.shift();
        if (depth >= maxDepth) continue;

        const children = childMap[id] || [];
        children.forEach(({ id: childId }) => {
            if (!descendants.has(childId) && childId !== nodeId) {
                descendants.add(childId);
                queue.push({ id: childId, depth: depth + 1 });
            }
        });
    }
    return descendants;
}

// Currently selected element for relation highlighting
let selectedElementId = null;

// Highlight relations on the table
function highlightRelations(nodeId) {
    // Clear previous highlights
    clearRelationHighlights();

    if (!nodeId) {
        selectedElementId = null;
        return;
    }

    selectedElementId = nodeId;

    const prereqs = getPrerequisites(nodeId);
    const descendants = getDescendants(nodeId);

    // Get all element divs
    const elements = document.querySelectorAll('.element');

    elements.forEach(el => {
        const id = el.dataset.id;

        if (id === nodeId) {
            el.classList.add('relation-selected');
        } else if (prereqs.has(id)) {
            el.classList.add('relation-prereq');
        } else if (descendants.has(id)) {
            el.classList.add('relation-descendant');
        } else {
            el.classList.add('relation-dimmed');
        }
    });

    // Show relation legend
    showRelationLegend(prereqs.size, descendants.size);
}

// Clear all relation highlights
function clearRelationHighlights() {
    document.querySelectorAll('.element').forEach(el => {
        el.classList.remove('relation-selected', 'relation-prereq', 'relation-descendant', 'relation-dimmed');
    });
    hideRelationLegend();
}

// Show/hide relation legend
function showRelationLegend(prereqCount, descendantCount) {
    let legend = document.getElementById('relation-legend');
    if (!legend) {
        legend = document.createElement('div');
        legend.id = 'relation-legend';
        legend.className = 'relation-legend';
        document.body.appendChild(legend);
    }

    legend.innerHTML = `
        <div class="relation-legend-title">Relations</div>
        <div class="relation-legend-item">
            <span class="relation-dot prereq"></span>
            <span>Prerequisites (${prereqCount})</span>
        </div>
        <div class="relation-legend-item">
            <span class="relation-dot descendant"></span>
            <span>Leads To (${descendantCount})</span>
        </div>
        <div class="relation-legend-hint">Click elsewhere to clear</div>
    `;
    legend.classList.add('visible');
}

function hideRelationLegend() {
    const legend = document.getElementById('relation-legend');
    if (legend) legend.classList.remove('visible');
}

// ========================================
// Category configuration with colors
const categoryConfig = {
    'Foundation': { color: '#64748b', group: 1, shortName: 'Found' },
    'Concept': { color: '#64748b', group: 1, shortName: 'Concept' },
    'Bit Manipulation': { color: '#64748b', group: 1, shortName: 'Bits' },

    'Linear DS': { color: '#3b82f6', group: 2, shortName: 'Linear' },
    'Linked List': { color: '#3b82f6', group: 2, shortName: 'LL' },

    'Abstract DS': { color: '#06b6d4', group: 3, shortName: 'Abstract' },
    'Stack Patterns': { color: '#06b6d4', group: 3, shortName: 'Stack' },

    'Tree DS': { color: '#10b981', group: 4, shortName: 'Trees' },
    'Trees': { color: '#10b981', group: 4, shortName: 'Trees' },

    'Graph Algo': { color: '#8b5cf6', group: 5, shortName: 'Graph' },
    'Graph Algorithms': { color: '#8b5cf6', group: 5, shortName: 'Graph' },
    'Traversal': { color: '#8b5cf6', group: 5, shortName: 'Trav' },
    'Union Find': { color: '#8b5cf6', group: 5, shortName: 'UF' },

    'Hybrid DS': { color: '#f59e0b', group: 6, shortName: 'Hash' },

    'Sorting': { color: '#84cc16', group: 7, shortName: 'Sort' },

    'Pattern': { color: '#06b6d4', group: 8, shortName: 'Pattern' },
    'Algorithm': { color: '#06b6d4', group: 8, shortName: 'Algo' },
    'Two Pointers': { color: '#06b6d4', group: 8, shortName: '2Ptr' },
    'Sliding Window': { color: '#06b6d4', group: 8, shortName: 'SW' },
    'Prefix Sum': { color: '#06b6d4', group: 8, shortName: 'PS' },
    'Search Patterns': { color: '#06b6d4', group: 8, shortName: 'Search' },
    'Heap Patterns': { color: '#06b6d4', group: 8, shortName: 'Heap' },

    'Dynamic Programming': { color: '#ec4899', group: 9, shortName: 'DP' },
    'Advanced Algorithms': { color: '#ec4899', group: 9, shortName: 'Adv' },

    'Math': { color: '#f97316', group: 10, shortName: 'Math' },
    'Game Theory': { color: '#f97316', group: 10, shortName: 'Game' },
    'Geometry': { color: '#f97316', group: 10, shortName: 'Geo' },

    'Probabilistic DS': { color: '#14b8a6', group: 11, shortName: 'Prob' },

    'Distributed DS': { color: '#6366f1', group: 12, shortName: 'Dist' },

    'Specialized DS': { color: '#ef4444', group: 13, shortName: 'Spec' },
    'Complex DS': { color: '#ef4444', group: 13, shortName: 'Comp' },
    'Modern DS': { color: '#ef4444', group: 13, shortName: 'Modern' }
};


// Generate symbol from label
function generateSymbol(label, id) {
    // Custom overrides for better symbols
    const overrides = {
        'memory': 'Mem', 'bits': 'Bit', 'pointers': 'Ptr', 'array': 'Arr',
        'll': 'LL', 'dll': 'DLL', 'string': 'Str', 'hashmap': 'HM',
        'hashing': 'Hsh', 'stack': 'Stk', 'queue': 'Que', 'deque': 'Deq',
        'bst': 'BST', 'heap': 'Hp', 'minheap': 'MnH', 'maxheap': 'MxH',
        'binarytree': 'BT', 'trie': 'Tri', 'graph': 'Grp', 'dfs': 'DFS',
        'bfs': 'BFS', 'dijkstra': 'Dij', 'bellman': 'BF', 'floyd': 'FW',
        'twopointer': '2Pt', 'slidingwindow': 'SW', 'binarysearch': 'BS',
        'dp': 'DP', 'memo': 'Mem', 'greedy': 'Grd', 'backtrack': 'BT',
        'recursion': 'Rec', 'divideconquer': 'DC', 'avl': 'AVL', 'rbtree': 'RB',
        'btree': 'B+', 'segmenttree': 'Seg', 'fenwick': 'BIT', 'lca': 'LCA',
        'unionfind': 'UF', 'kruskal': 'Kr', 'prim': 'Prm', 'topological': 'Top',
        'quicksort': 'QS', 'mergesort': 'MS', 'heapsort': 'HS', 'bubblesort': 'Bub',
        'insertionsort': 'IS', 'selectionsort': 'SS', 'radixsort': 'Rad',
        'countingsort': 'Cnt', 'bucketsort': 'Bkt', 'lru': 'LRU', 'lfu': 'LFU',
        'bloomfilter': 'Blm', 'skiplist': 'Skp', 'treap': 'Trp'
    };

    const cleanId = id.toLowerCase().replace(/[^a-z]/g, '');
    if (overrides[cleanId]) return overrides[cleanId];

    const words = label.replace(/[^a-zA-Z\s]/g, '').split(/\s+/).filter(w => w.length > 0);

    if (words.length === 1) {
        return words[0].substring(0, 3).charAt(0).toUpperCase() + words[0].substring(1, 3).toLowerCase();
    } else if (words.length === 2) {
        return (words[0][0] + words[1][0]).toUpperCase();
    } else {
        return words.slice(0, 3).map(w => w[0]).join('').toUpperCase();
    }
}

// Track used symbols
const usedSymbols = new Set();

function getUniqueSymbol(label, id) {
    let symbol = generateSymbol(label, id);
    let original = symbol;
    let counter = 1;

    while (usedSymbols.has(symbol)) {
        if (symbol.length < 3) {
            symbol = original + counter;
        } else {
            symbol = original.substring(0, 2) + counter;
        }
        counter++;
    }

    usedSymbols.add(symbol);
    return symbol;
}

// Process nodes and assign positions
function processNodes() {
    const nodes = graphData.nodes;
    const processed = [];

    nodes.forEach((node, index) => {
        // Use new Periodic Table 2.0 classification
        const column = classifyColumn(node);
        const row = classifyRow(node);
        const columnConfig = PERIODIC_CONFIG.columns[column];
        const rowConfig = PERIODIC_CONFIG.rows[row];

        processed.push({
            id: node.id,
            label: node.label,
            symbol: getUniqueSymbol(node.label, node.id),
            category: node.category || 'Unknown', // Keep original for reference
            // New 2.0 classification
            column: column,
            row: row,
            columnOrder: columnConfig?.order || 99,
            rowOrder: rowConfig?.order || 99,
            color: columnConfig?.color || '#64748b',
            // Legacy fields for backward compatibility
            group: columnConfig?.order || 1,
            difficulty: node.difficulty || 5,
            interviewFrequency: node.interviewFrequency || 'low',
            companies: node.companies || [],
            number: index + 1
        });
    });

    return processed;
}

// Interview frequency icon
function getInterviewIcon(freq) {
    switch (freq) {
        case 'high': return '🔥';
        case 'medium': return '⚡';
        case 'low': return '○';
        default: return '';
    }
}

// Difficulty stars
function getDifficultyStars(diff) {
    const filled = Math.min(diff, 10);
    return '⭐'.repeat(Math.ceil(filled / 2));
}

// Generate company dots HTML
function getCompanyDots(companies) {
    if (!companies || companies.length === 0) return '';

    const topCompanies = companies.slice(0, 4); // Max 4 dots
    const dots = topCompanies.map(c => {
        const className = c.toLowerCase().replace(/\s+/g, '');
        return `<span class="company-dot ${className}" title="${c}"></span>`;
    }).join('');

    return `<div class="element-companies">${dots}</div>`;
}

// Create element HTML
function createElement(node) {
    const el = document.createElement('div');
    el.className = 'element';
    el.tabIndex = 0;
    el.setAttribute('role', 'button');
    el.setAttribute('aria-label', `${node.label} (${node.column})`);
    el.dataset.id = node.id;
    el.dataset.category = node.category; // Keep original for reference
    el.dataset.column = node.column; // New: functional column
    el.dataset.row = node.row; // New: maturity row
    el.dataset.difficulty = node.difficulty;
    el.dataset.interview = node.interviewFrequency;
    el.dataset.companies = (node.companies || []).join(',');
    el.style.setProperty('--element-color', node.color);

    el.innerHTML = `
        <span class="element-number">${node.number}</span>
        <span class="element-interview">${getInterviewIcon(node.interviewFrequency)}</span>
        <span class="element-symbol">${node.symbol}</span>
        <span class="element-name">${node.label.substring(0, 12)}</span>
        ${getCompanyDots(node.companies)}
    `;

    // Single click opens side panel
    el.addEventListener('click', (e) => {
        e.stopPropagation();
        openDetailPanel(node);
    });

    // Keyboard activation
    el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openDetailPanel(node);
        }
    });

    // Double click navigates to topic page
    el.addEventListener('dblclick', () => {
        window.location.href = `topic.html?id=${node.id}`;
    });

    // Hover tooltip
    el.addEventListener('mouseenter', (e) => showTooltip(e, node));
    el.addEventListener('mousemove', (e) => moveTooltip(e));
    el.addEventListener('mouseleave', hideTooltip);

    return el;
}

// Tooltip functions
const tooltip = document.getElementById('tooltip');

function showTooltip(e, node) {
    document.getElementById('tooltip-symbol').textContent = node.symbol;
    document.getElementById('tooltip-symbol').style.color = node.color;
    document.getElementById('tooltip-name').textContent = node.label;
    document.getElementById('tooltip-category').textContent = node.category;
    document.getElementById('tooltip-difficulty').textContent = getDifficultyStars(node.difficulty) + ` (${node.difficulty}/10)`;
    document.getElementById('tooltip-interview').textContent = node.interviewFrequency.charAt(0).toUpperCase() + node.interviewFrequency.slice(1);

    // Show companies if any
    const companiesEl = document.getElementById('tooltip-companies');
    if (companiesEl) {
        if (node.companies && node.companies.length > 0) {
            companiesEl.textContent = node.companies.join(', ');
            companiesEl.parentElement.style.display = 'flex';
        } else {
            companiesEl.parentElement.style.display = 'none';
        }
    }

    tooltip.classList.add('visible');
    moveTooltip(e);
}

function moveTooltip(e) {
    const padding = 15;
    let x = e.clientX + padding;
    let y = e.clientY + padding;

    // Keep tooltip on screen
    const rect = tooltip.getBoundingClientRect();
    if (x + rect.width > window.innerWidth) {
        x = e.clientX - rect.width - padding;
    }
    if (y + rect.height > window.innerHeight) {
        y = e.clientY - rect.height - padding;
    }

    tooltip.style.left = x + 'px';
    tooltip.style.top = y + 'px';
}

function hideTooltip() {
    tooltip.classList.remove('visible');
}

// Generate legend (into popover)
function generateLegend(nodes) {
    const legendPopover = document.getElementById('legend-popover');
    const legendToggle = document.getElementById('legend-toggle');

    // Use Periodic Table 2.0 columns for legend
    const columns = {};
    nodes.forEach(n => {
        if (!columns[n.column]) {
            columns[n.column] = {
                color: n.color,
                count: 0,
                order: PERIODIC_CONFIG.columns[n.column]?.order || 99,
                icon: PERIODIC_CONFIG.columns[n.column]?.icon || '📌'
            };
        }
        columns[n.column].count++;
    });

    // Add "All" option first
    const allItem = document.createElement('div');
    allItem.className = 'legend-item active';
    allItem.dataset.category = 'all';
    allItem.innerHTML = `
        <span class="legend-color legend-color-all"></span>
        <span>All Columns</span>
    `;
    allItem.addEventListener('click', () => {
        legendPopover.querySelectorAll('.legend-item').forEach(i => i.classList.remove('active'));
        allItem.classList.add('active');
        activeCategory = null;
        legendToggle.innerHTML = '🎨 All Columns <span style="opacity:0.5">▼</span>';
        filterElements();
    });
    legendPopover.appendChild(allItem);

    Object.entries(columns)
        .sort((a, b) => a[1].order - b[1].order)
        .forEach(([col, data]) => {
            const item = document.createElement('div');
            item.className = 'legend-item';
            item.dataset.category = col;
            item.dataset.column = col; // For column-based filtering
            item.innerHTML = `
                <span class="legend-color" style="background: ${data.color}"></span>
                <span>${data.icon} ${col} (${data.count})</span>
            `;

            item.addEventListener('click', () => {
                // Clear all active states
                legendPopover.querySelectorAll('.legend-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                activeCategory = col; // Now filtering by column
                // Update toggle button to show selected
                legendToggle.innerHTML = `<span class="legend-color" style="background: ${data.color}"></span> ${data.icon} ${col} <span class="dropdown-arrow">▼</span>`;
                filterElements();
                // Close popover after selection
                legendPopover.classList.remove('open');
                legendToggle.classList.remove('active');
            });

            legendPopover.appendChild(item);
        });

    // Toggle popover
    legendToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        legendPopover.classList.toggle('open');
        legendToggle.classList.toggle('active');
    });

    // Close popover when clicking outside
    document.addEventListener('click', (e) => {
        if (!legendPopover.contains(e.target) && e.target !== legendToggle) {
            legendPopover.classList.remove('open');
            legendToggle.classList.remove('active');
        }
    });
}

// Filter functions
let activeCategory = null; // Now represents column filter
let activeDifficulty = 'all';
let activeInterview = 'all';
let activeCompany = 'all';
let searchQuery = '';

// Check if a node passes current filters
function nodePassesFilter(node) {
    if (!node) return false;

    // Column filter
    if (activeCategory && node.column !== activeCategory) {
        return false;
    }

    // Difficulty filter
    if (activeDifficulty !== 'all') {
        const [min, max] = activeDifficulty.split('-').map(Number);
        if (node.difficulty < min || node.difficulty > max) {
            return false;
        }
    }

    // Interview filter
    if (activeInterview !== 'all' && node.interviewFrequency !== activeInterview) {
        return false;
    }

    // Company filter
    if (activeCompany !== 'all') {
        const companies = node.companies || [];
        if (!companies.includes(activeCompany)) {
            return false;
        }
    }

    // Search filter
    if (searchQuery) {
        const label = node.label?.toLowerCase() || '';
        const symbol = node.symbol?.toLowerCase() || '';
        const colName = node.column?.toLowerCase() || '';
        if (!label.includes(searchQuery) && !symbol.includes(searchQuery) && !colName.includes(searchQuery)) {
            return false;
        }
    }

    return true;
}

function filterElements() {
    const elements = document.querySelectorAll('.element');
    let visibleCount = 0;

    // Filter individual elements (expanded rows)
    elements.forEach(el => {
        const id = el.dataset.id;
        const node = allNodes.find(n => n.id === id);
        const visible = nodePassesFilter(node);

        el.classList.toggle('dimmed', !visible);
        if (visible) visibleCount++;
    });

    // Count elements in collapsed rows that pass filter
    const collapsedVisibleCount = countCollapsedVisibleElements();
    visibleCount += collapsedVisibleCount;

    // Update collapsed row previews
    updateCollapsedPreviews();

    // Update grid cells (dim cells with no visible elements)
    updateGridCellVisibility();

    document.getElementById('visible-count').textContent = visibleCount;
}

// Count visible elements in collapsed rows
function countCollapsedVisibleElements() {
    let count = 0;

    collapsedRows.forEach(rowName => {
        const rowElements = allNodes.filter(n => n.row === rowName);
        count += rowElements.filter(nodePassesFilter).length;
    });

    return count;
}

// Update collapsed row preview badges to reflect filter
function updateCollapsedPreviews() {
    document.querySelectorAll('.grid-cell.collapsed').forEach(cell => {
        const colName = cell.dataset.column;
        const rowName = cell.dataset.row;

        // Find all elements that would be in this cell
        const cellElements = allNodes.filter(n =>
            n.column === colName && n.row === rowName
        );

        // Filter to only matching elements
        const matchingElements = cellElements.filter(nodePassesFilter);

        // Update the preview badge
        const preview = cell.querySelector('.cell-collapsed-preview');
        if (preview) {
            if (matchingElements.length === 0) {
                cell.classList.add('dimmed');
                preview.innerHTML = `
                    <span class="preview-count dimmed-preview">0</span>
                `;
            } else {
                cell.classList.remove('dimmed');
                const symbols = matchingElements.slice(0, 2).map(n => n.symbol);
                const remaining = matchingElements.length - 2;
                preview.innerHTML = `
                    <span class="preview-symbols">${symbols.join(', ')}</span>
                    ${remaining > 0 ? `<span class="preview-count">+${remaining}</span>` : ''}
                `;
            }
        }
    });
}

// Dim grid cells that have no visible elements
function updateGridCellVisibility() {
    document.querySelectorAll('.grid-cell:not(.collapsed)').forEach(cell => {
        const elements = cell.querySelectorAll('.element');
        const visibleElements = Array.from(elements).filter(el => !el.classList.contains('dimmed'));

        cell.classList.toggle('all-dimmed', visibleElements.length === 0 && elements.length > 0);
    });
}

function filterByCategory(category) {
    activeCategory = category;

    // Update legend active state
    document.querySelectorAll('.legend-item').forEach(item => {
        item.classList.toggle('active', item.dataset.category === category);
    });

    filterElements();
}

// Setup filter buttons
function setupFilters() {
    // Difficulty filter (select dropdown)
    const difficultySelect = document.getElementById('difficulty-filter');
    if (difficultySelect) {
        difficultySelect.addEventListener('change', (e) => {
            activeDifficulty = e.target.value;
            filterElements();
        });
    }

    // Interview filters (toolbar buttons only)
    const interviewBtns = document.querySelectorAll('.toolbar-group button.toolbar-btn[data-interview]');
    interviewBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelectorAll('.toolbar-group button.toolbar-btn[data-interview]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeInterview = btn.dataset.interview;
            filterElements();
        });
    });

    // Company filter
    const companySelect = document.getElementById('company-filter');
    if (companySelect) {
        companySelect.addEventListener('change', (e) => {
            activeCompany = e.target.value;
            filterElements();
        });
    }

    // Search
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value.toLowerCase();
            filterElements();
        });
    }
}

// Assign grid positions based on category and difficulty
function assignGridPositions(nodes) {
    // Group nodes by consolidated category
    const groups = {
        foundations: [],    // Col 1-2
        linear: [],         // Col 3-4
        stackQueue: [],     // Col 5
        hash: [],           // Col 6
        trees: [],          // Col 7-9
        graphs: [],         // Col 10-13
        sorting: [],        // Col 14
        patterns: [],       // Col 15-17
        math: [],           // Col 18
        dp: [],             // Special row
        specialized: [],    // Special row
        distributed: [],    // Extra
        probabilistic: []   // Extra
    };

    nodes.forEach(node => {
        const cat = node.category;
        if (['Foundation', 'Concept', 'Bit Manipulation'].includes(cat)) {
            groups.foundations.push(node);
        } else if (['Linear DS', 'Linked List'].includes(cat)) {
            groups.linear.push(node);
        } else if (['Abstract DS', 'Stack Patterns'].includes(cat)) {
            groups.stackQueue.push(node);
        } else if (['Hybrid DS'].includes(cat)) {
            groups.hash.push(node);
        } else if (['Tree DS', 'Trees'].includes(cat)) {
            groups.trees.push(node);
        } else if (['Graph Algo', 'Graph Algorithms', 'Traversal', 'Union Find'].includes(cat)) {
            groups.graphs.push(node);
        } else if (['Sorting'].includes(cat)) {
            groups.sorting.push(node);
        } else if (['Pattern', 'Algorithm', 'Two Pointers', 'Sliding Window', 'Prefix Sum', 'Search Patterns', 'Heap Patterns'].includes(cat)) {
            groups.patterns.push(node);
        } else if (['Math', 'Game Theory', 'Geometry'].includes(cat)) {
            groups.math.push(node);
        } else if (['Dynamic Programming', 'Advanced Algorithms'].includes(cat)) {
            groups.dp.push(node);
        } else if (['Specialized DS', 'Complex DS', 'Modern DS'].includes(cat)) {
            groups.specialized.push(node);
        } else if (['Distributed DS'].includes(cat)) {
            groups.distributed.push(node);
        } else if (['Probabilistic DS'].includes(cat)) {
            groups.probabilistic.push(node);
        } else {
            groups.patterns.push(node); // Default
        }
    });

    // Sort each group by difficulty
    Object.values(groups).forEach(group => {
        group.sort((a, b) => a.difficulty - b.difficulty);
    });

    return groups;
}

// Track collapsed rows
const collapsedRows = new Set();

// Render the main grid - Periodic Table 2.0
function renderMainGrid(groups) {
    const grid = document.getElementById('periodic-grid');
    grid.innerHTML = '';

    // Get sorted columns and rows
    const columns = Object.entries(PERIODIC_CONFIG.columns)
        .sort((a, b) => a[1].order - b[1].order);
    const rows = Object.entries(PERIODIC_CONFIG.rows)
        .sort((a, b) => a[1].order - b[1].order);

    // Create header row: corner + column headers
    const corner = document.createElement('div');
    corner.className = 'corner-cell';
    corner.innerHTML = '<div class="logo">DSA<br/>Table</div>';
    grid.appendChild(corner);

    columns.forEach(([colName, colConfig]) => {
        const header = document.createElement('div');
        header.className = 'column-header';
        header.style.setProperty('--element-color', colConfig.color);
        header.innerHTML = `
            <span class="column-header-icon">${colConfig.icon}</span>
            <span class="column-header-name">${colName}</span>
        `;
        header.title = colConfig.description;
        grid.appendChild(header);
    });

    // Create data rows
    rows.forEach(([rowName, rowConfig]) => {
        const isCollapsed = collapsedRows.has(rowName);

        // Row header (clickable to toggle)
        const rowHeader = document.createElement('div');
        rowHeader.className = 'row-header' + (isCollapsed ? ' collapsed' : '');
        rowHeader.dataset.row = rowName;
        rowHeader.innerHTML = `
            <div class="row-header-top">
                <span class="row-header-icon">${rowConfig.icon}</span>
                <span class="row-toggle">${isCollapsed ? '▶' : '▼'}</span>
            </div>
            <span class="row-header-name">${rowName}</span>
            <span class="row-header-difficulty">${rowConfig.description.split(' ')[0]}</span>
        `;
        rowHeader.title = `${rowConfig.description} (Click to ${isCollapsed ? 'expand' : 'collapse'})`;

        // Toggle collapse on click
        rowHeader.addEventListener('click', () => {
            toggleRowCollapse(rowName);
        });

        grid.appendChild(rowHeader);

        // Cells for each column
        columns.forEach(([colName, colConfig]) => {
            const cell = document.createElement('div');
            cell.className = 'grid-cell' + (isCollapsed ? ' collapsed' : '');
            cell.dataset.column = colName;
            cell.dataset.row = rowName;

            // Find elements for this cell
            const cellElements = allNodes.filter(n =>
                n.column === colName && n.row === rowName
            );

            // Sort by difficulty within cell
            cellElements.sort((a, b) => a.difficulty - b.difficulty);

            if (isCollapsed) {
                // Collapsed view: show count badge with preview
                if (cellElements.length > 0) {
                    const preview = document.createElement('div');
                    preview.className = 'cell-collapsed-preview';

                    // Show top 2 symbols + count
                    const topSymbols = cellElements.slice(0, 2).map(n => n.symbol).join(', ');
                    const remaining = cellElements.length > 2 ? ` +${cellElements.length - 2}` : '';

                    preview.innerHTML = `
                        <span class="preview-symbols">${topSymbols}</span>
                        <span class="preview-count">${remaining || `(${cellElements.length})`}</span>
                    `;
                    preview.style.setProperty('--element-color', colConfig.color);
                    cell.appendChild(preview);
                }
            } else {
                // Expanded view: show all elements
                cellElements.forEach(node => {
                    cell.appendChild(createElement(node));
                });
            }

            grid.appendChild(cell);
        });
    });
}

// Toggle row collapse state
function toggleRowCollapse(rowName) {
    if (collapsedRows.has(rowName)) {
        collapsedRows.delete(rowName);
    } else {
        collapsedRows.add(rowName);
    }

    // Save to localStorage
    localStorage.setItem('dsa-collapsed-rows', JSON.stringify([...collapsedRows]));

    // Re-render grid
    const groups = assignGridPositions(allNodes);
    renderMainGrid(groups);

    // Re-apply filters after re-render
    filterElements();
}

// Load collapsed state from localStorage (default: all collapsed)
function loadCollapsedState() {
    try {
        const saved = localStorage.getItem('dsa-collapsed-rows');
        if (saved) {
            const rows = JSON.parse(saved);
            rows.forEach(r => collapsedRows.add(r));
        } else {
            // Default: all rows collapsed
            Object.keys(PERIODIC_CONFIG.rows).forEach(rowName => collapsedRows.add(rowName));
        }
    } catch (e) {
        // Default: all rows collapsed
        Object.keys(PERIODIC_CONFIG.rows).forEach(rowName => collapsedRows.add(rowName));
    }
}

// Render reactions section
function renderReactions() {
    const reactionsGrid = document.getElementById('reactions-grid');
    if (!reactionsGrid) return;

    reactionsGrid.innerHTML = '';

    PERIODIC_CONFIG.reactions.forEach(reaction => {
        const card = document.createElement('div');
        card.className = 'reaction-card';
        card.innerHTML = `
            <div class="reaction-formula">${reaction.formula}</div>
            <div class="reaction-name">${reaction.name}</div>
            <div class="reaction-desc">${reaction.description}</div>
        `;

        // On click, highlight the involved elements
        card.addEventListener('click', () => {
            highlightReactionElements(reaction);
            const target = reaction.output || (reaction.inputs && reaction.inputs[0]);
            if (target) focusTopicById(target, { openPanel: true });
        });

        reactionsGrid.appendChild(card);
    });
}

// Highlight elements involved in a reaction
function highlightReactionElements(reaction) {
    const normalizeId = (value) => (value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const allInputIds = (reaction.inputs || []).map(normalizeId).filter(Boolean);
    const outputId = normalizeId(reaction.output);

    document.querySelectorAll('.element').forEach(el => {
        const elId = normalizeId(el.dataset.id);
        const matches = allInputIds.some(id => elId.includes(id)) ||
            (outputId && elId.includes(outputId));

        if (matches) {
            el.classList.remove('dimmed');
            el.classList.add('highlighted');
        } else {
            el.classList.add('dimmed');
            el.classList.remove('highlighted');
        }
    });

    // Show clear button or auto-clear after delay
    setTimeout(() => {
        document.querySelectorAll('.element').forEach(el => {
            el.classList.remove('dimmed', 'highlighted');
        });
    }, 3000);
}

// Update stats
function updateStats(nodes) {
    document.getElementById('total-count').textContent = nodes.length;
    document.getElementById('visible-count').textContent = nodes.length;
    document.getElementById('high-interview-count').textContent = nodes.filter(n => n.interviewFrequency === 'high').length;

    const companyCountEl = document.getElementById('company-count');
    if (companyCountEl) {
        companyCountEl.textContent = nodes.filter(n => n.companies && n.companies.length > 0).length;
    }
}

// Global storage for nodes
let allNodes = [];
let selectedElement = null;
let lastDetailReturnFocusEl = null;

function isFocusableElement(el) {
    if (!el || el === document.body || el === document.documentElement) return false;
    if (typeof el.focus !== 'function') return false;
    if (el.hasAttribute?.('disabled')) return false;
    const tabIndex = el.getAttribute?.('tabindex');
    if (tabIndex != null && Number(tabIndex) < 0) return false;
    return true;
}

function focusDetailCloseButton() {
    if (isFocusableElement(detailClose)) detailClose.focus();
}

function setActiveDetailTab(tabName) {
    const activeTab = (tabName === 'overview' || tabName === 'companies' || tabName === 'related') ? tabName : 'overview';
    const tabs = Array.from(document.querySelectorAll('.panel-tab'));

    tabs.forEach(t => {
        const isActive = t.dataset.tab === activeTab;
        t.classList.toggle('active', isActive);
        t.setAttribute('aria-selected', isActive ? 'true' : 'false');
        t.setAttribute('tabindex', isActive ? '0' : '-1');
    });

    const overview = document.getElementById('detail-overview');
    const companies = document.getElementById('detail-companies-section');
    const related = document.getElementById('detail-related-section');

    // Hide all sections first using class
    if (overview) overview.classList.remove('active');
    if (companies) companies.classList.remove('active');
    if (related) related.classList.remove('active');

    // Show the active section
    if (activeTab === 'overview' && overview) {
        overview.classList.add('active');
    } else if (activeTab === 'companies' && companies) {
        companies.classList.add('active');
    } else if (activeTab === 'related' && related) {
        related.classList.add('active');
    }
}

// =====================
// SIDE DETAIL PANEL
// =====================
const detailPanel = document.getElementById('detail-panel');
const detailClose = document.getElementById('detail-close');

function openDetailPanel(node) {
    if (!detailPanel) return;

    const active = document.activeElement;
    lastDetailReturnFocusEl = isFocusableElement(active) ? active : null;

    selectedElement = node;

    // Update panel content
    document.getElementById('detail-symbol').textContent = node.symbol;
    document.getElementById('detail-symbol').style.borderColor = node.color;
    document.getElementById('detail-name').textContent = node.label;
    document.getElementById('detail-category').textContent = node.category;
    document.getElementById('detail-difficulty').textContent = getDifficultyStars(node.difficulty) + ` (${node.difficulty}/10)`;
    document.getElementById('detail-interview').textContent = getInterviewIcon(node.interviewFrequency) + ' ' + node.interviewFrequency;
    document.getElementById('detail-number').textContent = '#' + node.number;

    // Get original node data for description
    const originalNode = graphData.nodes.find(n => n.id === node.id);
    document.getElementById('detail-description').textContent = originalNode?.description || 'No description available.';
    document.getElementById('detail-time').textContent = originalNode?.timeEstimate || '—';

    // Companies
    const companiesList = document.getElementById('detail-companies-list');
    companiesList.innerHTML = '';
    if (node.companies && node.companies.length > 0) {
        node.companies.forEach(c => {
            const tag = document.createElement('span');
            tag.className = 'company-tag';
            tag.textContent = c;
            companiesList.appendChild(tag);
        });
    } else {
        companiesList.innerHTML = '<span style="color: var(--text-secondary);">No company data</span>';
    }

    // Render Related tab content
    renderRelatedTab(node);

    // Open button
    document.getElementById('detail-open-full').onclick = () => {
        window.location.href = `topic.html?id=${node.id}`;
    };

    // Mark element as selected
    document.querySelectorAll('.element.selected').forEach(el => el.classList.remove('selected'));
    const el = document.querySelector(`.element[data-id="${node.id}"]`);
    if (el) el.classList.add('selected');

    // Highlight related elements on the table
    highlightRelations(node.id);

    detailPanel.classList.add('open');

    // Default tab to Overview when opening
    setActiveDetailTab('overview');
    focusDetailCloseButton();
}

function closeDetailPanel() {
    const selectedId = selectedElement?.id;
    if (detailPanel) {
        detailPanel.classList.remove('open');
        document.querySelectorAll('.element.selected').forEach(el => el.classList.remove('selected'));
        selectedElement = null;
    }

    // Clear relation highlights
    clearRelationHighlights();

    if (isFocusableElement(lastDetailReturnFocusEl)) {
        try {
            lastDetailReturnFocusEl.focus();
        } catch {
            // no-op
        }
        return;
    }

    if (selectedId) {
        const el = document.querySelector(`.element[data-id="${selectedId}"]`);
        if (isFocusableElement(el)) {
            try {
                el.focus();
            } catch {
                // no-op
            }
        }
    }
}

detailClose?.addEventListener('click', closeDetailPanel);

// Render Related tab with prerequisites and descendants
function renderRelatedTab(node) {
    // Get the related section container (already in HTML)
    let relatedSection = document.getElementById('detail-related-section');
    if (!relatedSection) return;

    const prereqs = parentMap[node.id] || [];
    const children = childMap[node.id] || [];

    let html = '';

    // Prerequisites section
    html += `<div class="related-section">
        <div class="related-title prereq">⬅️ Prerequisites (${prereqs.length})</div>
        <div class="related-list">`;

    if (prereqs.length > 0) {
        prereqs.forEach(({ id, relation }) => {
            const prereqNode = processedNodes.find(n => n.id === id);
            if (prereqNode) {
                html += `
                    <div class="related-item prereq" data-id="${id}">
                        <span class="related-symbol" style="color: ${prereqNode.color}">${prereqNode.symbol}</span>
                        <span class="related-name">${prereqNode.label}</span>
                        <span class="related-relation">${relation}</span>
                    </div>`;
            }
        });
    } else {
        html += `<div class="related-empty">No prerequisites</div>`;
    }

    html += `</div></div>`;

    // Leads to section
    html += `<div class="related-section">
        <div class="related-title descendant">➡️ Leads To (${children.length})</div>
        <div class="related-list">`;

    if (children.length > 0) {
        children.forEach(({ id, relation }) => {
            const childNode = processedNodes.find(n => n.id === id);
            if (childNode) {
                html += `
                    <div class="related-item descendant" data-id="${id}">
                        <span class="related-symbol" style="color: ${childNode.color}">${childNode.symbol}</span>
                        <span class="related-name">${childNode.label}</span>
                        <span class="related-relation">${relation}</span>
                    </div>`;
            }
        });
    } else {
        html += `<div class="related-empty">Foundation topic</div>`;
    }

    html += `</div></div>`;

    relatedSection.innerHTML = html;

    // Add click handlers to navigate to related topics
    relatedSection.querySelectorAll('.related-item').forEach(item => {
        item.addEventListener('click', () => {
            const id = item.dataset.id;
            const targetNode = processedNodes.find(n => n.id === id);
            if (targetNode) {
                openDetailPanel(targetNode);
                // Scroll element into view
                const el = document.querySelector(`.element[data-id="${id}"]`);
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        });
    });
}

function focusTopicById(rawId, { openPanel = true } = {}) {
    const normalizeId = (value) => (value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const target = normalizeId(rawId);
    if (!target) return;

    const node = allNodes.find(n => {
        const nid = normalizeId(n.id);
        return nid === target || nid.includes(target) || target.includes(nid);
    });

    if (!node) return;

    // If the row is collapsed, expand it and re-render so the element exists in the DOM
    if (collapsedRows.has(node.row)) {
        collapsedRows.delete(node.row);
        localStorage.setItem('dsa-collapsed-rows', JSON.stringify([...collapsedRows]));
        const groups = assignGridPositions(allNodes);
        renderMainGrid(groups);
        filterElements();
    }

    const el = document.querySelector(`.element[data-id="${node.id}"]`);
    if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        el.classList.add('pulse');
        window.setTimeout(() => el.classList.remove('pulse'), 1200);
    }

    if (openPanel) {
        openDetailPanel(node);
    }
}

// Tab switching in detail panel
document.querySelectorAll('.panel-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        setActiveDetailTab(tab.dataset.tab);
    });

    tab.addEventListener('keydown', (e) => {
        const tabs = Array.from(document.querySelectorAll('.panel-tab'));
        const currentIndex = tabs.indexOf(tab);
        if (currentIndex < 0) return;

        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
            e.preventDefault();
            const delta = e.key === 'ArrowRight' ? 1 : -1;
            const next = tabs[(currentIndex + delta + tabs.length) % tabs.length];
            next?.focus();
            setActiveDetailTab(next?.dataset.tab);
        }
        if (e.key === 'Home') {
            e.preventDefault();
            tabs[0]?.focus();
            setActiveDetailTab(tabs[0]?.dataset.tab);
        }
        if (e.key === 'End') {
            e.preventDefault();
            tabs[tabs.length - 1]?.focus();
            setActiveDetailTab(tabs[tabs.length - 1]?.dataset.tab);
        }
    });
});

// =====================
// VIEW MODES
// =====================
let currentViewMode = 'standard';

function setViewMode(mode) {
    currentViewMode = mode;
    const grids = document.querySelectorAll('.periodic-grid, .special-grid');

    grids.forEach(grid => {
        grid.classList.remove('standard', 'compact', 'heatmap');
        grid.classList.add(mode);
    });

    // Update button states
    document.querySelectorAll('.view-mode-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === mode);
    });

    // Apply heatmap colors if in heatmap mode
    if (mode === 'heatmap') {
        applyHeatmap();
    } else {
        removeHeatmap();
    }
}

function applyHeatmap() {
    document.querySelectorAll('.element').forEach(el => {
        const diff = parseInt(el.dataset.difficulty) || 5;
        const intensity = diff / 10;
        // Green (easy) → Yellow → Red (hard)
        const r = Math.round(255 * intensity);
        const g = Math.round(255 * (1 - intensity * 0.5));
        const b = Math.round(100 * (1 - intensity));
        el.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
        el.style.color = intensity > 0.6 ? '#fff' : '#000';
    });
}

function removeHeatmap() {
    document.querySelectorAll('.element').forEach(el => {
        el.style.backgroundColor = '';
        el.style.color = '';
    });
}

// View mode buttons
document.querySelectorAll('.view-mode-btn').forEach(btn => {
    btn.addEventListener('click', () => setViewMode(btn.dataset.mode));
});

// =====================
// DIFFICULTY FILTER (dropdown)
// =====================
// Difficulty is handled by `setupFilters()` via `activeDifficulty`.

// =====================
// KEYBOARD SHORTCUTS
// =====================
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ignore if typing in input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            if (e.key === 'Escape') {
                e.target.blur();
                searchQuery = '';
                document.getElementById('search-input').value = '';
                filterElements();
            }
            return;
        }

        switch (e.key.toLowerCase()) {
            case '/':
                e.preventDefault();
                document.getElementById('search-input').focus();
                break;
            case 'escape':
                closeDetailPanel();
                // Clear all filters
                activeCategory = null;
                activeCompany = 'all';
                activeInterview = 'all';
                activeDifficulty = 'all';
                searchQuery = '';
                document.getElementById('search-input').value = '';
                document.getElementById('company-filter').value = 'all';
                const diffFilter = document.getElementById('difficulty-filter');
                if (diffFilter) diffFilter.value = 'all';
                document.querySelectorAll('.legend-item').forEach(i => i.classList.remove('active'));
                document.querySelectorAll('.toolbar-group .toolbar-btn[data-interview]').forEach(b => {
                    b.classList.toggle('active', b.dataset.interview === 'all');
                });
                filterElements();
                break;
            case 'g':
                e.preventDefault();
                document.getElementById('company-filter').value = 'Google';
                activeCompany = 'Google';
                filterElements();
                break;
            case 'm':
                e.preventDefault();
                document.getElementById('company-filter').value = 'Meta';
                activeCompany = 'Meta';
                filterElements();
                break;
            case 'a':
                e.preventDefault();
                document.getElementById('company-filter').value = 'Amazon';
                activeCompany = 'Amazon';
                filterElements();
                break;
            case '1': case '2': case '3':
                e.preventDefault();
                setViewMode(['standard', 'compact', 'heatmap'][parseInt(e.key) - 1]);
                break;
        }
    });
}

// Read URL params and apply initial filters
function applyUrlParams() {
    const params = new URLSearchParams(window.location.search);
    let filterApplied = false;
    let filterLabel = '';

    // Company filter
    const company = params.get('company');
    if (company) {
        const companySelect = document.getElementById('company-filter');
        if (companySelect) {
            // Find matching option (case-insensitive)
            const options = Array.from(companySelect.options);
            const match = options.find(o => o.value.toLowerCase() === company.toLowerCase());
            if (match) {
                companySelect.value = match.value;
                activeCompany = match.value;
                filterApplied = true;
                filterLabel = `🏢 ${match.value}`;
                console.log('[URL Param] Company filter applied:', match.value);
            } else {
                console.warn('[URL Param] Company not found in dropdown:', company);
            }
        }
    }

    // Difficulty filter
    const difficulty = params.get('difficulty');
    if (difficulty) {
        const diffSelect = document.getElementById('difficulty-filter');
        if (diffSelect) {
            diffSelect.value = difficulty;
            activeDifficulty = difficulty;
            filterApplied = true;
            filterLabel = `🔥 Difficulty ${difficulty}`;
            console.log('[URL Param] Difficulty filter applied:', difficulty);
        }
    }

    // Interview filter
    const interview = params.get('interview');
    if (interview && ['high', 'medium', 'low', 'all'].includes(interview.toLowerCase())) {
        activeInterview = interview.toLowerCase();
        document.querySelectorAll('.toolbar-group .toolbar-btn[data-interview]').forEach(b => {
            b.classList.toggle('active', b.dataset.interview === activeInterview);
        });
        if (activeInterview !== 'all') {
            filterApplied = true;
            filterLabel = `Interview: ${activeInterview}`;
        }
    }

    // Show filter banner if filter applied
    if (filterApplied) {
        showFilterBanner(filterLabel);
    }

    filterElements();
}

function showFilterBanner(label) {
    // Remove existing banner if any
    const existing = document.getElementById('filter-banner');
    if (existing) existing.remove();

    const banner = document.createElement('div');
    banner.id = 'filter-banner';
    banner.style.cssText = `
        position: fixed;
        top: 70px;
        left: 50%;
        transform: translateX(-50%);
        background: linear-gradient(135deg, rgba(97, 218, 251, 0.2), rgba(139, 92, 246, 0.2));
        border: 1px solid rgba(97, 218, 251, 0.5);
        padding: 10px 20px;
        border-radius: 8px;
        color: #61dafb;
        font-size: 0.9rem;
        font-weight: 500;
        z-index: 200;
        display: flex;
        align-items: center;
        gap: 12px;
        backdrop-filter: blur(10px);
    `;
    banner.innerHTML = `
        <span>Filtered: ${label}</span>
        <button id="clear-filter-btn" style="
            background: rgba(255,255,255,0.1);
            border: 1px solid rgba(255,255,255,0.3);
            color: #fff;
            padding: 4px 10px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.8rem;
        ">✕ Clear</button>
    `;
    document.body.appendChild(banner);

    document.getElementById('clear-filter-btn').addEventListener('click', () => {
        // Clear URL params and reload
        window.location.href = window.location.pathname;
    });
}

// Initialize
function init() {
    console.log('[DSA] init() called');
    if (typeof PERIODIC_CONFIG === 'undefined') {
        console.error('ERROR: PERIODIC_CONFIG not loaded!');
        return;
    }

    if (typeof graphData === 'undefined') {
        console.error('ERROR: graphData not loaded!');
        return;
    }

    // Build relationship maps for lineage tracking
    buildRelationMaps();

    // Load saved collapse state
    loadCollapsedState();

    allNodes = processNodes();
    console.log('[DSA] Processed nodes:', allNodes.length);
    processedNodes = allNodes; // Store for relation lookups

    const groups = assignGridPositions(allNodes);
    console.log('[DSA] Groups:', Object.keys(groups));

    generateLegend(allNodes);
    renderMainGrid(groups);
    console.log('[DSA] Grid rendered');
    renderReactions();

    updateStats(allNodes);
    setupFilters();
    setupKeyboardShortcuts();

    // Apply URL params after setup
    applyUrlParams();
}

// Run on load
document.addEventListener('DOMContentLoaded', init);
