// ============================================================
// DSA Concept Graph — "Neo-Obsidian" Style
// ============================================================

// Dependency guard: fail fast with a visible message if graph_data.js didn't load.
if (typeof graphData === 'undefined' || !Array.isArray(graphData.nodes) || !Array.isArray(graphData.edges)) {
    console.error('[DSA Visualizer] Missing or invalid graphData. Ensure graph_data.js is loading before app.js.');
    try {
        document.body.innerHTML = `
            <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:#0a0e17;color:#f3f4f6;font-family:Inter,system-ui,sans-serif;">
                <div style="max-width:720px;background:rgba(26,31,46,0.9);border:1px solid rgba(97,218,251,0.25);border-radius:12px;padding:18px;">
                    <h1 style="margin:0 0 8px 0;font-size:18px;">Graph failed to load</h1>
                    <p style="margin:0;color:#9ca3af;line-height:1.5;">The required data file <strong>graph_data.js</strong> didn’t load (or is invalid), so the graph app can’t start.</p>
                    <p style="margin:10px 0 0 0;color:#9ca3af;line-height:1.5;">If you’re running a local server, hard refresh once, and check the Network tab for a 404 on <strong>graph_data.js</strong>.</p>
                </div>
            </div>
        `;
    } catch {
        // no-op
    }
    throw new Error('Missing graphData');
}

// Close panel function (for slide-out animation)
let lastPanelReturnFocusEl = null;

function isFocusableElement(el) {
    if (!el || el === document.body || el === document.documentElement) return false;
    if (typeof el.focus !== 'function') return false;
    if (el.hasAttribute?.('disabled')) return false;
    const tabIndex = el.getAttribute?.('tabindex');
    if (tabIndex != null && Number(tabIndex) < 0) return false;
    return true;
}

function rememberPanelReturnFocus() {
    const active = document.activeElement;
    if (isFocusableElement(active)) {
        lastPanelReturnFocusEl = active;
        return;
    }
    const networkEl = document.getElementById('mynetwork');
    lastPanelReturnFocusEl = isFocusableElement(networkEl) ? networkEl : null;
}

function focusPanelCloseButton() {
    const closeBtn = document.getElementById('panel-close');
    if (isFocusableElement(closeBtn)) closeBtn.focus();
}

function closePanel() {
    document.getElementById('info-panel').classList.remove('open');
    if (isFocusableElement(lastPanelReturnFocusEl)) {
        try {
            lastPanelReturnFocusEl.focus();
        } catch {
            // no-op
        }
    }
}

function setActivePanelTab(targetTab) {
    const tabName = targetTab || 'overview';
    const tabs = Array.from(document.querySelectorAll('.panel-tab'));
    const panels = Array.from(document.querySelectorAll('.tab-content'));

    tabs.forEach(t => {
        const isActive = t.dataset.tab === tabName;
        t.classList.toggle('active', isActive);
        t.setAttribute('aria-selected', isActive ? 'true' : 'false');
        t.setAttribute('tabindex', isActive ? '0' : '-1');
    });

    panels.forEach(p => {
        const isActive = p.id === `tab-${tabName}`;
        p.classList.toggle('active', isActive);
        if (isActive) p.removeAttribute('hidden');
        else p.setAttribute('hidden', '');
    });
}

// Generate 2-3 letter symbol from label
function generateSymbol(label) {
    const words = label.split(/[\s\-_]+/);
    if (words.length === 1) {
        // Single word: take first 2-3 chars
        return label.substring(0, 3).toUpperCase();
    } else if (words.length === 2) {
        // Two words: first char of each
        return (words[0][0] + words[1][0]).toUpperCase();
    } else {
        // Multiple words: first char of first 3 words
        return words.slice(0, 3).map(w => w[0]).join('').toUpperCase();
    }
}

// Build reverse adjacency map (child → parents) for lineage tracing
const parentMap = {};
graphData.edges.forEach(e => {
    if (!parentMap[e.target]) parentMap[e.target] = [];
    parentMap[e.target].push({ parent: e.source, relation: e.relation });
});

// Find all ancestors back to root using BFS, with depth tracking
function getLineageToRoot(nodeId) {
    const ancestors = new Set();
    const lineageEdges = new Set();
    const depthMap = new Map(); // nodeId -> distance from selected node
    const queue = [{ id: nodeId, depth: 0 }];
    ancestors.add(nodeId);
    depthMap.set(nodeId, 0);
    
    while (queue.length > 0) {
        const { id: current, depth } = queue.shift();
        const parents = parentMap[current] || [];
        
        for (const { parent } of parents) {
            // Find the edge ID
            const edgeIdx = graphData.edges.findIndex(
                e => e.source === parent && e.target === current
            );
            if (edgeIdx >= 0) lineageEdges.add(`e${edgeIdx}`);
            
            if (!ancestors.has(parent)) {
                ancestors.add(parent);
                depthMap.set(parent, depth + 1);
                queue.push({ id: parent, depth: depth + 1 });
            }
        }
    }
    
    // Calculate max depth (distance to root)
    const maxDepth = Math.max(...depthMap.values());
    
    // Convert depth from selected node to step number from root
    // Step 1 = root, Step N = selected node
    const stepMap = new Map();
    depthMap.forEach((depth, id) => {
        stepMap.set(id, maxDepth - depth + 1);
    });
    
    return { ancestors, lineageEdges, depthMap, stepMap, maxDepth };
}

// Build child map (parent → children) for "Used By" feature
const childMap = {};
graphData.edges.forEach(e => {
    if (!childMap[e.source]) childMap[e.source] = [];
    childMap[e.source].push({ child: e.target, relation: e.relation });
});

// Render difficulty stars
function renderDifficulty(difficulty) {
    const filled = '★'.repeat(difficulty);
    const empty = '☆'.repeat(10 - difficulty);
    return filled + empty;
}

// Render "Used By" section
function renderUsedBy(nodeId) {
    const container = document.getElementById('node-used-by');
    if (!container) return;
    
    const children = childMap[nodeId] || [];
    
    if (children.length === 0) {
        container.innerHTML = '';
        return;
    }
    
    let html = '<h4>🔗 Used By / Enables</h4><div class="used-by-list">';
    
    // Limit to first 10 to avoid clutter
    const displayChildren = children.slice(0, 10);
    displayChildren.forEach(({ child, relation }) => {
        const childNode = graphData.nodes.find(n => n.id === child);
        const label = childNode ? childNode.label : child;
        html += `<span class="used-by-tag" data-node-id="${child}" title="${relation?.replace(/_/g, ' ') || 'relates'}">${label}</span>`;
    });
    
    if (children.length > 10) {
        html += `<span class="used-by-tag" style="background:#555;cursor:default">+${children.length - 10} more</span>`;
    }
    
    html += '</div>';
    container.innerHTML = html;
    
    // Add click handlers to navigate
    container.querySelectorAll('.used-by-tag[data-node-id]').forEach(tag => {
        tag.addEventListener('click', () => {
            const targetId = tag.dataset.nodeId;
            selectNode(targetId);
        });
    });
}

// Render company tags (compact version)
function renderCompanies(nodeId) {
    const container = document.getElementById('node-companies');
    if (!container) return;
    
    const nodeData = graphData.nodes.find(n => n.id === nodeId);
    const companies = nodeData?.companies || [];
    
    if (companies.length === 0) {
        container.innerHTML = '';
        container.style.display = 'none';
        return;
    }
    
    container.style.display = 'block';
    const topCompanies = companies.slice(0, 4);
    const moreCount = companies.length - 4;
    
    let html = '<div class="section-label">🏢 Top Companies</div>';
    html += '<div class="company-pills">';
    topCompanies.forEach(company => {
        html += `<span class="company-pill">${company}</span>`;
    });
    if (moreCount > 0) {
        html += `<span class="more-companies">+${moreCount} more</span>`;
    }
    html += '</div>';
    container.innerHTML = html;
}

