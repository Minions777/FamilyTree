function buildTreeLines(members) {
  const byParent = members.reduce((acc, item) => {
    const parentKey = item.parentId || 'ROOT';
    if (!acc[parentKey]) acc[parentKey] = [];
    acc[parentKey].push(item);
    return acc;
  }, {});

  Object.keys(byParent).forEach((key) => {
    byParent[key].sort((a, b) => {
      const genDiff = (a.generation || 0) - (b.generation || 0);
      if (genDiff !== 0) return genDiff;
      return (a.birthYear || 0) - (b.birthYear || 0);
    });
  });

  const lines = [];
  const visit = (node, level) => {
    const prefix = '  '.repeat(level);
    const info = `${node.name}（${node.gender || '未知'}，${node.birthYear || '未知年'}）`;
    lines.push(`${prefix}${level > 0 ? '└─ ' : ''}${info}`);

    const children = byParent[node._id] || [];
    children.forEach((child) => visit(child, level + 1));
  };

  const roots = byParent.ROOT || [];
  roots.forEach((root) => visit(root, 0));

  if (lines.length === 0) {
    lines.push('暂无数据，请先添加家族成员。');
  }

  return lines;
}

module.exports = {
  buildTreeLines
};
