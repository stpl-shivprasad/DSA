// ============================================================
// DSA Periodic Table 2.0 - Functional Classification System
// ============================================================
// Inspired by the AI Periodic Table concept:
// - Columns = Functional groups (what it DOES)
// - Rows = Maturity levels (complexity/learning order)
// - Reactions = How elements combine to solve problems
// ============================================================

const PERIODIC_CONFIG = {
    // ========================================
    // COLUMNS: Functional Groups
    // ========================================
    columns: {
        'Foundation': {
            order: 1,
            color: '#64748b',
            icon: '🏛️',
            description: 'Building blocks you must understand first',
            keywords: ['computer memory', 'bits & bytes', 'big-o', 'amortized', 'complexity', 'binary number', 'function', 'pointer', 'reference'],
            ids: ['memory', 'bits', 'bigo', 'binarynumbers', 'functions', 'closure', 'pointers', 'references', 'amortized']
        },
        'Storage': {
            order: 2,
            color: '#3b82f6',
            icon: '📦',
            description: 'Linear data containers - where things live',
            keywords: ['linked list', 'matrix', 'vector', 'circular', 'buffer', 'rope', 'difference array', 'suffix array'],
            ids: ['array', 'string', 'll', 'dll', 'matrix', 'dynamicarray', 'circulararray', 'circularbuffer', 'differencearray', 'suffixarray', 'rope']
        },
        'Order': {
            order: 3,
            color: '#06b6d4',
            icon: '📊',
            description: 'LIFO/FIFO/Priority - control access order',
            keywords: ['stack', 'queue', 'priority', 'monotonic', 'lru', 'lfu', 'deque'],
            ids: ['stack', 'queue', 'deque', 'priorityqueue', 'minheap', 'maxheap', 'lru', 'lfu', 'monotonicstack', 'monotonicqueue']
        },
        'Hashing': {
            order: 4,
            color: '#f59e0b',
            icon: '🔑',
            description: 'O(1) lookup by key',
            keywords: ['hash', 'bloom', 'cuckoo', 'consistent', 'geohash'],
            ids: ['hashmap', 'hashing', 'hashset', 'hashtable', 'bloomfilter', 'hashfunction']
        },
        'Trees': {
            order: 5,
            color: '#10b981',
            icon: '🌲',
            description: 'Hierarchical access - O(log n) operations',
            keywords: ['tree', 'bst', 'avl', 'trie', 'btree', 'segment', 'fenwick', 'red-black', 'splay', 'treap', 'heap'],
            ids: ['binarytree', 'bst', 'avl', 'rbtree', 'trie', 'segmenttree', 'fenwick', 'btree', 'heap', 'tree', 'ntree', 'quadtree', 'octree']
        },
        'Graphs': {
            order: 6,
            color: '#8b5cf6',
            icon: '🔗',
            description: 'Networks and connectivity',
            keywords: ['spanning', 'dijkstra', 'bellman', 'floyd', 'kruskal', 'prim', 'topolog', 'scc', 'articulation', 'bridge', 'union-find', 'bipartite', 'eulerian', 'hamiltonian', 'tarjan', 'kosaraju', 'shortest path', 'max flow', 'minimum cut', 'ford-fulkerson', 'edmonds', 'dinic'],
            ids: ['graph', 'adjacency', 'dfs', 'bfs', 'unionfind', 'mst', 'shortestpath', 'dijkstra', 'bellmanford', 'floydwarshall', 'topologicalsort', 'maxflow', 'mincut']
        },
        'Patterns': {
            order: 7,
            color: '#14b8a6',
            icon: '🎯',
            description: 'Problem-solving techniques',
            keywords: ['two pointer', 'sliding window', 'prefix sum', 'backtrack', 'greedy', 'divide', 'recursion', 'meet in the middle', 'coordinate compression', 'fast slow'],
            ids: ['twopointer', 'twopointers', 'slidingwindow', 'prefixsum', 'backtracking', 'greedy', 'divideconquer', 'binarysearch', 'recursion', 'fastslow']
        },
        'DP': {
            order: 8,
            color: '#ec4899',
            icon: '🧠',
            description: 'Optimal substructure - memoization & tabulation',
            keywords: ['dynamic programming', 'memoization', 'knapsack', 'subsequence', 'bitmask dp', 'interval dp', 'digit dp', 'tree dp', 'probability dp', 'matrix chain', 'coin change', 'edit distance', 'optimal substructure'],
            ids: ['dp', 'knapsack', 'lcs', 'lis', 'editdistance', 'coindp', 'dynamicprogramming', 'memoization']
        },
        'Sorting': {
            order: 9,
            color: '#84cc16',
            icon: '⚙️',
            description: 'Order transformation algorithms',
            keywords: ['merge sort', 'quick sort', 'radix sort', 'counting sort', 'bucket sort', 'tim sort', 'shell sort', 'insertion sort', 'selection sort', 'bubble sort', 'heap sort', 'sorting algorithm'],
            ids: ['quicksort', 'mergesort', 'heapsort', 'insertionsort', 'selectionsort', 'bubblesort', 'radixsort', 'countingsort', 'bucketsort', 'timsort', 'shellsort', 'sorting']
        },
        'Strings': {
            order: 10,
            color: '#6366f1',
            icon: '📝',
            description: 'Text processing and pattern matching',
            keywords: ['rabin-karp', 'kmp', 'z-algorithm', 'aho-corasick', 'suffix', 'manacher', 'boyer-moore', 'rolling hash', 'palindrome'],
            ids: ['rabinkarp', 'kmp', 'zalgorithm', 'ahocorasick', 'suffixarray', 'suffixautomaton', 'boyermoore', 'manacher']
        },
        'Math': {
            order: 11,
            color: '#f97316',
            icon: '🔢',
            description: 'Number theory, combinatorics, geometry',
            keywords: ['math', 'prime', 'gcd', 'modular', 'combinatorics', 'geometry', 'convex', 'line sweep', 'euler', 'fermat', 'chinese remainder', 'fft'],
            ids: ['gcd', 'sieve', 'modular', 'factorial', 'nck', 'catalan']
        },
        'Advanced': {
            order: 12,
            color: '#ef4444',
            icon: '🚀',
            description: 'Specialized, distributed, and competition-level',
            keywords: ['persistent', 'crdt', 'wal', 'sstable', 'inverted index', 'time series', 'dancing links', 'heavy-light', 'centroid', 'lca', 'rmq', 'sqrt decomposition', 'mo\'s'],
            ids: ['persistent', 'crdt', 'sparsetable', 'hld', 'centroid', 'lca']
        }
    },

    // ========================================
    // ROWS: Maturity/Difficulty Levels
    // ========================================
    rows: {
        'Primitives': {
            order: 1,
            difficultyRange: [1, 2],
            color: '#22c55e',
            description: 'Week 1-2: Foundation concepts',
            icon: '🌱'
        },
        'Fundamentals': {
            order: 2,
            difficultyRange: [3, 4],
            color: '#3b82f6',
            description: 'Week 3-4: Core data structures',
            icon: '📚'
        },
        'Intermediate': {
            order: 3,
            difficultyRange: [5, 6],
            color: '#f59e0b',
            description: 'Week 5-8: Problem-solving patterns',
            icon: '⚡'
        },
        'Advanced': {
            order: 4,
            difficultyRange: [7, 8],
            color: '#ef4444',
            description: 'Week 9-12: Optimization & hard problems',
            icon: '🔥'
        },
        'Expert': {
            order: 5,
            difficultyRange: [9, 10],
            color: '#a855f7',
            description: 'Competition level / Research',
            icon: '💎'
        }
    },

    // ========================================
    // REACTIONS: How elements combine
    // ========================================
    reactions: [
        {
            name: 'LRU Cache',
            formula: 'HM + DLL → LRU',
            inputs: ['hashmap', 'linked_list'],
            output: 'lru_cache',
            description: 'HashMap for O(1) lookup + Doubly Linked List for O(1) eviction'
        },
        {
            name: 'Sliding Window Maximum',
            formula: 'Arr + Deq → SWM',
            inputs: ['array', 'deque'],
            output: 'slidingwindowmax',
            description: 'Array traversal + Monotonic Deque for O(n) window max'
        },
        {
            name: 'Dijkstra\'s Algorithm',
            formula: 'Grp + Hp → Dij',
            inputs: ['graph', 'heap'],
            output: 'dijkstra',
            description: 'Graph + Min Heap for efficient shortest path'
        },
        {
            name: 'Binary Search Tree',
            formula: 'BT + Ord → BST',
            inputs: ['binarytree', 'comparison'],
            output: 'bst',
            description: 'Binary Tree + Ordering property'
        },
        {
            name: 'Merge Sort',
            formula: 'D&C + Arr → MS',
            inputs: ['divideconquer', 'array'],
            output: 'mergesort',
            description: 'Divide & Conquer on Arrays'
        },
        {
            name: 'DFS',
            formula: 'Grp + Stk → DFS',
            inputs: ['graph', 'stack'],
            output: 'dfs',
            description: 'Graph traversal using Stack (or recursion)'
        },
        {
            name: 'BFS',
            formula: 'Grp + Que → BFS',
            inputs: ['graph', 'queue'],
            output: 'bfs',
            description: 'Graph traversal using Queue'
        },
        {
            name: 'Topological Sort',
            formula: 'DAG + DFS → Topo',
            inputs: ['graph', 'dfs'],
            output: 'topologicalsort',
            description: 'DFS on Directed Acyclic Graph'
        },
        {
            name: 'Trie',
            formula: 'Tree + Str → Trie',
            inputs: ['tree', 'string'],
            output: 'trie',
            description: 'Tree structure for string prefix matching'
        },
        {
            name: 'Union-Find',
            formula: 'Arr + Tree → UF',
            inputs: ['array', 'tree'],
            output: 'unionfind',
            description: 'Array-based tree for disjoint sets'
        },
        {
            name: 'Segment Tree',
            formula: 'BT + PS → Seg',
            inputs: ['binarytree', 'prefixsum'],
            output: 'segmenttree',
            description: 'Binary Tree for range queries/updates'
        },
        {
            name: 'DP Memoization',
            formula: 'Rec + HM → Memo',
            inputs: ['recursion', 'hashmap'],
            output: 'memoization',
            description: 'Recursion + Caching for optimal substructure'
        },
        {
            name: 'A* Search',
            formula: 'Dij + Heur → A*',
            inputs: ['dijkstra', 'heuristic'],
            output: 'astar',
            description: 'Dijkstra + Heuristic for informed search'
        },
        {
            name: 'Quick Select',
            formula: 'QS + Pivot → QSel',
            inputs: ['quicksort', 'partition'],
            output: 'quickselect',
            description: 'QuickSort partitioning for O(n) selection'
        },
        {
            name: 'Range Sum Query',
            formula: 'Arr + PS → RSQ',
            inputs: ['array', 'prefixsum'],
            output: 'prefix_sum',
            description: 'Prefix sums turn many range-sum queries into O(1) lookups'
        },
        {
            name: 'Monotonic Stack Pattern',
            formula: 'Arr + Stk → Mono',
            inputs: ['array', 'stack'],
            output: 'monotonic_stack',
            description: 'Keep a stack in sorted order to answer next-greater/next-smaller in O(n)'
        },
        {
            name: 'Course Schedule (Topo Order)',
            formula: 'DAG + DFS/BFS → Topo',
            inputs: ['graph', 'topologicalsort'],
            output: 'topological_sort',
            description: 'Topological ordering solves dependency scheduling in DAGs'
        },
        {
            name: 'Minimum Spanning Tree',
            formula: 'Grp + UF → MST',
            inputs: ['graph', 'unionfind'],
            output: 'mst',
            description: 'Union-Find enables Kruskal-style MST construction'
        },
        {
            name: '0/1 Knapsack',
            formula: 'DP + Arr → Knap',
            inputs: ['dp', 'array'],
            output: 'knapsack',
            description: 'DP tables capture optimal substructure across items/capacity'
        },
        {
            name: 'Edit Distance',
            formula: 'DP + Str → Edit',
            inputs: ['dp', 'string'],
            output: 'edit_distance',
            description: 'DP over two strings computes min edits (insert/delete/replace)'
        },
        {
            name: 'Longest Increasing Subsequence',
            formula: 'DP + BS → LIS',
            inputs: ['dp', 'binarysearch'],
            output: 'lis',
            description: 'Binary search optimization reduces LIS from O(n²) to O(n log n)'
        },
        {
            name: 'Interval Scheduling',
            formula: 'Sort + Grd → Opt',
            inputs: ['sorting', 'greedy'],
            output: 'greedy',
            description: 'Sort by end-time, then take locally-best choices for a global optimum'
        }
    ],

    // ========================================
    // LEARNING PATHS
    // ========================================
    learningPaths: {
        'Beginner': {
            description: 'Start here - foundations and core DS',
            sequence: ['memory', 'array', 'string', 'hashmap', 'stack', 'queue', 'recursion', 'binarysearch'],
            duration: '2-3 weeks'
        },
        'Intermediate': {
            description: 'Problem-solving patterns',
            sequence: ['twopointer', 'slidingwindow', 'prefixsum', 'bfs', 'dfs', 'binarytree', 'bst', 'heap'],
            duration: '3-4 weeks'
        },
        'Advanced': {
            description: 'Optimization and complex problems',
            sequence: ['dp', 'backtracking', 'graph', 'trie', 'segmenttree', 'unionfind', 'dijkstra'],
            duration: '4-6 weeks'
        },
        'Expert': {
            description: 'Competition preparation',
            sequence: ['bitmaskdp', 'lca', 'hld', 'suffixarray', 'fft', 'maxflow'],
            duration: 'Ongoing'
        }
    }
};