// Render interview questions (compact preview)
function renderQuestions(nodeId) {
    const container = document.getElementById('node-questions');
    if (!container) return;
    
    const nodeData = graphData.nodes.find(n => n.id === nodeId);
    const questions = nodeData?.content?.interviewQuestions || nodeData?.interviewQuestions || [];
    
    if (questions.length === 0) {
        container.innerHTML = '';
        container.style.display = 'none';
        return;
    }
    
    container.style.display = 'block';
    const previewQuestions = questions.slice(0, 3);
    const moreCount = questions.length - 3;
    
    let html = '<div class="questions-preview-header">';
    html += '<span class="label">📝 Interview Questions</span>';
    html += `<span class="count">${questions.length}</span>`;
    html += '</div>';
    
    previewQuestions.forEach(q => {
        const diffClass = {
            'Easy': 'diff-easy',
            'Medium': 'diff-medium',
            'Hard': 'diff-hard'
        }[q.difficulty] || 'diff-medium';
        
        html += '<div class="question-preview-item">';
        html += `<span class="question-preview-name">${q.name}</span>`;
        html += `<span class="question-preview-diff ${diffClass}">${q.difficulty || 'Med'}</span>`;
        html += '</div>';
    });
    
    if (moreCount > 0) {
        html += `<div class="more-questions">+${moreCount} more questions inside</div>`;
    }
    
    container.innerHTML = html;
}

// Render stats row
function renderStats(nodeId) {
    const container = document.getElementById('node-stats');
    if (!container) return;
    
    const nodeData = graphData.nodes.find(n => n.id === nodeId);
    const questions = nodeData?.content?.interviewQuestions || nodeData?.interviewQuestions || [];
    const prereqs = graphData.edges.filter(e => e.to === nodeId).length;
    const unlocks = graphData.edges.filter(e => e.from === nodeId).length;
    const frequency = nodeData?.interviewFrequency || '';
    
    let html = '';
    
    if (frequency === 'high') {
        html += '<div class="stat-chip"><span class="icon">🔥</span><span class="value">Hot</span></div>';
    }
    
    if (questions.length > 0) {
        html += `<div class="stat-chip"><span class="icon">📝</span><span class="value">${questions.length}</span> questions</div>`;
    }
    
    if (prereqs > 0) {
        html += `<div class="stat-chip"><span class="icon">⬅️</span><span class="value">${prereqs}</span> prereqs</div>`;
    }
    
    if (unlocks > 0) {
        html += `<div class="stat-chip"><span class="icon">➡️</span><span class="value">${unlocks}</span> unlocks</div>`;
    }
    
    container.innerHTML = html;
}

// Render references in info panel
function renderReferences(nodeId) {
    const refsContainer = document.getElementById('node-refs');
    if (!refsContainer) return;
    
    // Find node in original data
    const nodeData = graphData.nodes.find(n => n.id === nodeId);
    const refs = nodeData?.references;
    
    if (!refs || ((!refs.official || refs.official.length === 0) && (!refs.community || refs.community.length === 0))) {
        refsContainer.innerHTML = '';
        return;
    }
    
    let html = '<h4>📚 References</h4>';
    
    if (refs.official && refs.official.length > 0) {
        html += '<div class="ref-section"><div class="ref-section-title">Official</div>';
        refs.official.forEach(ref => {
            html += `<a class="ref-link" href="${ref.url}" target="_blank" rel="noopener">${ref.title}</a>`;
        });
        html += '</div>';
    }
    
    if (refs.community && refs.community.length > 0) {
        html += '<div class="ref-section"><div class="ref-section-title">Community</div>';
        refs.community.forEach(ref => {
            html += `<a class="ref-link" href="${ref.url}" target="_blank" rel="noopener">${ref.title}</a>`;
        });
        html += '</div>';
    }
    
    refsContainer.innerHTML = html;
}

