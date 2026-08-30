# 抱佛脚·手机复习工具

[English](README.md) | 简体中文

将用户已有的讲义、试卷和答案整理成来源可追溯的手机端复习工具，包含知识卡片、客观题练习、错题重做、离线进度记录，以及可独立打开的单文件 HTML 网页。

> [!IMPORTANT]
> **仅限非商业用途。** 允许个人学习及许可证规定的其他非商业用途；禁止任何商业或营利性使用。详见 [PolyForm Noncommercial License 1.0.0](LICENSE)。

英文名称为 **Study Sprint Mobile**。GitHub 首页采用英文优先展示，本页提供完整中文说明。

## 成品预览

以下截图来自使用本 Skill 生成的真实成品 **《国空冲刺》**，完整展示从选择资料、知识卡片和刷题，到错题重练与进度追踪的使用路径。截图不含个人信息。

| 首页与资料选择 | 来源可追溯的知识卡片 | 试卷库 |
| :---: | :---: | :---: |
| ![国空冲刺手机首页，包含11份讲义和600道题](docs/images/guokong-home.jpg) | ![国空冲刺知识卡片及来源定位](docs/images/guokong-card.jpg) | ![国空冲刺六套试卷列表](docs/images/guokong-papers.jpg) |

| 客观题练习 | 答错后即时解析 | 错题本与重练 |
| :---: | :---: | :---: |
| ![带选项的客观题答题界面](docs/images/guokong-quiz.jpg) | ![回答错误后显示正确答案和解析](docs/images/guokong-incorrect.jpg) | ![支持重练和答对后自动移出的错题本](docs/images/guokong-wrong.jpg) |

| 学习进度 |
| :---: |
| ![讲义掌握、试卷答题和错题统计](docs/images/guokong-progress.jpg) |

## 主要功能

- 盘点用户自己的学习资料文件夹，并区分讲义、试卷和答案文件。
- 提取支持格式中的文字，仅在确有需要且本机具备条件时使用 OCR。
- 根据资料生成带来源定位的精简知识卡片。
- 还原单选题、多选题和判断题，不编造缺失题目或答案。
- 提供错题重做、知识卡片掌握标记，以及保存在浏览器本机的学习进度。
- 生成适配手机的单文件 HTML，不依赖外部脚本、样式、分析服务或网络连接。
- 完整生成前先交付小样，并等待用户明确确认。

## 安装方法

克隆或下载本仓库，然后将完整的 `study-sprint-mobile` 文件夹放入所用智能体的 Skills 目录。也可以让兼容的智能体直接从 GitHub 仓库地址安装此 Skill。

请保持目录结构不变：`SKILL.md`、`agents/`、`assets/`、`references/` 和 `scripts/` 都是 Skill 的组成部分。

## 调用示例

中文示例：

```text
帮我制作抱佛脚工具，把这个资料文件夹做成手机复习网页。
```

```text
用 $study-sprint-mobile 把这些讲义、试卷和答案生成可离线使用的复习工具。
```

英文示例：

```text
Use $study-sprint-mobile to turn this folder of lectures, practice papers, and answers into a mobile exam-review tool.
```

## 工作流程

1. 确认资料文件夹，并盘点全部文件。
2. 配对试卷与答案，标记缺失或存在歧义的关系。
3. 采用确定性方式提取文字，将低置信度 OCR 内容列入复核。
4. 检测资料语言，并用该语言生成应用界面。
5. 生成并验证小样，小样最多包含 20 张知识卡片和 20 道题。
6. 暂停并等待用户明确确认。
7. 生成、校验并冒烟测试完整离线 HTML 工具。
8. 只有在用户明确要求并授权时，才发布在线版本。

## 支持格式

| 类型 | 格式 | 说明 |
| --- | --- | --- |
| PDF | `.pdf` | 使用 `pypdf` 提取文字；扫描页可选择使用 OCR。 |
| Word | `.docx` | 直接从文档 XML 中提取。 |
| PowerPoint | `.pptx` | 按幻灯片从演示文稿 XML 中提取。 |
| 图片 | `.png`、`.jpg`、`.jpeg`、`.tif`、`.tiff`、`.bmp`、`.webp` | 需要可选的 RapidOCR。 |

旧版 `.doc` 和 `.ppt` 文件会被识别，但不会被修改。处理前请复制并转换为 `.docx` 或 `.pptx`。

## 运行依赖

- Python 3.9 或更高版本：用于资料盘点、内容提取和语言检测。
- Node.js 18 或更高版本：用于数据校验、网页构建和冒烟测试。
- `pypdf`：用于 PDF 文字提取。
- 可选 `rapidocr-onnxruntime`：用于图片和扫描文档 OCR。
- 可选 Poppler `pdftoppm`：用于 PDF 转图片后的 OCR 回退。

生成后的浏览器应用不需要服务器，在本地即可离线使用。

## 隐私与安全

- 除非用户另行明确授权发布，否则源资料始终保留在本机。
- 生成的网页不含遥测、分析服务、远程字体、外部资源或上传代码。
- 学习进度只保存在当前设备浏览器的 `localStorage` 中。
- 工作流保留原文件；转换旧版文档时不得覆盖原件。
- 每张卡片和每道题都必须保留来源文件与定位信息；答案缺失或配对不明确时会提示复核，不会猜测。
- Skill 本身公开，并不代表可以公开它处理的课程资料；发布每一份生成内容都需要单独授权。

发布本仓库前，应完成密钥、个人路径、占位符、语法、数据校验、构建和冒烟测试。

## 目录结构

```text
study-sprint-mobile/
├── SKILL.md
├── agents/
│   └── openai.yaml
├── assets/
│   └── mobile-study-template/
├── docs/
│   └── images/
├── references/
├── scripts/
├── README.md
├── README.zh-CN.md
├── CHANGELOG.md
└── LICENSE
```

## 开源协议

本项目采用 [PolyForm Noncommercial License 1.0.0](LICENSE)。允许个人学习，禁止任何商业或营利性使用。
