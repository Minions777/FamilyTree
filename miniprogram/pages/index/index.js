const { buildTreeLines } = require('../../utils/family');

const db = wx.cloud.database();
const memberCollection = db.collection('family_members');
const eventCollection = db.collection('family_events');

Page({
  data: {
    loading: false,
    members: [],
    events: [],
    generationOptions: [{ label: '全部代际', value: '' }],
    generationIndex: 0,
    searchKeyword: '',
    treeLines: [],
    filteredMembers: []
  },

  onShow() {
    this.loadData();
  },

  async loadData() {
    this.setData({ loading: true });
    try {
      const [{ data: members }, { data: events }] = await Promise.all([
        memberCollection.orderBy('generation', 'asc').orderBy('birthYear', 'asc').get(),
        eventCollection.orderBy('eventDate', 'desc').get()
      ]);

      this.setData({
        members,
        events,
        generationOptions: this.buildGenerationOptions(members)
      });
      this.applyFilters();
    } catch (error) {
      console.error('加载数据失败', error);
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  buildGenerationOptions(members) {
    const set = new Set();
    members.forEach((item) => {
      if (typeof item.generation === 'number') {
        set.add(item.generation);
      }
    });

    return [{ label: '全部代际', value: '' }].concat(
      Array.from(set)
        .sort((a, b) => a - b)
        .map((generation) => ({ label: `第${generation}代`, value: generation }))
    );
  },

  onSearchInput(e) {
    this.setData({ searchKeyword: e.detail.value || '' });
    this.applyFilters();
  },

  onGenerationChange(e) {
    this.setData({ generationIndex: Number(e.detail.value) || 0 });
    this.applyFilters();
  },

  applyFilters() {
    const keyword = (this.data.searchKeyword || '').trim().toLowerCase();
    const generation = this.data.generationOptions[this.data.generationIndex]?.value;

    const memberMap = this.data.members.reduce((acc, item) => {
      acc[item._id] = item;
      return acc;
    }, {});

    const filteredMembers = this.data.members
      .filter((item) => {
        const matchKeyword =
          !keyword ||
          (item.name || '').toLowerCase().includes(keyword) ||
          (item.note || '').toLowerCase().includes(keyword);
        const matchGeneration = generation === '' || item.generation === generation;
        return matchKeyword && matchGeneration;
      })
      .map((item) => {
        const spouseName = item.spouseId ? memberMap[item.spouseId]?.name || '未知成员' : '-';
        let siblingNames = '无';

        if ((item.siblingIds || []).length > 0) {
          siblingNames = item.siblingIds.map((id) => memberMap[id]?.name || '未知成员').join('、');
        } else if (item.parentId) {
          const siblings = this.data.members
            .filter((member) => member.parentId === item.parentId && member._id !== item._id)
            .map((member) => member.name);
          siblingNames = siblings.length > 0 ? siblings.join('、') : '无';
        }

        return {
          ...item,
          spouseName,
          siblingNames
        };
      });

    this.setData({
      filteredMembers,
      treeLines: buildTreeLines(filteredMembers)
    });
  },

  goAdd() {
    wx.navigateTo({
      url: '/miniprogram/pages/member/member'
    });
  },

  goEdit(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/miniprogram/pages/member/member?id=${id}`
    });
  },

  goEventAdd() {
    wx.navigateTo({
      url: '/miniprogram/pages/event/event'
    });
  },

  goEventEdit(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/miniprogram/pages/event/event?id=${id}`
    });
  }
});
