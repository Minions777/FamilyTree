const db = wx.cloud.database();
const _ = db.command;
const collection = db.collection('family_members');

Page({
  data: {
    id: '',
    isEdit: false,
    saving: false,
    parentIndex: 0,
    spouseIndex: 0,
    siblingIndices: [],
    parentOptions: [{ label: '无（祖先节点）', value: '' }],
    spouseOptions: [{ label: '无', value: '' }],
    siblingOptions: [],
    allMembers: [],
    form: {
      name: '',
      gender: '男',
      birthYear: '',
      parentId: '',
      spouseId: '',
      siblingIds: [],
      generation: '',
      avatarFileID: '',
      note: ''
    }
  },

  async onLoad(options) {
    const id = options?.id || '';
    this.setData({ id, isEdit: !!id });
    await this.loadMemberOptions();
    if (id) {
      await this.loadDetail(id);
    }
  },

  async loadMemberOptions() {
    const { data } = await collection.orderBy('generation', 'asc').get();
    const filteredMembers = this.data.id ? data.filter((item) => item._id !== this.data.id) : data;

    this.setData({
      allMembers: data,
      parentOptions: [{ label: '无（祖先节点）', value: '' }].concat(
        filteredMembers.map((item) => ({ label: `${item.name}（第${item.generation || '-'}代）`, value: item._id }))
      ),
      spouseOptions: [{ label: '无', value: '' }].concat(
        filteredMembers.map((item) => ({ label: `${item.name}（第${item.generation || '-'}代）`, value: item._id }))
      ),
      siblingOptions: filteredMembers.map((item) => ({ label: `${item.name}（第${item.generation || '-'}代）`, value: item._id }))
    });
  },

  async loadDetail(id) {
    try {
      const { data } = await collection.doc(id).get();
      const parentIndex = this.data.parentOptions.findIndex((item) => item.value === (data.parentId || ''));
      const spouseIndex = this.data.spouseOptions.findIndex((item) => item.value === (data.spouseId || ''));
      const siblingIndices = (data.siblingIds || [])
        .map((siblingId) => this.data.siblingOptions.findIndex((item) => item.value === siblingId))
        .filter((index) => index >= 0);

      this.setData({
        parentIndex: parentIndex >= 0 ? parentIndex : 0,
        spouseIndex: spouseIndex >= 0 ? spouseIndex : 0,
        siblingIndices,
        form: {
          name: data.name || '',
          gender: data.gender || '男',
          birthYear: data.birthYear ? String(data.birthYear) : '',
          parentId: data.parentId || '',
          spouseId: data.spouseId || '',
          siblingIds: data.siblingIds || [],
          generation: data.generation ? String(data.generation) : '',
          avatarFileID: data.avatarFileID || '',
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

  onSpouseChange(e) {
    const spouseIndex = Number(e.detail.value);
    const spouseId = this.data.spouseOptions[spouseIndex]?.value || '';
    this.setData({
      spouseIndex,
      'form.spouseId': spouseId
    });
  },

  onSiblingChange(e) {
    const siblingIndices = e.detail.value.map((value) => Number(value));
    const siblingIds = siblingIndices.map((index) => this.data.siblingOptions[index]?.value).filter(Boolean);
    this.setData({
      siblingIndices,
      'form.siblingIds': siblingIds
    });
  },

  async chooseAvatar() {
    try {
      const { tempFilePaths } = await wx.chooseMedia({
        count: 1,
        mediaType: ['image'],
        sourceType: ['album', 'camera']
      });

      if (!tempFilePaths || tempFilePaths.length === 0) return;
      const filePath = tempFilePaths[0];
      const cloudPath = `avatars/${Date.now()}-${Math.floor(Math.random() * 10000)}.png`;

      wx.showLoading({ title: '上传中' });
      const { fileID } = await wx.cloud.uploadFile({ cloudPath, filePath });
      this.setData({ 'form.avatarFileID': fileID });
      wx.hideLoading();
      wx.showToast({ title: '上传成功' });
    } catch (error) {
      wx.hideLoading();
      wx.showToast({ title: '上传失败', icon: 'none' });
    }
  },

  async onSubmit() {
    const payload = this.normalizeForm();
    if (!payload.name) {
      wx.showToast({ title: '请填写姓名', icon: 'none' });
      return;
    }

    this.setData({ saving: true });
    try {
      let memberId = this.data.id;
      if (this.data.isEdit) {
        await collection.doc(this.data.id).update({
          data: {
            ...payload,
            updatedAt: _.date()
          }
        });
      } else {
        const res = await collection.add({
          data: {
            ...payload,
            createdAt: _.date(),
            updatedAt: _.date()
          }
        });
        memberId = res._id;
      }

      await this.syncRelations(memberId, payload);

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

  async syncRelations(memberId, payload) {
    const tasks = [];
    if (payload.spouseId) {
      tasks.push(
        collection.doc(payload.spouseId).update({
          data: { spouseId: memberId, updatedAt: _.date() }
        })
      );
    }

    payload.siblingIds.forEach((siblingId) => {
      tasks.push(
        collection.doc(siblingId).update({
          data: {
            siblingIds: _.addToSet(memberId),
            updatedAt: _.date()
          }
        })
      );
    });

    await Promise.all(tasks);
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
      spouseId: form.spouseId || '',
      siblingIds: form.siblingIds || [],
      generation: form.generation ? Number(form.generation) : null,
      avatarFileID: form.avatarFileID || '',
      note: form.note.trim()
    };
  }
});