// Render lineage as Mermaid diagram
async function renderLineageDiagram(nodeId) {
    const container = document.getElementById('lineage-mermaid');
    if (!container || !window.mermaid) {
        // Fallback if mermaid not loaded
        if (container) container.innerHTML = '<em style="color:#666">Loading diagram...</em>';
        return;
    }
    
    const { stepMap, maxDepth } = getLineageToRoot(nodeId);
    
    // Build path from root to selected node
    let pathNodes = Array.from(stepMap.entries())
        .sort((a, b) => a[1] - b[1])
        .map(([id]) => {
            const n = graphData.nodes.find(x => x.id === id);
            return { id, label: n ? n.label : id, type: n?.type };
        });
    
    if (pathNodes.length <= 1) {
        container.innerHTML = '<em style="color:#888">This is the root node</em>';
        return;
    }
    
    // For very long paths (10+), collapse middle nodes to show key waypoints
    let collapsed = false;
    if (pathNodes.length > 8) {
        const first3 = pathNodes.slice(0, 3);
        const last3 = pathNodes.slice(-3);
        pathNodes = [...first3, { id: 'ellipsis', label: `... ${pathNodes.length - 6} more ...`, type: 'collapsed' }, ...last3];
        collapsed = true;
    }
    
    // Use vertical layout (TB) for paths > 4 nodes, horizontal (LR) for short paths
    const direction = pathNodes.length > 4 ? 'TB' : 'LR';
    
    // Build Mermaid flowchart
    let mermaidCode = '%%{init: {"theme": "dark", "themeVariables": {"fontSize": "11px"}, "flowchart": {"nodeSpacing": 15, "rankSpacing": 30}}}%%\n';
    mermaidCode += `flowchart ${direction}\n`;
    
    // Define nodes with styling
    pathNodes.forEach((node, i) => {
        const safeLabel = node.label.replace(/["\[\]()]/g, '').substring(0, 25);
        const isSelected = i === pathNodes.length - 1;
        const isRoot = i === 0;
        const isCollapsed = node.type === 'collapsed';
        
        if (isCollapsed) {
            mermaidCode += `    ${node.id}{{"${safeLabel}"}}\n`;
        } else if (isRoot) {
            mermaidCode += `    ${node.id}[["${safeLabel}"]]\n`;
        } else if (isSelected) {
            mermaidCode += `    ${node.id}(("${safeLabel}"))\n`;
        } else {
            mermaidCode += `    ${node.id}["${safeLabel}"]\n`;
        }
    });
    
    // Define edges with relations
    for (let i = 0; i < pathNodes.length - 1; i++) {
        const from = pathNodes[i].id;
        const to = pathNodes[i + 1].id;
        
        // Skip relation lookup for collapsed nodes
        if (pathNodes[i].type === 'collapsed' || pathNodes[i + 1].type === 'collapsed') {
            mermaidCode += `    ${from} -.-> ${to}\n`;
            continue;
        }
        
        // Find the relation between these nodes
        const edge = graphData.edges.find(e => e.source === from && e.target === to);
        const relation = edge?.relation?.replace(/_/g, ' ') || '';
        
        if (relation && relation.length <= 15) {
            mermaidCode += `    ${from} -->|${relation}| ${to}\n`;
        } else {
            mermaidCode += `    ${from} --> ${to}\n`;
        }
    }
    
    // Add styling
    mermaidCode += `    style ${pathNodes[0].id} fill:#ff6b6b,stroke:#ff6b6b,color:#fff\n`;
    mermaidCode += `    style ${pathNodes[pathNodes.length - 1].id} fill:#61dafb,stroke:#61dafb,color:#000\n`;
    if (collapsed) {
        mermaidCode += `    style ellipsis fill:#555,stroke:#777,color:#aaa\n`;
    }
    
    try {
        // Clear previous and render new
        container.innerHTML = '';
        const { svg } = await window.mermaid.render('lineage-svg-' + Date.now(), mermaidCode);
        container.innerHTML = svg;
    } catch (err) {
        console.error('Mermaid render error:', err);
        // Fallback to text representation
        const originalPath = Array.from(stepMap.entries())
            .sort((a, b) => a[1] - b[1])
            .map(([id]) => {
                const n = graphData.nodes.find(x => x.id === id);
                return n ? n.label : id;
            });
        container.innerHTML = `<div style="color:#888;font-size:11px;line-height:1.6">${originalPath.map((n, i) => `${i + 1}. ${n}`).join('<br>')}</div>`;
    }
}

// Color palette for different node types (neon/pastel on dark)
const colors = {
    root: '#ff6b6b',
    primitive: '#feca57',
    'ds-linear': '#48dbfb',
    'ds-abstract': '#54a0ff',
    'ds-hybrid': '#00d2d3',
    'ds-hierarchical': '#1dd1a1',
    'ds-complex': '#10ac84',
    'ds-specialized': '#c8d6e5',
    'ds-probabilistic': '#8395a7',
    'ds-modern': '#ff9ff3',
    'ds-distributed': '#e17055',
    concept: '#a29bfe',
    algo: '#fdcb6e',
    'algo-pattern': '#fab1a0',
    'algo-traversal': '#74b9ff',
    'algo-graph': '#636e72',
    'algo-sorting': '#81ecec',
    'algo-dp': '#fd79a8',
    'algo-math': '#dfe6e9',
    'algo-geometry': '#00cec9',
    'algo-game': '#e84393'
};

// Pre-compute degree (number of connections) for dynamic sizing
const degreeMap = {};
graphData.edges.forEach(e => {
    degreeMap[e.source] = (degreeMap[e.source] || 0) + 1;
    degreeMap[e.target] = (degreeMap[e.target] || 0) + 1;
});
const maxDegree = Math.max(...Object.values(degreeMap), 1);

function getNodeSize(id) {
    const deg = degreeMap[id] || 1;
    // Scale between 12 and 45 based on degree
    return 12 + (deg / maxDegree) * 33;
}

// Build nodes with glowing dot style
const nodes = new vis.DataSet(
    graphData.nodes.map(node => {
        const baseColor = colors[node.type] || '#888';
        const size = getNodeSize(node.id);
        return {
            id: node.id,
            label: node.label,
            title: `${node.label}\n${node.description}`,
            size,
            shape: 'dot',
            color: {
                background: baseColor,
                border: baseColor,
                highlight: { background: '#ffffff', border: baseColor },
                hover: { background: '#ffffff', border: baseColor }
            },
            shadow: {
                enabled: true,
                color: baseColor,
                size: 18,
                x: 0,
                y: 0
            },
            font: {
                color: '#eeeeee',
                size: Math.max(12, size * 0.55),
                face: 'Inter, system-ui, sans-serif',
                strokeWidth: 2,
                strokeColor: '#111111'
            },
            borderWidth: 2,
            borderWidthSelected: 4,
            ...(node.id === 'memory' ? { x: 0, y: -600, fixed: { x: true, y: true } } : {}),
            _type: node.type,
            _desc: node.description
        };
    })
);

// Build edges — subtle by default
const edges = new vis.DataSet(
    graphData.edges.map((edge, idx) => ({
        id: `e${idx}`,
        from: edge.source,
        to: edge.target,
        label: String(edge.relation || '').replace(/_/g, ' '),
        arrows: { to: { enabled: true, scaleFactor: 0.5 } },
        color: { color: 'rgba(255,255,255,0.15)', highlight: '#ffffff', hover: '#ffffff' },
        width: 1,
        hoverWidth: 2,
        font: {
            color: 'rgba(255,255,255,0)',
            size: 12,
            face: 'Inter, system-ui, sans-serif',
            strokeWidth: 0,
            strokeColor: 'transparent',
            background: 'transparent',
            vadjust: -8
        },
        smooth: { type: 'continuous', roundness: 0.4 },
        _label: String(edge.relation || '').replace(/_/g, ' ')
    }))
);

// Container & options
const container = document.getElementById('mynetwork');
const data = { nodes, edges };
const options = {
    nodes: {
        borderWidth: 2,
        chosen: true
    },
    edges: {
        selectionWidth: 2,
        smooth: { type: 'continuous', roundness: 0.4 }
    },
    physics: {
        enabled: true,
        barnesHut: {
            gravitationalConstant: -12000,
            centralGravity: 0.08,
            springLength: 220,
            springConstant: 0.015,
            damping: 0.25,
            avoidOverlap: 0.85
        },
        stabilization: { iterations: 1200, updateInterval: 30, fit: true }
    },
    layout: { improvedLayout: true },
    interaction: {
        hover: true,
        tooltipDelay: 150,
        hideEdgesOnDrag: true,
        hideEdgesOnZoom: true
    }
};

const network = new vis.Network(container, data, options);

// -------- Spotlight Interaction --------
let physicsEnabled = true;
let edgeLabelsVisible = false;

function setPhysics(enabled) {
    physicsEnabled = enabled;
    network.setOptions({ physics: { enabled } });
    const btn = document.getElementById('toggle-physics');
    if (btn) btn.textContent = `Physics: ${enabled ? 'on' : 'off'}`;
}

function setEdgeLabels(visible) {
    edgeLabelsVisible = visible;
    const updates = [];
    edges.forEach(e => {
        updates.push({
            id: e.id,
            font: {
                size: 12,
                face: 'Inter, system-ui, sans-serif',
                color: visible ? '#ffeb3b' : 'rgba(255,255,255,0)',
                strokeWidth: 0,
                strokeColor: 'transparent',
                background: visible ? 'rgba(0,0,0,0.75)' : 'transparent',
                vadjust: -8
            }
        });
    });
    edges.update(updates);
    const btn = document.getElementById('toggle-edge-labels');
    if (btn) btn.textContent = `Edge labels: ${visible ? 'on' : 'off'}`;
}

function focusRoot() {
    network.focus('memory', { scale: 0.85, animation: { duration: 400, easingFunction: 'easeInOutQuad' } });
}

function resetView() {
    // Restore all nodes (including original labels)
    const nodeUpdates = graphData.nodes.map(n => {
        const baseColor = colors[n.type] || '#888';
        return {
            id: n.id,
            label: n.label, // Restore original label without step numbers
            color: { background: baseColor, border: baseColor, highlight: { background: '#fff', border: baseColor }, hover: { background: '#fff', border: baseColor } },
            shadow: { enabled: true, color: baseColor, size: 18, x: 0, y: 0 },
            font: { color: '#eeeeee', strokeWidth: 2, strokeColor: '#111' },
            borderWidth: 2
        };
    });
    nodes.update(nodeUpdates);

    // Restore all edges
    const edgeUpdates = [];
    edges.forEach(e => {
        edgeUpdates.push({
            id: e.id,
            color: { color: 'rgba(255,255,255,0.15)', highlight: '#fff', hover: '#fff' },
            width: 1,
            arrows: { to: { enabled: true, scaleFactor: 0.5 }, middle: { enabled: false } },
            smooth: { type: 'continuous', roundness: 0.4 },
            font: { size: 12, face: 'Inter, system-ui, sans-serif', color: edgeLabelsVisible ? '#ffeb3b' : 'rgba(255,255,255,0)', strokeWidth: 0, background: edgeLabelsVisible ? 'rgba(0,0,0,0.75)' : 'transparent', vadjust: -8 }
        });
    });
    edges.update(edgeUpdates);
}

function spotlight(nodeId) {
    const connectedNodes = new Set(network.getConnectedNodes(nodeId));
    connectedNodes.add(nodeId);
    const connectedEdges = new Set(network.getConnectedEdges(nodeId));

    // Dim non-connected nodes
    const nodeUpdates = [];
    nodes.forEach(n => {
        const isConn = connectedNodes.has(n.id);
        const baseColor = colors[n._type] || '#888';
        nodeUpdates.push({
            id: n.id,
            color: isConn
                ? { background: baseColor, border: baseColor, highlight: { background: '#fff', border: baseColor }, hover: { background: '#fff', border: baseColor } }
                : { background: '#333', border: '#444', highlight: { background: '#555', border: '#666' }, hover: { background: '#555', border: '#666' } },
            shadow: isConn ? { enabled: true, color: baseColor, size: 18, x: 0, y: 0 } : { enabled: false },
            font: isConn ? { color: '#eeeeee', strokeWidth: 2, strokeColor: '#111' } : { color: '#666', strokeWidth: 0 }
        });
    });
    nodes.update(nodeUpdates);

    // Highlight connected edges, dim others
    const edgeUpdates = [];
    edges.forEach(e => {
        const isConn = connectedEdges.has(e.id);
        edgeUpdates.push({
            id: e.id,
            color: isConn ? { color: '#ffffff', highlight: '#fff', hover: '#fff' } : { color: 'rgba(255,255,255,0.05)', highlight: '#fff', hover: '#fff' },
            width: isConn ? 2 : 1,
            font: {
                size: 12,
                face: 'Inter, system-ui, sans-serif',
                color: isConn ? '#ffeb3b' : 'rgba(255,255,255,0)',
                strokeWidth: 0,
                strokeColor: 'transparent',
                background: isConn ? 'rgba(0,0,0,0.75)' : 'transparent',
                vadjust: -8
            }
        });
    });
    edges.update(edgeUpdates);
}

// Highlight lineage path back to root with step numbers
function spotlightLineage(nodeId) {
    const { ancestors, lineageEdges, stepMap, maxDepth } = getLineageToRoot(nodeId);
    
    // Highlight ancestor nodes with step numbers, dim others
    const nodeUpdates = [];
    nodes.forEach(n => {
        const isAncestor = ancestors.has(n.id);
        const isSelected = n.id === nodeId;
        const baseColor = colors[n._type] || '#888';
        const step = stepMap.get(n.id);
        
        // Create label with step number for ancestors
        let label = n.label;
        if (isAncestor && step !== undefined) {
            // Show step number as prefix: "① Memory" or "⑤ Floyd-Warshall"
            const circledNumbers = ['⓪', '①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩', '⑪', '⑫', '⑬', '⑭', '⑮', '⑯', '⑰', '⑱', '⑲', '⑳'];
            const stepIcon = step <= 20 ? circledNumbers[step] : `(${step})`;
            label = `${stepIcon} ${n.label}`;
        }
        
        nodeUpdates.push({
            id: n.id,
            label: isAncestor ? label : n.label,
            color: isAncestor
                ? { 
                    background: isSelected ? '#ffffff' : baseColor, 
                    border: isSelected ? '#ff6b6b' : baseColor, 
                    highlight: { background: '#fff', border: baseColor }, 
                    hover: { background: '#fff', border: baseColor } 
                  }
                : { background: '#222', border: '#333', highlight: { background: '#444', border: '#555' }, hover: { background: '#444', border: '#555' } },
            shadow: isAncestor 
                ? { enabled: true, color: isSelected ? '#ff6b6b' : baseColor, size: isSelected ? 30 : 18, x: 0, y: 0 } 
                : { enabled: false },
            font: isAncestor 
                ? { color: '#eeeeee', strokeWidth: 2, strokeColor: '#111', size: isSelected ? 18 : undefined } 
                : { color: '#444', strokeWidth: 0 },
            borderWidth: isSelected ? 4 : 2
        });
    });
    nodes.update(nodeUpdates);

    // Highlight lineage edges with gradient effect and prominent arrows
    const edgeUpdates = [];
    edges.forEach(e => {
        const isLineage = lineageEdges.has(e.id);
        edgeUpdates.push({
            id: e.id,
            color: isLineage 
                ? { color: '#ff6b6b', highlight: '#ff6b6b', hover: '#ff6b6b' } 
                : { color: 'rgba(255,255,255,0.03)', highlight: '#fff', hover: '#fff' },
            width: isLineage ? 4 : 1,
            arrows: isLineage 
                ? { 
                    to: { enabled: true, scaleFactor: 1.2, type: 'arrow' },
                    middle: { enabled: true, scaleFactor: 0.6, type: 'arrow' }
                  }
                : { to: { enabled: true, scaleFactor: 0.5 }, middle: { enabled: false } },
            font: {
                size: isLineage ? 14 : 12,
                face: 'Inter, system-ui, sans-serif',
                color: isLineage ? '#ffeb3b' : 'rgba(255,255,255,0)',
                strokeWidth: 0,
                strokeColor: 'transparent',
                background: isLineage ? 'rgba(0,0,0,0.85)' : 'transparent',
                vadjust: -10
            },
            smooth: isLineage 
                ? { type: 'curvedCW', roundness: 0.15 }
                : { type: 'continuous', roundness: 0.4 },
            dashes: false
        });
    });
    edges.update(edgeUpdates);
}

// -------- Event Handlers --------
let lineageMode = true; // Default to lineage tracing on click
let currentNodeId = null; // Track current selected node

network.on('click', function (params) {
    const infoPanel = document.getElementById('info-panel');
    if (params.nodes.length > 0) {
        rememberPanelReturnFocus();
        const nodeId = params.nodes[0];
        currentNodeId = nodeId; // Store for quiz
        window.currentNodeId = nodeId; // Expose globally
        const node = nodes.get(nodeId);
        const nodeData = graphData.nodes.find(n => n.id === nodeId);
        
        // Generate symbol from label (2-3 chars)
        const symbol = generateSymbol(node.label);
        const symbolEl = document.getElementById('node-symbol');
        if (symbolEl) {
            symbolEl.innerText = symbol;
            symbolEl.style.borderColor = colors[node._type] || '#61dafb';
        }
        
        document.getElementById('node-label').innerText = node.label;
        
        // Type (in meta card now, no background)
        const typeEl = document.getElementById('node-type');
        if (typeEl) typeEl.innerText = node._type;
        
        // Interview frequency
        const interviewEl = document.getElementById('node-interview');
        if (interviewEl) {
            const freq = nodeData?.interviewFrequency || 'Medium';
            const freqIcon = freq === 'High' ? '🔥' : freq === 'Medium' ? '⚡' : '💡';
            interviewEl.innerHTML = `${freqIcon} ${freq}`;
        }
        
        // Learn More button
        const learnBtn = document.getElementById('learn-btn');
        if (learnBtn) {
            const hasContent = nodeData?.content != null;
            learnBtn.href = `topic.html?id=${nodeId}`;
            learnBtn.style.display = 'flex';
            if (hasContent) {
                learnBtn.innerHTML = '<span>📚 Deep Dive</span><span class="arrow">→</span>';
                learnBtn.classList.remove('no-content');
            } else {
                learnBtn.innerHTML = '<span>📚 Coming Soon</span>';
                learnBtn.classList.add('no-content');
            }
        }
        
        // Category (now simple text)
        const catEl = document.getElementById('node-category');
        if (catEl) {
            const cat = nodeData?.category || 'Other';
            catEl.innerText = cat;
        }
        
        // Difficulty and time
        const diffEl = document.getElementById('node-difficulty');
        const timeEl = document.getElementById('node-time');
        if (diffEl) diffEl.innerHTML = renderDifficulty(nodeData?.difficulty || 5);
        if (timeEl) timeEl.innerText = nodeData?.timeEstimate || '~3h';
        
        renderStats(nodeId);
        renderCompanies(nodeId);
        renderQuestions(nodeId);
        renderUsedBy(nodeId);
        renderRelatedTopics(nodeId);
        
        // Quiz button - show if selfCheck questions exist
        const quizBtn = document.getElementById('quiz-btn');
        if (quizBtn) {
            const hasSelfCheck = nodeData?.content?.selfCheck?.length > 0;
            quizBtn.style.display = hasSelfCheck ? 'block' : 'none';
        }
        
        // Reset tabs to Overview
        setActivePanelTab('overview');
        
        infoPanel.classList.add('open');
        focusPanelCloseButton();
        
        // Use lineage tracing on click
        if (lineageMode) {
            spotlightLineage(nodeId);
        } else {
            spotlight(nodeId);
        }
    } else {
        closePanel();
        resetView();
    }
});

network.on('hoverNode', function (params) {
    spotlight(params.node);
});

network.on('blurNode', function () {
    resetView();
});

network.once('stabilizationIterationsDone', function () {
    network.fit({ animation: { duration: 500, easingFunction: 'easeInOutQuad' } });
    setPhysics(false); // Freeze after stabilization for clarity
});

// -------- Toolbar Wiring --------
document.getElementById('focus-root')?.addEventListener('click', focusRoot);
document.getElementById('toggle-physics')?.addEventListener('click', () => setPhysics(!physicsEnabled));
document.getElementById('toggle-edge-labels')?.addEventListener('click', () => setEdgeLabels(!edgeLabelsVisible));
document.getElementById('toggle-lineage')?.addEventListener('click', () => {
    lineageMode = !lineageMode;
    const btn = document.getElementById('toggle-lineage');
    if (btn) btn.textContent = `🔗 Lineage: ${lineageMode ? 'on' : 'off'}`;
    resetView();
});

// -------- Stats Display --------
const statsEl = document.getElementById('stats');
if (statsEl) {
    statsEl.textContent = `${graphData.nodes.length} nodes · ${graphData.edges.length} edges`;
}

// -------- Legend --------
function buildLegend() {
    const legendEl = document.getElementById('legend');
    if (!legendEl) return;
    
    // Count nodes by type
    const typeCounts = {};
    graphData.nodes.forEach(n => {
        typeCounts[n.type] = (typeCounts[n.type] || 0) + 1;
    });
    
    // Friendly names for types
    const typeNames = {
        'root': 'Root',
        'primitive': 'Primitives',
        'concept': 'Concepts',
        'ds-linear': 'Linear DS',
        'ds-abstract': 'Abstract DS',
        'ds-hybrid': 'Hybrid DS',
        'ds-hierarchical': 'Trees',
        'ds-complex': 'Complex DS',
        'ds-specialized': 'Specialized DS',
        'ds-probabilistic': 'Probabilistic DS',
        'ds-modern': 'Modern/Vector DS',
        'ds-distributed': 'Distributed DS',
        'algo': 'Algorithms',
        'algo-sorting': 'Sorting',
        'algo-traversal': 'Traversal',
        'algo-pattern': 'Patterns',
        'algo-graph': 'Graph Algos',
        'algo-dp': 'Dynamic Programming',
        'algo-math': 'Math/Number Theory',
        'algo-geometry': 'Geometry',
        'algo-game': 'Game Theory'
    };
    
    let html = '<h4>Legend</h4>';
    
    // Sort by count descending
    const sortedTypes = Object.entries(typeCounts)
        .sort((a, b) => b[1] - a[1]);
    
    for (const [type, count] of sortedTypes) {
        const color = colors[type] || '#888';
        const name = typeNames[type] || type;
        html += `
            <div class="legend-item" data-type="${type}">
                <span class="legend-dot" style="background: ${color}; box-shadow: 0 0 6px ${color};"></span>
                <span class="legend-label">${name}</span>
                <span class="legend-count">${count}</span>
            </div>
        `;
    }
    
    legendEl.innerHTML = html;
    
    // Click on legend item to filter/highlight that type
    legendEl.querySelectorAll('.legend-item').forEach(item => {
        item.addEventListener('click', () => {
            const type = item.dataset.type;
            highlightByType(type);
        });
    });
}

function highlightByType(type) {
    const matchingNodes = new Set();
    graphData.nodes.forEach(n => {
        if (n.type === type) matchingNodes.add(n.id);
    });
    
    // Dim non-matching nodes
    const nodeUpdates = [];
    nodes.forEach(n => {
        const isMatch = matchingNodes.has(n.id);
        const baseColor = colors[n._type] || '#888';
        nodeUpdates.push({
            id: n.id,
            color: isMatch
                ? { background: baseColor, border: baseColor }
                : { background: '#222', border: '#333' },
            shadow: isMatch ? { enabled: true, color: baseColor, size: 20 } : { enabled: false },
            font: isMatch ? { color: '#fff', strokeWidth: 2, strokeColor: '#111' } : { color: '#444', strokeWidth: 0 }
        });
    });
    nodes.update(nodeUpdates);
    
    // Dim all edges
    const edgeUpdates = [];
    edges.forEach(e => {
        edgeUpdates.push({
            id: e.id,
            color: { color: 'rgba(255,255,255,0.05)' },
            width: 1
        });
    });
    edges.update(edgeUpdates);
}

buildLegend();

// -------- Search --------
const searchInput = document.getElementById('search-input');
const searchResults = document.getElementById('search-results');

function performSearch(query) {
    if (!query || query.length < 1) {
        searchResults.classList.remove('active');
        return;
    }
    
    const lowerQuery = query.toLowerCase();
    const matches = graphData.nodes
        .filter(n => n.label.toLowerCase().includes(lowerQuery) || n.id.toLowerCase().includes(lowerQuery))
        .slice(0, 15); // Limit results
    
    if (matches.length === 0) {
        searchResults.innerHTML = '<div class="search-result-item" style="color:#888;">No matches found</div>';
        searchResults.classList.add('active');
        return;
    }
    
    searchResults.innerHTML = matches.map(n => {
        const color = colors[n.type] || '#888';
        return `
            <div class="search-result-item" data-node-id="${n.id}">
                <span class="search-result-dot" style="background: ${color};"></span>
                <span class="search-result-label">${n.label}</span>
                <span class="search-result-type">${n.type}</span>
            </div>
        `;
    }).join('');
    
    searchResults.classList.add('active');
    
    // Click handler for results
    searchResults.querySelectorAll('.search-result-item[data-node-id]').forEach(item => {
        item.addEventListener('click', () => {
            const nodeId = item.dataset.nodeId;
            selectNode(nodeId);
            searchResults.classList.remove('active');
            searchInput.value = '';
            searchInput.blur();
        });
    });
}

function selectNode(nodeId) {
    rememberPanelReturnFocus();
    network.selectNodes([nodeId]);
    network.focus(nodeId, { scale: 1.2, animation: { duration: 400, easingFunction: 'easeInOutQuad' } });
    
    // Track current node
    currentNodeId = nodeId;
    window.currentNodeId = nodeId;
    
    // Trigger the click logic
    const node = nodes.get(nodeId);
    const nodeData = graphData.nodes.find(n => n.id === nodeId);
    
    const infoPanel = document.getElementById('info-panel');
    
    // Generate symbol from label
    const symbol = generateSymbol(node.label);
    const symbolEl = document.getElementById('node-symbol');
    if (symbolEl) {
        symbolEl.innerText = symbol;
        symbolEl.style.borderColor = colors[node._type] || '#61dafb';
    }
    
    document.getElementById('node-label').innerText = node.label;
    
    // Type (in meta card now, no background)
    const typeEl = document.getElementById('node-type');
    if (typeEl) typeEl.innerText = node._type;
    
    // Interview frequency
    const interviewEl = document.getElementById('node-interview');
    if (interviewEl) {
        const freq = nodeData?.interviewFrequency || 'Medium';
        const freqIcon = freq === 'High' ? '🔥' : freq === 'Medium' ? '⚡' : '💡';
        interviewEl.innerHTML = `${freqIcon} ${freq}`;
    }
    
    // Learn More button
    const learnBtn = document.getElementById('learn-btn');
    if (learnBtn) {
        const hasContent = nodeData?.content != null;
        learnBtn.href = `topic.html?id=${nodeId}`;
        learnBtn.style.display = 'flex';
        if (hasContent) {
            learnBtn.innerHTML = '<span>📚 Deep Dive</span><span class="arrow">→</span>';
            learnBtn.classList.remove('no-content');
        } else {
            learnBtn.innerHTML = '<span>📚 Coming Soon</span>';
            learnBtn.classList.add('no-content');
        }
    }
    
    // Category (now simple text)
    const catEl = document.getElementById('node-category');
    if (catEl) {
        const cat = nodeData?.category || 'Other';
        catEl.innerText = cat;
    }
    
    // Difficulty and time
    const diffEl = document.getElementById('node-difficulty');
    const timeEl = document.getElementById('node-time');
    if (diffEl) diffEl.innerHTML = renderDifficulty(nodeData?.difficulty || 5);
    if (timeEl) timeEl.innerText = nodeData?.timeEstimate || '~3h';
    
    renderStats(nodeId);
    renderCompanies(nodeId);
    renderQuestions(nodeId);
    renderUsedBy(nodeId);
    renderRelatedTopics(nodeId);
    
    // Quiz button
    const quizBtn = document.getElementById('quiz-btn');
    if (quizBtn) {
        const hasSelfCheck = nodeData?.content?.selfCheck?.length > 0;
        quizBtn.style.display = hasSelfCheck ? 'block' : 'none';
    }
    
    // Reset tabs to Overview
    setActivePanelTab('overview');
    
    infoPanel.classList.add('open');
    focusPanelCloseButton();
    
    if (lineageMode) {
        spotlightLineage(nodeId);
    } else {
        spotlight(nodeId);
    }
}

searchInput?.addEventListener('input', (e) => performSearch(e.target.value));
searchInput?.addEventListener('focus', () => {
    if (searchInput.value.length > 0) {
        performSearch(searchInput.value);
    }
});

// Close search results when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('#search-container')) {
        searchResults?.classList.remove('active');
    }
});

