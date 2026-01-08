const fs = require('fs');
const c = fs.readFileSync('graph_data.js', 'utf8');
const d = JSON.parse(c.replace('const graphData = ', '').replace(/;\s*$/,''));

const withContent = new Set(d.nodes.filter(n => n.content).map(n => n.id));

// Find all prerequisites and next topics referenced
const prereqs = new Set();
const nextTopics = new Set();

d.nodes.forEach(n => {
  if (n.content && n.content.learningPath) {
    if (n.content.learningPath.prerequisites) {
      n.content.learningPath.prerequisites.forEach(p => prereqs.add(p.id));
    }
    if (n.content.learningPath.nextTopics) {
      n.content.learningPath.nextTopics.forEach(p => nextTopics.add(p.id));
    }
  }
});

const prereqsNeedContent = [...prereqs].filter(id => !withContent.has(id));
const nextNeedContent = [...nextTopics].filter(id => !withContent.has(id));

console.log('=== PREREQUISITES NEEDING CONTENT ===');
console.log('Count:', prereqsNeedContent.length);
prereqsNeedContent.forEach(id => {
  const node = d.nodes.find(n => n.id === id);
  console.log('  -', id, '|', node?.label || '?');
});

console.log('\n=== NEXT TOPICS NEEDING CONTENT ===');
console.log('Count:', nextNeedContent.length);
nextNeedContent.forEach(id => {
  const node = d.nodes.find(n => n.id === id);
  console.log('  -', id, '|', node?.label || '?');
});

// Priority list (both prereq AND next = high priority)
const both = prereqsNeedContent.filter(id => nextNeedContent.includes(id));
console.log('\n=== HIGH PRIORITY (both prereq AND next) ===');
console.log('Count:', both.length);
both.forEach(id => {
  const node = d.nodes.find(n => n.id === id);
  console.log('  -', id, '|', node?.label || '?');
});
