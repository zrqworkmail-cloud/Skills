# 数字剪纸动画

Codex 技能 `layered-cutout-animation` 用于用 Remotion 制作数字剪纸人物镜头。覆盖可复用的动作与骨架参考、人物比例和接缝、近远侧图层、表情时序、双手交接及样片确认。

把本目录整体复制到 Codex 项目或用户的技能目录下，目标目录命名为 `layered-cutout-animation`。调用时使用 `$layered-cutout-animation`。流程见 [SKILL.md](SKILL.md)，镜头结构见 [shot.example.json](assets/shot.example.json)。

渲染使用所在项目的 Remotion、浏览器和素材。使用样片版本校验脚本时需要 Python 3.10 或更新版本。参考链接列在[角色与动效参考](references/rig-and-motion.md)。