// -------- Keyboard Shortcuts --------
document.addEventListener('keydown', (e) => {
    // Don't trigger shortcuts if typing in search
    if (document.activeElement === searchInput && e.key !== 'Escape') {
        // Handle Enter in search
        if (e.key === 'Enter') {
            const firstResult = searchResults.querySelector('.search-result-item[data-node-id]');
            if (firstResult) {
                selectNode(firstResult.dataset.nodeId);
                searchResults.classList.remove('active');
                searchInput.value = '';
                searchInput.blur();
            }
        }
        return;
    }
    
    switch (e.key) {
        case '/':
            e.preventDefault();
            searchInput?.focus();
            break;
        case 'Escape':
            searchInput?.blur();
            searchResults?.classList.remove('active');
            searchInput.value = '';
            resetView();
            closePanel();
            network.unselectAll();
            break;
        case 'h':
        case 'H':
            focusRoot();
            break;
        case 'p':
        case 'P':
            setPhysics(!physicsEnabled);
            break;
        case 'l':
        case 'L':
            setEdgeLabels(!edgeLabelsVisible);
            break;
    }
});

// -------- Export to PNG --------
document.getElementById('export-png')?.addEventListener('click', () => {
    // Get canvas from vis-network
    const canvas = document.querySelector('#mynetwork canvas');
    if (!canvas) {
        alert('Canvas not found');
        return;
    }
    
    // Create a temporary canvas with white background for better visibility
    const tempCanvas = document.createElement('canvas');
    const ctx = tempCanvas.getContext('2d');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    
    // Dark background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    
    // Draw the network canvas on top
    ctx.drawImage(canvas, 0, 0);
    
    // Create download link
    const link = document.createElement('a');
    link.download = `dsa-concept-graph-${new Date().toISOString().slice(0, 10)}.png`;
    link.href = tempCanvas.toDataURL('image/png');
    link.click();
});

