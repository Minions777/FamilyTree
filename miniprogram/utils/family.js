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

function computeFamilyStats(members) {
  const generationCountMap = members.reduce((acc, item) => {
    const key = typeof item.generation === 'number' ? item.generation : '未知';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const generationDistribution = Object.keys(generationCountMap)
    .sort((a, b) => {
      if (a === '未知') return 1;
      if (b === '未知') return -1;
      return Number(a) - Number(b);
    })
    .map((generation) => ({
      label: generation === '未知' ? '代际未知' : `第${generation}代`,
      value: generationCountMap[generation]
    }));

  return {
    totalPopulation: members.length,
    maleCount: members.filter((item) => item.gender === '男').length,
    femaleCount: members.filter((item) => item.gender === '女').length,
    unknownGenderCount: members.filter((item) => !item.gender || !['男', '女'].includes(item.gender)).length,
    generationDistribution
  };
}

function buildRelationGraph(members) {
  const memberMap = members.reduce((acc, item) => {
    acc[item._id] = item;
    return acc;
  }, {});

  const childrenMap = members.reduce((acc, item) => {
    if (!item.parentId) return acc;
    if (!acc[item.parentId]) acc[item.parentId] = [];
    acc[item.parentId].push(item);
    return acc;
  }, {});

  const parentSiblingsCache = {};

  const getParentSiblings = (member) => {
    if (!member.parentId) return [];
    if (parentSiblingsCache[member._id]) return parentSiblingsCache[member._id];
    const parent = memberMap[member.parentId];
    if (!parent || !parent.parentId) {
      parentSiblingsCache[member._id] = [];
      return [];
    }
    const siblings = (childrenMap[parent.parentId] || []).filter((item) => item._id !== parent._id);
    parentSiblingsCache[member._id] = siblings;
    return siblings;
  };

  return members.map((member) => {
    const parent = member.parentId ? memberMap[member.parentId] : null;
    const grandParent = parent && parent.parentId ? memberMap[parent.parentId] : null;

    const children = childrenMap[member._id] || [];
    const grandChildren = children.flatMap((child) => childrenMap[child._id] || []);

    const parentSiblings = getParentSiblings(member);
    const cousins = parentSiblings.flatMap((sibling) =>
      (childrenMap[sibling._id] || []).map((cousin) => ({
        name: cousin.name,
        type: sibling.gender === '男' ? '堂亲' : '表亲'
      }))
    );

    return {
      memberId: member._id,
      memberName: member.name,
      grandParentNames: grandParent ? [grandParent.name] : [],
      grandChildrenNames: grandChildren.map((item) => item.name),
      cousinNames: cousins
    };
  });
}

module.exports = {
  buildTreeLines,
  computeFamilyStats,
  buildRelationGraph
};
