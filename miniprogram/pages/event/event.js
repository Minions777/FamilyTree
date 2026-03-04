const db = wx.cloud.database();
const _ = db.command;
const collection = db.collection('family_events');

Page({
  data: {
    id: '',
    isEdit: false,
    saving: false,
    form: {
      title: '',
      eventDate: '',
      description: ''
    }
  },

  async onLoad(options) {
    const id = options?.id || '';
    this.setData({ id, isEdit: !!id });
    if (id) {
      await this.loadDetail(id);
    }
  },

  async loadDetail(id) {
    try {
      const { data } = await collection.doc(id).get();
      this.setData({
        form: {
          title: data.title || '',
          eventDate: data.eventDate || '',
          description: data.description || ''
        }
      });
    } catch (error) {
      wx.showToast({ title: '加载事件失败', icon: 'none' });
    }
  },

  onInput(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({ [`form.${field}`]: e.detail.value });
  },

  async onSubmit() {
    const payload = {
      title: this.data.form.title.trim(),
      eventDate: this.data.form.eventDate.trim(),
      description: this.data.form.description.trim()
    };

    if (!payload.title || !payload.eventDate) {
      wx.showToast({ title: '请填写标题和日期', icon: 'none' });
      return;
    }

    this.setData({ saving: true });
    try {
      if (this.data.isEdit) {
        await collection.doc(this.data.id).update({
          data: {
            ...payload,
            updatedAt: _.date()
          }
        });
      } else {
        await collection.add({
          data: {
            ...payload,
            createdAt: _.date(),
            updatedAt: _.date()
          }
        });
      }
      wx.showToast({ title: '保存成功' });
      setTimeout(() => wx.navigateBack(), 500);
    } catch (error) {
      wx.showToast({ title: '保存失败', icon: 'none' });
    } finally {
      this.setData({ saving: false });
    }
  },

  async onDelete() {
    if (!this.data.isEdit) return;
    const { confirm } = await wx.showModal({ title: '确认删除', content: '删除后不可恢复，是否继续？' });
    if (!confirm) return;

    try {
      await collection.doc(this.data.id).remove();
      wx.showToast({ title: '删除成功' });
      setTimeout(() => wx.navigateBack(), 500);
    } catch (error) {
      wx.showToast({ title: '删除失败', icon: 'none' });
    }
  }
});