// ========================================
// CLASSIFICATION FUNCTIONS
// ========================================

/**
 * Classify a node into its functional column
 * Priority order matters - more specific patterns checked first
 */
function classifyColumn(node) {
    const searchStr = (node.id + ' ' + node.label + ' ' + node.category + ' ' + (node.type || '')).toLowerCase();
    const id = node.id.toLowerCase().replace(/[^a-z0-9]/g, '');
    const label = node.label.toLowerCase();
    
    // Special cases - explicit ID matches take highest priority
    const specialCases = {
        'memory': 'Foundation',
        'computermemory': 'Foundation',
        'pointers': 'Foundation',
        'pointersreferences': 'Foundation',
        'twopointers': 'Patterns',
        'twopointer': 'Patterns',
        'topologicalsort': 'Graphs',
        'topological': 'Graphs'
    };
    
    if (specialCases[id]) {
        return specialCases[id];
    }
    
    // Priority order - check more specific patterns first
    const checkOrder = ['Graphs', 'DP', 'Patterns', 'Sorting', 'Trees', 'Order', 'Hashing', 'Strings', 'Math', 'Storage', 'Foundation', 'Advanced'];
    
    for (const colName of checkOrder) {
        const config = PERIODIC_CONFIG.columns[colName];
        if (!config) continue;
        
        // Check by ID match first (exact or partial)
        if (config.ids && config.ids.some(i => id === i.toLowerCase() || id.includes(i.toLowerCase()))) {
            return colName;
        }
        // Check by keyword match in label
        if (config.keywords && config.keywords.some(kw => label.includes(kw.toLowerCase()))) {
            return colName;
        }
    }
    
    // Fallback based on type
    if (node.type) {
        if (node.type.includes('graph') || node.type.includes('traversal')) return 'Graphs';
        if (node.type.includes('tree') || node.type.includes('hierarchical')) return 'Trees';
        if (node.type.includes('pattern')) return 'Patterns';
        if (node.type.includes('dp')) return 'DP';
        if (node.type.includes('sort')) return 'Sorting';
        if (node.type.includes('math') || node.type.includes('geometry')) return 'Math';
        if (node.type.includes('specialized') || node.type.includes('distributed')) return 'Advanced';
    }
    
    // Category-based fallback
    if (node.category) {
        const cat = node.category.toLowerCase();
        if (cat.includes('graph')) return 'Graphs';
        if (cat.includes('tree')) return 'Trees';
        if (cat.includes('dynamic') || cat.includes('dp')) return 'DP';
        if (cat.includes('sort')) return 'Sorting';
        if (cat.includes('pattern') || cat.includes('algorithm')) return 'Patterns';
        if (cat.includes('math') || cat.includes('geometry')) return 'Math';
        if (cat.includes('hash')) return 'Hashing';
    }
    
    return 'Advanced'; // Default for unclassified
}

/**
 * Classify a node into its maturity row
 */
function classifyRow(node) {
    const diff = node.difficulty || 5;
    
    for (const [rowName, config] of Object.entries(PERIODIC_CONFIG.rows)) {
        if (diff >= config.difficultyRange[0] && diff <= config.difficultyRange[1]) {
            return rowName;
        }
    }
    
    return 'Intermediate'; // Default
}

/**
 * Get the color for a column
 */
function getColumnColor(columnName) {
    return PERIODIC_CONFIG.columns[columnName]?.color || '#64748b';
}

/**
 * Get the color for a row
 */
function getRowColor(rowName) {
    return PERIODIC_CONFIG.rows[rowName]?.color || '#64748b';
}

/**
 * Get reactions involving a specific element
 */
function getReactionsForElement(elementId) {
    return PERIODIC_CONFIG.reactions.filter(r => 
        r.inputs.includes(elementId) || r.output === elementId
    );
}

// Export for use in periodic-table.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PERIODIC_CONFIG, classifyColumn, classifyRow, getColumnColor, getRowColor, getReactionsForElement };
}
