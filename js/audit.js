const fs = require('fs');
const content = fs.readFileSync('graph_data.js', 'utf8');
const jsonStr = content.replace('const graphData = ', '').replace(/;\s*$/, '');
const data = JSON.parse(jsonStr);
const actualIds = new Set(data.nodes.map(n => n.id));

console.log('=== DSA GRAPH FULL AUDIT ===\n');
console.log('Total Nodes:', data.nodes.length);
console.log('Total Edges:', data.edges.length);

// 1. Nodes with/without content
const withContent = data.nodes.filter(n => n.content);
console.log('\n--- CONTENT STATUS ---');
console.log('With full content:', withContent.length);
console.log('Without content:', data.nodes.length - withContent.length);

// 2. Orphan nodes
const connected = new Set();
data.edges.forEach(e => { 
  connected.add(e.source); 
  connected.add(e.target); 
});
const orphans = data.nodes.filter(n => !connected.has(n.id));
console.log('\n--- ORPHAN NODES (not in graph) ---');
console.log('Count:', orphans.length);
if (orphans.length > 0) {
  orphans.forEach(n => console.log('  -', n.id, '(' + n.label + ')'));
}

// 3. Broken edges
const brokenEdges = data.edges.filter(e => !actualIds.has(e.source) || !actualIds.has(e.target));
console.log('\n--- BROKEN EDGES ---');
console.log('Count:', brokenEdges.length);
brokenEdges.forEach(e => console.log('  -', e.source, '->', e.target));

// 4. Missing required fields
console.log('\n--- MISSING FIELDS ---');
const missingLabel = data.nodes.filter(n => !n.label);
const missingType = data.nodes.filter(n => !n.type);
const missingDesc = data.nodes.filter(n => !n.description);
console.log('Missing label:', missingLabel.length);
console.log('Missing type:', missingType.length);  
console.log('Missing description:', missingDesc.length);

// 5. Broken learningPath references
console.log('\n--- BROKEN LEARNING PATH REFS ---');
let brokenRefs = [];
data.nodes.forEach(node => {
  if (node.content && node.content.learningPath) {
    const lp = node.content.learningPath;
    if (lp.prerequisites) {
      lp.prerequisites.forEach(p => {
        if (!actualIds.has(p.id)) {
          brokenRefs.push({ from: node.id, type: 'prereq', to: p.id });
        }
      });
    }
    if (lp.nextTopics) {
      lp.nextTopics.forEach(p => {
        if (!actualIds.has(p.id)) {
          brokenRefs.push({ from: node.id, type: 'next', to: p.id });
        }
      });
    }
  }
});
console.log('Count:', brokenRefs.length);
brokenRefs.forEach(r => console.log('  -', r.from, r.type + ':', r.to));

// 6. Content quality check
console.log('\n--- CONTENT QUALITY CHECK ---');
withContent.forEach(node => {
  const c = node.content;
  const missing = [];
  if (!c.definition) missing.push('definition');
  if (!c.howItWorks) missing.push('howItWorks');
  if (!c.whenToUse) missing.push('whenToUse');
  if (!c.complexity) missing.push('complexity');
  if (!c.codeTemplates || c.codeTemplates.length === 0) missing.push('codeTemplates');
  if (!c.learningPath) missing.push('learningPath');
  
  if (missing.length > 0) {
    console.log('  ' + node.id + ': missing', missing.join(', '));
  }
});

// 7. Interview questions check
console.log('\n--- INTERVIEW QUESTIONS ---');
const withQuestions = data.nodes.filter(n => n.interviewQuestions && n.interviewQuestions.length > 0);
console.log('Nodes with interview questions:', withQuestions.length);
withQuestions.forEach(n => console.log('  -', n.id, '(' + n.interviewQuestions.length + ' questions)'));

// 8. References check  
console.log('\n--- REFERENCES ---');
const withRefs = data.nodes.filter(n => n.references && (n.references.official || n.references.community));
console.log('Nodes with references:', withRefs.length);

console.log('\n=== END AUDIT ===');
