const { buildTreeLines } = require('../../utils/family');

const db = wx.cloud.database();
const collection = db.collection('family_members');

Page({
  data: {
    loading: false,
    members: [],
    treeLines: []
  },

  onShow() {
    this.loadMembers();
  },

  async loadMembers() {
    this.setData({ loading: true });
    try {
      const { data } = await collection.orderBy('generation', 'asc').orderBy('birthYear', 'asc').get();
      this.setData({
        members: data,
        treeLines: buildTreeLines(data)
      });
    } catch (error) {
      console.error('加载成员失败', error);
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
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
  }
});
