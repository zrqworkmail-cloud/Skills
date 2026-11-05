# Third-Party Notices

本文件列出本仓随附的第三方组件、素材及其许可状态。**第 2 节与第 3 节的内容
不受根 `LICENSE` 覆盖**。商用前须逐项核实。

## 1. 随仓分发的第三方代码

| 组件 | 路径 | 许可 | 商用 | 备注 |
|---|---|---|---|---|
| onetake | `video-generator/workbuddy-video-generator/reference/tools/oss-skills/onetake/` | PolyForm Noncommercial 1.0.0 | **禁止** | Required Notice: Copyright (c) 2026 Patrick. 许可全文随目录保留；该许可允许分发副本，但用途限非商业，且须随附条款与 Required Notice |
| video-shotcraft | 同目录 `video-shotcraft/` | Apache License 2.0 | 允许 | 须保留 LICENSE 与 NOTICE 声明 |
| anything2explainer | 同目录 `anything2explainer/` | **许可文件未随快照提供** | **需向上游取得授权** | `README_ZH.md` 自述为 PolyForm Noncommercial 1.0.0；上游 `github.com/Vincentwei1021/anything2explainer`。快照不完整，部分相对链接已指向上游仓库 |

> 这三个目录是**参考快照**，不是本仓技能本体的依赖；删除它们不影响
> `SKILL.md` / `references/` / `scripts/` 的加载。若需商用且不愿逐项核权，
> 将它们从分发副本中排除是最简单的做法。

## 2. 音频素材

| 文件 | 状态 |
|---|---|
| `video-generator/assets/audio/VibeKnowledgeBGM_20min.m4a`（38.1 MB，功能层共享） | 由仓库维护者自备并随仓提供，用于流程复现。**本仓未声明其来源、作者或授权范围**，不授予任何超出原始权利人的音乐使用权。使用者须自行向权利人确认；商用前尤其需要核实。详见该目录 `README.md` |

## 3. 未随仓分发、需使用者自备

| 类别 | 说明 |
|---|---|
| 字体 | 仓内不含任何字体文件。HTML/CSS 通过 `local()` 引用系统已安装字体（Noto Sans SC / Noto Serif SC / 思源黑体 / 微软雅黑等）。请自行安装并遵守其各自许可（Noto 系列为 SIL OFL 1.1） |
| ComfyUI 工作流 | `workflow.api.json` 及等价 API 工作流绑定具体节点版本与模型，本仓不提供，需从本机 ComfyUI 导出（见 `docs/从零复现.md`） |
| 模型权重 | Wan2.2 I2V FP8 HIGH/LOW、umt5_xxl、Wan2.1 VAE、Kokoro v1.0 onnx/voices 等均不在仓内，按各自上游许可获取 |
| npm / pip 依赖 | Remotion、React、Puppeteer、python-pptx、numpy、Pillow、librosa 等仅通过包管理器安装，代码不随仓分发；许可见各包内 LICENSE |
| 平台凭据 | GitHub token、抖音登录态、GPT Image / DashScope API key 等一律不入库，由使用者通过环境变量或平台凭据管理器提供 |

## 4. 结论

**本仓整体不得直接用于商业目的**，除非：① 取得 `onetake` 与
`anything2explainer` 权利人的商业授权或将其移除；② 确认 BGM 的商用授权；
③ 确认自备字体、模型与依赖的许可。个人学习与非商业研究在遵守上述条款的
前提下允许。
