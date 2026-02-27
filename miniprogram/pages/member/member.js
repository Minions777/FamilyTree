const db = wx.cloud.database();
const _ = db.command;
const collection = db.collection('family_members');

Page({
  data: {
    id: '',
    isEdit: false,
    saving: false,
    parentIndex: 0,
    parentOptions: [{ label: '无（祖先节点）', value: '' }],
    form: {
      name: '',
      gender: '男',
      birthYear: '',
      parentId: '',
      generation: '',
      note: ''
    }
  },

  async onLoad(options) {
    const id = options?.id || '';
    this.setData({ id, isEdit: !!id });
    await this.loadParentOptions();
    if (id) {
      await this.loadDetail(id);
    }
  },

  async loadParentOptions() {
    const { data } = await collection.orderBy('generation', 'asc').get();
    const options = [{ label: '无（祖先节点）', value: '' }].concat(
      data.map((item) => ({ label: `${item.name}（第${item.generation || '-'}代）`, value: item._id }))
    );
    this.setData({ parentOptions: options });
  },

  async loadDetail(id) {
    try {
      const { data } = await collection.doc(id).get();
      const parentIndex = this.data.parentOptions.findIndex((item) => item.value === (data.parentId || ''));
      this.setData({
        parentIndex: parentIndex >= 0 ? parentIndex : 0,
        form: {
          name: data.name || '',
          gender: data.gender || '男',
          birthYear: data.birthYear ? String(data.birthYear) : '',
          parentId: data.parentId || '',
          generation: data.generation ? String(data.generation) : '',
          note: data.note || ''
        }
      });
    } catch (error) {
      wx.showToast({ title: '加载详情失败', icon: 'none' });
    }
  },

  onInput(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({
      [`form.${field}`]: e.detail.value
    });
  },

  onGenderChange(e) {
    this.setData({ 'form.gender': e.detail.value });
  },

  onParentChange(e) {
    const parentIndex = Number(e.detail.value);
    const parentId = this.data.parentOptions[parentIndex]?.value || '';
    this.setData({
      parentIndex,
      'form.parentId': parentId
    });
  },

  async onSubmit() {
    const payload = this.normalizeForm();
    if (!payload.name) {
      wx.showToast({ title: '请填写姓名', icon: 'none' });
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
      setTimeout(() => {
        wx.navigateBack();
      }, 500);
    } catch (error) {
      console.error('保存失败', error);
      wx.showToast({ title: '保存失败', icon: 'none' });
    } finally {
      this.setData({ saving: false });
    }
  },

  async onDelete() {
    if (!this.data.isEdit) return;

    const { confirm } = await wx.showModal({
      title: '确认删除',
      content: '删除后不可恢复，是否继续？'
    });

    if (!confirm) return;

    try {
      const { data: children } = await collection.where({ parentId: this.data.id }).get();
      if (children.length > 0) {
        wx.showToast({ title: '请先处理子成员', icon: 'none' });
        return;
      }

      await collection.doc(this.data.id).remove();
      wx.showToast({ title: '删除成功' });
      setTimeout(() => wx.navigateBack(), 500);
    } catch (error) {
      wx.showToast({ title: '删除失败', icon: 'none' });
    }
  },

  normalizeForm() {
    const { form } = this.data;
    return {
      name: form.name.trim(),
      gender: form.gender || '未知',
      birthYear: form.birthYear ? Number(form.birthYear) : null,
      parentId: form.parentId || '',
      generation: form.generation ? Number(form.generation) : null,
      note: form.note.trim()
    };
  }
});