// Initial state
setPhysics(true);
setEdgeLabels(false);

// ======== MINI-MAP ========
const minimapCanvas = document.getElementById('minimap-canvas');
const minimapViewport = document.getElementById('minimap-viewport');
const minimapEl = document.getElementById('minimap');
const minimapContainerEl = document.getElementById('minimap-container');

let minimapVisible = true;

function toggleMinimap() {
    minimapVisible = !minimapVisible;
    minimapContainerEl?.classList.toggle('collapsed', !minimapVisible);
    const toggleText = document.getElementById('minimap-toggle-text');
    if (toggleText) {
        toggleText.textContent = minimapVisible ? 'Hide map' : 'Show map';
    }
    if (minimapVisible) {
        setTimeout(updateMinimap, 100);
    }
}

function updateMinimap() {
    if (!minimapCanvas || !network || !minimapVisible) return;
    
    const ctx = minimapCanvas.getContext('2d');
    const rect = minimapEl.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    
    // Set canvas size to match CSS size (important for crisp rendering)
    const width = 160;
    const height = 100;
    minimapCanvas.width = width;
    minimapCanvas.height = height;
    
    // Clear
    ctx.fillStyle = 'rgba(20, 25, 35, 1)';
    ctx.fillRect(0, 0, width, height);
    
    // Get network bounds
    const positions = network.getPositions();
    const nodeIds = Object.keys(positions);
    if (nodeIds.length === 0) return;
    
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    nodeIds.forEach(id => {
        const pos = positions[id];
        minX = Math.min(minX, pos.x);
        maxX = Math.max(maxX, pos.x);
        minY = Math.min(minY, pos.y);
        maxY = Math.max(maxY, pos.y);
    });
    
    const padding = 50;
    minX -= padding; maxX += padding; minY -= padding; maxY += padding;
    
    const graphWidth = maxX - minX;
    const graphHeight = maxY - minY;
    const scaleX = minimapCanvas.width / graphWidth;
    const scaleY = minimapCanvas.height / graphHeight;
    const scale = Math.min(scaleX, scaleY);
    
    // Calculate offsets to center the graph in the minimap
    const scaledWidth = graphWidth * scale;
    const scaledHeight = graphHeight * scale;
    const offsetX = (minimapCanvas.width - scaledWidth) / 2;
    const offsetY = (minimapCanvas.height - scaledHeight) / 2;
    
    // Draw edges
    ctx.strokeStyle = 'rgba(97, 218, 251, 0.15)';
    ctx.lineWidth = 0.5;
    graphData.edges.forEach(edge => {
        const from = positions[edge.from];
        const to = positions[edge.to];
        if (from && to) {
            ctx.beginPath();
            ctx.moveTo((from.x - minX) * scale + offsetX, (from.y - minY) * scale + offsetY);
            ctx.lineTo((to.x - minX) * scale + offsetX, (to.y - minY) * scale + offsetY);
            ctx.stroke();
        }
    });
    
    // Draw nodes
    nodeIds.forEach(id => {
        const pos = positions[id];
        const node = nodes.get(id);
        const x = (pos.x - minX) * scale + offsetX;
        const y = (pos.y - minY) * scale + offsetY;
        
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fillStyle = colors[node?._type] || '#61dafb';
        ctx.fill();
    });
    
    // Draw viewport indicator
    const view = network.getViewPosition();
    const zoomScale = network.getScale();
    const networkCanvas = document.getElementById('mynetwork');
    const viewWidth = networkCanvas.clientWidth / zoomScale;
    const viewHeight = networkCanvas.clientHeight / zoomScale;
    
    // Calculate viewport position in minimap coordinates (with centering offsets)
    let vpX = (view.x - viewWidth/2 - minX) * scale + offsetX;
    let vpY = (view.y - viewHeight/2 - minY) * scale + offsetY;
    let vpW = viewWidth * scale;
    let vpH = viewHeight * scale;
    
    // Clamp to minimap bounds
    vpX = Math.max(0, Math.min(vpX, minimapCanvas.width - 4));
    vpY = Math.max(0, Math.min(vpY, minimapCanvas.height - 4));
    vpW = Math.max(10, Math.min(vpW, minimapCanvas.width - vpX));
    vpH = Math.max(10, Math.min(vpH, minimapCanvas.height - vpY));
    
    minimapViewport.style.left = vpX + 'px';
    minimapViewport.style.top = vpY + 'px';
    minimapViewport.style.width = vpW + 'px';
    minimapViewport.style.height = vpH + 'px';
}

