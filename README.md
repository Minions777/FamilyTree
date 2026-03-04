# 家族族谱微信小程序（微信云开发）

这是一个基于**微信云开发（CloudBase）**的家族族谱小程序示例，支持在微信小程序中运行。

## 功能

- 家族成员列表查看
- 按父子关系自动构建族谱树
- 支持祖孙、堂表亲的精细关系图
- 新增成员 / 编辑成员 / 删除成员
- 成员头像上传（云存储）
- 配偶关系、兄弟姐妹关系维护
- 家族事件时间线（新增 / 编辑 / 删除）
- 按代际筛选、关键字搜索
- 家族统计看板（人口、代际分布）
- 支持记录：姓名、性别、出生年份、父节点、代际、备注

## 目录结构

```text
.
├── app.js
├── app.json
├── app.wxss
├── miniprogram/
│   ├── pages/
│   │   ├── index/
│   │   ├── member/
│   │   └── event/
│   └── utils/
├── project.config.json
└── sitemap.json
```

## 使用步骤

1. 使用微信开发者工具打开项目。
2. 在「云开发」面板中新建环境，并复制环境 ID。
3. 打开 `app.js`，将 `ENV_ID` 替换为你的环境 ID。
4. 在云开发数据库中新建集合：
   - `family_members`
   - `family_events`
5. 在云开发数据库权限设置中，开发阶段可设置为：
   - 仅创建者可读写（推荐）
   - 或所有用户可读（按需）
6. 编译并预览小程序。

## 数据结构建议

### family_members

```json
{
  "name": "张三",
  "gender": "男",
  "birthYear": 1985,
  "parentId": "",
  "spouseId": "",
  "siblingIds": ["成员ID"],
  "generation": 3,
  "avatarFileID": "cloud://...",
  "note": "第三代长子",
  "createdAt": "数据库服务器时间",
  "updatedAt": "数据库服务器时间"
}
```

### family_events

```json
{
  "title": "家族聚会",
  "eventDate": "2026-03-04",
  "description": "春节后第一次家族聚餐",
  "createdAt": "数据库服务器时间",
  "updatedAt": "数据库服务器时间"
}
```

## 后续可扩展

- 管理员审核与协作编辑
- 导入导出（Excel / PDF）