// Click on minimap to navigate
minimapEl?.addEventListener('click', (e) => {
    const rect = minimapEl.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Get network bounds
    const positions = network.getPositions();
    const nodeIds = Object.keys(positions);
    if (nodeIds.length === 0) return;
    
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    nodeIds.forEach(id => {
        const pos = positions[id];
        minX = Math.min(minX, pos.x);
        maxX = Math.max(maxX, pos.x);
        minY = Math.min(minY, pos.y);
        maxY = Math.max(maxY, pos.y);
    });
    
    const padding = 50;
    minX -= padding; maxX += padding; minY -= padding; maxY += padding;
    
    const graphWidth = maxX - minX;
    const graphHeight = maxY - minY;
    const scaleX = minimapCanvas.width / graphWidth;
    const scaleY = minimapCanvas.height / graphHeight;
    const scale = Math.min(scaleX, scaleY);
    
    // Calculate centering offsets
    const scaledWidth = graphWidth * scale;
    const scaledHeight = graphHeight * scale;
    const offsetX = (minimapCanvas.width - scaledWidth) / 2;
    const offsetY = (minimapCanvas.height - scaledHeight) / 2;
    
    const targetX = (x - offsetX) / scale + minX;
    const targetY = (y - offsetY) / scale + minY;
    
    network.moveTo({
        position: { x: targetX, y: targetY },
        animation: { duration: 300, easingFunction: 'easeInOutQuad' }
    });
});

// Store minimap bounds for reuse
let minimapBounds = { minX: 0, maxX: 0, minY: 0, maxY: 0, scale: 1, offsetX: 0, offsetY: 0 };

function getMinimapBounds() {
    const positions = network.getPositions();
    const nodeIds = Object.keys(positions);
    if (nodeIds.length === 0) return null;
    
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    nodeIds.forEach(id => {
        const pos = positions[id];
        minX = Math.min(minX, pos.x);
        maxX = Math.max(maxX, pos.x);
        minY = Math.min(minY, pos.y);
        maxY = Math.max(maxY, pos.y);
    });
    
    const padding = 50;
    minX -= padding; maxX += padding; minY -= padding; maxY += padding;
    
    const graphWidth = maxX - minX;
    const graphHeight = maxY - minY;
    const scaleX = 160 / graphWidth;
    const scaleY = 100 / graphHeight;
    const scale = Math.min(scaleX, scaleY);
    
    // Calculate centering offsets
    const scaledWidth = graphWidth * scale;
    const scaledHeight = graphHeight * scale;
    const offsetX = (160 - scaledWidth) / 2;
    const offsetY = (100 - scaledHeight) / 2;
    
    minimapBounds = { minX, maxX, minY, maxY, scale, offsetX, offsetY };
    return minimapBounds;
}

// Drag on minimap to pan
let isDraggingMinimap = false;

minimapEl?.addEventListener('mousedown', (e) => {
    isDraggingMinimap = true;
    e.preventDefault();
});

document.addEventListener('mousemove', (e) => {
    if (!isDraggingMinimap || !minimapEl) return;
    
    const rect = minimapEl.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const bounds = getMinimapBounds();
    if (!bounds) return;
    
    const targetX = (x - bounds.offsetX) / bounds.scale + bounds.minX;
    const targetY = (y - bounds.offsetY) / bounds.scale + bounds.minY;
    
    network.moveTo({
        position: { x: targetX, y: targetY }
    });
    
    updateMinimap();
});

document.addEventListener('mouseup', () => {
    isDraggingMinimap = false;
});

// Scroll on minimap to zoom
minimapEl?.addEventListener('wheel', (e) => {
    e.preventDefault();
    const currentScale = network.getScale();
    const delta = e.deltaY > 0 ? 0.85 : 1.18; // Zoom out / in
    const newScale = Math.max(0.1, Math.min(3, currentScale * delta));
    
    network.moveTo({
        scale: newScale,
        animation: { duration: 150, easingFunction: 'easeOutQuad' }
    });
    
    setTimeout(updateMinimap, 160);
}, { passive: false });

// Update minimap on view changes
network.on('zoom', () => setTimeout(updateMinimap, 50));
network.on('dragEnd', () => setTimeout(updateMinimap, 50));
network.on('dragStart', () => {}); // Keep listening
setTimeout(updateMinimap, 1000);

// ======== LEARNING PATH ========
const learningPath = [
    { id: 'big-o', name: 'Big O Notation', category: 'Foundation' },
    { id: 'memory', name: 'Memory Model', category: 'Foundation' },
    { id: 'array', name: 'Arrays', category: 'Linear DS' },
    { id: 'linked-list', name: 'Linked Lists', category: 'Linear DS' },
    { id: 'stack', name: 'Stacks', category: 'Abstract DS' },
    { id: 'queue', name: 'Queues', category: 'Abstract DS' },
    { id: 'hash-map', name: 'Hash Maps', category: 'Associative DS' },
    { id: 'hash-set', name: 'Hash Sets', category: 'Associative DS' },
    { id: 'tree', name: 'Trees', category: 'Hierarchical DS' },
    { id: 'bst', name: 'Binary Search Tree', category: 'Hierarchical DS' },
    { id: 'heap', name: 'Heaps', category: 'Hierarchical DS' },
    { id: 'graph', name: 'Graphs', category: 'Complex DS' },
    { id: 'two-pointers', name: 'Two Pointers', category: 'Patterns' },
    { id: 'sliding-window', name: 'Sliding Window', category: 'Patterns' },
    { id: 'binary-search', name: 'Binary Search', category: 'Algorithms' },
    { id: 'recursion', name: 'Recursion', category: 'Algorithms' },
    { id: 'dfs', name: 'DFS', category: 'Graph Algorithms' },
    { id: 'bfs', name: 'BFS', category: 'Graph Algorithms' },
    { id: 'backtracking', name: 'Backtracking', category: 'Algorithms' },
    { id: 'dynamic-programming', name: 'Dynamic Programming', category: 'Advanced' },
    { id: 'greedy', name: 'Greedy Algorithms', category: 'Advanced' },
    { id: 'trie', name: 'Tries', category: 'Advanced DS' },
    { id: 'dijkstra', name: "Dijkstra's Algorithm", category: 'Graph Algorithms' },
    { id: 'topological-sort', name: 'Topological Sort', category: 'Graph Algorithms' },
];

let lpCurrentIndex = 0;

function toggleLearningPath() {
    const panel = document.getElementById('learning-path');
    panel.classList.toggle('active');
    if (panel.classList.contains('active')) {
        renderLearningPath();
    }
}

function renderLearningPath() {
    const content = document.getElementById('lp-content');
    if (!content) return;
    
    let html = '';
    learningPath.forEach((step, idx) => {
        const isCurrent = idx === lpCurrentIndex;
        const isCompleted = idx < lpCurrentIndex;
        const node = graphData.nodes.find(n => n.id === step.id);
        const time = node?.timeEstimate || '~1h';
        
        html += `<div class="lp-step ${isCurrent ? 'current' : ''} ${isCompleted ? 'completed' : ''}" 
                      onclick="lpGoTo(${idx})">
            <div class="lp-step-num">${isCompleted ? '✓' : idx + 1}</div>
            <div class="lp-step-info">
                <div class="lp-step-name">${step.name}</div>
                <div class="lp-step-meta">${step.category} · ${time}</div>
            </div>
        </div>`;
    });
    
    content.innerHTML = html;
    updateLpNav();
}

function lpGoTo(index) {
    if (index < 0 || index >= learningPath.length) return;
    lpCurrentIndex = index;
    renderLearningPath();
    
    // Navigate to node
    const nodeId = learningPath[index].id;
    selectNode(nodeId);
}

function lpNavigate(direction) {
    lpGoTo(lpCurrentIndex + direction);
}

function updateLpNav() {
    const prev = document.getElementById('lp-prev');
    const next = document.getElementById('lp-next');
    if (prev) prev.disabled = lpCurrentIndex <= 0;
    if (next) next.disabled = lpCurrentIndex >= learningPath.length - 1;
}

// Toolbar button
document.getElementById('toggle-learning-path')?.addEventListener('click', toggleLearningPath);

// Keyboard shortcut
document.addEventListener('keydown', (e) => {
    if (document.activeElement.tagName === 'INPUT') return;
    if (e.key === 'l' || e.key === 'L') {
        if (!e.ctrlKey && !e.metaKey) {
            // Only if not already used for edge labels
            // Let's use Shift+L for learning path
        }
    }
});

// ======== QUIZ FEATURE ========
let currentQuizNodeId = null;

function openQuiz(nodeId) {
    const nodeData = graphData.nodes.find(n => n.id === nodeId);
    const selfCheck = nodeData?.content?.selfCheck || [];
    
    if (selfCheck.length === 0) {
        alert('No self-check questions available for this topic yet.');
        return;
    }
    
    currentQuizNodeId = nodeId;
    const modal = document.getElementById('quiz-modal');
    const title = document.getElementById('quiz-title');
    const body = document.getElementById('quiz-body');
    const score = document.getElementById('quiz-score');
    
    title.textContent = `🧠 ${nodeData.name} - Self Check`;
    
    let html = '';
    selfCheck.forEach((q, idx) => {
        html += `<div class="quiz-question">
            <div class="quiz-q-num">Question ${idx + 1} of ${selfCheck.length}</div>
            <div class="quiz-q-text">${q}</div>
            <button class="quiz-reveal-btn" onclick="revealAnswer(this)">Think about it... then reveal</button>
            <div class="quiz-answer" id="quiz-answer-${idx}">
                <em>✨ You should be able to explain this concept clearly. If not, review the topic!</em>
            </div>
        </div>`;
    });
    
    body.innerHTML = html;
    score.textContent = `${selfCheck.length} questions · Review your understanding`;
    modal.classList.add('active');
}

function revealAnswer(btn) {
    const answer = btn.nextElementSibling;
    answer.classList.add('revealed');
    btn.textContent = 'Answer revealed ✓';
    btn.disabled = true;
    btn.style.opacity = '0.5';
}

function closeQuiz() {
    document.getElementById('quiz-modal').classList.remove('active');
}

// Close quiz on escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeQuiz();
    }
});

// Close quiz on backdrop click
document.getElementById('quiz-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'quiz-modal') {
        closeQuiz();
    }
});

// Expose functions globally
window.toggleLearningPath = toggleLearningPath;
window.lpNavigate = lpNavigate;
window.lpGoTo = lpGoTo;
window.openQuiz = openQuiz;
window.revealAnswer = revealAnswer;
window.closeQuiz = closeQuiz;
window.toggleMinimap = toggleMinimap;

// ============================================================
// Panel Tab Switching - now handled by unified sidebar.js component

// Render related topics for the Related tab
function renderRelatedTopics(nodeId) {
    const container = document.getElementById('node-related');
    if (!container) return;
    
    const nodeData = graphData.nodes.find(n => n.id === nodeId);
    const related = nodeData?.related || nodeData?.prerequisites || [];
    
    // Also get children from edge data
    const children = (childMap[nodeId] || []).slice(0, 6);
    
    if (related.length === 0 && children.length === 0) {
        container.innerHTML = '';
        return;
    }
    
    let html = '<h4 style="font-size: 0.75rem; color: #888; margin-bottom: 8px; text-transform: uppercase;">Related Topics</h4>';
    html += '<div class="related-topics">';
    
    // Add related from node data
    related.slice(0, 5).forEach(rel => {
        const relNode = graphData.nodes.find(n => n.id === rel || n.label.toLowerCase() === rel.toLowerCase());
        if (relNode) {
            html += `<span class="related-tag" data-node-id="${relNode.id}">${relNode.label}</span>`;
        }
    });
    
    // Add children (what this leads to)
    children.forEach(({ child }) => {
        const childNode = graphData.nodes.find(n => n.id === child);
        if (childNode) {
            html += `<span class="related-tag" data-node-id="${child}">→ ${childNode.label}</span>`;
        }
    });
    
    html += '</div>';
    container.innerHTML = html;
    
    // Add click handlers
    container.querySelectorAll('.related-tag[data-node-id]').forEach(tag => {
        tag.addEventListener('click', () => {
            selectNode(tag.dataset.nodeId);
        });
    });
}

// ============================================================
// Company Filter via URL Params
// ============================================================
let activeCompanyFilter = null;

function getCompanyNodesSet(company) {
    // Returns Set of node IDs that have this company in their companies array
    const nodeIds = new Set();
    graphData.nodes.forEach(n => {
        const companies = (n.companies || []).map(c => c.toLowerCase());
        if (companies.includes(company.toLowerCase())) {
            nodeIds.add(n.id);
        }
    });
    return nodeIds;
}

function applyCompanyFilter(company) {
    if (!company) return;
    
    activeCompanyFilter = company;
    const companyNodes = getCompanyNodesSet(company);
    
    if (companyNodes.size === 0) {
        console.warn(`No nodes found for company: ${company}`);
        return;
    }
    
    // Highlight nodes from this company, dim others
    const nodeUpdates = graphData.nodes.map(n => {
        const baseColor = colors[n.type] || '#888';
        const isMatch = companyNodes.has(n.id);
        
        return {
            id: n.id,
            color: isMatch
                ? { background: baseColor, border: baseColor, highlight: { background: '#fff', border: baseColor }, hover: { background: '#fff', border: baseColor } }
                : { background: '#222', border: '#333', highlight: { background: '#444', border: '#555' }, hover: { background: '#444', border: '#555' } },
            shadow: isMatch
                ? { enabled: true, color: baseColor, size: 18, x: 0, y: 0 }
                : { enabled: false },
            font: isMatch
                ? { color: '#eeeeee', strokeWidth: 2, strokeColor: '#111' }
                : { color: '#444', strokeWidth: 0 },
            borderWidth: isMatch ? 3 : 1
        };
    });
    nodes.update(nodeUpdates);
    
    // Dim edges that don't connect company nodes
    const edgeUpdates = [];
    edges.forEach(e => {
        const fromMatch = companyNodes.has(e.from);
        const toMatch = companyNodes.has(e.to);
        const isRelevant = fromMatch || toMatch;
        
        edgeUpdates.push({
            id: e.id,
            color: isRelevant
                ? { color: 'rgba(255,255,255,0.3)', highlight: '#fff', hover: '#fff' }
                : { color: 'rgba(255,255,255,0.03)', highlight: '#666', hover: '#666' },
            width: isRelevant ? 2 : 1
        });
    });
    edges.update(edgeUpdates);
    
    // Update stats display and show filter banner
    const statsEl = document.getElementById('stats');
    if (statsEl) {
        statsEl.textContent = `${companyNodes.size} ${company} topics · ${graphData.nodes.length} total`;
    }
    
    showCompanyFilterBanner(company, companyNodes.size);
}

function showCompanyFilterBanner(company, count) {
    // Remove existing banner if any
    const existing = document.getElementById('company-filter-banner');
    if (existing) existing.remove();
    
    const banner = document.createElement('div');
    banner.id = 'company-filter-banner';
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
        <span>🏢 ${company} Topics: ${count} highlighted</span>
        <button id="clear-company-filter-btn" style="
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
    
    document.getElementById('clear-company-filter-btn').addEventListener('click', () => {
        clearCompanyFilter();
        banner.remove();
        // Clear URL param
        window.history.replaceState({}, '', window.location.pathname);
    });
}

function clearCompanyFilter() {
    activeCompanyFilter = null;
    resetView();
    const statsEl = document.getElementById('stats');
    if (statsEl) {
        statsEl.textContent = `${graphData.nodes.length} nodes · ${graphData.edges.length} edges`;
    }
}

// Apply URL params on load
(function applyUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const company = params.get('company');
    if (company) {
        // Wait for stabilization before applying filter for better visual
        network.once('stabilizationIterationsDone', () => {
            setTimeout(() => applyCompanyFilter(company), 300);
        });
    }
})();